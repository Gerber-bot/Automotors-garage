import type { IVehicleRepository } from '../../vehicle/domain/vehicle-repository.interface.ts';
import type { IMaintenanceHistoryRepository } from '../domain/history-repository.interface.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface GetVehiclePassportInput {
  vehicleId: string;
  requesterTenantId?: string; // If provided, represents an authenticated workshop viewing history
  isPublicView?: boolean;     // If true, prospective buyer / public QR code
}

export interface VehiclePassportOutput {
  vehicle: {
    id: string;
    plate?: string;
    vin?: string;
    make: string;
    model: string;
    year: number;
    currentMileage: number;
    fuelType?: string;
  };
  certifiedRecordsCount: number;
  totalServiceCount: number;
  timeline: readonly Record<string, unknown>[];
}

export class GetVehiclePassportUseCase {
  private readonly vehicleRepo: IVehicleRepository;
  private readonly historyRepo: IMaintenanceHistoryRepository;

  constructor(
    vehicleRepo: IVehicleRepository,
    historyRepo: IMaintenanceHistoryRepository
  ) {
    this.vehicleRepo = vehicleRepo;
    this.historyRepo = historyRepo;
  }

  public async execute(input: GetVehiclePassportInput): Promise<Result<VehiclePassportOutput, string>> {
    const vehicle = await this.vehicleRepo.findById(input.vehicleId);
    if (!vehicle) {
      return Result.fail(`Vehicle '${input.vehicleId}' not found.`);
    }

    const records = await this.historyRepo.findByVehicleId(vehicle.id);

    let timeline: Record<string, unknown>[];

    if (input.isPublicView) {
      // 1. Public Projection: Strip all confidential pricing, mechanic internal notes, and workshop margins
      timeline = records.map((r) => r.toPublicPassportEntry());
    } else if (input.requesterTenantId) {
      // 2. Workshop Projection: Show own workshop notes/costs; redact other workshops' private data
      timeline = records.map((r) => r.toWorkshopProjection(input.requesterTenantId!));
    } else {
      // 3. Fallback: sanitize to public view
      timeline = records.map((r) => r.toPublicPassportEntry());
    }

    const certifiedCount = records.filter((r) => r.isCertified).length;

    return Result.ok({
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.currentMileage,
        fuelType: vehicle.fuelType,
      },
      certifiedRecordsCount: certifiedCount,
      totalServiceCount: records.length,
      timeline,
    });
  }
}
