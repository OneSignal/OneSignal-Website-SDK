/**
 * START: window.safari definition
 * Types and names collected from:
 *   - https://developer.apple.com/documentation/safariextensions/safariremotenotification
 *   - https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/NotificationProgrammingGuideForWebsites/PushNotifications/PushNotifications.html
 */
interface SafariRemoteNotificationPermission {
  readonly deviceToken: string | null;
  readonly permission: "default" | "granted" | "denied";
}

interface SafariRemoteNotification {
  permission(websitePushID: string): SafariRemoteNotificationPermission;
  requestPermission(
    webAPIURL: string,
    websitePushID: string,
    queryParameterDictionary: unknown,
    callback: (permissionData: SafariRemoteNotificationPermission) => void
  ): void;
}

interface Window {
  safari?: {
    pushNotification?: SafariRemoteNotification
  };
}

/**
 * END: window.safari definition
 */


declare let OneSignal: any;
declare let OneSignalDeferred: any;


// These __*__ variables are defined from Webpack to change resulting JS
declare let __VERSION__: string;
declare let __BUILD_TYPE__: string;
declare let __NO_DEV_PORT__: string;
declare let __BUILD_ORIGIN__: string;
declare let __API_TYPE__: string;
declare let __API_ORIGIN__: string;
declare let __IS_HTTPS__: boolean;
declare let __DEV__: string;
declare let __TEST__: string;
declare let __STAGING__: string;
declare let __IS_ES6__: string;
declare let __SRC_STYLESHEETS_MD5_HASH__: string;

declare let __LOGGING__: boolean;
