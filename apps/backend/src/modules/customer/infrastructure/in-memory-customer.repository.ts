import type { ICustomerRepository } from '../domain/customer-repository.interface.ts';
import type { Customer } from '../domain/customer.ts';

export class InMemoryCustomerRepository implements ICustomerRepository {
  private readonly customers = new Map<string, Customer>();

  public async findById(id: string, tenantId: string): Promise<Customer | null> {
    const c = this.customers.get(id);
    if (!c || c.tenantId !== tenantId) return null;
    return c;
  }

  public async findByPhone(phone: string, tenantId: string): Promise<Customer | null> {
    for (const c of this.customers.values()) {
      if (c.tenantId === tenantId && c.phone === phone) {
        return c;
      }
    }
    return null;
  }

  public async save(customer: Customer): Promise<void> {
    this.customers.set(customer.id, customer);
  }

  public async listByTenant(tenantId: string): Promise<readonly Customer[]> {
    return Array.from(this.customers.values()).filter((c) => c.tenantId === tenantId);
  }

  public clear(): void {
    this.customers.clear();
  }
}
