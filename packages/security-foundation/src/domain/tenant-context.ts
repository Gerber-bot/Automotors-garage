import { CrossTenantViolationError } from './errors.ts';

export interface ITenantContext {
  readonly tenantId: string;
  readonly isVerified: boolean;
  assertMatches(targetTenantId: string): void;
}

export class TenantContext implements ITenantContext {
  public readonly tenantId: string;
  public readonly isVerified: boolean;

  constructor(tenantId: string, isVerified: boolean = true) {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('TenantContext cannot be created with an empty tenantId');
    }
    this.tenantId = tenantId;
    this.isVerified = isVerified;
  }

  public assertMatches(targetTenantId: string): void {
    if (this.tenantId !== targetTenantId) {
      throw new CrossTenantViolationError(targetTenantId, this.tenantId);
    }
  }

  public matches(targetTenantId: string): boolean {
    return this.tenantId === targetTenantId;
  }
}
