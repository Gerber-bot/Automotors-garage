import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { DatabaseFactory, DatabaseMigrator } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { ApiClient } from '../../apps/frontend/src/api/client.ts';

describe('Milestone 11: OBD-II Diagnostics & Telemetry Integration Suite', () => {
  let db: any;
  let app: HttpApp;
  let server: http.Server;
  let baseUrl: string;
  let testDataDir: string;
  let authToken: string;
  let apiClient: ApiClient;

  before(async () => {
    testDataDir = path.join(process.cwd(), '.data', `test_m11_obd_${Date.now()}`);
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }

    db = await DatabaseFactory.createInMemoryTestDb(testDataDir);
    await DatabaseMigrator.runMigrations(db);

    const seeder = new DemoSeeder(db);
    await seeder.seed();

    app = new HttpApp({ db });
    server = app.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });

    apiClient = new ApiClient({
      baseUrl: `${baseUrl}/api/v1`,
      getActiveTenantId: () => DEMO_IDS.WORKSHOP_ALPHA,
      getAuthToken: () => authToken,
    });

    // Authenticate as Lead Mechanic
    const loginRes = await apiClient.login('mario@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);
    authToken = loginRes.token;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {
        // Handle locks on Windows
      }
    }
  });

  it('1. GET /api/v1/diagnostics/ports enumerates Windows USB serial COM ports', async () => {
    const res = await apiClient.getDiagnosticsPorts();
    assert.ok(Array.isArray(res.ports), 'Should return an array of ports');
    assert.ok(res.ports.length > 0, 'Should find serial ports');
    const firstPort = res.ports[0];
    assert.ok(firstPort.path.startsWith('COM'), `Port path should start with COM, got ${firstPort.path}`);
  });

  it('2. POST /api/v1/diagnostics/session/start initializes Renault Logan 1.6 simulation', async () => {
    const vehicleId = DEMO_IDS.VEHICLE_VW_GOLF;
    const res = await apiClient.startDiagnosticsSession({
      vehicleId,
      transportType: 'SIMULATED',
      simulatorConfig: {
        milActive: true,
        storedDtcs: ['P0300', 'P0115'],
      },
    });

    assert.equal(res.status, 'CONNECTED');
    assert.equal(res.isSimulated, true);
    assert.ok(res.transportId.includes('SIMULATOR'), 'Transport ID should be simulated');
  });

  it('3. GET /api/v1/diagnostics/session/live polls real-time telemetry snapshot', async () => {
    const vehicleId = DEMO_IDS.VEHICLE_VW_GOLF;
    const telemetry = await apiClient.getDiagnosticsLive(vehicleId);

    assert.ok(telemetry.timestamp, 'Timestamp must be present');
    assert.equal(telemetry.isSimulated, true, 'isSimulated must be explicitly flagged');
    assert.ok(telemetry.protocol.includes('ISO_15765_4') || telemetry.protocol.includes('CAN'), 'Should report standard CAN protocol');

    // Sensors
    assert.ok(telemetry.sensors.rpm > 600 && telemetry.sensors.rpm < 7000, `RPM out of range: ${telemetry.sensors.rpm}`);
    assert.ok(telemetry.sensors.coolantTemp >= 40 && telemetry.sensors.coolantTemp <= 115, `Temp: ${telemetry.sensors.coolantTemp}`);
    assert.ok(telemetry.sensors.adapterVoltage >= 11.0 && telemetry.sensors.adapterVoltage <= 15.0, `Voltage: ${telemetry.sensors.adapterVoltage}`);
    assert.equal(telemetry.sensors.milStatus, true, 'MIL should be active');

    // DTC codes
    assert.ok(telemetry.dtcCodes.length >= 2, 'Should contain configured DTCs');
    const codes = telemetry.dtcCodes.map((d) => d.code);
    assert.ok(codes.includes('P0300'), 'Should contain misfire P0300');
    assert.ok(codes.includes('P0115'), 'Should contain coolant sensor P0115');
  });

  it('4. Read-Only Security Guard strictly blocks clearing DTCs and write attempts', async () => {
    // Mode 04 (Clear DTCs) is prohibited by the domain whitelist
    const { validateAndSanitizeCommand, ObdSecurityError } = await import('../../packages/obd-core/src/index.ts');

    assert.throws(
      () => validateAndSanitizeCommand('04'),
      (err: any) => err instanceof ObdSecurityError && err.attemptedCommand === '04'
    );

    assert.throws(
      () => validateAndSanitizeCommand('08 01'),
      (err: any) => err instanceof ObdSecurityError && err.attemptedCommand === '08 01'
    );
  });

  it('5. POST /api/v1/diagnostics/session/snapshot saves non-destructive diagnostic snapshot', async () => {
    const vehicleId = DEMO_IDS.VEHICLE_VW_GOLF;
    const telemetry = await apiClient.getDiagnosticsLive(vehicleId);

    const res = await apiClient.saveDiagnosticsSnapshot({
      vehicleId,
      telemetry,
      technicianNotes: 'Escaneo inicial en taller: falla de encendido confirmada en cilindro.',
    });

    assert.ok(res.record, 'Snapshot record should be returned');
    assert.equal(res.record.vehicleId, vehicleId);
    assert.equal(res.record.origin, 'SIMULATED');
    assert.equal(res.record.telemetry.isSimulated, true);
    assert.equal(res.record.telemetry.dtcCodes.length, telemetry.dtcCodes.length);
    assert.equal(res.record.technicianNotes, 'Escaneo inicial en taller: falla de encendido confirmada en cilindro.');
  });

  it('6. POST /api/v1/ai/obd2/interpret provides AI assisted diagnosis with legal disclaimer', async () => {
    const response = await apiClient.interpretObd2({
      dtcCodes: ['P0300', 'P0115'],
      vehicleSpecs: {
        make: 'Renault',
        model: 'Logan',
        year: 2020,
        engine: 'H4M 1.6 16v',
      },
    });

    assert.ok(response.codesAnalyzed, 'Should return AI analysis structure');
    assert.ok(response.codesAnalyzed.includes('P0300'));
    assert.ok(Array.isArray(response.mechanicChecklist), 'Checklist should be an array');
    assert.ok(response.mechanicChecklist.length > 0, 'Checklist should have steps');
    assert.ok(response.disclaimer.includes('mandatory') || response.disclaimer.includes('guidance') || response.disclaimer.includes('orientativo'), 'Disclaimer must emphasize non-binding advisory role');
  });

  it('7. POST /api/v1/diagnostics/session/stop terminates the active telemetry session', async () => {
    const vehicleId = DEMO_IDS.VEHICLE_VW_GOLF;
    const res = await apiClient.stopDiagnosticsSession(vehicleId);

    assert.equal(res.status, 'DISCONNECTED');

    // Attempting to poll stopped session should return 400
    await assert.rejects(
      async () => apiClient.getDiagnosticsLive(vehicleId),
      (err: any) => err.statusCode === 400
    );
  });

  it('8. Security: Rejects session initialization for non-existent vehicle with HTTP 404', async () => {
    await assert.rejects(
      async () =>
        apiClient.startDiagnosticsSession({
          vehicleId: 'non-existent-vehicle-uuid',
          transportType: 'SIMULATED',
        }),
      (err: any) => err.statusCode === 404
    );
  });

  it('9. Security: Rejects arbitrary or malformed COM port identifiers with HTTP 400', async () => {
    await assert.rejects(
      async () =>
        apiClient.startDiagnosticsSession({
          vehicleId: DEMO_IDS.VEHICLE_VW_GOLF,
          transportType: 'WINDOWS_USB_SERIAL',
          comPort: 'COM1/../../etc/passwd',
        }),
      (err: any) => err.statusCode === 400
    );

    await assert.rejects(
      async () =>
        apiClient.startDiagnosticsSession({
          vehicleId: DEMO_IDS.VEHICLE_VW_GOLF,
          transportType: 'WINDOWS_USB_SERIAL',
          comPort: 'COM999',
        }),
      (err: any) => err.statusCode === 400
    );
  });

  it('10. Security: Enforces concurrent session quotas per workshop and cleans idle sessions', async () => {
    const { ObdDiagnosticsService } = await import('../../packages/obd-core/src/index.ts');
    const service = new ObdDiagnosticsService();

    // Start max allowed sessions
    await service.startSession({
      workshopId: 'workshop-audit',
      vehicleId: 'v1',
      transportType: 'SIMULATED',
    });
    await service.startSession({
      workshopId: 'workshop-audit',
      vehicleId: 'v2',
      transportType: 'SIMULATED',
    });
    await service.startSession({
      workshopId: 'workshop-audit',
      vehicleId: 'v3',
      transportType: 'SIMULATED',
    });

    // 4th session should exceed quota
    await assert.rejects(
      async () =>
        service.startSession({
          workshopId: 'workshop-audit',
          vehicleId: 'v4',
          transportType: 'SIMULATED',
        }),
      (err: any) => err.message.includes('quota exceeded')
    );

    // Fast-forward or simulate idle TTL cleanup (maxIdleTimeMs = 0)
    const cleaned = await service.cleanupAbandonedSessions(0);
    assert.equal(cleaned, 3, 'All 3 idle sessions should be cleaned up');

    // Starting a new session after cleanup should succeed
    const session = await service.startSession({
      workshopId: 'workshop-audit',
      vehicleId: 'v4',
      transportType: 'SIMULATED',
    });
    assert.ok(session, 'New session starts after cleanup');
    await session.close();
  });
});
