import { Vehicle, FuelType } from '../domain/vehicle.ts';
import type { IVehicleRepository } from '../domain/vehicle-repository.interface.ts';
import { VehicleDuplicateDetector, DuplicateCheckSeverity } from '../domain/duplicate-detector.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface CreateVehicleInput {
  plate?: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  fuelType?: FuelType;
  currentMileage: number;
  technicalSpecs?: Record<string, unknown>;
  ownerId?: string;
}

export interface CreateVehicleOutput {
  vehicleId: string;
  vin?: string;
  plate?: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number;
  duplicateWarning?: string;
}

export class CreateVehicleUseCase {
  private readonly vehicleRepository: IVehicleRepository;
  private readonly duplicateDetector: VehicleDuplicateDetector;

  constructor(vehicleRepository: IVehicleRepository) {
    this.vehicleRepository = vehicleRepository;
    this.duplicateDetector = new VehicleDuplicateDetector(vehicleRepository);
  }

  public async execute(input: CreateVehicleInput): Promise<Result<CreateVehicleOutput, string>> {
    // 1. Run duplicate detection
    const dupCheck = await this.duplicateDetector.detect({
      vin: input.vin,
      plate: input.plate,
      make: input.make,
      model: input.model,
    });

    if (dupCheck.severity === DuplicateCheckSeverity.EXACT_CONFLICT) {
      return Result.fail(`Cannot create vehicle: ${dupCheck.reason}`);
    }

    // 2. Instantiate domain entity
    const vehicleResult = Vehicle.create(input);
    if (vehicleResult.isFailure) {
      return Result.fail(vehicleResult.getError());
    }

    const vehicle = vehicleResult.getValue();

    // 3. Persist
    await this.vehicleRepository.save(vehicle);

    return Result.ok({
      vehicleId: vehicle.id,
      vin: vehicle.vin,
      plate: vehicle.plate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      currentMileage: vehicle.currentMileage,
      duplicateWarning: dupCheck.severity === DuplicateCheckSeverity.POTENTIAL_CONFLICT ? dupCheck.reason : undefined,
    });
  }
}
