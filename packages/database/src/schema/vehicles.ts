import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { workshops, users } from './iam.ts';
import { kbConfigurations } from './knowledge-base.ts';

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vin: varchar('vin', { length: 17 }),
    plate: varchar('plate', { length: 20 }),
    make: varchar('make', { length: 100 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    year: integer('year').notNull(),
    engine: varchar('engine', { length: 100 }),
    fuelType: varchar('fuel_type', { length: 50 }),
    currentMileage: integer('current_mileage').notNull().default(0),
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    configurationId: uuid('configuration_id').references(() => kbConfigurations.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('vehicles_vin_uidx').on(table.vin),
    index('vehicles_plate_idx').on(table.plate),
    index('vehicles_make_model_idx').on(table.make, table.model),
    index('vehicles_owner_user_idx').on(table.ownerUserId),
    index('vehicles_configuration_idx').on(table.configurationId),
  ]
);

export const vehicleOwnerships = pgTable(
  'vehicle_ownerships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').notNull(), // Links to customers table
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    isCurrentOwner: boolean('is_current_owner').notNull().default(true),
    startDate: timestamp('start_date', { withTimezone: true }).notNull().defaultNow(),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('vehicle_ownerships_vehicle_idx').on(table.vehicleId),
    index('vehicle_ownerships_customer_idx').on(table.customerId),
    index('vehicle_ownerships_workshop_idx').on(table.workshopId),
  ]
);

export const vehicleAccessGrants = pgTable(
  'vehicle_access_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    granterUserId: uuid('granter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantedWorkshopId: uuid('granted_workshop_id').references(() => workshops.id, {
      onDelete: 'cascade',
    }),
    grantedUserId: uuid('granted_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    permissionLevel: varchar('permission_level', { length: 50 }).notNull().default('READ_HISTORY'), // READ_HISTORY, FULL_ACCESS
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isRevoked: boolean('is_revoked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('vehicle_grants_vehicle_idx').on(table.vehicleId),
    index('vehicle_grants_granted_workshop_idx').on(table.grantedWorkshopId),
    index('vehicle_grants_granted_user_idx').on(table.grantedUserId),
  ]
);
