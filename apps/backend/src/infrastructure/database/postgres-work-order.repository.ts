import { eq, and } from 'drizzle-orm';
import type { DatabaseInstance } from '@automotors/database';
import { workOrders, workshops, workOrderItems } from '@automotors/database';
import { WorkOrder, type WorkOrderProps } from '../../modules/work-order/domain/work-order.ts';
import type {
  IWorkOrderRepository,
  WorkOrderSearchFilter,
} from '../../modules/work-order/domain/work-order-repository.interface.ts';

export class PostgresWorkOrderRepository implements IWorkOrderRepository {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  private async mapToDomain(row: typeof workOrders.$inferSelect): Promise<WorkOrder> {
    // Resolve workshop name
    let workshopName = 'Automotors Workshop';
    try {
      const wRows = await (this.db as any)
        .select({ name: workshops.name })
        .from(workshops)
        .where(eq(workshops.id, row.workshopId))
        .limit(1);
      if (wRows[0]?.name) workshopName = wRows[0].name;
    } catch {
      // fallback
    }

    let interventions: any[] = [];
    try {
      const items = await (this.db as any)
        .select()
        .from(workOrderItems)
        .where(eq(workOrderItems.workOrderId, row.id));

      interventions = items.map((it: any) => ({
        id: it.id,
        title: it.title,
        category: it.category,
        description: it.description ?? '',
        laborHours: 1,
      }));
    } catch {
      // fallback
    }

    const props: WorkOrderProps = {
      tenantId: row.workshopId,
      workshopName,
      vehicleId: row.vehicleId,
      customerId: row.customerId,
      assignedMechanicId: row.assignedMechanicId ?? undefined,
      entryDate: row.createdAt,
      reportedMileage: row.reportedMileage,
      reportedIssue: row.reportedIssue,
      initialCondition: row.initialCondition ?? undefined,
      diagnosis: row.diagnosis ?? undefined,
      interventions,
      parts: [],
      evidenceAssetIds: [],
      observations: row.internalNotes ?? undefined,
      status: row.status as any,
      closedAt: row.closedAt ?? undefined,
      corrections: [],
    };

    return WorkOrder.restore(props, row.id, row.createdAt, row.updatedAt, row.version);
  }

  public async findById(id: string, tenantId: string): Promise<WorkOrder | null> {
    const rows = await (this.db as any)
      .select()
      .from(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.workshopId, tenantId)))
      .limit(1);

    const row = rows[0];
    return row ? await this.mapToDomain(row) : null;
  }

  public async findByIdGlobal(id: string): Promise<WorkOrder | null> {
    const rows = await (this.db as any)
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, id))
      .limit(1);

    const row = rows[0];
    return row ? await this.mapToDomain(row) : null;
  }

  public async save(workOrder: WorkOrder): Promise<void> {
    await (this.db as any)
      .insert(workOrders)
      .values({
        id: workOrder.id,
        workshopId: workOrder.tenantId,
        vehicleId: workOrder.vehicleId,
        customerId: workOrder.customerId,
        assignedMechanicId: workOrder.assignedMechanicId ?? null,
        status: workOrder.status,
        reportedMileage: workOrder.reportedMileage,
        reportedIssue: workOrder.reportedIssue,
        initialCondition: workOrder.initialCondition ?? null,
        diagnosis: workOrder.diagnosis ?? null,
        internalNotes: workOrder.observations ?? null,
        version: workOrder.version,
        closedAt: workOrder.closedAt ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: workOrders.id,
        set: {
          assignedMechanicId: workOrder.assignedMechanicId ?? null,
          status: workOrder.status,
          reportedMileage: workOrder.reportedMileage,
          reportedIssue: workOrder.reportedIssue,
          initialCondition: workOrder.initialCondition ?? null,
          diagnosis: workOrder.diagnosis ?? null,
          internalNotes: workOrder.observations ?? null,
          version: workOrder.version,
          closedAt: workOrder.closedAt ?? null,
          updatedAt: new Date(),
        },
      });

    for (const item of workOrder.interventions) {
      const isUuid = item.id.length === 36 && item.id.includes('-');
      await (this.db as any)
        .insert(workOrderItems)
        .values({
          id: isUuid ? item.id : undefined,
          workOrderId: workOrder.id,
          title: item.title,
          category: item.category,
          description: item.description,
          cost: '0',
          isApproved: true,
        })
        .onConflictDoNothing();
    }
  }

  public async search(filter: WorkOrderSearchFilter): Promise<readonly WorkOrder[]> {
    const conditions = [eq(workOrders.workshopId, filter.tenantId)];

    if (filter.vehicleId) {
      conditions.push(eq(workOrders.vehicleId, filter.vehicleId));
    }
    if (filter.customerId) {
      conditions.push(eq(workOrders.customerId, filter.customerId));
    }
    if (filter.mechanicId) {
      conditions.push(eq(workOrders.assignedMechanicId, filter.mechanicId));
    }
    if (filter.status) {
      conditions.push(eq(workOrders.status, filter.status));
    }

    const rows = await (this.db as any)
      .select()
      .from(workOrders)
      .where(and(...conditions));

    const results: WorkOrder[] = [];
    for (const r of rows) {
      results.push(await this.mapToDomain(r));
    }
    return results;
  }
}
