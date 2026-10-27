export const AuditEventType = {
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  CROSS_TENANT_VIOLATION: 'CROSS_TENANT_VIOLATION',
  ROLE_ELEVATION_ATTEMPT: 'ROLE_ELEVATION_ATTEMPT',
  RESOURCE_ACCESSED: 'RESOURCE_ACCESSED',
  RESOURCE_MODIFIED: 'RESOURCE_MODIFIED',
  FILE_DOWNLOAD_AUTHORIZED: 'FILE_DOWNLOAD_AUTHORIZED',
  FILE_DOWNLOAD_REJECTED: 'FILE_DOWNLOAD_REJECTED',
  VEHICLE_PASSPORT_VIEWED: 'VEHICLE_PASSPORT_VIEWED',
} as const;
export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

export interface AuditRecord {
  readonly id: string;
  readonly timestamp: string; // ISO 8601
  readonly eventType: AuditEventType;
  readonly outcome: 'ALLOW' | 'DENY';
  readonly principalId?: string;
  readonly tenantId?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly action?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly details?: Record<string, unknown>;
}
