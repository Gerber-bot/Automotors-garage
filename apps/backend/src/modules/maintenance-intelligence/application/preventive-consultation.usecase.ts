import { and, ilike } from 'drizzle-orm';
import {
  maintenanceIntervals,
  type DatabaseInstance,
  type PostgresKnowledgeBaseRepository,
} from '@automotors/database';
import type { PostgresVehicleRepository } from '../../../infrastructure/database/postgres-vehicle.repository.ts';
import type { PostgresMaintenanceHistoryRepository } from '../../../infrastructure/database/postgres-maintenance-history.repository.ts';
import {
  DeterministicMaintenanceEngine,
  MaintenanceStatus,
  type MaintenanceCalculationResult,
  type PreviousServiceEntry,
} from '../domain/deterministic-engine.ts';
import {
  IntervalSource,
  type ServiceCategory,
  type ServiceIntervalRule,
} from '../domain/intervals.ts';
import {
  OWNER_MAINTENANCE_CATEGORIES,
  VehicleKnowledgeBase,
} from '../domain/vehicle-knowledge-base.ts';
import type { TechnicalIdentificationEngine } from '../domain/technical-identification-engine.ts';
import {
  PreventiveConsultationResponseSchema,
  PreventiveConsultationSynthesisSchema,
  type AiEvidenceSource,
  type PreventiveConsultationResponse,
} from '../domain/ai-types.ts';
import type { AIProviderPort } from '../ports/ai-provider.port.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';
import { Result } from '../../../shared/domain/result.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AiResourceNotFoundError extends Error {
  constructor(message = 'Vehículo no encontrado.') {
    super(message);
    this.name = 'AiResourceNotFoundError';
  }
}

export class AiAccessDeniedError extends Error {
  constructor(message = 'Acceso denegado: no tenés autorización sobre este vehículo.') {
    super(message);
    this.name = 'AiAccessDeniedError';
  }
}

export interface AuthorizedAiContext {
  readonly actorUserId: string;
  readonly actorScope: 'VEHICLE_OWNER' | 'WORKSHOP_MEMBER';
  readonly workshopId: string | null;
  readonly permissions: readonly string[];
  readonly targetVehicleId: string;
  readonly externalConsentGranted: boolean;
}

export interface AiReadOnlyTool<TInput, TOutput> {
  readonly name: string;
  readonly description: string;
  readonly isReadOnly: true;
  execute(context: AuthorizedAiContext, input: TInput): Promise<TOutput>;
}

export interface AuthorizedVehicleSnapshot {
  readonly id: string;
  readonly make: string;
  readonly model: string;
  readonly year: number;
  readonly engine: string | null;
  readonly fuelType: string;
  readonly currentMileage: number;
  readonly configurationId: string | null;
  readonly declaredDistributionType: string;
  readonly declaredTransmission: string;
}

export interface AuthorizedHistoryEntry {
  readonly id: string;
  readonly serviceDate: Date;
  readonly recordedMileage: number;
  readonly category: ServiceCategory;
  readonly title: string;
  readonly isCertified: boolean;
  readonly verificationLevel: string;
  readonly originCitation: string;
}

export interface AuthorizedTechnicalRuleContext {
  readonly category: ServiceCategory;
  readonly categoryLabel: string;
  readonly selectedRule: ServiceIntervalRule | null;
  readonly ruleVerificationStatus: 'VERIFIED' | 'PENDING_VERIFICATION' | 'NONE';
  readonly exactEngineCodeStatus: 'CONFIRMED' | 'PENDING_CONFIRMATION';
  readonly distributionType: 'CADENA' | 'CORREA' | 'DESCONOCIDO';
  readonly distributionNote: string | null;
  readonly identificationReason: string | null;
  readonly requiresConfigurationConfirmation: boolean;
}

export interface DeterministicExecutionOutput {
  readonly calculation: MaintenanceCalculationResult;
  readonly estimatedMonthlyKm: number | null;
  readonly categoryServices: readonly AuthorizedHistoryEntry[];
}

export interface PreventiveConsultationInput {
  readonly context: AuthorizedAiContext;
  readonly category?: string;
  readonly question?: string;
  readonly allowExternalAi?: boolean;
  readonly privacyConsent?: boolean;
  readonly currentDate?: Date;
}

export interface PreventiveConsultationDependencies {
  readonly db: DatabaseInstance;
  readonly vehicleRepo: PostgresVehicleRepository;
  readonly historyRepo: PostgresMaintenanceHistoryRepository;
  readonly kbRepo: PostgresKnowledgeBaseRepository;
  readonly techIdentificationEngine: TechnicalIdentificationEngine;
  readonly aiProvider: AIProviderPort & StructuredExtractionPort;
  readonly deterministicEngine?: DeterministicMaintenanceEngine;
}

const CATEGORY_LABELS: Record<string, string> = {
  OIL_AND_FILTER: 'Aceite y Filtro de Motor',
  AIR_AND_CABIN_FILTERS: 'Filtros de Aire y Habitáculo',
  BRAKES: 'Sistema de Frenos',
  SPARK_PLUGS: 'Bujías de Encendido',
  COOLANT: 'Líquido Refrigerante',
  TIMING_BELT: 'Sistema de Distribución',
  TRANSMISSION_FLUID: 'Fluido de Transmisión',
  GENERAL_INSPECTION: 'Inspección Multipunto General',
};

