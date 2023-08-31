// This is used by the OneSignalSDK.page.js shim
// DO NOT add other imports since it is an ES5 target and dead code imports can't be clean up.

// Checks if the browser supports push notifications by checking if specific
//   classes and properties on them exist
export function isPushNotificationsSupported() {
  return supportsVapidPush() || supportsSafariPush();
}

export function isMacOSSafariInIframe(): boolean {
  // Fallback detection for Safari on macOS in an iframe context
  return (
    window.top !== window && // isContextIframe
    navigator.vendor === 'Apple Computer, Inc.' && // isSafari
    navigator.platform === 'MacIntel'
  ); // isMacOS
}

export function supportsSafariPush(): boolean {
  return (
    (window.safari && typeof window.safari.pushNotification !== 'undefined') ||
    isMacOSSafariInIframe()
  );
}

// Does the browser support the standard Push API
export function supportsVapidPush(): boolean {
  return (
    typeof PushSubscriptionOptions !== 'undefined' &&
    // eslint-disable-next-line no-prototype-builtins
    PushSubscriptionOptions.prototype.hasOwnProperty('applicationServerKey')
  );
}

/* Notes on browser results which lead the logic of the functions above */
// Safari
//   macOS - typeof safari.pushNotification == "object"
//         - iframe context - typeof safari == "undefined"
//   iOS -  typeof safari == "undefined"
// Chrome
//   HTTP & HTTPS - typeof PushSubscriptionOptions == "function"
//   HTTP - navigator.serviceWorker == "undefined"
// Firefox
//   Normal - typeof PushSubscriptionOptions == "function"
//     HTTP & HTTPS - typeof PushSubscriptionOptions == "function"
//   ESR - typeof PushSubscriptionOptions == "undefined"
