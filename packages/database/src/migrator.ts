import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseInstance } from './client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseMigrator {
  public static async runMigrations(db: DatabaseInstance): Promise<void> {
    const migrationPath = resolve(__dirname, 'migrations', '0001_initial_schema.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    // Split SQL into executable statements
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await (db as any).execute(statement);
    }
  }
}
