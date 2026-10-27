import { eq, desc } from 'drizzle-orm';
import type { DatabaseInstance } from '@automotors/database';
import { maintenanceRecords } from '@automotors/database';
import {
  MaintenanceRecord,
  type MaintenanceRecordProps,
} from '../../modules/maintenance-history/domain/maintenance-record.ts';
import type { IMaintenanceHistoryRepository } from '../../modules/maintenance-history/domain/history-repository.interface.ts';

export class PostgresMaintenanceHistoryRepository implements IMaintenanceHistoryRepository {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  private mapToDomain(row: typeof maintenanceRecords.$inferSelect): MaintenanceRecord {
    const props: MaintenanceRecordProps = {
      vehicleId: row.vehicleId,
      workOrderId: row.workOrderId ?? undefined,
      performingTenantId: row.performingWorkshopId,
      performingWorkshopName: row.performingWorkshopName,
      serviceDate: row.serviceDate,
      recordedMileage: row.recordedMileage,
      verificationLevel: row.verificationLevel as any,
      isCertified: row.isCertified,
      criteriaMet: (row.criteriaMet as string[]) ?? [],
      interventions: (row.interventions as any[]) ?? [],
      evidenceAssetIds: (row.evidenceAssetIds as string[]) ?? [],
      internalNotes: row.internalNotes ?? undefined,
      partsCost: row.partsCost ? Number(row.partsCost) : undefined,
      laborCost: row.laborCost ? Number(row.laborCost) : undefined,
    };

    return MaintenanceRecord.restore(props, row.id, row.createdAt);
  }

  public async findById(id: string): Promise<MaintenanceRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, id))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToDomain(row) : null;
  }

  public async findByVehicleId(vehicleId: string): Promise<readonly MaintenanceRecord[]> {
    const rows = await (this.db as any)
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.vehicleId, vehicleId))
      .orderBy(desc(maintenanceRecords.recordedMileage));

    return rows.map((r: typeof maintenanceRecords.$inferSelect) => this.mapToDomain(r));
  }

  public async save(record: MaintenanceRecord): Promise<void> {
    await (this.db as any)
      .insert(maintenanceRecords)
      .values({
        id: record.id,
        vehicleId: record.vehicleId,
        workOrderId: record.workOrderId ?? null,
        performingWorkshopId: record.performingTenantId,
        performingWorkshopName: record.performingWorkshopName,
        serviceDate: record.serviceDate,
        recordedMileage: record.recordedMileage,
        verificationLevel: record.verificationLevel,
        isCertified: record.isCertified,
        criteriaMet: record.criteriaMet,
        interventions: record.interventions,
        evidenceAssetIds: record.evidenceAssetIds,
        internalNotes: record.internalNotes ?? null,
        partsCost: record.partsCost ? String(record.partsCost) : null,
        laborCost: record.laborCost ? String(record.laborCost) : null,
      })
      .onConflictDoUpdate({
        target: maintenanceRecords.id,
        set: {
          recordedMileage: record.recordedMileage,
          verificationLevel: record.verificationLevel,
          isCertified: record.isCertified,
          criteriaMet: record.criteriaMet,
          interventions: record.interventions,
          evidenceAssetIds: record.evidenceAssetIds,
          internalNotes: record.internalNotes ?? null,
          partsCost: record.partsCost ? String(record.partsCost) : null,
          laborCost: record.laborCost ? String(record.laborCost) : null,
        },
      });
  }
}
