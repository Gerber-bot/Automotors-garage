import type { IWorkOrderRepository } from '../domain/work-order-repository.interface.ts';
import type { IVehicleRepository } from '../../vehicle/domain/vehicle-repository.interface.ts';
import type { IMaintenanceHistoryRepository } from '../../maintenance-history/domain/history-repository.interface.ts';
import { MaintenanceRecord } from '../../maintenance-history/domain/maintenance-record.ts';
import { VerificationLevelEvaluator } from '../../maintenance-history/domain/verification-level.ts';
import { WorkOrderStatus } from '../domain/work-order.ts';
import { Result } from '../../../shared/domain/result.ts';
import { DomainEventPublisher } from '../../../shared/domain/events.ts';
import { IdempotencyService } from '../../../shared/application/idempotency.ts';
import type { IUnitOfWork } from '../../../shared/application/unit-of-work.ts';

export interface CloseWorkOrderInput {
  workOrderId: string;
  tenantId: string;
  actorId: string;
  idempotencyKey?: string;
  internalNotes?: string;
  partsCost?: number;
  laborCost?: number;
  diagnosis?: string;
  interventions?: Array<{ title: string; category?: string; description?: string }>;
}

export interface CloseWorkOrderOutput {
  workOrderId: string;
  status: string;
  maintenanceRecordId: string;
  vehicleId: string;
  closedAt: Date;
  finalMileage: number;
  verificationLevel: string;
  isCertified: boolean;
}

export class CloseWorkOrderUseCase {
  private readonly workOrderRepo: IWorkOrderRepository;
  private readonly vehicleRepo: IVehicleRepository;
  private readonly historyRepo: IMaintenanceHistoryRepository;
  private readonly idempotencyService: IdempotencyService;
  private readonly unitOfWork?: IUnitOfWork;

  constructor(
    workOrderRepo: IWorkOrderRepository,
    vehicleRepo: IVehicleRepository,
    historyRepo: IMaintenanceHistoryRepository,
    idempotencyService?: IdempotencyService,
    unitOfWork?: IUnitOfWork
  ) {
    this.workOrderRepo = workOrderRepo;
    this.vehicleRepo = vehicleRepo;
    this.historyRepo = historyRepo;
    this.idempotencyService = idempotencyService ?? new IdempotencyService();
    this.unitOfWork = unitOfWork;
  }

