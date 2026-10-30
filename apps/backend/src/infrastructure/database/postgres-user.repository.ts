import { eq, and } from 'drizzle-orm';
import type { DatabaseInstance } from '@automotors/database';
import { users, workshops, workshopMembers } from '@automotors/database';

export interface AuthUserData {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  isActive: boolean;
  createdAt?: Date;
}

export interface UserWorkshopMembership {
  workshopId: string;
  workshopName: string;
  role: string;
  permissions: string[];
}

export class PostgresUserRepository {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  public async findByEmail(email: string): Promise<AuthUserData | null> {
    const normalized = email.trim().toLowerCase();
    const rows = await (this.db as any)
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    return rows[0] ?? null;
  }

  public async findById(id: string): Promise<AuthUserData | null> {
    const rows = await (this.db as any)
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  public async createUser(params: {
    id?: string;
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthUserData> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const trimmedName = params.fullName.trim();
    const trimmedPhone = params.phone?.trim() || null;

    const inserted = await (this.db as any)
      .insert(users)
      .values({
        ...(params.id ? { id: params.id } : {}),
        email: normalizedEmail,
        passwordHash: params.passwordHash,
        fullName: trimmedName,
        phone: trimmedPhone,
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return inserted[0];
  }

  public async updateProfile(
    userId: string,
    params: { fullName?: string; phone?: string }
  ): Promise<AuthUserData | null> {
    const existing = await this.findById(userId);
    if (!existing) return null;

    const updatedName =
      params.fullName !== undefined && params.fullName.trim().length > 0
        ? params.fullName.trim()
        : existing.fullName;
    const updatedPhone =
      params.phone !== undefined ? params.phone.trim() || null : existing.phone ?? null;

    await (this.db as any)
      .update(users)
      .set({
        fullName: updatedName,
        phone: updatedPhone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return this.findById(userId);
  }

  private getPermissionsForRole(role: string): string[] {
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case 'WORKSHOP_OWNER':
        return ['READ', 'UPDATE', 'CREATE', 'CLOSE_ORDER', 'CALCULATE_PREVENTIVE', 'MANAGE_STAFF'];
      case 'MECHANIC':
        return ['READ', 'UPDATE', 'CREATE', 'CLOSE_ORDER', 'CALCULATE_PREVENTIVE'];
      case 'VEHICLE_OWNER':
        return ['OWNER_PORTAL_ACCESS', 'READ', 'UPDATE', 'CREATE', 'CALCULATE_PREVENTIVE'];
      default:
        return ['READ'];
    }
  }

  public async getUserMemberships(userId: string): Promise<UserWorkshopMembership[]> {
    const rows = await (this.db as any)
      .select({
        workshopId: workshopMembers.workshopId,
        workshopName: workshops.name,
        role: workshopMembers.role,
        isActive: workshopMembers.isActive,
      })
      .from(workshopMembers)
      .innerJoin(workshops, eq(workshopMembers.workshopId, workshops.id))
      .where(and(eq(workshopMembers.userId, userId), eq(workshopMembers.isActive, true)));

    return rows.map((r: any) => ({
      workshopId: r.workshopId,
      workshopName: r.workshopName,
      role: r.role,
      permissions: this.getPermissionsForRole(r.role),
    }));
  }

  public async verifyMembership(userId: string, workshopId: string): Promise<UserWorkshopMembership | null> {
    const rows = await (this.db as any)
      .select({
        workshopId: workshopMembers.workshopId,
        workshopName: workshops.name,
        role: workshopMembers.role,
      })
      .from(workshopMembers)
      .innerJoin(workshops, eq(workshopMembers.workshopId, workshops.id))
      .where(
        and(
          eq(workshopMembers.userId, userId),
          eq(workshopMembers.workshopId, workshopId),
          eq(workshopMembers.isActive, true)
        )
      )
      .limit(1);

    if (!rows[0]) return null;
    return {
      workshopId: rows[0].workshopId,
      workshopName: rows[0].workshopName,
      role: rows[0].role,
      permissions: this.getPermissionsForRole(rows[0].role),
    };
  }
}
