import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { sql as drizzleSql } from 'drizzle-orm';
import { type DatabaseInstance } from './client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILES = [
  '0001_initial_schema.sql',
  '0002_owner_portal.sql',
  '0003_vehicle_knowledge_base.sql',
  '0004_workshop_permissions.sql',
];

export type MigrationSource = { name: string; sql: string };
export type MigrationStatus = { applied: string[]; pending: string[]; ready: boolean };

type Executor = { execute: (query: ReturnType<typeof drizzleSql.raw>) => Promise<unknown> };

function rows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  throw new Error('Unexpected migration query result');
}

function migrationSources(): MigrationSource[] {
  return MIGRATION_FILES.map((name) => ({
    name,
    sql: readFileSync(resolve(__dirname, 'migrations', name), 'utf8'),
  }));
}

/** SHA-256 of UTF-8 SQL with CRLF normalized to LF; all other bytes remain significant. */
function checksumFor(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function validateSources(sources: readonly MigrationSource[]): void {
  if (new Set(sources.map((source) => source.name)).size !== sources.length ||
      sources.some((source) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(source.name))) {
    throw new Error('Migration names must be unique, numbered SQL files');
  }
}

async function inspect(executor: Executor, sources: readonly MigrationSource[]): Promise<MigrationStatus> {
  const objects = rows(await executor.execute(drizzleSql.raw(`
    SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
    UNION ALL
    SELECT p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  `)));
  const hasLedger = objects.some((object) => object.name === 'schema_migrations');
  if (!hasLedger && objects.length > 0) {
    throw new Error('Untracked existing schema: verify it and adopt migrations manually before applying');
  }
  const recorded = hasLedger
    ? rows(await executor.execute(drizzleSql.raw('SELECT name, checksum FROM public.schema_migrations ORDER BY name')))
    : [];
  if (recorded.length > sources.length) throw new Error('Migration ledger has unknown entries');
  for (let i = 0; i < recorded.length; i++) {
    const expected = sources[i];
    const entry = recorded[i];
    if (!expected || !entry || entry.name !== expected.name) {
      throw new Error(`Migration ledger is out of order or contains an unknown entry: ${String(entry?.name)}`);
    }
    const checksum = checksumFor(expected.sql);
    if (entry.checksum !== checksum) throw new Error(`Migration checksum mismatch: ${expected.name}`);
  }
  const applied = sources.slice(0, recorded.length).map((source) => source.name);
  const pending = sources.slice(recorded.length).map((source) => source.name);
  return { applied, pending, ready: pending.length === 0 };
}


export class DatabaseMigrator {
  /** Reads schema and ledger without creating a ledger or applying migrations. */
  public static async status(db: DatabaseInstance, sources: readonly MigrationSource[] = migrationSources()): Promise<MigrationStatus> {
    validateSources(sources);
    const executor = db as unknown as Executor;
    const status = await inspect(executor, sources);
    if (status.ready && sources.length === MIGRATION_FILES.length && sources.every((source, index) => source.name === MIGRATION_FILES[index])) {
      const requiredTables = [
        'users', 'workshops', 'workshop_members', 'sessions', 'vehicles',
        'maintenance_records', 'vehicle_access_grants', 'kb_maintenance_rules',
      ];
      const result = rows(await executor.execute(drizzleSql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN (${drizzleSql.join(requiredTables.map((name) => drizzleSql`${name}`), drizzleSql`, `)})
      `));
      if (result.length !== requiredTables.length) throw new Error('Migration ledger is current but required tables are missing');
      const permissionColumn = rows(await executor.execute(drizzleSql.raw(`
        SELECT udt_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workshop_members' AND column_name = 'permissions'
      `)));
      if (permissionColumn.length !== 1 || permissionColumn[0]?.udt_name !== '_text') {
        throw new Error('Migration ledger is current but workshop permission schema is missing or incompatible');
      }
    }
    return status;
  }

  /** Explicit operator action. Every migration and its ledger entry commit atomically. */
  public static async apply(db: DatabaseInstance, sources: readonly MigrationSource[] = migrationSources()): Promise<MigrationStatus> {
    validateSources(sources);
    const database = db as unknown as {
      $client: unknown;
      transaction: <T>(callback: (tx: Executor) => Promise<T>) => Promise<T>;
    };
    // PGlite serializes transactions on its single connection. PostgreSQL needs a
    // transaction-scoped advisory lock shared by every migration runner.
    for (const source of sources) {
      await database.transaction(async (tx) => {
        if (!(database.$client instanceof PGlite)) {
          await tx.execute(drizzleSql.raw('SELECT pg_advisory_xact_lock(16223001)'));
        }
        const current = await inspect(tx, sources);
        if (!current.pending.length || current.pending[0] !== source.name) return;
        await tx.execute(drizzleSql.raw(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
          name text PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
        )`));
        try {
          for (const statement of source.sql.split(';').map((part) => part.trim()).filter(Boolean)) {
            await tx.execute(drizzleSql.raw(statement));
          }
          const checksum = checksumFor(source.sql);
          await tx.execute(drizzleSql`INSERT INTO public.schema_migrations (name, checksum) VALUES (${source.name}, ${checksum})`);
        } catch (error) {
          throw new Error(`Migration '${source.name}' failed and was rolled back: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
    return DatabaseMigrator.status(db, sources);
  }

  /** Disabled until schema equivalence includes executable objects, policies and privileges. */
  public static async adoptVerified(_db: DatabaseInstance, _acknowledgment: string): Promise<MigrationStatus> {
    throw new Error('Legacy adoption is disabled: complete schema equivalence has not been verified. Preserve the database and request manual review.');
  }

  public static async runMigrations(
    db: DatabaseInstance,
    migrationFiles: readonly string[] = MIGRATION_FILES
  ): Promise<void> {
    for (const file of migrationFiles) {
      const migrationPath = resolve(__dirname, 'migrations', file);
      const sql = readFileSync(migrationPath, 'utf8');
      await DatabaseMigrator.executeMigrationSql(db, sql, file);
    }
  }

  public static async executeMigrationSql(
    db: DatabaseInstance,
    sql: string,
    migrationName: string = 'inline_migration.sql'
  ): Promise<void> {
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      // Drizzle binds the entire callback to one client, including on pg.Pool.
      const transactionalDb = db as unknown as {
        transaction: (callback: (tx: { execute: (query: string) => Promise<unknown> }) => Promise<void>) => Promise<void>;
      };
      await transactionalDb.transaction(async (tx) => {
        for (const statement of statements) {
          await tx.execute(statement);
        }
      });
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration '${migrationName}' failed and was rolled back: ${reason}`);
    }
  }
}
