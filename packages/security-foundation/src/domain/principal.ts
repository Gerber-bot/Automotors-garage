import { Role, Permission, ROLE_PERMISSIONS } from './roles.ts';
import { CrossTenantViolationError, AccessDeniedError } from './errors.ts';
import { TenantContext } from './tenant-context.ts';

export interface TenantMembership {
  readonly tenantId: string;
  readonly role: Role;
  readonly status: 'active' | 'suspended';
  readonly customPermissions?: readonly Permission[];
}

export interface PrincipalProps {
  readonly id: string;
  readonly email: string;
  readonly isPlatformSuperAdmin?: boolean;
  readonly memberships: readonly TenantMembership[];
  readonly activeTenantId: string | null;
  readonly sessionId: string;
  readonly mfaVerified?: boolean;
}

export class AuthenticatedPrincipal {
  public readonly id: string;
  public readonly email: string;
  public readonly isPlatformSuperAdmin: boolean;
  public readonly memberships: readonly TenantMembership[];
  public readonly activeTenantId: string | null;
  public readonly sessionId: string;
  public readonly mfaVerified: boolean;

  constructor(props: PrincipalProps) {
    this.id = props.id;
    this.email = props.email.toLowerCase().trim();
    this.isPlatformSuperAdmin = props.isPlatformSuperAdmin ?? false;
    this.memberships = Object.freeze([...props.memberships]);
    this.activeTenantId = props.activeTenantId;
    this.sessionId = props.sessionId;
    this.mfaVerified = props.mfaVerified ?? false;
  }

  public getActiveMembership(): TenantMembership | null {
    if (!this.activeTenantId) return null;
    return this.memberships.find(
      (m) => m.tenantId === this.activeTenantId && m.status === 'active'
    ) ?? null;
  }

  public getActiveRole(): Role | null {
    if (this.isPlatformSuperAdmin) return Role.SUPER_ADMIN;
    return this.getActiveMembership()?.role ?? null;
  }

  public getActivePermissions(): readonly Permission[] {
    if (this.isPlatformSuperAdmin) {
      return Object.values(Permission);
    }

    const membership = this.getActiveMembership();
    if (!membership) return [];

    const basePermissions = ROLE_PERMISSIONS[membership.role] ?? [];
    if (!membership.customPermissions || membership.customPermissions.length === 0) {
      return basePermissions;
    }

    const set = new Set<Permission>([...basePermissions, ...membership.customPermissions]);
    return Array.from(set);
  }

  public hasPermission(permission: Permission): boolean {
    if (this.isPlatformSuperAdmin) return true;
    return this.getActivePermissions().includes(permission);
  }

  public isMemberOf(tenantId: string): boolean {
    if (this.isPlatformSuperAdmin) return true;
    return this.memberships.some(
      (m) => m.tenantId === tenantId && m.status === 'active'
    );
  }

  public assertActiveTenant(targetTenantId: string): TenantContext {
    if (this.isPlatformSuperAdmin) {
      return new TenantContext(targetTenantId, true);
    }

    if (!this.activeTenantId || this.activeTenantId !== targetTenantId) {
      throw new CrossTenantViolationError(targetTenantId, this.activeTenantId);
    }

    if (!this.isMemberOf(targetTenantId)) {
      throw new AccessDeniedError(`User is not an active member of tenant ${targetTenantId}`);
    }

    return new TenantContext(targetTenantId, true);
  }

  public withActiveTenant(newTenantId: string): AuthenticatedPrincipal {
    if (!this.isPlatformSuperAdmin && !this.isMemberOf(newTenantId)) {
      throw new AccessDeniedError(`Cannot switch to unauthorized tenant: ${newTenantId}`);
    }

    return new AuthenticatedPrincipal({
      id: this.id,
      email: this.email,
      isPlatformSuperAdmin: this.isPlatformSuperAdmin,
      memberships: this.memberships,
      activeTenantId: newTenantId,
      sessionId: this.sessionId,
      mfaVerified: this.mfaVerified,
    });
  }
}
