import { z } from 'zod';

// Zod Schema for OBD-II DTC & Telemetry Interpretation
export const Obd2InterpretationSchema = z.object({
  codesAnalyzed: z.array(z.string()),
  systemicImpact: z.string(),
  urgencyLevel: z.enum(['IMMEDIATE_ACTION', 'ATTENTION_NEEDED', 'MONITOR']),
  mechanicChecklist: z.array(z.string()),
  disclaimer: z.string(),
});
export type Obd2Interpretation = z.infer<typeof Obd2InterpretationSchema>;

// Zod Schema for Contextual Vehicle History Summary
export const HistorySummarySchema = z.object({
  vehicleId: z.string(),
  totalRecordsAnalyzed: z.number().int().nonnegative(),
  mainInterventions: z.array(z.string()),
  recentServices: z.array(
    z.object({
      date: z.string(),
      title: z.string(),
      mileage: z.number(),
      isCertified: z.boolean(),
    })
  ),
  recurringRepairs: z.array(z.string()),
  relevantObservations: z.array(z.string()),
  dataLimitations: z.array(z.string()),
  referencedRecordIds: z.array(z.string()),
  generatedAt: z.string(),
  isAiGenerated: z.boolean(),
  providerName: z.string(),
});
export type HistorySummary = z.infer<typeof HistorySummarySchema>;

// Zod Schema for Explaining Deterministic Maintenance Calculations
export const MaintenanceExplanationSchema = z.object({
  category: z.string(),
  title: z.string(),
  status: z.string(),
  nextDueMileage: z.number().nullable(),
  remainingKm: z.number().nullable(),
  nextDueDate: z.string().nullable(),
  explanation: z.string(),
  basis: z.array(z.string()),
  uncertainty: z.string(),
  dataLimitations: z.array(z.string()),
  disclaimer: z.string(),
  isAiGenerated: z.boolean(),
  providerName: z.string(),
});
export type MaintenanceExplanation = z.infer<typeof MaintenanceExplanationSchema>;

export interface AIStatus {
  isConfigured: boolean;
  providerName: string;
  model: string;
  message: string;
}

// ============================================================================
// AUTOMOTORS AI CORE — PREVENTIVE MAINTENANCE CONSULTATION CONTRACTS
// ============================================================================

export const AiEvidenceSourceSchema = z.object({
  sourceType: z.enum([
    'VEHICLE_PROFILE',
    'MAINTENANCE_HISTORY',
    'KNOWLEDGE_BASE_RULE',
    'DETERMINISTIC_ENGINE',
  ]),
  sourceId: z.string(),
  title: z.string(),
  verificationStatus: z.enum([
    'VERIFIED',
    'CERTIFIED_WORKSHOP',
    'OWNER_DECLARED',
    'PENDING_VERIFICATION',
    'DETERMINISTIC',
  ]),
  citation: z.string(),
  summary: z.string(),
});
export type AiEvidenceSource = z.infer<typeof AiEvidenceSourceSchema>;

export const PreventiveConsultationSynthesisSchema = z.object({
  answer: z.string().min(10),
  confirmedFacts: z.array(z.string()),
  inferences: z.array(z.string()),
  unknownOrMissingData: z.array(z.string()),
});
export type PreventiveConsultationSynthesis = z.infer<typeof PreventiveConsultationSynthesisSchema>;

export const PreventiveConsultationResponseSchema = z.object({
  vehicleId: z.string(),
  vehicleSummary: z.string(),
  category: z.string(),
  categoryLabel: z.string(),
  question: z.string(),
  deterministicCalculation: z.object({
    status: z.string(),
    nextDueMileage: z.number().nullable(),
    remainingKm: z.number().nullable(),
    nextDueDate: z.string().nullable(),
    estimatedDaysRemaining: z.number().nullable(),
    dueReason: z.string(),
    confidence: z.string(),
    intervalSource: z.string(),
    sourceCitation: z.string().nullable(),
    ruleVerificationStatus: z.string().nullable(),
    warning: z.string().nullable(),
  }),
  answer: z.string(),
  confirmedFacts: z.array(z.string()),
  inferences: z.array(z.string()),
  unknownOrMissingData: z.array(z.string()),
  sources: z.array(AiEvidenceSourceSchema),
  toolsInvoked: z.array(z.string()),
  privacy: z.object({
    mode: z.enum(['EXTERNAL_AI_ASSISTED', 'DETERMINISTIC_FALLBACK']),
    externalProviderConfigured: z.boolean(),
    externalConsentGranted: z.boolean(),
    externalProviderUsed: z.boolean(),
    dataMinimizationApplied: z.literal(true),
    piiSentToExternalProvider: z.literal(false),
    providerName: z.string(),
    fallbackReason: z.string().nullable(),
  }),
  disclaimer: z.string(),
  generatedAt: z.string(),
});
export type PreventiveConsultationResponse = z.infer<typeof PreventiveConsultationResponseSchema>;

