import {
  IntervalSource,
  ServiceCategory,
} from './intervals.ts';
import type {
  ServiceIntervalRule,
  VehicleUsageConditions,
} from './intervals.ts';

export const MaintenanceStatus = {
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  OK: 'OK',
  UPCOMING_SOON: 'UPCOMING_SOON', // <= 1,000 km or <= 30 days
  DUE_NOW: 'DUE_NOW',             // <= 200 km or <= 7 days
  OVERDUE: 'OVERDUE',             // < 0 km or past due date
} as const;
export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

export const DueReason = {
  NONE: 'NONE',
  DUE_BY_MILEAGE: 'DUE_BY_MILEAGE',
  DUE_BY_TIME: 'DUE_BY_TIME',
  DUE_BY_BOTH: 'DUE_BY_BOTH',
} as const;
export type DueReason = (typeof DueReason)[keyof typeof DueReason];

export const EstimationConfidence = {
  HIGH: 'HIGH',       // Known previous service with exact date & mileage + calculated usage rate
  MEDIUM: 'MEDIUM',   // Previous service known, usage rate assumed from generic average
  LOW: 'LOW',         // Estimated solely from vehicle registration year and total odometer
  NONE: 'NONE',       // Insufficient data
} as const;
export type EstimationConfidence = (typeof EstimationConfidence)[keyof typeof EstimationConfidence];

export interface PreviousServiceEntry {
  readonly serviceDate: Date;
  readonly recordedMileage: number;
  readonly category: ServiceCategory;
}

export interface MaintenanceCalculationInput {
  readonly vehicle: {
    readonly id: string;
    readonly make: string;
    readonly model: string;
    readonly year: number;
    readonly currentMileage: number;
  };
  readonly rule: ServiceIntervalRule | null;
  readonly previousServices?: readonly PreviousServiceEntry[];
  readonly usageConditions?: VehicleUsageConditions;
  readonly currentDate?: Date;
}

export interface MaintenanceCalculationResult {
  readonly status: MaintenanceStatus;
  readonly category: ServiceCategory | 'UNKNOWN';
  readonly nextDueMileage: number | null;
  readonly remainingKm: number | null;
  readonly nextDueDate: Date | null;
  readonly dueReason: DueReason;
  readonly estimatedDaysRemaining: number | null;
  readonly confidence: EstimationConfidence;
  readonly intervalSource: IntervalSource | 'NONE';
  readonly sourceCitation?: string;
  readonly warning?: string;
}

export class DeterministicMaintenanceEngine {
  private readonly DEFAULT_MONTHLY_KM = 1250; // Standard 15,000 km / year

  public calculate(input: MaintenanceCalculationInput): MaintenanceCalculationResult {
    const now = input.currentDate ?? new Date();

    // 1. Guard against missing rules or missing vehicle data -> INSUFFICIENT_DATA
    if (!input.rule || !input.vehicle || input.vehicle.currentMileage == null) {
      return {
        status: MaintenanceStatus.INSUFFICIENT_DATA,
        category: input.rule?.category ?? 'UNKNOWN',
        nextDueMileage: null,
        remainingKm: null,
        nextDueDate: null,
        dueReason: DueReason.NONE,
        estimatedDaysRemaining: null,
        confidence: EstimationConfidence.NONE,
        intervalSource: 'NONE',
        warning: 'Insufficient data: No documented service interval rule found for vehicle specifications.',
      };
    }

    const { rule, vehicle, usageConditions } = input;
    const isSevere = usageConditions?.isSevereUsage ?? false;

    const intervalKm = (isSevere && rule.severeUsageIntervalKm) ? rule.severeUsageIntervalKm : rule.intervalKm;
    const intervalMonths = (isSevere && rule.severeUsageIntervalMonths) ? rule.severeUsageIntervalMonths : rule.intervalMonths;

    // 2. Find latest service in this category
    const relevantServices = (input.previousServices ?? [])
      .filter((s) => s.category === rule.category)
      .sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());

    const lastService = relevantServices[0];

    // 3. Odometer Rollback Check
    if (lastService && vehicle.currentMileage < lastService.recordedMileage) {
      return {
        status: MaintenanceStatus.INSUFFICIENT_DATA,
        category: rule.category,
        nextDueMileage: null,
        remainingKm: null,
        nextDueDate: null,
        dueReason: DueReason.NONE,
        estimatedDaysRemaining: null,
        confidence: EstimationConfidence.NONE,
        intervalSource: rule.source,
        sourceCitation: rule.sourceCitation,
        warning: `Odometer inconsistency detected: Current mileage (${vehicle.currentMileage} km) is less than previously recorded service mileage (${lastService.recordedMileage} km). Inspection required.`,
      };
    }

    // 4. Calculate Next Due Mileage
    let baseMileage = 0;
    let baseDate: Date;
    let confidence: EstimationConfidence;

    if (lastService) {
      baseMileage = lastService.recordedMileage;
      baseDate = lastService.serviceDate;
      confidence = usageConditions?.averageMonthlyKm ? EstimationConfidence.HIGH : EstimationConfidence.MEDIUM;
    } else {
      // No service recorded in category: calculate from vehicle manufacture date / initial 0 km
      baseMileage = 0;
      baseDate = new Date(vehicle.year, 0, 1);
      confidence = EstimationConfidence.LOW;
    }

    const nextDueMileage = baseMileage + intervalKm;
    const remainingKm = nextDueMileage - vehicle.currentMileage;

    // 5. Calculate Next Due Date by Time Interval
    const nextDueDate = new Date(baseDate.getTime());
    nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);

    // 6. Calculate Remaining Days and Monthly Usage Projection
    const monthlyRate = usageConditions?.averageMonthlyKm && usageConditions.averageMonthlyKm > 0
      ? usageConditions.averageMonthlyKm
      : this.DEFAULT_MONTHLY_KM;

    const dailyRate = monthlyRate / 30.4375;
    const daysRemainingByMileage = remainingKm > 0 ? Math.round(remainingKm / dailyRate) : 0;
    const daysRemainingByCalendar = Math.round((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 7. Determine Due Reason & Maintenance Status
    const isMileageDue = remainingKm <= 0;
    const isCalendarDue = daysRemainingByCalendar <= 0;

    let dueReason: DueReason = DueReason.NONE;
    if (isMileageDue && isCalendarDue) {
      dueReason = DueReason.DUE_BY_BOTH;
    } else if (isMileageDue) {
      dueReason = DueReason.DUE_BY_MILEAGE;
    } else if (isCalendarDue) {
      dueReason = DueReason.DUE_BY_TIME;
    }

    let status: MaintenanceStatus = MaintenanceStatus.OK;
    if (isMileageDue || isCalendarDue) {
      status = MaintenanceStatus.OVERDUE;
    } else if (remainingKm <= 200 || daysRemainingByCalendar <= 7) {
      status = MaintenanceStatus.DUE_NOW;
    } else if (remainingKm <= 1000 || daysRemainingByCalendar <= 30) {
      status = MaintenanceStatus.UPCOMING_SOON;
    }

    const effectiveDaysRemaining = Math.min(
      Math.max(0, daysRemainingByCalendar),
      Math.max(0, daysRemainingByMileage)
    );

    return {
      status,
      category: rule.category,
      nextDueMileage,
      remainingKm,
      nextDueDate,
      dueReason,
      estimatedDaysRemaining: effectiveDaysRemaining,
      confidence,
      intervalSource: rule.source,
      sourceCitation: rule.sourceCitation,
    };
  }
}
