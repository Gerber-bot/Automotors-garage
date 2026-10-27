import type { AuditRecord } from '../domain/audit-events.ts';

export class AuditService {
  private readonly records: AuditRecord[] = [];
  private readonly SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'secret',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'creditcard',
    'cvv',
  ]);

  /**
   * Log an audit event, ensuring all sensitive fields are masked.
   */
  public log(record: AuditRecord): void {
    const sanitizedRecord: AuditRecord = {
      ...record,
      details: record.details ? this.maskSensitiveData(record.details) : undefined,
    };

    this.records.push(Object.freeze(sanitizedRecord));
  }

  /**
   * Query in-memory audit records for tests and verification.
   */
  public getRecords(): readonly AuditRecord[] {
    return [...this.records];
  }

  public clear(): void {
    this.records.length = 0;
  }

  private maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.maskSensitiveData(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