const STANDARD_DISCLAIMER =
  'Orientación técnica preventiva basada en registros autorizados y cálculo determinista. No reemplaza la inspección física en taller ni constituye un diagnóstico mecánico definitivo.';

export class PreventiveConsultationUseCase {
  private readonly db: DatabaseInstance;
  private readonly vehicleRepo: PostgresVehicleRepository;
  private readonly historyRepo: PostgresMaintenanceHistoryRepository;
  private readonly kbRepo: PostgresKnowledgeBaseRepository;
  private readonly techIdentificationEngine: TechnicalIdentificationEngine;
  private readonly aiProvider: AIProviderPort & StructuredExtractionPort;
  private readonly deterministicEngine: DeterministicMaintenanceEngine;

  private readonly readVehicleTool: AiReadOnlyTool<void, AuthorizedVehicleSnapshot>;
  private readonly readHistoryTool: AiReadOnlyTool<void, readonly AuthorizedHistoryEntry[]>;
  private readonly readRulesTool: AiReadOnlyTool<
    { vehicle: AuthorizedVehicleSnapshot; category: ServiceCategory },
    AuthorizedTechnicalRuleContext
  >;
  private readonly runEngineTool: AiReadOnlyTool<
    {
      vehicle: AuthorizedVehicleSnapshot;
      ruleContext: AuthorizedTechnicalRuleContext;
      history: readonly AuthorizedHistoryEntry[];
      currentDate?: Date;
    },
    DeterministicExecutionOutput
  >;

  constructor(deps: PreventiveConsultationDependencies) {
    this.db = deps.db;
    this.vehicleRepo = deps.vehicleRepo;
    this.historyRepo = deps.historyRepo;
    this.kbRepo = deps.kbRepo;
    this.techIdentificationEngine = deps.techIdentificationEngine;
    this.aiProvider = deps.aiProvider;
    this.deterministicEngine = deps.deterministicEngine ?? new DeterministicMaintenanceEngine();

    this.readVehicleTool = {
      name: 'read_authorized_vehicle_context',
      description: 'Recupera la ficha técnica autorizada y minimizada del vehículo sin exponer PII.',
      isReadOnly: true,
      execute: async (ctx) => this.executeReadAuthorizedVehicle(ctx),
    };

    this.readHistoryTool = {
      name: 'read_authorized_maintenance_history',
      description: 'Recupera antecedentes de mantenimiento autorizados en modo solo lectura.',
      isReadOnly: true,
      execute: async (ctx) => this.executeReadAuthorizedHistory(ctx),
    };

    this.readRulesTool = {
      name: 'read_technical_maintenance_rules',
      description: 'Consulta reglas de mantenimiento y estado de verificación documental en la base técnica.',
      isReadOnly: true,
      execute: async (_ctx, input) => this.executeReadTechnicalRules(input.vehicle, input.category),
    };

    this.runEngineTool = {
      name: 'run_deterministic_preventive_engine',
      description: 'Ejecuta el motor determinista de mantenimiento sin alterar valores calculados.',
      isReadOnly: true,
      execute: async (_ctx, input) =>
        this.executeDeterministicEngine(
          input.vehicle,
          input.ruleContext,
          input.history,
          input.currentDate
        ),
    };
  }

