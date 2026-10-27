import type { IMaintenanceHistoryRepository } from '../domain/history-repository.interface.ts';
import type { MaintenanceRecord } from '../domain/maintenance-record.ts';

export class InMemoryMaintenanceHistoryRepository implements IMaintenanceHistoryRepository {
  private readonly records = new Map<string, MaintenanceRecord>();

  public async findById(id: string): Promise<MaintenanceRecord | null> {
    return this.records.get(id) ?? null;
  }

  public async findByVehicleId(vehicleId: string): Promise<readonly MaintenanceRecord[]> {
    return Array.from(this.records.values())
      .filter((r) => r.vehicleId === vehicleId)
      .sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());
  }

  public async save(record: MaintenanceRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  public clear(): void {
    this.records.clear();
  }
}
