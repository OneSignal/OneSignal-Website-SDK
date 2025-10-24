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

  _fire(callback: (handler: THandler) => void): void {
    for (const handler of this._subscribers) {
      callback(handler);
    }
  }
}
