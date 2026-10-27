import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { DatabaseFactory, DatabaseMigrator } from '../../packages/database/src/index.ts';
import {
  users,
  workshops,
  workshopMembers,
  vehicles,
  customers,
  workOrders,
  maintenanceRecords,
  outboxEvents,
  idempotencyKeys,
  sessions,
} from '../../packages/database/src/schema/index.ts';
import { PostgresSessionRepository } from '../../packages/database/src/repositories/postgres-session.repository.ts';
import { PostgresVehicleRepository } from '../../apps/backend/src/infrastructure/database/postgres-vehicle.repository.ts';
import { PostgresWorkOrderRepository } from '../../apps/backend/src/infrastructure/database/postgres-work-order.repository.ts';
import { PostgresCustomerRepository } from '../../apps/backend/src/infrastructure/database/postgres-customer.repository.ts';
import { PostgresMaintenanceHistoryRepository } from '../../apps/backend/src/infrastructure/database/postgres-maintenance-history.repository.ts';
import { PostgresUnitOfWork } from '../../apps/backend/src/infrastructure/database/postgres-unit-of-work.ts';
import { CloseWorkOrderUseCase } from '../../apps/backend/src/modules/work-order/application/close-work-order.usecase.ts';
import { CreateVehicleUseCase } from '../../apps/backend/src/modules/vehicle/application/create-vehicle.usecase.ts';
import { CreateWorkOrderUseCase } from '../../apps/backend/src/modules/work-order/application/create-work-order.usecase.ts';
import {
  PasswordService,
  TokenService,
  SessionService,
  SessionRevokedError,
} from '../../packages/security-foundation/src/index.ts';
import { ApiClient } from '../../apps/frontend/src/api/client.ts';
import { eq } from 'drizzle-orm';

