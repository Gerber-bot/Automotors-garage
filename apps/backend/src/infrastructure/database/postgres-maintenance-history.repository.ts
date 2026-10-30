import { eq, desc, inArray } from 'drizzle-orm';
import type { DatabaseInstance } from '@automotors/database';
import { maintenanceRecords, maintenanceCorrections } from '@automotors/database';
import {
  MaintenanceRecord,
  type MaintenanceRecordProps,
  type RecordOrigin,
} from '../../modules/maintenance-history/domain/maintenance-record.ts';
import type { IMaintenanceHistoryRepository } from '../../modules/maintenance-history/domain/history-repository.interface.ts';

export interface MaintenanceCorrectionEntry {
  id: string;
  recordId: string;
  actorId: string;
  actorName: string;
  reason: string;
  previousData: Record<string, unknown>;
  correctedData: Record<string, unknown>;
  createdAt: Date;
}

export class PostgresMaintenanceHistoryRepository implements IMaintenanceHistoryRepository {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  private mapToDomain(row: typeof maintenanceRecords.$inferSelect): MaintenanceRecord {
    const props: MaintenanceRecordProps = {
      vehicleId: row.vehicleId,
      workOrderId: row.workOrderId ?? undefined,
      performingTenantId: row.performingWorkshopId ?? null,
      performingWorkshopName: row.performingWorkshopName,
      recordedByUserId: row.recordedByUserId ?? null,
      recordOrigin: ((row as any).recordOrigin as RecordOrigin) ?? (row.performingWorkshopId ? 'WORKSHOP_CERTIFIED' : 'OWNER_DECLARED'),
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
      .orderBy(desc(maintenanceRecords.serviceDate), desc(maintenanceRecords.recordedMileage));

    return rows.map((r: typeof maintenanceRecords.$inferSelect) => this.mapToDomain(r));
  }

  public async save(record: MaintenanceRecord): Promise<void> {
    const workshopId = record.performingTenantId ? record.performingTenantId : null;
    await (this.db as any)
      .insert(maintenanceRecords)
      .values({
        id: record.id,
        vehicleId: record.vehicleId,
        workOrderId: record.workOrderId ?? null,
        performingWorkshopId: workshopId,
        performingWorkshopName: record.performingWorkshopName,
        recordedByUserId: record.recordedByUserId ?? null,
        recordOrigin: record.recordOrigin,
        serviceDate: record.serviceDate,
        recordedMileage: record.recordedMileage,
        verificationLevel: record.verificationLevel,
        isCertified: record.isCertified,
        criteriaMet: record.criteriaMet,
        interventions: record.interventions,
        evidenceAssetIds: record.evidenceAssetIds,
        internalNotes: record.internalNotes ?? null,
        partsCost: record.partsCost !== undefined ? String(record.partsCost) : null,
        laborCost: record.laborCost !== undefined ? String(record.laborCost) : null,
      })
      .onConflictDoUpdate({
        target: maintenanceRecords.id,
        set: {
          performingWorkshopName: record.performingWorkshopName,
          serviceDate: record.serviceDate,
          recordedMileage: record.recordedMileage,
          verificationLevel: record.verificationLevel,
          isCertified: record.isCertified,
          criteriaMet: record.criteriaMet,
          interventions: record.interventions,
          evidenceAssetIds: record.evidenceAssetIds,
          internalNotes: record.internalNotes ?? null,
          partsCost: record.partsCost !== undefined ? String(record.partsCost) : null,
          laborCost: record.laborCost !== undefined ? String(record.laborCost) : null,
        },
      });
  }

  public async findCorrectionsByRecordIds(
    recordIds: string[]
  ): Promise<Record<string, MaintenanceCorrectionEntry[]>> {
    if (recordIds.length === 0) return {};
    const rows = await (this.db as any)
      .select()
      .from(maintenanceCorrections)
      .where(inArray(maintenanceCorrections.recordId, recordIds))
      .orderBy(desc(maintenanceCorrections.createdAt));

    const grouped: Record<string, MaintenanceCorrectionEntry[]> = {};
    for (const row of rows) {
      const list = grouped[row.recordId] ?? [];
      list.push({
        id: row.id,
        recordId: row.recordId,
        actorId: row.actorId,
        actorName: row.actorName,
        reason: row.reason,
        previousData: (row.previousData as Record<string, unknown>) ?? {},
        correctedData: (row.correctedData as Record<string, unknown>) ?? {},
        createdAt: row.createdAt,
      });
      grouped[row.recordId] = list;
    }
    return grouped;
  }

  public async addCorrection(params: {
    recordId: string;
    actorId: string;
    actorName: string;
    reason: string;
    previousData: Record<string, unknown>;
    correctedData: Record<string, unknown>;
  }): Promise<MaintenanceCorrectionEntry> {
    const inserted = await (this.db as any)
      .insert(maintenanceCorrections)
      .values({
        recordId: params.recordId,
        actorId: params.actorId,
        actorName: params.actorName,
        reason: params.reason.trim(),
        previousData: params.previousData,
        correctedData: params.correctedData,
      })
      .returning();

    const row = inserted[0];
    return {
      id: row.id,
      recordId: row.recordId,
      actorId: row.actorId,
      actorName: row.actorName,
      reason: row.reason,
      previousData: (row.previousData as Record<string, unknown>) ?? {},
      correctedData: (row.correctedData as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
    };
  }
}
