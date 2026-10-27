import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { z } from 'zod';
import * as schema from './schema/index.ts';

const { Pool } = pg;

export const DatabaseConfigSchema = z.object({
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

export class DatabaseFactory {
  public static createPool(rawConfig: Partial<DatabaseConfig> = {}): pg.Pool {
    const config = DatabaseConfigSchema.parse(rawConfig);
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

  public static async createInMemoryTestDb(dataDir?: string) {
    if (dataDir) {
      const fs = await import('node:fs');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pglite = dataDir ? new PGlite(dataDir) : new PGlite();
    await pglite.waitReady;
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
