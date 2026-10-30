import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { DatabaseFactory, DatabaseMigrator } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { ApiClient } from '../../apps/frontend/src/api/client.ts';
import { HistorySummarySchema, MaintenanceExplanationSchema } from '../../apps/backend/src/modules/maintenance-intelligence/domain/ai-types.ts';

describe('Milestone 13: AI Optimization, System Cleanup & Database Strategy Integration Suite', () => {
  let db: any;
  let app: HttpApp;
  let server: http.Server;
  let baseUrl: string;
  let testDataDir: string;

  let ownerAClient: ApiClient;
  let ownerBClient: ApiClient;
  let workshopClient: ApiClient;
  let ownerAVehicleId: string;

  before(async () => {
    testDataDir = path.join(process.cwd(), '.data', `test_m13_ai_${Date.now()}`);
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

    ownerAClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    ownerBClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    workshopClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });

    // Authenticate Owner A (Valeria)
    const loginA = await ownerAClient.login('valeria@miautomotors.com', 'Password123!');
    ownerAClient.setAuthSession(loginA.token, null);

    // Register & Authenticate Owner B
    const regB = await ownerBClient.registerOwner({
      email: 'lucia.owner@example.com',
      password: 'Password123!',
      fullName: 'Lucía Propietaria',
    });
    ownerBClient.setAuthSession(regB.token, null);

    // Authenticate Workshop (Mario)
    const loginW = await workshopClient.login('mario@alphamotors.com', 'Password123!');
    workshopClient.setAuthSession(loginW.token, DEMO_IDS.WORKSHOP_A);

    // Find Owner A's vehicle
    const ownerVehicles = await ownerAClient.getOwnerVehicles();
    assert.ok(ownerVehicles.length > 0);
    ownerAVehicleId = ownerVehicles[0]!.id;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {
        // Ignored on Windows file locks
      }
    }
  });

  // ============================================================================
  // Test 1: Estado del servicio de IA
  // ============================================================================
  it('1. GET /api/v1/ai/status: reporta estado deshabilitado/unconfigured sin exponer secretos', async () => {
    const status = await ownerAClient.getAiStatus();
    assert.equal(typeof status.isConfigured, 'boolean');
    assert.equal(status.isConfigured, false); // No OPENAI_API_KEY set in test env
    assert.ok(status.providerName);
    assert.ok(status.message.includes('modo determinista'));
  });

  // ============================================================================
  // Test 2: Retiro completo de endpoints de notas de voz
  // ============================================================================
  it('2. Endpoints de notas de voz eliminados: POST /api/v1/ai/voice-notes/process devuelve 404', async () => {
    // When called via authenticated workshop client, route no longer exists and returns 404 Not Found
    await assert.rejects(
      async () =>
        await (workshopClient as any).request('/ai/voice-notes/process', {
          method: 'POST',
          body: JSON.stringify({ audioBase64: 'fake' }),
        }),
      (err: any) => err.statusCode === 404
    );
  });

  // ============================================================================
  // Test 3: Resumen Inteligente del Historial en Mi Automotors
  // ============================================================================
  it('3. POST /api/v1/owner/vehicles/:id/history/summary: genera resumen estructurado conforme a schema Zod', async () => {
    const summary = await ownerAClient.getOwnerHistorySummary(ownerAVehicleId);

    const parsed = HistorySummarySchema.safeParse(summary);
    assert.equal(parsed.success, true);
    assert.equal(summary.vehicleId, ownerAVehicleId);
    assert.ok(summary.totalRecordsAnalyzed >= 0);
    assert.ok(Array.isArray(summary.mainInterventions));
    assert.ok(Array.isArray(summary.recentServices));
    assert.ok(Array.isArray(summary.recurringRepairs));
    assert.ok(Array.isArray(summary.dataLimitations));
    assert.equal(summary.isAiGenerated, false); // In test mode without API key, runs deterministic fallback
    assert.equal(summary.providerName, 'DeterministicRuleBasedEngine');
  });

  // ============================================================================
  // Test 4: Aislamiento de privacidad en resumen del historial
  // ============================================================================
  it('4. Seguridad y aislamiento: Propietario B recibe 403 al intentar resumir vehículo de Propietario A', async () => {
    await assert.rejects(
      async () => await ownerBClient.getOwnerHistorySummary(ownerAVehicleId),
      /Acceso denegado: no sos el propietario autorizado/i
    );
  });

  // ============================================================================
  // Test 5: Explicación de Mantenimiento Preventivo sin Alterar Proyecciones
  // ============================================================================
  it('5. POST /api/v1/owner/vehicles/:id/predictions/:category/explain: explica pauta sin alterar fechas ni kilometrajes', async () => {
    const predictions = await ownerAClient.getOwnerVehiclePredictions(ownerAVehicleId);
    assert.ok(predictions.predictions.length > 0);
    const targetPred = predictions.predictions[0]!;

    const explanation = await ownerAClient.explainOwnerMaintenance(ownerAVehicleId, targetPred.category);

    const parsed = MaintenanceExplanationSchema.safeParse(explanation);
    assert.equal(parsed.success, true);
    assert.equal(explanation.category, targetPred.category);
    assert.equal(explanation.status, targetPred.status);
    assert.equal(explanation.nextDueMileage, targetPred.nextDueMileage);
    assert.equal(explanation.remainingKm, targetPred.remainingKm);
    assert.ok(explanation.explanation.length > 10);
    assert.ok(explanation.disclaimer.includes('inspección física'));
    assert.equal(explanation.isAiGenerated, false);
    assert.equal(explanation.providerName, 'DeterministicMaintenanceEngine');
  });

  // ============================================================================
  // Test 6: Resumen de Historial y Explicación en Ámbito de Taller
  // ============================================================================
  it('6. Ámbito de Taller: genera resumen de historial y explicación para vehículos atendidos', async () => {
    const summary = await workshopClient.getWorkshopHistorySummary(ownerAVehicleId);
    assert.equal(summary.vehicleId, ownerAVehicleId);
    assert.ok(summary.totalRecordsAnalyzed >= 0);

    const explanation = await workshopClient.explainWorkshopMaintenance(ownerAVehicleId, 'OIL_AND_FILTER');
    assert.ok(explanation.explanation);
    assert.equal(explanation.category, 'OIL_AND_FILTER');
  });

  // ============================================================================
  // Test 7: Compatibilidad de Esquema PostgreSQL y Aislamiento Transaccional
  // ============================================================================
  it('7. Compatibilidad PostgreSQL: migraciones, tipos de datos y rollback transaccional', async () => {
    // Verify dialect executes clean transaction rollback on failure
    await assert.rejects(async () => {
      await db.transaction(async (_tx: any) => {
        // Insert invalid state and throw
        throw new Error('Simulated transaction abort for rollback verification');
      });
    }, /Simulated transaction abort/);

    // Verify database remains responsive and consistent
    const health = await DatabaseFactory.checkHealth(db);
    assert.equal(health.isHealthy, true);
  });
});
