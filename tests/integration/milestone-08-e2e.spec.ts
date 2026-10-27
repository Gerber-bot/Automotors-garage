import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import * as fs from 'node:fs';
import { DatabaseFactory, DatabaseMigrator, type DatabaseInstance } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';

describe('Milestone 08: Full Stack Integration, E2E & Demo Readiness Test Suite', () => {
  let db: DatabaseInstance;
  let app: HttpApp;
  let server: Server;
  let baseUrl: string;
  const testDataDir = './.data/test-m08-pg';

  before(async () => {
    // Clean test directory if present
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }

    // Initialize persistent embedded PostgreSQL engine
    db = await DatabaseFactory.createInMemoryTestDb(testDataDir);
    await DatabaseMigrator.runMigrations(db);

    // Seed initial demo data
    const seeder = new DemoSeeder(db);
    await seeder.seed();

    // Start HTTP server on dynamic port
    app = new HttpApp({ db });
    server = app.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean up persistent directory
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {
        // file lock on windows may delay removal
      }
    }
  });

  // -------------------------------------------------------------
  // CRITERIO 1: Observabilidad, Healthchecks y Frontend Web UI
  // -------------------------------------------------------------
  it('1. Observabilidad: /health/live y /health/ready devuelven estado y x-request-id', async () => {
    const liveRes = await fetch(`${baseUrl}/health/live`);
    assert.equal(liveRes.status, 200);
    const liveData = await liveRes.json();
    assert.equal(liveData.status, 'UP');
    assert.ok(liveRes.headers.get('x-request-id'), 'Must provide x-request-id header');

    const readyRes = await fetch(`${baseUrl}/health/ready`);
    assert.equal(readyRes.status, 200);
    const readyData = await readyRes.json();
    assert.equal(readyData.status, 'READY');
    assert.equal(readyData.database, 'HEALTHY');
    assert.ok(typeof readyData.latencyMs === 'number');
  });

  it('2. Servidor Web: GET / y GET /demo sirven la aplicación interactiva para Mauricio', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type')?.includes('text/html'), true);
    const html = await res.text();
    assert.ok(html.includes('AUTOMOTORS GARAGE'));
    assert.ok(html.includes('Quick Service Entry'));
    assert.ok(html.includes('Volkswagen Golf VII'));
    assert.ok(html.includes('DEMO — MAURICIO REVIEW'));
  });

  it('3. Re-sembrado Demo: POST /api/v1/demo/seed es idempotente y seguro', async () => {
    const seedRes = await fetch(`${baseUrl}/api/v1/demo/seed`, { method: 'POST' });
    assert.equal(seedRes.status, 200);
    const data = await seedRes.json();
    assert.ok(data.seedResult.vehiclesCount >= 5);
  });

  // -------------------------------------------------------------
  // CRITERIO 2: Flujo Principal Completo (15 Pasos)
  // -------------------------------------------------------------
  it('4. Flujo Principal (Pasos 1 a 11): Login, selección de taller, vehículo, orden, cierre atómico y prevención OEM', async () => {
    // Paso 1: Iniciar sesión como mecánico
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mario@alphamotors.com',
        password: 'Password123!',
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    const token = loginData.token;
    const sessionId = loginData.session.id;
    assert.ok(token);
    assert.equal(loginData.user.email, 'mario@alphamotors.com');

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA,
    };

    // Paso 2: Seleccionar taller y verificar membresía
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: authHeaders });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.activeTenantId, DEMO_IDS.WORKSHOP_ALPHA);

    // Paso 3: Consultar vehículos
    const vehListRes = await fetch(`${baseUrl}/api/v1/vehicles`, { headers: authHeaders });
    assert.equal(vehListRes.status, 200);
    const vehList = await vehListRes.json();
    assert.ok(vehList.length >= 5);

    // Paso 4: Registrar un vehículo nuevo (Volkswagen Golf GTI 2021)
    const newVin = 'WVWZZZAUZMP999999';
    const createVehRes = await fetch(`${baseUrl}/api/v1/vehicles`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vin: newVin,
        plate: 'AG999ZZ',
        make: 'Volkswagen',
        model: 'Golf GTI MK7.5',
        year: 2021,
        engine: '2.0 TSI 230 CV (EA888)',
        fuelType: 'Nafta Premium',
        currentMileage: 42000,
      }),
    });
    assert.equal(createVehRes.status, 201);
    const createdVehicle = await createVehRes.json();
    assert.equal(createdVehicle.vin, newVin);
    const vehicleId = createdVehicle.id || createdVehicle.vehicleId;

    // Paso 5 & 6: Crear orden de trabajo indicando kilometraje (45,000 km)
    const createWoRes = await fetch(`${baseUrl}/api/v1/work-orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicleId,
        customerId: DEMO_IDS.CUSTOMER_MAURICIO,
        reportedMileage: 45000,
        reportedIssue: 'Service de rutina y cambio de aceite',
        initialCondition: 'Sin detalles de chapa ni fugas',
        diagnosis: 'Inspección visual general OK',
        interventions: [{ title: 'Aceite Sintético 5W40 y Filtro' }],
      }),
    });
    assert.equal(createWoRes.status, 201);
    const createdWo = await createWoRes.json();
    const workOrderId = createdWo.id;
    assert.ok(workOrderId);

    // Paso 7, 8 & 9: Registrar cambio de aceite, observaciones y cerrar la orden atómicamente
    const closeWoRes = await fetch(`${baseUrl}/api/v1/work-orders/${workOrderId}/close`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idempotencyKey: `flow-close-${Date.now()}`,
        internalNotes: 'Aceite Sintético 5W40 VW 502.00 colocado. Filtro nuevo. Todo en orden.',
        partsCost: 65000,
        laborCost: 25000,
      }),
    });
    assert.equal(closeWoRes.status, 200);
    const closeResult = await closeWoRes.json();
    assert.equal(closeResult.status, 'COMPLETED');

    // Paso 10: Consultar historial actualizado y comprobar inmutabilidad y odómetro actualizado
    const passportRes = await fetch(`${baseUrl}/api/v1/vehicles/${vehicleId}/passport`, {
      headers: authHeaders,
    });
    assert.equal(passportRes.status, 200);
    const passport = await passportRes.json();
    assert.equal(passport.vehicle.currentMileage, 45000, 'Vehicle odometer must be updated to 45,000 km');
    assert.ok(passport.timeline.length >= 1, 'Maintenance record must be created');
    assert.equal(passport.timeline[0].isCertified, true);

    // Paso 11: Calcular próximo mantenimiento preventivo con reglas OEM
    const calcRes = await fetch(`${baseUrl}/api/v1/maintenance/calculate-preventive`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicleId,
        currentMileage: 45000,
        currentDate: '2026-10-27T00:00:00Z',
        history: [{ date: '2026-10-27T00:00:00Z', mileage: 45000 }],
        intervals: [
          {
            category: 'OIL_AND_FILTER',
            intervalKm: 15000,
            intervalMonths: 12,
            sourceCitation: 'Manual Plan de Mantenimiento VW Golf VII (pág. 24)',
          },
        ],
      }),
    });
    assert.equal(calcRes.status, 200);
    const calcData = await calcRes.json();
    assert.equal(calcData.nextDueMileage, 60000, 'Next due mileage must be exactly 60,000 km');
    assert.equal(calcData.remainingKm, 15000);

    // Paso 12: Cerrar sesión
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.equal(logoutRes.status, 200);
  });

  // -------------------------------------------------------------
  // CRITERIO 3: Resiliencia y Supervivencia ante Reinicios (Pasos 13 a 15)
  // -------------------------------------------------------------
  it('5. Resiliencia ante reinicio (Pasos 13 a 15): Los datos persisten tras reiniciar el servidor', async () => {
    // Apagamos el servidor actual
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Reiniciamos la aplicación HTTP conectando a la base persistente
    const newApp = new HttpApp({ db });
    const newServer = newApp.createServer();

    await new Promise<void>((resolve) => {
      newServer.listen(0, () => {
        const address = newServer.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });

    // Iniciar sesión nuevamente
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mario@alphamotors.com',
        password: 'Password123!',
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
      }),
    });
    assert.equal(loginRes.status, 200);
    const { token } = await loginRes.json();

    // Comprobar que los vehículos persisten tras el reinicio
    const vehRes = await fetch(`${baseUrl}/api/v1/vehicles`, {
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA },
    });
    assert.equal(vehRes.status, 200);
    const vehs = await vehRes.json();
    const persistedGolf = vehs.find((v: any) => v.vin === 'WVWZZZAUZMP999999');
    assert.ok(persistedGolf, 'Vehicle created before restart must still exist');
    assert.equal(persistedGolf.currentMileage, 45000, 'Persisted odometer must remain 45,000 km');

    // Restauramos server para el teardown
    server = newServer;
  });

  // -------------------------------------------------------------
  // CRITERIO 4: Funcionalidad Estrella (Quick Service Entry)
  // -------------------------------------------------------------
  it('6. Quick Service Entry: Registra servicio, actualiza odómetro y cierra orden en una sola transacción', async () => {
    // Login
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lucas@alphamotors.com',
        password: 'Password123!',
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
      }),
    });
    const { token } = await loginRes.json();

    // Ejecutar Quick Service en el Volkswagen Golf destacado de Mauricio
    const qsRes = await fetch(`${baseUrl}/api/v1/work-orders/quick-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA,
      },
      body: JSON.stringify({
        vehicleId: DEMO_IDS.VEHICLE_VW_GOLF,
        odometerKm: 59000,
        interventions: ['Aceite Sintético 5W40 Motul', 'Filtro Mann', 'Escaneo OBD2'],
        observations: 'Quick service de rutina antes de vacaciones.',
        idempotencyKey: `qs-test-${Date.now()}`,
      }),
    });

    assert.equal(qsRes.status, 200);
    const qsData = await qsRes.json();
    assert.equal(qsData.status, 'COMPLETED');
    assert.equal(qsData.odometerKm, 59000);

    // Verificar que el odómetro del VW Golf quedó en 59,000 km
    const golfRes = await fetch(`${baseUrl}/api/v1/vehicles/${DEMO_IDS.VEHICLE_VW_GOLF}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA },
    });
    assert.equal(golfRes.status, 200);
    const golf = await golfRes.json();
    assert.equal(golf.currentMileage, 59000);
  });

  // -------------------------------------------------------------
  // CRITERIO 5: Seguridad E2E y Aislamiento Multi-Tenant (Fase 6)
  // -------------------------------------------------------------
  it('7. Seguridad E2E: Petición sin autenticar es rechazada con 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles`);
    assert.equal(res.status, 401);
    const err = await res.json();
    assert.ok(err.error.includes('Authentication required'));
  });

  it('8. Seguridad E2E: Sesión revocada es rechazada con 401', async () => {
    // Login temporal
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mario@alphamotors.com',
        password: 'Password123!',
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
      }),
    });
    const { token, session } = await loginRes.json();

    // Revocar sesión
    await fetch(`${baseUrl}/api/v1/auth/sessions/${session.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA },
    });

    // Petición posterior con token de sesión revocada
    const afterRevokeRes = await fetch(`${baseUrl}/api/v1/vehicles`, {
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA },
    });
    assert.equal(afterRevokeRes.status, 401);
  });

  it('9. Seguridad E2E: Aislamiento Cross-Tenant — Taller A no puede operar sobre Taller B', async () => {
    // Mecánico de Taller Alpha
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mario@alphamotors.com',
        password: 'Password123!',
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
      }),
    });
    const { token } = await loginRes.json();

    // Intentar acceder con header de Taller Beta falsificado
    const crossTenantRes = await fetch(`${baseUrl}/api/v1/work-orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': DEMO_IDS.WORKSHOP_BETA,
      },
    });

    assert.equal(crossTenantRes.status, 403);
    const err = await crossTenantRes.json();
    assert.ok(err.error.includes('cross-tenant') || crossTenantRes.status === 403);
  });

  it('10. Seguridad E2E: Sanitización de Pasaporte Público — Oculta notas internas del taller', async () => {
    const publicPassportRes = await fetch(
      `${baseUrl}/api/v1/vehicles/${DEMO_IDS.VEHICLE_VW_GOLF}/passport?public=true`
    );
    assert.equal(publicPassportRes.status, 200);
    const passport = await publicPassportRes.json();

    assert.ok(passport.vehicle);
    assert.ok(passport.timeline.length >= 1, 'Timeline must contain at least one certified record');
    for (const record of passport.timeline) {
      assert.equal(record.internalNotes, undefined, 'Public passport must not expose internal workshop notes');
      assert.equal(record.partsCost, undefined, 'Public passport must not expose parts costs');
      assert.equal(record.laborCost, undefined, 'Public passport must not expose labor costs');
    }
  });

  it('11. Seguridad E2E: Idempotencia en cierre de órdenes previene duplicación', async () => {
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mario@alphamotors.com',
        password: 'Password123!',
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
      }),
    });
    const { token } = await loginRes.json();

    const idempotencyKey = `idemp-test-${Date.now()}`;
    const payload = {
      idempotencyKey,
      internalNotes: 'Prueba idempotente',
      partsCost: 10000,
      laborCost: 5000,
    };

    // Primera llamada
    const res1 = await fetch(`${baseUrl}/api/v1/work-orders/${DEMO_IDS.WO_RANGER_92K}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res1.status, 200);

    // Segunda llamada con la misma clave de idempotencia
    const res2 = await fetch(`${baseUrl}/api/v1/work-orders/${DEMO_IDS.WO_RANGER_92K}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.status, 'COMPLETED');
  });

  it('12. Errores de Validación: Payload malformado devuelve 400 sin filtrar stack trace interno', async () => {
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mario@alphamotors.com',
        password: 'Password123!',
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
      }),
    });
    const { token } = await loginRes.json();

    // Kilometraje menor al actual (rechazo de negocio)
    const invalidMileageRes = await fetch(`${baseUrl}/api/v1/work-orders/quick-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA,
      },
      body: JSON.stringify({
        vehicleId: DEMO_IDS.VEHICLE_VW_GOLF,
        odometerKm: 1000, // Menor que 59000
        interventions: ['Aceite'],
      }),
    });

    assert.equal(invalidMileageRes.status, 400);
    const err = await invalidMileageRes.json();
    assert.ok(err.error);
    assert.equal(err.stack, undefined, 'Must not leak stack trace in response');
  });
});
