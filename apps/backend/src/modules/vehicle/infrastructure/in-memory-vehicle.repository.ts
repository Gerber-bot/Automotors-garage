import type { IVehicleRepository, VehicleSearchFilter } from '../domain/vehicle-repository.interface.ts';
import type { Vehicle } from '../domain/vehicle.ts';

export class InMemoryVehicleRepository implements IVehicleRepository {
  private readonly vehicles = new Map<string, Vehicle>();

  public async findById(id: string): Promise<Vehicle | null> {
    return this.vehicles.get(id) ?? null;
  }

  public async findByVin(vin: string): Promise<Vehicle | null> {
    const normalized = vin.trim().toUpperCase();
    for (const v of this.vehicles.values()) {
      if (v.vin && v.vin.toUpperCase() === normalized) {
        return v;
      }
    }
    return null;
  }

  public async findByPlate(plate: string): Promise<readonly Vehicle[]> {
    const normalized = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const results: Vehicle[] = [];
    for (const v of this.vehicles.values()) {
      if (v.plate && v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalized) {
        results.push(v);
      }
    }
    return results;
  }

  public async save(vehicle: Vehicle): Promise<void> {
    this.vehicles.set(vehicle.id, vehicle);
  }

  public async search(filter: VehicleSearchFilter): Promise<readonly Vehicle[]> {
    return Array.from(this.vehicles.values()).filter((v) => {
      if (filter.plate && (!v.plate || !v.plate.includes(filter.plate.toUpperCase()))) return false;
      if (filter.vin && (!v.vin || !v.vin.includes(filter.vin.toUpperCase()))) return false;
      if (filter.make && !v.make.toLowerCase().includes(filter.make.toLowerCase())) return false;
      if (filter.model && !v.model.toLowerCase().includes(filter.model.toLowerCase())) return false;
      if (filter.ownerId && v.ownerId !== filter.ownerId) return false;
      return true;
    });
  }

  public clear(): void {
    this.vehicles.clear();
  }
}
