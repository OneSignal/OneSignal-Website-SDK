import { DEV_HOST, DEV_FRAME_HOST, PROD_HOST, API_URL, STAGING_FRAME_HOST, DEV_PREFIX, STAGING_PREFIX } from './vars';
import Environment from './Environment';
import OneSignalApi from './OneSignalApi';
import IndexedDb from './IndexedDb';
import * as log from 'loglevel';
import Event from "./Event";
import Bell from "./bell/Bell";
import * as Cookie from 'js-cookie';
import Database from './Database';
import * as Browser from 'bowser';
import {
  logMethodCall, isValidEmail, awaitOneSignalInitAndSupported, getConsoleStyle,
  contains, unsubscribeFromPush, decodeHtmlEntities, getUrlQueryParam, executeAndTimeoutPromiseAfter,
  wipeLocalIndexedDb, prepareEmailForHashing, executeCallback, once, md5, sha1, awaitSdkEvent
} from './utils';
import { ValidatorUtils, ValidatorOptions } from './utils/ValidatorUtils';
import * as objectAssign from 'object-assign';
import * as EventEmitter from 'wolfy87-eventemitter';
import * as heir from 'heir';
import * as swivel from 'swivel';
import Postmam from './Postmam';
import EventHelper from './helpers/EventHelper';
import MainHelper from './helpers/MainHelper';
import Popover from './popover/Popover';
import {Uuid} from "./models/Uuid";
import {InvalidArgumentError, InvalidArgumentReason} from "./errors/InvalidArgumentError";
import LimitStore from "./LimitStore";
import {InvalidStateError, InvalidStateReason} from "./errors/InvalidStateError";
import InitHelper from "./helpers/InitHelper";
import ServiceWorkerHelper from "./helpers/ServiceWorkerHelper";
import SubscriptionHelper from "./helpers/SubscriptionHelper";
import HttpHelper from "./helpers/HttpHelper";
import TestHelper from "./helpers/TestHelper";
import {NotificationActionButton} from "./models/NotificationActionButton";
import { NotificationPermission } from './models/NotificationPermission';
import PermissionMessageDismissedError from "./errors/PermissionMessageDismissedError";
import PushPermissionNotGrantedError from "./errors/PushPermissionNotGrantedError";
import { NotSubscribedError } from "./errors/NotSubscribedError";
import AlreadySubscribedError from "./errors/AlreadySubscribedError";
import { NotSubscribedReason } from "./errors/NotSubscribedError";
import { PermissionPromptType } from './models/PermissionPromptType';
import { Notification } from "./models/Notification";



export default class OneSignal {

  /**
   * Pass in the full URL of the default page you want to open when a notification is clicked.
   * @PublicApi
   */
  static async setDefaultNotificationUrl(url: URL) {
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
   * Hashes the provided email and uploads to OneSignal.
   * @remarks The email is voluntarily provided.
   * @PublicApi
   */
  static async syncHashedEmail(email) {
    if (!email)
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    let sanitizedEmail = prepareEmailForHashing(email);
    if (!isValidEmail(sanitizedEmail))
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);
    await awaitOneSignalInitAndSupported();
    logMethodCall('syncHashedEmail', email);
    const { appId } = await Database.getAppConfig();
    const { deviceId } = await Database.getSubscription();
    if (!deviceId)
      throw new NotSubscribedError(NotSubscribedReason.NoDeviceId);
    const result = await OneSignalApi.updatePlayer(appId, deviceId, {
      em_m: md5(sanitizedEmail),
      em_s: sha1(sanitizedEmail)
    });
    if (result && result.success) {
      return true;
    } else {
      throw result;
    }
  }

  /**
   * Returns true if the current browser supports web push.
   * @PublicApi
   */
  static isPushNotificationsSupported() {
    logMethodCall('isPushNotificationsSupported');
    return true;
  }

