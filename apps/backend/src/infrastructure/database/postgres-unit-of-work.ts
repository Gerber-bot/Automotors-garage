import type { DatabaseInstance } from '@automotors/database';
import { outboxEvents, idempotencyKeys } from '@automotors/database';
import type {
  IUnitOfWork,
  ITransactionContext,
  OutboxEventInput,
} from '../../shared/application/unit-of-work.ts';
import { PostgresVehicleRepository } from './postgres-vehicle.repository.ts';
import { PostgresWorkOrderRepository } from './postgres-work-order.repository.ts';
import { PostgresMaintenanceHistoryRepository } from './postgres-maintenance-history.repository.ts';

export class PostgresUnitOfWork implements IUnitOfWork {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  public async execute<T>(work: (tx: ITransactionContext) => Promise<T>): Promise<T> {
    return await (this.db as any).transaction(async (trx: DatabaseInstance) => {
      const txContext: ITransactionContext = {
        vehicleRepo: new PostgresVehicleRepository(trx),
        workOrderRepo: new PostgresWorkOrderRepository(trx),
        historyRepo: new PostgresMaintenanceHistoryRepository(trx),

        recordOutboxEvent: async (event: OutboxEventInput): Promise<void> => {
          await (trx as any).insert(outboxEvents).values({
            eventType: event.eventType,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            payload: event.payload,
            status: 'PENDING',
          });
        },

        saveIdempotencyKey: async (
          key: string,
          workshopId: string,
          response: unknown,
          ttlSeconds: number = 86400
        ): Promise<void> => {
          const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
          await (trx as any).insert(idempotencyKeys).values({
            key,
            workshopId,
            responseCode: 200,
            responseBody: response,
            expiresAt,
          });
        },
      };

      return await work(txContext);
    });
  }
}
