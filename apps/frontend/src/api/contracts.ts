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
  voiceNotesAudioBlob: z.instanceof(Blob).optional(),
  transcribedObservations: z.string().optional(),
  requiresConfirmation: z.boolean().default(true),
  humanConfirmed: z.boolean().refine((val) => val === true, {
    message: 'Technician must review and confirm details before finalizing service record.',
  }),
});
export type QuickServiceEntry = z.infer<typeof QuickServiceEntrySchema>;

// Voice Proposal Schema
export const AIProposalSchema = z.object({
  odometerKm: z.number().nonnegative(),
  workPerformed: z.array(z.string()),
  suggestedNextServiceKm: z.number().optional(),
  diagnosisNotes: z.string().optional(),
  confidence: z.number(),
  requiresConfirmation: z.literal(true),
});
export type AIProposal = z.infer<typeof AIProposalSchema>;
