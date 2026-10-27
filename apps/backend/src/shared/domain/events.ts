export interface DomainEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private readonly handlers = new Map<string, EventHandler[]>();

  public static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  public subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(eventName, list);
  }

  public async publish(event: DomainEvent): Promise<void> {
    const list = this.handlers.get(event.eventName) ?? [];
    for (const handler of list) {
      await handler(event);
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