  public async execute(
    input: PreventiveConsultationInput
  ): Promise<Result<PreventiveConsultationResponse, string>> {
    const toolsInvoked: string[] = [];
    const rawQuestion = typeof input.question === 'string' ? input.question.trim() : '';
    const rawCategory = typeof input.category === 'string' ? input.category.trim() : '';

    const normalizedCategory: ServiceCategory = rawCategory
      ? VehicleKnowledgeBase.normalizeCategory(rawCategory)
      : rawQuestion
        ? this.inferCategoryFromQuestion(rawQuestion)
        : 'OIL_AND_FILTER';

    const categoryLabel =
      CATEGORY_LABELS[normalizedCategory] ??
      OWNER_MAINTENANCE_CATEGORIES.find((c) => c.category === normalizedCategory)?.label ??
      normalizedCategory;

    const effectiveQuestion =
      rawQuestion.length > 0
        ? this.sanitizeText(rawQuestion).slice(0, 300)
        : `Estado y fundamento del mantenimiento preventivo para ${categoryLabel}.`;

    // 1. Tool 1: Authorized Vehicle Context (enforces 404 / 403 boundaries)
    const vehicle = await this.readVehicleTool.execute(input.context, undefined);
    toolsInvoked.push(this.readVehicleTool.name);

    // 2. Tool 2: Authorized Maintenance History (read-only, tenant/owner scoped)
    const history = await this.readHistoryTool.execute(input.context, undefined);
    toolsInvoked.push(this.readHistoryTool.name);

    // 3. Tool 3: Technical Knowledge Base & Interval Rules
    const ruleContext = await this.readRulesTool.execute(input.context, {
      vehicle,
      category: normalizedCategory,
    });
    toolsInvoked.push(this.readRulesTool.name);

    // 4. Tool 4: Deterministic Maintenance Engine
    const engineOutput = await this.runEngineTool.execute(input.context, {
      vehicle,
      ruleContext,
      history,
      currentDate: input.currentDate,
    });
    toolsInvoked.push(this.runEngineTool.name);

    const calc = engineOutput.calculation;
    const sources = this.buildEvidenceSources(vehicle, history, engineOutput.categoryServices, ruleContext, calc);
    const baseline = this.buildDeterministicBaseline(
      vehicle,
      history,
      engineOutput,
      ruleContext,
      categoryLabel
    );

    const externalProviderConfigured = this.aiProvider.isConfigured();
    const externalConsentGranted = Boolean(
      input.context.externalConsentGranted && input.allowExternalAi && input.privacyConsent
    );

    let finalAnswer = baseline.answer;
    let finalConfirmedFacts = baseline.confirmedFacts;
    let finalInferences = baseline.inferences;
    let finalUnknownOrMissing = baseline.unknownOrMissingData;
    let externalProviderUsed = false;
    let mode: 'EXTERNAL_AI_ASSISTED' | 'DETERMINISTIC_FALLBACK' = 'DETERMINISTIC_FALLBACK';
    let providerName = 'DeterministicMaintenanceEngine';
    let fallbackReason: string | null = !externalConsentGranted
      ? 'EXTERNAL_CONSENT_NOT_GRANTED'
      : !externalProviderConfigured
        ? 'PROVIDER_NOT_CONFIGURED'
        : null;

    if (externalConsentGranted && externalProviderConfigured) {
      try {
        const minimizedPrompt = this.buildMinimizedExternalPrompt({
          vehicle,
          categoryLabel,
          question: effectiveQuestion,
          calc,
          ruleContext,
          baseline,
        });

        const synthesis = await this.aiProvider.extract(
          minimizedPrompt,
          PreventiveConsultationSynthesisSchema,
          {
            userId: input.context.actorScope === 'VEHICLE_OWNER' ? input.context.actorUserId : undefined,
            workshopId: input.context.workshopId ?? undefined,
            timeoutMs: 5000,
          }
        );

        finalAnswer = synthesis.answer.trim();
        finalConfirmedFacts = this.mergeUniqueStrings(baseline.confirmedFacts, synthesis.confirmedFacts);
        finalInferences = this.mergeUniqueStrings(baseline.inferences, synthesis.inferences);
        finalUnknownOrMissing = this.mergeUniqueStrings(
          baseline.unknownOrMissingData,
          synthesis.unknownOrMissingData
        );
        externalProviderUsed = true;
        mode = 'EXTERNAL_AI_ASSISTED';
        providerName = this.aiProvider.getProviderName();
        fallbackReason = null;
      } catch {
        // Safe deterministic degradation on provider failure, timeout, or invalid schema
        externalProviderUsed = false;
        mode = 'DETERMINISTIC_FALLBACK';
        providerName = 'DeterministicMaintenanceEngine';
        fallbackReason = 'EXTERNAL_PROVIDER_ERROR';
      }
    }

    const nextDueDateIso = calc.nextDueDate ? (calc.nextDueDate.toISOString().split('T')[0] ?? null) : null;

    const response: PreventiveConsultationResponse = {
      vehicleId: vehicle.id,
      vehicleSummary: `${vehicle.make} ${vehicle.model} (${vehicle.year}) — ${vehicle.currentMileage.toLocaleString('es-AR')} km`,
      category: normalizedCategory,
      categoryLabel,
      question: effectiveQuestion,
      deterministicCalculation: {
        status: String(calc.status),
        nextDueMileage: calc.nextDueMileage,
        remainingKm: calc.remainingKm,
        nextDueDate: nextDueDateIso,
        estimatedDaysRemaining: calc.estimatedDaysRemaining,
        dueReason: String(calc.dueReason),
        confidence: String(calc.confidence),
        intervalSource: String(calc.intervalSource),
        sourceCitation: calc.sourceCitation ?? null,
        ruleVerificationStatus: ruleContext.ruleVerificationStatus,
        warning: calc.warning ?? null,
      },
      answer: finalAnswer,
      confirmedFacts: finalConfirmedFacts,
      inferences: finalInferences,
      unknownOrMissingData: finalUnknownOrMissing,
      sources,
      toolsInvoked,
      privacy: {
        mode,
        externalProviderConfigured,
        externalConsentGranted,
        externalProviderUsed,
        dataMinimizationApplied: true,
        piiSentToExternalProvider: false,
        providerName,
        fallbackReason,
      },
      disclaimer: STANDARD_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    };

    const validated = PreventiveConsultationResponseSchema.parse(response);
    return Result.ok(validated);
  }

