import intlTelInput from 'intl-tel-input';
import { OneSignalDeferredLoadedCallback } from './page/models/OneSignalDeferredLoadedCallback';

/**
 * Types and names collected from:
 *   - https://developer.apple.com/documentation/safariextensions/safariremotenotification
 *   - https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/NotificationProgrammingGuideForWebsites/PushNotifications/PushNotifications.html
 */
interface SafariRemoteNotificationPermission {
  readonly deviceToken: string | null;
  readonly permission: 'default' | 'granted' | 'denied';
}

interface SafariRemoteNotification {
  permission(
    websitePushID: string | undefined,
  ): SafariRemoteNotificationPermission;
  requestPermission(
    webAPIURL: string,
    websitePushID: string | undefined,
    queryParameterDictionary: unknown,
    callback: (permissionData: SafariRemoteNotificationPermission) => void,
  ): void;
}

type _OneSignal = typeof import('./onesignal/OneSignal').default;

declare global {
  const OneSignal: _OneSignal;

  interface Window {
    OneSignal: _OneSignal;
    OneSignalDeferred?: OneSignalDeferredLoadedCallback[];
    __oneSignalSdkLoadCount?: number;
    safari?: {
      pushNotification?: SafariRemoteNotification;
    };
    intlTelInputUtils: (typeof intlTelInput)['utils'];
    intlTelInput: typeof intlTelInput;
  }

  interface WorkerGlobalScope {
    OneSignal: _OneSignal;
    OneSignalWorker: typeof import('./sw/serviceWorker/ServiceWorker').OneSignalServiceWorker;
    _workerMessenger: import('./sw/serviceWorker/WorkerMessengerSW').WorkerMessengerSW;
    shouldLog: boolean;
  }
}
