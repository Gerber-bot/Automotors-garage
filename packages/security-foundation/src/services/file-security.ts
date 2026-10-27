import * as crypto from 'node:crypto';
import { AccessDeniedError } from '../domain/errors.ts';
import { AuthenticatedPrincipal } from '../domain/principal.ts';

export interface PrivateFileMetadata {
  readonly id: string;
  readonly tenantId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly isPrivate: boolean;
  readonly storageKey: string;
}

export class FileSecurityService {
  private readonly secret: string;

  constructor(secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error('FileSecurity secret must be at least 32 characters in length');
    }
    this.secret = secret;
  }

  public generatePresignedTicket(
    principal: AuthenticatedPrincipal,
    file: PrivateFileMetadata,
    ttlSeconds: number = 300 // 5 minutes
  ): string {
    if (!principal.isPlatformSuperAdmin && file.tenantId !== principal.activeTenantId) {
      throw new AccessDeniedError('Cannot generate download ticket for a file belonging to another workshop.');
    }

    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${file.id}:${file.tenantId}:${principal.id}:${exp}`;

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');

    return `${Buffer.from(payload).toString('base64url')}.${signature}`;
  }

  public verifyPresignedTicket(ticket: string): { fileId: string; tenantId: string; userId: string } {
    const parts = ticket.split('.');
    if (parts.length !== 2) {
      throw new AccessDeniedError('Invalid file ticket format.');
    }

    const [payloadB64, signatureB64] = parts;
    if (!payloadB64 || !signatureB64) {
      throw new AccessDeniedError('Malformed file ticket.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(Buffer.from(payloadB64, 'base64url').toString('utf8'))
      .digest('base64url');

    const sigBuffer = Buffer.from(signatureB64);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new AccessDeniedError('Invalid or forged file ticket signature.');
    }

    const decoded = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const [fileId, tenantId, userId, expStr] = decoded.split(':');

    if (!fileId || !tenantId || !userId || !expStr) {
      throw new AccessDeniedError('Incomplete ticket claims.');
    }

    const exp = parseInt(expStr, 10);
    if (exp < Math.floor(Date.now() / 1000)) {
      throw new AccessDeniedError('File ticket has expired.');
    }

    return { fileId, tenantId, userId };
  }
}
