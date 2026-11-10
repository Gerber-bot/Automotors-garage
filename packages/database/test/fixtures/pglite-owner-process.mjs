import { DatabaseFactory } from '../../src/index.ts';

let db;
process.on('message', async ({ id, action, dataDir }) => {
  try {
    if (action === 'open') {
      if (db) throw new Error('Fixture already owns a database');
      db = await DatabaseFactory.createInMemoryTestDb(dataDir);
    } else if (action === 'write') {
      await db.$client.exec(`CREATE TABLE IF NOT EXISTS exclusion_probe (id integer PRIMARY KEY, value text NOT NULL);
        INSERT INTO exclusion_probe SELECT i, 'owner-' || i FROM generate_series(1, 100) AS i;`);
    } else if (action === 'verify') {
      const result = await db.$client.query(`SELECT count(*)::integer AS total,
        count(*) FILTER (WHERE value = 'owner-' || id)::integer AS valid FROM exclusion_probe`);
      process.send({ id, ok: true, ...result.rows[0] });
      return;
    } else if (action === 'close' || action === 'exit') {
      if (db) { await db.$client.close(); db = undefined; }
    } else { throw new Error('Unknown fixture command'); }
    process.send({ id, ok: true }, () => { if (action === 'exit') process.exit(0); });
  } catch (error) {
    process.send({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
process.send({ ready: true });
