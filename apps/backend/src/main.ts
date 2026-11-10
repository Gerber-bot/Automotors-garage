import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseFactory, DatabaseMigrator, resolveLocalPgliteDir } from '@automotors/database';
import { HttpApp } from './infrastructure/http/http-app.ts';
import { startShutdownControl } from './infrastructure/process/shutdown-control.ts';
import { resolvePostgresPoolConfig } from './infrastructure/database/postgres-config.ts';

const PORT = Number(process.env.PORT || 4000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '127.0.0.1';
const pidFile = process.env.PID_FILE || './.run/server.pid';

async function bootstrap() {
  if (NODE_ENV === 'production' && HOST === '0.0.0.0' && process.env.ALLOW_PRODUCTION_LAN !== 'true') {
    console.error('❌ SECURITY ALERT: Binding to 0.0.0.0 in production is prohibited without explicit ALLOW_PRODUCTION_LAN=true.');
    process.exit(1);
  }

  console.log(`🏎️  Bootstrapping Automotors Garage Backend API [ENV: ${NODE_ENV}] [HOST: ${HOST}]...`);

  let db;
  let dataDir: string | undefined;
  let pool: ReturnType<typeof DatabaseFactory.createPool> | undefined;

  // DB_PROVIDER determines persistence strategy:
  // - 'postgres': Connects to native PostgreSQL. If connection fails, execution HALTS immediately with fatal error (no silent fallback).
  // - 'pglite': Uses embedded PGlite WASM engine (default in development/demo environments).
  // - In production (NODE_ENV === 'production'): Always enforces 'postgres'.
  const rawProvider = (process.env.DB_PROVIDER || (NODE_ENV === 'production' ? 'postgres' : 'pglite')).toLowerCase();
  if (!['postgres', 'postgresql', 'pglite'].includes(rawProvider)) {
    throw new Error(`Unsupported DB_PROVIDER '${rawProvider}'`);
  }
  const dbProvider = rawProvider === 'postgres' || rawProvider === 'postgresql' ? 'postgres' : 'pglite';
  if (NODE_ENV === 'production' && dbProvider !== 'postgres') {
    throw new Error('Production requires PostgreSQL; DB_PROVIDER=pglite is forbidden');
  }

  if (dbProvider === 'postgres') {
    const poolConfig = resolvePostgresPoolConfig(process.env, NODE_ENV);

    try {
      pool = DatabaseFactory.createPool(poolConfig);
      db = DatabaseFactory.create(pool);
      const status = await DatabaseMigrator.status(db);
      if (!status.ready) throw new Error(`Pending migrations: ${status.pending.join(', ')}. Run npm run db:apply first.`);
      console.log('✅ Connected to native PostgreSQL; migration ledger is current.');
    } catch (err: unknown) {
      if (pool && typeof pool.end === 'function') {
        try {
          await pool.end();
        } catch {
          // non-fatal
        }
      }
      console.error('❌ [FATAL] Database connection to PostgreSQL failed:', err instanceof Error ? err.message : String(err));
      console.error('   DB_PROVIDER is set to postgres (or running in production mode).');
      console.error('   Silent fallback to PGlite is prohibited to guarantee persistence integrity.');
      process.exit(1);
    }
  } else {
    // PGlite embedded mode for frictionless local development
    const defaultDataDir = NODE_ENV === 'demo' ? './.data/postgres_demo' : './.data/postgres_dev';
    dataDir = resolveLocalPgliteDir(process.env.PG_DATA_DIR || defaultDataDir);
    if (!fs.existsSync(dataDir)) {
      throw new Error(`PGlite database '${dataDir}' is not prepared. Run npm run db:apply first.`);
    }
    db = await DatabaseFactory.createInMemoryTestDb(dataDir);
    try {
      const status = await DatabaseMigrator.status(db);
      if (!status.ready) throw new Error(`Pending migrations: ${status.pending.join(', ')}. Run npm run db:apply first.`);
    } catch (error) {
      await db.$client.close();
      const ownerFile = path.join(dataDir, '.owner.pid');
      if (fs.existsSync(ownerFile) && fs.readFileSync(ownerFile, 'utf8').trim() === String(process.pid)) {
        fs.unlinkSync(ownerFile);
      }
      throw error;
    }
    console.log(`✅ Connected to embedded PGlite engine at '${dataDir}'; migration ledger is current.`);
  }

  const app = new HttpApp({ db });
  const server = app.createServer();
  let disposeShutdownControl: (() => Promise<void>) | undefined;
  let stopping = false;

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another process.`);
    } else {
      console.error('❌ Server startup error:', err);
    }
    process.exitCode = 1;
  });

  const gracefulShutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log('\n🛑 Received shutdown request. Closing server...');
    try {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
      if (pool) await pool.end();
      else await (db as { $client?: { close?: () => Promise<void> } }).$client?.close?.();
      if (disposeShutdownControl) await disposeShutdownControl();

      if (fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8').trim() === String(process.pid)) {
        fs.unlinkSync(pidFile);
      }
      if (dataDir) {
        const ownerFile = path.join(dataDir, '.owner.pid');
        if (fs.existsSync(ownerFile) && fs.readFileSync(ownerFile, 'utf8').trim() === String(process.pid)) {
          fs.unlinkSync(ownerFile);
        }
      }
      console.log('✅ Server and database connections closed cleanly.');
    } catch (error) {
      stopping = false;
      process.exitCode = 1;
      console.error('Graceful shutdown failed; process identity was retained for review:', error);
      throw error;
    }
  };

  process.on('SIGINT', () => { void gracefulShutdown().catch(() => {}); });
  process.on('SIGTERM', () => { void gracefulShutdown().catch(() => {}); });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, resolve);
  });

  try {
    if (process.env.AUTOMOTORS_MANAGED_START === 'true' && NODE_ENV !== 'production') {
      const controlFile = path.join(process.cwd(), '.run/backend.control.json');
      fs.mkdirSync(path.dirname(controlFile), { recursive: true });
      disposeShutdownControl = await startShutdownControl(controlFile, gracefulShutdown);
    }

    // Record PID for clean process management
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
    fs.writeFileSync(pidFile, String(process.pid), 'utf-8');

    if (HOST === '0.0.0.0') {
      console.log(`🚀 Automotors Garage API listening on 0.0.0.0:${PORT} [LAN ACCESS ENABLED]`);
      console.log(`📋 Health check (Local): http://127.0.0.1:${PORT}/health/live`);
    } else {
      console.log(`🚀 Automotors Garage API listening on http://${HOST}:${PORT} [LOOPBACK ONLY]`);
      console.log(`📋 Health check: http://${HOST}:${PORT}/health/live`);
    }
  } catch (error) {
    await gracefulShutdown().catch(() => {});
    throw error;
  }
}

bootstrap().catch((err) => {
  console.error('❌ Fatal error starting Automotors Garage Backend:', err);
  process.exit(1);
});
