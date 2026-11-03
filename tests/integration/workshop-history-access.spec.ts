import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import { DatabaseFactory, DatabaseMigrator, maintenanceRecords } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { ApiClient } from '../../apps/frontend/src/api/client.ts';

describe('Workshop maintenance access', () => {
  let server: Server;
  let probeDb: Awaited<ReturnType<typeof DatabaseFactory.createInMemoryTestDb>>;
  let baseUrl: string;
  let alpha: ApiClient;
  let beta: ApiClient;
  let owner: ApiClient;
  let noWorkshop: ApiClient;

  const BETA_ONLY = '10000000-0000-4000-8000-000000000099';
  const UNATTRIBUTED = '10000000-0000-4000-8000-000000000098';
  const WRONG_ORDER = '10000000-0000-4000-8000-000000000097';
  const WRONG_VEHICLE = '10000000-0000-4000-8000-000000000096';
  const UNKNOWN_VEHICLE = 'd0000000-0000-4000-8000-000000000099';

  before(async () => {
    const db = await DatabaseFactory.createInMemoryTestDb();
    probeDb = db;
    await DatabaseMigrator.runMigrations(db);
    await new DemoSeeder(db).seed();
    await db.insert(maintenanceRecords).values([
      { id: BETA_ONLY, vehicleId: DEMO_IDS.VEHICLE_VW_GOLF, performingWorkshopId: DEMO_IDS.WORKSHOP_BETA,
        performingWorkshopName: 'Beta', recordedMileage: 47000, serviceDate: new Date('2026-03-01'),
        interventions: [{ title: 'Beta private oil service', category: 'OIL_AND_FILTER' }],
        internalNotes: 'BETA PRIVATE NOTES', partsCost: '98765.00' },
      { id: UNATTRIBUTED, vehicleId: DEMO_IDS.VEHICLE_VW_GOLF, performingWorkshopId: null,
        performingWorkshopName: 'Unknown', recordedMileage: 48000, serviceDate: new Date('2026-04-01'),
        interventions: [{ title: 'UNATTRIBUTED SERVICE', category: 'OIL_AND_FILTER' }] },
      { id: WRONG_ORDER, vehicleId: DEMO_IDS.VEHICLE_VW_GOLF, workOrderId: DEMO_IDS.WO_VW_GOLF_45K,
        performingWorkshopId: DEMO_IDS.WORKSHOP_BETA, performingWorkshopName: 'Beta',
        recordedMileage: 49000, serviceDate: new Date('2026-05-01'),
        interventions: [{ title: 'WRONG WORKSHOP ORDER', category: 'OIL_AND_FILTER' }] },
      { id: WRONG_VEHICLE, vehicleId: DEMO_IDS.VEHICLE_TOYOTA_COROLLA, workOrderId: DEMO_IDS.WO_VW_GOLF_45K,
        performingWorkshopId: DEMO_IDS.WORKSHOP_ALPHA, performingWorkshopName: 'Alpha',
        recordedMileage: 50000, serviceDate: new Date('2026-06-01'),
        interventions: [{ title: 'WRONG VEHICLE ORDER', category: 'OIL_AND_FILTER' }] },
    ]);
    server = new HttpApp({ db }).createServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
    alpha = new ApiClient({ baseUrl });
    beta = new ApiClient({ baseUrl });
    owner = new ApiClient({ baseUrl });
    noWorkshop = new ApiClient({ baseUrl });
    await alpha.login('mario@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);
    await beta.login('carlos@betaservice.com', 'Password123!', DEMO_IDS.WORKSHOP_BETA);
    await owner.login('valeria@miautomotors.com', 'Password123!');
    await noWorkshop.login('valeria@miautomotors.com', 'Password123!');
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function request(client: ApiClient, vehicleId: string, kind: 'summary' | 'explain') {
    const { token, activeTenantId } = client.getSession();
    const suffix = kind === 'summary' ? 'history/summary' : 'predictions/OIL_AND_FILTER/explain';
    const response = await fetch(`${baseUrl}/vehicles/${vehicleId}/${suffix}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...(activeTenantId ? { 'x-tenant-id': activeTenantId } : {}) },
    });
    return { status: response.status, body: await response.text() };
  }

  for (const kind of ['summary', 'explain'] as const) {
    it(`${kind} limits a shared vehicle to the active workshop's records`, async () => {
      const a = await request(alpha, DEMO_IDS.VEHICLE_VW_GOLF, kind);
      const b = await request(beta, DEMO_IDS.VEHICLE_VW_GOLF, kind);
      assert.equal(a.status, 200, a.body);
      assert.equal(b.status, 200, b.body);
      assert.doesNotMatch(a.body, /Beta private oil service|BETA PRIVATE NOTES|98765|UNATTRIBUTED SERVICE|WRONG WORKSHOP ORDER/);
      assert.doesNotMatch(b.body, /Aceite Sintético Motul|Cliente satisfecho|UNATTRIBUTED SERVICE|WRONG WORKSHOP ORDER/);
      if (kind === 'summary') {
        assert.equal(JSON.parse(a.body).totalRecordsAnalyzed, 1);
        assert.equal(JSON.parse(b.body).totalRecordsAnalyzed, 1);
      }
    });

    it(`${kind} denies absent, unrelated, and unproven vehicle access without revealing details`, async () => {
      const missing = await request(alpha, UNKNOWN_VEHICLE, kind);
      const malformed = await request(alpha, 'not-a-uuid', kind);
      assert.equal(malformed.status, 404, malformed.body);
      assert.equal(malformed.body, missing.body);
      for (const vehicleId of [DEMO_IDS.VEHICLE_HONDA_CIVIC, DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER]) {
        const denied = await request(beta, vehicleId, kind);
        assert.equal(denied.status, 404, denied.body);
        assert.equal(denied.body, missing.body);
      }
      assert.equal(missing.status, 404);
    });

    it(`${kind} requires an active workshop`, async () => {
      const denied = await request(noWorkshop, DEMO_IDS.VEHICLE_VW_GOLF, kind);
      assert.equal(denied.status, 403);
      assert.doesNotMatch(denied.body, /Beta private oil service|BETA PRIVATE NOTES/);
    });
  }

  it('rejects an order linked to the wrong vehicle even for the performing workshop', async () => {
    const summary = await request(alpha, DEMO_IDS.VEHICLE_TOYOTA_COROLLA, 'summary');
    assert.equal(summary.status, 200, summary.body);
    assert.doesNotMatch(summary.body, /WRONG VEHICLE ORDER/);
  });

  it('rejects forged tenant headers without changing maintenance records', async () => {
    const hashRecords = async () => createHash('sha256')
      .update(JSON.stringify(await probeDb.select().from(maintenanceRecords)))
      .digest('hex');
    const before = await hashRecords();
    const { token: alphaToken } = alpha.getSession();
    const { token: betaToken } = beta.getSession();

    for (const suffix of ['history/summary', 'predictions/OIL_AND_FILTER/explain']) {
      for (const [token, tenant] of [
        [alphaToken, DEMO_IDS.WORKSHOP_BETA],
        [betaToken, DEMO_IDS.WORKSHOP_ALPHA],
      ]) {
        const response = await fetch(`${baseUrl}/vehicles/${DEMO_IDS.VEHICLE_VW_GOLF}/${suffix}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant },
        });
        assert.equal(response.status, 403);
        assert.doesNotMatch(await response.text(), /Beta private oil service|BETA PRIVATE NOTES|98765/);
        assert.equal(await hashRecords(), before);
      }
    }
  });

  it('preserves the owner’s access to their own complete history', async () => {
    const history = await owner.getOwnerVehicleHistory(DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER);
    assert.ok(history.timeline.length > 0);
    const summary = await owner.getOwnerHistorySummary(DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER);
    assert.equal(summary.vehicleId, DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER);
  });
});
