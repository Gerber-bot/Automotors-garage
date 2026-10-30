-- AUTOMOTORS GARAGE: Milestone 14.1 Vehicle Knowledge Base
-- Migration 0003: Structured Automotive Catalog, Documentary Sources, Maintenance Rules & Vehicle Technical Binding

-- 1. Fabricantes (OEM Manufacturers)
CREATE TABLE IF NOT EXISTS kb_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  country VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Modelos (Models)
CREATE TABLE IF NOT EXISTS kb_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES kb_manufacturers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT kb_models_mfg_name_uidx UNIQUE (manufacturer_id, name)
);
CREATE INDEX IF NOT EXISTS kb_models_manufacturer_idx ON kb_models(manufacturer_id);

-- 3. Generaciones (Model Generations)
CREATE TABLE IF NOT EXISTS kb_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES kb_models(id) ON DELETE CASCADE,
  generation_name VARCHAR(100) NOT NULL,
  generation_code VARCHAR(50),
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  market VARCHAR(50) NOT NULL DEFAULT 'AR',
  verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kb_generations_model_idx ON kb_generations(model_id);
CREATE INDEX IF NOT EXISTS kb_generations_years_idx ON kb_generations(start_year, end_year);

-- 4. Motorizaciones (Powertrains / Engines)
CREATE TABLE IF NOT EXISTS kb_powertrains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES kb_manufacturers(id) ON DELETE CASCADE,
  engine_code VARCHAR(50) NOT NULL,
  family VARCHAR(100),
  displacement_cc INTEGER,
  displacement_liters NUMERIC(3, 1),
  fuel_type VARCHAR(50) NOT NULL DEFAULT 'GASOLINE',
  valves INTEGER,
  power_hp INTEGER,
  timing_mechanism VARCHAR(50) NOT NULL DEFAULT 'CADENA',
  timing_observations TEXT,
  oil_viscosity_oem VARCHAR(50),
  oil_capacity_liters NUMERIC(3, 1),
  verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kb_powertrains_mfg_idx ON kb_powertrains(manufacturer_id);
CREATE INDEX IF NOT EXISTS kb_powertrains_code_idx ON kb_powertrains(engine_code);

-- 5. Fuentes Documentales (Documentary Sources)
CREATE TABLE IF NOT EXISTS kb_document_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type VARCHAR(50) NOT NULL,
  publisher VARCHAR(150) NOT NULL,
  title VARCHAR(255) NOT NULL,
  market VARCHAR(50) NOT NULL DEFAULT 'AR',
  version_or_date VARCHAR(100),
  document_reference VARCHAR(255),
  page_or_section VARCHAR(100),
  consultation_date TIMESTAMP WITH TIME ZONE,
  review_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kb_doc_sources_publisher_idx ON kb_document_sources(publisher);

-- 6. Configuraciones Vehiculares (Vehicle Configurations)
CREATE TABLE IF NOT EXISTS kb_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES kb_models(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES kb_generations(id) ON DELETE CASCADE,
  powertrain_id UUID REFERENCES kb_powertrains(id) ON DELETE SET NULL,
  commercial_name VARCHAR(150) NOT NULL,
  year_from INTEGER NOT NULL,
  year_to INTEGER,
  market VARCHAR(50) NOT NULL DEFAULT 'AR',
  transmission VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  body_style VARCHAR(50),
  trim VARCHAR(100),
  source_id UUID REFERENCES kb_document_sources(id) ON DELETE SET NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kb_configs_model_gen_idx ON kb_configurations(model_id, generation_id);
CREATE INDEX IF NOT EXISTS kb_configs_powertrain_idx ON kb_configurations(powertrain_id);
CREATE INDEX IF NOT EXISTS kb_configs_years_idx ON kb_configurations(year_from, year_to);

-- 7. Especificaciones Técnicas (Technical Specs)
CREATE TABLE IF NOT EXISTS kb_technical_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL REFERENCES kb_configurations(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  spec_key VARCHAR(100) NOT NULL,
  spec_value VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  condition VARCHAR(100),
  source_id UUID REFERENCES kb_document_sources(id) ON DELETE SET NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kb_specs_config_cat_idx ON kb_technical_specs(configuration_id, category);

-- 8. Reglas de Mantenimiento Técnico (Maintenance Rules with Versioning & Audit)
CREATE TABLE IF NOT EXISTS kb_maintenance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL REFERENCES kb_configurations(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL DEFAULT 'REPLACE',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  interval_km INTEGER,
  interval_months INTEGER,
  severe_interval_km INTEGER,
  severe_interval_months INTEGER,
  conditions VARCHAR(255),
  source_id UUID REFERENCES kb_document_sources(id) ON DELETE SET NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  rule_version INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES kb_maintenance_rules(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kb_rules_config_cat_idx ON kb_maintenance_rules(configuration_id, category);
CREATE INDEX IF NOT EXISTS kb_rules_active_status_idx ON kb_maintenance_rules(is_active, verification_status);

-- 9. Ampliación de Vehículos: Vinculación a Configuración Técnica
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS configuration_id UUID REFERENCES kb_configurations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS vehicles_configuration_idx ON vehicles(configuration_id);
