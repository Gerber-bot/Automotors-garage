import type { IVehicleRepository } from './vehicle-repository.interface.ts';
import type { Vehicle } from './vehicle.ts';

export const DuplicateCheckSeverity = {
  EXACT_CONFLICT: 'EXACT_CONFLICT',
  POTENTIAL_CONFLICT: 'POTENTIAL_CONFLICT',
  NONE: 'NONE',
} as const;
export type DuplicateCheckSeverity = (typeof DuplicateCheckSeverity)[keyof typeof DuplicateCheckSeverity];

export interface DuplicateCheckResult {
  severity: DuplicateCheckSeverity;
  reason?: string;
  conflictingVehicleId?: string;
}

export class VehicleDuplicateDetector {
  private readonly vehicleRepository: IVehicleRepository;

  constructor(vehicleRepository: IVehicleRepository) {
    this.vehicleRepository = vehicleRepository;
  }

  public async detect(candidate: {
    vin?: string;
    plate?: string;
    make: string;
    model: string;
  }): Promise<DuplicateCheckResult> {
    // 1. Check VIN uniqueness (hard conflict)
    if (candidate.vin) {
      const normalizedVin = candidate.vin.trim().toUpperCase();
      const existingByVin = await this.vehicleRepository.findByVin(normalizedVin);
      if (existingByVin) {
        return {
          severity: DuplicateCheckSeverity.EXACT_CONFLICT,
          reason: `A vehicle with VIN '${normalizedVin}' is already registered in the platform (ID: ${existingByVin.id}).`,
          conflictingVehicleId: existingByVin.id,
        };
      }
    }

    // 2. Check Plate + Make correlation (potential conflict)
    if (candidate.plate) {
      const normalizedPlate = candidate.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const existingByPlate = await this.vehicleRepository.findByPlate(normalizedPlate);

      if (existingByPlate.length > 0) {
        const sameMakeMatch = existingByPlate.find(
          (v) => v.make.toLowerCase() === candidate.make.trim().toLowerCase()
        );

        if (sameMakeMatch) {
          return {
            severity: DuplicateCheckSeverity.POTENTIAL_CONFLICT,
            reason: `Potential duplicate: License plate '${normalizedPlate}' is already registered for a ${sameMakeMatch.make} ${sameMakeMatch.model} (ID: ${sameMakeMatch.id}).`,
            conflictingVehicleId: sameMakeMatch.id,
          };
        }
      }
    }

    return { severity: DuplicateCheckSeverity.NONE };
  }
}
