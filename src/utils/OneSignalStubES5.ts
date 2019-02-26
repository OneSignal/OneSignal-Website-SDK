// NOTE: This is used with the OneSignalSDK.js shim
// Careful if adding imports, ES5 targets can't clean up functions never called.

import { OneSignalStub } from "./OneSignalStub";

export class OneSignalStubES5 extends OneSignalStub<OneSignalStubES5> {

  public constructor() {
    super(Object.getOwnPropertyNames(OneSignalStubES5.prototype));
  }

  // @Override
  public isPushNotificationsSupported(): boolean {
    return false;
  }

  // @Override
  public isPushNotificationsEnabled(): boolean {
    return false;
  }

  // By default do nothing unless the function is listed above.
  // @Override
  protected stubFunction(_thisObj: OneSignalStubES5, _functionName: string, _args: any[]): any {}

  // By default do nothing unless the function is listed above.
  // @Override
  protected stubPromiseFunction(_thisObj: OneSignalStubES5, _functionName: string, _args: any[]): Promise<any> {
    return new Promise((_resolve, _reject) => {});
  }
}
