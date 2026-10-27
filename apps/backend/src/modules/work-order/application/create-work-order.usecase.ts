import { WorkOrder } from '../domain/work-order.ts';
import type { IWorkOrderRepository } from '../domain/work-order-repository.interface.ts';
import type { IVehicleRepository } from '../../vehicle/domain/vehicle-repository.interface.ts';
import type { ICustomerRepository } from '../../customer/domain/customer-repository.interface.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface CreateWorkOrderInput {
  tenantId: string;
  workshopName: string;
  vehicleId: string;
  customerId: string;
  assignedMechanicId?: string;
  reportedMileage: number;
  reportedIssue: string;
  initialCondition?: string;
  diagnosis?: string;
  interventions?: Array<{ title: string; category?: string; description?: string }>;
}

export class CreateWorkOrderUseCase {
  private readonly workOrderRepo: IWorkOrderRepository;
  private readonly vehicleRepo: IVehicleRepository;
  private readonly customerRepo: ICustomerRepository;

  constructor(
    workOrderRepo: IWorkOrderRepository,
    vehicleRepo: IVehicleRepository,
    customerRepo: ICustomerRepository
  ) {
    this.workOrderRepo = workOrderRepo;
    this.vehicleRepo = vehicleRepo;
    this.customerRepo = customerRepo;
  }

  public async execute(input: CreateWorkOrderInput): Promise<Result<WorkOrder, string>> {
    // 1. Verify vehicle exists
    const vehicle = await this.vehicleRepo.findById(input.vehicleId);
    if (!vehicle) {
      return Result.fail(`Vehicle with ID '${input.vehicleId}' does not exist.`);
    }

    // 2. Mileage sanity check
    if (input.reportedMileage < vehicle.currentMileage) {
      return Result.fail(
        `Reported mileage (${input.reportedMileage} km) cannot be lower than vehicle's current mileage (${vehicle.currentMileage} km).`
      );
    }

    // 3. Verify customer exists in this tenant
    const customer = await this.customerRepo.findById(input.customerId, input.tenantId);
    if (!customer) {
      return Result.fail(`Customer with ID '${input.customerId}' not found in workshop tenant '${input.tenantId}'.`);
    }

    // 4. Create WorkOrder
    const mappedInterventions = (input.interventions ?? []).map((it, idx) => ({
      id: `${input.vehicleId}-int-${idx + 1}`,
      title: it.title,
      category: it.category ?? 'GENERAL_SERVICE',
      description: it.description ?? it.title,
      laborHours: 1,
    }));

    const orderResult = WorkOrder.create({
      tenantId: input.tenantId,
      workshopName: input.workshopName,
      vehicleId: input.vehicleId,
      customerId: input.customerId,
      assignedMechanicId: input.assignedMechanicId,
      entryDate: new Date(),
      reportedMileage: input.reportedMileage,
      reportedIssue: input.reportedIssue,
      initialCondition: input.initialCondition,
      diagnosis: input.diagnosis,
      interventions: mappedInterventions,
    });

    if (orderResult.isFailure) {
      return Result.fail(orderResult.getError());
    }

    const workOrder = orderResult.getValue();
    await this.workOrderRepo.save(workOrder);

    return Result.ok(workOrder);
  }
}
