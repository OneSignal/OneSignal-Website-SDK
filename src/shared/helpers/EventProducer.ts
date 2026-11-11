import type { IEventNotifier } from 'src/core/types/models';

export class EventProducer<THandler> implements IEventNotifier<THandler> {
  private _subscribers: THandler[] = [];

  get _hasSubscribers(): boolean {
    return this._subscribers.length > 0;
  }

  _subscribe(handler: THandler): void {
    this._subscribers.push(handler);
  }

  _unsubscribe(handler: THandler): void {
    const index = this._subscribers.indexOf(handler);
    if (index !== -1) {
      this._subscribers.splice(index, 1);
    }
  }

  // Iterates a copy so a handler that unsubscribes itself does not skip the next one.
  _fire(callback: (handler: THandler) => void): void {
    this._subscribers.slice().forEach(callback);
  }
}
