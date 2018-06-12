import bowser from 'bowser';


import Environment from './Environment';
import AlreadySubscribedError from './errors/AlreadySubscribedError';
import { InvalidArgumentError, InvalidArgumentReason } from './errors/InvalidArgumentError';
import { InvalidStateError, InvalidStateReason } from './errors/InvalidStateError';
import { NotSubscribedError, NotSubscribedReason } from './errors/NotSubscribedError';
import PermissionMessageDismissedError from './errors/PermissionMessageDismissedError';
import PushPermissionNotGrantedError from './errors/PushPermissionNotGrantedError';
import { PushPermissionNotGrantedErrorReason } from './errors/PushPermissionNotGrantedError';
import { SdkInitError, SdkInitErrorKind } from './errors/SdkInitError';
import Event from './Event';
import EventHelper from './helpers/EventHelper';
import HttpHelper from './helpers/HttpHelper';
import InitHelper from './helpers/InitHelper';
import MainHelper from './helpers/MainHelper';
import SubscriptionHelper from './helpers/SubscriptionHelper';
import TestHelper from './helpers/TestHelper';
import LimitStore from './LimitStore';
import AltOriginManager from './managers/AltOriginManager';
import LegacyManager from './managers/LegacyManager';
import SdkEnvironment from './managers/SdkEnvironment';
import { ServiceWorkerActiveState, ServiceWorkerManager } from './managers/ServiceWorkerManager';
import { SubscriptionManager } from './managers/SubscriptionManager';
import {AppConfig, AppUserConfig} from './models/AppConfig';
import Context from './models/Context';
import { Notification } from './models/Notification';
import { NotificationActionButton } from './models/NotificationActionButton';
import { NotificationPermission } from './models/NotificationPermission';
import { PermissionPromptType } from './models/PermissionPromptType';

import { WindowEnvironmentKind } from './models/WindowEnvironmentKind';
import ProxyFrame from './modules/frames/ProxyFrame';
import ProxyFrameHost from './modules/frames/ProxyFrameHost';
import SubscriptionModal from './modules/frames/SubscriptionModal';
import SubscriptionModalHost from './modules/frames/SubscriptionModalHost';
import SubscriptionPopup from './modules/frames/SubscriptionPopup';
import SubscriptionPopupHost from './modules/frames/SubscriptionPopupHost';
import OneSignalApi from './OneSignalApi';
import Popover from './popover/Popover';
import Database from './services/Database';
import { ResourceLoadState } from './services/DynamicResourceLoader';
import IndexedDb from './services/IndexedDb';
import {
  awaitOneSignalInitAndSupported,
  awaitSdkEvent,
  executeCallback,
  getConsoleStyle,
  isValidEmail,
  logMethodCall,
  prepareEmailForHashing,
  isUsingSubscriptionWorkaround,
} from './utils';
import { ValidatorUtils } from './utils/ValidatorUtils';
import { DeviceRecord } from './models/DeviceRecord';
import { DeprecatedApiError, DeprecatedApiReason } from './errors/DeprecatedApiError';
import ConfigManager from './managers/ConfigManager';
import TimedLocalStorage from './modules/TimedLocalStorage';
import { EmailProfile } from './models/EmailProfile';
import TimeoutError from './errors/TimeoutError';
import { EmailDeviceRecord } from './models/EmailDeviceRecord';
import Emitter, {EventHandler, OnceEventHandler} from './libraries/Emitter';
import Log from './libraries/Log';
import OneSignalError from "./errors/OneSignalError";


export default class OneSignal {
  /**
   * Pass in the full URL of the default page you want to open when a notification is clicked.
   * @PublicApi
   */
  static async setDefaultNotificationUrl(url: string) {
    if (!ValidatorUtils.isValidUrl(url, { allowNull: true }))
      throw new InvalidArgumentError('url', InvalidArgumentReason.Malformed);
    await awaitOneSignalInitAndSupported();
    logMethodCall('setDefaultNotificationUrl', url);
    const appState = await Database.getAppState();
    appState.defaultNotificationUrl = url;
    await Database.setAppState(appState);
  }

  /**
   * Sets the default title to display on notifications. Will default to the page's document.title if you don't call this.
   * @remarks Either DB value defaultTitle or pageTitle is used when showing a notification title.
   * @PublicApi
   */
  static async setDefaultTitle(title: string) {
    await awaitOneSignalInitAndSupported();
    logMethodCall('setDefaultTitle', title);
    const appState = await Database.getAppState();
    appState.defaultNotificationTitle = title;
    await Database.setAppState(appState);
  }

  /**
   * @PublicApi
   */
  static async setEmail(email: string, options?: SetEmailOptions): Promise<string> {
    if (!email)
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    if (!isValidEmail(email))
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);
    // emailAuthHash is expected to be a 64 character SHA-256 hex hash
    if (options && options.emailAuthHash && options.emailAuthHash.length !== 64) {
      throw new InvalidArgumentError('options.emailAuthHash', InvalidArgumentReason.Malformed);
    }
    await awaitOneSignalInitAndSupported();
    logMethodCall('setEmail', email, options);

