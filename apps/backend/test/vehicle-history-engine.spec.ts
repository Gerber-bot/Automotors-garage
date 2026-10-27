import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';

import { Vehicle, FuelType } from '../src/modules/vehicle/domain/vehicle.ts';
import { InMemoryVehicleRepository } from '../src/modules/vehicle/infrastructure/in-memory-vehicle.repository.ts';
import { CreateVehicleUseCase } from '../src/modules/vehicle/application/create-vehicle.usecase.ts';
import { Customer } from '../src/modules/customer/domain/customer.ts';
import { InMemoryCustomerRepository } from '../src/modules/customer/infrastructure/in-memory-customer.repository.ts';
import { WorkOrder, WorkOrderStatus } from '../src/modules/work-order/domain/work-order.ts';
import { InMemoryWorkOrderRepository } from '../src/modules/work-order/infrastructure/in-memory-work-order.repository.ts';
import { CreateWorkOrderUseCase } from '../src/modules/work-order/application/create-work-order.usecase.ts';
import { CloseWorkOrderUseCase } from '../src/modules/work-order/application/close-work-order.usecase.ts';
import { AppendWorkOrderCorrectionUseCase } from '../src/modules/work-order/application/append-correction.usecase.ts';
import { InMemoryMaintenanceHistoryRepository } from '../src/modules/maintenance-history/infrastructure/in-memory-history.repository.ts';
import { GetVehiclePassportUseCase } from '../src/modules/maintenance-history/application/get-vehicle-passport.usecase.ts';
import { VerificationLevel } from '../src/modules/maintenance-history/domain/verification-level.ts';
import { IdempotencyService } from '../src/shared/application/idempotency.ts';

