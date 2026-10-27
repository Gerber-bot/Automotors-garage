import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { DatabaseFactory, DatabaseMigrator } from '../src/index.ts';
import { vehicles, workOrders } from '../src/schema/index.ts';

describe('Database Foundation & Relational Schema Test Suite', () => {
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
});
