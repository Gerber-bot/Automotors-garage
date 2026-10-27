import type { Customer } from './customer.ts';

export interface ICustomerRepository {
  findById(id: string, tenantId: string): Promise<Customer | null>;
  findByPhone(phone: string, tenantId: string): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
  listByTenant(tenantId: string): Promise<readonly Customer[]>;
}
