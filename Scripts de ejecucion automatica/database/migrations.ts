import * as fs from 'node:fs';
import { DatabaseFactory, DatabaseMigrator, resolveLocalPgliteDir } from '@automotors/database';

const operation = process.argv[2];
if (operation !== 'status' && operation !== 'apply' && operation !== 'adopt') {
  throw new Error('Usage: npm run db:status | npm run db:apply | npm run db:adopt');
}
if (operation === 'adopt') {
  throw new Error('Legacy adoption is disabled: complete schema equivalence has not been verified. No database was opened. Preserve the database and request manual review.');
}

const env = process.env.NODE_ENV || 'development';
const rawProvider = (process.env.DB_PROVIDER || (env === 'production' ? 'postgres' : 'pglite')).toLowerCase();
if (!['postgres', 'postgresql', 'pglite'].includes(rawProvider)) throw new Error(`Unsupported DB_PROVIDER '${rawProvider}'`);
const provider = rawProvider === 'postgresql' ? 'postgres' : rawProvider;
if (env === 'production' && provider !== 'postgres') throw new Error('Production requires PostgreSQL; DB_PROVIDER=pglite is forbidden');

async function main(): Promise<void> {
  if (provider === 'pglite') {
    const dataDir = resolveLocalPgliteDir(process.env.PG_DATA_DIR || (env === 'demo' ? './.data/postgres_demo' : './.data/postgres_dev'));
    if (operation === 'status' && !fs.existsSync(dataDir)) {
      console.log(`PGlite database '${dataDir}' is not initialized. Run npm run db:apply to prepare it.`);
      process.exitCode = 1;
      return;
    }
    const db = await DatabaseFactory.createInMemoryTestDb(dataDir);
    try {
      const status = operation === 'apply' ? await DatabaseMigrator.apply(db) : await DatabaseMigrator.status(db);
      console.log(JSON.stringify(status, null, 2));
      if (operation === 'status' && !status.ready) process.exitCode = 1;
    } finally {
      await db.$client.close();
      const ownerFile = `${dataDir}/.owner.pid`;
      if (fs.existsSync(ownerFile) && fs.readFileSync(ownerFile, 'utf8').trim() === String(process.pid)) fs.unlinkSync(ownerFile);
    }
    return;
  }

  const pool = DatabaseFactory.createPool(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || 5432),
        user: process.env.DATABASE_USER || process.env.POSTGRES_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || process.env.POSTGRES_DB || 'automotors_garage',
      });
  try {
    const db = DatabaseFactory.create(pool);
    const status = operation === 'apply' ? await DatabaseMigrator.apply(db) : await DatabaseMigrator.status(db);
    console.log(JSON.stringify(status, null, 2));
    if (operation === 'status' && !status.ready) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
