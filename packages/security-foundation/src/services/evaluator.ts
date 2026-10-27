import {
  ResourceType,
  Action,
  ROLE_HIERARCHY_LEVEL,
} from '../domain/policies.ts';
import type {
  ResourceEntity,
  PolicyEvaluationResult,
} from '../domain/policies.ts';
import { Role, Permission } from '../domain/roles.ts';
import { AuthenticatedPrincipal } from '../domain/principal.ts';
import { AuditService } from './audit.service.ts';
import { AuditEventType } from '../domain/audit-events.ts';

export interface EvaluatorContext {
  readonly auditService?: AuditService;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export class ResourceAccessEvaluator {
  private readonly auditService?: AuditService;

  constructor(auditService?: AuditService) {
    this.auditService = auditService;
  }

  /**
   * Deny-by-default resource access evaluator.
   */
  public evaluate(
    principal: AuthenticatedPrincipal | null,
    action: Action,
    resourceType: ResourceType,
    resource?: ResourceEntity,
    context?: EvaluatorContext
  ): PolicyEvaluationResult {
    const audit = context?.auditService ?? this.auditService;

    // Rule 1: Public views (e.g. public vehicle passport summary)
    if (action === Action.VIEW_PUBLIC && resourceType === ResourceType.VEHICLE_PASSPORT) {
      this.recordAudit(audit, AuditEventType.VEHICLE_PASSPORT_VIEWED, 'ALLOW', principal, resourceType, resource?.id, action);
      return { allowed: true };
    }

    // Rule 2: Unauthenticated principal cannot perform any protected action
    if (!principal) {
      this.recordAudit(audit, AuditEventType.ACCESS_DENIED, 'DENY', null, resourceType, resource?.id, action, 'No session provided');
      return { allowed: false, reason: 'Authentication required. No valid session provided.' };
    }

    // Rule 3: Platform Super Admin bypasses tenant boundaries with full audit trail
    if (principal.isPlatformSuperAdmin) {
      this.recordAudit(audit, AuditEventType.RESOURCE_ACCESSED, 'ALLOW', principal, resourceType, resource?.id, action, 'Super Admin override');
      return { allowed: true };
    }

    // Rule 4: Active tenant required for multi-tenant resources
    if (!principal.activeTenantId) {
      this.recordAudit(audit, AuditEventType.ACCESS_DENIED, 'DENY', principal, resourceType, resource?.id, action, 'No active tenant selected');
      return { allowed: false, reason: 'No active workshop/tenant selected in session.' };
    }

    // Rule 5: Cross-tenant isolation enforcement
    if (resource?.tenantId && resource.tenantId !== principal.activeTenantId) {
      this.recordAudit(
        audit,
        AuditEventType.CROSS_TENANT_VIOLATION,
        'DENY',
        principal,
        resourceType,
        resource.id,
        action,
        `Resource tenant (${resource.tenantId}) != Principal active tenant (${principal.activeTenantId})`
      );
      return {
        allowed: false,
        reason: 'Cross-tenant violation: resource belongs to another workshop.',
      };
    }

    const role = principal.getActiveRole();
    if (!role) {
      return { allowed: false, reason: 'Principal does not have an active role in the selected tenant.' };
    }

    // Rule 6: Privilege escalation prevention (Role Assignment)
    if (action === Action.ASSIGN_ROLE) {
      const targetRole = resource?.targetRole as Role | undefined;
      if (!targetRole) {
        return { allowed: false, reason: 'Target role not specified for role assignment.' };
      }

      const principalLevel = ROLE_HIERARCHY_LEVEL[role] ?? 0;
      const targetLevel = ROLE_HIERARCHY_LEVEL[targetRole] ?? 0;

      // Cannot assign a role equal to or higher than one's own
      if (targetLevel >= principalLevel) {
        this.recordAudit(
          audit,
          AuditEventType.ROLE_ELEVATION_ATTEMPT,
          'DENY',
          principal,
          resourceType,
          resource?.id,
          action,
          `Attempted to assign role ${targetRole} (level ${targetLevel}) with principal level ${principalLevel}`
        );
        return {
          allowed: false,
          reason: 'Privilege escalation blocked: cannot assign role equal to or higher than your own.',
        };
      }
    }

    // Rule 7: Immutable closed repair order check
    if (resourceType === ResourceType.WORK_ORDER && action === Action.UPDATE) {
      const status = String(resource?.status ?? '').toUpperCase();
      if (status === 'CLOSED' || status === 'COMPLETED') {
        this.recordAudit(
          audit,
          AuditEventType.ACCESS_DENIED,
          'DENY',
          principal,
          resourceType,
          resource?.id,
          action,
          `Attempt to mutate work order in terminal state: ${status}`
        );
        return {
          allowed: false,
          reason: `Work order is ${status} and cannot be modified.`,
        };
      }
    }

    // Rule 8: Vehicle Owner permissions
    if (role === Role.VEHICLE_OWNER) {
      if (resourceType === ResourceType.WORK_ORDER) {
        const isOwner = resource?.ownerId === principal.id;
        if (!isOwner) {
          return { allowed: false, reason: 'Vehicle owner can only access their own vehicle repair orders.' };
        }
        if (action === Action.READ || action === Action.APPROVE) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Vehicle owners cannot modify repair orders directly.' };
      }

      if (resourceType === ResourceType.INVOICE && action === Action.READ) {
        return resource?.ownerId === principal.id
          ? { allowed: true }
          : { allowed: false, reason: 'Invoice does not belong to user.' };
      }

      return { allowed: false, reason: 'Vehicle owner not authorized for requested action.' };
    }

    // Rule 9: Mechanic permissions & scope
    if (role === Role.MECHANIC) {
      if (resourceType === ResourceType.CUSTOMER) {
        if (action === Action.READ) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Mechanics are not permitted to create, update, or delete customers.' };
      }

      if (resourceType === ResourceType.WORK_ORDER) {
        if (action === Action.READ || action === Action.UPDATE) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Mechanics cannot close or approve invoices for work orders.' };
      }
    }

    // Rule 10: Standard RBAC Permission checks for Staff
    const requiredPermission = this.resolveRequiredPermission(action, resourceType);
    if (requiredPermission && !principal.hasPermission(requiredPermission)) {
      this.recordAudit(audit, AuditEventType.ACCESS_DENIED, 'DENY', principal, resourceType, resource?.id, action, 'Missing permission');
      return { allowed: false, reason: `Missing required permission: ${requiredPermission}` };
    }

    this.recordAudit(audit, AuditEventType.RESOURCE_ACCESSED, 'ALLOW', principal, resourceType, resource?.id, action);
    return { allowed: true };
  }

  private resolveRequiredPermission(action: Action, resourceType: ResourceType): Permission | null {
    switch (resourceType) {
      case ResourceType.CUSTOMER:
        if (action === Action.READ) return Permission.CUSTOMER_READ;
        if (action === Action.CREATE) return Permission.CUSTOMER_CREATE;
        if (action === Action.UPDATE) return Permission.CUSTOMER_UPDATE;
        if (action === Action.DELETE) return Permission.CUSTOMER_DELETE;
        break;
      case ResourceType.WORK_ORDER:
        if (action === Action.READ) return Permission.WORKORDER_READ;
        if (action === Action.CREATE) return Permission.WORKORDER_CREATE;
        if (action === Action.UPDATE) return Permission.WORKORDER_UPDATE;
        if (action === Action.CLOSE) return Permission.WORKORDER_CLOSE;
        if (action === Action.APPROVE) return Permission.WORKORDER_APPROVE;
        break;
      case ResourceType.EVIDENCE_FILE:
        if (action === Action.DOWNLOAD || action === Action.READ) return Permission.EVIDENCE_READ_PRIVATE;
        if (action === Action.CREATE) return Permission.EVIDENCE_UPLOAD;
        if (action === Action.DELETE) return Permission.EVIDENCE_DELETE;
        break;
      case ResourceType.USER_MEMBERSHIP:
        if (action === Action.ASSIGN_ROLE) return Permission.ROLE_ASSIGN;
        break;
      case ResourceType.INVOICE:
        if (action === Action.READ) return Permission.INVOICE_READ;
        if (action === Action.CREATE) return Permission.INVOICE_CREATE;
        if (action === Action.UPDATE) return Permission.INVOICE_UPDATE;
        break;
    }
    return null;
  }

  private recordAudit(
    audit: AuditService | undefined,
    eventType: AuditEventType,
    outcome: 'ALLOW' | 'DENY',
    principal: AuthenticatedPrincipal | null,
    resourceType?: string,
    resourceId?: string,
    action?: string,
    details?: string
  ): void {
    if (!audit) return;
    audit.log({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      outcome,
      principalId: principal?.id,
      tenantId: principal?.activeTenantId ?? undefined,
      resourceType,
      resourceId,
      action,
      details: details ? { message: details } : undefined,
    });
  }
}
