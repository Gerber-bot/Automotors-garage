import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workshops, users } from './iam.ts';
import { vehicles } from './vehicles.ts';
import { customers } from './customers.ts';

export const workOrders = pgTable(
  'work_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    assignedMechanicId: uuid('assigned_mechanic_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, OPEN, IN_PROGRESS, WAITING_APPROVAL, COMPLETED, CANCELLED
    reportedMileage: integer('reported_mileage').notNull(),
    reportedIssue: text('reported_issue').notNull(),
    initialCondition: text('initial_condition'),
    diagnosis: text('diagnosis'),
    internalNotes: text('internal_notes'),
    partsCost: numeric('parts_cost', { precision: 12, scale: 2 }).default('0'),
    laborCost: numeric('labor_cost', { precision: 12, scale: 2 }).default('0'),
    version: integer('version').notNull().default(1),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('work_orders_workshop_idx').on(table.workshopId),
    index('work_orders_vehicle_idx').on(table.vehicleId),
    index('work_orders_customer_idx').on(table.customerId),
    index('work_orders_status_idx').on(table.status),
    index('work_orders_workshop_status_idx').on(table.workshopId, table.status),
  ]
);

export const workOrderItems = pgTable(
  'work_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(), // OIL_AND_FILTER, BRAKES, SUSPENSION, etc.
    description: text('description'),
    cost: numeric('cost', { precision: 10, scale: 2 }).default('0'),
    isApproved: boolean('is_approved').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('work_order_items_wo_idx').on(table.workOrderId),
    index('work_order_items_category_idx').on(table.category),
  ]
);
