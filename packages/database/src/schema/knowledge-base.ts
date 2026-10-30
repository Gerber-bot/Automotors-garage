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
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './iam.ts';

// 1. FABRICANTES (OEM Manufacturers)
export const kbManufacturers = pgTable(
  'kb_manufacturers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    country: varchar('country', { length: 100 }),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // ACTIVE, INACTIVE
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('kb_manufacturers_name_uidx').on(table.name),
  ]
);

// 2. MODELOS (Vehicle Models)
export const kbModels = pgTable(
  'kb_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    manufacturerId: uuid('manufacturer_id')
      .notNull()
      .references(() => kbManufacturers.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('kb_models_manufacturer_idx').on(table.manufacturerId),
    uniqueIndex('kb_models_mfg_name_uidx').on(table.manufacturerId, table.name),
  ]
);

// 3. GENERACIONES (Model Generations)
export const kbGenerations = pgTable(
  'kb_generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => kbModels.id, { onDelete: 'cascade' }),
    generationName: varchar('generation_name', { length: 100 }).notNull(), // e.g. "Logan II Phase 2"
    generationCode: varchar('generation_code', { length: 50 }),           // e.g. "L52"
    startYear: integer('start_year').notNull(),
    endYear: integer('end_year'),
    market: varchar('market', { length: 50 }).notNull().default('AR'),                          // Mercosur, Global, AR, BR
    verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, PENDING_VERIFICATION, VERIFIED, REJECTED, DEPRECATED
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('kb_generations_model_idx').on(table.modelId),
    index('kb_generations_years_idx').on(table.startYear, table.endYear),
  ]
);

// 4. MOTORIZACIONES (Powertrains / Engines)
export const kbPowertrains = pgTable(
  'kb_powertrains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    manufacturerId: uuid('manufacturer_id')
      .notNull()
      .references(() => kbManufacturers.id, { onDelete: 'cascade' }),
    engineCode: varchar('engine_code', { length: 50 }).notNull(),          // e.g. "H4M", "K7M", "EA211"
    family: varchar('family', { length: 100 }),                            // e.g. "SCe / HR16DE"
    displacementCc: integer('displacement_cc'),                            // e.g. 1598
    displacementLiters: numeric('displacement_liters', { precision: 3, scale: 1 }), // e.g. 1.6
    fuelType: varchar('fuel_type', { length: 50 }).notNull().default('GASOLINE'), // GASOLINE, FLEX, DIESEL, CNG
    valves: integer('valves'),                                             // 8, 16
    powerHp: integer('power_hp'),
    timingMechanism: varchar('timing_mechanism', { length: 50 }).notNull().default('CADENA'), // CADENA, CORREA, ENGRANAJE, DESCONOCIDO
    timingObservations: text('timing_observations'),
    oilViscosityOem: varchar('oil_viscosity_oem', { length: 50 }),         // e.g. "5W-40 RN0710"
    oilCapacityLiters: numeric('oil_capacity_liters', { precision: 3, scale: 1 }),
    verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('DRAFT'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('kb_powertrains_mfg_idx').on(table.manufacturerId),
    index('kb_powertrains_code_idx').on(table.engineCode),
  ]
);

// 5. FUENTES DOCUMENTALES (Documentary Sources)
export const kbDocumentSources = pgTable(
  'kb_document_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    docType: varchar('doc_type', { length: 50 }).notNull(),                // OEM_MANUAL, WORKSHOP_MANUAL, TECHNICAL_BULLETIN, OWNER_MANUAL
    publisher: varchar('publisher', { length: 150 }).notNull(),            // e.g. "Renault Argentina S.A."
    title: varchar('title', { length: 255 }).notNull(),
    market: varchar('market', { length: 50 }).notNull().default('AR'),
    versionOrDate: varchar('version_or_date', { length: 100 }),
    documentReference: varchar('document_reference', { length: 255 }),     // e.g. "REF-REN-MAN-2020-L52"
    pageOrSection: varchar('page_or_section', { length: 100 }),
    consultationDate: timestamp('consultation_date', { withTimezone: true }),
    reviewStatus: varchar('review_status', { length: 50 }).notNull().default('VERIFIED'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('kb_doc_sources_publisher_idx').on(table.publisher),
  ]
);

