import type { UserSession } from '../services/session.service.ts';

export interface SessionRepositoryPort {
  save(session: UserSession): Promise<void>;
  findById(id: string): Promise<UserSession | null>;
  revoke(id: string, revokedAt?: Date): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export class InMemorySessionRepository implements SessionRepositoryPort {
  private readonly sessions = new Map<string, UserSession>();

  public async save(session: UserSession): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }

  public async findById(id: string): Promise<UserSession | null> {
    const s = this.sessions.get(id);
    return s ? { ...s } : null;
  }

  public async revoke(id: string, revokedAt: Date = new Date()): Promise<void> {
    const s = this.sessions.get(id);
    if (s) {
      s.isRevoked = true;
      s.revokedAt = revokedAt;
    }
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.isRevoked = true;
        session.revokedAt = new Date();
      }
    }
  }

  public async deleteExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt.getTime() <= now) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }
}
