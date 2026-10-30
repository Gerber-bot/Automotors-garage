import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';
import type { DatabaseInstance } from '../client.ts';
import {
  kbManufacturers,
  kbModels,
  kbGenerations,
  kbPowertrains,
  kbDocumentSources,
  kbConfigurations,
  kbTechnicalSpecs,
  kbMaintenanceRules,
} from '../schema/knowledge-base.ts';

export interface KbManufacturerRecord {
  id: string;
  name: string;
  country: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KbModelRecord {
  id: string;
  manufacturerId: string;
  name: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KbGenerationRecord {
  id: string;
  modelId: string;
  generationName: string;
  generationCode: string | null;
  startYear: number;
  endYear: number | null;
  market: string;
  verificationStatus: string;
  metadata?: Record<string, unknown> | null;
}

export interface KbPowertrainRecord {
  id: string;
  manufacturerId: string;
  engineCode: string;
  family: string | null;
  displacementCc: number | null;
  displacementLiters: string | null;
  fuelType: string;
  valves: number | null;
  powerHp: number | null;
  timingMechanism: string;
  timingObservations: string | null;
  oilViscosityOem: string | null;
  oilCapacityLiters: string | null;
  verificationStatus: string;
}

export interface KbConfigurationRecord {
  id: string;
  modelId: string;
  generationId: string;
  powertrainId: string | null;
  commercialName: string;
  yearFrom: number;
  yearTo: number | null;
  market: string;
  transmission: string;
  bodyStyle: string | null;
  trim: string | null;
  sourceId: string | null;
  verificationStatus: string;
  metadata?: Record<string, unknown> | null;
  // joined fields
  makeName?: string;
  modelName?: string;
  generationName?: string;
  powertrain?: KbPowertrainRecord | null;
  sourceTitle?: string | null;
}

export interface KbTechnicalSpecRecord {
  id: string;
  configurationId: string;
  category: string;
  specKey: string;
  specValue: string;
  unit: string | null;
  condition: string | null;
  sourceId: string | null;
  verificationStatus: string;
}

export interface KbMaintenanceRuleRecord {
  id: string;
  configurationId: string;
  category: string;
  operation: string;
  title: string;
  description: string | null;
  intervalKm: number | null;
  intervalMonths: number | null;
  severeIntervalKm: number | null;
  severeIntervalMonths: number | null;
  conditions: string | null;
  sourceId: string | null;
  verificationStatus: string;
  ruleVersion: number;
  previousVersionId: string | null;
  isActive: boolean;
  verifiedByUserId: string | null;
  verifiedAt: Date | null;
  verificationNotes: string | null;
  sourceTitle?: string | null;
  sourceReference?: string | null;
}

export interface KbDocumentSourceRecord {
  id: string;
  docType: string;
  publisher: string;
  title: string;
  market: string;
  versionOrDate: string | null;
  documentReference: string | null;
  pageOrSection: string | null;
  consultationDate: Date | null;
  reviewStatus: string;
  metadata?: Record<string, unknown> | null;
}

export class PostgresKnowledgeBaseRepository {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // --- MANUFACTURERS ---
  public async findManufacturerByName(name: string): Promise<KbManufacturerRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(kbManufacturers)
      .where(ilike(kbManufacturers.name, name.trim()))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listManufacturers(): Promise<KbManufacturerRecord[]> {
    return await (this.db as any)
      .select()
      .from(kbManufacturers)
      .orderBy(kbManufacturers.name);
  }

  public async saveManufacturer(data: {
    id?: string;
    name: string;
    country?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KbManufacturerRecord> {
    const rows = await (this.db as any)
      .insert(kbManufacturers)
      .values({
        id: data.id,
        name: data.name.trim(),
        country: data.country ?? null,
        status: data.status ?? 'ACTIVE',
        metadata: data.metadata ?? {},
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: kbManufacturers.name,
        set: {
          country: data.country ?? null,
          status: data.status ?? 'ACTIVE',
          metadata: data.metadata ?? {},
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  }

  // --- MODELS ---
  public async findModel(manufacturerId: string, name: string): Promise<KbModelRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(kbModels)
      .where(and(eq(kbModels.manufacturerId, manufacturerId), ilike(kbModels.name, name.trim())))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listModels(manufacturerId?: string): Promise<KbModelRecord[]> {
    const query = (this.db as any).select().from(kbModels);
    if (manufacturerId) {
      return await query.where(eq(kbModels.manufacturerId, manufacturerId)).orderBy(kbModels.name);
    }
    return await query.orderBy(kbModels.name);
  }

  public async saveModel(data: {
    id?: string;
    manufacturerId: string;
    name: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KbModelRecord> {
    const rows = await (this.db as any)
      .insert(kbModels)
      .values({
        id: data.id,
        manufacturerId: data.manufacturerId,
        name: data.name.trim(),
        status: data.status ?? 'ACTIVE',
        metadata: data.metadata ?? {},
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [kbModels.manufacturerId, kbModels.name],
        set: {
          status: data.status ?? 'ACTIVE',
          metadata: data.metadata ?? {},
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  }

  // --- GENERATIONS ---
  public async listGenerations(modelId: string): Promise<KbGenerationRecord[]> {
    return await (this.db as any)
      .select()
      .from(kbGenerations)
      .where(eq(kbGenerations.modelId, modelId))
      .orderBy(kbGenerations.startYear);
  }

  public async saveGeneration(data: {
    id?: string;
    modelId: string;
    generationName: string;
    generationCode?: string;
    startYear: number;
    endYear?: number;
    market?: string;
    verificationStatus?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KbGenerationRecord> {
    const rows = await (this.db as any)
      .insert(kbGenerations)
      .values({
        id: data.id,
        modelId: data.modelId,
        generationName: data.generationName,
        generationCode: data.generationCode ?? null,
        startYear: data.startYear,
        endYear: data.endYear ?? null,
        market: data.market ?? 'AR',
        verificationStatus: data.verificationStatus ?? 'DRAFT',
        metadata: data.metadata ?? {},
        updatedAt: new Date(),
      })
      .returning();
    return rows[0];
  }

  // --- POWERTRAINS ---
  public async findPowertrainByCode(
    manufacturerId: string,
    engineCode: string
  ): Promise<KbPowertrainRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(kbPowertrains)
      .where(
        and(
          eq(kbPowertrains.manufacturerId, manufacturerId),
          ilike(kbPowertrains.engineCode, engineCode.trim())
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  public async savePowertrain(data: {
    id?: string;
    manufacturerId: string;
    engineCode: string;
    family?: string;
    displacementCc?: number;
    displacementLiters?: number;
    fuelType?: string;
    valves?: number;
    powerHp?: number;
    timingMechanism: string;
    timingObservations?: string;
    oilViscosityOem?: string;
    oilCapacityLiters?: number;
    verificationStatus?: string;
  }): Promise<KbPowertrainRecord> {
    const rows = await (this.db as any)
      .insert(kbPowertrains)
      .values({
        id: data.id,
        manufacturerId: data.manufacturerId,
        engineCode: data.engineCode.trim(),
        family: data.family ?? null,
        displacementCc: data.displacementCc ?? null,
        displacementLiters: data.displacementLiters ? data.displacementLiters.toString() : null,
        fuelType: data.fuelType ?? 'GASOLINE',
        valves: data.valves ?? null,
        powerHp: data.powerHp ?? null,
        timingMechanism: data.timingMechanism,
        timingObservations: data.timingObservations ?? null,
        oilViscosityOem: data.oilViscosityOem ?? null,
        oilCapacityLiters: data.oilCapacityLiters ? data.oilCapacityLiters.toString() : null,
        verificationStatus: data.verificationStatus ?? 'DRAFT',
        updatedAt: new Date(),
      })
      .returning();
    return rows[0];
  }

  // --- DOCUMENT SOURCES ---
  public async saveDocumentSource(data: {
    id?: string;
    docType: string;
    publisher: string;
    title: string;
    market?: string;
    versionOrDate?: string;
    documentReference?: string;
    pageOrSection?: string;
    consultationDate?: Date;
    reviewStatus?: string;
  }): Promise<KbDocumentSourceRecord> {
    const rows = await (this.db as any)
      .insert(kbDocumentSources)
      .values({
        id: data.id,
        docType: data.docType,
        publisher: data.publisher,
        title: data.title,
        market: data.market ?? 'AR',
        versionOrDate: data.versionOrDate ?? null,
        documentReference: data.documentReference ?? null,
        pageOrSection: data.pageOrSection ?? null,
        consultationDate: data.consultationDate ?? new Date(),
        reviewStatus: data.reviewStatus ?? 'VERIFIED',
      })
      .returning();
    return rows[0];
  }

  public async findDocumentSourceById(id: string): Promise<KbDocumentSourceRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(kbDocumentSources)
      .where(eq(kbDocumentSources.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  // --- CONFIGURATIONS ---
  public async saveConfiguration(data: {
    id?: string;
    modelId: string;
    generationId: string;
    powertrainId?: string;
    commercialName: string;
    yearFrom: number;
    yearTo?: number;
    market?: string;
    transmission?: string;
    bodyStyle?: string;
    trim?: string;
    sourceId?: string;
    verificationStatus?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KbConfigurationRecord> {
    const rows = await (this.db as any)
      .insert(kbConfigurations)
      .values({
        id: data.id,
        modelId: data.modelId,
        generationId: data.generationId,
        powertrainId: data.powertrainId ?? null,
        commercialName: data.commercialName,
        yearFrom: data.yearFrom,
        yearTo: data.yearTo ?? null,
        market: data.market ?? 'AR',
        transmission: data.transmission ?? 'MANUAL',
        bodyStyle: data.bodyStyle ?? null,
        trim: data.trim ?? null,
        sourceId: data.sourceId ?? null,
        verificationStatus: data.verificationStatus ?? 'DRAFT',
        metadata: data.metadata ?? {},
        updatedAt: new Date(),
      })
      .returning();
    return rows[0];
  }

  public async findConfigurationById(id: string): Promise<KbConfigurationRecord | null> {
    const rows = await (this.db as any)
      .select({
        config: kbConfigurations,
        model: kbModels,
        manufacturer: kbManufacturers,
        generation: kbGenerations,
        powertrain: kbPowertrains,
        source: kbDocumentSources,
      })
      .from(kbConfigurations)
      .innerJoin(kbModels, eq(kbConfigurations.modelId, kbModels.id))
      .innerJoin(kbManufacturers, eq(kbModels.manufacturerId, kbManufacturers.id))
      .innerJoin(kbGenerations, eq(kbConfigurations.generationId, kbGenerations.id))
      .leftJoin(kbPowertrains, eq(kbConfigurations.powertrainId, kbPowertrains.id))
      .leftJoin(kbDocumentSources, eq(kbConfigurations.sourceId, kbDocumentSources.id))
      .where(eq(kbConfigurations.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      ...r.config,
      makeName: r.manufacturer.name,
      modelName: r.model.name,
      generationName: r.generation.generationName,
      powertrain: r.powertrain ?? null,
      sourceTitle: r.source?.title ?? null,
    };
  }

  public async searchConfigurations(filter: {
    make?: string;
    model?: string;
    year?: number;
    market?: string;
  }): Promise<KbConfigurationRecord[]> {
    let query = (this.db as any)
      .select({
        config: kbConfigurations,
        model: kbModels,
        manufacturer: kbManufacturers,
        generation: kbGenerations,
        powertrain: kbPowertrains,
        source: kbDocumentSources,
      })
      .from(kbConfigurations)
      .innerJoin(kbModels, eq(kbConfigurations.modelId, kbModels.id))
      .innerJoin(kbManufacturers, eq(kbModels.manufacturerId, kbManufacturers.id))
      .innerJoin(kbGenerations, eq(kbConfigurations.generationId, kbGenerations.id))
      .leftJoin(kbPowertrains, eq(kbConfigurations.powertrainId, kbPowertrains.id))
      .leftJoin(kbDocumentSources, eq(kbConfigurations.sourceId, kbDocumentSources.id));

    const conditions = [];

    if (filter.make) {
      conditions.push(ilike(kbManufacturers.name, `%${filter.make.trim()}%`));
    }
    if (filter.model) {
      conditions.push(ilike(kbModels.name, `%${filter.model.trim()}%`));
    }
    if (filter.year) {
      conditions.push(
        and(
          sql`${kbConfigurations.yearFrom} <= ${filter.year}`,
          or(sql`${kbConfigurations.yearTo} IS NULL`, sql`${kbConfigurations.yearTo} >= ${filter.year}`)
        )
      );
    }
    if (filter.market) {
      conditions.push(eq(kbConfigurations.market, filter.market));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(kbConfigurations.commercialName);
    return rows.map((r: any) => ({
      ...r.config,
      makeName: r.manufacturer.name,
      modelName: r.model.name,
      generationName: r.generation.generationName,
      powertrain: r.powertrain ?? null,
      sourceTitle: r.source?.title ?? null,
    }));
  }

  // --- TECHNICAL SPECS ---
  public async saveTechnicalSpec(data: {
    id?: string;
    configurationId: string;
    category: string;
    specKey: string;
    specValue: string;
    unit?: string;
    condition?: string;
    sourceId?: string;
    verificationStatus?: string;
  }): Promise<KbTechnicalSpecRecord> {
    const rows = await (this.db as any)
      .insert(kbTechnicalSpecs)
      .values({
        id: data.id,
        configurationId: data.configurationId,
        category: data.category,
        specKey: data.specKey,
        specValue: data.specValue,
        unit: data.unit ?? null,
        condition: data.condition ?? 'ALL',
        sourceId: data.sourceId ?? null,
        verificationStatus: data.verificationStatus ?? 'DRAFT',
      })
      .returning();
    return rows[0];
  }

  public async listTechnicalSpecs(configurationId: string): Promise<KbTechnicalSpecRecord[]> {
    return await (this.db as any)
      .select()
      .from(kbTechnicalSpecs)
      .where(eq(kbTechnicalSpecs.configurationId, configurationId))
      .orderBy(kbTechnicalSpecs.category, kbTechnicalSpecs.specKey);
  }

  // --- MAINTENANCE RULES ---
  public async saveMaintenanceRule(data: {
    id?: string;
    configurationId: string;
    category: string;
    operation?: string;
    title: string;
    description?: string;
    intervalKm?: number;
    intervalMonths?: number;
    severeIntervalKm?: number;
    severeIntervalMonths?: number;
    conditions?: string;
    sourceId?: string;
    verificationStatus?: string;
    ruleVersion?: number;
    previousVersionId?: string;
    isActive?: boolean;
    verifiedByUserId?: string;
    verifiedAt?: Date;
    verificationNotes?: string;
  }): Promise<KbMaintenanceRuleRecord> {
    const rows = await (this.db as any)
      .insert(kbMaintenanceRules)
      .values({
        id: data.id,
        configurationId: data.configurationId,
        category: data.category,
        operation: data.operation ?? 'REPLACE',
        title: data.title,
        description: data.description ?? null,
        intervalKm: data.intervalKm ?? null,
        intervalMonths: data.intervalMonths ?? null,
        severeIntervalKm: data.severeIntervalKm ?? null,
        severeIntervalMonths: data.severeIntervalMonths ?? null,
        conditions: data.conditions ?? null,
        sourceId: data.sourceId ?? null,
        verificationStatus: data.verificationStatus ?? 'DRAFT',
        ruleVersion: data.ruleVersion ?? 1,
        previousVersionId: data.previousVersionId ?? null,
        isActive: data.isActive ?? true,
        verifiedByUserId: data.verifiedByUserId ?? null,
        verifiedAt: data.verifiedAt ?? null,
        verificationNotes: data.verificationNotes ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return rows[0];
  }

  public async findRuleById(id: string): Promise<KbMaintenanceRuleRecord | null> {
    const rows = await (this.db as any)
      .select({
        rule: kbMaintenanceRules,
        source: kbDocumentSources,
      })
      .from(kbMaintenanceRules)
      .leftJoin(kbDocumentSources, eq(kbMaintenanceRules.sourceId, kbDocumentSources.id))
      .where(eq(kbMaintenanceRules.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      ...r.rule,
      sourceTitle: r.source?.title ?? null,
      sourceReference: r.source?.documentReference ?? null,
    };
  }

  public async listRulesByConfiguration(
    configurationId: string,
    options?: { onlyActive?: boolean; onlyVerified?: boolean }
  ): Promise<KbMaintenanceRuleRecord[]> {
    const conditions = [eq(kbMaintenanceRules.configurationId, configurationId)];
    if (options?.onlyActive !== false) {
      conditions.push(eq(kbMaintenanceRules.isActive, true));
    }
    if (options?.onlyVerified) {
      conditions.push(eq(kbMaintenanceRules.verificationStatus, 'VERIFIED'));
    }

    const rows = await (this.db as any)
      .select({
        rule: kbMaintenanceRules,
        source: kbDocumentSources,
      })
      .from(kbMaintenanceRules)
      .leftJoin(kbDocumentSources, eq(kbMaintenanceRules.sourceId, kbDocumentSources.id))
      .where(and(...conditions))
      .orderBy(kbMaintenanceRules.category, desc(kbMaintenanceRules.ruleVersion));

    return rows.map((r: any) => ({
      ...r.rule,
      sourceTitle: r.source?.title ?? null,
      sourceReference: r.source?.documentReference ?? null,
    }));
  }

  public async verifyRule(params: {
    ruleId: string;
    verifierUserId: string;
    notes?: string;
  }): Promise<KbMaintenanceRuleRecord> {
    const rows = await (this.db as any)
      .update(kbMaintenanceRules)
      .set({
        verificationStatus: 'VERIFIED',
        verifiedByUserId: params.verifierUserId,
        verifiedAt: new Date(),
        verificationNotes: params.notes ?? 'Verificado conforme a documentación técnica oficial.',
        updatedAt: new Date(),
      })
      .where(eq(kbMaintenanceRules.id, params.ruleId))
      .returning();

    if (rows.length === 0) {
      throw new Error(`Rule with ID '${params.ruleId}' not found.`);
    }
    return rows[0];
  }

  public async createRuleRevision(params: {
    ruleId: string;
    changes: Partial<{
      title: string;
      description: string;
      intervalKm: number;
      intervalMonths: number;
      severeIntervalKm: number;
      severeIntervalMonths: number;
      conditions: string;
      sourceId: string;
      operation: string;
      verificationNotes: string;
    }>;
    actorUserId: string;
    autoVerify?: boolean;
  }): Promise<KbMaintenanceRuleRecord> {
    const oldRule = await this.findRuleById(params.ruleId);
    if (!oldRule) {
      throw new Error(`Original rule with ID '${params.ruleId}' not found.`);
    }

    // 1. Mark existing rule as inactive / deprecated
    await (this.db as any)
      .update(kbMaintenanceRules)
      .set({
        isActive: false,
        verificationStatus: 'DEPRECATED',
        updatedAt: new Date(),
      })
      .where(eq(kbMaintenanceRules.id, params.ruleId));

    // 2. Insert new revision pointing to previousVersionId
    const newVersion = oldRule.ruleVersion + 1;
    const isVerified = params.autoVerify ?? false;

    const newRule = await this.saveMaintenanceRule({
      configurationId: oldRule.configurationId,
      category: oldRule.category,
      operation: params.changes.operation ?? oldRule.operation,
      title: params.changes.title ?? oldRule.title,
      description: params.changes.description ?? oldRule.description ?? undefined,
      intervalKm: params.changes.intervalKm ?? (oldRule.intervalKm ?? undefined),
      intervalMonths: params.changes.intervalMonths ?? (oldRule.intervalMonths ?? undefined),
      severeIntervalKm: params.changes.severeIntervalKm ?? (oldRule.severeIntervalKm ?? undefined),
      severeIntervalMonths: params.changes.severeIntervalMonths ?? (oldRule.severeIntervalMonths ?? undefined),
      conditions: params.changes.conditions ?? (oldRule.conditions ?? undefined),
      sourceId: params.changes.sourceId ?? (oldRule.sourceId ?? undefined),
      verificationStatus: isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION',
      ruleVersion: newVersion,
      previousVersionId: oldRule.id,
      isActive: true,
      verifiedByUserId: isVerified ? params.actorUserId : undefined,
      verifiedAt: isVerified ? new Date() : undefined,
      verificationNotes: params.changes.verificationNotes ?? `Revisión v${newVersion} generada a partir de regla anterior ${oldRule.id}.`,
    });

    return newRule;
  }
}
