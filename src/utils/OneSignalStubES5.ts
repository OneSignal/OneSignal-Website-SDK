// NOTE: This is used with the OneSignalSDK.js shim
// Careful if adding imports, ES5 targets can't clean up functions never called.

import {OneSignalStub, PossiblePredefinedOneSignal} from './OneSignalStub';
import {ProcessOneSignalPushCalls} from './ProcessOneSignalPushCalls';
import Log from '../libraries/Log';

// Definition pulled from lib.es2015.promise.d.ts
type PromiseExecutor<T> = (
  resolve: (value?: T | PromiseLike<T>) => void,
  reject: (reason?: any) => void,
) => void;

export class OneSignalStubES5 extends OneSignalStub<OneSignalStubES5> {
  public constructor(stubOneSignal?: PossiblePredefinedOneSignal) {
    super(Object.getOwnPropertyNames(OneSignalStubES5.prototype));
    (<any>window).OneSignal = this;
    this.playPushes(stubOneSignal);
  }

  // @Override
  public isPushNotificationsSupported(): boolean {
    return false;
  }

  // @Override
  public isPushNotificationsEnabled(): Promise<boolean> {
    return OneSignalStubES5.newPromiseIfDefined<any>((resolve: any) => {
      resolve(false);
    });
  }

  // Implementation here so the passed in function is run and does not get dropped.
  // @Override
  public push(item: Function | object[]): void {
    ProcessOneSignalPushCalls.processItem(this, item);
  }

  // By default do nothing unless the function is listed above.
  // @Override
  protected stubFunction(
    _thisObj: OneSignalStubES5,
    _functionName: string,
    _args: any[],
  ): any {}

  // Never resolve promises as no logic will be run from this ES5 stub for them.
  // @Override
  protected stubPromiseFunction(
    _thisObj: OneSignalStubES5,
    _functionName: string,
    _args: any[],
  ): Promise<any> {
    return OneSignalStubES5.newPromiseIfDefined<any>(
      (_resolve: any, _reject: any) => {},
    );
  }

  // Safely does NOT create a Promise if running on old ES5 browsers and it wasn't polyfilled.
  private static newPromiseIfDefined<T>(
    executor: PromiseExecutor<T>,
  ): Promise<T> {
    if (typeof Promise === 'undefined') return <any>undefined;
    else return new Promise<T>(executor);
  }

  private playPushes(toProcessArray?: PossiblePredefinedOneSignal) {
    if (!toProcessArray) return;

    for (const item of toProcessArray) {
      try {
        this.push(item);
      } catch (e) {
        Log.error(e);
      }
    }
  }
}
