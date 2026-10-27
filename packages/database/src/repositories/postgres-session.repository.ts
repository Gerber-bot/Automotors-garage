import { eq, and, lte } from 'drizzle-orm';
import type { DatabaseInstance } from '../client.ts';
import { sessions } from '../schema/iam.ts';
import type { UserSession, SessionRepositoryPort } from '@automotors/security-foundation';

export class PostgresSessionRepository implements SessionRepositoryPort {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  public async save(session: UserSession): Promise<void> {
    await this.db
      .insert(sessions)
      .values({
        id: session.id,
        userId: session.userId,
        activeWorkshopId: session.activeTenantId ?? undefined,
        refreshTokenHash: (session as any).refreshTokenHash,
        expiresAt: session.expiresAt,
        isRevoked: session.isRevoked,
        revokedAt: session.revokedAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          activeWorkshopId: session.activeTenantId ?? undefined,
          isRevoked: session.isRevoked,
          revokedAt: session.revokedAt,
          updatedAt: new Date(),
        },
      });
  }

  public async findById(id: string): Promise<UserSession | null> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      activeTenantId: row.activeWorkshopId ?? null,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      isRevoked: row.isRevoked,
      revokedAt: row.revokedAt ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      userAgent: row.userAgent ?? undefined,
    };
  }

  public async revoke(id: string, revokedAt: Date = new Date()): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        isRevoked: true,
        revokedAt,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(sessions.userId, userId), eq(sessions.isRevoked, false)));
  }

  public async deleteExpired(): Promise<number> {
    const deleted = await (this.db as any)
      .delete(sessions)
      .where(lte(sessions.expiresAt, new Date()))
      .returning({ id: sessions.id });

    return deleted.length;
  }
}
