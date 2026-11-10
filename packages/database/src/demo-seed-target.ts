import { resolveLocalPgliteDir } from './client.ts';

/** Demo writes require an explicitly selected, installation-owned disposable target. */
export function resolveDemoSeedTarget(env: Record<string, string | undefined>): string {
  if (!['development', 'demo', 'test'].includes(env.NODE_ENV || 'development')) {
    throw new Error('Demo seeding is restricted to development, demo or test mode');
  }
  if ((env.DB_PROVIDER || 'pglite').toLowerCase() !== 'pglite') {
    throw new Error('Demo seeding only supports local PGlite; external database connections are disabled');
  }
  if (env.DEMO_SEED_ACK !== 'I_CONFIRM_DISPOSABLE_LOCAL_DATA') {
    throw new Error('Demo seeding requires DEMO_SEED_ACK=I_CONFIRM_DISPOSABLE_LOCAL_DATA');
  }
  if (!env.PG_DATA_DIR?.trim()) throw new Error('Demo seeding requires an explicit PG_DATA_DIR');
  return resolveLocalPgliteDir(env.PG_DATA_DIR);
}
