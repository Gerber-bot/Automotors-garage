import { DatabaseFactory, DatabaseMigrator, resolveLocalPgliteDir } from '@automotors/database';
import { DemoSeeder } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { resolveDemoSeedTarget } from '../../packages/database/src/demo-seed-target.ts';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';

async function main() {
  console.log('🌱 Starting Automotors Garage Demo Data Seeding...');

  const dataDir = resolveDemoSeedTarget(process.env);
  if (!existsSync(dataDir)) throw new Error('Demo target is not prepared; explicitly prepare a new disposable database first');
  let pglite: Awaited<ReturnType<typeof DatabaseFactory.createInMemoryTestDb>> | undefined;
  try {
    pglite = await DatabaseFactory.createInMemoryTestDb(dataDir);
    const db = pglite;
    const status = await DatabaseMigrator.status(db);
    if (!status.ready) throw new Error('Demo seeding requires an explicitly prepared database; run db:status first');
    const result = await new DemoSeeder(db).seed();

  console.log('🎉 Demo Seeding Complete:');
  console.log(`   - Workshops: ${result.workshopsCount}`);
  console.log(`   - Users/Mechanics: ${result.usersCount}`);
  console.log(`   - Customers: ${result.customersCount}`);
  console.log(`   - Vehicles (VW Golf featured): ${result.vehiclesCount}`);
  console.log(`   - Work Orders: ${result.workOrdersCount}`);
  console.log(`   - Certified Maintenance Records: ${result.maintenanceRecordsCount}`);
  console.log(`   - Documented OEM Intervals: ${result.intervalsCount}`);
  console.log('\n🔑 Demo Credentials:');
  console.log('   - Mario Rossi (Senior / Admin): mario@alphamotors.com / Password123!');
  console.log('   - Lucas Gómez (Mechanic): lucas@alphamotors.com / Password123!');
  console.log('   - Workshop ID: w-alpha (Alpha Motors Garage)');

  } finally {
    if (pglite) {
      await pglite.$client.close();
      const ownerFile = `${resolveLocalPgliteDir(dataDir)}/.owner.pid`;
      if (existsSync(ownerFile) && readFileSync(ownerFile, 'utf8').trim() === String(process.pid)) {
        unlinkSync(ownerFile);
      }
    }
  }
}

main().catch((err) => {
  console.error('❌ Fatal error during demo seeding:', err);
  process.exit(1);
});