  /**
   * Initializes the SDK, called by the developer.
   * @PublicApi
   */
  static init(options) {
    logMethodCall('init', options);

    ServiceWorkerHelper.applyServiceWorkerEnvPrefixes();

    if (OneSignal._initCalled) {
      log.error(`OneSignal: Please don't call init() more than once. Any extra calls to init() are ignored. The following parameters were not processed: %c${JSON.stringify(Object.keys(options))}`, getConsoleStyle('code'));
      return 'return';
    }
    OneSignal._initCalled = true;

    OneSignal.config = objectAssign({
      path: '/'
    }, options);

    if (Browser.safari && !OneSignal.config.safari_web_id) {
      log.warn("OneSignal: Required parameter %csafari_web_id", getConsoleStyle('code'), 'was not passed to OneSignal.init(), skipping SDK initialization.');
      return;
    }

    function __init() {
      if (OneSignal.__initAlreadyCalled) {
        // Call from window.addEventListener('DOMContentLoaded', () => {
        // Call from if (document.readyState === 'complete' || document.readyState === 'interactive')
        return;
      } else {
        OneSignal.__initAlreadyCalled = true;
      }
      MainHelper.fixWordpressManifestIfMisplaced();

      if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
        if (OneSignal.config.subdomainName) {
          OneSignal.config.subdomainName = MainHelper.autoCorrectSubdomain(OneSignal.config.subdomainName);
        } else {
          log.error('OneSignal: Your JavaScript initialization code is missing a required parameter %csubdomainName',
            getConsoleStyle('code'),
            '. HTTP sites require this parameter to initialize correctly. Please see steps 1.4 and 2 at ' +
            'https://documentation.onesignal.com/docs/web-push-sdk-setup-http)');
          return;
        }

        if (Environment.isDev()) {
          OneSignal.iframeUrl = `${DEV_FRAME_HOST}/webPushIframe`;
          OneSignal.popupUrl = `${DEV_FRAME_HOST}/subscribe`;
        }
        else {
          OneSignal.iframeUrl = `https://${OneSignal.config.subdomainName}.onesignal.com/webPushIframe`;
          OneSignal.popupUrl = `https://${OneSignal.config.subdomainName}.onesignal.com/subscribe`;
        }
      } else {
        if (Environment.isDev()) {
          OneSignal.modalUrl = `${DEV_FRAME_HOST}/webPushModal`;
        } else if (Environment.isStaging()) {
          OneSignal.modalUrl = `${STAGING_FRAME_HOST}/webPushModal`;
        } else {
          OneSignal.modalUrl = `https://onesignal.com/webPushModal`;
        }
      }


      let subdomainPromise = Promise.resolve();
      if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
        subdomainPromise = HttpHelper.loadSubdomainIFrame()
                                    .then(() => log.info('Subdomain iFrame loaded'))
      }

