import { DatabaseFactory, DatabaseMigrator } from '@automotors/database';
import { DemoSeeder } from '../apps/backend/src/infrastructure/database/demo-seed.ts';

async function main() {
  console.log('🌱 Starting Automotors Garage Demo Data Seeding...');

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ SEEDING ABORTED: Cannot seed demo data in production environment.');
    process.exit(1);
  }

  let db;
  const env = process.env.NODE_ENV || 'development';
  const defaultDataDir = env === 'demo' ? './.data/postgres_demo' : './.data/postgres_dev';
  const dataDir = process.env.PG_DATA_DIR || defaultDataDir;

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
    console.log('✅ Connected to external PostgreSQL database.');
  } catch {
    console.log(`ℹ️  Using persistent embedded PostgreSQL engine at '${dataDir}'...`);
    db = await DatabaseFactory.createInMemoryTestDb(dataDir);
    await DatabaseMigrator.runMigrations(db);
  }

  const seeder = new DemoSeeder(db);
  const result = await seeder.seed();

  console.log('🎉 Demo Seeding Complete:');
  console.log(`   - Workshops: ${result.workshopsCount}`);
  console.log(`   - Users/Mechanics: ${result.usersCount}`);
  console.log(`   - Customers: ${result.customersCount}`);
  console.log(`   - Vehicles (VW Golf featured): ${result.vehiclesCount}`);
  console.log(`   - Work Orders: ${result.workOrdersCount}`);
  console.log(`   - Certified Maintenance Records: ${result.maintenanceRecordsCount}`);
  console.log(`   - Documented OEM Intervals: ${result.intervalsCount}`);
  console.log('\n🔑 Demo Credentials for Mauricio:');
  console.log('   - Mario Rossi (Senior / Admin): mario@alphamotors.com / Password123!');
  console.log('   - Lucas Gómez (Mechanic): lucas@alphamotors.com / Password123!');
  console.log('   - Workshop ID: w-alpha (Alpha Motors Garage)');

  try {
    const client = (db as any)?.$client || (db as any)?.session?.client;
    if (client?.close) {
      await client.close();
      console.log('✅ Demo database connections closed cleanly.');
    }
  } catch {
    // non-fatal
  }
}

main().catch((err) => {
  console.error('❌ Fatal error during demo seeding:', err);
  process.exit(1);
});
