-- AUTOMOTORS GARAGE: Milestone 07 Production-Grade PostgreSQL Schema
-- Migration 0001: Initial Relational Foundation

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_active_idx ON users(is_active);

-- 2. Workshops
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workshops_tax_id_idx ON workshops(tax_id);
CREATE INDEX IF NOT EXISTS workshops_active_idx ON workshops(is_active);

-- 3. Workshop Members
CREATE TABLE IF NOT EXISTS workshop_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workshop_user_membership_uidx UNIQUE(workshop_id, user_id)
);
CREATE INDEX IF NOT EXISTS workshop_members_user_idx ON workshop_members(user_id);
CREATE INDEX IF NOT EXISTS workshop_members_workshop_idx ON workshop_members(workshop_id);

-- 4. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_workshop_idx ON sessions(active_workshop_id);
CREATE INDEX IF NOT EXISTS sessions_expires_revoked_idx ON sessions(expires_at, is_revoked);

-- 5. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pwd_reset_token_hash_idx ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS pwd_reset_user_idx ON password_reset_tokens(user_id);

-- 6. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin VARCHAR(17) NOT NULL UNIQUE,
    plate VARCHAR(20),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    engine VARCHAR(100),
    fuel_type VARCHAR(50),
    current_mileage INTEGER NOT NULL DEFAULT 0 CHECK (current_mileage >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vehicles_plate_idx ON vehicles(plate);
CREATE INDEX IF NOT EXISTS vehicles_make_model_idx ON vehicles(make, model);

-- 7. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    document_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customers_workshop_id_idx ON customers(workshop_id);
CREATE INDEX IF NOT EXISTS customers_workshop_phone_idx ON customers(workshop_id, phone);

-- 8. Vehicle Ownerships
CREATE TABLE IF NOT EXISTS vehicle_ownerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    is_current_owner BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vehicle_ownerships_vehicle_idx ON vehicle_ownerships(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_ownerships_customer_idx ON vehicle_ownerships(customer_id);

-- 9. Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    reported_mileage INTEGER NOT NULL CHECK (reported_mileage >= 0),
    reported_issue TEXT NOT NULL,
    initial_condition TEXT,
    diagnosis TEXT,
    internal_notes TEXT,
    parts_cost NUMERIC(12, 2) DEFAULT 0,
    labor_cost NUMERIC(12, 2) DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS work_orders_workshop_idx ON work_orders(workshop_id);
CREATE INDEX IF NOT EXISTS work_orders_vehicle_idx ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS work_orders_customer_idx ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS work_orders_status_idx ON work_orders(status);
CREATE INDEX IF NOT EXISTS work_orders_workshop_status_idx ON work_orders(workshop_id, status);

-- 10. Work Order Items
CREATE TABLE IF NOT EXISTS work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    cost NUMERIC(10, 2) DEFAULT 0,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS work_order_items_wo_idx ON work_order_items(work_order_id);

-- 11. Maintenance Records (Immutable audit projection)
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    performing_workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    performing_workshop_name VARCHAR(255) NOT NULL,
    service_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_mileage INTEGER NOT NULL CHECK (recorded_mileage >= 0),
    verification_level VARCHAR(50) NOT NULL DEFAULT 'DECLARED',
    is_certified BOOLEAN NOT NULL DEFAULT FALSE,
    criteria_met JSONB DEFAULT '[]'::jsonb,
    interventions JSONB DEFAULT '[]'::jsonb,
    evidence_asset_ids JSONB DEFAULT '[]'::jsonb,
    internal_notes TEXT,
    parts_cost NUMERIC(12, 2),
    labor_cost NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS maint_records_vehicle_idx ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS maint_records_workshop_idx ON maintenance_records(performing_workshop_id);
CREATE INDEX IF NOT EXISTS maint_records_service_date_idx ON maintenance_records(service_date);

-- 12. Maintenance Corrections
CREATE TABLE IF NOT EXISTS maintenance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES maintenance_records(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    previous_data JSONB NOT NULL,
    corrected_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS maint_corrections_record_idx ON maintenance_corrections(record_id);

-- 13. Maintenance Intervals
CREATE TABLE IF NOT EXISTS maintenance_intervals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    engine VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    interval_km INTEGER,
    interval_months INTEGER,
    source_citation VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS maint_intervals_lookup_idx ON maintenance_intervals(make, model, category);

-- 14. Evidence Files
CREATE TABLE IF NOT EXISTS evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS evidence_files_workshop_idx ON evidence_files(workshop_id);
CREATE INDEX IF NOT EXISTS evidence_files_work_order_idx ON evidence_files(work_order_id);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(50),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_workshop_idx ON audit_logs(workshop_id);
CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx ON audit_logs(event_type);

-- 16. Idempotency Keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) NOT NULL,
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_code INTEGER,
    response_body JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT idempotency_key_workshop_uidx UNIQUE(key, workshop_id)
);
CREATE INDEX IF NOT EXISTS idempotency_expires_at_idx ON idempotency_keys(expires_at);

-- 17. Outbox Events
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS outbox_status_created_idx ON outbox_events(status, created_at);

-- 18. Vehicle Access Grants
CREATE TABLE IF NOT EXISTS vehicle_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    granter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    granted_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL DEFAULT 'READ_HISTORY',
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vehicle_grants_vehicle_idx ON vehicle_access_grants(vehicle_id);
