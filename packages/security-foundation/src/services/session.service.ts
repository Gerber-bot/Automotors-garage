import { SessionRevokedError } from '../domain/errors.ts';

export interface UserSession {
  readonly id: string;
  readonly userId: string;
  readonly activeTenantId: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export class SessionService {
  private readonly sessions = new Map<string, UserSession>();

  public createSession(
    userId: string,
    activeTenantId: string | null,
    ttlMinutes: number = 60 * 24 * 7, // 7 days
    metadata?: { ipAddress?: string; userAgent?: string }
  ): UserSession {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);

    const session: UserSession = {
      id,
      userId,
      activeTenantId,
      createdAt,
      expiresAt,
      isRevoked: false,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    };

    this.sessions.set(id, session);
    return session;
  }

  public assertActive(sessionId: string): UserSession {
    const session = this.sessions.get(sessionId);

    if (!session || session.isRevoked || session.expiresAt.getTime() <= Date.now()) {
      throw new SessionRevokedError('Session is invalid, expired, or has been revoked.');
    }

    return session;
  }

  public revokeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
      session.revokedAt = new Date();
    }
  }

  public revokeAllUserSessions(userId: string): void {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.isRevoked) {
        session.isRevoked = true;
        session.revokedAt = new Date();
      }
    }
  }

  public getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }
}
