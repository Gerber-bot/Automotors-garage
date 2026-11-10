import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { z } from 'zod';
import * as schema from './schema/index.ts';

const { Pool } = pg;

export const DatabaseConfigSchema = z.object({
  connectionString: z.string().optional(),
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  user: z.string().default('postgres'),
  password: z.string().default('postgres'),
  database: z.string().default('automotors_garage'),
  ssl: z.boolean().default(false),
  maxConnections: z.number().default(20),
  idleTimeoutMillis: z.number().default(30000),
  connectionTimeoutMillis: z.number().default(5000),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export type DatabaseInstance = ReturnType<typeof drizzleNodePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

/** Confine persistent development data to this installation, even when overridden by the environment. */
export function resolveLocalPgliteDir(dataDir: string, root: string = process.cwd()): string {
  const dataRoot = path.resolve(root, '.data');
  const candidate = path.resolve(root, dataDir);
  const relative = path.relative(dataRoot, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('PG_DATA_DIR must be a directory inside this installation\'s .data');
  }
  let current = dataRoot;
  for (const segment of relative.split(path.sep)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`PGlite storage cannot traverse a linked directory: ${current}`);
    }
    current = path.join(current, segment);
  }
  if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
    throw new Error(`PGlite storage cannot traverse a linked directory: ${current}`);
  }
  return candidate;
}

/** Atomic cross-process claim. Never infer that a leftover claim is safe to remove. */
function claimPgliteDirectory(dataDir: string) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, '.automotors.lock');
  const token = randomUUID();
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(file, 'wx', 0o600);
  } catch {
    throw new Error(`[CRITICAL_DATA_PROTECTION] PGlite directory is already claimed or requires manual review: '${dataDir}'. No database was opened.`);
  }
  const preserve = () => {
    if (descriptor !== undefined) { fs.closeSync(descriptor); descriptor = undefined; }
  };
  try { fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, token }), 'utf8'); }
  catch (error) { preserve(); throw error; }
  return {
    preserve,
    release: () => {
      preserve();
      const current = JSON.parse(fs.readFileSync(file, 'utf8')) as { token?: string };
      if (current.token !== token) throw new Error('PGlite claim changed; preserve it for manual review');
      fs.unlinkSync(file);
    },
  };
}