  public async execute(input: CloseWorkOrderInput): Promise<Result<CloseWorkOrderOutput, string>> {
    // 0. Idempotency Check
    if (input.idempotencyKey) {
      const cached = this.idempotencyService.get<CloseWorkOrderOutput>(input.idempotencyKey);
      if (cached) {
        return Result.ok(cached);
      }
    }

    // 1. Fetch & Validate Work Order exists in caller's tenant
    const workOrder = await this.workOrderRepo.findById(input.workOrderId, input.tenantId);
    if (!workOrder) {
      return Result.fail(`Work order '${input.workOrderId}' not found in workshop '${input.tenantId}'.`);
    }

    // 2. Confirm order status
    if (workOrder.isTerminal()) {
      return Result.fail(`Work order is already closed or cancelled (Status: ${workOrder.status}).`);
    }

    // Attach diagnosis/interventions if provided during closure
    if ((!workOrder.diagnosis || workOrder.diagnosis.trim().length === 0) && input.diagnosis) {
      workOrder.recordDiagnosis(input.diagnosis);
    }

    if (workOrder.interventions.length === 0 && input.interventions && input.interventions.length > 0) {
      for (const it of input.interventions) {
        workOrder.addIntervention({
          id: `${workOrder.id}-int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: it.title,
          category: it.category ?? 'GENERAL_SERVICE',
          description: it.description ?? it.title,
          laborHours: 1,
        });
      }
    }

    // 3. Validate mandatory data
    if (!workOrder.diagnosis || workOrder.diagnosis.trim().length === 0) {
      return Result.fail('Cannot close work order: Diagnosis is mandatory.');
    }

    if (workOrder.interventions.length === 0) {
      return Result.fail('Cannot close work order: At least one intervention/service must be recorded.');
    }

    // 4. Fetch vehicle and validate mileage monotonicity
    const vehicle = await this.vehicleRepo.findById(workOrder.vehicleId);
    if (!vehicle) {
      return Result.fail(`Vehicle '${workOrder.vehicleId}' linked to this work order does not exist.`);
    }

    if (workOrder.reportedMileage < vehicle.currentMileage) {
      return Result.fail(
        `Odometer conflict: Work order reported mileage (${workOrder.reportedMileage} km) is less than recorded vehicle mileage (${vehicle.currentMileage} km).`
      );
    }

    // 5. Evaluate Verification Level based on verifiable criteria
    const verification = VerificationLevelEvaluator.evaluate({
      isRegisteredWorkshop: true, // Closed within a tenant workshop
      hasCryptographicEvidence: workOrder.evidenceAssetIds.length > 0,
      hasInvoiceDocument: true,
    });

    // 6. Create immutable MaintenanceRecord
    const historyResult = MaintenanceRecord.create({
      vehicleId: vehicle.id,
      workOrderId: workOrder.id,
      performingTenantId: workOrder.tenantId,
      performingWorkshopName: workOrder.workshopName,
      serviceDate: new Date(),
      recordedMileage: workOrder.reportedMileage,
      verificationLevel: verification.level,
      criteriaMet: verification.criteriaMet,
      isCertified: verification.isCertified,
      interventions: workOrder.interventions.map((i) => ({
        title: i.title,
        category: i.category,
        description: i.description,
      })),
      evidenceAssetIds: workOrder.evidenceAssetIds,
      internalNotes: input.internalNotes,
      partsCost: input.partsCost,
      laborCost: input.laborCost,
    });

    if (historyResult.isFailure) {
      return Result.fail(historyResult.getError());
    }

    const maintenanceRecord = historyResult.getValue();

    // 7. Update Vehicle Mileage Projection
    const mileageResult = vehicle.updateMileage(workOrder.reportedMileage);
    if (mileageResult.isFailure) {
      return Result.fail(mileageResult.getError());
    }

    // 8. Transition Work Order to COMPLETED
    const transitionResult = workOrder.transitionStatus(WorkOrderStatus.COMPLETED);
    if (transitionResult.isFailure) {
      return Result.fail(transitionResult.getError());
    }

    const output: CloseWorkOrderOutput = {
      workOrderId: workOrder.id,
      status: 'COMPLETED',
      maintenanceRecordId: maintenanceRecord.id,
      vehicleId: vehicle.id,
      closedAt: workOrder.closedAt ?? new Date(),
      finalMileage: vehicle.currentMileage,
      verificationLevel: verification.level,
      isCertified: verification.isCertified,
    };

    // 9. Atomic Persistence (With ACID Unit of Work or in-memory fallback)
    if (this.unitOfWork) {
      await this.unitOfWork.execute(async (tx) => {
        await tx.historyRepo.save(maintenanceRecord);
        await tx.vehicleRepo.save(vehicle);
        await tx.workOrderRepo.save(workOrder);
        await tx.recordOutboxEvent({
          eventType: 'WorkOrderCompletedEvent',
          aggregateType: 'WorkOrder',
          aggregateId: workOrder.id,
          payload: {
            workOrderId: workOrder.id,
            vehicleId: vehicle.id,
            closedAt: workOrder.closedAt,
            mileage: vehicle.currentMileage,
          },
        });
        if (input.idempotencyKey) {
          await tx.saveIdempotencyKey(input.idempotencyKey, input.tenantId, output);
        }
      });
    } else {
      await this.historyRepo.save(maintenanceRecord);
      await this.vehicleRepo.save(vehicle);
      await this.workOrderRepo.save(workOrder);
    }

    if (input.idempotencyKey) {
      this.idempotencyService.set(input.idempotencyKey, output);
    }

    // 10. Publish Auditable Domain Events strictly AFTER transaction commit
    await DomainEventPublisher.getInstance().publish({
      eventId: crypto.randomUUID(),
      eventName: 'WorkOrderCompletedEvent',
      occurredOn: new Date(),
      aggregateId: workOrder.id,
    });

    return Result.ok(output);
  }
}
