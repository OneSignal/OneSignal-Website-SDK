/**
 * START: window.safari definition
 * Types and names collected from:
 *   - https://developer.apple.com/documentation/safariextensions/safariremotenotification
 *   - https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/NotificationProgrammingGuideForWebsites/PushNotifications/PushNotifications.html
 */
interface SafariRemoteNotificationPermission {
  readonly deviceToken: string | null;
  readonly permission: 'default' | 'granted' | 'denied';
}

interface SafariRemoteNotification {
  permission(websitePushID: string): SafariRemoteNotificationPermission;
  requestPermission(
    webAPIURL: string,
    websitePushID: string,
    queryParameterDictionary: unknown,
    callback: (permissionData: SafariRemoteNotificationPermission) => void,
  ): void;
}

interface Window {
  safari?: {
    pushNotification?: SafariRemoteNotification;
  };
}

/**
 * END: window.safari definition
 */

declare let OneSignal: any;
declare let OneSignalDeferred: any;
