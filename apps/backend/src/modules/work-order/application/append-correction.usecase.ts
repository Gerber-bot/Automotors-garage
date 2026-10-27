import type { IWorkOrderRepository } from '../domain/work-order-repository.interface.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface AppendCorrectionInput {
  workOrderId: string;
  tenantId: string;
  actorId: string;
  origin: string;
  reason: string;
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
}

export class AppendWorkOrderCorrectionUseCase {
  private readonly workOrderRepo: IWorkOrderRepository;

  constructor(workOrderRepo: IWorkOrderRepository) {
    this.workOrderRepo = workOrderRepo;
  }

  public async execute(input: AppendCorrectionInput): Promise<Result<void, string>> {
    const workOrder = await this.workOrderRepo.findById(input.workOrderId, input.tenantId);
    if (!workOrder) {
      return Result.fail(`Work order '${input.workOrderId}' not found in workshop '${input.tenantId}'.`);
    }

    if (!workOrder.isTerminal()) {
      return Result.fail('Corrections audit trail is designed for closed or terminal work orders.');
    }

    const appendResult = workOrder.appendCorrection(
      input.actorId,
      input.origin,
      input.reason,
      input.changes
    );

    if (appendResult.isFailure) {
      return Result.fail(appendResult.getError());
    }

    await this.workOrderRepo.save(workOrder);
    return Result.ok(undefined);
  }
}
