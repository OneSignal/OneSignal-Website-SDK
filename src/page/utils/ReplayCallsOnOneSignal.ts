import Log from "../../shared/libraries/Log";
import { OneSignalStubES6 } from "./OneSignalStubES6";


export class ReplayCallsOnOneSignal {
  public static doReplay(stubOneSignal: OneSignalStubES6 | object[] | undefined | null) {
    if (!stubOneSignal)
      return;

    if (Array.isArray(stubOneSignal)) {
      ReplayCallsOnOneSignal.processAsArray(stubOneSignal);
    }
    else if (stubOneSignal.constructor && stubOneSignal.constructor.name === "OneSignalStubES6") {
      ReplayCallsOnOneSignal.processAsES6Stub(stubOneSignal);
    }
    else {
      Log.error("window.OneSignal is an unexpected type! Should be an Array, OneSignalStubES6, or undefined.");
    }
  }

  private static processAsArray(stubOneSignal: Function[] | object[]) {
    for (const item of stubOneSignal) {
      try {
        OneSignal.push(item);
      } catch (e) {
        // Catch and log error here so other elements still run
        Log.error(e);
      }
    }
  }

  private static processAsES6Stub(stubOneSignal: OneSignalStubES6) {
    // 1. Process any array defined BEFORE stubOneSignal was loaded
    if (stubOneSignal.preExistingArray) {
      ReplayCallsOnOneSignal.processAsArray(stubOneSignal.preExistingArray);
    }

    // 2. Process any array defined AFTER stubOneSignal was loaded
    //    Runs methods in order, including firing any promises
    for(const item of stubOneSignal.directFunctionCallsArray) {
      const functionToCall = OneSignal[item.functionName];

      const retValue = functionToCall.apply(OneSignal, item.args);
      if (item.delayedPromise && retValue instanceof Promise) {
        retValue.then(function(...args: any[]) {
          if (item.delayedPromise && item.delayedPromise.resolve) {
            item.delayedPromise.resolve.apply(null, args);
          }
        }).catch(function(...args: any[]) {
          if (item.delayedPromise && item.delayedPromise.reject) {
            item.delayedPromise.reject.apply(null, args);
          }
        });
      }
    }
  }
}
