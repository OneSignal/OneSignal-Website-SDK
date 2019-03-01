// NOTE: This is used with the OneSignalSDK.js shim
// Careful if adding imports, ES5 targets can't clean up functions never called.

import { OneSignalStub } from "./OneSignalStub";
import { ProcessOneSignalPushCalls } from "./ProcessOneSignalPushCalls";
import { PromiseFactory } from "./PromiseFactory";

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
    return PromiseFactory.newPromise<boolean>(resolve => { resolve(false); } );
  }

  // Implementation here so the passed in function is run and does not get dropped.
  // @Override
  public push(item: Function | object[]): void {
    ProcessOneSignalPushCalls.processItem(this, item);
  }

  // By default do nothing unless the function is listed above.
  // @Override
  protected stubFunction(_thisObj: OneSignalStubES5, _functionName: string, _args: any[]): any {}

  // Returns a Promise which is empty and is never resolved or rejected.
  // This is done as we don't want to return an unexpectedly undefined value to resolve,
  //   or require every call to OneSignal to have a catch.
  // @Override
  protected stubPromiseFunction(_thisObj: OneSignalStubES5, _functionName: string, _args: any[]): Promise<any> {
    return PromiseFactory.newPromise<any>((_resolve: any, _reject: any) => {});
  }
}
