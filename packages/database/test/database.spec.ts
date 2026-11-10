import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { DatabaseFactory, DatabaseMigrator } from '../src/index.ts';
import { vehicles, workOrders } from '../src/schema/index.ts';

describe('Database Foundation & Relational Schema Test Suite', () => {
  it('rolls back all statements in a failed migration file', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await assert.rejects(
      DatabaseMigrator.executeMigrationSql(
        db,
        'CREATE TABLE migration_probe (id integer); INSERT INTO migration_probe VALUES (1); INSERT INTO missing_table VALUES (2);',
        'rollback_probe.sql'
      ),
      /rollback_probe.sql/
    );
    const client = (db as any).$client;
    const result = await client.query("SELECT to_regclass('public.migration_probe') AS table_name");
    assert.equal(result.rows[0].table_name, null);
  });

  it('1. Initializes in-memory PostgreSQL engine and runs initial schema migration', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    const health = await DatabaseFactory.checkHealth(db);
    assert.equal(health.isHealthy, true);
    assert.ok(health.latencyMs >= 0);
  });

  it('2. Enforces foreign key constraints and prevents orphaned child records', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    const nonExistentWorkshopId = '11111111-1111-1111-1111-111111111111';
    const nonExistentVehicleId = '22222222-2222-2222-2222-222222222222';
    const nonExistentCustomerId = '33333333-3333-3333-3333-333333333333';

    // Inserting a work order referencing non-existent workshop must fail foreign key check
    await assert.rejects(async () => {
      await db.insert(workOrders).values({
        workshopId: nonExistentWorkshopId,
        vehicleId: nonExistentVehicleId,
        customerId: nonExistentCustomerId,
        reportedMileage: 50000,
        reportedIssue: 'Broken brakes',
      });
    });
  });

  it('3. Enforces unique constraint on VIN and rejects duplicates', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    const vin = '1HGCR2F83HA000001';

    await db.insert(vehicles).values({
      vin,
      plate: 'AA123BB',
      make: 'Honda',
      model: 'Accord',
      year: 2017,
      currentMileage: 85000,
    });

    // Attempting to insert identical VIN must be rejected by unique constraint
    await assert.rejects(async () => {
      await db.insert(vehicles).values({
        vin,
        plate: 'CC999DD',
        make: 'Honda',
        model: 'Accord Duplicate',
        year: 2017,
        currentMileage: 90000,
      });
    });
  });

  it('4. Enforces check constraint preventing negative odometers', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    await assert.rejects(async () => {
      await db.insert(vehicles).values({
        vin: '1HGCR2F83HA000002',
        plate: 'NEG001',
        make: 'Fiat',
        model: 'Cronos',
        year: 2021,
        currentMileage: -50,
      });
    });
  });

  it('5. Verifies all 26 relational tables and schema integrity across migrations 0001, 0002 and 0003', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    const client = (db as any).$client;
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tableNames = res.rows.map((r: any) => r.table_name);
    const expectedTables = [
      'audit_logs',
      'customers',
      'evidence_files',
      'idempotency_keys',
      'kb_configurations',
      'kb_document_sources',
      'kb_generations',
      'kb_maintenance_rules',
      'kb_manufacturers',
      'kb_models',
      'kb_powertrains',
      'kb_technical_specs',
      'maintenance_corrections',
      'maintenance_intervals',
      'maintenance_records',
      'outbox_events',
      'password_reset_tokens',
      'sessions',
      'users',
      'vehicle_access_grants',
      'vehicle_ownerships',
      'vehicles',
      'work_order_items',
      'work_orders',
      'workshop_members',
      'workshops',
    ];

    for (const expected of expectedTables) {
      assert.ok(
        tableNames.includes(expected),
        `Table '${expected}' must exist in public schema after all migrations`
      );
    }
    assert.equal(tableNames.length, expectedTables.length);
  });

  it('6. Executes atomic transactions and verifies clean rollback on error', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    const client = (db as any).$client;
    await client.query(`
      INSERT INTO users (id, email, password_hash, full_name)
      VALUES ('00000000-0000-4000-8000-000000000001', 'committed@test.com', 'hash', 'Committed User')
    `);

    // Verify rollback reverts changes
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO users (id, email, password_hash, full_name)
        VALUES ('00000000-0000-4000-8000-000000000002', 'rollback@test.com', 'hash', 'Rollback User')
      `);
      throw new Error('Simulated failure during transaction');
    } catch {
      await client.query('ROLLBACK');
    }

    const check1 = await client.query(`SELECT email FROM users WHERE email = 'committed@test.com'`);
    assert.equal(check1.rows.length, 1);

    const check2 = await client.query(`SELECT email FROM users WHERE email = 'rollback@test.com'`);
    assert.equal(check2.rows.length, 0, 'Rolled-back record must not exist in table');
  });

  it('7. Enforces foreign key constraints and cascades across relational entities', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    const client = (db as any).$client;
    // Insert manufacturer
    const mfgRes = await client.query(`
      INSERT INTO kb_manufacturers (name, country)
      VALUES ('Toyota', 'Japan')
      RETURNING id
    `);
    const mfgId = mfgRes.rows[0].id;

    // Insert model referencing manufacturer
    const mdlRes = await client.query(`
      INSERT INTO kb_models (manufacturer_id, name)
      VALUES ('${mfgId}', 'Corolla')
      RETURNING id
    `);
    const mdlId = mdlRes.rows[0].id;
    assert.ok(mdlId);

    // Delete manufacturer must CASCADE to model
    await client.query(`DELETE FROM kb_manufacturers WHERE id = '${mfgId}'`);
    const checkModels = await client.query(`SELECT id FROM kb_models WHERE id = '${mdlId}'`);
    assert.equal(checkModels.rows.length, 0, 'Cascaded model must be deleted');
  });

  it('8. Validates PostgreSQL connection pool configuration and health check error reporting', async () => {
    // Validates config parsing
    const deadPool = DatabaseFactory.createPool({
      host: '127.0.0.1',
      port: 54399, // Unused port
      user: 'postgres',
      password: 'wrong_password',
      database: 'non_existent_db',
      connectionTimeoutMillis: 500,
    });
    const deadDb = DatabaseFactory.create(deadPool);

    const health = await DatabaseFactory.checkHealth(deadDb);
    assert.equal(health.isHealthy, false);
    assert.ok(health.error);

    await deadPool.end();
  });
});
