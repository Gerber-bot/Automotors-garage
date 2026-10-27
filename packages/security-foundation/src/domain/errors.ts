export abstract class SecurityError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 403) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationRequiredError extends SecurityError {
  constructor(message: string = 'Authentication required. No valid session provided.') {
    super(message, 'AUTHENTICATION_REQUIRED', 401);
  }
}

export class SessionRevokedError extends SecurityError {
  constructor(message: string = 'Session has been revoked or expired.') {
    super(message, 'SESSION_REVOKED', 401);
  }
}

export class AccessDeniedError extends SecurityError {
  constructor(message: string = 'Access denied. You do not possess the required permissions.') {
    super(message, 'ACCESS_DENIED', 403);
  }
}

export class CrossTenantViolationError extends SecurityError {
  public readonly requestedTenantId: string;
  public readonly activeTenantId: string | null;

  constructor(
    requestedTenantId: string,
    activeTenantId: string | null,
    message: string = 'Cross-tenant access violation: resource belongs to a different tenant.'
  ) {
    super(message, 'CROSS_TENANT_VIOLATION', 403);
    this.requestedTenantId = requestedTenantId;
    this.activeTenantId = activeTenantId;
  }
}

export class PrivilegeEscalationError extends SecurityError {
  constructor(message: string = 'Forbidden: Users cannot assign roles equal to or higher than their own.') {
    super(message, 'PRIVILEGE_ESCALATION_BLOCKED', 403);
  }
}

export class ResourceStateViolationError extends SecurityError {
  constructor(message: string = 'Operation not permitted in current resource lifecycle state.') {
    super(message, 'RESOURCE_STATE_INVALID', 422);
  }
}

export class TokenExpiredOrInvalidError extends SecurityError {
  constructor(message: string = 'Security token is invalid or has expired.') {
    super(message, 'TOKEN_INVALID_OR_EXPIRED', 401);
  }
}
