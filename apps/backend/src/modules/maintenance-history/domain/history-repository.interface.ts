import type { MaintenanceRecord } from './maintenance-record.ts';

export interface IMaintenanceHistoryRepository {
  findById(id: string): Promise<MaintenanceRecord | null>;
  findByVehicleId(vehicleId: string): Promise<readonly MaintenanceRecord[]>;
  save(record: MaintenanceRecord): Promise<void>;
}
