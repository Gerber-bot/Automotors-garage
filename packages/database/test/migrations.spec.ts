import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseFactory, DatabaseMigrator, resolveLocalPgliteDir } from '../src/index.ts';

async function isolated(test: (db: Awaited<ReturnType<typeof DatabaseFactory.createInMemoryTestDb>>) => Promise<void>): Promise<void> {
  const db = await DatabaseFactory.createInMemoryTestDb();
  try {
    await test(db);
  } finally {
    await db.$client.close();
  }
}

describe('checked migration lifecycle (isolated in-memory PGlite)', () => {
  it('refuses a development data directory outside this installation', () => {
    assert.throws(() => resolveLocalPgliteDir('../other-installation/.data/db'), /inside this installation/);
    assert.equal(resolveLocalPgliteDir('./.data/postgres_dev'), resolve('.data/postgres_dev'));
  });
  it('reports a new database as pending without creating a ledger or schema', async () => isolated(async (db) => {
    const status = await DatabaseMigrator.status(db);
    assert.equal(status.applied.length, 0);
    assert.equal(status.pending.length, 4);
    assert.equal(status.ready, false);
    const result = await db.$client.query<{ ledger: string | null }>("SELECT to_regclass('public.schema_migrations') AS ledger");
    assert.equal(result.rows[0]?.ledger, null);
  }));

  it('explicitly applies files with checksums and repeats without changes', async () => isolated(async (db) => {
    const first = await DatabaseMigrator.apply(db);
    assert.equal(first.ready, true);
    assert.equal(first.applied.length, 4);
    const before = await db.$client.query<{ name: string; checksum: string; applied_at: string }>('SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name');
    assert.equal(before.rows.length, 4);
    for (const row of before.rows) assert.match(row.checksum, /^[a-f0-9]{64}$/);
    const again = await DatabaseMigrator.apply(db);
    assert.deepEqual(again, first);
    const after = await db.$client.query<{ name: string; checksum: string; applied_at: string }>('SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name');
    assert.deepEqual(after.rows, before.rows);
  }));

  it('rejects a changed checksum on both status and apply', async () => isolated(async (db) => {
    await DatabaseMigrator.apply(db);
    await db.$client.query("UPDATE schema_migrations SET checksum = repeat('0', 64) WHERE name = '0001_initial_schema.sql'");
    await assert.rejects(DatabaseMigrator.status(db), /checksum mismatch: 0001_initial_schema.sql/);
    await assert.rejects(DatabaseMigrator.apply(db), /checksum mismatch: 0001_initial_schema.sql/);
  }));

  it('refuses startup readiness if the recorded permission schema is missing', async () => isolated(async (db) => {
    await DatabaseMigrator.apply(db);
    await db.$client.query('ALTER TABLE workshop_members DROP COLUMN permissions');
    await assert.rejects(DatabaseMigrator.status(db), /permission schema is missing/);
  }));

  it('hashes CRLF and LF checkouts identically but rejects substantive SQL edits', async () => isolated(async (db) => {
    const name = '0001_portable.sql';
    const lf = 'CREATE TABLE portable (id integer);\n-- checkout comment\n';
    const crlf = lf.replace(/\n/g, '\r\n');
    await DatabaseMigrator.apply(db, [{ name, sql: crlf }]);
    assert.equal((await DatabaseMigrator.status(db, [{ name, sql: lf }])).ready, true);
    await assert.rejects(
      DatabaseMigrator.status(db, [{ name, sql: lf.replace('id integer', 'id bigint') }]),
      /checksum mismatch/
    );
  }));

  it('rolls back failed SQL and its ledger entry while preserving earlier files', async () => isolated(async (db) => {
    const fixtures = [
      { name: '0001_test.sql', sql: 'CREATE TABLE first_file (id integer);' },
      { name: '0002_test.sql', sql: 'CREATE TABLE rolled_back (id integer); INSERT INTO missing_table VALUES (1);' },
    ];
    await assert.rejects(DatabaseMigrator.apply(db, fixtures), /0002_test.sql.*rolled back/);
    const status = await DatabaseMigrator.status(db, fixtures);
    assert.deepEqual(status.applied, ['0001_test.sql']);
    assert.deepEqual(status.pending, ['0002_test.sql']);
    const result = await db.$client.query<{ rolled_back: string | null }>("SELECT to_regclass('public.rolled_back') AS rolled_back");
    assert.equal(result.rows[0]?.rolled_back, null);
  }));

  it('refuses a legacy schema without a ledger rather than assuming it is empty', async () => isolated(async (db) => {
    await DatabaseMigrator.runMigrations(db);
    await assert.rejects(DatabaseMigrator.status(db), /Untracked existing schema/);
    await assert.rejects(DatabaseMigrator.apply(db), /Untracked existing schema/);
    const result = await db.$client.query<{ ledger: string | null }>("SELECT to_regclass('public.schema_migrations') AS ledger");
    assert.equal(result.rows[0]?.ledger, null);
  }));

  it('refuses even a legitimate legacy schema while adoption is disabled, regardless of acknowledgment', async () => isolated(async (db) => {
    await DatabaseMigrator.runMigrations(db);
    await assert.rejects(DatabaseMigrator.adoptVerified(db, ''), /adoption is disabled/);
    await assert.rejects(DatabaseMigrator.adoptVerified(db, 'I_VERIFIED_SCHEMA_AND_BACKUP'), /adoption is disabled/);
    const result = await db.$client.query<{ ledger: string | null }>("SELECT to_regclass('public.schema_migrations') AS ledger");
    assert.equal(result.rows[0]?.ledger, null);
  }));

  it('rejects adoption when legacy columns differ from the expected schema', async () => isolated(async (db) => {
    await DatabaseMigrator.runMigrations(db);
    await db.$client.query('ALTER TABLE users ADD COLUMN unverified text');
    await assert.rejects(DatabaseMigrator.adoptVerified(db, 'I_VERIFIED_SCHEMA_AND_BACKUP'), /adoption is disabled/);
    const result = await db.$client.query<{ ledger: string | null }>("SELECT to_regclass('public.schema_migrations') AS ledger");
    assert.equal(result.rows[0]?.ledger, null);
  }));

  const alteredSchemas = [
    ['unexpected table', 'CREATE TABLE unreviewed_table (id integer)'],
    ['unexpected column', 'ALTER TABLE users ADD COLUMN unreviewed_column text'],
    ['changed type', 'ALTER TABLE users ALTER COLUMN full_name TYPE text'],
    ['unexpected function', "CREATE FUNCTION public.unreviewed_function() RETURNS integer LANGUAGE sql AS 'SELECT 1'"],
    ['unexpected trigger', `CREATE FUNCTION public.unreviewed_trigger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NULL; END;$$;
      CREATE TRIGGER unreviewed_insert BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.unreviewed_trigger()`],
    ['changed constraint', 'ALTER TABLE workshop_members DROP CONSTRAINT workshop_user_membership_uidx; ALTER TABLE workshop_members ADD CONSTRAINT workshop_user_membership_uidx UNIQUE (workshop_id, user_id, role)'],
    ['changed index', 'DROP INDEX users_active_idx; CREATE INDEX users_active_idx ON users (email)'],
    ['incompatible schema', 'DROP TABLE workshop_members'],
    ['unexpected schema and type', "CREATE SCHEMA unreviewed; CREATE TYPE unreviewed.state AS ENUM ('pending')"],
    ['unexpected row policy', 'ALTER TABLE users ENABLE ROW LEVEL SECURITY; CREATE POLICY unreviewed_policy ON users USING (false)'],
  ];
  for (const [name, alteration] of alteredSchemas) {
    it(`rejects ${name} without adopting or changing the legacy database`, async () => isolated(async (db) => {
      await DatabaseMigrator.runMigrations(db);
      await db.$client.exec(alteration!);
      const catalog = `SELECT oid, relname, relkind FROM pg_class WHERE relnamespace IN
        (SELECT oid FROM pg_namespace WHERE nspname IN ('public', 'unreviewed')) ORDER BY oid`;
      const before = await db.$client.query(catalog);
      await assert.rejects(DatabaseMigrator.adoptVerified(db, 'I_VERIFIED_SCHEMA_AND_BACKUP'), /adoption is disabled/);
      assert.deepEqual((await db.$client.query(catalog)).rows, before.rows);
      const ledger = await db.$client.query<{ ledger: string | null }>("SELECT to_regclass('public.schema_migrations') AS ledger");
      assert.equal(ledger.rows[0]?.ledger, null);
    }));
  }

  it('rejects adoption at the CLI before provider validation or connection attempts', () => {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'Scripts de ejecucion automatica/database/migrations.ts', 'adopt'], {
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, DB_PROVIDER: 'untrusted-provider', MIGRATION_ADOPTION_ACK: 'I_VERIFIED_SCHEMA_AND_BACKUP' },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /adoption is disabled.*No database was opened/);
    assert.doesNotMatch(result.stderr, /Unsupported DB_PROVIDER/);
  });

  it('serializes simultaneous PGlite apply calls', async () => isolated(async (db) => {
    const [a, b] = await Promise.all([DatabaseMigrator.apply(db), DatabaseMigrator.apply(db)]);
    assert.equal(a.ready, true);
    assert.equal(b.ready, true);
    const result = await db.$client.query<{ total: number }>('SELECT count(*)::integer AS total FROM schema_migrations');
    assert.equal(result.rows[0]?.total, 4);
  }));
});
