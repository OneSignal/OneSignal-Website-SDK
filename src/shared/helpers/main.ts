import { db } from '../database/client';
import { getDBAppConfig } from '../database/config';
import { getSubscription } from '../database/subscription';
import { getOneSignalApiUrl, useSafariLegacyPush } from '../environment/detect';
import { AppIDMissingError, MalformedArgumentError } from '../errors/common';
import Log from '../libraries/Log';
import type { NotificationIcons } from '../notifications/types';
import type {
  AppUserConfigPromptOptions,
  SlidedownOptions,
} from '../prompts/types';
import { getPlatformNotificationIcon, logMethodCall } from '../utils/utils';
import { getValueOrDefault } from './general';
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

  OneSignal.context.serviceWorkerManager
    .getRegistration()
    .then(async (registration?: ServiceWorkerRegistration | null) => {
      if (!registration) {
        Log.error('Service worker registration not available.');
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
  const previousPermission = (await db.get('Options', 'notificationPermission'))
    ?.value as string | undefined;

  const currentPermission =
    await OneSignal.context.permissionManager.getPermissionStatus();

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
    Log.error(`API call ${url}`, 'failed with:', data.errors);
    throw new Error('Failed to get notification icons.');
  }
  return data as NotificationIcons;
}

export function getSlidedownOptions(
  promptOptions: AppUserConfigPromptOptions,
): SlidedownOptions {
  return getValueOrDefault(promptOptions.slidedown, { prompts: [] });
}

export function getFullscreenPermissionMessageOptions(
  promptOptions: AppUserConfigPromptOptions | undefined,
): AppUserConfigPromptOptions | null {
  if (!promptOptions) {
    return null;
  }
  if (!promptOptions.fullscreen) {
    return promptOptions;
  }

  return {
    autoAcceptTitle: promptOptions.fullscreen.autoAcceptTitle,
    actionMessage: promptOptions.fullscreen.actionMessage,
    exampleNotificationTitleDesktop: promptOptions.fullscreen.title,
    exampleNotificationTitleMobile: promptOptions.fullscreen.title,
    exampleNotificationMessageDesktop: promptOptions.fullscreen.message,
    exampleNotificationMessageMobile: promptOptions.fullscreen.message,
    exampleNotificationCaption: promptOptions.fullscreen.caption,
    acceptButton: promptOptions.fullscreen.acceptButton,
    cancelButton: promptOptions.fullscreen.cancelButton,
  };
}

export function getPromptOptionsPostHash() {
  const promptOptions = getFullscreenPermissionMessageOptions(
    OneSignal.config?.userConfig.promptOptions,
  );
  const hash: Record<string, string> = {};
  if (promptOptions) {
    const legacyParams = {
      exampleNotificationTitleDesktop: 'exampleNotificationTitle',
      exampleNotificationMessageDesktop: 'exampleNotificationMessage',
      exampleNotificationTitleMobile: 'exampleNotificationTitle',
      exampleNotificationMessageMobile: 'exampleNotificationMessage',
    };
    for (const legacyParamKey of Object.keys(legacyParams)) {
      const legacyParamValue =
        legacyParams[legacyParamKey as keyof typeof legacyParams];
      if (promptOptions[legacyParamKey as keyof AppUserConfigPromptOptions]) {
        // @ts-expect-error - TODO: look into better typing for this
        promptOptions[legacyParamValue] = promptOptions[legacyParamKey];
      }
    }
    const allowedPromptOptions = [
      'autoAcceptTitle',
      'siteName',
      'autoAcceptTitle',
      'subscribeText',
      'showGraphic',
      'actionMessage',
      'exampleNotificationTitle',
      'exampleNotificationMessage',
      'exampleNotificationCaption',
      'acceptButton',
      'cancelButton',
      'timeout',
    ];
    for (let i = 0; i < allowedPromptOptions.length; i++) {
      const key = allowedPromptOptions[i];
      const value = promptOptions[key as keyof AppUserConfigPromptOptions];
      const encoded_value = encodeURIComponent(value as string);
      if (value || value === false || value === '') {
        hash[key as keyof typeof hash] = encoded_value;
      }
    }
  }
  return hash;
}

export function getAppId(): string {
  return OneSignal.config?.appId || '';
}

export async function getDeviceId(): Promise<string | undefined> {
  const subscription = await getSubscription();
  return subscription.deviceId || undefined;
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
    await OneSignal.context.serviceWorkerManager.getRegistration();
  if (!registration) {
    return undefined;
  }

  const subscription = await registration.pushManager.getSubscription();
  return subscription?.endpoint;
}
