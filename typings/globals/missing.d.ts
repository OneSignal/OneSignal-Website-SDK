/**
 * START: window.safari definition
 * https://developer.apple.com/documentation/safariextensions
 */
interface SafariRemoteNotificationPermission {
  readonly deviceToken: string | null | undefined;
  readonly permission: string;
}

interface SafariRemoteNotification {
  permission(bundleIdentifier: string): SafariRemoteNotificationPermission;
  requestPermission(
    webAPIURL: string,
    websiteIdentifier: string,
    queryParameterDictionary: any,
    callback: Function
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


// These __*__ variables are defined from Webpack to change resulting JS
declare var __VERSION__: string;
declare var __BUILD_TYPE__: string;
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
