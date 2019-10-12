import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import Event from '../Event';
import SdkEnvironment from '../managers/SdkEnvironment';
import Database from '../services/Database';
import { AppUserConfigPromptOptions, SlidedownPermissionMessageOptions } from '../models/AppConfig';
import TimedLocalStorage from '../modules/TimedLocalStorage';
import Log from '../libraries/Log';
import { SubscriptionStateKind } from '../models/SubscriptionStateKind';
import { NotificationPermission } from "../models/NotificationPermission";
import { PushDeviceRecord } from "../models/PushDeviceRecord";
import { OneSignalUtils } from "../utils/OneSignalUtils";
import { PermissionUtils } from "../utils/PermissionUtils";
import { Utils } from "../utils/Utils";

export default class MainHelper {

  public static async getCurrentNotificationType(): Promise<SubscriptionStateKind> {
    const currentPermission: NotificationPermission =
      await OneSignal.context.permissionManager.getNotificationPermission(OneSignal.context.appConfig.safariWebId);
    
    if (currentPermission === NotificationPermission.Default) {
      return SubscriptionStateKind.Default;
    }

    if (currentPermission === NotificationPermission.Denied) {
      // Due to this issue https://github.com/OneSignal/OneSignal-Website-SDK/issues/289 we cannot reliably detect
      // "default" permission in HTTP context. Browser reports denied for both "default" and "denied" statuses.
      // Returning SubscriptionStateKind.Default for this case.
      return (OneSignalUtils.isUsingSubscriptionWorkaround()) ?
        SubscriptionStateKind.Default :
        SubscriptionStateKind.NotSubscribed;
    }

    const existingUser = await OneSignal.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (currentPermission === NotificationPermission.Granted && existingUser) {
      const isPushEnabled = await OneSignal.privateIsPushNotificationsEnabled();
      return  isPushEnabled ? SubscriptionStateKind.Subscribed : SubscriptionStateKind.MutedByApi;
    }

    return SubscriptionStateKind.Default;
  }

  /**
   * If the user has manually opted out of notifications (OneSignal.setSubscription), returns -2; otherwise returns 1.
   * @param isOptedIn The result of OneSignal.getSubscription().
   */
  static getNotificationTypeFromOptIn(isOptedIn: boolean | null) {
    if (isOptedIn == true || isOptedIn == null) {
      return SubscriptionStateKind.Subscribed;
    } else {
      return SubscriptionStateKind.MutedByApi;
    }
  }

  /**
   * Returns true if a LocalStorage entry exists for noting the user dismissed the native prompt.
   */
  static wasHttpsNativePromptDismissed() {
    return TimedLocalStorage.getItem('onesignal-notification-prompt') === 'dismissed';
  }

  /**
   * Stores a flag in sessionStorage that we've already shown the HTTP popover to this user and that we should not
   * show it again until they open a new window or tab to the site.
   */
  static markHttpPopoverShown() {
    sessionStorage.setItem('ONESIGNAL_HTTP_PROMPT_SHOWN', 'true');
  }

  /**
   * Returns true if the HTTP popover was already shown inside the same session.
   */
  static isHttpPromptAlreadyShown() {
    return sessionStorage.getItem('ONESIGNAL_HTTP_PROMPT_SHOWN') == 'true';
  }

  static async checkAndTriggerNotificationPermissionChanged() {
    const previousPermission = await Database.get('Options', 'notificationPermission');
    const currentPermission = await OneSignal.getNotificationPermission();
    if (previousPermission !== currentPermission) {
      await PermissionUtils.triggerNotificationPermissionChanged();
      await Database.put('Options', {
        key: 'notificationPermission',
        value: currentPermission
      });
    }
  }

