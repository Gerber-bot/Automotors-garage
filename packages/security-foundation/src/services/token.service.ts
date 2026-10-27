import * as crypto from 'node:crypto';
import { TokenExpiredOrInvalidError } from '../domain/errors.ts';

export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly tenantId: string | null;
  readonly sessionId: string;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly exp: number;
  readonly iat: number;
}

export class TokenService {
  private readonly secret: string;
  private readonly accessTtlSeconds: number;

  constructor(secret: string, accessTtlSeconds: number = 900) {
    if (!secret || secret.length < 32) {
      throw new Error('JWT Secret must be at least 32 characters in length for cryptographic safety');
    }
    this.secret = secret;
    this.accessTtlSeconds = accessTtlSeconds;
  }

  public generateAccessToken(payload: Omit<JwtPayload, 'exp' | 'iat'>): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + this.accessTtlSeconds;

    const fullPayload: JwtPayload = { ...payload, iat, exp };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  public verifyAccessToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new TokenExpiredOrInvalidError('Malformed token structure.');
    }

    const [headerB64, bodyB64, signatureB64] = parts;
    if (!headerB64 || !bodyB64 || !signatureB64) {
      throw new TokenExpiredOrInvalidError('Missing token segments.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');

    const sigBuffer = Buffer.from(signatureB64);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new TokenExpiredOrInvalidError('Invalid token signature.');
    }

    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8')) as JwtPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new TokenExpiredOrInvalidError('Token has expired.');
    }

    return payload;
  }

  public generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
