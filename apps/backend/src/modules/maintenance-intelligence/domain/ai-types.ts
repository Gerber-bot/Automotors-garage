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
