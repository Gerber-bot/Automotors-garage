import { DatabaseFactory, DatabaseMigrator } from '@automotors/database';
import { HttpApp } from './infrastructure/http/http-app.ts';

const PORT = Number(process.env.PORT || 4000);

async function bootstrap() {
  console.log('🏎️  Bootstrapping Automotors Garage Backend API...');

  let db;
  try {
    const pool = DatabaseFactory.createPool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'automotors_garage',
    });
    db = DatabaseFactory.create(pool);
    await DatabaseMigrator.runMigrations(db);
    console.log('✅ Connected to PostgreSQL and applied migrations successfully.');
  } catch (err: unknown) {
    console.warn('⚠️  Could not connect to external PostgreSQL, falling back to embedded PGlite engine:', err instanceof Error ? err.message : String(err));
    db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);
    console.log('✅ Initialized embedded PostgreSQL engine and applied initial schema.');
  }

  const app = new HttpApp({ db });
  const server = app.createServer();

  server.listen(PORT, () => {
    console.log(`🚀 Automotors Garage API listening on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health/live`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Fatal error starting Automotors Garage Backend:', err);
  process.exit(1);
});
