import { db, getOptionsValue } from '../database/client';
import { getDBAppConfig } from '../database/config';
import { getOneSignalApiUrl, useSafariLegacyPush } from '../environment/detect';
import { AppIDMissingError, MalformedArgumentError } from '../errors/common';
import { error } from '../libraries/log';
import type { NotificationIcons } from '../notifications/types';
import { getPlatformNotificationIcon, logMethodCall } from '../utils/utils';
import { triggerNotificationPermissionChanged } from './permissions';
import { isValidUrl } from './validators';

export async function showLocalNotification(
  title: string,
  message: string,
  url: string,
  icon?: string,
  data?: Record<string, any>,
  buttons?: Array<any>,
): Promise<void> {
  logMethodCall(
    'MainHelper:showLocalNotification: ',
    title,
    message,
    url,
    icon,
    data,
    buttons,
  );

  const appConfig = await getDBAppConfig();

  if (!appConfig.appId) throw AppIDMissingError;
  if (!OneSignal.Notifications.permission)
    throw new Error('User is not subscribed');
  if (!isValidUrl(url)) throw MalformedArgumentError('url');
  if (!isValidUrl(icon, { allowEmpty: true, requireHttps: true }))
    throw MalformedArgumentError('icon');
  if (!icon) {
    // get default icon
    const icons = await getNotificationIcons();
    icon = getPlatformNotificationIcon(icons);
  }

  const convertButtonsToNotificationActionType = (buttons: Array<any>) => {
    const convertedButtons = [];

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      convertedButtons.push({
        action: button.id,
        title: button.text,
        icon: button.icon,
        url: button.url,
      });
    }

    return convertedButtons;
  };
  const dataPayload = {
    data,
    launchURL: url,
    buttons: buttons
      ? convertButtonsToNotificationActionType(buttons)
      : undefined,
  };

  OneSignal._context._serviceWorkerManager
    ._getRegistration()
    .then(async (registration?: ServiceWorkerRegistration | null) => {
      if (!registration) {
        error('Service worker registration not available.');
        return;
      }

      const options = {
        body: message,
        data: dataPayload,
        icon: icon,
        actions: buttons ? convertButtonsToNotificationActionType(buttons) : [],
      };
      registration.showNotification(title, options);
    });
}

export async function checkAndTriggerNotificationPermissionChanged() {
  const previousPermission = await getOptionsValue<string>(
    'notificationPermission',
  );

  const currentPermission =
    await OneSignal._context._permissionManager._getPermissionStatus();

  if (previousPermission !== currentPermission) {
    await triggerNotificationPermissionChanged();
    await db.put('Options', {
      key: 'notificationPermission',
      value: currentPermission,
    });
  }
}

export async function getNotificationIcons() {
  const appId = getAppId();
  if (!appId) {
    throw AppIDMissingError;
  }
  const url = `${getOneSignalApiUrl().toString()}apps/${appId}/icon`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.errors) {
    error(`API call ${url}`, 'failed with:', data.errors);
    throw new Error('Failed to get notification icons.');
  }
  return data as NotificationIcons;
}

export function getAppId(): string {
  return OneSignal.config?.appId || '';
}

// TO DO: unit test
export async function getCurrentPushToken(): Promise<string | undefined> {
  if (useSafariLegacyPush()) {
    const safariToken = window.safari?.pushNotification?.permission(
      OneSignal.config?.safariWebId,
    ).deviceToken;
    return safariToken?.toLowerCase() || undefined;
  }

  const registration =
    await OneSignal._context._serviceWorkerManager._getRegistration();
  if (!registration) {
    return undefined;
  }

  const subscription = await registration.pushManager.getSubscription();
  return subscription?.endpoint;
}
