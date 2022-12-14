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


declare var OneSignal: any;
declare var OneSignalDeferred: any;


// These __*__ variables are defined from Webpack to change resulting JS
declare var __VERSION__: string;
declare var __BUILD_TYPE__: string;
declare var __NO_DEV_PORT__: string;
declare var __BUILD_ORIGIN__: string;
declare var __API_TYPE__: string;
declare var __API_ORIGIN__: string;
declare var __IS_HTTPS__: boolean;
declare var __DEV__: string;
declare var __TEST__: string;
declare var __STAGING__: string;
declare var __IS_ES6__: string;
declare var __SRC_STYLESHEETS_MD5_HASH__: string;

declare var __LOGGING__: boolean;
