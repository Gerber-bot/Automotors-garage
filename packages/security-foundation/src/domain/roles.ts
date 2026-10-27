export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  WORKSHOP_OWNER: 'WORKSHOP_OWNER',
  WORKSHOP_MANAGER: 'WORKSHOP_MANAGER',
  MECHANIC: 'MECHANIC',
  VEHICLE_OWNER: 'VEHICLE_OWNER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Permission = {
  // Tenant & Workshop Administration
  TENANT_MANAGE: 'tenant:manage',
  TENANT_SETTINGS_UPDATE: 'tenant:settings:update',
  WORKSHOP_READ: 'workshop:read',
  WORKSHOP_UPDATE: 'workshop:update',
  MEMBER_MANAGE: 'member:manage',
  ROLE_ASSIGN: 'role:assign',

  // Customer Management
  CUSTOMER_READ: 'customer:read',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',

  // Vehicle Registry
  VEHICLE_READ: 'vehicle:read',
  VEHICLE_CREATE: 'vehicle:create',
  VEHICLE_UPDATE: 'vehicle:update',
  VEHICLE_PASSPORT_VIEW_PUBLIC: 'vehicle:passport:view_public',
  VEHICLE_PASSPORT_VIEW_INTERNAL: 'vehicle:passport:view_internal',

  // Work Orders & Repairs
  WORKORDER_READ: 'workorder:read',
  WORKORDER_CREATE: 'workorder:create',
  WORKORDER_UPDATE: 'workorder:update',
  WORKORDER_ASSIGN_MECHANIC: 'workorder:assign_mechanic',
  WORKORDER_DIAGNOSE: 'workorder:diagnose',
  WORKORDER_APPROVE: 'workorder:approve',
  WORKORDER_CLOSE: 'workorder:close',

  // Evidence & Media Files
  EVIDENCE_UPLOAD: 'evidence:upload',
  EVIDENCE_READ_PRIVATE: 'evidence:read_private',
  EVIDENCE_DELETE: 'evidence:delete',

  // Invoicing & Financials
  INVOICE_READ: 'invoice:read',
  INVOICE_CREATE: 'invoice:create',
  INVOICE_UPDATE: 'invoice:update',

  // Audit Logs
  AUDIT_READ: 'audit:read',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.WORKSHOP_OWNER]: [
    Permission.WORKSHOP_READ,
    Permission.WORKSHOP_UPDATE,
    Permission.TENANT_SETTINGS_UPDATE,
    Permission.MEMBER_MANAGE,
    Permission.ROLE_ASSIGN,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_DELETE,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_PASSPORT_VIEW_PUBLIC,
    Permission.VEHICLE_PASSPORT_VIEW_INTERNAL,
    Permission.WORKORDER_READ,
    Permission.WORKORDER_CREATE,
    Permission.WORKORDER_UPDATE,
    Permission.WORKORDER_ASSIGN_MECHANIC,
    Permission.WORKORDER_DIAGNOSE,
    Permission.WORKORDER_APPROVE,
    Permission.WORKORDER_CLOSE,
    Permission.EVIDENCE_UPLOAD,
    Permission.EVIDENCE_READ_PRIVATE,
    Permission.EVIDENCE_DELETE,
    Permission.INVOICE_READ,
    Permission.INVOICE_CREATE,
    Permission.INVOICE_UPDATE,
    Permission.AUDIT_READ,
  ],

  [Role.WORKSHOP_MANAGER]: [
    Permission.WORKSHOP_READ,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_PASSPORT_VIEW_PUBLIC,
    Permission.VEHICLE_PASSPORT_VIEW_INTERNAL,
    Permission.WORKORDER_READ,
    Permission.WORKORDER_CREATE,
    Permission.WORKORDER_UPDATE,
    Permission.WORKORDER_ASSIGN_MECHANIC,
    Permission.WORKORDER_DIAGNOSE,
    Permission.WORKORDER_APPROVE,
    Permission.EVIDENCE_UPLOAD,
    Permission.EVIDENCE_READ_PRIVATE,
    Permission.INVOICE_READ,
    Permission.INVOICE_CREATE,
  ],

  [Role.MECHANIC]: [
    Permission.WORKSHOP_READ,
    Permission.CUSTOMER_READ,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_PASSPORT_VIEW_PUBLIC,
    Permission.VEHICLE_PASSPORT_VIEW_INTERNAL,
    Permission.WORKORDER_READ,
    Permission.WORKORDER_DIAGNOSE,
    Permission.WORKORDER_UPDATE,
    Permission.EVIDENCE_UPLOAD,
    Permission.EVIDENCE_READ_PRIVATE,
  ],

  [Role.VEHICLE_OWNER]: [
    Permission.VEHICLE_PASSPORT_VIEW_PUBLIC,
    Permission.WORKORDER_READ,
    Permission.WORKORDER_APPROVE,
    Permission.INVOICE_READ,
  ],
};
