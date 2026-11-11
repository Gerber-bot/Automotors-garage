import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { eq, and } from 'drizzle-orm';

import { DatabaseFactory, DatabaseMigrator, vehicles, maintenanceRecords, workshopMembers } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { MockAIProvider } from '../../apps/backend/src/modules/maintenance-intelligence/adapters/mock-ai.adapter.ts';
import { PreventiveConsultationResponseSchema } from '../../apps/backend/src/modules/maintenance-intelligence/domain/ai-types.ts';
import { ApiClient, ApiError } from '../../apps/frontend/src/api/client.ts';

describe('Automotors AI Core — Preventive Maintenance Consultation Suite', () => {
  let db: Awaited<ReturnType<typeof DatabaseFactory.createInMemoryTestDb>>;
  let mockAi: MockAIProvider;
  let server: http.Server;
  let baseUrl: string;

  let valeriaClient: ApiClient;
  let secondOwnerClient: ApiClient;
  let alphaWorkshopClient: ApiClient;
  let betaWorkshopClient: ApiClient;

  let secondOwnerVehicleWithRuleId: string;
  let secondOwnerEmptyUnverifiedVehicleId: string;

  before(async () => {
    db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);
    await new DemoSeeder(db).seed();

    mockAi = new MockAIProvider();
    mockAi.setConfigured(true);

    const app = new HttpApp({ db, aiProvider: mockAi });
    server = app.createServer();

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        }
        resolve();
      });
    });

    valeriaClient = new ApiClient({ baseUrl });
    secondOwnerClient = new ApiClient({ baseUrl });
    alphaWorkshopClient = new ApiClient({ baseUrl });
    betaWorkshopClient = new ApiClient({ baseUrl });

    const loginValeria = await valeriaClient.login('valeria@miautomotors.com', 'Password123!');
    valeriaClient.setAuthSession(loginValeria.token, null);

    const regSecondOwner = await secondOwnerClient.registerOwner({
      email: 'martin.propietario@example.com',
      password: 'Password123!',
      fullName: 'Martín Propietario Privado',
      phone: '+54 9 11 4444-9999',
    });
    secondOwnerClient.setAuthSession(regSecondOwner.token, null);

    // Owner B creates a vehicle that matches a verified rule in maintenance_intervals (Toyota Corolla, 10,000 km / 12m)
    const createdCorolla = await secondOwnerClient.createOwnerVehicle({
      make: 'Toyota',
      model: 'Corolla 2.0 SEG',
      year: 2022,
      plate: 'AF999AI',
      currentMileage: 28500,
      vin: '9BRBL42E4N9999991',
      engine: '2.0 Dynamic Force',
    });
    secondOwnerVehicleWithRuleId = createdCorolla.id;

    // Owner B records a previous oil service at 20,000 km
    await secondOwnerClient.createOwnerMaintenanceRecord(secondOwnerVehicleWithRuleId, {
      category: 'OIL_AND_FILTER',
      description: 'Cambio de aceite sintético 0W20 y filtro Toyota',
      recordedMileage: 20000,
      serviceDate: '2026-03-15T12:00:00.000Z',
      workshopName: 'Concesionario Toyota Sur',
      observations: 'Nota interna con teléfono +54 11 5555-1234 y costo privado',
      cost: 115000,
    });

    // Owner B creates a second vehicle with 0 history and no verified rules
    const createdCustom = await secondOwnerClient.createOwnerVehicle({
      make: 'Fiat',
      model: 'Cronos 1.3 Drive',
      year: 2023,
      plate: 'AG111CR',
      currentMileage: 14200,
      engine: '1.3 GSE Firefly',
    });
    secondOwnerEmptyUnverifiedVehicleId = createdCustom.id;

    const loginAlpha = await alphaWorkshopClient.login(
      'mario@alphamotors.com',
      'Password123!',
      DEMO_IDS.WORKSHOP_ALPHA
    );
    alphaWorkshopClient.setAuthSession(loginAlpha.token, DEMO_IDS.WORKSHOP_ALPHA);

    const loginBeta = await betaWorkshopClient.login(
      'carlos@betaservice.com',
      'Password123!',
      DEMO_IDS.WORKSHOP_BETA
    );
    betaWorkshopClient.setAuthSession(loginBeta.token, DEMO_IDS.WORKSHOP_BETA);
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (db) {
      await db.$client.close();
    }
  });

  it('1. Consulta autorizada: calcula y explica mantenimiento preventivo con separación entre hechos, inferencias y faltantes', async () => {
    const result = await secondOwnerClient.consultOwnerPreventiveMaintenance(
      secondOwnerVehicleWithRuleId,
      {
        category: 'OIL_AND_FILTER',
        question: '¿Cuándo me toca el próximo cambio de aceite y cuántos kilómetros restan?',
      }
    );

    const parsed = PreventiveConsultationResponseSchema.safeParse(result);
    assert.equal(parsed.success, true);
    assert.equal(result.vehicleId, secondOwnerVehicleWithRuleId);
    assert.equal(result.category, 'OIL_AND_FILTER');

    // Last service at 20,000 km + 10,000 km verified rule = 30,000 km next due; current = 28,500 km -> 1,500 km remaining (OK)
    assert.equal(result.deterministicCalculation.status, 'OK');
    assert.equal(result.deterministicCalculation.nextDueMileage, 30000);
    assert.equal(result.deterministicCalculation.remainingKm, 1500);
    assert.equal(result.deterministicCalculation.ruleVerificationStatus, 'VERIFIED');

    assert.ok(result.confirmedFacts.length >= 3);
    assert.ok(result.confirmedFacts.some((f) => f.includes('28.500')));
    assert.ok(result.confirmedFacts.some((f) => f.includes('20.000')));
    assert.ok(result.confirmedFacts.some((f) => f.includes('10.000')));
    assert.ok(result.inferences.length >= 1);
    assert.ok(result.unknownOrMissingData.length >= 1);

    assert.deepEqual(result.toolsInvoked, [
      'read_authorized_vehicle_context',
      'read_authorized_maintenance_history',
      'read_technical_maintenance_rules',
      'run_deterministic_preventive_engine',
    ]);
    assert.equal(result.privacy.mode, 'DETERMINISTIC_FALLBACK');
    assert.equal(result.privacy.externalProviderUsed, false);
  });

  it('2. Acceso denegado: rechaza solicitudes no autenticadas (401) y roles de taller sin permiso de cálculo (403)', async () => {
    const unauthClient = new ApiClient({ baseUrl });
    await assert.rejects(
      async () =>
        await unauthClient.consultOwnerPreventiveMaintenance(secondOwnerVehicleWithRuleId, {
          category: 'OIL_AND_FILTER',
        }),
      (err: unknown) => err instanceof ApiError && err.statusCode === 401
    );

    // Downgrade Mario in Workshop Alpha to VIEWER and verify 403 even with elevated permission override
    const memberClause = and(
      eq(workshopMembers.userId, DEMO_IDS.USER_MARIO),
      eq(workshopMembers.workshopId, DEMO_IDS.WORKSHOP_ALPHA)
    );
    await db
      .update(workshopMembers)
      .set({ role: 'VIEWER', permissions: ['READ', 'CALCULATE_PREVENTIVE'] })
      .where(memberClause);

    try {
      await assert.rejects(
        async () =>
          await alphaWorkshopClient.consultWorkshopPreventiveMaintenance(DEMO_IDS.VEHICLE_VW_GOLF, {
            category: 'OIL_AND_FILTER',
          }),
        (err: unknown) => err instanceof ApiError && err.statusCode === 403
      );
    } finally {
      await db.update(workshopMembers).set({ role: 'ADMIN', permissions: null }).where(memberClause);
    }
  });

  it('3. Aislamiento entre usuarios y talleres: impide acceso cruzado entre propietarios y entre talleres', async () => {
    // Owner A (Valeria) cannot consult Owner B's vehicle
    await assert.rejects(
      async () =>
        await valeriaClient.consultOwnerPreventiveMaintenance(secondOwnerVehicleWithRuleId, {
          category: 'OIL_AND_FILTER',
        }),
      (err: unknown) => err instanceof ApiError && err.statusCode === 403
    );

    // Owner B cannot consult Valeria's Renault Logan
    await assert.rejects(
      async () =>
        await secondOwnerClient.consultOwnerPreventiveMaintenance(
          DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER,
          { category: 'OIL_AND_FILTER' }
        ),
      (err: unknown) => err instanceof ApiError && err.statusCode === 403
    );

    // Workshop Beta cannot consult Workshop Alpha's serviced vehicle (VW Golf)
    await assert.rejects(
      async () =>
        await betaWorkshopClient.consultWorkshopPreventiveMaintenance(DEMO_IDS.VEHICLE_VW_GOLF, {
          category: 'OIL_AND_FILTER',
        }),
      (err: unknown) => err instanceof ApiError && err.statusCode === 403
    );

    // Workshop Alpha cannot consult Valeria's private owner vehicle
    await assert.rejects(
      async () =>
        await alphaWorkshopClient.consultWorkshopPreventiveMaintenance(
          DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER,
          { category: 'OIL_AND_FILTER' }
        ),
      (err: unknown) => err instanceof ApiError && err.statusCode === 403
    );

    // Workshop Alpha CAN consult its own serviced vehicle (VW Golf)
    const alphaResult = await alphaWorkshopClient.consultWorkshopPreventiveMaintenance(
      DEMO_IDS.VEHICLE_VW_GOLF,
      { category: 'OIL_AND_FILTER' }
    );
    assert.equal(alphaResult.vehicleId, DEMO_IDS.VEHICLE_VW_GOLF);
    assert.equal(alphaResult.deterministicCalculation.nextDueMileage, 60000);
    assert.equal(alphaResult.deterministicCalculation.remainingKm, 1600);
  });

  it('4. Vehículo inexistente: devuelve 404 para UUID inexistente o identificador inválido', async () => {
    await assert.rejects(
      async () =>
        await valeriaClient.consultOwnerPreventiveMaintenance(
          '00000000-0000-4000-8000-999999999999',
          { category: 'OIL_AND_FILTER' }
        ),
      (err: unknown) => err instanceof ApiError && err.statusCode === 404
    );

    await assert.rejects(
      async () =>
        await valeriaClient.consultOwnerPreventiveMaintenance('invalid-id', {
          category: 'OIL_AND_FILTER',
        }),
      (err: unknown) => err instanceof ApiError && err.statusCode === 404
    );
  });

  it('5. Historial vacío: reconoce ausencia de antecedentes previos sin inventar servicios', async () => {
    // Query SPARK_PLUGS on Owner B's Corolla (which only has an OIL_AND_FILTER record, 0 SPARK_PLUGS records)
    // and check empty history vehicle as well
    const emptyHistoryResult = await secondOwnerClient.consultOwnerPreventiveMaintenance(
      secondOwnerEmptyUnverifiedVehicleId,
      { category: 'OIL_AND_FILTER' }
    );

    assert.ok(
      emptyHistoryResult.unknownOrMissingData.some((m) =>
        m.includes('no posee registros en su historial')
      )
    );
    assert.equal(
      emptyHistoryResult.sources.some((s) => s.sourceType === 'MAINTENANCE_HISTORY'),
      false
    );
  });

  it('6. Datos técnicos insuficientes: devuelve INSUFFICIENT_DATA sin inventar intervalos cuando la regla no está verificada o falta', async () => {
    // Valeria's Renault Logan 2020 has rules in PENDING_VERIFICATION
    const loganResult = await valeriaClient.consultOwnerPreventiveMaintenance(
      DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER,
      {
        category: 'TIMING_BELT',
        question: '¿Cada cuánto se cambia la distribución de mi Logan?',
      }
    );

    assert.equal(loganResult.deterministicCalculation.status, 'INSUFFICIENT_DATA');
    assert.equal(loganResult.deterministicCalculation.nextDueMileage, null);
    assert.equal(loganResult.deterministicCalculation.remainingKm, null);
    assert.equal(loganResult.deterministicCalculation.ruleVerificationStatus, 'PENDING_VERIFICATION');
    assert.ok(
      loganResult.unknownOrMissingData.some((m) => m.includes('PENDING_VERIFICATION'))
    );
    assert.ok(
      loganResult.inferences.some((i) => i.toLowerCase().includes('cadena'))
    );

    // Vehicle with no rule at all in KB or maintenance_intervals (Fiat Cronos)
    const cronosResult = await secondOwnerClient.consultOwnerPreventiveMaintenance(
      secondOwnerEmptyUnverifiedVehicleId,
      { category: 'BRAKES' }
    );
    assert.equal(cronosResult.deterministicCalculation.status, 'INSUFFICIENT_DATA');
    assert.equal(cronosResult.deterministicCalculation.nextDueMileage, null);
    assert.equal(cronosResult.deterministicCalculation.ruleVerificationStatus, 'NONE');
    assert.ok(
      cronosResult.unknownOrMissingData.some((m) =>
        m.includes('No se encontró ninguna regla de intervalo técnico documentada')
      )
    );
  });

  it('7. Proveedor de IA falso y privacidad: exige consentimiento, minimiza datos (0 PII) y preserva números deterministas', async () => {
    let capturedPrompt = '';
    mockAi.setCustomCompletion((prompt) => {
      capturedPrompt = prompt;
      return JSON.stringify({
        answer:
          'Explicación generada por proveedor de prueba: próximo cambio de aceite a los 30.000 km (restan 1.500 km) según pauta verificada.',
        confirmedFacts: ['Servicio previo verificado a los 20.000 km.'],
        inferences: ['Desgaste dentro de parámetros normales de circulación.'],
        unknownOrMissingData: ['Condiciones de uso severo no informadas.'],
      });
    });

    // Without consent, MockAIProvider must NOT be called
    const noConsentRes = await secondOwnerClient.consultOwnerPreventiveMaintenance(
      secondOwnerVehicleWithRuleId,
      {
        category: 'OIL_AND_FILTER',
        allowExternalAi: false,
        privacyConsent: false,
      }
    );
    assert.equal(noConsentRes.privacy.externalProviderUsed, false);
    assert.equal(noConsentRes.privacy.mode, 'DETERMINISTIC_FALLBACK');
    assert.equal(capturedPrompt, '');

    // With explicit consent, MockAIProvider is called with minimized context
    const withConsentRes = await secondOwnerClient.consultOwnerPreventiveMaintenance(
      secondOwnerVehicleWithRuleId,
      {
        category: 'OIL_AND_FILTER',
        question: 'Mi correo es martin.propietario@example.com, ¿cuándo toca el cambio de aceite?',
        allowExternalAi: true,
        privacyConsent: true,
      }
    );

    assert.equal(withConsentRes.privacy.externalProviderUsed, true);
    assert.equal(withConsentRes.privacy.mode, 'EXTERNAL_AI_ASSISTED');
    assert.equal(withConsentRes.privacy.providerName, 'MockAIProvider');
    assert.equal(withConsentRes.privacy.piiSentToExternalProvider, false);

    // Verify deterministic values are anchored and unchanged
    assert.equal(withConsentRes.deterministicCalculation.status, 'OK');
    assert.equal(withConsentRes.deterministicCalculation.nextDueMileage, 30000);
    assert.equal(withConsentRes.deterministicCalculation.remainingKm, 1500);

    // Verify capturedPrompt contains NO PII, NO plate, NO VIN, NO owner name, NO private notes
    assert.ok(capturedPrompt.length > 0);
    assert.doesNotMatch(capturedPrompt, /martin\.propietario@example\.com/i);
    assert.doesNotMatch(capturedPrompt, /Martín Propietario/i);
    assert.doesNotMatch(capturedPrompt, /4444-9999/);
    assert.doesNotMatch(capturedPrompt, /5555-1234/);
    assert.doesNotMatch(capturedPrompt, /AF999AI/);
    assert.doesNotMatch(capturedPrompt, /9BRBL42E4N9999991/);
    assert.doesNotMatch(capturedPrompt, /115000/);
  });

  it('8. Respuestas con fuentes correctas: incluye ficha del vehículo, historial, regla técnica y motor determinista', async () => {
    const result = await secondOwnerClient.consultOwnerPreventiveMaintenance(
      secondOwnerVehicleWithRuleId,
      { category: 'OIL_AND_FILTER' }
    );

    const sourceTypes = result.sources.map((s) => s.sourceType);
    assert.ok(sourceTypes.includes('VEHICLE_PROFILE'));
    assert.ok(sourceTypes.includes('MAINTENANCE_HISTORY'));
    assert.ok(sourceTypes.includes('KNOWLEDGE_BASE_RULE'));
    assert.ok(sourceTypes.includes('DETERMINISTIC_ENGINE'));

    const ruleSource = result.sources.find((s) => s.sourceType === 'KNOWLEDGE_BASE_RULE');
    assert.ok(ruleSource);
    assert.equal(ruleSource.sourceId, DEMO_IDS.RULE_TOYOTA_OIL);
    assert.equal(ruleSource.verificationStatus, 'VERIFIED');
  });

  it('9. Fallo del proveedor externo: degrada de forma segura al modo determinista ante timeout o JSON inválido', async () => {
    mockAi.setSimulateTimeout(true);
    try {
      const timeoutRes = await secondOwnerClient.consultOwnerPreventiveMaintenance(
        secondOwnerVehicleWithRuleId,
        {
          category: 'OIL_AND_FILTER',
          allowExternalAi: true,
          privacyConsent: true,
        }
      );
      assert.equal(timeoutRes.privacy.mode, 'DETERMINISTIC_FALLBACK');
      assert.equal(timeoutRes.privacy.externalProviderUsed, false);
      assert.equal(timeoutRes.privacy.fallbackReason, 'EXTERNAL_PROVIDER_ERROR');
      assert.equal(timeoutRes.deterministicCalculation.nextDueMileage, 30000);
      assert.equal(timeoutRes.deterministicCalculation.remainingKm, 1500);
    } finally {
      mockAi.setSimulateTimeout(false);
    }

    mockAi.setCustomCompletion(() => '{ broken json ');
    try {
      const malformedRes = await secondOwnerClient.consultOwnerPreventiveMaintenance(
        secondOwnerVehicleWithRuleId,
        {
          category: 'OIL_AND_FILTER',
          allowExternalAi: true,
          privacyConsent: true,
        }
      );
      assert.equal(malformedRes.privacy.mode, 'DETERMINISTIC_FALLBACK');
      assert.equal(malformedRes.privacy.externalProviderUsed, false);
      assert.equal(malformedRes.privacy.fallbackReason, 'EXTERNAL_PROVIDER_ERROR');
      assert.equal(malformedRes.deterministicCalculation.nextDueMileage, 30000);
    } finally {
      mockAi.setCustomCompletion(() => '');
    }
  });

  it('10. Ausencia de modificaciones de datos: la consulta no altera vehículos, historiales ni membresías', async () => {
    const [beforeVehicles, beforeRecords, beforeMembers] = await Promise.all([
      db.select().from(vehicles),
      db.select().from(maintenanceRecords),
      db.select().from(workshopMembers),
    ]);

    await secondOwnerClient.consultOwnerPreventiveMaintenance(secondOwnerVehicleWithRuleId, {
      category: 'OIL_AND_FILTER',
    });
    await valeriaClient.consultOwnerPreventiveMaintenance(DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER, {
      category: 'OIL_AND_FILTER',
    });
    await alphaWorkshopClient.consultWorkshopPreventiveMaintenance(DEMO_IDS.VEHICLE_VW_GOLF, {
      category: 'OIL_AND_FILTER',
    });

    const [afterVehicles, afterRecords, afterMembers] = await Promise.all([
      db.select().from(vehicles),
      db.select().from(maintenanceRecords),
      db.select().from(workshopMembers),
    ]);

    assert.deepEqual(afterVehicles, beforeVehicles);
    assert.deepEqual(afterRecords, beforeRecords);
    assert.deepEqual(afterMembers, beforeMembers);
  });
});
