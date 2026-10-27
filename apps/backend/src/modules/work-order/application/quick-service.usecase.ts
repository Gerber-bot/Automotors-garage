import { Result } from '../../../shared/domain/result.ts';
import type { IVehicleRepository } from '../../vehicle/domain/vehicle-repository.interface.ts';
import type { IWorkOrderRepository } from '../domain/work-order-repository.interface.ts';
import type { ICustomerRepository } from '../../customer/domain/customer-repository.interface.ts';
import { WorkOrder } from '../domain/work-order.ts';
import { CloseWorkOrderUseCase } from './close-work-order.usecase.ts';

export interface QuickServiceInput {
  tenantId: string;
  workshopName: string;
  actorId: string;
  vehicleId: string;
  odometerKm: number;
  interventions: string[];
  observations?: string;
  idempotencyKey?: string;
}

export interface QuickServiceOutput {
  workOrderId: string;
  status: string;
  odometerKm: number;
  interventions: string[];
  vehiclePlate?: string;
  vehicleName: string;
}

export class QuickServiceUseCase {
  private readonly vehicleRepo: IVehicleRepository;
  private readonly workOrderRepo: IWorkOrderRepository;
  private readonly customerRepo: ICustomerRepository;
  private readonly closeWorkOrderUseCase: CloseWorkOrderUseCase;

  constructor(
    vehicleRepo: IVehicleRepository,
    workOrderRepo: IWorkOrderRepository,
    customerRepo: ICustomerRepository,
    closeWorkOrderUseCase: CloseWorkOrderUseCase
  ) {
    this.vehicleRepo = vehicleRepo;
    this.workOrderRepo = workOrderRepo;
    this.customerRepo = customerRepo;
    this.closeWorkOrderUseCase = closeWorkOrderUseCase;
  }

  public async execute(input: QuickServiceInput): Promise<Result<QuickServiceOutput, string>> {
    // 1. Validate vehicle existence
    const vehicle = await this.vehicleRepo.findById(input.vehicleId);
    if (!vehicle) {
      return Result.fail(`Vehicle '${input.vehicleId}' not found.`);
    }

    // 2. Validate odometer consistency
    if (input.odometerKm < vehicle.currentMileage) {
      return Result.fail(
        `Reported mileage (${input.odometerKm} km) cannot be lower than current vehicle mileage (${vehicle.currentMileage} km).`
      );
    }

    // 3. Resolve customer for this workshop
    const customers = await this.customerRepo.listByTenant(input.tenantId);
    const customerId = customers[0]?.id ?? '00000000-0000-4000-8000-000000000001';

    // 4. Create Work Order
    const interventionItems = input.interventions.map((title, idx) => ({
      id: `${input.vehicleId}-int-${idx + 1}`,
      title,
      category: title.toLowerCase().includes('aceite') ? 'OIL_AND_FILTER' : 'GENERAL_SERVICE',
      description: title,
      laborHours: 1,
    }));

    const createResult = WorkOrder.create({
      tenantId: input.tenantId,
      workshopName: input.workshopName,
      vehicleId: input.vehicleId,
      customerId,
      assignedMechanicId: input.actorId,
      entryDate: new Date(),
      reportedMileage: input.odometerKm,
      reportedIssue: `Quick Service: ${input.interventions.join(', ')}`,
      diagnosis: 'Inspección rápida de rutina en taller.',
      interventions: interventionItems,
      observations: input.observations,
    });

    if (createResult.isFailure) {
      return Result.fail(createResult.getError());
    }

    const workOrder = createResult.getValue();
    await this.workOrderRepo.save(workOrder);

    // 5. Atomic closure of the order
    const closeResult = await this.closeWorkOrderUseCase.execute({
      workOrderId: workOrder.id,
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      internalNotes: input.observations,
      partsCost: 45000,
      laborCost: 25000,
    });

    if (closeResult.isFailure) {
      return Result.fail(closeResult.getError());
    }

    return Result.ok({
      workOrderId: workOrder.id,
      status: 'COMPLETED',
      odometerKm: input.odometerKm,
      interventions: input.interventions,
      vehiclePlate: vehicle.plate,
      vehicleName: `${vehicle.make} ${vehicle.model}`,
    });
  }
}