      OneSignal.on(Database.EVENTS.REBUILT, EventHelper.onDatabaseRebuilt);
      OneSignal.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, EventHelper.onNotificationPermissionChange);
      OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, EventHelper._onSubscriptionChanged);
      OneSignal.on(Database.EVENTS.SET, EventHelper._onDbValueSet);
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED, InitHelper.onSdkInitialized);
      subdomainPromise.then(() => {
        window.addEventListener('focus', (event) => {
          // Checks if permission changed everytime a user focuses on the page, since a user has to click out of and back on the page to check permissions
          MainHelper.checkAndTriggerNotificationPermissionChanged();
        });

        // If Safari - add 'fetch' pollyfill if it isn't already added.
        if (Browser.safari && typeof window.fetch == "undefined") {
          var s = document.createElement('script');
          s.setAttribute('src', "https://cdnjs.cloudflare.com/ajax/libs/fetch/0.9.0/fetch.js");
          document.head.appendChild(s);
        }

        if (Environment.isCustomSubdomain()) {
          Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
          return;
        }

        InitHelper.initSaveState()
                 .then(() => InitHelper.saveInitOptions())
                 .then(() => InitHelper.internalInit());
      });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      __init();
    }
    else {
      log.debug('OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
        ' initialization...');
      window.addEventListener('DOMContentLoaded', () => {
        __init();
      });
      document.onreadystatechange = () => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          __init();
        }
      };
    }
  }

  /**
   * Shows a sliding modal prompt on the page for users to trigger the HTTP popup window to subscribe.
   * @PublicApi
   */
  static showHttpPrompt(options?) {
    return awaitOneSignalInitAndSupported()
      .then(() => {
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
        return Promise.all([
          OneSignal.getNotificationPermission(),
          OneSignal.isPushNotificationsEnabled(),
          OneSignal.getSubscription(),
          Database.get('Options', 'popoverDoNotPrompt'),
          OneSignal.httpHelper.isShowingHttpPermissionRequest()
        ])
                      .then(([permission, isEnabled, notOptedOut, doNotPrompt, isShowingHttpPermissionRequest]) => {
                        if (doNotPrompt === true && (!options || options.force == false)) {
                          throw new PermissionMessageDismissedError();
                        }
                        if (permission === NotificationPermission.Denied) {
                          throw new PushPermissionNotGrantedError();
                        }
                        if (isEnabled) {
                          throw new AlreadySubscribedError();
                        }
                        if (!notOptedOut) {
                          throw new NotSubscribedError(NotSubscribedReason.OptedOut);
                        }
                        if (MainHelper.isUsingHttpPermissionRequest()
                            ) {
                          log.debug('The slidedown permission message cannot be used while the HTTP perm. req. is enabled.');
                          throw new InvalidStateError(InvalidStateReason.RedundantPermissionMessage, {
                            permissionPromptType: PermissionPromptType.HttpPermissionRequest
                          });
                        }
                        MainHelper.markHttpPopoverShown();
                        OneSignal.popover = new Popover(OneSignal.config.promptOptions);
                        OneSignal.popover.create();
                        log.debug('Showing the HTTP popover.');
                        if (OneSignal.notifyButton && OneSignal.notifyButton.launcher.state !== 'hidden') {
                          OneSignal.notifyButton.launcher.waitUntilShown()
                                   .then(() => {
                                     OneSignal.notifyButton.launcher.hide();
                                   });
                        }
                        OneSignal.once(Popover.EVENTS.SHOWN, () => {
                          OneSignal.__isPopoverShowing = true;
                        });
                        OneSignal.once(Popover.EVENTS.CLOSED, () => {
                          OneSignal.__isPopoverShowing = false;
                          if (OneSignal.notifyButton) {
                            OneSignal.notifyButton.launcher.show();
                          }
                        });
                        OneSignal.once(Popover.EVENTS.ALLOW_CLICK, () => {
                          OneSignal.popover.close();
                          OneSignal.registerForPushNotifications({autoAccept: true});
                        });
                        OneSignal.once(Popover.EVENTS.CANCEL_CLICK, () => {
                          log.debug("Setting flag to not show the popover to the user again.");
                          Database.put('Options', {key: 'popoverDoNotPrompt', value: true});
                        });
                      });
      });
  }

  /**
   * Prompts the user to subscribe.
   * @PublicApi
   */
  static registerForPushNotifications(options) {
    // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
    //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
    function __registerForPushNotifications() {
      if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
        HttpHelper.loadPopup(options);
      } else {
        if (!options)
          options = {};
        options.fromRegisterFor = true;
        InitHelper.sessionInit(options);
      }
    }

    if (!OneSignal.initialized) {
      OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __registerForPushNotifications());
    } else {
      return __registerForPushNotifications();
    }
  }

  /**
   * Prompts the user to subscribe using the remote local notification workaround for HTTP sites.
   * @PublicApi
   */
  static showHttpPermissionRequest(options?: {_sdkCall: boolean}) {
    log.debug('Called showHttpPermissionRequest().');

    return awaitOneSignalInitAndSupported()
      .then(() => new Promise((resolve, reject) => {
        // Safari's push notifications are one-click Allow and shouldn't support this workaround
        if (Browser.safari) {
          throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
        }

        if (OneSignal.__isPopoverShowing) {
          throw new InvalidStateError(InvalidStateReason.RedundantPermissionMessage, {
            permissionPromptType: PermissionPromptType.SlidedownPermissionMessage
          });
        }

        if (OneSignal._showingHttpPermissionRequest) {
          throw new InvalidStateError(InvalidStateReason.RedundantPermissionMessage, {
            permissionPromptType: PermissionPromptType.HttpPermissionRequest
          });
        }

        if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
          OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.SHOW_HTTP_PERMISSION_REQUEST, options, reply => {
            let {status, result} = reply.data;
            if (status === 'resolve') {
              resolve(result);
            } else {
              reject(result);
            }
          });
        } else {
          if (!MainHelper.isUsingHttpPermissionRequest()) {
            log.debug('Not showing HTTP permission request because its not enabled. Check init option httpPermissionRequest.');
            Event.trigger(OneSignal.EVENTS.TEST_INIT_OPTION_DISABLED);
            return;
          }

          // Default call by our SDK, not forced by user, don't show if the HTTP perm. req. was dismissed by user
          if (MainHelper.wasHttpsNativePromptDismissed()) {
            if (options._sdkCall === true) {
              // TODO: Throw an error; Postmam currently does not serialize errors across cross-domain messaging
              //       In the future, Postmam should serialize errors so we can throw a PermissionMessageDismissedError
              log.debug('The HTTP perm. req. permission was dismissed, so we are not showing the request.');
              return;
            } else {
              log.debug('The HTTP perm. req. was previously dismissed, but this call was made explicitly.');
            }
          }

          log.debug(`(${Environment.getEnv()}) Showing HTTP permission request.`);
          if (window.Notification.permission === "default") {
            OneSignal._showingHttpPermissionRequest = true;
            window.Notification.requestPermission(permission => {
              OneSignal._showingHttpPermissionRequest = false;
              resolve(permission);
              log.debug('HTTP Permission Request Result:', permission);
              if (permission === 'default') {
                TestHelper.markHttpsNativePromptDismissed();
                OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, {
                  permission: permission,
                  forceUpdatePermission: true
                });
              }
            });
            Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
          } else {
            Event.trigger(OneSignal.EVENTS.TEST_WOULD_DISPLAY);
            throw new InvalidStateError(InvalidStateReason.PushPermissionAlreadyGranted);
          }
        }
      }));
  }

  /**
   * Returns a promise that resolves to the browser's current notification permission as 'default', 'granted', or 'denied'.
   * @param callback A callback function that will be called when the browser's current notification permission has been obtained, with one of 'default', 'granted', or 'denied'.
   * @PublicApi
   */
  static getNotificationPermission(onComplete?): Promise<NotificationPermission> {
    return awaitOneSignalInitAndSupported()
      .then(() => {
        let safariWebId = null;
        if (OneSignal.config) {
          safariWebId = OneSignal.config.safari_web_id;
        }
        return MainHelper.getNotificationPermission(safariWebId);
      })
      .then(permission => {
        if (onComplete) {
          onComplete(permission);
        }
        return permission;
      });
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
      log.info(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
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
      log.info(new InvalidArgumentError('tags', InvalidArgumentReason.Empty));
      return;
    }
    // Our backend considers false as removing a tag, so convert false -> "false" to allow storing as a value
    Object.keys(tags).forEach(key => {
      if (tags[key] === false)
        tags[key] = "false";
    });
    const { appId } = await Database.getAppConfig();
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
      log.info(new InvalidArgumentError('tags', InvalidArgumentReason.Empty));
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
    OneSignal.once(OneSignal.EVENTS.NOTIFICATION_CLICKED, notification => {
      executeCallback(callback, notification);
    });
    EventHelper.fireStoredNotificationClicks(OneSignal.config.pageUrl);
  }
  /**
   * @PublicApi
   * @Deprecated
   */
  static async getIdsAvailable(callback?: Action<{userId: Uuid, registrationId: string}>):
    Promise<{userId: Uuid, registrationId: string}> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('getIdsAvailable', callback);
    const { deviceId, pushToken } = await Database.getSubscription();
    const bundle = {
      userId: deviceId,
      registrationId: pushToken
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
    logMethodCall('isPushNotificationsEnabled', callback);
    const { deviceId, pushToken, optedOut } = await Database.getSubscription();
    const notificationPermission = await OneSignal.getNotificationPermission();
    const serviceWorkerActive = await ServiceWorkerHelper.isServiceWorkerActive();

    let isPushEnabled = false;

    if (Environment.supportsServiceWorkers() &&
        !SubscriptionHelper.isUsingSubscriptionWorkaround() &&
        !Environment.isIframe()) {
      isPushEnabled = !!(deviceId &&
                      pushToken &&
                      notificationPermission === NotificationPermission.Granted &&
                      !optedOut &&
                      serviceWorkerActive)
    } else {
      isPushEnabled = !!(deviceId &&
                         pushToken &&
                         notificationPermission === NotificationPermission.Granted &&
                         !optedOut)
    }

    executeCallback(callback, isPushEnabled);
    return isPushEnabled;
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
      log.info(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
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
   * Returns a promise that resolves to the stored OneSignal user ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal user ID.
   * @PublicApi
   */
  static async getUserId(callback?: Action<Uuid>): Promise<Uuid> {
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
    const pushToken = subscription.pushToken;
    executeCallback(callback, pushToken);
    return pushToken;
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
    if (!subscription.deviceId)
      throw new NotSubscribedError(NotSubscribedReason.NoDeviceId);
    if (!ValidatorUtils.isValidUrl(url))
      throw new InvalidArgumentError('url', InvalidArgumentReason.Malformed);
    if (!ValidatorUtils.isValidUrl(icon, { allowEmpty: true, requireHttps: true }))
      throw new InvalidArgumentError('icon', InvalidArgumentReason.Malformed);
    return await OneSignalApi.sendNotification(appConfig.appId, [subscription.deviceId], {'en': title}, {'en': message},
                                               url, icon, data, buttons);
  }

  /**
   * Used to load OneSignal asynchronously from a webpage.
   * @InternalApi
   */
  static push(item) {
    if (typeof(item) == "function")
      item();
    else {
      var functionName = item.shift();
      OneSignal[functionName].apply(null, item);
    }
  }

  static __doNotShowWelcomeNotification: boolean;
  static VERSION = __VERSION__;
  static _VERSION = __VERSION__;
  static _API_URL = API_URL;
  static _notificationOpenedCallbacks = [];
  static _idsAvailable_callback = [];
  static _defaultLaunchURL = null;
  static config = null;
  static _thisIsThePopup = false;
  static __isPopoverShowing = false;
  static _sessionInitAlreadyRunning = false;
  static _isNotificationEnabledCallback = [];
  static _subscriptionSet = true;
  static iframeUrl = null;
  static popupUrl = null;
  static modalUrl = null;
  static _sessionIframeAdded = false;
  static _windowWidth = 650;
  static _windowHeight = 568;
  static _isNewVisitor = false;
  static _channel = null;
  static cookie = Cookie;
  static initialized = false;
  static notifyButton = null;
  static store = LimitStore;
  static environment = Environment;
  static database = Database;
  static event = Event;
  static browser = Browser;
  static popover = null;
  static log = log;
  static swivel = swivel;
  static api = OneSignalApi;
  static indexedDb = IndexedDb;
  static iframePostmam = null;
  static popupPostmam = null;
  static mainHelper = MainHelper;
  static subscriptionHelper = SubscriptionHelper;
  static workerHelper = ServiceWorkerHelper;
  static httpHelper =  HttpHelper;
  static eventHelper = EventHelper;
  static initHelper = InitHelper;
  static testHelper = TestHelper;
  static objectAssign = objectAssign;
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
  static SERVICE_WORKER_PARAM = {scope: '/'};
  static _LOGGING = false;
  static LOGGING = false;
  static _usingNativePermissionHook = false;
  static _initCalled = false;
  static __initAlreadyCalled = false;
  static _thisIsTheModal: boolean;
  static modalPostmam: any;
  static httpPermissionRequestPostModal: any;
  static closeNotifications = ServiceWorkerHelper.closeNotifications;
  static isServiceWorkerActive = ServiceWorkerHelper.isServiceWorkerActive;
  static _showingHttpPermissionRequest = false;
  static checkAndWipeUserSubscription = SubscriptionHelper.checkAndWipeUserSubscription;


  /**
   * Used by Rails-side HTTP popup. Must keep the same name.
   * @InternalApi
   */
  static _initHttp = HttpHelper.initHttp;

  /**
   * Used by Rails-side HTTP popup. Must keep the same name.
   * @InternalApi
   */
  static _initPopup = HttpHelper.initPopup;

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
    BEGIN_BROWSING_SESSION: 'postmam.beginBrowsingSession',
    REQUEST_HOST_URL: 'postmam.requestHostUrl',
    SHOW_HTTP_PERMISSION_REQUEST: 'postmam.showHttpPermissionRequest',
    IS_SHOWING_HTTP_PERMISSION_REQUEST: 'postmam.isShowingHttpPermissionRequest',
    WINDOW_TIMEOUT: 'postmam.windowTimeout',
    FINISH_REMOTE_REGISTRATION: 'postmam.finishRemoteRegistration',
    FINISH_REMOTE_REGISTRATION_IN_PROGRESS: 'postmam.finishRemoteRegistrationInProgress',
    POPUP_BEGIN_MESSAGEPORT_COMMS: 'postmam.beginMessagePortComms'
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
    SDK_INITIALIZED: 'initialize',
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

  static NOTIFICATION_TYPES = {
    SUBSCRIBED: 1,
    UNSUBSCRIBED: -2
  };

  /** To appease TypeScript, EventEmitter later overrides this */
  static on(...args) {}
  static off(...args) {}
  static once(...args) {}
}

Object.defineProperty(OneSignal, 'LOGGING', {
  get: function() {
    return OneSignal._LOGGING;
  },
  set: function(logLevel) {
    if (logLevel) {
      log.setDefaultLevel((<any>log).levels.TRACE);
      OneSignal._LOGGING = true;
    }
    else {
      log.setDefaultLevel((<any>log).levels.WARN);
      OneSignal._LOGGING = false;
    }
  },
  enumerable: true,
  configurable: true
});

heir.merge(OneSignal, new EventEmitter());


if (OneSignal.LOGGING)
  log.setDefaultLevel((<any>log).levels.TRACE);
else
  log.setDefaultLevel((<any>log).levels.WARN);

log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION}, ${Environment.getEnv()} environment).`, getConsoleStyle('bold'));
if (Environment.isEs6DebuggingModule()) {
  log.warn('OneSignal: This is a specially built version of the web SDK for debugging ES6 async/await.');
}
log.debug(`Current Page URL: ${location.href}`);
log.debug(`Browser Environment: ${Browser.name} ${Browser.version}`);

module.exports = OneSignal;

