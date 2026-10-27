import type { Vehicle } from './vehicle.ts';

export interface VehicleSearchFilter {
  plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  ownerId?: string;
}

export interface IVehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findByVin(vin: string): Promise<Vehicle | null>;
  findByPlate(plate: string): Promise<readonly Vehicle[]>;
  save(vehicle: Vehicle): Promise<void>;
  search(filter: VehicleSearchFilter): Promise<readonly Vehicle[]>;
}
