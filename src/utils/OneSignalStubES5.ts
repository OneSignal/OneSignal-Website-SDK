// NOTE: This is used with the OneSignalSDK.js shim
// Careful if adding imports, ES5 targets can't clean up functions never called.

import { OneSignalStub } from "./OneSignalStub";
import { ProcessOneSignalPushCalls } from "./ProcessOneSignalPushCalls";

// Definition pulled from lib.es2015.promise.d.ts
type PromiseExecutor<T> = (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void;

export class OneSignalStubES5 extends OneSignalStub<OneSignalStubES5> {

  public constructor() {
    super(Object.getOwnPropertyNames(OneSignalStubES5.prototype));
  }

  // @Override
  public isPushNotificationsSupported(): boolean {
    return false;
  }

  // @Override
  public isPushNotificationsEnabled(): Promise<boolean> {
    return OneSignalStubES5.newPromiseOnlyIfDefined<any>((resolve: any) => { resolve(false); } );
  }

  // Implementation here so the passed in function is run and does not get dropped.
  // @Override
  public push(item: Function | object[]): void {
    ProcessOneSignalPushCalls.processItem(this, item);
  }

  // By default do nothing unless the function is listed above.
  // @Override
  protected stubFunction(_thisObj: OneSignalStubES5, _functionName: string, _args: any[]): any {}

  // Always reject promises as no logic will be run from this ES5 stub.
  // @Override
  protected stubPromiseFunction(_thisObj: OneSignalStubES5, _functionName: string, _args: any[]): Promise<any> {
    return OneSignalStubES5.newPromiseOnlyIfDefined<any>((_resolve: any, _reject: any) => {});
  }

  // Safely does NOT create a Promise if running on old ES5 browsers and it wasn't polyfilled.
  private static newPromiseOnlyIfDefined<T>(executor: PromiseExecutor<T>): Promise<T> {
    if (typeof(Promise) === "undefined")
      return <any>undefined;
    else
      return new Promise<T>(executor);
  }
}
