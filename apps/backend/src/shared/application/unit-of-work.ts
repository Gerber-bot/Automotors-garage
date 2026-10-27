import type { IVehicleRepository } from '../../modules/vehicle/domain/vehicle-repository.interface.ts';
import type { IWorkOrderRepository } from '../../modules/work-order/domain/work-order-repository.interface.ts';
import type { IMaintenanceHistoryRepository } from '../../modules/maintenance-history/domain/history-repository.interface.ts';

export interface OutboxEventInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export interface ITransactionContext {
  vehicleRepo: IVehicleRepository;
  workOrderRepo: IWorkOrderRepository;
  historyRepo: IMaintenanceHistoryRepository;
  recordOutboxEvent(event: OutboxEventInput): Promise<void>;
  saveIdempotencyKey(key: string, workshopId: string, response: unknown, ttlSeconds?: number): Promise<void>;
}

export interface IUnitOfWork {
  execute<T>(work: (tx: ITransactionContext) => Promise<T>): Promise<T>;
}
