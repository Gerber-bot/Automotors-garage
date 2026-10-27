import { z } from 'zod';

// Zod Schema for Structured Voice Note Extraction
export const VoiceNoteProposalSchema = z.object({
  odometerKm: z.number().int().nonnegative(),
  workPerformed: z.array(z.string().min(1)).min(1),
  suggestedNextServiceKm: z.number().int().nonnegative().optional(),
  diagnosisNotes: z.string().optional(),
  replacedParts: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive().default(1),
      })
    )
    .optional(),
  requiresConfirmation: z.literal(true), // Invariant: AI proposals ALWAYS require human confirmation
  confidence: z.number().min(0).max(1),
  rawTranscription: z.string(),
});

export type VoiceNoteProposal = z.infer<typeof VoiceNoteProposalSchema>;

export const Obd2InterpretationSchema = z.object({
  codesAnalyzed: z.array(z.string()),
  systemicImpact: z.string(),
  urgencyLevel: z.enum(['IMMEDIATE_ACTION', 'ATTENTION_NEEDED', 'MONITOR']),
  mechanicChecklist: z.array(z.string()),
  disclaimer: z.string(),
});

export type Obd2Interpretation = z.infer<typeof Obd2InterpretationSchema>;

export interface TechnicalObservationOutput {
  readonly formattedNotes: string;
  readonly missingTechnicalData: readonly string[];
  readonly safetyWarnings: readonly string[];
  readonly generatedByModel: string;
}
