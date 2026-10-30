import type { MaintenanceCalculationResult } from '../domain/deterministic-engine.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';
import { MaintenanceExplanationSchema, type MaintenanceExplanation } from '../domain/ai-types.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface ExplainMaintenanceInput {
  vehicleSummary: string; // e.g. "Renault Logan 1.6 2020 (85,000 km)"
  deterministicCalculation: MaintenanceCalculationResult;
  customerLanguage?: string;
  workshopId?: string;
  userId?: string;
}

export class ExplainMaintenanceUseCase {
  private readonly extractor: StructuredExtractionPort;

  constructor(extractor: StructuredExtractionPort) {
    this.extractor = extractor;
  }

  public async execute(input: ExplainMaintenanceInput): Promise<Result<MaintenanceExplanation, string>> {
    const calc = input.deterministicCalculation;

    if (calc.status === 'INSUFFICIENT_DATA') {
      const fallbackInsufficient: MaintenanceExplanation = {
        category: calc.category,
        title: `Plan de Mantenimiento: ${calc.category}`,
        status: 'INSUFFICIENT_DATA',
        nextDueMileage: null,
        remainingKm: null,
        nextDueDate: null,
        explanation:
          'No se dispone de información técnica suficiente o kilometraje confirmado para calcular la proyección exacta de este mantenimiento.',
        basis: ['Falta de historial de servicios previos o kilometraje no confirmado.'],
        uncertainty: 'ALTA: Se requiere ingresar el kilometraje actual o consultar el manual del fabricante.',
        dataLimitations: ['Falta registro de último cambio efectuado', 'No se puede estimar tasa de desgaste mensual'],
        disclaimer: 'Cálculo de mantenimiento sujeto a verificación manual en taller especializado.',
        isAiGenerated: false,
        providerName: 'DeterministicMaintenanceEngine',
      };
      return Result.ok(fallbackInsufficient);
    }

    if (this.extractor.isConfigured()) {
      try {
        const prompt = `Vehicle: ${input.vehicleSummary}
Service Category: ${calc.category}
Deterministic Status: ${calc.status}
Due Reason: ${calc.dueReason}
Next Due Mileage: ${calc.nextDueMileage} km (Remaining: ${calc.remainingKm} km)
Next Due Date: ${calc.nextDueDate ? calc.nextDueDate.toISOString().split('T')[0] : 'N/A'}
Interval Source: ${calc.intervalSource} (${calc.sourceCitation ?? ''})

Generate a clear, professional technical maintenance explanation for the vehicle owner in ${input.customerLanguage ?? 'Spanish'}.
CRITICAL INVARIANTS:
1. Do NOT alter, round, or invent the numbers: nextDueMileage MUST be ${calc.nextDueMileage}, remainingKm MUST be ${calc.remainingKm}.
2. Output JSON strictly matching:
- category: "${calc.category}"
- title: concise title in Spanish
- status: "${calc.status}"
- nextDueMileage: ${calc.nextDueMileage}
- remainingKm: ${calc.remainingKm}
- nextDueDate: ${calc.nextDueDate ? `"${calc.nextDueDate.toISOString().split('T')[0]}"` : 'null'}
- explanation: clear explanation of why this service is required per OEM guidelines and what mechanical protection it provides
- basis: array of key facts supporting the calculation
- uncertainty: evaluation of estimation confidence
- dataLimitations: array of caveats or missing data points
- disclaimer: "Orientación técnica preventiva. La decisión de recambio debe validarse por inspección física en taller."
- isAiGenerated: true
- providerName: "OpenAIAdapter"`;

        const result = await this.extractor.extract(prompt, MaintenanceExplanationSchema, {
          workshopId: input.workshopId,
          userId: input.userId,
          timeoutMs: 5000,
        });

        // Ensure numbers were not altered by AI
        return Result.ok({
          ...result,
          category: String(calc.category),
          status: String(calc.status),
          nextDueMileage: calc.nextDueMileage,
          remainingKm: calc.remainingKm,
          nextDueDate: calc.nextDueDate ? (calc.nextDueDate.toISOString().split('T')[0] ?? null) : null,
          isAiGenerated: true,
          providerName: 'OpenAIAdapter',
        });
      } catch {
        // Safe fallback on error or timeout
      }
    }

    // Deterministic fallback explanation
    const nextDueFormatted = calc.nextDueDate
      ? (calc.nextDueDate.toISOString().split('T')[0] ?? null)
      : null;
    const statusText =
      calc.status === 'OVERDUE'
        ? 'Servicio vencido. Se recomienda atención inmediata.'
        : calc.status === 'DUE_NOW'
          ? 'Servicio inminente dentro del margen operativo.'
          : calc.status === 'UPCOMING_SOON'
            ? 'Próximo a vencer. Conviene agendar turno de servicio.'
            : 'En rango operativo seguro.';

    const fallback: MaintenanceExplanation = {
      category: String(calc.category),
      title: `Mantenimiento Preventivo: ${calc.category}`,
      status: String(calc.status),
      nextDueMileage: calc.nextDueMileage,
      remainingKm: calc.remainingKm,
      nextDueDate: nextDueFormatted,
      explanation: `${statusText} Calculado conforme a especificación ${calc.intervalSource} (${calc.sourceCitation ?? 'Pauta de fábrica'}). Vencimiento proyectado a los ${calc.nextDueMileage?.toLocaleString() ?? 0} km o fecha ${nextDueFormatted ?? 'N/A'}.`,
      basis: [
        `Pauta de fábrica: intervalo ${calc.intervalSource}`,
        `Motivo de cálculo: ${calc.dueReason}`,
        `Cálculo determinista sin alteración de datos`,
      ],
      uncertainty:
        calc.confidence === 'HIGH'
          ? 'BAJA: Basado en servicio previo documentado con kilometraje exacto.'
          : 'MEDIA: Basado en kilometraje acumulado y pauta técnica estándar.',
      dataLimitations: [
        'El cálculo asume condiciones de uso normales salvo que se especifique régimen severo.',
      ],
      disclaimer: 'Orientación técnica preventiva. La decisión de recambio debe validarse por inspección física en taller.',
      isAiGenerated: false,
      providerName: 'DeterministicMaintenanceEngine',
    };

    return Result.ok(fallback);
  }
}
