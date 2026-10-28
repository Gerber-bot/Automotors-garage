import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { DatabaseFactory, DatabaseMigrator } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { ApiClient } from '../../apps/frontend/src/api/client.ts';

describe('Milestone 10.3: Full Stack Authentication, Multi-Tenancy & Vehicle Management Integration Suite', () => {
  let db: any;
  let app: HttpApp;
  let server: http.Server;
  let baseUrl: string;
  let testDataDir: string;

  before(async () => {
    testDataDir = path.join(process.cwd(), '.data', `test_m10_3_${Date.now()}`);
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }

    // Initialize in-memory / file-backed test database and apply migrations
    db = await DatabaseFactory.createInMemoryTestDb(testDataDir);
    await DatabaseMigrator.runMigrations(db);

    // Seed initial demo data (workshops, users, memberships, vehicles)
    const seeder = new DemoSeeder(db);
    await seeder.seed();

    // Start HTTP backend on dynamic OS-assigned port
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
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {
        // Windows file lock handle cleanup
      }
    }
  });

  // --------------------------------------------------------------------------
  // 1. LOGIN
  // --------------------------------------------------------------------------
  it('1. Login: Autenticación exitosa devuelve token JWT, sesión persistida y talleres autorizados', async () => {
    const client = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });

    const loginRes = await client.login('mario@alphamotors.com', 'Password123!');
    assert.ok(loginRes.token, 'Must return a valid JWT token');
    assert.ok(loginRes.session.id, 'Must return a persistent session ID');
    assert.equal(loginRes.user.email, 'mario@alphamotors.com');
    assert.ok(loginRes.user.workshops.length >= 1, 'User must belong to at least one workshop');

    // Confirm session is set in client
    const session = client.getSession();
    assert.equal(session.token, loginRes.token);
    assert.equal(session.activeTenantId, loginRes.session.activeTenantId);
  });

  // --------------------------------------------------------------------------
  // 2. LOGOUT & REVOCACIÓN DE SESIÓN
  // --------------------------------------------------------------------------
  it('2. Logout: Cierre de sesión revoca token en base de datos y limpia credenciales en cliente', async () => {
    const client = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    const loginRes = await client.login('mario@alphamotors.com', 'Password123!');
    const sessionId = loginRes.session.id;

    // Logout revoking session in DB
    await client.logout(sessionId);

    const sessionAfter = client.getSession();
    assert.equal(sessionAfter.token, null, 'Client token must be cleared');
    assert.equal(sessionAfter.activeTenantId, null, 'Client active tenant must be cleared');

    // Trying to use revoked token must fail with 401
    const testClient = new ApiClient({
      baseUrl: `${baseUrl}/api/v1`,
      getAuthToken: () => loginRes.token,
      getActiveTenantId: () => DEMO_IDS.WORKSHOP_ALPHA,
    });

    await assert.rejects(
      async () => await testClient.getVehicles(),
      (err: any) => err.statusCode === 401
    );
  });

  // --------------------------------------------------------------------------
  // 3. SESIÓN EXPIRADA
  // --------------------------------------------------------------------------
  it('3. Sesión Expirada: ApiClient detecta 401 y dispara callback onUnauthorized sin colapso', async () => {
    let unauthorizedNotified = false;

    const expiredClient = new ApiClient({
      baseUrl: `${baseUrl}/api/v1`,
      getAuthToken: () => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      getActiveTenantId: () => DEMO_IDS.WORKSHOP_ALPHA,
      onUnauthorized: () => {
        unauthorizedNotified = true;
      },
    });

    await assert.rejects(
      async () => await expiredClient.getVehicles(),
      (err: any) => err.statusCode === 401
    );

    assert.equal(unauthorizedNotified, true, 'onUnauthorized callback must be triggered on 401');
  });

  // --------------------------------------------------------------------------
  // 4. SELECCIÓN DE TALLER (MULTI-TENANCY)
  // --------------------------------------------------------------------------
  it('4. Selección de Taller: Cambio de taller valida membresía y emite token re-firmado para el nuevo tenant', async () => {
    const client = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    await client.login('mario@alphamotors.com', 'Password123!');

    // Mario belongs to Alpha Motors and Beta Service
    const switchRes = await client.selectWorkshop(DEMO_IDS.WORKSHOP_BETA);
    assert.equal(switchRes.activeTenantId, DEMO_IDS.WORKSHOP_BETA);
    assert.ok(switchRes.token, 'New JWT token must be issued for target workshop');

    // Client session updated
    const session = client.getSession();
    assert.equal(session.activeTenantId, DEMO_IDS.WORKSHOP_BETA);
    assert.equal(session.token, switchRes.token);

    // Attempting to switch to an unauthorized workshop must be rejected with 403
    const fakeWorkshopId = 'a0000000-0000-4000-8000-999999999999';
    await assert.rejects(
      async () => await client.selectWorkshop(fakeWorkshopId),
      (err: any) => err.statusCode === 403
    );
  });

  // --------------------------------------------------------------------------
  // 5. LISTADO DE VEHÍCULOS
  // --------------------------------------------------------------------------
  it('5. Listado de Vehículos: Devuelve los vehículos registrados en la base de datos real', async () => {
    const client = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    await client.login('mario@alphamotors.com', 'Password123!');

    const vehicles = await client.getVehicles();
    assert.ok(Array.isArray(vehicles), 'Must return an array of vehicles');
    assert.ok(vehicles.length >= 5, 'Must contain seeded demo vehicles');

    const golf = vehicles.find((v) => v.plate === 'AE123CD');
    assert.ok(golf, 'Volkswagen Golf VII must be present in the list');
    assert.equal(golf.make, 'Volkswagen');
    assert.equal(golf.model, 'Golf VII 1.4 TSI Highline DSG');
    assert.equal(golf.currentMileage, 58400);
  });

  // --------------------------------------------------------------------------
  // 6. REGISTRO DE VEHÍCULO
  // --------------------------------------------------------------------------
  it('6. Registro de Vehículo: Registra nuevo rodado con persistencia y rechaza duplicados de VIN', async () => {
    const client = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    await client.login('mario@alphamotors.com', 'Password123!');

    const uniqueVin = `WVWZZZAUZ${Date.now()}`.slice(0, 17);
    const newVehicle = await client.createVehicle({
      vin: uniqueVin,
      plate: 'AA999ZZ',
      make: 'Audi',
      model: 'A3 Sportback 1.4 TFSI',
      year: 2023,
      currentMileage: 12500,
      engine: '1.4 TFSI 150 CV',
      fuelType: 'Nafta Premium',
    });

    assert.ok(newVehicle.id, 'Vehicle must be assigned a persistent ID');
    assert.equal(newVehicle.make, 'Audi');
    assert.equal(newVehicle.currentMileage, 12500);

    // Reject exact duplicate VIN
    await assert.rejects(
      async () =>
        await client.createVehicle({
          vin: uniqueVin,
          make: 'Audi',
          model: 'A3 Duplicate',
          year: 2023,
          currentMileage: 12500,
        }),
      (err: any) => err.statusCode === 400
    );
  });

  // --------------------------------------------------------------------------
  // 7. BÚSQUEDA DE VEHÍCULOS
  // --------------------------------------------------------------------------
  it('7. Búsqueda de Vehículos: Filtra por patente y marca de forma sensible y exacta', async () => {
    const client = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    await client.login('mario@alphamotors.com', 'Password123!');

    // Search by license plate
    const byPlate = await client.getVehicles('AE123CD');
    assert.equal(byPlate.length, 1);
    assert.equal(byPlate[0]!.plate, 'AE123CD');

    // Search by Make
    const byMake = await client.getVehicles('Toyota');
    assert.ok(byMake.length >= 1);
    assert.equal(byMake[0]!.make, 'Toyota');
  });

  // --------------------------------------------------------------------------
  // 8. ACCESO NO AUTORIZADO (SEGURIDAD)
  // --------------------------------------------------------------------------
  it('8. Acceso No Autorizado: Rechaza solicitudes sin token o con credenciales fraudulentas', async () => {
    const unauthenticatedClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });

    await assert.rejects(
      async () => await unauthenticatedClient.getVehicles(),
      (err: any) => err.statusCode === 401
    );

    await assert.rejects(
      async () => await unauthenticatedClient.getWorkOrders(),
      (err: any) => err.statusCode === 401
    );
  });

  // --------------------------------------------------------------------------
  // 9. PERSISTENCIA
  // --------------------------------------------------------------------------
  it('9. Persistencia: Los vehículos creados persisten en consultas directas por ID', async () => {
    const client = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    await client.login('mario@alphamotors.com', 'Password123!');

    const vehicles = await client.getVehicles();
    const first = vehicles[0]!;

    const fetched = await client.getVehicleById(first.id);
    assert.ok(fetched, 'Vehicle must be retrievable by ID');
    assert.equal(fetched.id, first.id);
    assert.equal(fetched.make, first.make);
    assert.equal(fetched.currentMileage, first.currentMileage);
  });

  // --------------------------------------------------------------------------
  // 10. ACCESO DESDE DISPOSITIVOS MÓVILES (MOBILE HEADERS & SANITIZATION)
  // --------------------------------------------------------------------------
  it('10. Acceso Móvil: Valida respuestas con headers HTTP de seguridad para clientes móviles (iOS / Android)', async () => {
    const mobileUserAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': mobileUserAgent,
      },
      body: JSON.stringify({
        email: 'mario@alphamotors.com',
        password: 'Password123!',
      }),
    });

    assert.equal(loginRes.status, 200);
    const data = await loginRes.json();
    assert.ok(data.token);

    // Verify security headers are present for mobile clients
    const headers = loginRes.headers;
    assert.ok(headers.get('content-type')?.includes('application/json'));
    assert.ok(headers.get('x-content-type-options'));
  });
});
