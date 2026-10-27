import { Entity } from '../../../shared/domain/entity.ts';
import { Result } from '../../../shared/domain/result.ts';

export const WorkOrderStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export interface InterventionItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string; // e.g. "Brakes", "Engine", "Suspension", "Oil & Filters"
  readonly laborHours?: number;
}

export interface ReplacedPart {
  readonly partNumber: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitCost?: number; // Internal to workshop
}

export interface CorrectionEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly actorId: string;
  readonly origin: string; // e.g. "WEB_PORTAL", "AUDIT_REMEDY"
  readonly reason: string;
  readonly changes: Record<string, { oldValue: unknown; newValue: unknown }>;
}

export interface WorkOrderProps {
  tenantId: string;
  workshopName: string;
  vehicleId: string;
  customerId: string;
  assignedMechanicId?: string;
  entryDate: Date;
  reportedMileage: number;
  reportedIssue: string;
  initialCondition?: string;
  diagnosis?: string;
  interventions: InterventionItem[];
  parts: ReplacedPart[];
  evidenceAssetIds: string[];
  observations?: string;
  status: WorkOrderStatus;
  closedAt?: Date;
  corrections: CorrectionEntry[];
}

export class WorkOrder extends Entity<WorkOrderProps> {
  private constructor(props: WorkOrderProps, id?: string, createdAt?: Date, updatedAt?: Date, version?: number) {
    super(props, id, createdAt, updatedAt, version);
  }

  public static create(
    props: Omit<WorkOrderProps, 'status' | 'interventions' | 'parts' | 'evidenceAssetIds' | 'corrections'> & {
      interventions?: InterventionItem[];
      parts?: ReplacedPart[];
      evidenceAssetIds?: string[];
    },
    id?: string
  ): Result<WorkOrder, string> {
    if (!props.tenantId) return Result.fail('Tenant ID is required.');
    if (!props.vehicleId) return Result.fail('Vehicle ID is required.');
    if (!props.customerId) return Result.fail('Customer ID is required.');
    if (props.reportedMileage < 0) return Result.fail('Reported mileage cannot be negative.');
    if (!props.reportedIssue || props.reportedIssue.trim().length === 0) {
      return Result.fail('Reported issue is required.');
    }

    const workOrder = new WorkOrder(
      {
        ...props,
        status: WorkOrderStatus.OPEN,
        interventions: props.interventions ? [...props.interventions] : [],
        parts: props.parts ? [...props.parts] : [],
        evidenceAssetIds: props.evidenceAssetIds ? [...props.evidenceAssetIds] : [],
        corrections: [],
      },
      id
    );

    return Result.ok(workOrder);
  }

  public get tenantId(): string {
    return this.props.tenantId;
  }

  public get workshopName(): string {
    return this.props.workshopName;
  }

  public get vehicleId(): string {
    return this.props.vehicleId;
  }

  public get customerId(): string {
    return this.props.customerId;
  }

  public get assignedMechanicId(): string | undefined {
    return this.props.assignedMechanicId;
  }

  public get entryDate(): Date {
    return this.props.entryDate;
  }

  public get reportedMileage(): number {
    return this.props.reportedMileage;
  }

  public get reportedIssue(): string {
    return this.props.reportedIssue;
  }

  public get initialCondition(): string | undefined {
    return this.props.initialCondition;
  }

  public get diagnosis(): string | undefined {
    return this.props.diagnosis;
  }

  public get interventions(): readonly InterventionItem[] {
    return this.props.interventions;
  }

  public get parts(): readonly ReplacedPart[] {
    return this.props.parts;
  }

  public get evidenceAssetIds(): readonly string[] {
    return this.props.evidenceAssetIds;
  }

  public get observations(): string | undefined {
    return this.props.observations;
  }

  public get status(): WorkOrderStatus {
    return this.props.status;
  }

  public get closedAt(): Date | undefined {
    return this.props.closedAt;
  }

  public get corrections(): readonly CorrectionEntry[] {
    return this.props.corrections;
  }

  public isTerminal(): boolean {
    return this.props.status === WorkOrderStatus.COMPLETED || this.props.status === WorkOrderStatus.CANCELLED;
  }

  public assignMechanic(mechanicId: string): Result<void, string> {
    if (this.isTerminal()) {
      return Result.fail(`Cannot modify closed work order (${this.props.status}).`);
    }
    this.props.assignedMechanicId = mechanicId;
    this.incrementVersion();
    return Result.ok(undefined);
  }

  public recordDiagnosis(diagnosis: string): Result<void, string> {
    if (this.isTerminal()) {
      return Result.fail(`Cannot modify closed work order (${this.props.status}).`);
    }
    this.props.diagnosis = diagnosis.trim();
    if (this.props.status === WorkOrderStatus.OPEN) {
      this.props.status = WorkOrderStatus.IN_PROGRESS;
    }
    this.incrementVersion();
    return Result.ok(undefined);
  }

  public addIntervention(item: InterventionItem): Result<void, string> {
    if (this.isTerminal()) {
      return Result.fail(`Cannot modify closed work order (${this.props.status}).`);
    }
    this.props.interventions.push(item);
    this.incrementVersion();
    return Result.ok(undefined);
  }

  public addPart(part: ReplacedPart): Result<void, string> {
    if (this.isTerminal()) {
      return Result.fail(`Cannot modify closed work order (${this.props.status}).`);
    }
    this.props.parts.push(part);
    this.incrementVersion();
    return Result.ok(undefined);
  }

  public attachEvidence(evidenceAssetId: string): Result<void, string> {
    if (this.isTerminal()) {
      return Result.fail(`Cannot modify closed work order (${this.props.status}).`);
    }
    this.props.evidenceAssetIds.push(evidenceAssetId);
    this.incrementVersion();
    return Result.ok(undefined);
  }

  public transitionStatus(newStatus: WorkOrderStatus): Result<void, string> {
    if (this.isTerminal()) {
      return Result.fail(`Work order is in terminal state '${this.props.status}' and cannot change status.`);
    }
    this.props.status = newStatus;
    if (newStatus === WorkOrderStatus.COMPLETED) {
      this.props.closedAt = new Date();
    }
    this.incrementVersion();
    return Result.ok(undefined);
  }

  /**
   * Appends an auditable correction to a closed order without silent mutation.
   */
  public appendCorrection(
    actorId: string,
    origin: string,
    reason: string,
    changes: Record<string, { oldValue: unknown; newValue: unknown }>
  ): Result<void, string> {
    if (!reason || reason.trim().length === 0) {
      return Result.fail('A justifiable reason is required to submit a post-closing correction.');
    }

    const correction: CorrectionEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      actorId,
      origin,
      reason: reason.trim(),
      changes,
    };

    this.props.corrections.push(correction);
    this.incrementVersion();
    return Result.ok(undefined);
  }
}
