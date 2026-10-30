-- AUTOMOTORS GARAGE: Milestone 12 Mi Automotors (Owner Portal Foundation)
-- Migration 0002: Owner Vehicle Binding, Optional VIN & Owner-Declared Maintenance Records

ALTER TABLE vehicles ALTER COLUMN vin DROP NOT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS vehicles_owner_user_idx ON vehicles(owner_user_id);

ALTER TABLE maintenance_records ALTER COLUMN performing_workshop_id DROP NOT NULL;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS record_origin VARCHAR(50) NOT NULL DEFAULT 'WORKSHOP_CERTIFIED';
CREATE INDEX IF NOT EXISTS maint_records_recorded_by_idx ON maintenance_records(recorded_by_user_id);
