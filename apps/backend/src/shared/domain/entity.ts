export abstract class Entity<T> {
  public readonly id: string;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public version: number;
  protected props: T;

  constructor(props: T, id?: string, createdAt?: Date, updatedAt?: Date, version: number = 1) {
    this.id = id ?? crypto.randomUUID();
    this.props = props;
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? new Date();
    this.version = version;
  }

  public incrementVersion(): void {
    this.version += 1;
    this.updatedAt = new Date();
  }

  public equals(other?: Entity<T>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}
