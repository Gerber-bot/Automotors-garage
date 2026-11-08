import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import { and, eq } from 'drizzle-orm';
import { DatabaseFactory, DatabaseMigrator, maintenanceRecords, workshopMembers, workshops, users, kbMaintenanceRules } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DeterministicMaintenanceEngine, type MaintenanceCalculationInput } from '../../apps/backend/src/modules/maintenance-intelligence/domain/deterministic-engine.ts';
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
  const fakeProvider = {
    isConfigured: () => false,
    getModelVersion: () => 'test-only',
    getProviderName: () => 'TestOnlyProvider',
    generateCompletion: async (): Promise<string> => { throw new Error('Unexpected AI completion'); },
    extract: async <T>(): Promise<T> => { throw new Error('Unexpected AI extraction'); },
  };

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
    server = new HttpApp({ db, aiProvider: fakeProvider }).createServer();
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
    assert.deepEqual(
      history.timeline.map((record) => [record.id, record.recordOrigin]).sort((a, b) => a[0]!.localeCompare(b[0]!)),
      [
        [DEMO_IDS.REC_LOGAN_30K_CERTIFIED, 'WORKSHOP_CERTIFIED'],
        [DEMO_IDS.REC_LOGAN_40K_OWNER, 'OWNER_DECLARED'],
      ].sort((a, b) => a[0]!.localeCompare(b[0]!))
    );
    const summary = await owner.getOwnerHistorySummary(DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER);
    assert.equal(summary.vehicleId, DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER);
    assert.deepEqual(new Set(summary.referencedRecordIds), new Set(history.timeline.map((record) => record.id)));
  });

  it('uses only workshop-scoped services when calculating a verified preventive rule', async () => {
    await probeDb.insert(kbMaintenanceRules).values({
      id: '56000000-0000-4000-8000-000000000099',
      configurationId: DEMO_IDS.KB_CFG_GOLF_EA211,
      category: 'OIL_AND_FILTER', title: 'Verified oil interval', intervalKm: 15000,
      intervalMonths: 120, verificationStatus: 'VERIFIED', isActive: true,
    });
    const originalCalculate = DeterministicMaintenanceEngine.prototype.calculate;
    const inputs: MaintenanceCalculationInput[] = [];
    DeterministicMaintenanceEngine.prototype.calculate = function(input) {
      inputs.push(input);
      return originalCalculate.call(this, input);
    };
    try {
      const a = await request(alpha, DEMO_IDS.VEHICLE_VW_GOLF, 'explain');
      const b = await request(beta, DEMO_IDS.VEHICLE_VW_GOLF, 'explain');
      assert.equal(a.status, 200, a.body);
      assert.equal(b.status, 200, b.body);
      assert.equal(inputs.length, 2);
      assert.deepEqual(inputs[0]?.previousServices?.map((s) => s.recordedMileage), [45000]);
      assert.deepEqual(inputs[1]?.previousServices?.map((s) => s.recordedMileage), [47000]);
      assert.equal(inputs[0]?.rule?.category, 'OIL_AND_FILTER');
      assert.equal(inputs[0]?.rule?.title, 'Verified oil interval');
      assert.equal(JSON.parse(a.body).nextDueMileage, 60000);
      assert.equal(JSON.parse(b.body).nextDueMileage, 62000);
      assert.notEqual(JSON.parse(a.body).status, 'INSUFFICIENT_DATA');
      assert.notEqual(JSON.parse(b.body).status, 'INSUFFICIENT_DATA');
    } finally {
      DeterministicMaintenanceEngine.prototype.calculate = originalCalculate;
    }
  });

  it('applies current role and permission changes without issuing another token', async () => {
    const client = new ApiClient({ baseUrl });
    await client.login('mario@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 200);
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 200);
    await probeDb.update(workshopMembers).set({ role: 'VIEWER' }).where(and(
      eq(workshopMembers.userId, DEMO_IDS.USER_MARIO), eq(workshopMembers.workshopId, DEMO_IDS.WORKSHOP_ALPHA)
    ));
    try {
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 200);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 403);
    } finally {
      await probeDb.update(workshopMembers).set({ role: 'ADMIN' }).where(and(
        eq(workshopMembers.userId, DEMO_IDS.USER_MARIO), eq(workshopMembers.workshopId, DEMO_IDS.WORKSHOP_ALPHA)
      ));
    }
  });

  it('enforces persisted READ and CALCULATE_PREVENTIVE overrides independently', async () => {
    const client = new ApiClient({ baseUrl });
    await client.login('mario@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);
    const member = and(eq(workshopMembers.userId, DEMO_IDS.USER_MARIO), eq(workshopMembers.workshopId, DEMO_IDS.WORKSHOP_ALPHA));
    try {
      await probeDb.update(workshopMembers).set({ permissions: ['READ'] }).where(member);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 200);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 403);

      await probeDb.update(workshopMembers).set({ permissions: ['CALCULATE_PREVENTIVE'] }).where(member);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 403);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 200);

      await probeDb.update(workshopMembers).set({ permissions: [] }).where(member);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 403);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 403);

      await probeDb.update(workshopMembers).set({ role: 'VIEWER', permissions: ['CALCULATE_PREVENTIVE'] }).where(member);
      assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 403);
    } finally {
      await probeDb.update(workshopMembers).set({ role: 'ADMIN', permissions: null }).where(member);
    }
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 200);
  });

  it('requires current calculation permission and workshop proof for vehicle-based calculations', async () => {
    const client = new ApiClient({ baseUrl });
    await client.login('mario@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);
    const member = and(eq(workshopMembers.userId, DEMO_IDS.USER_MARIO), eq(workshopMembers.workshopId, DEMO_IDS.WORKSHOP_ALPHA));
    const { token } = client.getSession();
    const calculate = (vehicleId: string) => fetch(`${baseUrl}/maintenance/calculate-preventive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId }),
    });
    try {
      assert.equal((await calculate(DEMO_IDS.VEHICLE_VW_GOLF)).status, 200);
      assert.equal((await calculate(DEMO_IDS.VEHICLE_HONDA_CIVIC)).status, 404);
      await probeDb.update(workshopMembers).set({ permissions: ['READ'] }).where(member);
      assert.equal((await calculate(DEMO_IDS.VEHICLE_VW_GOLF)).status, 403);
    } finally {
      await probeDb.update(workshopMembers).set({ permissions: null }).where(member);
    }
  });

  it('denies a deactivated owner without affecting active owners', async () => {
    await probeDb.update(users).set({ isActive: false }).where(eq(users.id, DEMO_IDS.USER_OWNER_VALERIA));
    try {
      const { token } = owner.getSession();
      const response = await fetch(`${baseUrl}/owner/vehicles/${DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 403);
    } finally {
      await probeDb.update(users).set({ isActive: true }).where(eq(users.id, DEMO_IDS.USER_OWNER_VALERIA));
    }
    assert.ok((await owner.getOwnerVehicleHistory(DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER)).timeline.length > 0);
  });

  it('revokes old tokens when membership, workshop, or user is deactivated or deleted', async () => {
    const client = new ApiClient({ baseUrl });
    await client.login('carlos@betaservice.com', 'Password123!', DEMO_IDS.WORKSHOP_BETA);
    const member = and(eq(workshopMembers.userId, DEMO_IDS.USER_BETA_CARLOS), eq(workshopMembers.workshopId, DEMO_IDS.WORKSHOP_BETA));
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 200);
    await probeDb.update(workshopMembers).set({ isActive: false }).where(member);
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 403);
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 403);
    await probeDb.update(workshopMembers).set({ isActive: true }).where(member);
    await probeDb.update(workshops).set({ isActive: false }).where(eq(workshops.id, DEMO_IDS.WORKSHOP_BETA));
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 403);
    await probeDb.update(workshops).set({ isActive: true }).where(eq(workshops.id, DEMO_IDS.WORKSHOP_BETA));
    await probeDb.update(users).set({ isActive: false }).where(eq(users.id, DEMO_IDS.USER_BETA_CARLOS));
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 403);
    await probeDb.update(users).set({ isActive: true }).where(eq(users.id, DEMO_IDS.USER_BETA_CARLOS));
    await probeDb.delete(workshopMembers).where(member);
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'summary')).status, 403);
    assert.equal((await request(client, DEMO_IDS.VEHICLE_VW_GOLF, 'explain')).status, 403);
    assert.ok((await owner.getOwnerVehicleHistory(DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER)).timeline.length > 0);
  });
});
