// Light weight JS to detect browsers push notification capabilities
//
// This is used by the OneSignalSDK.page.js shim
// DO NOT add other imports since it is an ES5 target and dead code imports can't be clean up.

// Checks if the browser supports push notifications by checking if specific
//   classes and properties on them exist
export function isPushNotificationsSupported() {
  return supportsVapidPush() || supportsSafariLegacyPush();
}

// Does the browser support legacy Safari push? (only available on macOS)
export function supportsSafariLegacyPush(): boolean {
  return (
    typeof window.safari !== 'undefined' &&
    typeof window.safari.pushNotification !== 'undefined'
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

// Is Safari on iOS or iPadOS
export function isIosSafari(): boolean {
  // Safari's "Request Desktop Website" (default for iPad) masks the
  // userAgent as macOS. So we are using maxTouchPoints to assume it is
  // iOS, since there are no touch screen Macs.
  return isSafariBrowser() && navigator.maxTouchPoints > 0;
}

// Is any Safari browser, includes macOS and iOS.
function isSafariBrowser(): boolean {
  return navigator.vendor === 'Apple Computer, Inc.';
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
