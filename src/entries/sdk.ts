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
import { OneSignalStubES6 } from "../utils/OneSignalStubES6";
import { OneSignalStubES5 } from "../utils/OneSignalStubES5";

// NOTE: scripts added won't start executing until all other existing scripts have been executed.
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
function isServiceWorkerRuntime(): boolean {
  return (typeof window === "undefined");
}

function serviceWorkerSupportsPush(): boolean {
  return (typeof self.registration !== "undefined");
}

function addOneSignalPageSDKStub() {
  const oneSignalExists = (typeof (window as any).OneSignal !== "undefined");
  const oneSignalIsArray = Array.isArray((window as any).OneSignal);

  // 1. Do NOT replace window.OneSignal if its something else other than an Array.
  if (oneSignalExists && !oneSignalIsArray) {
    return;
  }

  // 2. If this script was loaded with async or defer no need to create a stub.
  //    This means the site developer would have to be using OneSignal.push(...) already
  // This technically isn't needed but due to the complexly of OneSignalStubES6
  //    would like to only load it when needed in case of any issues
  const thisScript: any = document.currentScript;
  if (thisScript) {
    if (thisScript.async || thisScript.defer)
      return;
  }

  // 3. Which stub should we load based on push support
  isPushNotificationsSupported() ? addStubsForES6() : addStubsForES5();
}

// Stub out all functions but save calls into push(...), OneSignalPageSDKES6.js will load soon.
function addStubsForES6(): void {
  console.error("Please load OneSignalSDK.js async and use 'var OneSignal = OneSignal || [];'");
  (window as any).OneSignal = new OneSignalStubES6();
}

// Stub out all functions with default values. Unlike ES6 all ES5 support will be in OneSignalSDK.js
function addStubsForES5(): void {
  (window as any).OneSignal = new OneSignalStubES5();
}

function OneSignalShimMain(): void {
  if (isServiceWorkerRuntime()) {
    if (serviceWorkerSupportsPush()) {
      (self as any).importScripts(`${getPathAndPrefix()}OneSignalSDKWorker.js?v=${__VERSION__}`);
    }
  } else if (isPushNotificationsSupported()) {
    addScriptToPage(`${getPathAndPrefix()}OneSignalPageSDKES6.js?v=${__VERSION__}`);
    addOneSignalPageSDKStub();
  }
}

OneSignalShimMain();
