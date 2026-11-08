import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_uidx').on(table.email),
    index('users_active_idx').on(table.isActive),
  ]
);

export const workshops = pgTable(
  'workshops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    taxId: varchar('tax_id', { length: 50 }),
    address: text('address'),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('workshops_tax_id_idx').on(table.taxId),
    index('workshops_active_idx').on(table.isActive),
  ]
);

export const workshopMembers = pgTable(
  'workshop_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(), // SUPER_ADMIN, WORKSHOP_OWNER, WORKSHOP_MANAGER, MECHANIC, VEHICLE_OWNER
    permissions: text('permissions').array(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('workshop_user_membership_uidx').on(table.workshopId, table.userId),
    index('workshop_members_user_idx').on(table.userId),
    index('workshop_members_workshop_idx').on(table.workshopId),
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeWorkshopId: uuid('active_workshop_id').references(() => workshops.id, {
      onDelete: 'set null',
    }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isRevoked: boolean('is_revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipAddress: varchar('ip_address', { length: 100 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_active_workshop_idx').on(table.activeWorkshopId),
    index('sessions_expires_revoked_idx').on(table.expiresAt, table.isRevoked),
  ]
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isConsumed: boolean('is_consumed').notNull().default(false),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('pwd_reset_token_hash_idx').on(table.tokenHash),
    index('pwd_reset_user_idx').on(table.userId),
  ]
);
