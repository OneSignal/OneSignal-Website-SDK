/**
 * This is OneSignalSDK.page.es6.js(ES6)
 * Loaded from OneSignalSDK.page.js only if the browser supports push.
 */
import OneSignal from '../onesignal/OneSignal';
import OneSignalDeferred from '../onesignal/OneSignalDeferred';
import { ReplayCallsOnOneSignal } from '../page/utils/ReplayCallsOnOneSignal';
import Log from '../shared/libraries/Log';
import { getSdkLoadCount, incrementSdkLoadCount } from '../shared/utils/utils';

/**
 * Since we use Vite lib mode, this is import is removed from the bundle but it will still
 * generate a separate CSS file.
 */
import './stylesheet.scss';

function onesignalSdkInit() {
  incrementSdkLoadCount();
  if (getSdkLoadCount() > 1) {
    Log.warn(
      `OneSignal: The web push SDK is included more than once. For optimal performance, please include our ` +
        `SDK only once on your page.`,
    );
    Log.debug(
      `OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
        `Occurred ${getSdkLoadCount()} times.`,
    );
    return;
  }

  // Load OneSignal's web SDK
  // TODO: We might be able to remove this down the line but reasons to keep for now:
  //         * Number of internal SDK code expects window.OneSignal
  //         * Keep JS console usage easier for debugging / testing.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (<any>window).OneSignal = OneSignal;

  // TODO: Could we do an import as a different name then assign it instead?
  // We need to use "require" here has as import would clobber OneSignalDeferred and we
  const existingOneSignalDeferred = (<any>window).OneSignalDeferred;
  (<any>window).OneSignalDeferred = OneSignalDeferred;
  ReplayCallsOnOneSignal.processOneSignalDeferredArray(
    existingOneSignalDeferred,
  );
}

onesignalSdkInit();
