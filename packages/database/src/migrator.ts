import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseInstance } from './client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILES = [
  '0001_initial_schema.sql',
  '0002_owner_portal.sql',
];

export class DatabaseMigrator {
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

    await (db as any).execute('BEGIN');
    try {
      for (const statement of statements) {
        await (db as any).execute(statement);
      }
      await (db as any).execute('COMMIT');
    } catch (err: unknown) {
      try {
        await (db as any).execute('ROLLBACK');
      } catch {
        // Ignore rollback error if transaction already aborted
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration '${migrationName}' failed and was rolled back: ${reason}`);
    }
  }
}
