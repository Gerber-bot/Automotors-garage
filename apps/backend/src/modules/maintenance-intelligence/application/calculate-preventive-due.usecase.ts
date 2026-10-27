import {
  DeterministicMaintenanceEngine,
} from '../domain/deterministic-engine.ts';
import type {
  MaintenanceCalculationResult,
  PreviousServiceEntry,
} from '../domain/deterministic-engine.ts';
import type { ServiceIntervalRule, VehicleUsageConditions } from '../domain/intervals.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface CalculatePreventiveDueInput {
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    currentMileage: number;
  };
  rules: readonly ServiceIntervalRule[];
  previousServices?: readonly PreviousServiceEntry[];
  usageConditions?: VehicleUsageConditions;
  currentDate?: Date;
}

export class CalculatePreventiveDueUseCase {
  private readonly engine: DeterministicMaintenanceEngine;

  constructor(engine?: DeterministicMaintenanceEngine) {
    this.engine = engine ?? new DeterministicMaintenanceEngine();
  }

  public execute(input: CalculatePreventiveDueInput): Result<readonly MaintenanceCalculationResult[], string> {
    if (!input.vehicle || input.vehicle.currentMileage < 0) {
      return Result.fail('Invalid vehicle specification or negative mileage.');
    }

    if (input.rules.length === 0) {
      // Missing documented intervals -> INSUFFICIENT_DATA
      const insufficientResult = this.engine.calculate({
        vehicle: input.vehicle,
        rule: null,
      });
      return Result.ok([insufficientResult]);
    }

    const results: MaintenanceCalculationResult[] = [];

    for (const rule of input.rules) {
      const calculation = this.engine.calculate({
        vehicle: input.vehicle,
        rule,
        previousServices: input.previousServices,
        usageConditions: input.usageConditions,
        currentDate: input.currentDate,
      });
      results.push(calculation);
    }

    return Result.ok(results);
  }
}
