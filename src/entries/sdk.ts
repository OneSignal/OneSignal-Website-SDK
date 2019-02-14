/**
 * This is OneSignalSDK.js (ES5)
 *   * This is an entry point for pages and older service workers.
 * This is a shim to detect and load either;
 *   * ServiceWorkerSDK (ES6)                 - OneSignalSDKWorker.js
 *   * PageSDK (ES6)                          - OneSignalPageSDKES6.js
 *   * StubSDK for unsupported browsers (ES5) - OneSignalPageSDKES5.js
 */

// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.
import { isPushNotificationsSupported } from "../utils/BrowserSupportsPush";

function addScriptToPage(url: string): void {
  const scriptElement = document.createElement('script');
  scriptElement.src = url;
  scriptElement.async = true;
  document.head.appendChild(scriptElement);
}

// Some logic from SdkEnvironment
function getPathAndPrefix(): string {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return "https://localhost:3001/sdks/Dev-";
  } else if (typeof __STAGING__ !== "undefined" && __STAGING__) {
    return `https://${window.location.host}/sdks/Staging-`;
  }
  return "https://cdn.onesignal.com/sdks/";
}

// Will only be true for browsers that accepted OneSignal permissions before we moved to importing
//   the new OneSignalSDKWorker.js file.
function isServiceWorkerRuntime() {
  return (typeof window === "undefined") && (typeof self.registration !== "undefined");
}

if (isServiceWorkerRuntime()) {
  (self as any).importScripts(`${getPathAndPrefix()}OneSignalSDKWorker.js?v=${__VERSION__}`);
}
else {
  let sdkFile : string;
  if (isPushNotificationsSupported()) {
    sdkFile = "OneSignalPageSDKES6.js";
  }
  else {
    // This is a stub of the SDK
    sdkFile = "OneSignalPageSDKES5.js";
  }
  addScriptToPage(`${getPathAndPrefix()}${sdkFile}?v=${__VERSION__}`);
}