export class DatabaseFactory {
  public static createPool(rawConfig: Partial<DatabaseConfig> = {}): pg.Pool {
    const config = DatabaseConfigSchema.parse(rawConfig);
    if (config.connectionString) {
      return new Pool({
        connectionString: config.connectionString,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        max: config.maxConnections,
        idleTimeoutMillis: config.idleTimeoutMillis,
        connectionTimeoutMillis: config.connectionTimeoutMillis,
      });
    }
    return new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    });
  }

  public static create(pool: pg.Pool) {
    return drizzleNodePg(pool, { schema });
  }

  public static isProcessUsingDatabase(dataDir: string): { isUsing: boolean; pid?: number; reason?: string } {
    try {
      // 1. Check .owner.pid
      const ownerFile = path.join(dataDir, '.owner.pid');
      if (fs.existsSync(ownerFile)) {
        const ownerPid = parseInt(fs.readFileSync(ownerFile, 'utf-8').trim(), 10);
        if (!isNaN(ownerPid) && ownerPid > 0 && ownerPid !== process.pid) {
          try {
            process.kill(ownerPid, 0);
            return { isUsing: true, pid: ownerPid, reason: 'Active process recorded in .owner.pid' };
          } catch {
            // Process is dead
          }
        }
      }

      // 2. Check .run/server.pid
      const repoRoot = path.resolve(dataDir, '..', '..');
      const serverPidFile = path.join(repoRoot, '.run', 'server.pid');
      if (fs.existsSync(serverPidFile)) {
        const sPid = parseInt(fs.readFileSync(serverPidFile, 'utf-8').trim(), 10);
        if (!isNaN(sPid) && sPid > 0 && sPid !== process.pid) {
          try {
            process.kill(sPid, 0);
            return { isUsing: true, pid: sPid, reason: 'Active server process in .run/server.pid' };
          } catch {
            // Process is dead
          }
        }
      }

      // 3. Check postmaster.pid line 1 (if positive integer PID)
      const postmasterFile = path.join(dataDir, 'postmaster.pid');
      if (fs.existsSync(postmasterFile)) {
        const content = fs.readFileSync(postmasterFile, 'utf-8');
        const firstLine = content.split('\n')[0]?.trim();
        if (firstLine && /^\d+$/.test(firstLine)) {
          const pmPid = parseInt(firstLine, 10);
          if (pmPid > 0 && pmPid !== process.pid) {
            try {
              process.kill(pmPid, 0);
              return { isUsing: true, pid: pmPid, reason: 'Active process in postmaster.pid' };
            } catch {
              // Process is dead
            }
          }
        }
      }
    } catch {
      // Non-fatal inspection fallback
    }

    return { isUsing: false };
  }

  public static async createInMemoryTestDb(dataDir?: string) {
    let claim: ReturnType<typeof claimPgliteDirectory> | undefined;
    if (dataDir) {
      const parent = path.dirname(dataDir);
      if (parent && !fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }

      claim = claimPgliteDirectory(dataDir);
      const lockFile = path.join(dataDir, 'postmaster.pid');

      if (fs.existsSync(lockFile)) {
        // This invocation has not initialized PGlite, so release only its own claim.
        claim.release();
        const check = DatabaseFactory.isProcessUsingDatabase(dataDir);
        if (check.isUsing && check.pid) {
          const errMsg = `[CRITICAL_DATA_PROTECTION] An active process (PID ${check.pid}) is currently accessing the database at '${dataDir}' (${check.reason}). Halting operation to prevent concurrent writes and data corruption.`;
          console.error(errMsg);
          throw new Error(errMsg);
        }

        throw new Error(`[CRITICAL_DATA_PROTECTION] Lock file '${lockFile}' exists without a verified owner. Preserve it and the database; inspect the instance before manual recovery.`);
      }
    }

    let pglite: PGlite;
    try {
      pglite = dataDir ? new PGlite(dataDir) : new PGlite();
      await pglite.waitReady;

      if (claim) {
        const originalClose = pglite.close.bind(pglite);
        const ownedClaim = claim;
        let closing: Promise<void> | undefined;
        pglite.close = () => closing ??= originalClose().then(() => { ownedClaim.release(); });
      }

      if (dataDir) {
        const ownerFile = path.join(dataDir, '.owner.pid');
        try {
          fs.writeFileSync(ownerFile, String(process.pid), 'utf-8');
        } catch {
          // non-fatal
        }
      }
    } catch (err: unknown) {
      // A failed engine initialization may have written files. Retain its claim;
      // do not silently retry or delete engine data/locks after an ambiguous failure.
      claim?.preserve();
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ [FAIL-SAFE HALT] Failed to initialize embedded PostgreSQL engine at '${dataDir || 'in-memory'}'.`);
      console.error(`   Diagnostic Error: ${errorMsg}`);
      console.error('   Initialization may have written database files. Preserve the directory and lock records for manual review.');
      console.error(`   Manual Recovery Steps:`);
      console.error(`   1. Ensure no other process holds locks on '${dataDir}'.`);
      console.error(`   2. Backup the directory '${dataDir}' before attempting recovery.`);
       console.error('   3. Preserve the database and lock files for manual review; do not delete data or seed as a recovery shortcut.\n');
      throw new Error(`Database initialization failed for '${dataDir || 'in-memory'}': ${errorMsg}`);
    }

    return drizzlePglite(pglite, { schema });
  }

  public static async checkHealth(db: DatabaseInstance): Promise<{ isHealthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await (db as any).execute('SELECT 1');
      return { isHealthy: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      return {
        isHealthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
