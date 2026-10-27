import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  boolean,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { workshops, users } from './iam.ts';
import { vehicles } from './vehicles.ts';
import { workOrders } from './work-orders.ts';

export const evidenceFiles = pgTable(
  'evidence_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    workOrderId: uuid('work_order_id').references(() => workOrders.id, {
      onDelete: 'set null',
    }),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id, {
      onDelete: 'set null',
    }),
    storageKey: text('storage_key').notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    sha256Hash: varchar('sha256_hash', { length: 64 }).notNull(),
    isPrivate: boolean('is_private').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('evidence_files_workshop_idx').on(table.workshopId),
    index('evidence_files_work_order_idx').on(table.workOrderId),
    index('evidence_files_vehicle_idx').on(table.vehicleId),
  ]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workshopId: uuid('workshop_id').references(() => workshops.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    outcome: varchar('outcome', { length: 20 }).notNull(), // ALLOW, DENY
    resourceType: varchar('resource_type', { length: 100 }),
    resourceId: varchar('resource_id', { length: 255 }),
    action: varchar('action', { length: 50 }),
    details: jsonb('details').default({}),
    ipAddress: varchar('ip_address', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_workshop_idx').on(table.workshopId),
    index('audit_logs_user_idx').on(table.userId),
    index('audit_logs_event_type_idx').on(table.eventType),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: varchar('key', { length: 255 }).notNull(),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    lockedAt: timestamp('locked_at', { withTimezone: true }).notNull().defaultNow(),
    responseCode: integer('response_code'),
    responseBody: jsonb('response_body'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idempotency_key_workshop_uidx').on(table.key, table.workshopId),
    index('idempotency_expires_at_idx').on(table.expiresAt),
  ]
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
    aggregateId: varchar('aggregate_id', { length: 255 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, PUBLISHED, FAILED
    retryCount: integer('retry_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('outbox_status_created_idx').on(table.status, table.createdAt),
    index('outbox_aggregate_idx').on(table.aggregateType, table.aggregateId),
  ]
);
