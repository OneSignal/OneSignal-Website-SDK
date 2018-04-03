import bowser from 'bowser';



import Environment from '../Environment';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import Event from '../Event';
import SdkEnvironment from '../managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import OneSignalApi from '../OneSignalApi';
import Database from '../services/Database';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import {
  awaitOneSignalInitAndSupported,
  capitalize,
  contains,
  getConsoleStyle,
  triggerNotificationPermissionChanged,
} from '../utils';
import EventHelper from './EventHelper';
import SubscriptionHelper from './SubscriptionHelper';
import { WorkerMessengerCommand, WorkerMessenger } from '../libraries/WorkerMessenger';
import ProxyFrame from '../modules/frames/ProxyFrame';
import { NotificationPermission } from '../models/NotificationPermission';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';
import { AppUserConfigPromptOptions } from '../models/AppConfig';
import { SlidedownPermissionMessageOptions } from '../popover/Popover';
import TimedLocalStorage from '../modules/TimedLocalStorage';
import Log from '../libraries/Log';

export default class MainHelper {
  /**
   * If there are multiple manifests, and one of them is our OneSignal manifest, we move it to the top of <head> to ensure our manifest is used for push subscription (manifests after the first are ignored as part of the spec).
   */
  static fixWordpressManifestIfMisplaced() {
    var manifests = document.querySelectorAll('link[rel=manifest]');
    if (!manifests || manifests.length <= 1) {
      // Multiple manifests do not exist on this webpage; there is no issue
      return;
    }
    for (let i = 0; i < manifests.length; i++) {
      let manifest = manifests[i];
      let url = (manifest as any).href;
      if (contains(url, 'gcm_sender_id')) {
        // Move the <manifest> to the first thing in <head>
        document.querySelector('head').insertBefore(manifest, document.querySelector('head').children[0]);
        Log.info('OneSignal: Moved the WordPress push <manifest> to the first element in <head>.');
      }
    }
  }

  /**
   * If the user has manually opted out of notifications (OneSignal.setSubscription), returns -2; otherwise returns 1.
   * @param isOptedIn The result of OneSignal.getSubscription().
   */
  static getNotificationTypeFromOptIn(isOptedIn) {
    if (isOptedIn == true || isOptedIn == null) {
      return 1;
    } else {
      return -2;
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
      await triggerNotificationPermissionChanged();
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
      Log.error(`API call %c${url}`, getConsoleStyle('code'), 'failed with:', data.errors);
      throw new Error('Failed to get notification icons.');
    }
    return data;
  }

  static getSlidedownPermissionMessageOptions(): AppUserConfigPromptOptions | null {
    const promptOptions: AppUserConfigPromptOptions = OneSignal.config.userConfig.promptOptions;
    if (!promptOptions) {
      return null;
    }
    if (promptOptions && !promptOptions.slidedown) {
      return promptOptions;
    }

    return {
      actionMessage: promptOptions.slidedown.actionMessage,
      acceptButtonText: promptOptions.slidedown.acceptButtonText,
      cancelButtonText: promptOptions.slidedown.cancelButtonText,
    };
  }

  static getFullscreenPermissionMessageOptions(): AppUserConfigPromptOptions | null {
    const promptOptions: AppUserConfigPromptOptions = OneSignal.config.userConfig.promptOptions;
    if (!promptOptions) {
      return null;
    }
    if (promptOptions && !promptOptions.fullscreen) {
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
    let promptOptions = MainHelper.getFullscreenPermissionMessageOptions();
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
    let promptOptions = MainHelper.getFullscreenPermissionMessageOptions();
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
}
