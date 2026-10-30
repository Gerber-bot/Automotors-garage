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
  HIGH: 'HIGH',       // Known previous service with exact date & mileage + calculated empirical usage rate
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

export interface OdometerReadingPoint {
  readonly date: Date;
  readonly mileage: number;
}

export interface KbIntervalRuleLike {
  readonly id: string;
  readonly category: ServiceCategory | string;
  readonly title: string;
  readonly operation?: 'REPLACE' | 'INSPECT' | 'ADJUST' | 'CLEAN' | string;
  readonly intervalKm?: number | null;
  readonly intervalMonths?: number | null;
  readonly severeUsageIntervalKm?: number | null;
  readonly severeUsageIntervalMonths?: number | null;
  readonly source?: IntervalSource | string;
  readonly sourceCitation?: string;
  readonly ruleVersion?: number;
  readonly verificationStatus?: string;
}

export interface MaintenanceCalculationInput {
  readonly vehicle: {
    readonly id: string;
    readonly make: string;
    readonly model: string;
    readonly year: number;
    readonly currentMileage: number;
  };
  readonly rule: ServiceIntervalRule | KbIntervalRuleLike | null;
  readonly previousServices?: readonly PreviousServiceEntry[];
  readonly odometerReadings?: readonly OdometerReadingPoint[];
  readonly usageConditions?: VehicleUsageConditions;
  readonly currentDate?: Date;
}

export interface MaintenanceCalculationResult {
  readonly status: MaintenanceStatus;
  readonly category: ServiceCategory | 'UNKNOWN';
  readonly nextDueMileage: number | null;
  readonly remainingKm: number | null;
  readonly nextDueDate: Date | null;
  readonly calendarDueDate?: Date | null;
  readonly estimatedUsageDate?: Date | null;
  readonly dueReason: DueReason;
  readonly estimatedDaysRemaining: number | null;
  readonly confidence: EstimationConfidence;
  readonly intervalSource: IntervalSource | string | 'NONE';
  readonly sourceCitation?: string;
  readonly operation?: string;
  readonly ruleVersion?: number;
  readonly verificationStatus?: string;
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
        category: (input.rule?.category as ServiceCategory) ?? 'UNKNOWN',
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

    // Reject unverified rules from automatic calculation if verificationStatus is present and not VERIFIED
    if (rule.verificationStatus && rule.verificationStatus !== 'VERIFIED') {
      return {
        status: MaintenanceStatus.INSUFFICIENT_DATA,
        category: (rule.category as ServiceCategory) ?? 'UNKNOWN',
        nextDueMileage: null,
        remainingKm: null,
        nextDueDate: null,
        dueReason: DueReason.NONE,
        estimatedDaysRemaining: null,
        confidence: EstimationConfidence.NONE,
        intervalSource: rule.source ?? 'NONE',
        sourceCitation: rule.sourceCitation,
        operation: rule.operation ?? 'REPLACE',
        ruleVersion: rule.ruleVersion ?? 1,
        verificationStatus: rule.verificationStatus,
        warning: `Regla técnica en estado '${rule.verificationStatus}'. Solo reglas VERIFIED documentadas alimentan el cálculo determinista.`,
      };
    }

    const intervalKm = isSevere && rule.severeUsageIntervalKm
      ? rule.severeUsageIntervalKm
      : (rule.intervalKm ?? null);

    const intervalMonths = isSevere && rule.severeUsageIntervalMonths
      ? rule.severeUsageIntervalMonths
      : (rule.intervalMonths ?? null);

    if (intervalKm == null && intervalMonths == null) {
      return {
        status: MaintenanceStatus.INSUFFICIENT_DATA,
        category: (rule.category as ServiceCategory) ?? 'UNKNOWN',
        nextDueMileage: null,
        remainingKm: null,
        nextDueDate: null,
        dueReason: DueReason.NONE,
        estimatedDaysRemaining: null,
        confidence: EstimationConfidence.NONE,
        intervalSource: rule.source ?? 'NONE',
        sourceCitation: rule.sourceCitation,
        warning: 'Rule documents neither mileage nor time intervals.',
      };
    }

