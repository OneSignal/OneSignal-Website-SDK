/**
 * This is OneSignalPageSDKES6.js (ES6)
 * Loaded from OneSignalSDK.js only if the browser supports push.
 */

import Log from "../libraries/Log";
import { incrementSdkLoadCount, getSdkLoadCount } from "../utils";
import {ReplayCallsOnOneSignal} from "../utils/ReplayCallsOnOneSignal";
import {OneSignalStubES6} from "../utils/OneSignalStubES6";

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
  const predefinedOneSignal: OneSignalStubES6 | object[] | undefined | null = (window as any).OneSignal;

  (window as any).OneSignal = require('../OneSignal').default;

  ReplayCallsOnOneSignal.doReplay(predefinedOneSignal);
}

// Only if running on page in browser
if (typeof window !== "undefined")
  oneSignalSdkInit();
