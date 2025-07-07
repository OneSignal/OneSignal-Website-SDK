import { type IEventNotifier } from 'src/core/types/models';

export class EventProducer<THandler> implements IEventNotifier<THandler> {
  private subscribers: THandler[] = [];

  get hasSubscribers(): boolean {
    return this.subscribers.length > 0;
  }

  subscribe(handler: THandler): void {
    this.subscribers.push(handler);
  }

  unsubscribe(handler: THandler): void {
    const index = this.subscribers.indexOf(handler);
    if (index !== -1) {
      this.subscribers.splice(index, 1);
    }
  }

  subscribeAll(from: EventProducer<THandler>): void {
    for (const handler of from.subscribers) {
      this.subscribe(handler);
    }
  }

  fire(callback: (handler: THandler) => void): void {
    for (const handler of this.subscribers) {
      callback(handler);
    }
  }

  async suspendingFire(
    callback: (handler: THandler) => Promise<void>,
  ): Promise<void> {
    for (const handler of this.subscribers) {
      await callback(handler);
    }
  }
}
