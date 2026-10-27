import { KNOWN_OBD2_CODES } from '../domain/obd2-codes.ts';
import type { DiagnosticTroubleCode } from '../domain/obd2-codes.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';
import { Obd2InterpretationSchema } from '../domain/ai-types.ts';
import type { Obd2Interpretation } from '../domain/ai-types.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface InterpretObd2Input {
  dtcCodes: readonly string[];
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
}

export class InterpretObd2UseCase {
  private readonly structuredExtractor: StructuredExtractionPort;

  constructor(structuredExtractor: StructuredExtractionPort) {
    this.structuredExtractor = structuredExtractor;
  }

  public async execute(input: InterpretObd2Input): Promise<Result<Obd2Interpretation, string>> {
    if (!input.dtcCodes || input.dtcCodes.length === 0) {
      return Result.fail('At least one OBD2 DTC code must be provided for interpretation.');
    }

    // 1. Gather verified SAE knowledge base context
    const verifiedCodes: DiagnosticTroubleCode[] = [];
    for (const code of input.dtcCodes) {
      const cleanCode = code.trim().toUpperCase();
      const known = KNOWN_OBD2_CODES[cleanCode];
      if (known) {
        verifiedCodes.push(known);
      }
    }

    const contextPayload = verifiedCodes.map((c) => ({
      code: c.code,
      description: c.description,
      system: c.system,
      severity: c.severity,
      causes: c.possibleCauses,
      checks: c.recommendedChecks,
    }));

    const prompt = `Vehicle: ${input.vehicleMake} ${input.vehicleModel} (${input.vehicleYear})
Diagnostic Codes: ${input.dtcCodes.join(', ')}
Technical Definitions from SAE standard: ${JSON.stringify(contextPayload)}

Analyze the interaction of these trouble codes.
Provide:
- codesAnalyzed: array of uppercase codes
- systemicImpact: concise paragraph explaining the real-world symptoms and mechanical impact
- urgencyLevel: "IMMEDIATE_ACTION" if misfire/fuel/brake issues, "ATTENTION_NEEDED" if emissions/sensors, or "MONITOR"
- mechanicChecklist: step-by-step physical diagnosis procedure for technician
- disclaimer: "AI-assisted technical guidance. Physical diagnosis and verification by a certified technician is mandatory before component replacement."`;

    try {
      const interpretation = await this.structuredExtractor.extract(prompt, Obd2InterpretationSchema);
      return Result.ok(interpretation);
    } catch (err: unknown) {
      // Deterministic fallback if AI extraction fails
      const fallback: Obd2Interpretation = {
        codesAnalyzed: input.dtcCodes.map((c) => c.toUpperCase()),
        systemicImpact: `Fault codes detected in ${verifiedCodes.map((c) => c.system).join(', ') || 'powertrain'}. Scan tool diagnostic required.`,
        urgencyLevel: verifiedCodes.some((c) => c.severity === 'CRITICAL') ? 'IMMEDIATE_ACTION' : 'ATTENTION_NEEDED',
        mechanicChecklist: verifiedCodes.flatMap((c) => c.recommendedChecks),
        disclaimer:
          'AI-assisted technical guidance. Physical diagnosis and verification by a certified technician is mandatory before component replacement.',
      };
      return Result.ok(fallback);
    }
  }
}