  static async getNotificationIcons() {
    const appId = await MainHelper.getAppId();
    if (!appId) {
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    }
    var url = `${SdkEnvironment.getOneSignalApiUrl().toString()}/apps/${appId}/icon`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errors) {
      Log.error(`API call %c${url}`, Utils.getConsoleStyle('code'), 'failed with:', data.errors);
      throw new Error('Failed to get notification icons.');
    }
    return data;
  }

  public static getSlidedownPermissionMessageOptions(promptOptions: AppUserConfigPromptOptions):
    SlidedownPermissionMessageOptions {
    const defaultActionMessage = "We'd like to show you notifications for the latest news and updates.";
    const defaultAcceptButtonText = "Allow";
    const defaultCancelButtonText = "No Thanks";

    if (!promptOptions) {
      return {
        enabled: false,
        autoPrompt: false,
        actionMessage: defaultActionMessage,
        acceptButtonText: defaultAcceptButtonText,
        cancelButtonText: defaultCancelButtonText,
      } as SlidedownPermissionMessageOptions;
    }

    if (!promptOptions.slidedown) {
      return {
        enabled: false,
        autoPrompt: false,
        actionMessage: promptOptions.actionMessage || defaultActionMessage,
        acceptButtonText: promptOptions.acceptButtonText || defaultAcceptButtonText,
        cancelButtonText: promptOptions.cancelButtonText || defaultCancelButtonText,
      } as SlidedownPermissionMessageOptions;
    }

    return {
      enabled: promptOptions.slidedown.enabled,
      autoPrompt: promptOptions.slidedown.autoPrompt,
      actionMessage: promptOptions.slidedown.actionMessage || defaultActionMessage,
      acceptButtonText: promptOptions.slidedown.acceptButtonText || defaultAcceptButtonText,
      cancelButtonText: promptOptions.slidedown.cancelButtonText || defaultCancelButtonText,
    } as SlidedownPermissionMessageOptions;
  }

  static getFullscreenPermissionMessageOptions(promptOptions: AppUserConfigPromptOptions):
    AppUserConfigPromptOptions | null {
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
      acceptButtonText: promptOptions.fullscreen.acceptButton,
      cancelButtonText: promptOptions.fullscreen.cancelButton,
    };
  }

  static getPromptOptionsQueryString() {
    let promptOptions = MainHelper.getFullscreenPermissionMessageOptions(OneSignal.config.userConfig.promptOptions);
    let promptOptionsStr = '';
    if (promptOptions) {
      let hash = MainHelper.getPromptOptionsPostHash();
      for (let key of Object.keys(hash)) {
        var value = hash[key];
        promptOptionsStr += '&' + key + '=' + value;
      }
    }
    return promptOptionsStr;
  }

  static getPromptOptionsPostHash() {
    let promptOptions = MainHelper.getFullscreenPermissionMessageOptions(OneSignal.config.userConfig.promptOptions);
    if (promptOptions) {
      var legacyParams = {
        exampleNotificationTitleDesktop: 'exampleNotificationTitle',
        exampleNotificationMessageDesktop: 'exampleNotificationMessage',
        exampleNotificationTitleMobile: 'exampleNotificationTitle',
        exampleNotificationMessageMobile: 'exampleNotificationMessage'
      };
      for (let legacyParamKey of Object.keys(legacyParams)) {
        let legacyParamValue = legacyParams[legacyParamKey];
        if (promptOptions[legacyParamKey]) {
          promptOptions[legacyParamValue] = promptOptions[legacyParamKey];
        }
      }
      var allowedPromptOptions = [
        'autoAcceptTitle',
        'siteName',
        'autoAcceptTitle',
        'subscribeText',
        'showGraphic',
        'actionMessage',
        'exampleNotificationTitle',
        'exampleNotificationMessage',
        'exampleNotificationCaption',
        'acceptButtonText',
        'cancelButtonText',
        'timeout'
      ];
      var hash = {};
      for (var i = 0; i < allowedPromptOptions.length; i++) {
        var key = allowedPromptOptions[i];
        var value = promptOptions[key];
        var encoded_value = encodeURIComponent(value);
        if (value || value === false || value === '') {
          hash[key] = encoded_value;
        }
      }
    }
    return hash;
  }

  static triggerCustomPromptClicked(clickResult) {
    Event.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
      result: clickResult
    });
  }

  static async getAppId(): Promise<string> {
    if (OneSignal.config.appId) {
      return Promise.resolve(OneSignal.config.appId);
    } else {
      const appId = await Database.get<string>('Ids', 'appId');
      return appId;
    }
  }

  public static async createDeviceRecord(appId: string): Promise<PushDeviceRecord> {
    const deviceRecord = new PushDeviceRecord();
    deviceRecord.appId = appId;
    deviceRecord.subscriptionState = await MainHelper.getCurrentNotificationType();
    return deviceRecord;
  }

  public static async getDeviceId(): Promise<string | undefined> {
    const subscription = await OneSignal.database.getSubscription();
    return subscription.deviceId || undefined;
  }
}
