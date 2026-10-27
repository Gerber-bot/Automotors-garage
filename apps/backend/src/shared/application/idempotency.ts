export interface IdempotencyRecord<T> {
  readonly key: string;
  readonly createdAt: Date;
  readonly response: T;
}

export class IdempotencyService {
  private readonly store = new Map<string, IdempotencyRecord<unknown>>();

  public get<T>(key: string): T | undefined {
    const record = this.store.get(key);
    return record?.response as T | undefined;
  }

  public set<T>(key: string, response: T): void {
    this.store.set(key, {
      key,
      createdAt: new Date(),
      response,
    });
  }

  public clear(): void {
    this.store.clear();
  }
}
