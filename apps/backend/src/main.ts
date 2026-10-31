import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseFactory, DatabaseMigrator } from '@automotors/database';
import { HttpApp } from './infrastructure/http/http-app.ts';

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
  let pool: any;

  // DB_PROVIDER determines persistence strategy:
  // - 'postgres': Connects to native PostgreSQL. If connection fails, execution HALTS immediately with fatal error (no silent fallback).
  // - 'pglite': Uses embedded PGlite WASM engine (default in development/demo environments).
  // - In production (NODE_ENV === 'production'): Always enforces 'postgres'.
  const rawProvider = (process.env.DB_PROVIDER || (NODE_ENV === 'production' ? 'postgres' : 'pglite')).toLowerCase();
  const dbProvider = rawProvider === 'postgres' || rawProvider === 'postgresql' ? 'postgres' : 'pglite';

  if (dbProvider === 'postgres') {
    const poolConfig = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST || 'localhost',
          port: Number(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || 5432),
          user: process.env.DATABASE_USER || process.env.POSTGRES_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
          database: process.env.DATABASE_NAME || process.env.POSTGRES_DB || 'automotors_garage',
        };

    try {
      pool = DatabaseFactory.createPool(poolConfig);
      db = DatabaseFactory.create(pool);
      await DatabaseMigrator.runMigrations(db);
      console.log('✅ Connected to native PostgreSQL and applied migrations successfully.');
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
    dataDir = process.env.PG_DATA_DIR || defaultDataDir;
    db = await DatabaseFactory.createInMemoryTestDb(dataDir);
    await DatabaseMigrator.runMigrations(db);
    console.log(`✅ Initialized embedded PGlite engine at '${dataDir}' and applied schema.`);
  }

  const app = new HttpApp({ db });
  const server = app.createServer();

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another process.`);
    } else {
      console.error('❌ Server startup error:', err);
    }
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    // Record PID for clean process management
    try {
      fs.mkdirSync(path.dirname(pidFile), { recursive: true });
      fs.writeFileSync(pidFile, String(process.pid), 'utf-8');
    } catch {
      // non-fatal
    }

    if (HOST === '0.0.0.0') {
      console.log(`🚀 Automotors Garage API listening on 0.0.0.0:${PORT} [LAN ACCESS ENABLED]`);
      console.log(`📋 Health check (Local): http://127.0.0.1:${PORT}/health/live`);
    } else {
      console.log(`🚀 Automotors Garage API listening on http://${HOST}:${PORT} [LOOPBACK ONLY]`);
      console.log(`📋 Health check: http://${HOST}:${PORT}/health/live`);
    }
  });

  const gracefulShutdown = async () => {
    console.log('\n🛑 Received shutdown signal. Closing server...');
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
      if (dataDir) {
        const ownerFile = path.join(dataDir, '.owner.pid');
        if (fs.existsSync(ownerFile)) {
          fs.unlinkSync(ownerFile);
        }
      }
    } catch {
      // non-fatal
    }

    try {
      const client = (db as any)?.$client || (db as any)?.session?.client;
      if (client?.close) {
        await client.close();
        console.log('✅ Database connections closed cleanly.');
      }
    } catch {
      // non-fatal
    }

    server.close(() => {
      console.log('✅ Server and sockets closed cleanly.');
      process.exit(0);
    });

    // Timeout fallback after 5 seconds
    setTimeout(() => {
      process.exit(0);
    }, 5000).unref();
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

bootstrap().catch((err) => {
  console.error('❌ Fatal error starting Automotors Garage Backend:', err);
  process.exit(1);
});
