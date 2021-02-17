/**
 * This is OneSignalPageSDKES6.js (ES6)
 * Loaded from OneSignalSDK.js only if the browser supports push.
 */

import Log from "../libraries/Log";
import { incrementSdkLoadCount, getSdkLoadCount, getConsoleStyle } from "../utils";
import { ReplayCallsOnOneSignal } from "../utils/ReplayCallsOnOneSignal";
import { OneSignalStubES6 } from "../utils/OneSignalStubES6";
import LegacyManager from "src/managers/LegacyManager";
import SdkEnvironment from "src/managers/SdkEnvironment";
import bowser from "bowser";

function oneSignalSdkInit() {
  incrementSdkLoadCount();
  if (getSdkLoadCount() > 1) {
    Log.warn(`OneSignal: The web push SDK is included more than once. For optimal performance, please include our ` +
      `SDK only once on your page.`);
    Log.debug(`OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
      `Occurred ${getSdkLoadCount()} times.`);
    return;
  }

  // We're running in the host page, iFrame of the host page, or popup window
  // Load OneSignal's web SDK
  const predefinedOneSignal: OneSignalStubES6 | object[] | undefined | null = (<any>window).OneSignal;

  setupAndLogOneSignalDefine();

  ReplayCallsOnOneSignal.doReplay(predefinedOneSignal);
}

function setupAndLogOneSignalDefine() {
  const OneSignalClass = require('../OneSignal').OneSignalClass;
  (<any>window).OneSignal = new OneSignalClass();

  // TODO: put these setup lines and logs into a function
  LegacyManager.ensureBackwardsCompatibility(OneSignal);

  Log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION},
    ${SdkEnvironment.getWindowEnv().toString()} environment).`, getConsoleStyle('bold'));
  Log.debug(`Current Page URL: ${typeof location === "undefined" ? "NodeJS" : location.href}`);
  Log.debug(`Browser Environment: ${bowser.name} ${bowser.version}`);
}

// Only if running on page in browser
if (typeof window !== "undefined")
  oneSignalSdkInit();
