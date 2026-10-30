import { eq, and, ilike } from 'drizzle-orm';
import type { DatabaseInstance } from '@automotors/database';
import { vehicles } from '@automotors/database';
import { Vehicle } from '../../modules/vehicle/domain/vehicle.ts';
import type {
  IVehicleRepository,
  VehicleSearchFilter,
} from '../../modules/vehicle/domain/vehicle-repository.interface.ts';

export class PostgresVehicleRepository implements IVehicleRepository {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  private mapToDomain(row: typeof vehicles.$inferSelect): Vehicle {
    const result = Vehicle.create(
      {
        vin: row.vin ?? undefined,
        plate: row.plate ?? undefined,
        make: row.make,
        model: row.model,
        year: row.year,
        engine: row.engine ?? undefined,
        fuelType: (row.fuelType as any) ?? undefined,
        currentMileage: row.currentMileage,
        technicalSpecs: (row.metadata as Record<string, unknown>) ?? undefined,
        ownerId: row.ownerUserId ?? undefined,
        configurationId: row.configurationId ?? undefined,
      },
      row.id
    );

    if (result.isFailure) {
      throw new Error(`Corrupted vehicle record in database: ${result.getError()}`);
    }

    return result.getValue();
  }

  public async findById(id: string): Promise<Vehicle | null> {
    const rows = await (this.db as any)
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToDomain(row) : null;
  }

  public async findByOwnerUserId(ownerUserId: string): Promise<readonly Vehicle[]> {
    const rows = await (this.db as any)
      .select()
      .from(vehicles)
      .where(eq(vehicles.ownerUserId, ownerUserId));

    return rows.map((r: typeof vehicles.$inferSelect) => this.mapToDomain(r));
  }

  public async findByVin(vin: string): Promise<Vehicle | null> {
    const normalized = vin.trim().toUpperCase();
    const rows = await (this.db as any)
      .select()
      .from(vehicles)
      .where(eq(vehicles.vin, normalized))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToDomain(row) : null;
  }

  public async findByPlate(plate: string): Promise<readonly Vehicle[]> {
    const normalized = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rows = await (this.db as any)
      .select()
      .from(vehicles)
      .where(eq(vehicles.plate, normalized));

    return rows.map((r: typeof vehicles.$inferSelect) => this.mapToDomain(r));
  }

  public async save(vehicle: Vehicle): Promise<void> {
    await (this.db as any)
      .insert(vehicles)
      .values({
        id: vehicle.id,
        vin: vehicle.vin ?? null,
        plate: vehicle.plate ?? null,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        engine: vehicle.engine ?? null,
        fuelType: vehicle.fuelType ?? null,
        currentMileage: vehicle.currentMileage,
        ownerUserId: vehicle.ownerId ?? null,
        configurationId: vehicle.configurationId ?? null,
        metadata: vehicle.technicalSpecs ?? {},
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: vehicles.id,
        set: {
          vin: vehicle.vin ?? null,
          plate: vehicle.plate ?? null,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          engine: vehicle.engine ?? null,
          fuelType: vehicle.fuelType ?? null,
          currentMileage: vehicle.currentMileage,
          ownerUserId: vehicle.ownerId ?? null,
          configurationId: vehicle.configurationId ?? null,
          metadata: vehicle.technicalSpecs ?? {},
          updatedAt: new Date(),
        },
      });
  }

  public async search(filter: VehicleSearchFilter): Promise<readonly Vehicle[]> {
    const conditions = [];

    if (filter.plate) {
      conditions.push(eq(vehicles.plate, filter.plate.trim().toUpperCase()));
    }
    if (filter.vin) {
      conditions.push(eq(vehicles.vin, filter.vin.trim().toUpperCase()));
    }
    if (filter.make) {
      conditions.push(ilike(vehicles.make, `%${filter.make.trim()}%`));
    }
    if (filter.model) {
      conditions.push(ilike(vehicles.model, `%${filter.model.trim()}%`));
    }

    const query = (this.db as any).select().from(vehicles);
    const rows = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    return rows.map((r: typeof vehicles.$inferSelect) => this.mapToDomain(r));
  }
}
