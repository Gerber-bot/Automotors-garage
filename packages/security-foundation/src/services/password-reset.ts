import * as crypto from 'node:crypto';
import { TokenExpiredOrInvalidError } from '../domain/errors.ts';

export interface PasswordResetTokenRecord {
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
  used: boolean;
}

export class PasswordResetService {
  private readonly records = new Map<string, PasswordResetTokenRecord>();
  private readonly ttlMinutes: number;

  constructor(ttlMinutes: number = 15) {
    this.ttlMinutes = ttlMinutes;
  }

  public generateResetToken(userId: string): { plaintextToken: string; expiresAt: Date } {
    const plaintextToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(plaintextToken);
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);

    this.records.set(tokenHash, {
      tokenHash,
      userId,
      expiresAt,
      used: false,
    });

    return { plaintextToken, expiresAt };
  }

  public consumeResetToken(plaintextToken: string): { userId: string } {
    const tokenHash = this.hashToken(plaintextToken);
    const record = this.records.get(tokenHash);

    if (!record || record.used || record.expiresAt.getTime() <= Date.now()) {
      throw new TokenExpiredOrInvalidError('Password reset token is invalid, expired, or already used.');
    }

    record.used = true;
    this.records.delete(tokenHash);

    return { userId: record.userId };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