describe('Vehicle History Engine Test Suite', () => {
  let vehicleRepo: InMemoryVehicleRepository;
  let customerRepo: InMemoryCustomerRepository;
  let workOrderRepo: InMemoryWorkOrderRepository;
  let historyRepo: InMemoryMaintenanceHistoryRepository;
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    vehicleRepo = new InMemoryVehicleRepository();
    customerRepo = new InMemoryCustomerRepository();
    workOrderRepo = new InMemoryWorkOrderRepository();
    historyRepo = new InMemoryMaintenanceHistoryRepository();
    idempotencyService = new IdempotencyService();
  });

  // ============================================================================
  // Test 1: Creación de vehículos con identidad propia independiente de la patente
  // ============================================================================
  it('1. Creación de vehículo con identificador interno único independiente de la patente', async () => {
    const useCase = new CreateVehicleUseCase(vehicleRepo);

    const result = await useCase.execute({
      plate: 'AA 123 BB',
      vin: '8AJBA25G000123456',
      make: 'Toyota',
      model: 'Hilux',
      year: 2023,
      currentMileage: 15000,
      fuelType: FuelType.DIESEL,
    });

    assert.equal(result.isSuccess, true);
    const vehicleData = result.getValue();

    assert.ok(vehicleData.vehicleId);
    assert.notEqual(vehicleData.vehicleId, vehicleData.plate); // ID is UUID, not plate
    assert.equal(vehicleData.plate, 'AA123BB'); // Plate normalized
    assert.equal(vehicleData.currentMileage, 15000);
  });

  // ============================================================================
  // Test 2: Detección de duplicados potenciales
  // ============================================================================
  it('2. Detección de duplicados potenciales: rechazo exacto por VIN y advertencia por Patente', async () => {
    const useCase = new CreateVehicleUseCase(vehicleRepo);

    // Initial vehicle
    await useCase.execute({
      plate: 'AE999ZZ',
      vin: '1HGCR2F8XHA000111',
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      currentMileage: 40000,
    });

    // 1. Attempt registering another vehicle with the EXACT SAME VIN -> Hard Conflict
    const exactDupResult = await useCase.execute({
      plate: 'DISTINCT1',
      vin: '1HGCR2F8XHA000111',
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      currentMileage: 41000,
    });

    assert.equal(exactDupResult.isFailure, true);
    assert.match(exactDupResult.getError(), /already registered in the platform/i);

    // 2. Registering with same Plate + Make but different VIN -> Warning / Potential Conflict
    const potentialDupResult = await useCase.execute({
      plate: 'AE 999 ZZ',
      vin: 'OTHER_VIN_2222222',
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      currentMileage: 42000,
    });

    assert.equal(potentialDupResult.isSuccess, true);
    assert.ok(potentialDupResult.getValue().duplicateWarning);
    assert.match(potentialDupResult.getValue().duplicateWarning ?? '', /Potential duplicate/i);
  });

  // ============================================================================
  // Test 3: Creación de órdenes de trabajo
  // ============================================================================
  it('3. Creación de orden de trabajo con validaciones de taller, cliente y kilometraje', async () => {
    // Setup vehicle
    const vehicleRes = Vehicle.create({
      make: 'Ford',
      model: 'Ranger',
      year: 2022,
      currentMileage: 50000,
    });
    const vehicle = vehicleRes.getValue();
    await vehicleRepo.save(vehicle);

    // Setup customer in workshop A
    const customerRes = Customer.create({
      tenantId: 'workshop-alpha',
      fullName: 'Carlos Tevez',
      phone: '+5491155550000',
    });
    const customer = customerRes.getValue();
    await customerRepo.save(customer);

    const useCase = new CreateWorkOrderUseCase(workOrderRepo, vehicleRepo, customerRepo);

    // Mileage lower than vehicle current mileage must fail
    const rollbackResult = await useCase.execute({
      tenantId: 'workshop-alpha',
      workshopName: 'Alpha Motors',
      vehicleId: vehicle.id,
      customerId: customer.id,
      reportedMileage: 48000, // < 50000!
      reportedIssue: 'Clutch inspection',
    });
    assert.equal(rollbackResult.isFailure, true);
    assert.match(rollbackResult.getError(), /cannot be lower than/i);

    // Valid work order
    const orderResult = await useCase.execute({
      tenantId: 'workshop-alpha',
      workshopName: 'Alpha Motors',
      vehicleId: vehicle.id,
      customerId: customer.id,
      reportedMileage: 52000,
      reportedIssue: 'Scheduled 50k maintenance',
      initialCondition: 'Normal wear, no exterior dents',
    });

    assert.equal(orderResult.isSuccess, true);
    const wo = orderResult.getValue();
    assert.equal(wo.status, WorkOrderStatus.OPEN);
    assert.equal(wo.reportedMileage, 52000);
  });

  // ============================================================================
  // Test 4 & 5: Cierre de órdenes y generación del historial verificado
  // ============================================================================
  it('4 & 5. Cierre transaccional de orden: actualiza kilometraje, emite evento y genera historial inmutable', async () => {
    // Setup Vehicle
    const vehicle = Vehicle.create({
      make: 'Volkswagen',
      model: 'Gol Trend',
      year: 2019,
      currentMileage: 60000,
    }).getValue();
    await vehicleRepo.save(vehicle);

    // Setup Customer
    const customer = Customer.create({
      tenantId: 'workshop-alpha',
      fullName: 'Lionel Messi',
      phone: '+5491110101010',
    }).getValue();
    await customerRepo.save(customer);

    // Setup Work Order
    const workOrder = WorkOrder.create({
      tenantId: 'workshop-alpha',
      workshopName: 'Alpha Motors',
      vehicleId: vehicle.id,
      customerId: customer.id,
      reportedMileage: 65000,
      reportedIssue: 'Timing belt change',
      entryDate: new Date(),
    }).getValue();

    // 1. Trying to close without diagnosis or interventions fails
    const closeUseCase = new CloseWorkOrderUseCase(workOrderRepo, vehicleRepo, historyRepo, idempotencyService);
    await workOrderRepo.save(workOrder);

    const failNoDiag = await closeUseCase.execute({
      workOrderId: workOrder.id,
      tenantId: 'workshop-alpha',
      actorId: 'mechanic-1',
    });
    assert.equal(failNoDiag.isFailure, true);
    assert.match(failNoDiag.getError(), /Diagnosis is mandatory/i);

    // 2. Add diagnosis and interventions
    workOrder.recordDiagnosis('Timing belt cracked and tensioner worn out.');
    workOrder.addIntervention({
      id: 'int-1',
      title: 'Timing Belt & Water Pump Replacement',
      category: 'Engine Maintenance',
      description: 'Replaced timing belt kit and refilled coolant',
    });
    workOrder.addPart({
      partNumber: 'TB-KIT-VW-01',
      description: 'OEM Timing Belt Kit',
      quantity: 1,
      unitCost: 150.0,
    });
    workOrder.attachEvidence('sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    await workOrderRepo.save(workOrder);

    // 3. Close successfully
    const closeResult = await closeUseCase.execute({
      workOrderId: workOrder.id,
      tenantId: 'workshop-alpha',
      actorId: 'mechanic-1',
      idempotencyKey: 'idemp-wo-close-1',
      internalNotes: 'Customer requested quick turnaround; genuine parts used.',
      partsCost: 150.0,
      laborCost: 120.0,
    });

    assert.equal(closeResult.isSuccess, true);
    const closedData = closeResult.getValue();
    assert.equal(closedData.finalMileage, 65000);
    assert.equal(closedData.verificationLevel, VerificationLevel.CORROBORATED); // Backed by registered shop + evidence
    assert.equal(closedData.isCertified, true);

    // Verify Vehicle updated
    const updatedVehicle = await vehicleRepo.findById(vehicle.id);
    assert.equal(updatedVehicle?.currentMileage, 65000);

    // Verify Maintenance History recorded
    const historyEntries = await historyRepo.findByVehicleId(vehicle.id);
    assert.equal(historyEntries.length, 1);
    assert.equal(historyEntries[0]!.recordedMileage, 65000);
    assert.equal(historyEntries[0]!.performingWorkshopName, 'Alpha Motors');
  });

  // ============================================================================
  // Test 6: Correcciones auditables en órdenes cerradas
  // ============================================================================
  it('6. Correcciones auditables en órdenes cerradas conservan la información original con actor y motivo', async () => {
    const vehicle = Vehicle.create({ make: 'Audi', model: 'A4', year: 2020, currentMileage: 30000 }).getValue();
    await vehicleRepo.save(vehicle);

    const customer = Customer.create({ tenantId: 't-1', fullName: 'Ana Gomez', phone: '123' }).getValue();
    await customerRepo.save(customer);

    const workOrder = WorkOrder.create({
      tenantId: 't-1',
      workshopName: 'Audi Certified Center',
      vehicleId: vehicle.id,
      customerId: customer.id,
      reportedMileage: 35000,
      reportedIssue: 'Oil Service',
      entryDate: new Date(),
    }).getValue();

    workOrder.recordDiagnosis('Regular oil service');
    workOrder.addIntervention({ id: 'i-1', title: 'Synthetic 5W30 Oil', category: 'Lubrication', description: 'Oil filter changed' });
    workOrder.transitionStatus(WorkOrderStatus.COMPLETED);
    await workOrderRepo.save(workOrder);

    // Attempting direct mutation must fail
    const directMutation = workOrder.recordDiagnosis('Tampered Diagnosis');
    assert.equal(directMutation.isFailure, true);

    // Append auditable correction
    const correctionUseCase = new AppendWorkOrderCorrectionUseCase(workOrderRepo);
    const corrResult = await correctionUseCase.execute({
      workOrderId: workOrder.id,
      tenantId: 't-1',
      actorId: 'auditor-42',
      origin: 'AUDIT_PORTAL',
      reason: 'Typo in oil grade: customer brought 0W30 instead of 5W30',
      changes: {
        oilGrade: { oldValue: '5W30', newValue: '0W30' },
      },
    });

    assert.equal(corrResult.isSuccess, true);

    // Verify original order preserved with appended revision
    const savedOrder = await workOrderRepo.findById(workOrder.id, 't-1');
    assert.equal(savedOrder?.diagnosis, 'Regular oil service'); // Original preserved!
    assert.equal(savedOrder?.corrections.length, 1);
    const corr = savedOrder!.corrections[0]!;
    assert.equal(corr.actorId, 'auditor-42');
    assert.equal(corr.reason, 'Typo in oil grade: customer brought 0W30 instead of 5W30');
    assert.equal(corr.changes['oilGrade']!.newValue, '0W30');
  });

  // ============================================================================
  // Test 7: Control de concurrencia optimista
  // ============================================================================
  it('7. Control de concurrencia optimista previene sobrescrituras desactualizadas', async () => {
    const workOrder = WorkOrder.create({
      tenantId: 't-concurrency',
      workshopName: 'Speedy Garage',
      vehicleId: 'veh-1',
      customerId: 'cust-1',
      reportedMileage: 10000,
      reportedIssue: 'Battery Check',
      entryDate: new Date(),
    }).getValue();

    await workOrderRepo.save(workOrder);

    // Worker 1 fetches workOrder (version 1)
    const worker1Order = (await workOrderRepo.findById(workOrder.id, 't-concurrency'))!;

    // Worker 2 fetches workOrder (version 1)
    const worker2Order = (await workOrderRepo.findById(workOrder.id, 't-concurrency'))!;

    // Worker 1 saves first -> version becomes 2
    worker1Order.recordDiagnosis('Battery healthy, alternator tested.');
    await workOrderRepo.save(worker1Order);

    // Worker 2 attempts saving stale version 1 -> Must throw concurrency conflict
    worker2Order.recordDiagnosis('Alternative diagnosis from second tab');
    await assert.rejects(
      async () => await workOrderRepo.save(worker2Order),
      /Optimistic concurrency conflict/i
    );
  });

  // ============================================================================
  // Test 8: Aislamiento entre talleres
  // ============================================================================
  it('8. Aislamiento entre talleres: Taller A no puede consultar ni cerrar órdenes de Taller B', async () => {
    const workOrderB = WorkOrder.create({
      tenantId: 'workshop-bravo',
      workshopName: 'Bravo Mechanics',
      vehicleId: 'veh-b',
      customerId: 'cust-b',
      reportedMileage: 20000,
      reportedIssue: 'Air Conditioning',
      entryDate: new Date(),
    }).getValue();
    workOrderB.recordDiagnosis('Refrigerant leak');
    workOrderB.addIntervention({ id: 'i-1', title: 'O-ring replacement', category: 'HVAC', description: 'Replaced seal' });
    await workOrderRepo.save(workOrderB);

    const closeUseCase = new CloseWorkOrderUseCase(workOrderRepo, vehicleRepo, historyRepo);

    // Workshop Alpha attempts to close Workshop Bravo's order
    const result = await closeUseCase.execute({
      workOrderId: workOrderB.id,
      tenantId: 'workshop-alpha', // Cross-tenant!
      actorId: 'rogue-mechanic',
    });

    assert.equal(result.isFailure, true);
    assert.match(result.getError(), /not found in workshop 'workshop-alpha'/i);
  });

  // ============================================================================
  // Test 9: Protección de datos privados en el pasaporte digital
  // ============================================================================
  it('9. Protección de datos privados: el pasaporte público no expone costos ni notas de taller', async () => {
    const vehicle = Vehicle.create({
      make: 'Peugeot',
      model: '208',
      year: 2021,
      currentMileage: 28000,
      plate: 'AE123XX',
    }).getValue();
    await vehicleRepo.save(vehicle);

    const closeUseCase = new CloseWorkOrderUseCase(workOrderRepo, vehicleRepo, historyRepo);

    const customer = Customer.create({ tenantId: 't-delta', fullName: 'Julian Alvarez', phone: '+549351000000' }).getValue();
    await customerRepo.save(customer);

    const wo = WorkOrder.create({
      tenantId: 't-delta',
      workshopName: 'Delta Performance',
      vehicleId: vehicle.id,
      customerId: customer.id,
      reportedMileage: 28000,
      reportedIssue: 'Brake overhaul',
      entryDate: new Date(),
    }).getValue();
    wo.recordDiagnosis('Brake pads worn to 10%');
    wo.addIntervention({ id: 'i-1', title: 'Ceramic Brake Pads', category: 'Brakes', description: 'Front & rear set' });
    wo.attachEvidence('sha256:evidence_hash_123');
    await workOrderRepo.save(wo);

    await closeUseCase.execute({
      workOrderId: wo.id,
      tenantId: 't-delta',
      actorId: 'mech-1',
      internalNotes: 'Disputed billing; gave 10% internal discount.',
      partsCost: 80.0,
      laborCost: 40.0,
    });

    const passportUseCase = new GetVehiclePassportUseCase(vehicleRepo, historyRepo);

    // 1. Public view (e.g. buyer QR)
    const publicPassport = (await passportUseCase.execute({ vehicleId: vehicle.id, isPublicView: true })).getValue();
    assert.equal(publicPassport.totalServiceCount, 1);
    const publicEntry = publicPassport.timeline[0] as any;
    assert.equal(publicEntry.workshopName, 'Delta Performance');
    assert.equal(publicEntry.verificationLevel, VerificationLevel.CORROBORATED);
    assert.equal(publicEntry.internalNotes, undefined); // Private note redacted!
    assert.equal(publicEntry.partsCost, undefined);     // Financials redacted!

    // 2. Different Workshop inspecting history (e.g. Workshop Echo)
    const externalWorkshopPassport = (
      await passportUseCase.execute({ vehicleId: vehicle.id, requesterTenantId: 'workshop-echo' })
    ).getValue();
    const echoEntry = externalWorkshopPassport.timeline[0] as any;
    assert.equal(echoEntry.isOwnRecord, false);
    assert.equal(echoEntry.internalNotes, undefined); // Redacted for external workshop!
    assert.equal(echoEntry.financials, undefined);

    // 3. Originating Workshop inspecting history
    const deltaWorkshopPassport = (
      await passportUseCase.execute({ vehicleId: vehicle.id, requesterTenantId: 't-delta' })
    ).getValue();
    const deltaEntry = deltaWorkshopPassport.timeline[0] as any;
    assert.equal(deltaEntry.isOwnRecord, true);
    assert.equal(deltaEntry.internalNotes, 'Disputed billing; gave 10% internal discount.');
    assert.equal(deltaEntry.financials.partsCost, 80.0);
  });

  // ============================================================================
  // Test 10: Idempotencia en el cierre de órdenes
  // ============================================================================
  it('10. Idempotencia: reintentos con la misma idempotency key devuelven el registro existente sin duplicar', async () => {
    const vehicle = Vehicle.create({ make: 'BMW', model: 'M3', year: 2023, currentMileage: 10000 }).getValue();
    await vehicleRepo.save(vehicle);

    const customer = Customer.create({ tenantId: 't-bmw', fullName: 'Enzo Fernandez', phone: '123' }).getValue();
    await customerRepo.save(customer);

    const wo = WorkOrder.create({
      tenantId: 't-bmw',
      workshopName: 'Motorsport Garage',
      vehicleId: vehicle.id,
      customerId: customer.id,
      reportedMileage: 12000,
      reportedIssue: 'Initial 10k inspection',
      entryDate: new Date(),
    }).getValue();
    wo.recordDiagnosis('Everything in pristine condition');
    wo.addIntervention({ id: 'i-1', title: 'Inspection & Diagnostics', category: 'General', description: 'Full scan' });
    await workOrderRepo.save(wo);

    const closeUseCase = new CloseWorkOrderUseCase(workOrderRepo, vehicleRepo, historyRepo, idempotencyService);

    const idempKey = 'idempotency-key-bmw-m3-close';

    // First call
    const call1 = await closeUseCase.execute({
      workOrderId: wo.id,
      tenantId: 't-bmw',
      actorId: 'mech-bmw',
      idempotencyKey: idempKey,
    });
    assert.equal(call1.isSuccess, true);

    // Second call with same idempotency key (simulating network retry)
    const call2 = await closeUseCase.execute({
      workOrderId: wo.id,
      tenantId: 't-bmw',
      actorId: 'mech-bmw',
      idempotencyKey: idempKey,
    });
    assert.equal(call2.isSuccess, true);
    assert.equal(call1.getValue().maintenanceRecordId, call2.getValue().maintenanceRecordId);

    // Only 1 history record created in repository!
    const records = await historyRepo.findByVehicleId(vehicle.id);
    assert.equal(records.length, 1);
  });
});
