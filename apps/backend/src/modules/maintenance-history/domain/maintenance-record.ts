import { Entity } from '../../../shared/domain/entity.ts';
import { Result } from '../../../shared/domain/result.ts';
import { VerificationLevel } from './verification-level.ts';

export type RecordOrigin = 'WORKSHOP_CERTIFIED' | 'OWNER_DECLARED';

export interface MaintenanceRecordProps {
  vehicleId: string;
  workOrderId?: string;
  performingTenantId?: string | null;
  performingWorkshopName: string;
  recordedByUserId?: string | null;
  recordOrigin?: RecordOrigin;
  serviceDate: Date;
  recordedMileage: number;
  verificationLevel: VerificationLevel;
  criteriaMet: readonly string[];
  isCertified: boolean;
  interventions: readonly {
    title: string;
    category: string;
    description: string;
  }[];
  evidenceAssetIds: readonly string[];
  // Confidential workshop data or owner observations
  internalNotes?: string;
  partsCost?: number;
  laborCost?: number;
}

export class MaintenanceRecord extends Entity<MaintenanceRecordProps> {
  private constructor(props: MaintenanceRecordProps, id?: string, createdAt?: Date, updatedAt?: Date) {
    super(props, id, createdAt, updatedAt);
  }

  public static create(
    props: MaintenanceRecordProps,
    id?: string
  ): Result<MaintenanceRecord, string> {
    if (!props.vehicleId) return Result.fail('Vehicle ID is required.');
    const isOwnerDeclared = props.recordOrigin === 'OWNER_DECLARED' || !props.performingTenantId;
    if (!props.performingTenantId && !props.recordedByUserId) {
      return Result.fail('Either performing tenant ID or recordedByUserId is required.');
    }
    if (props.recordedMileage < 0) return Result.fail('Recorded mileage cannot be negative.');
    if (!props.interventions || props.interventions.length === 0) {
      return Result.fail('At least one intervention must be recorded.');
    }

    const sanitizedProps: MaintenanceRecordProps = {
      ...props,
      recordOrigin: isOwnerDeclared ? 'OWNER_DECLARED' : 'WORKSHOP_CERTIFIED',
      verificationLevel: isOwnerDeclared ? VerificationLevel.DECLARED : props.verificationLevel,
      isCertified: isOwnerDeclared ? false : props.isCertified,
    };

    const record = new MaintenanceRecord(sanitizedProps, id);
    return Result.ok(record);
  }

  public static restore(
    props: MaintenanceRecordProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): MaintenanceRecord {
    return new MaintenanceRecord(props, id, createdAt, updatedAt);
  }

  public get vehicleId(): string {
    return this.props.vehicleId;
  }

  public get workOrderId(): string | undefined {
    return this.props.workOrderId;
  }

  public get performingTenantId(): string {
    return this.props.performingTenantId ?? '';
  }

  public get performingWorkshopName(): string {
    return this.props.performingWorkshopName;
  }

  public get recordedByUserId(): string | undefined {
    return this.props.recordedByUserId ?? undefined;
  }

  public get recordOrigin(): RecordOrigin {
    return this.props.recordOrigin ?? (this.props.performingTenantId ? 'WORKSHOP_CERTIFIED' : 'OWNER_DECLARED');
  }

  public get serviceDate(): Date {
    return this.props.serviceDate;
  }

  public get recordedMileage(): number {
    return this.props.recordedMileage;
  }

  public get verificationLevel(): VerificationLevel {
    return this.props.verificationLevel;
  }

  public get criteriaMet(): readonly string[] {
    return this.props.criteriaMet;
  }

  public get isCertified(): boolean {
    return this.props.isCertified;
  }

  public get interventions(): readonly { title: string; category: string; description: string }[] {
    return this.props.interventions;
  }

  public get evidenceAssetIds(): readonly string[] {
    return this.props.evidenceAssetIds;
  }

  public get internalNotes(): string | undefined {
    return this.props.internalNotes;
  }

  public get partsCost(): number | undefined {
    return this.props.partsCost;
  }

  public get laborCost(): number | undefined {
    return this.props.laborCost;
  }

  /**
   * Generates public verifiable passport projection.
   * Strips all internal costs, profits, and mechanic annotations.
   */
  public toPublicPassportEntry(): Record<string, unknown> {
    return {
      recordId: this.id,
      serviceDate: this.props.serviceDate.toISOString(),
      recordedMileage: this.props.recordedMileage,
      workshopName: this.props.performingWorkshopName,
      recordOrigin: this.recordOrigin,
      verificationLevel: this.props.verificationLevel,
      isCertified: this.props.isCertified,
      servicesPerformed: this.props.interventions.map((i) => ({
        title: i.title,
        category: i.category,
      })),
      hasPhotographicEvidence: this.props.evidenceAssetIds.length > 0,
    };
  }

  /**
   * Workshop-scoped projection: redacts internal notes/costs if another workshop performed it.
   */
  public toWorkshopProjection(viewingTenantId: string): Record<string, unknown> {
    const isOwnRecord = Boolean(this.props.performingTenantId && this.props.performingTenantId === viewingTenantId);

    return {
      recordId: this.id,
      workOrderId: this.props.workOrderId,
      serviceDate: this.props.serviceDate.toISOString(),
      recordedMileage: this.props.recordedMileage,
      workshopName: this.props.performingWorkshopName,
      recordOrigin: this.recordOrigin,
      verificationLevel: this.props.verificationLevel,
      isCertified: this.props.isCertified,
      interventions: this.props.interventions,
      hasPhotographicEvidence: this.props.evidenceAssetIds.length > 0,
      isOwnRecord,
      internalNotes: isOwnRecord ? this.props.internalNotes : undefined,
      financials: isOwnRecord
        ? { partsCost: this.props.partsCost, laborCost: this.props.laborCost }
        : undefined,
    };
  }
}
