import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';
import { HistorySummarySchema, type HistorySummary } from '../domain/ai-types.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface VehicleRecordItem {
  readonly id: string;
  readonly serviceDate: Date | string;
  readonly mileage: number;
  readonly title: string;
  readonly description?: string;
  readonly performedInterventions?: readonly string[];
  readonly isVerified?: boolean;
  readonly verificationLevel?: string;
  readonly observations?: string;
}

export interface SummarizeHistoryInput {
  readonly vehicleId: string;
  readonly vehicleMake: string;
  readonly vehicleModel: string;
  readonly vehicleYear: number;
  readonly currentMileageKm?: number;
  readonly records: readonly VehicleRecordItem[];
  readonly workshopId?: string;
  readonly userId?: string;
}

export class SummarizeHistoryUseCase {
  private readonly extractor: StructuredExtractionPort;

  constructor(extractor: StructuredExtractionPort) {
    this.extractor = extractor;
  }

  public async execute(input: SummarizeHistoryInput): Promise<Result<HistorySummary, string>> {
    if (!input.vehicleId) {
      return Result.fail('Vehicle ID is required.');
    }

    const records = [...input.records].sort((a, b) => {
      const dateA = new Date(a.serviceDate).getTime();
      const dateB = new Date(b.serviceDate).getTime();
      return dateB - dateA;
    });

    if (records.length === 0) {
      const emptySummary: HistorySummary = {
        vehicleId: input.vehicleId,
        totalRecordsAnalyzed: 0,
        mainInterventions: [],
        recentServices: [],
        recurringRepairs: [],
        relevantObservations: [],
        dataLimitations: ['No se registran intervenciones ni mantenimientos previos en la plataforma.'],
        referencedRecordIds: [],
        generatedAt: new Date().toISOString(),
        isAiGenerated: false,
        providerName: 'DeterministicBaseline',
      };
      return Result.ok(emptySummary);
    }

    // If AI is configured, attempt LLM structured extraction
    if (this.extractor.isConfigured()) {
      try {
        const recordsPayload = records.map((r) => ({
          id: r.id,
          date: new Date(r.serviceDate).toISOString().split('T')[0],
          mileage: r.mileage,
          title: r.title,
          interventions: r.performedInterventions ?? [],
          observations: r.observations ?? r.description ?? '',
          certified: r.isVerified ?? false,
        }));

        const prompt = `Vehicle: ${input.vehicleMake} ${input.vehicleModel} (${input.vehicleYear}), Current Odometer: ${input.currentMileageKm ?? 'Unknown'} km
Historical Records (${records.length} items):
${JSON.stringify(recordsPayload, null, 2)}

Analyze this vehicle maintenance history and generate a structured JSON technical summary:
1. mainInterventions: array of prominent or major mechanical services performed (e.g. timing belt, brake overhaul, major service).
2. recentServices: array of objects with { date, title, mileage, isCertified } for the most recent events.
3. recurringRepairs: array of repetitive repairs or recurring wear patterns detected across records.
4. relevantObservations: array of critical technician notes, warnings, or recorded symptoms.
5. dataLimitations: gaps in history, uncertified self-reported records, or missing odometer readings.
6. referencedRecordIds: list of specific record IDs from the input that substantiate your findings.

Do NOT invent records or mileage. Use strictly verified data from the input. Output in Spanish.`;

        const result = await this.extractor.extract(prompt, HistorySummarySchema, {
          workshopId: input.workshopId,
          userId: input.userId,
          timeoutMs: 6000,
        });

        return Result.ok({
          ...result,
          vehicleId: input.vehicleId,
          totalRecordsAnalyzed: records.length,
          generatedAt: new Date().toISOString(),
          isAiGenerated: true,
          providerName: 'OpenAIAdapter',
        });
      } catch {
        // Fall back gracefully to deterministic rule-based summary
      }
    }

    // Deterministic rule-based fallback
    return Result.ok(this.buildDeterministicSummary(input, records));
  }

  private buildDeterministicSummary(
    input: SummarizeHistoryInput,
    records: readonly VehicleRecordItem[]
  ): HistorySummary {
    const titleCounts = new Map<string, number>();
    const interventionsSet = new Set<string>();
    const observations: string[] = [];
    const limitations: string[] = [];
    const recordIds: string[] = [];

    let uncertifiedCount = 0;

    for (const r of records) {
      recordIds.push(r.id);
      const cleanTitle = r.title.trim();
      titleCounts.set(cleanTitle, (titleCounts.get(cleanTitle) ?? 0) + 1);

      if (r.performedInterventions && r.performedInterventions.length > 0) {
        for (const item of r.performedInterventions) {
          interventionsSet.add(item);
        }
      } else {
        interventionsSet.add(cleanTitle);
      }

      const note = (r.observations ?? r.description ?? '').trim();
      if (note && note.length > 5 && !observations.includes(note)) {
        observations.push(note);
      }

      if (!r.isVerified && r.verificationLevel !== 'CERTIFIED_WORKSHOP') {
        uncertifiedCount++;
      }
    }

    // Detect recurring items (appeared more than once)
    const recurringRepairs: string[] = [];
    for (const [title, count] of titleCounts.entries()) {
      if (count > 1) {
        recurringRepairs.push(`${title} (${count} registros registrados)`);
      }
    }

    if (uncertifiedCount > 0) {
      limitations.push(`${uncertifiedCount} de ${records.length} registros no poseen certificación de taller homologado.`);
    }

    const recentServices = records.slice(0, 5).map((r) => ({
      date: new Date(r.serviceDate).toISOString().split('T')[0] ?? '',
      title: r.title,
      mileage: r.mileage,
      isCertified: Boolean(r.isVerified || r.verificationLevel === 'CERTIFIED_WORKSHOP'),
    }));

    return {
      vehicleId: input.vehicleId,
      totalRecordsAnalyzed: records.length,
      mainInterventions: Array.from(interventionsSet).slice(0, 8),
      recentServices,
      recurringRepairs,
      relevantObservations: observations.slice(0, 5),
      dataLimitations: limitations.length > 0 ? limitations : ['Historial continuo con trazabilidad completa de kilometraje.'],
      referencedRecordIds: recordIds,
      generatedAt: new Date().toISOString(),
      isAiGenerated: false,
      providerName: 'DeterministicRuleBasedEngine',
    };
  }
}
