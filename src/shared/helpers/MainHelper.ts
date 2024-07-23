import {
  InvalidStateError,
  InvalidStateReason,
} from '../errors/InvalidStateError';
import SdkEnvironment from '../managers/SdkEnvironment';
import {
  AppUserConfigPromptOptions,
  SlidedownOptions,
} from '../models/Prompts';
import Log from '../libraries/Log';
import Utils from '../context/Utils';
import Database from '../services/Database';
import { PermissionUtils } from '../utils/PermissionUtils';
import Environment from './Environment';
import { getPlatformNotificationIcon, logMethodCall } from '../utils/utils';
import { NotSubscribedError, NotSubscribedReason } from '../errors/NotSubscribedError';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';
import { ValidatorUtils } from '../../page/utils/ValidatorUtils';

export default class MainHelper {
  static async showLocalNotification(
    title: string,
    message: string,
    url: string,
    icon?: string,
    data?: Record<string, any>,
    buttons?: Array<any>
  ): Promise<void> {
    logMethodCall('MainHelper:showLocalNotification: ', title, message, url, icon, data, buttons);

    const appConfig = await Database.getAppConfig();

    if (!appConfig.appId)
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    if (!(OneSignal.Notifications.permission))
      throw new NotSubscribedError(NotSubscribedReason.NoDeviceId);
    if (!ValidatorUtils.isValidUrl(url))
      throw new InvalidArgumentError('url', InvalidArgumentReason.Malformed);
    if (!ValidatorUtils.isValidUrl(icon, { allowEmpty: true, requireHttps: true }))
      throw new InvalidArgumentError('icon', InvalidArgumentReason.Malformed);
    if (!icon) {
      // get default icon
      const icons = await MainHelper.getNotificationIcons();
      icon = getPlatformNotificationIcon(icons);
    }

    const convertButtonsToNotificationActionType = (buttons: Array<any>) => {
      const convertedButtons = [];

      for (let i=0; i<buttons.length; i++) {
        const button = buttons[i];
        convertedButtons.push({
          action: button.id,
          title: button.text,
          icon: button.icon,
          url: button.url
        });
      }

      return convertedButtons;
    }
    const dataPayload = {
      data,
      url,
      buttons: buttons ? convertButtonsToNotificationActionType(buttons) : undefined
    }

    OneSignal.context.serviceWorkerManager.getRegistration().then(
      async (registration?: ServiceWorkerRegistration | null) => {
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
      }
    );
  }

  static async checkAndTriggerNotificationPermissionChanged() {
    const previousPermission = await Database.get(
      'Options',
      'notificationPermission',
    );
    const currentPermission =
      await OneSignal.context.permissionManager.getPermissionStatus();
    if (previousPermission !== currentPermission) {
      await PermissionUtils.triggerNotificationPermissionChanged();
      await Database.put('Options', {
        key: 'notificationPermission',
        value: currentPermission,
      });
    }
  }

  static async getNotificationIcons() {
    const appId = await MainHelper.getAppId();
    if (!appId) {
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    }
    const url = `${SdkEnvironment.getOneSignalApiUrl().toString()}/apps/${appId}/icon`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errors) {
      Log.error(`API call ${url}`, 'failed with:', data.errors);
      throw new Error('Failed to get notification icons.');
    }
    return data;
  }

  public static getSlidedownOptions(
    promptOptions: AppUserConfigPromptOptions,
  ): SlidedownOptions {
    return Utils.getValueOrDefault(promptOptions.slidedown, { prompts: [] });
  }

  static getFullscreenPermissionMessageOptions(
    promptOptions: AppUserConfigPromptOptions,
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

  static getPromptOptionsQueryString() {
    const promptOptions = MainHelper.getFullscreenPermissionMessageOptions(
      OneSignal.config.userConfig.promptOptions,
    );
    let promptOptionsStr = '';
    if (promptOptions) {
      const hash = MainHelper.getPromptOptionsPostHash();
      for (const key of Object.keys(hash)) {
        const value = hash[key];
        promptOptionsStr += '&' + key + '=' + value;
      }
    }
    return promptOptionsStr;
  }

  static getPromptOptionsPostHash() {
    const promptOptions = MainHelper.getFullscreenPermissionMessageOptions(
      OneSignal.config.userConfig.promptOptions,
    );
    const hash = {};
    if (promptOptions) {
      const legacyParams = {
        exampleNotificationTitleDesktop: 'exampleNotificationTitle',
        exampleNotificationMessageDesktop: 'exampleNotificationMessage',
        exampleNotificationTitleMobile: 'exampleNotificationTitle',
        exampleNotificationMessageMobile: 'exampleNotificationMessage',
      };
      for (const legacyParamKey of Object.keys(legacyParams)) {
        const legacyParamValue = legacyParams[legacyParamKey];
        if (promptOptions[legacyParamKey]) {
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
        const value = promptOptions[key];
        const encoded_value = encodeURIComponent(value);
        if (value || value === false || value === '') {
          hash[key] = encoded_value;
        }
      }
    }
    return hash;
  }

  static async getAppId(): Promise<string> {
    if (OneSignal.config.appId) {
      return Promise.resolve(OneSignal.config.appId);
    } else {
      const appId = await Database.get<string>('Ids', 'appId');
      return appId;
    }
  }

  static async getDeviceId(): Promise<string | undefined> {
    const subscription = await OneSignal.database.getSubscription();
    return subscription.deviceId || undefined;
  }

  // TO DO: unit test
  static async getCurrentPushToken(): Promise<string | undefined> {
    if (Environment.useSafariLegacyPush()) {
      const safariToken = window.safari?.pushNotification?.permission(
        OneSignal.config.safariWebId,
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
}
