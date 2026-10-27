import { eq, and } from 'drizzle-orm';
import type { DatabaseInstance } from '@automotors/database';
import { customers } from '@automotors/database';
import { Customer, type CustomerProps } from '../../modules/customer/domain/customer.ts';
import type { ICustomerRepository } from '../../modules/customer/domain/customer-repository.interface.ts';

export class PostgresCustomerRepository implements ICustomerRepository {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  private mapToDomain(row: typeof customers.$inferSelect): Customer {
    const fullName = `${row.firstName} ${row.lastName}`.trim();
    const props: CustomerProps = {
      tenantId: row.workshopId,
      fullName: fullName.length > 0 ? fullName : 'Cliente',
      phone: row.phone,
      email: row.email ?? undefined,
      taxId: row.documentId ?? undefined,
      address: row.notes ?? undefined,
    };

    return Customer.restore(props, row.id, row.createdAt, row.updatedAt);
  }

  public async findById(id: string, tenantId: string): Promise<Customer | null> {
    const rows = await (this.db as any)
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.workshopId, tenantId)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToDomain(row) : null;
  }

  public async findByPhone(phone: string, tenantId: string): Promise<Customer | null> {
    const rows = await (this.db as any)
      .select()
      .from(customers)
      .where(and(eq(customers.phone, phone.trim()), eq(customers.workshopId, tenantId)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToDomain(row) : null;
  }

  public async save(customer: Customer): Promise<void> {
    const parts = customer.fullName.split(' ');
    const firstName = parts[0] ?? 'Cliente';
    const lastName = parts.slice(1).join(' ') || 'General';

    await (this.db as any)
      .insert(customers)
      .values({
        id: customer.id,
        workshopId: customer.tenantId,
        firstName,
        lastName,
        phone: customer.phone,
        email: customer.email ?? null,
        documentId: customer.taxId ?? null,
        notes: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          firstName,
          lastName,
          phone: customer.phone,
          email: customer.email ?? null,
          documentId: customer.taxId ?? null,
          updatedAt: new Date(),
        },
      });
  }

  public async listByTenant(tenantId: string): Promise<readonly Customer[]> {
    const rows = await (this.db as any)
      .select()
      .from(customers)
      .where(eq(customers.workshopId, tenantId));

    return rows.map((r: typeof customers.$inferSelect) => this.mapToDomain(r));
  }
}
