import { MockEvent } from './MockEvent';

export class MockExtendableEvent extends MockEvent implements ExtendableEvent {
  private _lastWaitUntilPromise?: Promise<any>;

  get lastWaitUntilPromise(): Promise<any> | undefined {
    return this._lastWaitUntilPromise;
  }

  waitUntil(f: Promise<any>): void {
    this._lastWaitUntilPromise = f;
  }
}
