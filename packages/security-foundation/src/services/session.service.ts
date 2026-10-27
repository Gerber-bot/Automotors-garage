import { SessionRevokedError } from '../domain/errors.ts';
import type { SessionRepositoryPort } from '../domain/session-repository.port.ts';

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
  private readonly repo?: SessionRepositoryPort;

  constructor(repo?: SessionRepositoryPort) {
    this.repo = repo;
  }

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
    if (this.repo) {
      void this.repo.save(session);
    }
    return session;
  }

  public async createSessionPersisted(
    userId: string,
    activeTenantId: string | null,
    ttlMinutes: number = 60 * 24 * 7,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserSession> {
    const session = this.createSession(userId, activeTenantId, ttlMinutes, metadata);
    if (this.repo) {
      await this.repo.save(session);
    }
    return session;
  }

  public assertActive(sessionId: string): UserSession {
    const session = this.sessions.get(sessionId);

    if (!session || session.isRevoked || session.expiresAt.getTime() <= Date.now()) {
      throw new SessionRevokedError('Session is invalid, expired, or has been revoked.');
    }

    return session;
  }

  public async assertActivePersisted(sessionId: string): Promise<UserSession> {
    let session = this.sessions.get(sessionId);
    if (this.repo) {
      const dbSession = await this.repo.findById(sessionId);
      if (dbSession) {
        session = dbSession;
        this.sessions.set(sessionId, dbSession);
      }
    }

    if (!session || session.isRevoked || session.expiresAt.getTime() <= Date.now()) {
      throw new SessionRevokedError('Session is invalid, expired, or has been revoked.');
    }

    return session;
  }

  public async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
      session.revokedAt = new Date();
    }
    if (this.repo) {
      await this.repo.revoke(sessionId);
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.isRevoked) {
        session.isRevoked = true;
        session.revokedAt = new Date();
      }
    }
    if (this.repo) {
      await this.repo.revokeAllForUser(userId);
    }
  }

  public getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }
}