    const appConfig = await Database.getAppConfig();
    const { deviceId } = await Database.getSubscription();
    const existingEmailProfile = await Database.getEmailProfile();

    if (appConfig.emailAuthRequired && !(options && options.emailAuthHash)) {
      throw new InvalidArgumentError('options.emailAuthHash', InvalidArgumentReason.Empty);
    }

    const newEmailProfile = new EmailProfile();
    newEmailProfile.emailId = existingEmailProfile.emailId;
    newEmailProfile.emailAddress = email;
    if (options && options.emailAuthHash) {
      newEmailProfile.emailAuthHash = options.emailAuthHash
    }

    const isExistingEmailSaved = !!existingEmailProfile.emailId;
    if (isExistingEmailSaved && appConfig.emailAuthRequired) {
      // If we already have a saved email player ID, make a PUT call to update the existing email record
      newEmailProfile.emailId = await OneSignalApi.updateEmailRecord(
        appConfig,
        newEmailProfile,
        deviceId
      );
    } else {
      // Otherwise, make a POST call to create a new email record
      newEmailProfile.emailId = await OneSignalApi.createEmailRecord(
        appConfig,
        newEmailProfile,
        deviceId
      );
    }

    const isExistingPushRecordSaved = deviceId;
    if (
      /* If we are subscribed to web push */
      isExistingPushRecordSaved &&
      (
        /* And if we previously saved an email ID and it's different from the new returned ID */
        (
          !isExistingEmailSaved ||
          existingEmailProfile.emailId !== newEmailProfile.emailId
        ) ||
        /* Or if we previously saved an email and the email changed */
        (
          !existingEmailProfile.emailAddress ||
          newEmailProfile.emailAddress !== existingEmailProfile.emailAddress
        )
      )
    ) {
      // Then update the push device record with a reference to the new email ID and email address
      await OneSignalApi.updatePlayer(
        appConfig.appId,
        deviceId,
        {
          parent_player_id: newEmailProfile.emailId,
          email: newEmailProfile.emailAddress
        }
      );
    }