describe('Milestone 07: Production-Grade Persistence & Transactions Test Suite', () => {
  let db: any;
  let sessionRepo: PostgresSessionRepository;
  let sessionService: SessionService;
  let vehicleRepo: PostgresVehicleRepository;
  let workOrderRepo: PostgresWorkOrderRepository;
  let customerRepo: PostgresCustomerRepository;
  let historyRepo: PostgresMaintenanceHistoryRepository;
  let unitOfWork: PostgresUnitOfWork;

  const JWT_SECRET = 'super-secret-jwt-key-with-minimum-32-chars-length!';

  beforeEach(async () => {
    db = await DatabaseFactory.createInMemoryTestDb();
    await DatabaseMigrator.runMigrations(db);

    sessionRepo = new PostgresSessionRepository(db);
    sessionService = new SessionService(sessionRepo);
    vehicleRepo = new PostgresVehicleRepository(db);
    workOrderRepo = new PostgresWorkOrderRepository(db);
    customerRepo = new PostgresCustomerRepository(db);
    historyRepo = new PostgresMaintenanceHistoryRepository(db);
    unitOfWork = new PostgresUnitOfWork(db);
  });

  // 1. Migrations from clean database
  it('1. Ejecuta migraciones limpias y verifica salud del motor PostgreSQL', async () => {
    const health = await DatabaseFactory.checkHealth(db);
    assert.equal(health.isHealthy, true);
    assert.ok(health.latencyMs >= 0);
  });

  // 2. User creation with Argon2id hash
  it('2. Crea usuario con hash seguro Argon2id y verifica restricción de email único', async () => {
    const pwdService = new PasswordService();
    const hash = await pwdService.hash('P@ssw0rdSecure2026!');

    const userId = '11111111-1111-1111-1111-111111111101';
    await db.insert(users).values({
      id: userId,
      email: 'mechanic.carlos@automotors.com',
      passwordHash: hash,
      fullName: 'Carlos Gomez',
    });

    const rows = await db.select().from(users).where(eq(users.id, userId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, 'mechanic.carlos@automotors.com');
    assert.ok(rows[0].passwordHash.startsWith('$argon2id$'));

    // Duplicate email must be rejected by unique constraint
    await assert.rejects(async () => {
      await db.insert(users).values({
        email: 'mechanic.carlos@automotors.com',
        passwordHash: 'dummy',
        fullName: 'Impostor',
      });
    });
  });

  // 3 & 4. Workshop creation and multi-tenant membership
  it('3 & 4. Crea talleres y membresías multi-tenant con unicidad (workshop_id, user_id)', async () => {
    const workshopId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const userId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await db.insert(workshops).values({
      id: workshopId,
      name: 'Taller Central Palermo',
      taxId: '30-71123456-9',
    });

    await db.insert(users).values({
      id: userId,
      email: 'owner@palermo.com',
      passwordHash: 'argon2_hash',
      fullName: 'Martin Palermo',
    });

    await db.insert(workshopMembers).values({
      workshopId,
      userId,
      role: 'WORKSHOP_OWNER',
    });

    // Duplicate membership for same user in same workshop is rejected
    await assert.rejects(async () => {
      await db.insert(workshopMembers).values({
        workshopId,
        userId,
        role: 'MECHANIC',
      });
    });
  });

  // 5, 6 & 7. Authentication, Persistent Session, and Revocation
  it('5, 6 & 7. Autenticación, persistencia de sesiones en PostgreSQL y revocación verificada', async () => {
    const userId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const workshopId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    await db.insert(workshops).values({ id: workshopId, name: 'Taller Belgrano' });
    await db.insert(users).values({ id: userId, email: 'tech@belgrano.com', passwordHash: 'h', fullName: 'Tech' });

    // Create session in PostgreSQL
    const session = await sessionService.createSessionPersisted(userId, workshopId, 120, {
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 TestBrowser',
    });

    // Verify session persisted in PostgreSQL table
    const storedRows = await db.select().from(sessions).where(eq(sessions.id, session.id));
    assert.equal(storedRows.length, 1);
    assert.equal(storedRows[0].userId, userId);
    assert.equal(storedRows[0].activeWorkshopId, workshopId);
    assert.equal(storedRows[0].isRevoked, false);

    // Assert session is active
    const active = await sessionService.assertActive(session.id);
    assert.equal(active.id, session.id);

    // Revoke session in PostgreSQL
    await sessionService.revokeSession(session.id);

    // Assert active session throws SessionRevokedError
    await assert.rejects(
      async () => await sessionService.assertActive(session.id),
      (err: unknown) => err instanceof SessionRevokedError
    );

    // Confirm is_revoked is true in PostgreSQL
    const revokedRows = await db.select().from(sessions).where(eq(sessions.id, session.id));
    assert.equal(revokedRows[0].isRevoked, true);
    assert.ok(revokedRows[0].revokedAt !== null);
  });

  // 8. Vehicle creation via PostgresVehicleRepository
  it('8. Registra vehículos en PostgreSQL con UUID único y formato normalizado', async () => {
    const createUseCase = new CreateVehicleUseCase(vehicleRepo);

    const result = await createUseCase.execute({
      vin: '8A1BB11D9HA000123',
      plate: 'ag-555-xy',
      make: 'Volkswagen',
      model: 'Vento',
      year: 2023,
      currentMileage: 18500,
    });

    assert.equal(result.isSuccess, true);
    const vehicle = result.getValue();
    assert.equal(vehicle.plate, 'AG555XY');

    // Query directly from Postgres table to confirm persistence
    const inDb = await vehicleRepo.findById(vehicle.vehicleId);
    assert.ok(inDb);
    assert.equal(inDb.currentMileage, 18500);
    assert.equal(inDb.vin, '8A1BB11D9HA000123');
  });

  // 9, 10 & 11. Transactional Work Order Closure & Persistent History
  it('9, 10 & 11. Cierre atómico transaccional en PostgreSQL con actualización de odómetro y outbox', async () => {
    const workshopId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const customerId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const vehicleId = '99999999-9999-9999-9999-999999999999';
    const mechanicId = '88888888-8888-8888-8888-888888888888';

    await db.insert(workshops).values({ id: workshopId, name: 'Garage Núñez' });
    await db.insert(users).values({ id: mechanicId, email: 'mech@nunez.com', passwordHash: 'h', fullName: 'Mecánico' });
    await db.insert(customers).values({
      id: customerId,
      workshopId,
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+5491144445555',
    });
    await db.insert(vehicles).values({
      id: vehicleId,
      vin: '9BWCA15U0FP000789',
      plate: 'AC123BD',
      make: 'Ford',
      model: 'Focus',
      year: 2020,
      currentMileage: 40000,
    });

    // Create Work Order
    const createWoUseCase = new CreateWorkOrderUseCase(workOrderRepo, vehicleRepo, customerRepo);
    const woResult = await createWoUseCase.execute({
      tenantId: workshopId,
      workshopName: 'Garage Núñez',
      vehicleId,
      customerId,
      reportedMileage: 42000,
      reportedIssue: 'Cambio de pastillas de freno y aceite',
    });

    assert.equal(woResult.isSuccess, true);
    const wo = await workOrderRepo.findById(woResult.getValue().id, workshopId);
    assert.ok(wo);

    // Set diagnosis and intervention on work order before closing
    wo.recordDiagnosis('Pastillas de freno delanteras gastadas al 85%');
    wo.addIntervention({
      id: 'int-1',
      title: 'Reemplazo de pastillas de freno',
      category: 'BRAKES',
      description: 'Pastillas cerámicas OEM instaladas',
    });
    await workOrderRepo.save(wo);

    // Execute Transactional Close with Unit of Work
    const closeUseCase = new CloseWorkOrderUseCase(
      workOrderRepo,
      vehicleRepo,
      historyRepo,
      undefined,
      unitOfWork
    );

    const closeResult = await closeUseCase.execute({
      workOrderId: wo.id,
      tenantId: workshopId,
      actorId: mechanicId,
      idempotencyKey: 'idemp-wo-close-001',
      internalNotes: 'Cliente satisfecho',
      partsCost: 150000,
      laborCost: 45000,
    });

    assert.equal(closeResult.isSuccess, true);

    // 1. Verify Work Order is COMPLETED in PostgreSQL
    const closedWo = await workOrderRepo.findById(wo.id, workshopId);
    assert.equal(closedWo?.status, 'COMPLETED');

    // 2. Verify Vehicle Mileage was updated to 42000 in PostgreSQL
    const updatedVehicle = await vehicleRepo.findById(vehicleId);
    assert.equal(updatedVehicle?.currentMileage, 42000);

    // 3. Verify Immutable Maintenance Record created in PostgreSQL
    const historyRecords = await historyRepo.findByVehicleId(vehicleId);
    assert.equal(historyRecords.length, 1);
    assert.equal(historyRecords[0]?.recordedMileage, 42000);
    assert.equal(historyRecords[0]?.isCertified, true);

    // 4. Verify Outbox Event created in PostgreSQL
    const outboxRows = await db.select().from(outboxEvents);
    assert.equal(outboxRows.length, 1);
    assert.equal(outboxRows[0].eventType, 'WorkOrderCompletedEvent');
    assert.equal(outboxRows[0].status, 'PENDING');

    // 5. Verify Idempotency Key stored in PostgreSQL
    const idempRows = await db.select().from(idempotencyKeys);
    assert.equal(idempRows.length, 1);
    assert.equal(idempRows[0].key, 'idemp-wo-close-001');
  });

  // 12. ACID Rollback on failure
  it('12. Realiza rollback atómico completo en PostgreSQL si falla una operación', async () => {
    const workshopId = '12121212-1212-1212-1212-121212121212';
    const customerId = '13131313-1313-1313-1313-131313131313';
    const vehicleId = '14141414-1414-1414-1414-141414141414';

    await db.insert(workshops).values({ id: workshopId, name: 'Rollback Workshop' });
    await db.insert(customers).values({ id: customerId, workshopId, firstName: 'A', lastName: 'B', phone: '123' });
    await db.insert(vehicles).values({
      id: vehicleId,
      vin: '11111111111111111',
      plate: 'RB100',
      make: 'Fiat',
      model: 'Cronos',
      year: 2022,
      currentMileage: 50000,
    });

    // Create Work Order with lower reported mileage (conflict!)
    await db.insert(workOrders).values({
      id: '20202020-2020-2020-2020-202020202020',
      workshopId,
      vehicleId,
      customerId,
      reportedMileage: 30000, // Rollback conflict! Less than 50000
      reportedIssue: 'Prueba de rollback',
      diagnosis: 'Diagnostico',
      status: 'OPEN',
    });

    const { workOrderItems } = await import('../../packages/database/src/schema/index.ts');
    await db.insert(workOrderItems).values({
      workOrderId: '20202020-2020-2020-2020-202020202020',
      title: 'Revision de frenos',
      category: 'BRAKES',
      description: 'Revision',
    });

    // Attempt close work order with odometer conflict
    const closeUseCase = new CloseWorkOrderUseCase(
      workOrderRepo,
      vehicleRepo,
      historyRepo,
      undefined,
      unitOfWork
    );

    const result = await closeUseCase.execute({
      workOrderId: '20202020-2020-2020-2020-202020202020',
      tenantId: workshopId,
      actorId: 'any-actor',
    });

    assert.equal(result.isFailure, true);
    assert.ok(result.getError().includes('Odometer conflict'));

    // Verify database state was NOT modified
    const wo = await workOrderRepo.findById('20202020-2020-2020-2020-202020202020', workshopId);
    assert.equal(wo?.status, 'OPEN');

    const v = await vehicleRepo.findById(vehicleId);
    assert.equal(v?.currentMileage, 50000);

    const history = await historyRepo.findByVehicleId(vehicleId);
    assert.equal(history.length, 0);
  });

  // 13. Idempotency test
  it('13. Idempotencia: peticiones con la misma clave devuelven el resultado previo sin duplicar', async () => {
    const workshopId = '30303030-3030-3030-3030-303030303030';
    const customerId = '31313131-3131-3131-3131-313131313131';
    const vehicleId = '32323232-3232-3232-3232-323232323232';

    await db.insert(workshops).values({ id: workshopId, name: 'Idempotent Workshop' });
    await db.insert(customers).values({ id: customerId, workshopId, firstName: 'C', lastName: 'D', phone: '456' });
    await db.insert(vehicles).values({
      id: vehicleId,
      vin: '33333333333333333',
      plate: 'IDEMP1',
      make: 'Toyota',
      model: 'Yaris',
      year: 2021,
      currentMileage: 10000,
    });

    const createWo = new CreateWorkOrderUseCase(workOrderRepo, vehicleRepo, customerRepo);
    const wo = (await createWo.execute({
      tenantId: workshopId,
      workshopName: 'Idempotent Workshop',
      vehicleId,
      customerId,
      reportedMileage: 12000,
      reportedIssue: 'Service 10k',
    })).getValue();

    const domainWo = (await workOrderRepo.findById(wo.id, workshopId))!;
    domainWo.recordDiagnosis('Service realizado');
    domainWo.addIntervention({ id: 'i-1', title: 'Aceite', category: 'OIL', description: '0W20' });
    await workOrderRepo.save(domainWo);

    const closeUseCase = new CloseWorkOrderUseCase(
      workOrderRepo,
      vehicleRepo,
      historyRepo,
      undefined,
      unitOfWork
    );

    // First call
    const res1 = await closeUseCase.execute({
      workOrderId: wo.id,
      tenantId: workshopId,
      actorId: 'actor',
      idempotencyKey: 'KEY-XYZ-999',
    });
    assert.equal(res1.isSuccess, true);

    // Second call with same idempotency key
    const res2 = await closeUseCase.execute({
      workOrderId: wo.id,
      tenantId: workshopId,
      actorId: 'actor',
      idempotencyKey: 'KEY-XYZ-999',
    });
    assert.equal(res2.isSuccess, true);
    assert.equal(res1.getValue().maintenanceRecordId, res2.getValue().maintenanceRecordId);

    // Exactly one history record in PostgreSQL
    const records = await historyRepo.findByVehicleId(vehicleId);
    assert.equal(records.length, 1);
  });

  // 14 & 15. Multi-tenant isolation
  it('14 & 15. Aislamiento Multi-Tenant: Taller A no puede consultar ni cerrar órdenes de Taller B', async () => {
    const workshopA = '40404040-4040-4040-4040-404040404040';
    const workshopB = '50505050-5050-5050-5050-505050505050';
    const customerA = '41414141-4141-4141-4141-414141414141';
    const vehicleId = '42424242-4242-4242-4242-424242424242';

    await db.insert(workshops).values([
      { id: workshopA, name: 'Taller Alfa' },
      { id: workshopB, name: 'Taller Beta' },
    ]);
    await db.insert(customers).values({ id: customerA, workshopId: workshopA, firstName: 'A', lastName: 'A', phone: '1' });
    await db.insert(vehicles).values({ id: vehicleId, vin: '44444444444444444', make: 'M', model: 'M', year: 2020, currentMileage: 1000 });

    const woId = '60606060-6060-6060-6060-606060606060';
    await db.insert(workOrders).values({
      id: woId,
      workshopId: workshopA,
      vehicleId,
      customerId: customerA,
      reportedMileage: 2000,
      reportedIssue: 'Problema en taller A',
      status: 'OPEN',
    });

    // Workshop B searches for workshop A's work order -> must return null
    const foundByB = await workOrderRepo.findById(woId, workshopB);
    assert.equal(foundByB, null);

    // Workshop B attempts to close workshop A's order -> rejected
    const closeUseCase = new CloseWorkOrderUseCase(workOrderRepo, vehicleRepo, historyRepo, undefined, unitOfWork);
    const closeAttempt = await closeUseCase.execute({
      workOrderId: woId,
      tenantId: workshopB,
      actorId: 'mechanic-b',
    });
    assert.equal(closeAttempt.isFailure, true);
    assert.ok(closeAttempt.getError().includes('not found in workshop'));
  });

  // 16. Auditable corrections
  it('16. Correcciones auditables preservan la información original con actor y motivo', async () => {
    const workshopId = '70707070-7070-7070-7070-707070707070';
    const customerId = '71717171-7171-7171-7171-717171717171';
    const vehicleId = '72727272-7272-7272-7272-727272727272';

    await db.insert(workshops).values({ id: workshopId, name: 'Taller Corrección' });
    await db.insert(customers).values({ id: customerId, workshopId, firstName: 'C', lastName: 'C', phone: '9' });
    await db.insert(vehicles).values({ id: vehicleId, vin: '77777777777777777', make: 'Make', model: 'Model', year: 2020, currentMileage: 5000 });

    const wo = (await new CreateWorkOrderUseCase(workOrderRepo, vehicleRepo, customerRepo).execute({
      tenantId: workshopId,
      workshopName: 'Taller Corrección',
      vehicleId,
      customerId,
      reportedMileage: 6000,
      reportedIssue: 'Initial',
    })).getValue();

    const domainWo = (await workOrderRepo.findById(wo.id, workshopId))!;
    domainWo.recordDiagnosis('Diagnosis');
    domainWo.addIntervention({ id: 'i-1', title: 'T', category: 'C', description: 'D' });
    await workOrderRepo.save(domainWo);

    const closeUseCase = new CloseWorkOrderUseCase(workOrderRepo, vehicleRepo, historyRepo, undefined, unitOfWork);
    await closeUseCase.execute({ workOrderId: wo.id, tenantId: workshopId, actorId: 'act-1' });

    // Append correction to closed work order
    const closed = (await workOrderRepo.findById(wo.id, workshopId))!;
    const corrResult = closed.appendCorrection('auditor-1', 'AUDIT_PORTAL', 'Error tipográfico en serial de pastillas', {
      partSerial: { oldValue: 'PAD-123', newValue: 'PAD-124' },
    });
    assert.equal(corrResult.isSuccess, true);
    assert.equal(closed.corrections.length, 1);
    assert.equal(closed.corrections[0]?.reason, 'Error tipográfico en serial de pastillas');
    assert.equal(closed.status, 'COMPLETED'); // Still completed
  });

  // 17. Referential integrity
  it('17. Integridad referencial: rechaza insertar registros con claves foráneas inexistentes', async () => {
    await assert.rejects(async () => {
      await db.insert(customers).values({
        workshopId: '00000000-0000-0000-0000-000000000000', // Non-existent workshop
        firstName: 'Ghost',
        lastName: 'Customer',
        phone: '0000',
      });
    });
  });

  // 18. Service restart resilience
  it('18. Resiliencia ante reinicio: una sesión revocada en PostgreSQL permanece revocada', async () => {
    const userId = '80808080-8080-8080-8080-808080808080';
    const workshopId = '81818181-8181-8181-8181-818181818181';

    await db.insert(workshops).values({ id: workshopId, name: 'Restart Workshop' });
    await db.insert(users).values({ id: userId, email: 'res@workshop.com', passwordHash: 'h', fullName: 'Restart' });

    const session = await sessionService.createSession(userId, workshopId, 60);
    await sessionService.revokeSession(session.id);

    // Simulate complete process restart by instantiating new SessionService with a new repository pointing to the same DB
    const freshSessionRepo = new PostgresSessionRepository(db);
    const freshSessionService = new SessionService(freshSessionRepo);

    // The fresh service must still reject the revoked session!
    await assert.rejects(
      async () => await freshSessionService.assertActive(session.id),
      (err: unknown) => err instanceof SessionRevokedError
    );
  });

  // 19. Database connection error handling
  it('19. Manejo de error de conexión a PostgreSQL: devuelve fallo controlado sin colapsar', async () => {
    const deadPool = DatabaseFactory.createPool({
      host: '192.0.2.1', // Unreachable RFC 5737 TEST-NET IP
      port: 5432,
      connectionTimeoutMillis: 50,
    });
    const deadDb = DatabaseFactory.create(deadPool);

    const health = await DatabaseFactory.checkHealth(deadDb);
    assert.equal(health.isHealthy, false);
    assert.ok(health.error !== undefined);

    await deadPool.end().catch(() => {});
  });

  // 20. No silent mock fallback in production
  it('20. Ausencia de fallback silencioso a mocks: ApiClient lanza error explícito si la API falla', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:59999/api/v1', // Non-existent port
    });

    // Offline mock mode is FALSE by default
    await assert.rejects(
      async () => await (client as any).request('/vehicles'),
      (err: unknown) => {
        return (err as Error).message.includes('API communication failure');
      }
    );
  });
});
