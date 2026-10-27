import type { IWorkOrderRepository, WorkOrderSearchFilter } from '../domain/work-order-repository.interface.ts';
import { WorkOrder } from '../domain/work-order.ts';

export class InMemoryWorkOrderRepository implements IWorkOrderRepository {
  private readonly workOrders = new Map<string, WorkOrder>();

  private clone(wo: WorkOrder): WorkOrder {
    return new (WorkOrder as any)(
      {
        ...(wo as any).props,
        interventions: [...wo.interventions],
        parts: [...wo.parts],
        evidenceAssetIds: [...wo.evidenceAssetIds],
        corrections: [...wo.corrections],
      },
      wo.id,
      wo.createdAt,
      wo.updatedAt,
      wo.version
    );
  }

  public async findById(id: string, tenantId: string): Promise<WorkOrder | null> {
    const wo = this.workOrders.get(id);
    if (!wo || wo.tenantId !== tenantId) return null;
    return this.clone(wo);
  }

  public async findByIdGlobal(id: string): Promise<WorkOrder | null> {
    const wo = this.workOrders.get(id);
    return wo ? this.clone(wo) : null;
  }

  public async save(workOrder: WorkOrder): Promise<void> {
    const existing = this.workOrders.get(workOrder.id);
    if (existing && existing.version >= workOrder.version) {
      throw new Error(
        `Optimistic concurrency conflict on WorkOrder ${workOrder.id}: stored version (${existing.version}) >= updating version (${workOrder.version})`
      );
    }
    this.workOrders.set(workOrder.id, this.clone(workOrder));
  }

  public async search(filter: WorkOrderSearchFilter): Promise<readonly WorkOrder[]> {
    return Array.from(this.workOrders.values())
      .filter((wo) => {
        if (wo.tenantId !== filter.tenantId) return false;
        if (filter.vehicleId && wo.vehicleId !== filter.vehicleId) return false;
        if (filter.customerId && wo.customerId !== filter.customerId) return false;
        if (filter.mechanicId && wo.assignedMechanicId !== filter.mechanicId) return false;
        if (filter.status && wo.status !== filter.status) return false;
        return true;
      })
      .map((wo) => this.clone(wo));
  }

  public clear(): void {
    this.workOrders.clear();
  }
}
