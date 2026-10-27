import { Entity } from '../../../shared/domain/entity.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface CustomerProps {
  tenantId: string;
  fullName: string;
  email?: string;
  phone: string;
  taxId?: string; // DNI / CUIT / VAT
  address?: string;
}

export class Customer extends Entity<CustomerProps> {
  private constructor(props: CustomerProps, id?: string, createdAt?: Date, updatedAt?: Date, version?: number) {
    super(props, id, createdAt, updatedAt, version);
  }

  public static create(props: CustomerProps, id?: string): Result<Customer, string> {
    if (!props.tenantId || props.tenantId.trim().length === 0) {
      return Result.fail('TenantId is required for customer.');
    }
    if (!props.fullName || props.fullName.trim().length === 0) {
      return Result.fail('Customer full name is required.');
    }
    if (!props.phone || props.phone.trim().length === 0) {
      return Result.fail('Customer phone number is required.');
    }

    const customer = new Customer(
      {
        ...props,
        fullName: props.fullName.trim(),
        email: props.email?.trim().toLowerCase(),
        phone: props.phone.trim(),
      },
      id
    );

    return Result.ok(customer);
  }

  public static restore(
    props: CustomerProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    version?: number
  ): Customer {
    return new Customer(props, id, createdAt, updatedAt, version);
  }

  public get tenantId(): string {
    return this.props.tenantId;
  }

  public get fullName(): string {
    return this.props.fullName;
  }

  public get email(): string | undefined {
    return this.props.email;
  }

  public get phone(): string {
    return this.props.phone;
  }

  public get taxId(): string | undefined {
    return this.props.taxId;
  }
}
