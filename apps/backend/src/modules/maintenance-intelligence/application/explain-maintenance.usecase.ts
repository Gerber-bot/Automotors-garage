import type { MaintenanceCalculationResult } from '../domain/deterministic-engine.ts';
import type { AIProviderPort } from '../ports/ai-provider.port.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface ExplainMaintenanceInput {
  vehicleSummary: string; // e.g. "Toyota Corolla 2022 (35,000 km)"
  deterministicCalculation: MaintenanceCalculationResult;
  customerLanguage?: string;
}

export interface MaintenanceExplanationOutput {
  title: string;
  deterministicStatus: string;
  nextDueMileage: number | null;
  remainingKm: number | null;
  nextDueDate: string | null;
  humanExplanation: string;
  consequencesOfDelay: string;
  modelProvenance: string;
}

export class ExplainMaintenanceUseCase {
  private readonly aiProvider: AIProviderPort;

  constructor(aiProvider: AIProviderPort) {
    this.aiProvider = aiProvider;
  }

  public async execute(input: ExplainMaintenanceInput): Promise<Result<MaintenanceExplanationOutput, string>> {
    const calc = input.deterministicCalculation;

    if (calc.status === 'INSUFFICIENT_DATA') {
      return Result.ok({
        title: 'Maintenance Status Pending',
        deterministicStatus: 'INSUFFICIENT_DATA',
        nextDueMileage: null,
        remainingKm: null,
        nextDueDate: null,
        humanExplanation:
          'We do not have sufficient documented technical interval data for this vehicle specification. Please consult the vehicle owner manual or request workshop configuration.',
        consequencesOfDelay: 'Uncertain maintenance status without verified manufacturer baseline.',
        modelProvenance: 'deterministic-fallback',
      });
    }

    const prompt = `Vehicle: ${input.vehicleSummary}
Service Category: ${calc.category}
Deterministic Status: ${calc.status}
Due Reason: ${calc.dueReason}
Next Due Mileage: ${calc.nextDueMileage} km (Remaining: ${calc.remainingKm} km)
Next Due Date: ${calc.nextDueDate ? calc.nextDueDate.toISOString().split('T')[0] : 'N/A'}
Interval Source: ${calc.intervalSource} (${calc.sourceCitation ?? ''})

Write a clear, professional, and accessible technical explanation for the customer in ${input.customerLanguage ?? 'Spanish'}.
Explain why this preventive maintenance is required according to manufacturer specifications and what components are serviced.
Do NOT alter or recalculate the numbers above. Keep exact mileage and dates.`;

    try {
      const explanation = await this.aiProvider.generateCompletion(prompt);

      return Result.ok({
        title: `Upcoming Service: ${calc.category}`,
        deterministicStatus: calc.status,
        nextDueMileage: calc.nextDueMileage,
        remainingKm: calc.remainingKm,
        nextDueDate: calc.nextDueDate ? calc.nextDueDate.toISOString() : null,
        humanExplanation: explanation.trim(),
        consequencesOfDelay:
          'Delaying preventive service can lead to accelerated mechanical wear, increased fuel consumption, or warranty invalidation.',
        modelProvenance: `${this.aiProvider.getProviderName()} (${this.aiProvider.getModelVersion()})`,
      });
    } catch (err: unknown) {
      // Safe fallback if AI service fails: return deterministic data without failing the usecase!
      return Result.ok({
        title: `Upcoming Service: ${calc.category}`,
        deterministicStatus: calc.status,
        nextDueMileage: calc.nextDueMileage,
        remainingKm: calc.remainingKm,
        nextDueDate: calc.nextDueDate ? calc.nextDueDate.toISOString() : null,
        humanExplanation: `Service is ${calc.status} (${calc.dueReason}). Due at ${calc.nextDueMileage} km or by ${calc.nextDueDate?.toISOString().split('T')[0]}.`,
        consequencesOfDelay: 'Standard maintenance required per manufacturer guidelines.',
        modelProvenance: 'deterministic-fallback-on-error',
      });
    }
  }
}
