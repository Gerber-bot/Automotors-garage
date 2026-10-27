import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { workshops, users } from './iam.ts';
import { vehicles } from './vehicles.ts';
import { workOrders } from './work-orders.ts';

export const maintenanceRecords = pgTable(
  'maintenance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    workOrderId: uuid('work_order_id').references(() => workOrders.id, {
      onDelete: 'set null',
    }),
    performingWorkshopId: uuid('performing_workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    performingWorkshopName: varchar('performing_workshop_name', { length: 255 }).notNull(),
    serviceDate: timestamp('service_date', { withTimezone: true }).notNull().defaultNow(),
    recordedMileage: integer('recorded_mileage').notNull(),
    verificationLevel: varchar('verification_level', { length: 50 }).notNull().default('DECLARED'), // DECLARED, WORKSHOP_VERIFIED, CERTIFIED_NETWORK
    isCertified: boolean('is_certified').notNull().default(false),
    criteriaMet: jsonb('criteria_met').default([]),
    interventions: jsonb('interventions').default([]),
    evidenceAssetIds: jsonb('evidence_asset_ids').default([]),
    internalNotes: text('internal_notes'), // Private to performing workshop
    partsCost: numeric('parts_cost', { precision: 12, scale: 2 }),
    laborCost: numeric('labor_cost', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('maint_records_vehicle_idx').on(table.vehicleId),
    index('maint_records_workshop_idx').on(table.performingWorkshopId),
    index('maint_records_service_date_idx').on(table.serviceDate),
    index('maint_records_mileage_idx').on(table.recordedMileage),
  ]
);

export const maintenanceCorrections = pgTable(
  'maintenance_corrections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recordId: uuid('record_id')
      .notNull()
      .references(() => maintenanceRecords.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorName: varchar('actor_name', { length: 255 }).notNull(),
    reason: text('reason').notNull(),
    previousData: jsonb('previous_data').notNull(),
    correctedData: jsonb('corrected_data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('maint_corrections_record_idx').on(table.recordId),
    index('maint_corrections_actor_idx').on(table.actorId),
  ]
);

export const maintenanceIntervals = pgTable(
  'maintenance_intervals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    make: varchar('make', { length: 100 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    year: integer('year'),
    engine: varchar('engine', { length: 100 }),
    category: varchar('category', { length: 100 }).notNull(),
    intervalKm: integer('interval_km'),
    intervalMonths: integer('interval_months'),
    sourceCitation: varchar('source_citation', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('maint_intervals_lookup_idx').on(table.make, table.model, table.category),
  ]
);
