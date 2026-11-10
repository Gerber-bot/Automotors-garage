import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseFactory, DatabaseMigrator } from '@automotors/database';
import { resolveDemoSeedTarget } from '../../../packages/database/src/demo-seed-target.ts';
import { DemoSeeder } from '../src/infrastructure/database/demo-seed.ts';

describe('explicit local demo seeding', () => {
  const base = { NODE_ENV: 'test', DB_PROVIDER: 'pglite', DEMO_SEED_ACK: 'I_CONFIRM_DISPOSABLE_LOCAL_DATA', PG_DATA_DIR: './.data/disposable-seed-fixture' };
  it('accepts only an explicitly acknowledged installation-owned path', () => {
    assert.equal(resolveDemoSeedTarget(base), resolve(base.PG_DATA_DIR));
    assert.throws(() => resolveDemoSeedTarget({ ...base, DEMO_SEED_ACK: '' }), /requires DEMO_SEED_ACK/);
    assert.throws(() => resolveDemoSeedTarget({ ...base, PG_DATA_DIR: '' }), /explicit PG_DATA_DIR/);
    assert.throws(() => resolveDemoSeedTarget({ ...base, PG_DATA_DIR: '../another-installation' }), /inside this installation/);
  });
  it('rejects production and every external database provider', () => {
    assert.throws(() => resolveDemoSeedTarget({ ...base, NODE_ENV: 'production' }), /restricted/);
    for (const provider of ['postgres', 'postgresql', 'unknown']) {
      assert.throws(() => resolveDemoSeedTarget({ ...base, DB_PROVIDER: provider }), /external database connections are disabled/);
    }
  });
  it('CLI rejects an external target before a connection can be opened', () => {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'Scripts de ejecucion automatica/database/seed-demo.ts'], {
      encoding: 'utf8', timeout: 15000, env: { ...process.env, ...base, DB_PROVIDER: 'postgres', DATABASE_URL: 'postgresql://invalid@127.0.0.1:1/never-connect' },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /external database connections are disabled/);
    assert.doesNotMatch(result.stderr, /ECONNREFUSED/);
  });
  it('seeds twice without duplicates in a fresh in-memory PGlite database', async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    try {
      await DatabaseMigrator.apply(db);
      const seeder = new DemoSeeder(db);
      const first = await seeder.seed();
      const tables = ['users', 'workshops', 'vehicles', 'work_orders', 'maintenance_records'];
      const count = async () => Promise.all(tables.map(async (table) => (await db.$client.query(`SELECT count(*)::integer AS total FROM ${table}`)).rows));
      const before = await count();
      const second = await seeder.seed();
      assert.deepEqual(await count(), before);
      assert.deepEqual(second, first);
    } finally { await db.$client.close(); }
  });
});
