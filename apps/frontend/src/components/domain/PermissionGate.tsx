import React from 'react';
import type { Role } from '../../api/contracts.ts';

export interface UserSessionContext {
  userId: string;
  activeRole: Role;
  permissions: readonly string[];
  activeTenantId: string;
}

export interface PermissionGateProps {
  requiredPermission?: string;
  allowedRoles?: readonly Role[];
  session: UserSessionContext | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  requiredPermission,
  allowedRoles,
  session,
  fallback = null,
  children,
}: PermissionGateProps) {
  if (!session) {
    return <>{fallback}</>;
  }

  // Super admin bypass
  if (session.activeRole === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.activeRole)) {
      return <>{fallback}</>;
    }
  }

  // Permission check
  if (requiredPermission) {
    if (!session.permissions.includes(requiredPermission)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
