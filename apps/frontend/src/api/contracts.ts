import { z } from 'zod';

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  WORKSHOP_OWNER: 'WORKSHOP_OWNER',
  WORKSHOP_MANAGER: 'WORKSHOP_MANAGER',
  MECHANIC: 'MECHANIC',
  VEHICLE_OWNER: 'VEHICLE_OWNER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const WorkOrderStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export const VerificationLevel = {
  DECLARED: 'DECLARED',
  DOCUMENTED: 'DOCUMENTED',
  IDENTIFIED_WORKSHOP: 'IDENTIFIED_WORKSHOP',
  CORROBORATED: 'CORROBORATED',
} as const;
export type VerificationLevel = (typeof VerificationLevel)[keyof typeof VerificationLevel];

// Vehicle Contracts
export const VehicleSchema = z.object({
  id: z.string().uuid(),
  plate: z.string().optional(),
  vin: z.string().optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int(),
  engine: z.string().optional(),
  fuelType: z.string().optional(),
  currentMileage: z.number().nonnegative(),
  configurationId: z.string().optional(),
});
export type Vehicle = z.infer<typeof VehicleSchema>;

export const CreateVehicleDtoSchema = z.object({
  plate: z.string().optional(),
  vin: z.string().optional(),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1950).max(2030),
  currentMileage: z.number().nonnegative('Mileage must be positive'),
});
export type CreateVehicleDto = z.infer<typeof CreateVehicleDtoSchema>;

// Work Order Contracts
export const WorkOrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  workshopName: z.string(),
  vehicleId: z.string(),
  customerId: z.string(),
  reportedMileage: z.number().nonnegative(),
  reportedIssue: z.string(),
  diagnosis: z.string().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED', 'CANCELLED']),
  interventions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      description: z.string(),
    })
  ),
  evidenceAssetIds: z.array(z.string()),
  closedAt: z.string().optional(),
});
export type WorkOrder = z.infer<typeof WorkOrderSchema>;

// Quick Service Entry Form Schema (<60s flow)
export const QuickServiceEntrySchema = z.object({
  searchQuery: z.string().min(1, 'Search term required (e.g. license plate or VIN)'),
  selectedVehicleId: z.string().min(1, 'Vehicle selection is required'),
  odometerKm: z.number().min(0, 'Mileage cannot be negative'),
  selectedInterventions: z.array(z.string()).min(1, 'Select at least one service performed'),
  observations: z.string().optional(),
  requiresConfirmation: z.boolean().default(true),
  humanConfirmed: z.boolean().refine((val) => val === true, {
    message: 'Technician must review and confirm details before finalizing service record.',
  }),
});
export type QuickServiceEntry = z.infer<typeof QuickServiceEntrySchema>;

// OBD-II Diagnostics Contracts
export interface ObdSensorReading {
  rpm: number;
  speed: number;
  coolantTemp: number;
  engineLoad: number;
  throttlePosition: number;
  intakeAirTemp: number;
  adapterVoltage: number;
  milStatus: boolean;
  dtcCount: number;
  vin?: string;
  supportedPids: readonly string[];
}

export interface ObdDtcCode {
  code: string;
  system: 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  possibleCauses: readonly string[];
  recommendedChecks: readonly string[];
  isPending?: boolean;
}

export interface ObdTelemetrySnapshot {
  timestamp: string;
  isSimulated: boolean;
  adapterIdentifier: string;
  protocol: string;
  sensors: ObdSensorReading;
  dtcCodes: readonly ObdDtcCode[];
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  friendlyName?: string;
}

export interface ObdAiAnalysis {
  codesAnalyzed: string[];
  systemicImpact: string;
  urgencyLevel: 'IMMEDIATE_ACTION' | 'ATTENTION_NEEDED' | 'MONITOR';
  mechanicChecklist: string[];
  disclaimer: string;
}

export const ObdAiAnalysisSchema = z.object({
  codesAnalyzed: z.array(z.string()),
  systemicImpact: z.string(),
  urgencyLevel: z.enum(['IMMEDIATE_ACTION', 'ATTENTION_NEEDED', 'MONITOR']),
  mechanicChecklist: z.array(z.string()),
  disclaimer: z.string(),
});

export interface HistorySummary {
  vehicleId: string;
  totalRecordsAnalyzed: number;
  mainInterventions: string[];
  recentServices: Array<{ date: string; title: string; mileage: number; isCertified: boolean }>;
  recurringRepairs: string[];
  relevantObservations: string[];
  dataLimitations: string[];
  referencedRecordIds: string[];
  generatedAt: string;
  isAiGenerated: boolean;
  providerName: string;
}

export interface MaintenanceExplanation {
  category: string;
  title: string;
  status: string;
  nextDueMileage: number | null;
  remainingKm: number | null;
  nextDueDate: string | null;
  explanation: string;
  basis: string[];
  uncertainty: string;
  dataLimitations: string[];
  disclaimer: string;
  isAiGenerated: boolean;
  providerName: string;
}

export interface AIStatus {
  isConfigured: boolean;
  providerName: string;
  model: string;
  message: string;
}

// ============================================================================
// AUTOMOTORS VEHICLE KNOWLEDGE BASE CONTRACTS
// ============================================================================

export interface KbManufacturer {
  id: string;
  name: string;
  country: string | null;
  status: string;
}

export interface KbModel {
  id: string;
  manufacturerId: string;
  name: string;
  status: string;
}

export interface KbGeneration {
  id: string;
  modelId: string;
  generationName: string;
  generationCode: string | null;
  startYear: number;
  endYear: number | null;
  market: string;
  verificationStatus: string;
}

export interface KbPowertrain {
  id: string;
  manufacturerId: string;
  engineCode: string;
  family: string | null;
  displacementCc: number | null;
  displacementLiters: string | null;
  fuelType: string;
  valves: number | null;
  powerHp: number | null;
  timingMechanism: 'CADENA' | 'CORREA' | 'ENGRANAJE' | 'DESCONOCIDO' | string;
  timingObservations: string | null;
  oilViscosityOem: string | null;
  oilCapacityLiters: string | null;
  verificationStatus: string;
}

export interface KbConfiguration {
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
  makeName?: string;
  modelName?: string;
  generationName?: string;
  powertrain?: KbPowertrain | null;
  sourceTitle?: string | null;
}

export interface KbTechnicalSpec {
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

export interface KbMaintenanceRule {
  id: string;
  configurationId: string;
  category: string;
  operation: 'REPLACE' | 'INSPECT' | 'ADJUST' | 'CLEAN' | string;
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
  verifiedAt: string | null;
  verificationNotes: string | null;
  sourceTitle?: string | null;
  sourceReference?: string | null;
}

export type TechnicalMatchStatus =
  | 'EXACT_MATCH'
  | 'POSSIBLE_MATCH'
  | 'AMBIGUOUS'
  | 'NO_MATCH'
  | 'INSUFFICIENT_DATA';

export interface TechnicalIdentificationResult {
  status: TechnicalMatchStatus;
  matchedConfiguration: KbConfiguration | null;
  candidateConfigurations: KbConfiguration[];
  reason: string;
  requiresConfirmation: boolean;
  isDocumentarilyVerified: boolean;
  distributionType: 'CADENA' | 'CORREA' | 'DESCONOCIDO';
  exactEngineCodeStatus: 'CONFIRMED' | 'PENDING_CONFIRMATION';
  technicalNotes?: string;
}