    await Database.setEmailProfile(newEmailProfile);
    return newEmailProfile.emailId;
  }

  /**
   * @PublicApi
   */
  static async logoutEmail() {
    await awaitOneSignalInitAndSupported();

    const appConfig = await Database.getAppConfig();
    const emailProfile = await Database.getEmailProfile();
    const { deviceId } = await Database.getSubscription();

    if (!emailProfile.emailId) {
      Log.warn(new NotSubscribedError(NotSubscribedReason.NoEmailSet));
      return;
    }

    if (!deviceId) {
      Log.warn(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
      return;
    }

    if (!await OneSignalApi.logoutEmail(appConfig, emailProfile, deviceId)) {
      Log.warn("Failed to logout email.");
      return;
    }

    await Database.setEmailProfile(new EmailProfile());
  }

  /**
   * Returns true if the current browser supports web push.
   * @PublicApi
   */
  static isPushNotificationsSupported() {
    logMethodCall('isPushNotificationsSupported');
    /*
      Push notification support is checked in the initial entry code. If in an unsupported environment, a stubbed empty
      version of the SDK will be loaded instead. This file will only be loaded if push notifications are supported.
     */
    return true;
  }

  /**
   * Initializes the SDK, called by the developer.
   * @PublicApi
   */
  static async init(options: AppUserConfig) {
    logMethodCall('init');

    await InitHelper.ponyfillSafariFetch();
    InitHelper.errorIfInitAlreadyCalled();
    await InitHelper.initializeConfig(options);

    if (bowser.safari && !OneSignal.config.safariWebId) {
      /**
       * Don't throw an error for missing Safari config; many users set up
       * support on Chrome/Firefox and don't intend to support Safari but don't
       * place conditional initialization checks.
       */
      Log.warn(new SdkInitError(SdkInitErrorKind.MissingSafariWebId));
      return;
    }

    if (OneSignal.config.userConfig.requiresUserPrivacyConsent) {
      const providedConsent = await Database.getProvideUserConsent();
      if (!providedConsent) {
        OneSignal.pendingInit = true;
        return;
      }
    }

    await OneSignal.delayedInit();
  }

  private static async delayedInit(): Promise<void> {
    OneSignal.pendingInit = false;
    // Ignore Promise as doesn't return until the service worker becomes active.
    OneSignal.context.workerMessenger.listen();

    async function __init() {
      if (OneSignal.__initAlreadyCalled)
        return;
      else
        OneSignal.__initAlreadyCalled = true;

      MainHelper.fixWordpressManifestIfMisplaced();

      OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, EventHelper.onNotificationPermissionChange);
      OneSignal.emitter.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, EventHelper._onSubscriptionChanged);
      OneSignal.emitter.on(OneSignal.EVENTS.SDK_INITIALIZED, InitHelper.onSdkInitialized);

      if (isUsingSubscriptionWorkaround()) {
        OneSignal.appConfig = OneSignal.config;

        /**
         * The user may have forgot to choose a subdomain in his web app setup.
         *
         * Or, the user may have an HTTP & HTTPS site while using an HTTPS-only
         * config on both variants. This would cause the HTTPS site to work
         * perfectly, while causing errors and preventing web push from working
         * on the HTTP site.
         */
        if (!OneSignal.appConfig.subdomain)
          throw new SdkInitError(SdkInitErrorKind.MissingSubdomain);
        /**
         * The iFrame may never load (e.g. OneSignal might be down), in which
         * case the rest of the SDK's initialization will be blocked. This is a
         * good thing! We don't want to access IndexedDb before we know which
         * origin to store data on.
         */
        OneSignal.proxyFrameHost = await AltOriginManager.discoverAltOrigin(OneSignal.appConfig);
      }

      window.addEventListener('focus', () => {
        // Checks if permission changed every time a user focuses on the page,
        //     since a user has to click out of and back on the page to check permissions
        MainHelper.checkAndTriggerNotificationPermissionChanged();
      });

      await InitHelper.initSaveState(document.title);
      await InitHelper.saveInitOptions();
      if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.CustomIframe)
        await Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
      else
        await InitHelper.internalInit();
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive')
      await __init();
    else {
      Log.debug('OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
        ' initialization...');
      window.addEventListener('DOMContentLoaded', () => { __init(); });
      document.onreadystatechange = () => {
        if (document.readyState === 'complete' || document.readyState === 'interactive')
          __init();
      };
    }
  }

  /**
   * Call after use accepts your user consent agreement
   * @PublicApi
   */
  static async provideUserConsent(consent: boolean): Promise<void> {
    await Database.setProvideUserConsent(consent);
    if (consent && OneSignal.pendingInit)
      await OneSignal.delayedInit();
  }

  /**
   * Prompts the user to subscribe using the remote local notification workaround for HTTP sites.
   * @PublicApi
   */
  static async showHttpPermissionRequest(options?: {_sdkCall: boolean}): Promise<any> {
    Log.debug('Called showHttpPermissionRequest(), redirecting to HTTP prompt.');

    OneSignal.showHttpPrompt().catch(e => Log.info(e));
  }

  /**
   * Shows a sliding modal prompt on the page for users to trigger the HTTP popup window to subscribe.
   * @PublicApi
   */
  static async showHttpPrompt(options?) {
    await awaitOneSignalInitAndSupported();
    await OneSignal.privateShowHttpPrompt(options);
  }

  static async privateShowHttpPrompt(options?) {
    if (!options)
      options = {};

    /*
    Only show the HTTP popover if:
    - Notifications aren't already enabled
    - The user isn't manually opted out (if the user was manually opted out, we don't want to prompt the user)
    */
    if (OneSignal.__isPopoverShowing) {
      throw new InvalidStateError(InvalidStateReason.RedundantPermissionMessage, {
        permissionPromptType: PermissionPromptType.SlidedownPermissionMessage
      });
    }

    const doNotPrompt = await MainHelper.wasHttpsNativePromptDismissed();

    if (doNotPrompt && !options.force) {
      Log.info(new PermissionMessageDismissedError());
      return;
    }

    const permission = await OneSignal.privateGetNotificationPermission();
    if (permission === NotificationPermission.Denied) {
      Log.info(new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked));
      return;
    }

    const isEnabled = await OneSignal.privateIsPushNotificationsEnabled();
    if (isEnabled)
      throw new AlreadySubscribedError();

    const notOptedOut = await OneSignal.privateGetSubscription();
    if (!notOptedOut)
      throw new NotSubscribedError(NotSubscribedReason.OptedOut);

    MainHelper.markHttpPopoverShown();

    const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug('Not showing slidedown permission message because styles failed to load.');
      return;
    }
    OneSignal.popover = new Popover(MainHelper.getSlidedownPermissionMessageOptions());
    await OneSignal.popover.create();
    Log.debug('Showing the HTTP popover.');
    if (OneSignal.notifyButton &&
      OneSignal.notifyButton.options.enable &&
      OneSignal.notifyButton.launcher.state !== 'hidden') {
      OneSignal.notifyButton.launcher.waitUntilShown()
        .then(() => {
          OneSignal.notifyButton.launcher.hide();
        });
    }
    OneSignal.emitter.once(Popover.EVENTS.SHOWN, () => {
      OneSignal.__isPopoverShowing = true;
    });
    OneSignal.emitter.once(Popover.EVENTS.CLOSED, () => {
      OneSignal.__isPopoverShowing = false;
      if (OneSignal.notifyButton &&
        OneSignal.notifyButton.options.enable) {
        OneSignal.notifyButton.launcher.show();
      }
    });
    OneSignal.emitter.once(Popover.EVENTS.ALLOW_CLICK, () => {
      OneSignal.popover.close();
      Log.debug("Setting flag to not show the popover to the user again.");
      TestHelper.markHttpsNativePromptDismissed();
      OneSignal._sessionInitAlreadyRunning = false;
      OneSignal.registerForPushNotifications({ autoAccept: true });
    });
    OneSignal.emitter.once(Popover.EVENTS.CANCEL_CLICK, () => {
      Log.debug("Setting flag to not show the popover to the user again.");
      TestHelper.markHttpsNativePromptDismissed();
      OneSignal._sessionInitAlreadyRunning = false;
    });
  }


  /**
   * Prompts the user to subscribe.
   * @PublicApi
   */
  static registerForPushNotifications(options?: any) {
    // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
    //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
    function __registerForPushNotifications() {
      if (options && options.httpPermissionRequest && isUsingSubscriptionWorkaround()) {
        /*
          Do not throw an error because it may cause the parent event handler to
          throw and stop processing the rest of their code. Typically, for this
          prompt sequence, a custom modal is being shown thanking the user for
          granting permissions. Throwing an error might cause the modal to stay
          on screen and not close.

          Only log an error for HTTP sites. A few HTTPS sites are mistakenly be
          using this API instead of the parameter-less version to register for
          push notifications.
         */
        Log.error(new DeprecatedApiError(DeprecatedApiReason.HttpPermissionRequest));
        return;
      }
      if (isUsingSubscriptionWorkaround()) {
          /**
           * Users may be subscribed to either .onesignal.com or .os.tc. By this time
           * that they are subscribing to the popup, the Proxy Frame has already been
           * loaded and the user's subscription status has been obtained. We can then
           * use the Proxy Frame present now and check its URL to see whether the user
           * is finally subscribed to .onesignal.com or .os.tc.
           */
        OneSignal.subscriptionPopupHost = new SubscriptionPopupHost(OneSignal.proxyFrameHost.url, options);
        OneSignal.subscriptionPopupHost.load();
      }
      else {
        if (!options)
          options = {};
        options.fromRegisterFor = true;
        InitHelper.sessionInit(options);
      }
    }

    if (!OneSignal.initialized)
      OneSignal.emitter.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __registerForPushNotifications());
    else
      return __registerForPushNotifications();
  }

  /**
   * Returns a promise that resolves to the browser's current notification permission as
   *    'default', 'granted', or 'denied'.
   * @param callback A callback function that will be called when the browser's current notification permission
   *           has been obtained, with one of 'default', 'granted', or 'denied'.
   * @PublicApi
   */
  public static async getNotificationPermission(onComplete?: Function): Promise<NotificationPermission> {
    await awaitOneSignalInitAndSupported();
    return OneSignal.privateGetNotificationPermission(onComplete);
  }

  static async privateGetNotificationPermission(onComplete?: Function): Promise<NotificationPermission> {
    const permission = await OneSignal.context.permissionManager.getNotificationPermission(
        OneSignal.config!.safariWebId
      );

    if (onComplete)
      onComplete(permission);

    return permission;
  }

  /**
   * @PublicApi
   */
  static async getTags(callback) {
    await awaitOneSignalInitAndSupported();
    logMethodCall('getTags', callback);
    const { appId } = await Database.getAppConfig();
    const { deviceId } = await Database.getSubscription();
    if (!deviceId) {
      // TODO: Throw an error here in future v2; for now it may break existing client implementations.
      Log.info(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
      return null;
    }
    const { tags } = await OneSignalApi.getPlayer(appId, deviceId);
    executeCallback(callback, tags);
    return tags;
  }

  /**
   * @PublicApi
   */
  static async sendTag(key: string, value: any, callback?: Action<Object>): Promise<Object> {
    const tag = {};
    tag[key] = value;
    return await OneSignal.sendTags(tag, callback);
  }

  /**
   * @PublicApi
   */
  static async sendTags(tags: Object, callback?: Action<Object>): Promise<Object> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('sendTags', tags, callback);
    if (!tags || Object.keys(tags).length === 0) {
      // TODO: Throw an error here in future v2; for now it may break existing client implementations.
      Log.info(new InvalidArgumentError('tags', InvalidArgumentReason.Empty));
      return null;
    }
    // Our backend considers false as removing a tag, so convert false -> "false" to allow storing as a value
    Object.keys(tags).forEach(key => {
      if (tags[key] === false)
        tags[key] = "false";
    });
    const { appId } = await Database.getAppConfig();

    const emailProfile = await Database.getEmailProfile();
    if (emailProfile.emailId) {
      await OneSignalApi.updatePlayer(appId, emailProfile.emailId, {
        tags: tags,
        email_auth_hash: emailProfile.emailAuthHash,
      });
    }

    var { deviceId } = await Database.getSubscription();
    if (!deviceId) {
      await awaitSdkEvent(OneSignal.EVENTS.REGISTERED);
    }
    // After the user subscribers, he will have a device ID, so get it again
    var { deviceId: newDeviceId } = await Database.getSubscription();
    await OneSignalApi.updatePlayer(appId, newDeviceId, {
      tags: tags
    });
    executeCallback(callback, tags);
    return tags;
  }

  /**
   * @PublicApi
   */
  static async deleteTag(tag: string): Promise<Array<string>> {
    return await OneSignal.deleteTags([tag]);
  }

  /**
   * @PublicApi
   */
  static async deleteTags(tags: Array<string>, callback?: Action<Array<string>>): Promise<Array<string>> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('deleteTags', tags, callback);
    if (!ValidatorUtils.isValidArray(tags))
      throw new InvalidArgumentError('tags', InvalidArgumentReason.Malformed);
    if (tags.length === 0) {
      // TODO: Throw an error here in future v2; for now it may break existing client implementations.
      Log.info(new InvalidArgumentError('tags', InvalidArgumentReason.Empty));
    }
    const tagsToSend = {};
    for (let tag of tags) {
      tagsToSend[tag] = '';
    }
    const deletedTags = await OneSignal.sendTags(tagsToSend);
    const deletedTagKeys = Object.keys(deletedTags);
    executeCallback(callback, deletedTagKeys);
    return deletedTagKeys;
  }

  /**
   * @PublicApi
   */
  static async addListenerForNotificationOpened(callback?: Action<Notification>) {
    await awaitOneSignalInitAndSupported();
    logMethodCall('addListenerForNotificationOpened', callback);
    OneSignal.emitter.once(OneSignal.EVENTS.NOTIFICATION_CLICKED, notification => {
      executeCallback(callback, notification);
    });
    EventHelper.fireStoredNotificationClicks(OneSignal.config.pageUrl || OneSignal.config.userConfig.pageUrl);
  }
  /**
   * @PublicApi
   * @Deprecated
   */
  static async getIdsAvailable(callback?: Action<{userId: string, registrationId: string}>):
    Promise<{userId: string, registrationId: string}> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('getIdsAvailable', callback);
    const { deviceId, subscriptionToken } = await Database.getSubscription();
    const bundle = {
      userId: deviceId,
      registrationId: subscriptionToken
    };
    executeCallback(callback, bundle);
    return bundle;
  }

  /**
   * Returns a promise that resolves to true if all required conditions for push messaging are met; otherwise resolves to false.
   * @param callback A callback function that will be called when the current subscription status has been obtained.
   * @PublicApi
   */
  static async isPushNotificationsEnabled(callback?: Action<boolean>): Promise<boolean> {
    await awaitOneSignalInitAndSupported();
    return OneSignal.privateIsPushNotificationsEnabled(callback);
  }

  static async privateIsPushNotificationsEnabled(callback?: Action<boolean>): Promise<boolean> {
    logMethodCall('isPushNotificationsEnabled', callback);

    const context: Context = OneSignal.context;
    const subscriptionState = await context.subscriptionManager.getSubscriptionState();

    executeCallback(callback, subscriptionState.subscribed && !subscriptionState.optedOut);
    return subscriptionState.subscribed && !subscriptionState.optedOut;
  }

  /**
   * @PublicApi
   */
  static async setSubscription(newSubscription: boolean): Promise<void> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('setSubscription', newSubscription);
    const appConfig = await Database.getAppConfig();
    const { appId } = appConfig;
    const subscription = await Database.getSubscription();
    const { deviceId } = subscription;
    if (!appConfig.appId)
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    if (!ValidatorUtils.isValidBoolean(newSubscription))
      throw new InvalidArgumentError('newSubscription', InvalidArgumentReason.Malformed);
    if (!deviceId) {
      // TODO: Throw an error here in future v2; for now it may break existing client implementations.
      Log.info(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
      return;
    }
    subscription.optedOut = !newSubscription;
    await OneSignalApi.updatePlayer(appId, deviceId, {
      notification_types: MainHelper.getNotificationTypeFromOptIn(newSubscription)
    });
    await Database.setSubscription(subscription);
    EventHelper.onInternalSubscriptionSet(subscription.optedOut);
    EventHelper.checkAndTriggerSubscriptionChanged();
  }

  /**
   * @PendingPublicApi
   */
  static async isOptedOut(callback?: Action<boolean>): Promise<boolean> {
    await awaitOneSignalInitAndSupported();
    return OneSignal.internalIsOptedOut(callback);
  }

  private static async internalIsOptedOut(callback?: Action<boolean>): Promise<boolean> {
    logMethodCall('isOptedOut', callback);
    const { optedOut } = await Database.getSubscription();
    executeCallback(callback, optedOut);
    return optedOut;
  }

  /**
   * Returns a promise that resolves once the manual subscription override has been set.
   * @private
   * @PendingPublicApi
   */
  static async optOut(doOptOut: boolean, callback?: Action<void>): Promise<void> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('optOut', doOptOut, callback);
    if (!ValidatorUtils.isValidBoolean(doOptOut))
      throw new InvalidArgumentError('doOptOut', InvalidArgumentReason.Malformed);
    await OneSignal.setSubscription(!doOptOut);
    executeCallback(callback);
  }

  /**
   * Returns a promise that resolves to the stored OneSignal email ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal email ID.
   * @PublicApi
   */
  static async getEmailId(callback?: Action<string>): Promise<string> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('getEmailId', callback);
    const emailProfile = await Database.getEmailProfile();
    const emailId = emailProfile.emailId;
    executeCallback(callback, emailId);
    return emailId;
  }

  /**
   * Returns a promise that resolves to the stored OneSignal user ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal user ID.
   * @PublicApi
   */
  static async getUserId(callback?: Action<string>): Promise<string> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('getUserId', callback);
    const subscription = await Database.getSubscription();
    const deviceId = subscription.deviceId;
    executeCallback(callback, deviceId);
    return deviceId;
  }

  /**
   * Returns a promise that resolves to the stored push token if one is set; otherwise null.
   * @PublicApi
   */
  static async getRegistrationId(callback?: Action<string>): Promise<string> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('getRegistrationId', callback);
    const subscription = await Database.getSubscription();
    const subscriptionToken = subscription.subscriptionToken;
    executeCallback(callback, subscriptionToken);
    return subscriptionToken;
  }

  /**
   * Returns a promise that resolves to false if setSubscription(false) is "in effect". Otherwise returns true.
   * This means a return value of true does not mean the user is subscribed, only that the user did not call
   * setSubcription(false).
   * @private
   * @PublicApi (given to customers)
   */
  static async getSubscription(callback?: Action<boolean>): Promise<boolean> {
    await awaitOneSignalInitAndSupported();
    return await OneSignal.privateGetSubscription(callback);
  }

  static async privateGetSubscription(callback?: Action<boolean>): Promise<boolean> {
    logMethodCall('getSubscription', callback);
    const subscription = await Database.getSubscription();
    const subscriptionStatus = !subscription.optedOut;
    executeCallback(callback, subscriptionStatus);
    return subscriptionStatus;
  }

  /**
   * @PublicApi
   */
  static async sendSelfNotification(title: string = 'OneSignal Test Message',
                              message: string = 'This is an example notification.',
                              url: string = new URL(location.href).origin + '?_osp=do_not_open',
                              icon: URL,
                              data: Map<String, any>,
                              buttons: Array<NotificationActionButton>): Promise<void> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('sendSelfNotification', title, message, url, icon, data, buttons);
    const appConfig = await Database.getAppConfig();
    const subscription = await Database.getSubscription();
    if (!appConfig.appId)
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    if (!(await OneSignal.isPushNotificationsEnabled()))
      throw new NotSubscribedError(NotSubscribedReason.NoDeviceId);
    if (!ValidatorUtils.isValidUrl(url))
      throw new InvalidArgumentError('url', InvalidArgumentReason.Malformed);
    if (!ValidatorUtils.isValidUrl(icon, { allowEmpty: true, requireHttps: true }))
      throw new InvalidArgumentError('icon', InvalidArgumentReason.Malformed);
    return await OneSignalApi.sendNotification(appConfig.appId, [subscription.deviceId], {'en': title}, {'en': message},
                                               url, icon, data, buttons);
  }

  /**
   * Used to load OneSignal asynchronously from a webpage
   * Allows asynchronous function queuing while the SDK loads in the browser with <script src="..." async/>
   * @PublicApi
   * @param item - Ether a function or an arry with a OneSignal function name followed by it's parameters
   * @Example
   *  OneSignal.push(["functionName", param1, param2]);
   *  OneSignal.push(function() { OneSignal.functionName(param1, param2); });
   */
  static push(item: Function | any[]) {
    if (typeof(item) == "function")
      item();
    else if (Array.isArray(item)) {
      if (item.length == 0)
        throw new OneSignalError("Empty array is not valid!");

      const functionName = item.shift();
      if (functionName == null || typeof(functionName) == "undefined")
        throw new OneSignalError("First element in array must be the OneSignal function name");

      const oneSignalFunction = (OneSignal as any)[functionName.toString()] as Function | undefined;
      if (typeof(oneSignalFunction) != "function")
        throw new OneSignalError(`No OneSignal function with the name '${functionName}'`);
      oneSignalFunction.apply(null, item);
    }
    else
      throw new OneSignalError("Only accepts function and Array types!");
  }

  /**
   * Used to subscribe to OneSignal events such as "subscriptionChange"
   * Fires each time the event occurs
   * @param event - Event name to subscribe to
   * @param listener - Listener to fire when event happens
   * @PublicApi
   */
  static on(event: string, listener: EventHandler): Emitter {
    return this.emitter.on(event, listener);
  }

  /**
   * Used to subscribe to OneSignal events such as "subscriptionChange"
   * Fires only once
   * @param event - Event name to subscribe to
   * @param listener - Listener to fire when event happens
   * @PublicApi
   */
  static once(event: string, listener: EventHandler): Emitter {
    return this.emitter.once(event, listener);
  }

  static __doNotShowWelcomeNotification: boolean;
  static VERSION = Environment.version();
  static _VERSION = Environment.version();
  static sdkEnvironment = SdkEnvironment;
  static _notificationOpenedCallbacks = [];
  static _idsAvailable_callback = [];
  static _defaultLaunchURL = null;
  static config: AppConfig | null = null;
  static __isPopoverShowing = false;
  static _sessionInitAlreadyRunning = false;
  static _isNotificationEnabledCallback = [];
  static _subscriptionSet = true;
  static modalUrl = null;
  static _windowWidth = 650;
  static _windowHeight = 568;
  static _isNewVisitor = false;
  static _channel = null;
  static timedLocalStorage = TimedLocalStorage;
  static initialized = false;
  static notifyButton = null;
  static store = LimitStore;
  static environment = Environment;
  static database = Database;
  static event = Event;
  static browser = bowser;
  static popover = null;
  static log = Log;
  static api = OneSignalApi;
  static indexedDb = IndexedDb;
  static mainHelper = MainHelper;
  static subscriptionHelper = SubscriptionHelper;
  static httpHelper =  HttpHelper;
  static eventHelper = EventHelper;
  static initHelper = InitHelper;
  static testHelper = TestHelper;
  static appConfig: AppConfig | null = null;
  private static pendingInit: boolean;

  static subscriptionPopup: SubscriptionPopup;
  static subscriptionPopupHost: SubscriptionPopupHost;
  static subscriptionModal: SubscriptionModal;
  static subscriptionModalHost: SubscriptionModalHost;
  static proxyFrameHost: ProxyFrameHost;
  static proxyFrame: ProxyFrame;
  static emitter: Emitter = new Emitter();

  /**
   * The additional path to the worker file.
   *
   * Usually just the filename (in case the file is named differently), but also supports cases where the folder
   * is different.
   *
   * However, the init options 'path' should be used to specify the folder path instead since service workers will not
   * auto-update correctly on HTTPS site load if the config init options 'path' is not set.
   */
  static SERVICE_WORKER_UPDATER_PATH = 'OneSignalSDKUpdaterWorker.js';
  static SERVICE_WORKER_PATH = 'OneSignalSDKWorker.js';

  /**
   * By default, the service worker is expected to be accessible at the root scope. If the service worker is only
   * available with in a sub-directory, SERVICE_WORKER_PARAM must be changed to the sub-directory (with a trailing
   * slash). This would allow pages to function correctly as not to block the service worker ready call, which would
   * hang indefinitely if we requested root scope registration but the service was only available in a child scope.
   */
  static SERVICE_WORKER_PARAM: { scope: string } = {scope: '/'};
  static _LOGGING = false;
  static LOGGING = false;
  static _usingNativePermissionHook = false;
  static _initCalled = false;
  static __initAlreadyCalled = false;
  static context: Context;
  static checkAndWipeUserSubscription = function () { }
  static DeviceRecord = DeviceRecord;
  static EmailDeviceRecord = EmailDeviceRecord;

  static notificationPermission = NotificationPermission;


  /**
   * Used by Rails-side HTTP popup. Must keep the same name.
   * @InternalApi
   */
  static _initHttp = HttpHelper.initHttp;

  /**
   * Used by Rails-side HTTP popup. Must keep the same name.
   * @InternalApi
   */
  static _initPopup = () => OneSignal.subscriptionPopup.subscribe();

  static POSTMAM_COMMANDS = {
    CONNECTED: 'connect',
    REMOTE_NOTIFICATION_PERMISSION: 'postmam.remoteNotificationPermission',
    REMOTE_DATABASE_GET: 'postmam.remoteDatabaseGet',
    REMOTE_DATABASE_PUT: 'postmam.remoteDatabasePut',
    REMOTE_DATABASE_REMOVE: 'postmam.remoteDatabaseRemove',
    REMOTE_OPERATION_COMPLETE: 'postman.operationComplete',
    REMOTE_RETRIGGER_EVENT: 'postmam.remoteRetriggerEvent',
    MODAL_LOADED: 'postmam.modalPrompt.loaded',
    MODAL_PROMPT_ACCEPTED: 'postmam.modalPrompt.accepted',
    MODAL_PROMPT_REJECTED: 'postmam.modalPrompt.canceled',
    POPUP_LOADED: 'postmam.popup.loaded',
    POPUP_ACCEPTED: 'postmam.popup.accepted',
    POPUP_REJECTED: 'postmam.popup.canceled',
    POPUP_CLOSING: 'postman.popup.closing',
    REMOTE_NOTIFICATION_PERMISSION_CHANGED: 'postmam.remoteNotificationPermissionChanged',
    IFRAME_POPUP_INITIALIZE: 'postmam.iframePopupInitialize',
    UNSUBSCRIBE_FROM_PUSH: 'postmam.unsubscribeFromPush',
    SET_SESSION_COUNT: 'postmam.setSessionCount',
    REQUEST_HOST_URL: 'postmam.requestHostUrl',
    WINDOW_TIMEOUT: 'postmam.windowTimeout',
    FINISH_REMOTE_REGISTRATION: 'postmam.finishRemoteRegistration',
    FINISH_REMOTE_REGISTRATION_IN_PROGRESS: 'postmam.finishRemoteRegistrationInProgress',
    POPUP_BEGIN_MESSAGEPORT_COMMS: 'postmam.beginMessagePortComms',
    SERVICEWORKER_COMMAND_REDIRECT: 'postmam.command.redirect',
    MARK_PROMPT_DISMISSED: 'postmam.markPromptDismissed',
    IS_SUBSCRIBED: 'postmam.isSubscribed',
    UNSUBSCRIBE_PROXY_FRAME: 'postman.unsubscribeProxyFrame',
    GET_EVENT_LISTENER_COUNT: 'postmam.getEventListenerCount',
    SERVICE_WORKER_STATE: 'postmam.serviceWorkerState',
    GET_WORKER_VERSION: 'postmam.getWorkerVersion',
    SUBSCRIPTION_EXPIRATION_STATE: 'postmam.subscriptionExpirationState',
    PROCESS_EXPIRING_SUBSCRIPTIONS: 'postmam.processExpiringSubscriptions',
    GET_SUBSCRIPTION_STATE: 'postmam.getSubscriptionState',
  };

  static EVENTS = {
    /**
     * Occurs when the user clicks the "Continue" or "No Thanks" button on the HTTP popup or HTTPS modal prompt.
     * For HTTP sites (and HTTPS sites using the modal prompt), this event is fired before the native permission
     * prompt is shown. This event is mostly used for HTTP sites.
     */
    CUSTOM_PROMPT_CLICKED: 'customPromptClick',
    /**
     * Occurs when the user clicks "Allow" or "Block" on the native permission prompt on Chrome, Firefox, or Safari.
     * This event is used for both HTTP and HTTPS sites and occurs after the user actually grants notification
     * permissions for the site. Occurs before the user is actually subscribed to push notifications.
     */
    NATIVE_PROMPT_PERMISSIONCHANGED: 'notificationPermissionChange',
    /**
     * Occurs after the user is officially subscribed to push notifications. The service worker is fully registered
     * and activated and the user is eligible to receive push notifications at any point after this.
     */
    SUBSCRIPTION_CHANGED: 'subscriptionChange',
    /**
     * Occurs after a POST call to OneSignal's server to send the welcome notification has completed. The actual
     * notification arrives shortly after.
     */
    WELCOME_NOTIFICATION_SENT: 'sendWelcomeNotification',
    /**
     * Occurs when a notification is displayed.
     */
    NOTIFICATION_DISPLAYED: 'notificationDisplay',
    /**
     * Occurs when a notification is dismissed by the user either clicking 'X' or clearing all notifications
     * (available in Android). This event is NOT called if the user clicks the notification's body or any of the
     * action buttons.
     */
    NOTIFICATION_DISMISSED: 'notificationDismiss',
    /**
     * New event replacing legacy addNotificationOpenedHandler(). Used when the notification was clicked.
     */
    NOTIFICATION_CLICKED: 'notificationClick',
    /**
     * Occurs after the document ready event fires and, for HTTP sites, the iFrame to subdomain.onesignal.com has
     * loaded.
     * Before this event, IndexedDB access is not possible for HTTP sites.
     */
    SDK_INITIALIZED: 'initializeInternal',
    /**
     * Occurs after the SDK finishes its final internal initialization. The final initialization event.
     */
    SDK_INITIALIZED_PUBLIC: 'initialize',
    /**
     * Occurs after the user subscribes to push notifications and a new user entry is created on OneSignal's server,
     * and also occurs when the user begins a new site session and the last_session and last_active is updated on
     * OneSignal's server.
     */
    REGISTERED: 'register',
    /**
     * Occurs as the HTTP popup is closing.
     */
    POPUP_CLOSING: 'popupClose',
    /**
     * Occurs when the native permission prompt is displayed.
     */
    PERMISSION_PROMPT_DISPLAYED: 'permissionPromptDisplay',
    /**
     * For internal testing only. Used for all sorts of things.
     */
    TEST_INIT_OPTION_DISABLED: 'testInitOptionDisabled',
    TEST_WOULD_DISPLAY: 'testWouldDisplay',
    POPUP_WINDOW_TIMEOUT: 'popupWindowTimeout',
  };
}

LegacyManager.ensureBackwardsCompatibility(OneSignal);

Log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION}, ${SdkEnvironment.getWindowEnv().toString()} environment).`, getConsoleStyle('bold'));
Log.debug(`Current Page URL: ${typeof location === "undefined" ? "NodeJS" : location.href}`);
Log.debug(`Browser Environment: ${bowser.name} ${bowser.version}`);