// 6. CONFIGURACIONES VEHICULARES (Vehicle Technical Configurations)
export const kbConfigurations = pgTable(
  'kb_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => kbModels.id, { onDelete: 'cascade' }),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => kbGenerations.id, { onDelete: 'cascade' }),
    powertrainId: uuid('powertrain_id')
      .references(() => kbPowertrains.id, { onDelete: 'set null' }),
    commercialName: varchar('commercial_name', { length: 150 }).notNull(), // e.g. "Renault Logan II 1.6 16v SCe Manual"
    yearFrom: integer('year_from').notNull(),
    yearTo: integer('year_to'),
    market: varchar('market', { length: 50 }).notNull().default('AR'),
    transmission: varchar('transmission', { length: 50 }).notNull().default('MANUAL'), // MANUAL, AUTOMATIC, CVT
    bodyStyle: varchar('body_style', { length: 50 }),
    trim: varchar('trim', { length: 100 }),
    sourceId: uuid('source_id').references(() => kbDocumentSources.id, { onDelete: 'set null' }),
    verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('DRAFT'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('kb_configs_model_gen_idx').on(table.modelId, table.generationId),
    index('kb_configs_powertrain_idx').on(table.powertrainId),
    index('kb_configs_years_idx').on(table.yearFrom, table.yearTo),
  ]
);

// 7. ESPECIFICACIONES TÉCNICAS (Technical Specs)
export const kbTechnicalSpecs = pgTable(
  'kb_technical_specs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    configurationId: uuid('configuration_id')
      .notNull()
      .references(() => kbConfigurations.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 100 }).notNull(),              // ENGINE_OIL, COOLANT, BRAKE_FLUID, SPARK_PLUGS, TIRES
    specKey: varchar('spec_key', { length: 100 }).notNull(),               // e.g. "viscosity", "standard", "capacity_liters"
    specValue: varchar('spec_value', { length: 255 }).notNull(),
    unit: varchar('unit', { length: 50 }),                                 // e.g. "L", "km", "mm", "bar"
    condition: varchar('condition', { length: 100 }),                      // NORMAL, SEVERE, ALL
    sourceId: uuid('source_id').references(() => kbDocumentSources.id, { onDelete: 'set null' }),
    verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('DRAFT'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('kb_specs_config_cat_idx').on(table.configurationId, table.category),
  ]
);

// 8. REGLAS DE MANTENIMIENTO TÉCNICO (Maintenance Rules with Versioning & Audit)
export const kbMaintenanceRules = pgTable(
  'kb_maintenance_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    configurationId: uuid('configuration_id')
      .notNull()
      .references(() => kbConfigurations.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 100 }).notNull(),              // OIL_AND_FILTER, TIMING_BELT, BRAKES, etc.
    operation: varchar('operation', { length: 50 }).notNull().default('REPLACE'), // REPLACE, INSPECT, ADJUST, CLEAN
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    intervalKm: integer('interval_km'),
    intervalMonths: integer('interval_months'),
    severeIntervalKm: integer('severe_interval_km'),
    severeIntervalMonths: integer('severe_interval_months'),
    conditions: varchar('conditions', { length: 255 }),
    sourceId: uuid('source_id').references(() => kbDocumentSources.id, { onDelete: 'set null' }),
    verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, PENDING_VERIFICATION, VERIFIED, REJECTED, DEPRECATED
    ruleVersion: integer('rule_version').notNull().default(1),
    previousVersionId: uuid('previous_version_id'),
    isActive: boolean('is_active').notNull().default(true),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationNotes: text('verification_notes'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('kb_rules_config_cat_idx').on(table.configurationId, table.category),
    index('kb_rules_active_status_idx').on(table.isActive, table.verificationStatus),
  ]
);