  private async executeReadAuthorizedVehicle(
    context: AuthorizedAiContext
  ): Promise<AuthorizedVehicleSnapshot> {
    if (!UUID_REGEX.test(context.targetVehicleId)) {
      throw new AiResourceNotFoundError('Vehículo no encontrado.');
    }

    const vehicle = await this.vehicleRepo.findById(context.targetVehicleId);
    if (!vehicle) {
      throw new AiResourceNotFoundError('Vehículo no encontrado.');
    }

    if (context.actorScope === 'VEHICLE_OWNER') {
      if (!context.permissions.includes('READ') || vehicle.ownerId !== context.actorUserId) {
        throw new AiAccessDeniedError('Acceso denegado: no sos el propietario autorizado de este vehículo.');
      }
    } else {
      if (
        !context.workshopId ||
        !context.permissions.includes('READ') ||
        !context.permissions.includes('CALCULATE_PREVENTIVE')
      ) {
        throw new AiAccessDeniedError('Access forbidden: insufficient workshop permissions.');
      }
      if (vehicle.ownerId) {
        throw new AiAccessDeniedError(
          'Access forbidden: private owner vehicle has not shared access with this workshop.'
        );
      }
      const workshopRecords = await this.historyRepo.findByVehicleIdForWorkshop(
        vehicle.id,
        context.workshopId
      );
      if (workshopRecords.length === 0) {
        throw new AiAccessDeniedError(
          'Access forbidden: workshop has no authorized service relationship with this vehicle.'
        );
      }
    }

    const specs = (vehicle.technicalSpecs ?? {}) as Record<string, unknown>;
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      engine: vehicle.engine ?? null,
      fuelType: vehicle.fuelType ?? 'Nafta Super',
      currentMileage: vehicle.currentMileage,
      configurationId: vehicle.configurationId ?? null,
      declaredDistributionType:
        typeof specs.distributionType === 'string' ? specs.distributionType : 'DESCONOCIDO',
      declaredTransmission:
        typeof specs.transmission === 'string' ? specs.transmission : 'No especificada',
    };
  }

  private async executeReadAuthorizedHistory(
    context: AuthorizedAiContext
  ): Promise<readonly AuthorizedHistoryEntry[]> {
    const rawRecords =
      context.actorScope === 'VEHICLE_OWNER'
        ? await this.historyRepo.findByVehicleId(context.targetVehicleId)
        : await this.historyRepo.findByVehicleIdForWorkshop(
            context.targetVehicleId,
            context.workshopId!
          );

    const entries: AuthorizedHistoryEntry[] = [];
    for (const rec of rawRecords) {
      const originCitation = rec.isCertified
        ? 'Registro certificado por taller en red Automotors'
        : 'Registro declarado por propietario (sin certificación externa)';

      if (rec.interventions.length === 0) {
        entries.push({
          id: rec.id,
          serviceDate: rec.serviceDate,
          recordedMileage: rec.recordedMileage,
          category: 'GENERAL_INSPECTION',
          title: 'Mantenimiento registrado',
          isCertified: rec.isCertified,
          verificationLevel: rec.verificationLevel,
          originCitation,
        });
        continue;
      }

      for (const intv of rec.interventions) {
        entries.push({
          id: rec.id,
          serviceDate: rec.serviceDate,
          recordedMileage: rec.recordedMileage,
          category: VehicleKnowledgeBase.normalizeCategory(intv.category || intv.title),
          title: intv.title,
          isCertified: rec.isCertified,
          verificationLevel: rec.verificationLevel,
          originCitation,
        });
      }
    }

    return entries.sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());
  }

  private async executeReadTechnicalRules(
    vehicle: AuthorizedVehicleSnapshot,
    category: ServiceCategory
  ): Promise<AuthorizedTechnicalRuleContext> {
    const categoryLabel = CATEGORY_LABELS[category] ?? category;
    const kbProfile = VehicleKnowledgeBase.findProfile({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      engine: vehicle.engine ?? undefined,
    });

    const ident = await this.techIdentificationEngine.identify({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      engine: vehicle.engine ?? undefined,
      fuelType: vehicle.fuelType,
      transmission: vehicle.declaredTransmission,
      userDeclaredDistribution:
        vehicle.declaredDistributionType === 'CADENA' || vehicle.declaredDistributionType === 'CORREA'
          ? vehicle.declaredDistributionType
          : undefined,
    });

    let verifiedRule: ServiceIntervalRule | null = null;
    let pendingRule: ServiceIntervalRule | null = null;

    // 1. Check bound configuration or exact matched configuration in Knowledge Base
    const targetConfigId = vehicle.configurationId ?? ident.matchedConfiguration?.id ?? null;
    if (targetConfigId) {
      const kbRules = await this.kbRepo.listRulesByConfiguration(targetConfigId, {
        onlyActive: true,
      });
      for (const r of kbRules) {
        const normalized = VehicleKnowledgeBase.normalizeCategory(r.category);
        if (normalized !== category) continue;

        const mappedRule: ServiceIntervalRule = {
          id: r.id,
          category,
          title: r.title,
          intervalKm: r.intervalKm ?? 10000,
          intervalMonths: r.intervalMonths ?? 12,
          source: IntervalSource.OEM_MANUAL,
          sourceCitation: r.sourceReference ?? r.sourceTitle ?? 'Catálogo Técnico Automotors KB',
          severeUsageIntervalKm: r.severeIntervalKm ?? undefined,
          severeUsageIntervalMonths: r.severeIntervalMonths ?? undefined,
          operation: r.operation,
          ruleVersion: r.ruleVersion,
          verificationStatus: r.verificationStatus,
        };

        if (r.verificationStatus === 'VERIFIED') {
          verifiedRule = mappedRule;
          break;
        } else if (!pendingRule) {
          pendingRule = mappedRule;
        }
      }
    }

    // 2. Check documented rules in maintenance_intervals table
    if (!verifiedRule) {
      const modelPrefix = vehicle.model.split(' ')[0]?.trim() || vehicle.model.trim();
      const dbIntervalRows = await (this.db as any)
        .select()
        .from(maintenanceIntervals)
        .where(
          and(
            ilike(maintenanceIntervals.make, `%${vehicle.make.trim()}%`),
            ilike(maintenanceIntervals.model, `%${modelPrefix}%`)
          )
        );

      const matchedRow = dbIntervalRows.find(
        (row: any) => VehicleKnowledgeBase.normalizeCategory(row.category) === category
      );

      if (matchedRow && matchedRow.intervalKm && matchedRow.intervalMonths) {
        verifiedRule = {
          id: matchedRow.id,
          category,
          title: `Pauta Preventiva (${categoryLabel})`,
          intervalKm: Number(matchedRow.intervalKm),
          intervalMonths: Number(matchedRow.intervalMonths),
          source: IntervalSource.OEM_MANUAL,
          sourceCitation: matchedRow.sourceCitation,
          verificationStatus: 'VERIFIED',
        };
      }
    }

    // 3. Check static Knowledge Base profile for pending/reference rules
    if (!verifiedRule && !pendingRule && kbProfile) {
      const staticMatch = kbProfile.intervals.find((r) => r.category === category) ?? null;
      if (staticMatch) {
        pendingRule = staticMatch;
      }
    }

    const selectedRule = verifiedRule ?? pendingRule ?? null;
    const ruleVerificationStatus: 'VERIFIED' | 'PENDING_VERIFICATION' | 'NONE' = verifiedRule
      ? 'VERIFIED'
      : pendingRule
        ? 'PENDING_VERIFICATION'
        : 'NONE';

    const distributionType =
      ident.distributionType !== 'DESCONOCIDO'
        ? ident.distributionType
        : kbProfile?.distributionType ??
          (vehicle.declaredDistributionType === 'CADENA' || vehicle.declaredDistributionType === 'CORREA'
            ? vehicle.declaredDistributionType
            : 'DESCONOCIDO');

    const exactEngineCodeStatus =
      ident.isDocumentarilyVerified || kbProfile?.exactEngineCodeStatus === 'CONFIRMED'
        ? 'CONFIRMED'
        : 'PENDING_CONFIRMATION';

    return {
      category,
      categoryLabel,
      selectedRule,
      ruleVerificationStatus,
      exactEngineCodeStatus,
      distributionType,
      distributionNote: kbProfile?.distributionNote ?? ident.technicalNotes ?? null,
      identificationReason: ident.reason ?? null,
      requiresConfigurationConfirmation: ident.requiresConfirmation,
    };
  }

  private async executeDeterministicEngine(
    vehicle: AuthorizedVehicleSnapshot,
    ruleContext: AuthorizedTechnicalRuleContext,
    history: readonly AuthorizedHistoryEntry[],
    currentDate?: Date
  ): Promise<DeterministicExecutionOutput> {
    const categoryServices = history.filter((h) => h.category === ruleContext.category);
    const previousServices: PreviousServiceEntry[] = categoryServices.map((s) => ({
      serviceDate: s.serviceDate,
      recordedMileage: s.recordedMileage,
      category: s.category,
    }));

    // Deduplicate odometer readings by record id
    const uniqueReadingsMap = new Map<string, { date: Date; mileage: number }>();
    for (const h of history) {
      if (!uniqueReadingsMap.has(h.id)) {
        uniqueReadingsMap.set(h.id, { date: h.serviceDate, mileage: h.recordedMileage });
      }
    }
    const odometerReadings = Array.from(uniqueReadingsMap.values());

    let estimatedMonthlyKm: number | null = null;
    if (odometerReadings.length >= 2) {
      const sorted = [...odometerReadings].sort((a, b) => a.date.getTime() - b.date.getTime());
      const oldest = sorted[0]!;
      const monthsElapsed = Math.max(
        1,
        ((currentDate ?? new Date()).getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
      );
      const kmDelta = vehicle.currentMileage - oldest.mileage;
      if (kmDelta > 0) {
        estimatedMonthlyKm = Math.round(kmDelta / monthsElapsed);
      }
    }

    const calculation = this.deterministicEngine.calculate({
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.currentMileage,
      },
      rule: ruleContext.selectedRule,
      previousServices,
      odometerReadings,
      usageConditions: estimatedMonthlyKm ? { averageMonthlyKm: estimatedMonthlyKm } : undefined,
      currentDate,
    });

    return {
      calculation,
      estimatedMonthlyKm,
      categoryServices,
    };
  }

  private buildEvidenceSources(
    vehicle: AuthorizedVehicleSnapshot,
    allHistory: readonly AuthorizedHistoryEntry[],
    categoryServices: readonly AuthorizedHistoryEntry[],
    ruleContext: AuthorizedTechnicalRuleContext,
    calc: MaintenanceCalculationResult
  ): AiEvidenceSource[] {
    const sources: AiEvidenceSource[] = [
      {
        sourceType: 'VEHICLE_PROFILE',
        sourceId: vehicle.id,
        title: `Ficha Vehicular: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
        verificationStatus: 'VERIFIED',
        citation: 'Registro vehicular autorizado en Automotors Garage',
        summary: `Odómetro actual registrado: ${vehicle.currentMileage.toLocaleString('es-AR')} km. Motor: ${vehicle.engine ?? 'No especificado'}.`,
      },
    ];

    if (categoryServices.length > 0) {
      for (const svc of categoryServices.slice(0, 3)) {
        const dateStr = svc.serviceDate.toISOString().split('T')[0] ?? '';
        sources.push({
          sourceType: 'MAINTENANCE_HISTORY',
          sourceId: svc.id,
          title: svc.title,
          verificationStatus: svc.isCertified ? 'CERTIFIED_WORKSHOP' : 'OWNER_DECLARED',
          citation: svc.originCitation,
          summary: `Servicio registrado a los ${svc.recordedMileage.toLocaleString('es-AR')} km el ${dateStr}.`,
        });
      }
    } else if (allHistory.length > 0) {
      const latestAny = allHistory[0]!;
      const dateStr = latestAny.serviceDate.toISOString().split('T')[0] ?? '';
      sources.push({
        sourceType: 'MAINTENANCE_HISTORY',
        sourceId: latestAny.id,
        title: `Historial General (${allHistory.length} intervenciones en otras categorías)`,
        verificationStatus: latestAny.isCertified ? 'CERTIFIED_WORKSHOP' : 'OWNER_DECLARED',
        citation: latestAny.originCitation,
        summary: `Último evento general a los ${latestAny.recordedMileage.toLocaleString('es-AR')} km (${dateStr}), sin registros en ${ruleContext.categoryLabel}.`,
      });
    }

    if (ruleContext.selectedRule) {
      const rule = ruleContext.selectedRule;
      sources.push({
        sourceType: 'KNOWLEDGE_BASE_RULE',
        sourceId: rule.id,
        title: rule.title,
        verificationStatus:
          ruleContext.ruleVerificationStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING_VERIFICATION',
        citation: rule.sourceCitation,
        summary: `Intervalo de referencia: ${rule.intervalKm.toLocaleString('es-AR')} km o ${rule.intervalMonths} meses (Estado: ${ruleContext.ruleVerificationStatus}).`,
      });
    }

    sources.push({
      sourceType: 'DETERMINISTIC_ENGINE',
      sourceId: `deterministic-${vehicle.id}-${ruleContext.category}`,
      title: 'Motor Determinista de Mantenimiento Preventivo',
      verificationStatus: 'DETERMINISTIC',
      citation: 'DeterministicMaintenanceEngine v1',
      summary:
        calc.status === MaintenanceStatus.INSUFFICIENT_DATA
          ? `Resultado: INSUFFICIENT_DATA (${calc.warning ?? 'Datos insuficientes para proyectar vencimiento'}).`
          : `Resultado: ${calc.status} | Próximo servicio: ${calc.nextDueMileage?.toLocaleString('es-AR') ?? 'S/D'} km (Restan: ${calc.remainingKm?.toLocaleString('es-AR') ?? 'S/D'} km) | Confianza: ${calc.confidence}.`,
    });

    return sources;
  }

  private buildDeterministicBaseline(
    vehicle: AuthorizedVehicleSnapshot,
    allHistory: readonly AuthorizedHistoryEntry[],
    engineOutput: DeterministicExecutionOutput,
    ruleContext: AuthorizedTechnicalRuleContext,
    categoryLabel: string
  ): {
    answer: string;
    confirmedFacts: string[];
    inferences: string[];
    unknownOrMissingData: string[];
  } {
    const { calculation: calc, estimatedMonthlyKm, categoryServices } = engineOutput;
    const confirmedFacts: string[] = [];
    const inferences: string[] = [];
    const unknownOrMissingData: string[] = [];

    // 1. Confirmed Facts
    confirmedFacts.push(
      `Vehículo autorizado: ${vehicle.make} ${vehicle.model} (${vehicle.year}) con odómetro actual registrado de ${vehicle.currentMileage.toLocaleString('es-AR')} km.`
    );

    const lastCategoryService = categoryServices[0];
    if (lastCategoryService) {
      const dateStr = lastCategoryService.serviceDate.toISOString().split('T')[0] ?? '';
      confirmedFacts.push(
        `Último antecedente registrado en ${categoryLabel}: ${lastCategoryService.recordedMileage.toLocaleString('es-AR')} km el ${dateStr} (${lastCategoryService.isCertified ? 'Certificado por taller' : 'Declarado por propietario'}).`
      );
    }

    if (ruleContext.selectedRule && ruleContext.ruleVerificationStatus === 'VERIFIED') {
      confirmedFacts.push(
        `Regla técnica verificada (${ruleContext.selectedRule.title}): cada ${ruleContext.selectedRule.intervalKm.toLocaleString('es-AR')} km o ${ruleContext.selectedRule.intervalMonths} meses (${ruleContext.selectedRule.sourceCitation}).`
      );
    }

    if (calc.status !== MaintenanceStatus.INSUFFICIENT_DATA) {
      const nextDueDateStr = calc.nextDueDate ? (calc.nextDueDate.toISOString().split('T')[0] ?? 'S/D') : 'S/D';
      confirmedFacts.push(
        `Cálculo determinista verificado: estado ${calc.status}, próximo vencimiento a los ${calc.nextDueMileage?.toLocaleString('es-AR') ?? 'S/D'} km (diferencia actual: ${calc.remainingKm?.toLocaleString('es-AR') ?? 'S/D'} km) o fecha límite ${nextDueDateStr}.`
      );
    } else {
      confirmedFacts.push(
        `El motor determinista reportó estado INSUFFICIENT_DATA y bloqueó el cálculo numérico para evitar proyecciones sin respaldo documental verificado.`
      );
    }

    // 2. Inferences
    if (calc.status !== MaintenanceStatus.INSUFFICIENT_DATA) {
      const nextDueDateStr = calc.nextDueDate ? (calc.nextDueDate.toISOString().split('T')[0] ?? 'S/D') : 'S/D';
      if (estimatedMonthlyKm !== null) {
        inferences.push(
          `Ritmo de uso estimado en ~${estimatedMonthlyKm.toLocaleString('es-AR')} km/mes a partir de la progresión histórica del odómetro, proyectando vencimiento temporal hacia ${nextDueDateStr}.`
        );
      } else {
        inferences.push(
          `A falta de múltiples lecturas históricas espaciadas, la proyección temporal (${nextDueDateStr}) asume un uso estándar de referencia de 1.250 km/mes en condiciones normales.`
        );
      }

      if (!lastCategoryService) {
        inferences.push(
          `Al no existir un servicio previo registrado en ${categoryLabel}, el próximo vencimiento (${calc.nextDueMileage?.toLocaleString('es-AR')} km) se proyecta desde el origen del vehículo (0 km / año ${vehicle.year}) con confianza ${calc.confidence}.`
        );
      }
    } else if (ruleContext.selectedRule && ruleContext.ruleVerificationStatus === 'PENDING_VERIFICATION') {
      inferences.push(
        `Existe en catálogo una pauta técnica preliminar en revisión (${ruleContext.selectedRule.intervalKm.toLocaleString('es-AR')} km / ${ruleContext.selectedRule.intervalMonths} meses — ${ruleContext.selectedRule.sourceCitation}), pero no se aplica como vencimiento confirmado hasta completar su verificación documental.`
      );
    }

    if (ruleContext.category === 'TIMING_BELT' && ruleContext.distributionNote) {
      inferences.push(`Observación constructiva del tren motriz: ${ruleContext.distributionNote}`);
    }

    // 3. Unknown or Missing Data
    if (allHistory.length === 0) {
      unknownOrMissingData.push(
        'El vehículo no posee registros en su historial de mantenimiento dentro de la plataforma.'
      );
    } else if (!lastCategoryService) {
      unknownOrMissingData.push(
        `No hay mantenimientos previos registrados específicamente para la categoría ${categoryLabel}.`
      );
    }

    if (!ruleContext.selectedRule) {
      unknownOrMissingData.push(
        `No se encontró ninguna regla de intervalo técnico documentada en la base de conocimiento para ${categoryLabel} en ${vehicle.make} ${vehicle.model} (${vehicle.year}).`
      );
    } else if (ruleContext.ruleVerificationStatus !== 'VERIFIED') {
      unknownOrMissingData.push(
        `La regla técnica para ${categoryLabel} se encuentra en estado '${ruleContext.ruleVerificationStatus}' (pendiente de homologación contra manual primario del fabricante).`
      );
    }

    if (ruleContext.exactEngineCodeStatus === 'PENDING_CONFIRMATION') {
      unknownOrMissingData.push(
        'El código exacto de motorización no cuenta con confirmación documental verificada en cédula o block.'
      );
    }

    if (calc.warning && calc.warning.includes('Odometer inconsistency')) {
      unknownOrMissingData.push(
        `Inconsistencia de odómetro detectada: el kilometraje actual (${vehicle.currentMileage.toLocaleString('es-AR')} km) es inferior al último servicio registrado en la categoría.`
      );
    }

    unknownOrMissingData.push(
      'Se desconoce si el vehículo opera bajo régimen de uso severo (tránsito urbano extremo, polvo, remolque o recorridos cortos en frío), lo cual reduciría el intervalo preventivo.'
    );

    // 4. Narrative Answer
    let answer: string;
    if (calc.status === MaintenanceStatus.INSUFFICIENT_DATA) {
      const pendingMention =
        ruleContext.selectedRule && ruleContext.ruleVerificationStatus === 'PENDING_VERIFICATION'
          ? ` En la base técnica figura una pauta en revisión (${ruleContext.selectedRule.intervalKm.toLocaleString('es-AR')} km o ${ruleContext.selectedRule.intervalMonths} meses), pero permanece excluida del cálculo automático hasta su verificación documental.`
          : ' No existe una regla de intervalo verificada para esta categoría y configuración.';
      const historyMention = lastCategoryService
        ? ` Se registra un antecedente en esta categoría a los ${lastCategoryService.recordedMileage.toLocaleString('es-AR')} km.`
        : ' Además, no se registran servicios previos confirmados en esta categoría.';

      answer = `No es posible emitir un kilometraje ni fecha de vencimiento confirmados para ${categoryLabel} en tu ${vehicle.make} ${vehicle.model} (${vehicle.currentMileage.toLocaleString('es-AR')} km) porque el motor determinista determinó datos insuficientes (INSUFFICIENT_DATA).${pendingMention}${historyMention}`;
    } else {
      const statusDescriptions: Record<string, string> = {
        OVERDUE: 'se encuentra VENCIDO',
        DUE_NOW: 'requiere ATENCIÓN INMEDIATA (dentro del margen límite)',
        UPCOMING_SOON: 'está PRÓXIMO A VENCER',
        OK: 'se encuentra AL DÍA dentro del rango preventivo',
      };
      const statusText = statusDescriptions[calc.status] ?? `presenta estado ${calc.status}`;
      const remainingText =
        calc.remainingKm !== null
          ? calc.remainingKm >= 0
            ? `restan ${calc.remainingKm.toLocaleString('es-AR')} km`
            : `excedido por ${Math.abs(calc.remainingKm).toLocaleString('es-AR')} km`
          : 'sin margen de kilometraje calculado';
      const nextDateStr = calc.nextDueDate ? (calc.nextDueDate.toISOString().split('T')[0] ?? 'S/D') : 'S/D';
      const baseText = lastCategoryService
        ? `tomando como base el último servicio registrado a los ${lastCategoryService.recordedMileage.toLocaleString('es-AR')} km`
        : `calculado desde el kilometraje inicial (sin servicio previo registrado en la categoría, confianza ${calc.confidence})`;

      answer = `El mantenimiento de ${categoryLabel} para tu ${vehicle.make} ${vehicle.model} (${vehicle.currentMileage.toLocaleString('es-AR')} km) ${statusText}. Según el cálculo determinista (${baseText} y pauta verificada cada ${ruleContext.selectedRule?.intervalKm.toLocaleString('es-AR')} km o ${ruleContext.selectedRule?.intervalMonths} meses), el próximo vencimiento corresponde a los ${calc.nextDueMileage?.toLocaleString('es-AR')} km (${remainingText}) o fecha proyectada ${nextDateStr}.`;
    }

    return {
      answer,
      confirmedFacts,
      inferences,
      unknownOrMissingData,
    };
  }

  private buildMinimizedExternalPrompt(params: {
    vehicle: AuthorizedVehicleSnapshot;
    categoryLabel: string;
    question: string;
    calc: MaintenanceCalculationResult;
    ruleContext: AuthorizedTechnicalRuleContext;
    baseline: {
      answer: string;
      confirmedFacts: string[];
      inferences: string[];
      unknownOrMissingData: string[];
    };
  }): string {
    const { vehicle, categoryLabel, question, calc, ruleContext, baseline } = params;
    const nextDueDateStr = calc.nextDueDate ? (calc.nextDueDate.toISOString().split('T')[0] ?? 'null') : 'null';

    return `Minimized Technical Context (NO PII, NO VIN, NO PLATE):
Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.year})
Current Odometer: ${vehicle.currentMileage} km
Category: ${categoryLabel} (${ruleContext.category})
User Question: ${question}
Rule Verification Status: ${ruleContext.ruleVerificationStatus}
Deterministic Engine Status: ${calc.status}
Deterministic Next Due Mileage: ${calc.nextDueMileage ?? 'null'}
Deterministic Remaining Km: ${calc.remainingKm ?? 'null'}
Deterministic Next Due Date: ${nextDueDateStr}
Deterministic Confidence: ${calc.confidence}

Confirmed Facts:
${JSON.stringify(baseline.confirmedFacts)}

Inferences:
${JSON.stringify(baseline.inferences)}

Unknown or Missing Data:
${JSON.stringify(baseline.unknownOrMissingData)}

Explain the preventive maintenance status clearly in Spanish without altering any deterministic number, without inventing intervals, and strictly separating confirmedFacts, inferences, and unknownOrMissingData. Output JSON matching { answer, confirmedFacts, inferences, unknownOrMissingData }.`;
  }

  private inferCategoryFromQuestion(question: string): ServiceCategory {
    return VehicleKnowledgeBase.normalizeCategory(question);
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]')
      .replace(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g, '[REDACTED]')
      .replace(/\b[A-Za-z]{2}\s*\d{3}\s*[A-Za-z]{2}\b/g, '[REDACTED]')
      .replace(/\b[A-Za-z]{3}\s*\d{3}\b/g, '[REDACTED]')
      .replace(/\b[A-HJ-NPR-Za-hj-npr-z0-9]{17}\b/g, '[REDACTED]')
      .replace(/\b(?:mi nombre es|me llamo|soy)\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]+/gi, '[REDACTED]')
      .replace(/<\/?[a-zA-Z0-9_-]+>/g, '')
      .replace(/<\/?(?:system|user|assistant)>/gi, '');
  }

  private mergeUniqueStrings(mandatory: readonly string[], extra: readonly string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of [...mandatory, ...extra]) {
      const trimmed = item.trim();
      if (trimmed.length > 0 && !seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    }
    return result;
  }
}
