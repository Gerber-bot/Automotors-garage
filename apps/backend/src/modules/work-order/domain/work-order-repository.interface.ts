import type { WorkOrder } from './work-order.ts';

export interface WorkOrderSearchFilter {
  tenantId: string;
  vehicleId?: string;
  customerId?: string;
  mechanicId?: string;
  status?: string;
}

export interface IWorkOrderRepository {
  findById(id: string, tenantId: string): Promise<WorkOrder | null>;
  findByIdGlobal(id: string): Promise<WorkOrder | null>;
  save(workOrder: WorkOrder): Promise<void>;
  search(filter: WorkOrderSearchFilter): Promise<readonly WorkOrder[]>;
}
