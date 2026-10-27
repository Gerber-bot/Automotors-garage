import { Role, Permission } from './roles.ts';

export const ResourceType = {
  TENANT: 'TENANT',
  CUSTOMER: 'CUSTOMER',
  VEHICLE: 'VEHICLE',
  VEHICLE_PASSPORT: 'VEHICLE_PASSPORT',
  WORK_ORDER: 'WORK_ORDER',
  EVIDENCE_FILE: 'EVIDENCE_FILE',
  INVOICE: 'INVOICE',
  USER_MEMBERSHIP: 'USER_MEMBERSHIP',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const Action = {
  READ: 'READ',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  CLOSE: 'CLOSE',
  ASSIGN_ROLE: 'ASSIGN_ROLE',
  DOWNLOAD: 'DOWNLOAD',
  VIEW_PUBLIC: 'VIEW_PUBLIC',
} as const;
export type Action = (typeof Action)[keyof typeof Action];

export interface ResourceEntity {
  readonly id: string;
  readonly tenantId?: string;
  readonly status?: string;
  readonly ownerId?: string;
  readonly assignedMechanicId?: string;
  readonly isPrivate?: boolean;
  readonly [key: string]: unknown;
}

export interface PolicyEvaluationResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

export const ROLE_HIERARCHY_LEVEL: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.WORKSHOP_OWNER]: 80,
  [Role.WORKSHOP_MANAGER]: 60,
  [Role.MECHANIC]: 40,
  [Role.VEHICLE_OWNER]: 20,
};
