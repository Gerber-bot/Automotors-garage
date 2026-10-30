import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { DatabaseFactory, DatabaseMigrator, maintenanceIntervals } from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { ApiClient } from '../../apps/frontend/src/api/client.ts';

describe('Milestone 12: Mi Automotors — Owner Portal Foundation, Security & Deterministic Maintenance Suite', () => {
  let db: any;
  let app: HttpApp;
  let server: http.Server;
  let baseUrl: string;
  let testDataDir: string;

  let ownerAClient: ApiClient;
  let ownerBClient: ApiClient;
  let workshopClient: ApiClient;
  let ownerAVehicleId: string;
  let ownerAMaintRecordId: string;

  before(async () => {
    testDataDir = path.join(process.cwd(), '.data', `test_m12_owner_${Date.now()}`);
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
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {
        // Windows file handle cleanup
      }
    }
  });

  // --------------------------------------------------------------------------
  // 1. REGISTRO DE PROPIETARIO (VEHICLE_OWNER) SIN TALLER
  // --------------------------------------------------------------------------
  it('1. Registro de Propietario: Crea cuenta VEHICLE_OWNER sin requerir membresía a taller', async () => {
    const regRes = await ownerAClient.registerOwner({
      fullName: 'Martín Pereyra',
      email: 'martin.owner@miautomotors.com',
      password: 'OwnerPass2026!',
      phone: '+54 9 11 4567-8901',
    });

    assert.ok(regRes.token, 'Must issue JWT access token');
    assert.equal(regRes.session.activeTenantId, null, 'Pure owner session must not be bound to a workshop tenant');
    assert.equal(regRes.user.role, 'VEHICLE_OWNER');
    assert.equal(regRes.user.accountType, 'VEHICLE_OWNER');
    assert.ok(regRes.user.profiles?.includes('VEHICLE_OWNER'));
    assert.equal(regRes.user.workshops.length, 0);

    // Duplicate email registration must fail with 409
    await assert.rejects(
      async () =>
        await ownerBClient.registerOwner({
          fullName: 'Duplicado',
          email: 'martin.owner@miautomotors.com',
          password: 'OwnerPass2026!',
        }),
      (err: any) => err.statusCode === 409
    );
  });

  // --------------------------------------------------------------------------
  // 2. INICIO DE SESIÓN DE PROPIETARIO Y GESTIÓN DE PERFIL
  // --------------------------------------------------------------------------
  it('2. Login de Propietario y Perfil: Autentica propietario y permite consultar/editar su perfil', async () => {
    // Register second owner (Owner B) and login Seeded Owner Valeria
    await ownerBClient.registerOwner({
      fullName: 'Sofía Alarcón',
      email: 'sofia.owner@miautomotors.com',
      password: 'OwnerPass2026!',
    });

    const loginRes = await ownerAClient.login('martin.owner@miautomotors.com', 'OwnerPass2026!');
    assert.equal(loginRes.user.role, 'VEHICLE_OWNER');
    assert.equal(loginRes.session.activeTenantId, null);

    const profile = await ownerAClient.getOwnerProfile();
    assert.equal(profile.email, 'martin.owner@miautomotors.com');
    assert.equal(profile.fullName, 'Martín Pereyra');
    assert.equal(profile.accountType, 'VEHICLE_OWNER');

    const updated = await ownerAClient.updateOwnerProfile({
      fullName: 'Martín Alejandro Pereyra',
      phone: '+54 9 11 9999-0000',
    });
    assert.equal(updated.fullName, 'Martín Alejandro Pereyra');
    assert.equal(updated.phone, '+54 9 11 9999-0000');
  });

  // --------------------------------------------------------------------------
  // 3. REGISTRO DE VEHÍCULO PROPIO EN MI GARAJE (CON PERFIL TÉCNICO RENAULT LOGAN 1.6 2020)
  // --------------------------------------------------------------------------
  it('3. Mi Garaje: Registra Renault Logan 1.6 2020 con VIN opcional y resuelve ficha técnica por cadena', async () => {
    const created = await ownerAClient.createOwnerVehicle({
      make: 'Renault',
      model: 'Logan II Zen 1.6',
      year: 2020,
      engine: '1.6 16v SCe',
      plate: 'AE777MP',
      currentMileage: 38000,
      // VIN intentionally omitted (optional initially)
    });

    assert.ok(created.id);
    ownerAVehicleId = created.id;
    assert.equal(created.make, 'Renault');
    assert.equal(created.plate, 'AE777MP');
    assert.equal(created.vin, null);
    assert.equal(created.currentMileage, 38000);
    assert.ok(created.technicalProfile, 'Must resolve Renault Logan 1.6 2020 knowledge base profile');
    assert.equal(created.technicalProfile?.distributionType, 'CADENA');
    assert.equal(created.technicalProfile?.exactEngineCodeStatus, 'PENDING_CONFIRMATION');
    assert.ok(created.technicalProfile?.exactEngineCodeNote.includes('H4M / HR16'));
  });

  // --------------------------------------------------------------------------
  // 4. PREVENCIÓN DE SECUESTRO DE HISTORIAL POR VIN O PATENTE CONOCIDA
  // --------------------------------------------------------------------------
  it('4. Seguridad Anti-Hijacking: Registrar un VIN o patente existente rechaza con 409 y no expone historial ajeno', async () => {
    // Attempt by Owner B to register the seeded VW Golf VIN from Workshop Alpha
    await assert.rejects(
      async () =>
        await ownerBClient.createOwnerVehicle({
          make: 'Volkswagen',
          model: 'Golf VII',
          year: 2019,
          plate: 'AF000XX',
          vin: 'WVWZZZAUZKP100001',
          currentMileage: 60000,
        }),
      (err: any) => err.statusCode === 409
    );

    // Attempt by Owner B to register Owner A's plate ('AE777MP')
    await assert.rejects(
      async () =>
        await ownerBClient.createOwnerVehicle({
          make: 'Renault',
          model: 'Logan',
          year: 2020,
          plate: 'AE777MP',
          currentMileage: 40000,
        }),
      (err: any) => err.statusCode === 409
    );
  });

  // --------------------------------------------------------------------------
  // 5. ACTUALIZACIÓN DE ODÓMETRO Y PROTECCIÓN ANTI-RETROCESO
  // --------------------------------------------------------------------------
  it('5. Odómetro: Permite actualizar kilometraje hacia adelante y rechaza retroceso de odómetro', async () => {
    const updated = await ownerAClient.updateOwnerVehicle(ownerAVehicleId, {
      currentMileage: 39500,
    });
    assert.equal(updated.currentMileage, 39500);

    // Attempt to roll back odometer to 20,000 km must fail with 400
    await assert.rejects(
      async () =>
        await ownerAClient.updateOwnerVehicle(ownerAVehicleId, {
          currentMileage: 20000,
        }),
      (err: any) => err.statusCode === 400
    );
  });

  // --------------------------------------------------------------------------
  // 6. REGISTRO DE MANTENIMIENTO MANUAL POR PROPIETARIO (NO CERTIFICADO)
  // --------------------------------------------------------------------------
  it('6. Mantenimiento Manual: Registra evento como OWNER_DECLARED (DECLARED, isCertified: false)', async () => {
    const record = await ownerAClient.createOwnerMaintenanceRecord(ownerAVehicleId, {
      category: 'OIL_AND_FILTER',
      description: 'Cambio de aceite sintético 5W40 y filtro original Renault',
      recordedMileage: 35000,
      serviceDate: '2026-01-15T12:00:00Z',
      workshopName: 'Lubricentro Palermo',
      cost: 68000,
      observations: 'Factura B guardada en guantera.',
    });

    assert.ok(record.id);
    ownerAMaintRecordId = record.id;
    assert.equal(record.recordOrigin, 'OWNER_DECLARED');
    assert.equal(record.verificationLevel, 'DECLARED');
    assert.equal(record.isCertified, false, 'Owner-declared record must NEVER be marked as certified');
    assert.equal(record.recordedMileage, 35000);
  });

  // --------------------------------------------------------------------------
  // 7. HISTORIAL CRONOLÓGICO Y CORRECCIONES AUDITADAS INMUTABLES
  // --------------------------------------------------------------------------
  it('7. Historial y Corrección Auditada: Conserva trazabilidad histórica sin borrar el registro original', async () => {
    // Add an audited correction to Owner A's maintenance record
    const corrRes = await ownerAClient.createOwnerMaintenanceCorrection(ownerAMaintRecordId, {
      reason: 'Corrección de kilometraje según factura física',
      correctedData: {
        recordedMileage: 35250,
        description: 'Cambio de aceite sintético Elf 5W40 y filtro original Renault',
      },
    });

    assert.ok(corrRes.correction.id);
    assert.equal(corrRes.correction.previousData.recordedMileage, 35000);
    assert.equal(corrRes.correction.correctedData.recordedMileage, 35250);

    // Verify history endpoint returns both the updated value and the immutable correction trail
    const history = await ownerAClient.getOwnerVehicleHistory(ownerAVehicleId);
    assert.equal(history.totalRecords, 1);
    assert.equal(history.declaredCount, 1);
    assert.equal(history.certifiedCount, 0);

    const entry = history.timeline[0]!;
    assert.equal(entry.recordedMileage, 35250);
    assert.equal(entry.isCertified, false);
    assert.equal(entry.corrections.length, 1);
    assert.equal((entry.corrections[0]!.previousData as any).recordedMileage, 35000);

    // Also verify seeded owner Valeria has 1 certified record + 1 declared record
    const valeriaClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    await valeriaClient.login('valeria@miautomotors.com', 'Password123!');
    const valeriaHistory = await valeriaClient.getOwnerVehicleHistory(DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER);
    assert.equal(valeriaHistory.certifiedCount, 1);
    assert.equal(valeriaHistory.declaredCount, 1);
  });

  // --------------------------------------------------------------------------
  // 8. MOTOR DE MANTENIMIENTO DETERMINÍSTICO Y REGLA DE DATOS INSUFICIENTES
  // --------------------------------------------------------------------------
  it('8. Predicciones Determinísticas: Excluye reglas en PENDING_VERIFICATION del Renault Logan 2020 y reporta datos insuficientes sin inventar intervalos', async () => {
    const preds = await ownerAClient.getOwnerVehiclePredictions(ownerAVehicleId);
    assert.ok(preds.predictions.length >= 6);

    // Oil & filter was performed at 35,250 km; because Renault Logan 2020 rules are in PENDING_VERIFICATION
    // (awaiting primary official Renault Argentina documentation), it is excluded from verified calculations
    // while preserving lastServiceMileage = 35,250 km.
    const oilPred = preds.predictions.find((p) => p.category === 'OIL_AND_FILTER');
    assert.ok(oilPred);
    assert.equal(oilPred.lastServiceMileage, 35250);
    assert.equal(oilPred.nextDueMileage, null);
    assert.equal(oilPred.status, 'INSUFFICIENT_DATA');
    assert.equal(
      oilPred.message,
      'Necesitamos más información para estimar este mantenimiento'
    );

    // Timing belt on chain-driven Logan 1.6 2020 (unconfirmed H4M/HR16) has no replacement rule -> INSUFFICIENT_DATA
    const timingPred = preds.predictions.find((p) => p.category === 'TIMING_BELT');
    assert.ok(timingPred);
    assert.equal(timingPred.status, 'INSUFFICIENT_DATA');
    assert.equal(
      timingPred.message,
      'Necesitamos más información para estimar este mantenimiento'
    );
    assert.ok(timingPred.technicalNote?.includes('cadena metálica'));
  });

  // --------------------------------------------------------------------------
  // 9. SEGURIDAD Y AISLAMIENTO ENTRE PROPIETARIOS Y TALLERES
  // --------------------------------------------------------------------------
  it('9. Seguridad por Recurso: Propietario B no puede leer ni modificar vehículos ni registros de Propietario A (403)', async () => {
    // Owner B tries to read Owner A's vehicle by UUID
    await assert.rejects(
      async () => await ownerBClient.getOwnerVehicleById(ownerAVehicleId),
      (err: any) => err.statusCode === 403
    );

    // Owner B tries to read Owner A's vehicle history
    await assert.rejects(
      async () => await ownerBClient.getOwnerVehicleHistory(ownerAVehicleId),
      (err: any) => err.statusCode === 403
    );

    // Owner B tries to add maintenance to Owner A's vehicle
    await assert.rejects(
      async () =>
        await ownerBClient.createOwnerMaintenanceRecord(ownerAVehicleId, {
          category: 'BRAKES',
          description: 'Intento intruso',
          recordedMileage: 40000,
        }),
      (err: any) => err.statusCode === 403
    );

    // Owner B tries to add correction to Owner A's maintenance record
    await assert.rejects(
      async () =>
        await ownerBClient.createOwnerMaintenanceCorrection(ownerAMaintRecordId, {
          reason: 'Intrusión',
          correctedData: { recordedMileage: 99999 },
        }),
      (err: any) => err.statusCode === 403
    );

    // Pure Owner A cannot access workshop-only endpoints (/work-orders)
    await assert.rejects(
      async () => await ownerAClient.getWorkOrders(),
      (err: any) => err.statusCode === 403
    );

    // Workshop user cannot access private unshared owner vehicle via /api/v1/vehicles/:id
    await workshopClient.login('mario@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);
    const workshopVehicles = await workshopClient.getVehicles();
    assert.equal(
      workshopVehicles.some((v) => v.id === ownerAVehicleId),
      false,
      'Private owner vehicle must not appear in workshop vehicle list'
    );

    const directWorkshopFetch = await fetch(`${baseUrl}/api/v1/vehicles/${ownerAVehicleId}`, {
      headers: {
        Authorization: `Bearer ${workshopClient.getSession().token}`,
        'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA,
      },
    });
    assert.equal(directWorkshopFetch.status, 403);

    // Workshop cannot create a work order on an unshared private owner vehicle
    const illegalWorkOrderRes = await fetch(`${baseUrl}/api/v1/work-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workshopClient.getSession().token}`,
        'x-tenant-id': DEMO_IDS.WORKSHOP_ALPHA,
      },
      body: JSON.stringify({
        vehicleId: ownerAVehicleId,
        customerId: DEMO_IDS.CUSTOMER_CARLOS,
        reportedMileage: 40000,
        reportedIssue: 'Intento sin autorización del propietario',
      }),
    });
    assert.equal(illegalWorkOrderRes.status, 403);

    // Public/third-party passport request on unshared private owner vehicle is blocked with 403
    const publicPassportRes = await fetch(`${baseUrl}/api/v1/vehicles/${ownerAVehicleId}/passport?public=true`);
    assert.equal(publicPassportRes.status, 403);
  });

  // --------------------------------------------------------------------------
  // 10. AUDITORÍA FASE 1: MIGRACIÓN 0002_owner_portal.sql (COMPATIBILIDAD, IDEMPOTENCIA Y ROLLBACK)
  // --------------------------------------------------------------------------
  it('10. Fase 1 (BD): Migración 0002 conserva datos previos, soporta múltiples VIN NULL, idempotencia y rollback ante fallos', async () => {
    const migTestDir = path.join(process.cwd(), '.data', `test_m12_mig_${Date.now()}`);
    const tempDb = await DatabaseFactory.createInMemoryTestDb(migTestDir);

    try {
      // 1. Run ONLY 0001_initial_schema.sql first
      await DatabaseMigrator.runMigrations(tempDb, ['0001_initial_schema.sql']);

      // 2. Insert legacy pre-0002 workshop, user, vehicle, and maintenance record
      await DatabaseMigrator.executeMigrationSql(
        tempDb,
        `
        INSERT INTO workshops (id, name)
        VALUES ('11111111-1111-4111-8111-111111111111', 'Taller Legacy');
        INSERT INTO users (id, email, password_hash, full_name)
        VALUES ('22222222-2222-4222-8222-222222222222', 'legacy@test.com', 'hash', 'Usuario Legacy');
        INSERT INTO vehicles (id, vin, plate, make, model, year, current_mileage)
        VALUES ('33333333-3333-4333-8333-333333333333', 'VINLEGACY00000001', 'AA111BB', 'Ford', 'Focus', 2018, 75000);
        INSERT INTO maintenance_records (id, vehicle_id, performing_workshop_id, performing_workshop_name, service_date, recorded_mileage, verification_level, is_certified)
        VALUES ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Taller Legacy', NOW(), 70000, 'VERIFIED', true);
        `,
        'seed_legacy_data.sql'
      );

      // 3. Apply 0002_owner_portal.sql and re-run full migrator to prove safe idempotency
      await DatabaseMigrator.runMigrations(tempDb);
      await DatabaseMigrator.runMigrations(tempDb);

      // 4. Verify legacy vehicle and history were preserved intact
      const legacyVehicles = await (tempDb as any).execute(
        `SELECT id, vin, plate, current_mileage FROM vehicles WHERE id = '33333333-3333-4333-8333-333333333333'`
      );
      assert.equal(legacyVehicles.rows.length, 1);
      assert.equal(legacyVehicles.rows[0].current_mileage, 75000);

      const legacyRecords = await (tempDb as any).execute(
        `SELECT id, record_origin, is_certified FROM maintenance_records WHERE id = '44444444-4444-4444-8444-444444444444'`
      );
      assert.equal(legacyRecords.rows.length, 1);
      assert.equal(legacyRecords.rows[0].record_origin, 'WORKSHOP_CERTIFIED');
      assert.equal(legacyRecords.rows[0].is_certified, true);

      // 5. Verify multiple NULL VINs are allowed (optional VINs), maintenance without workshop is allowed, while duplicate non-null VINs fail
      await DatabaseMigrator.executeMigrationSql(
        tempDb,
        `
        INSERT INTO vehicles (id, vin, plate, make, model, year, current_mileage, owner_user_id)
        VALUES
          ('55555555-5555-4555-8555-555555555551', NULL, 'BB111CC', 'Renault', 'Logan', 2020, 10000, '22222222-2222-4222-8222-222222222222'),
          ('55555555-5555-4555-8555-555555555552', NULL, 'BB111CD', 'Renault', 'Sandero', 2021, 15000, '22222222-2222-4222-8222-222222222222');
        INSERT INTO maintenance_records (id, vehicle_id, performing_workshop_id, performing_workshop_name, recorded_by_user_id, record_origin, service_date, recorded_mileage, verification_level, is_certified)
        VALUES ('66666666-6666-4666-8666-666666666666', '55555555-5555-4555-8555-555555555551', NULL, 'Mantenimiento Personal Declarado por Propietario', '22222222-2222-4222-8222-222222222222', 'OWNER_DECLARED', NOW(), 10000, 'DECLARED', false);
        `,
        'seed_null_vins.sql'
      );

      await assert.rejects(async () => {
        await (tempDb as any).execute(`
          INSERT INTO vehicles (id, vin, plate, make, model, year, current_mileage)
          VALUES ('55555555-5555-4555-8555-555555555553', 'VINLEGACY00000001', 'BB111CE', 'Ford', 'Fiesta', 2019, 20000)
        `);
      });

      // 6. Verify transactional rollback when a migration fails mid-way
      await assert.rejects(
        async () => {
          await DatabaseMigrator.executeMigrationSql(
            tempDb,
            `CREATE TABLE temp_should_rollback (id TEXT PRIMARY KEY); INSERT INTO non_existent_table_xyz VALUES ('1');`,
            '9999_failing_test.sql'
          );
        },
        (err: any) => err.message.includes('9999_failing_test.sql')
      );

      // Ensure temp_should_rollback was rolled back and does not exist
      await assert.rejects(async () => {
        await (tempDb as any).execute(`SELECT * FROM temp_should_rollback`);
      });
    } finally {
      if (fs.existsSync(migTestDir)) {
        try {
          fs.rmSync(migTestDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup lock
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // 11. AUDITORÍA FASE 2: PERFIL DUAL (TALLER <-> MI AUTOMOTORS) Y REVOCACIÓN DE SESIÓN
  // --------------------------------------------------------------------------
  it('11. Fase 2 (Auth): Usuario con perfil dual alterna entre Automotors Pro y Mi Automotors, y el cierre de sesión revoca el token', async () => {
    const dualClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    const loginRes = await dualClient.login('mario@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);

    assert.ok(loginRes.user.profiles?.includes('WORKSHOP_USER'));
    assert.ok(loginRes.user.profiles?.includes('VEHICLE_OWNER'));
    assert.equal(loginRes.session.activeTenantId, DEMO_IDS.WORKSHOP_ALPHA);

    // Can access Workshop operations (Automotors Pro)
    const workshopVehicles = await dualClient.getVehicles();
    assert.ok(workshopVehicles.length > 0);

    // Can simultaneously access Owner Portal operations (Mi Automotors) without losing workshop session
    const ownerProfile = await dualClient.getOwnerProfile();
    assert.equal(ownerProfile.email, 'mario@alphamotors.com');
    assert.ok(ownerProfile.profiles.includes('WORKSHOP_USER'));
    assert.ok(ownerProfile.profiles.includes('VEHICLE_OWNER'));

    // Revoke session via /api/v1/auth/sessions/current
    const revokeRes = await fetch(`${baseUrl}/api/v1/auth/sessions/current`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${dualClient.getSession().token}`,
      },
    });
    assert.equal(revokeRes.status, 200);

    // Subsequent call with revoked token must return 401
    await assert.rejects(
      async () => await dualClient.getOwnerProfile(),
      (err: any) => err.statusCode === 401
    );
  });

  // --------------------------------------------------------------------------
  // 12. AUDITORÍA FASES 4 Y 5: METADATOS DE AUDITORÍA, REINICIO DE SERVIDOR Y CÁLCULO 50.000 + 10.000 = 60.000 KM
  // --------------------------------------------------------------------------
  it('12. Fases 4 y 5: Verifica metadatos completos, persistencia tras reinicio de HttpApp y cálculo controlado 50.000 km + 10.000 km = 60.000 km', async () => {
    // 1. Register controlled fictional vehicle at 52,000 km
    const controlledVehicle = await ownerAClient.createOwnerVehicle({
      make: 'FicticiaTest',
      model: 'SedanControl',
      year: 2021,
      plate: 'FT500KM',
      currentMileage: 52000,
    });

    // 2. Insert a controlled fictional test rule ONLY for FicticiaTest SedanControl (10,000 km / 12 months)
    await (db as any).insert(maintenanceIntervals).values({
      make: 'FicticiaTest',
      model: 'SedanControl',
      category: 'OIL_AND_FILTER',
      intervalKm: 10000,
      intervalMonths: 12,
      sourceCitation: 'Regla Ficticia Controlada de Prueba (10.000 km)',
    });

    // 3. Record personal maintenance at 50,000 km on 2026-01-10
    const createdMaint = await ownerAClient.createOwnerMaintenanceRecord(controlledVehicle.id, {
      category: 'OIL_AND_FILTER',
      description: 'Servicio controlado de prueba a los 50.000 km',
      recordedMileage: 50000,
      serviceDate: '2026-01-10T10:00:00.000Z',
    });

    // Phase 4 assertions: serviceDate, createdAt, recordedMileage, recordedByUserId, recordOrigin, isCertified
    assert.equal(createdMaint.serviceDate, '2026-01-10T10:00:00.000Z');
    assert.ok((createdMaint as any).createdAt, 'Must record and return creation timestamp (createdAt)');
    assert.equal(createdMaint.recordedMileage, 50000);
    assert.ok((createdMaint as any).recordedByUserId, 'Must identify author (recordedByUserId)');
    assert.equal(createdMaint.recordOrigin, 'OWNER_DECLARED');
    assert.equal(createdMaint.isCertified, false);

    // 4. Simulate backend restart by instantiating a brand new HttpApp over the same database
    const restartedApp = new HttpApp({ db });
    const restartedServer = restartedApp.createServer();
    let restartedUrl = '';
    await new Promise<void>((resolve) => {
      restartedServer.listen(0, () => {
        const addr = restartedServer.address();
        if (addr && typeof addr === 'object') {
          restartedUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });

    try {
      // Reuse existing JWT token against the restarted server (verifying persisted session hydration)
      const postRestartClient = new ApiClient({ baseUrl: `${restartedUrl}/api/v1` });
      postRestartClient.setAuthSession(ownerAClient.getSession().token!, null);

      const historyAfterRestart = await postRestartClient.getOwnerVehicleHistory(controlledVehicle.id);
      assert.equal(historyAfterRestart.totalRecords, 1);
      assert.equal(historyAfterRestart.timeline[0]!.recordedMileage, 50000);
      assert.equal(historyAfterRestart.timeline[0]!.serviceDate, '2026-01-10T10:00:00.000Z');
      assert.ok((historyAfterRestart.timeline[0] as any).createdAt);
      assert.ok((historyAfterRestart.timeline[0] as any).recordedByUserId);

      // Phase 5 assertions: 50,000 km + 10,000 km fictional interval = 60,000 km next due
      const preds = await postRestartClient.getOwnerVehiclePredictions(controlledVehicle.id);
      const oilPred = preds.predictions.find((p) => p.category === 'OIL_AND_FILTER');
      assert.ok(oilPred);
      assert.equal(oilPred.lastServiceMileage, 50000);
      assert.equal(oilPred.nextDueMileage, 60000, '50,000 km + 10,000 km interval must equal 60,000 km');
      assert.equal(oilPred.remainingKm, 8000, '60,000 km due - 52,000 km current must equal 8,000 km remaining');
      assert.ok(oilPred.nextDueDate, 'Must also estimate next due date by time interval');
      assert.equal(oilPred.status, 'OK');

      // Categories without documented rule on FicticiaTest must return INSUFFICIENT_DATA and exact message
      const brakesPred = preds.predictions.find((p) => p.category === 'BRAKES');
      assert.ok(brakesPred);
      assert.equal(brakesPred.status, 'INSUFFICIENT_DATA');
      assert.equal(brakesPred.message, 'Necesitamos más información para estimar este mantenimiento');
      assert.equal(brakesPred.nextDueMileage ?? null, null, 'Must never invent an interval or due mileage');
    } finally {
      await new Promise<void>((resolve) => restartedServer.close(() => resolve()));
    }
  });
});
