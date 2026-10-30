-- =============================================================================
-- AUTOMOTORS GARAGE: Milestone 14.1 Vehicle Knowledge Base
-- Migration 0003 Down (Rollback): Revert Vehicle Knowledge Base Tables & Column
-- =============================================================================
-- ⚠️ WARNING — DESTRUCTIVE ROLLBACK MIGRATION:
-- This script permanently drops the `configuration_id` column on `vehicles`
-- and drops all 8 `kb_*` catalog tables (`CASCADE`), destroying all stored
-- technical configurations, specifications, document sources, and rule history.
--
-- HARD INVARIANT:
-- 1. This script is NOT included in `DatabaseMigrator.MIGRATION_FILES` and
--    MUST NEVER be executed automatically on persistent or production databases.
-- 2. It is intended ONLY for isolated, ephemeral test sandboxes to verify
--    schema reversibility or for manual disaster recovery under DBA supervision
--    after a verified full backup.
-- =============================================================================

-- 1. Remove column from vehicles table
ALTER TABLE vehicles DROP COLUMN IF EXISTS configuration_id;

-- 2. Drop Knowledge Base tables in reverse dependency order
DROP TABLE IF EXISTS kb_maintenance_rules CASCADE;
DROP TABLE IF EXISTS kb_technical_specs CASCADE;
DROP TABLE IF EXISTS kb_configurations CASCADE;
DROP TABLE IF EXISTS kb_document_sources CASCADE;
DROP TABLE IF EXISTS kb_powertrains CASCADE;
DROP TABLE IF EXISTS kb_generations CASCADE;
DROP TABLE IF EXISTS kb_models CASCADE;
DROP TABLE IF EXISTS kb_manufacturers CASCADE;
