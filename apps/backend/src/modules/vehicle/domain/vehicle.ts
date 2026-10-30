import { Entity } from '../../../shared/domain/entity.ts';
import { Result } from '../../../shared/domain/result.ts';

export const FuelType = {
  GASOLINE: 'GASOLINE',
  DIESEL: 'DIESEL',
  CNG: 'CNG', // GNC
  ELECTRIC: 'ELECTRIC',
  HYBRID: 'HYBRID',
} as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];

export interface VehicleProps {
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
  configurationId?: string;
}

export class Vehicle extends Entity<VehicleProps> {
  private constructor(props: VehicleProps, id?: string, createdAt?: Date, updatedAt?: Date, version?: number) {
    super(props, id, createdAt, updatedAt, version);
  }

  public static create(props: VehicleProps, id?: string): Result<Vehicle, string> {
    if (!props.make || props.make.trim().length === 0) {
      return Result.fail('Vehicle make (marca) is required.');
    }
    if (!props.model || props.model.trim().length === 0) {
      return Result.fail('Vehicle model (modelo) is required.');
    }
    if (props.year < 1900 || props.year > new Date().getFullYear() + 2) {
      return Result.fail(`Invalid vehicle manufacturing year: ${props.year}`);
    }
    if (props.currentMileage < 0) {
      return Result.fail('Vehicle mileage cannot be negative.');
    }

    const normalizedVin = props.vin ? props.vin.trim().toUpperCase() : undefined;
    const normalizedPlate = props.plate ? props.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : undefined;

    const vehicle = new Vehicle(
      {
        ...props,
        vin: normalizedVin,
        plate: normalizedPlate,
        make: props.make.trim(),
        model: props.model.trim(),
      },
      id
    );

    return Result.ok(vehicle);
  }

  public get plate(): string | undefined {
    return this.props.plate;
  }

  public get vin(): string | undefined {
    return this.props.vin;
  }

  public get make(): string {
    return this.props.make;
  }

  public get model(): string {
    return this.props.model;
  }

  public get year(): number {
    return this.props.year;
  }

  public get engine(): string | undefined {
    return this.props.engine;
  }

  public get fuelType(): FuelType | undefined {
    return this.props.fuelType;
  }

  public get currentMileage(): number {
    return this.props.currentMileage;
  }

  public get technicalSpecs(): Record<string, unknown> | undefined {
    return this.props.technicalSpecs;
  }

  public get ownerId(): string | undefined {
    return this.props.ownerId;
  }

  public get configurationId(): string | undefined {
    return this.props.configurationId;
  }

  public setConfigurationId(configurationId: string | undefined): void {
    this.props.configurationId = configurationId;
    this.incrementVersion();
  }

  public updateTechnicalSpecs(specs: Record<string, unknown>): void {
    this.props.technicalSpecs = {
      ...(this.props.technicalSpecs ?? {}),
      ...specs,
    };
    this.incrementVersion();
  }

  /**
   * Updates mileage, asserting monotonicity (mileage cannot roll backwards).
   */
  public updateMileage(newMileage: number): Result<void, string> {
    if (newMileage < this.props.currentMileage) {
      return Result.fail(
        `Odometer rollback detected! New reported mileage (${newMileage} km) cannot be lower than previously certified mileage (${this.props.currentMileage} km).`
      );
    }
    this.props.currentMileage = newMileage;
    this.incrementVersion();
    return Result.ok(undefined);
  }

  public assignOwner(ownerId: string): void {
    this.props.ownerId = ownerId;
    this.incrementVersion();
  }
}
