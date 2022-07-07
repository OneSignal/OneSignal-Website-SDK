// NOTE: This is used with the OneSignalSDK.js shim
// Careful if adding imports, ES5 targets can't clean up functions never called.

import { OneSignalStub, PossiblePredefinedOneSignal } from "./OneSignalStub";

export class OneSignalStubES6 extends OneSignalStub<OneSignalStubES6> {

  // @Override
  public isPushNotificationsSupported(): boolean {
    return true;
  }

  public constructor(preExistingArray?: PossiblePredefinedOneSignal) {
    super(Object.getOwnPropertyNames(OneSignalStubES6.prototype));
    this.preExistingArray = preExistingArray;
  }

  // These 2 arrays contain calls that need to be made on the OneSignal class
  //   after OneSignalPageSDKES6.js is load.
  // ReplayCallsOnOneSignal.doReplay() will do the processing on these.

  // This array will contain any pre-existing array BEFORE OneSignalSDK.js was loaded
  public preExistingArray: PossiblePredefinedOneSignal;
  // This array will contain calls made on windows.OneSignal (w/ push or direct method calls)
  //   AFTER OneSignalSDK.js was loaded, BUT before OneSignalPageSDKES6.js was loaded.
  public directFunctionCallsArray = new Array<DelayedFunctionCall<any>>();

  // @Override
  // Save function name and params to be called later when the full SDK loads
  protected stubFunction(thisObj: OneSignalStubES6, functionName: string, args: any[]): void {
    thisObj.directFunctionCallsArray.push({ functionName, args, delayedPromise: undefined });
  }

  // @Override
  // Save function name, params, and a delayed Promise to be called later when the full SDK loads
  protected stubPromiseFunction(thisObj: OneSignalStubES6, functionName: string, args: any[]): Promise<any> {
    let delayedPromise: DelayedPromise<any> | undefined = undefined;
    const promise = new Promise((resolve, reject) => {
      delayedPromise = { resolve, reject };
    });
    thisObj.directFunctionCallsArray.push({ functionName, delayedPromise, args });
    return promise;
  }
}