    // 2. Find latest service in this category
    const relevantServices = (input.previousServices ?? [])
      .filter((s) => s.category === rule.category)
      .sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());

    const lastService = relevantServices[0];

    // 3. Odometer Rollback Check
    if (lastService && vehicle.currentMileage < lastService.recordedMileage) {
      return {
        status: MaintenanceStatus.INSUFFICIENT_DATA,
        category: rule.category as ServiceCategory,
        nextDueMileage: null,
        remainingKm: null,
        nextDueDate: null,
        dueReason: DueReason.NONE,
        estimatedDaysRemaining: null,
        confidence: EstimationConfidence.NONE,
        intervalSource: rule.source ?? 'NONE',
        sourceCitation: rule.sourceCitation,
        warning: `Odometer inconsistency detected: Current mileage (${vehicle.currentMileage} km) is less than previously recorded service mileage (${lastService.recordedMileage} km). Inspection required.`,
      };
    }

    // 4. Calculate Base Mileage & Confidence
    let baseMileage = 0;
    let baseDate: Date;
    let confidence: EstimationConfidence;

    // Check empirical odometer readings (requires at least 2 distinct readings with positive time and km)
    let empiricalDailyRate: number | null = null;
    if (input.odometerReadings && input.odometerReadings.length >= 2) {
      const sortedReadings = [...input.odometerReadings].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
      const oldest = sortedReadings[0]!;
      const newest = sortedReadings[sortedReadings.length - 1]!;
      const daysDiff = (newest.date.getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24);
      const kmDiff = newest.mileage - oldest.mileage;
      if (daysDiff >= 7 && kmDiff > 0) {
        empiricalDailyRate = kmDiff / daysDiff;
      }
    }

    if (lastService) {
      baseMileage = lastService.recordedMileage;
      baseDate = lastService.serviceDate;
      if (empiricalDailyRate !== null || usageConditions?.averageMonthlyKm) {
        confidence = EstimationConfidence.HIGH;
      } else {
        confidence = EstimationConfidence.MEDIUM;
      }
    } else {
      // No service recorded in category: calculate from vehicle manufacture date / initial 0 km
      baseMileage = 0;
      baseDate = new Date(vehicle.year, 0, 1);
      confidence = EstimationConfidence.LOW;
    }

    // 5. Calculate Next Due Mileage (if intervalKm documented)
    let nextDueMileage: number | null = null;
    let remainingKm: number | null = null;
    if (intervalKm != null) {
      nextDueMileage = baseMileage + intervalKm;
      remainingKm = nextDueMileage - vehicle.currentMileage;
    }

    // 6. Calculate Calendar Due Date (if intervalMonths documented)
    let calendarDueDate: Date | null = null;
    let daysRemainingByCalendar: number | null = null;
    if (intervalMonths != null) {
      calendarDueDate = new Date(baseDate.getTime());
      calendarDueDate.setMonth(calendarDueDate.getMonth() + intervalMonths);
      daysRemainingByCalendar = Math.round(
        (calendarDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // 7. Calculate Estimated Usage Date based on empirical rate or default monthly usage
    const effectiveDailyRate = empiricalDailyRate !== null
      ? empiricalDailyRate
      : (usageConditions?.averageMonthlyKm && usageConditions.averageMonthlyKm > 0
          ? usageConditions.averageMonthlyKm / 30.4375
          : this.DEFAULT_MONTHLY_KM / 30.4375);

    let daysRemainingByMileage: number | null = null;
    let estimatedUsageDate: Date | null = null;
    if (remainingKm != null) {
      daysRemainingByMileage = remainingKm > 0 ? Math.round(remainingKm / effectiveDailyRate) : 0;
      estimatedUsageDate = new Date(now.getTime() + daysRemainingByMileage * 24 * 60 * 60 * 1000);
    }

    // 8. Due Reason & Effective Due Date
    const isMileageDue = remainingKm != null && remainingKm <= 0;
    const isCalendarDue = daysRemainingByCalendar != null && daysRemainingByCalendar <= 0;

    let dueReason: DueReason = DueReason.NONE;
    if (isMileageDue && isCalendarDue) {
      dueReason = DueReason.DUE_BY_BOTH;
    } else if (isMileageDue) {
      dueReason = DueReason.DUE_BY_MILEAGE;
    } else if (isCalendarDue) {
      dueReason = DueReason.DUE_BY_TIME;
    }

    // Determine status:
    // Status is based on whichever limit comes first
    let status: MaintenanceStatus = MaintenanceStatus.OK;
    if (isMileageDue || isCalendarDue) {
      status = MaintenanceStatus.OVERDUE;
    } else {
      const nearMileage = remainingKm != null && remainingKm <= 200;
      const nearCalendar = daysRemainingByCalendar != null && daysRemainingByCalendar <= 7;
      const upcomingMileage = remainingKm != null && remainingKm <= 1000;
      const upcomingCalendar = daysRemainingByCalendar != null && daysRemainingByCalendar <= 30;

      if (nearMileage || nearCalendar) {
        status = MaintenanceStatus.DUE_NOW;
      } else if (upcomingMileage || upcomingCalendar) {
        status = MaintenanceStatus.UPCOMING_SOON;
      }
    }

    // Effective days remaining and effective nextDueDate
    let effectiveDaysRemaining: number | null = null;
    let nextDueDate: Date | null = null;

    if (daysRemainingByCalendar != null && daysRemainingByMileage != null) {
      effectiveDaysRemaining = Math.min(
        Math.max(0, daysRemainingByCalendar),
        Math.max(0, daysRemainingByMileage)
      );
      // Whichever occurs first between calendar date and estimated usage date
      nextDueDate = calendarDueDate && estimatedUsageDate
        ? (calendarDueDate.getTime() < estimatedUsageDate.getTime() ? calendarDueDate : estimatedUsageDate)
        : (calendarDueDate ?? estimatedUsageDate);
    } else if (daysRemainingByCalendar != null) {
      effectiveDaysRemaining = Math.max(0, daysRemainingByCalendar);
      nextDueDate = calendarDueDate;
    } else if (daysRemainingByMileage != null) {
      effectiveDaysRemaining = Math.max(0, daysRemainingByMileage);
      nextDueDate = estimatedUsageDate;
    }

    return {
      status,
      category: rule.category as ServiceCategory,
      nextDueMileage,
      remainingKm,
      nextDueDate,
      calendarDueDate,
      estimatedUsageDate,
      dueReason,
      estimatedDaysRemaining: effectiveDaysRemaining,
      confidence,
      intervalSource: rule.source ?? 'NONE',
      sourceCitation: rule.sourceCitation,
      operation: rule.operation ?? 'REPLACE',
      ruleVersion: rule.ruleVersion ?? 1,
      verificationStatus: rule.verificationStatus ?? 'VERIFIED',
    };
  }
}
