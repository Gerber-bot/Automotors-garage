export const IntervalSource = {
  OEM_MANUAL: 'OEM_MANUAL',
  WORKSHOP_CUSTOM: 'WORKSHOP_CUSTOM',
  FLEET_POLICY: 'FLEET_POLICY',
  GENERIC_INDUSTRY: 'GENERIC_INDUSTRY',
} as const;
export type IntervalSource = (typeof IntervalSource)[keyof typeof IntervalSource];

export const ServiceCategory = {
  OIL_AND_FILTER: 'OIL_AND_FILTER',
  BRAKES: 'BRAKES',
  TIMING_BELT: 'TIMING_BELT',
  SPARK_PLUGS: 'SPARK_PLUGS',
  COOLANT: 'COOLANT',
  TRANSMISSION_FLUID: 'TRANSMISSION_FLUID',
  AIR_AND_CABIN_FILTERS: 'AIR_AND_CABIN_FILTERS',
  GENERAL_INSPECTION: 'GENERAL_INSPECTION',
} as const;
export type ServiceCategory = (typeof ServiceCategory)[keyof typeof ServiceCategory];

export interface ServiceIntervalRule {
  readonly id: string;
  readonly category: ServiceCategory;
  readonly title: string;
  readonly intervalKm: number;
  readonly intervalMonths: number;
  readonly source: IntervalSource;
  readonly sourceCitation: string;
  readonly severeUsageIntervalKm?: number;
  readonly severeUsageIntervalMonths?: number;
}

export interface VehicleUsageConditions {
  readonly isSevereUsage?: boolean; // Taxis, delivery, constant stop-and-go, heavy dust
  readonly averageMonthlyKm?: number; // Calculated or estimated monthly km
}
