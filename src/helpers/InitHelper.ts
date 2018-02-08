import * as Browser from 'bowser';
import * as log from 'loglevel';
import * as objectAssign from 'object-assign';

import AlreadySubscribedError from '../errors/AlreadySubscribedError';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import PermissionMessageDismissedError from '../errors/PermissionMessageDismissedError';
import Event from '../Event';
import LimitStore from '../LimitStore';
import { NotificationPermission } from '../models/NotificationPermission';
import SdkEnvironment from '../managers/SdkEnvironment';
import { AppConfig, AppUserConfig } from '../models/AppConfig';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import SubscriptionModalHost from '../modules/frames/SubscriptionModalHost';
import Database from '../services/Database';
import { getConsoleStyle, once } from '../utils';
import EventHelper from './EventHelper';
import MainHelper from './MainHelper';
import SubscriptionHelper from './SubscriptionHelper';
import { SdkInitError, SdkInitErrorKind } from '../errors/SdkInitError';
import OneSignalApi from '../OneSignalApi';
import { Uuid } from '../models/Uuid';
import CookieSyncer from '../modules/CookieSyncer';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import Path from '../models/Path';
import Context from '../models/Context';
import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';
import { DeviceRecord } from '../models/DeviceRecord';
import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import { PushDeviceRecord } from '../models/PushDeviceRecord';
import { EmailDeviceRecord } from '../models/EmailDeviceRecord';

declare var OneSignal: any;

export default class InitHelper {
  static storeInitialValues() {
    return Promise.all([
      OneSignal.isPushNotificationsEnabled(),
      OneSignal.getNotificationPermission(),
      OneSignal.isOptedOut()
    ]).then(([isPushEnabled, notificationPermission, isOptedOut]) => {
      LimitStore.put('subscription.optedOut', isOptedOut);
      return Promise.all([
        Database.put('Options', { key: 'isPushEnabled', value: isPushEnabled }),
        Database.put('Options', {
          key: 'notificationPermission',
          value: notificationPermission
        })
      ]);
    });
  }

  /**
   * This event occurs after init.
   * For HTTPS sites, this event is called after init.
   * For HTTP sites, this event is called after the iFrame is created, and a message is received from the iFrame signaling cross-origin messaging is ready.
   * @private
   */
  static async onSdkInitialized() {
    // Store initial values of notification permission, user ID, and manual subscription status
    // This is done so that the values can be later compared to see if anything changed
    // This is done here for HTTPS, it is done after the call to _addSessionIframe in sessionInit for HTTP sites, since the iframe is needed for communication
    InitHelper.storeInitialValues();
    InitHelper.installNativePromptPermissionChangedHook();

    const context: Context = OneSignal.context;

    if (await OneSignal.getNotificationPermission() === NotificationPermission.Granted) {
      /*
        If the user has already granted permission, the user has previously
        already subscribed. Don't show welcome notifications if the user is
        automatically resubscribed.
      */
      OneSignal.__doNotShowWelcomeNotification = true;
    }

    if (
      navigator.serviceWorker &&
      window.location.protocol === 'https:' &&
      !await SubscriptionHelper.hasInsecureParentOrigin()
    ) {
      navigator.serviceWorker
        .getRegistration()
        .then(registration => {
          if (registration && registration.active) {
            MainHelper.establishServiceWorkerChannel();
          }
        })
        .catch(e => {
          if (e.code === 9) {
            // Only secure origins are allowed
            if (
              location.protocol === 'http:' ||
              SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalProxyFrame
            ) {
              // This site is an HTTP site with an <iframe>
              // We can no longer register service workers since Chrome 42
              log.debug(`Expected error getting service worker registration on ${location.href}:`, e);
            }
          } else {
            log.error(`Error getting Service Worker registration on ${location.href}:`, e);
          }
        });
    }

    MainHelper.showNotifyButton();

    if (Browser.safari && OneSignal.config.userConfig.autoRegister === false) {
      OneSignal.isPushNotificationsEnabled(enabled => {
        if (enabled) {
          /*  The user is on Safari and *specifically* set autoRegister to false.
           The normal case for a user on Safari is to not set anything related to autoRegister.
           With autoRegister false, we don't automatically show the permission prompt on Safari.
           However, if push notifications are already enabled, we're actually going to make the same
           subscribe call and register the device token, because this will return the same device
           token and allow us to update the user's session count and last active.
           For sites that omit autoRegister, autoRegister is assumed to be true. For Safari, the session count
           and last active is updated from this registration call.
           */
          InitHelper.sessionInit({ __sdkCall: true });
        }
      });
    }

    if (SubscriptionHelper.isUsingSubscriptionWorkaround() && context.sessionManager.isFirstPageView()) {
      /*
       The user is on an HTTP site and they accessed this site by opening a new window or tab (starting a new
       session). This means we should increment their session_count and last_active by calling
       registerWithOneSignal(). Without this call, the user's session and last_active is not updated. We only
       do this if the user is actually registered with OneSignal though.
       */
      log.debug(`(${SdkEnvironment.getWindowEnv().toString()}) Updating session info for HTTP site.`);
      const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
      if (isPushEnabled) {
        const context: Context = OneSignal.context;
        const { deviceId } = await Database.getSubscription();
        OneSignalApi.updateUserSession(deviceId, new PushDeviceRecord(null));
      }
    }

    InitHelper.updateEmailSessionCount();

    OneSignal.context.cookieSyncer.install();

    InitHelper.showPromptsFromWebConfigEditor();
  }

  public static async updateEmailSessionCount() {
    const context: Context = OneSignal.context;
    /* Both HTTP and HTTPS pages can update email session by API request without origin/push feature restrictions */
    if (context.sessionManager.isFirstPageView()) {
      const emailProfile = await Database.getEmailProfile();
      if (emailProfile.emailId && emailProfile.emailId.value) {
        OneSignalApi.updateUserSession(emailProfile.emailId, new EmailDeviceRecord(null));
      }
    }
  }

  private static async showPromptsFromWebConfigEditor() {
    const config: AppConfig = OneSignal.config;
    if (!(await OneSignal.isPushNotificationsEnabled()) &&
      config.userConfig.promptOptions &&
      config.userConfig.promptOptions.slidedown &&
      config.userConfig.promptOptions.slidedown.autoPrompt &&
      !(await OneSignal.isOptedOut())) {
      OneSignal.showHttpPrompt();
    }
  }

  static installNativePromptPermissionChangedHook() {
    if (navigator.permissions && !(Browser.firefox && Number(Browser.version) <= 45)) {
      OneSignal._usingNativePermissionHook = true;
      // If the browser natively supports hooking the subscription prompt permission change event
      //     use it instead of our SDK method
      navigator.permissions.query({ name: 'notifications' }).then(function(permissionStatus) {
        permissionStatus.onchange = function() {
          EventHelper.triggerNotificationPermissionChanged();
        };
      });
    }
  }

  static saveInitOptions() {
    let opPromises = [];
    if (OneSignal.config.userConfig.persistNotification === false) {
      opPromises.push(Database.put('Options', { key: 'persistNotification', value: false }));
    } else {
      if (OneSignal.config.userConfig.persistNotification === true) {
        opPromises.push(Database.put('Options', { key: 'persistNotification', value: 'force' }));
      } else {
        opPromises.push(Database.put('Options', { key: 'persistNotification', value: true }));
      }
    }

    let webhookOptions = OneSignal.config.userConfig.webhooks;
    ['notification.displayed', 'notification.clicked', 'notification.dismissed'].forEach(event => {
      if (webhookOptions && webhookOptions[event]) {
        opPromises.push(Database.put('Options', { key: `webhooks.${event}`, value: webhookOptions[event] }));
      } else {
        opPromises.push(Database.put('Options', { key: `webhooks.${event}`, value: false }));
      }
    });
    if (webhookOptions && webhookOptions.cors) {
      opPromises.push(Database.put('Options', { key: `webhooks.cors`, value: true }));
    } else {
      opPromises.push(Database.put('Options', { key: `webhooks.cors`, value: false }));
    }

    if (OneSignal.config.userConfig.notificationClickHandlerMatch) {
      opPromises.push(
        Database.put('Options', {
          key: 'notificationClickHandlerMatch',
          value: OneSignal.config.userConfig.notificationClickHandlerMatch
        })
      );
    } else {
      opPromises.push(Database.put('Options', { key: 'notificationClickHandlerMatch', value: 'exact' }));
    }

    if (OneSignal.config.userConfig.notificationClickHandlerAction) {
      opPromises.push(
        Database.put('Options', {
          key: 'notificationClickHandlerAction',
          value: OneSignal.config.userConfig.notificationClickHandlerAction
        })
      );
    } else {
      opPromises.push(Database.put('Options', { key: 'notificationClickHandlerAction', value: 'navigate' }));
    }
    return Promise.all(opPromises);
  }

  static async internalInit() {
    log.debug('Called %cinternalInit()', getConsoleStyle('code'));

    const context: Context = OneSignal.context;

    // Always check for an updated service worker
    context.serviceWorkerManager.updateWorker();

    context.sessionManager.incrementPageViewCount();

    // HTTPS - Only register for push notifications once per session or if the user changes notification permission to Ask or Allow.
    if (
      sessionStorage.getItem('ONE_SIGNAL_SESSION') &&
      !SubscriptionHelper.isUsingSubscriptionWorkaround() &&
      (window.Notification.permission == 'denied' ||
        sessionStorage.getItem('ONE_SIGNAL_NOTIFICATION_PERMISSION') == window.Notification.permission)
    ) {
      Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
      return;
    }

    sessionStorage.setItem('ONE_SIGNAL_NOTIFICATION_PERMISSION', window.Notification.permission);

    if (Browser.safari && OneSignal.config.userConfig.autoRegister === false) {
      log.debug('On Safari and autoregister is false, skipping sessionInit().');
      // This *seems* to trigger on either Safari's autoregister false or Chrome HTTP
      // Chrome HTTP gets an SDK_INITIALIZED event from the iFrame postMessage, so don't call it here
      if (!SubscriptionHelper.isUsingSubscriptionWorkaround()) {
        Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
      }
      return;
    }

    if (OneSignal.config.userConfig.autoRegister === false && !OneSignal.config.subdomain) {
      log.debug('Skipping internal init. Not auto-registering and no subdomain.');
      /* 3/25: If a user is already registered, re-register them in case the clicked Blocked and then Allow (which immediately invalidates the GCM token as soon as you click Blocked) */
      Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
      const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
      if (isPushEnabled && !SubscriptionHelper.isUsingSubscriptionWorkaround()) {
        log.info(
          'Because the user is already subscribed and has enabled notifications, we will re-register their GCM token.'
        );
        // Resubscribes them, and in case their GCM registration token was invalid, gets a new one
        SubscriptionHelper.registerForPush();
      }
      return;
    }

    if (document.visibilityState !== 'visible') {
      once(
        document,
        'visibilitychange',
        (_, destroyEventListener) => {
          if (document.visibilityState === 'visible') {
            destroyEventListener();
            InitHelper.sessionInit({ __sdkCall: true });
          }
        },
        true
      );
      return;
    }

    InitHelper.sessionInit({ __sdkCall: true });
  }

  // overridingPageTitle: Only for the HTTP Iframe, pass the page title in from the top frame
  static async initSaveState(overridingPageTitle: string) {
    const appId = await MainHelper.getAppId();
    await Database.put('Ids', { type: 'appId', id: appId.value });
    const initialPageTitle = overridingPageTitle || document.title || 'Notification';
    await Database.put('Options', { key: 'pageTitle', value: initialPageTitle });
    log.info(`OneSignal: Set pageTitle to be '${initialPageTitle}'.`);
    const config: AppConfig = OneSignal.config;
    await Database.put('Options', { key: 'emailAuthRequired', value: !!config.emailAuthRequired })
  }

  static sessionInit(options) {
    const appConfig: AppConfig = OneSignal.context.appConfig;

    log.debug(`Called %csessionInit(${JSON.stringify(options)})`, getConsoleStyle('code'));
    if (OneSignal._sessionInitAlreadyRunning) {
      log.debug('Returning from sessionInit because it has already been called.');
      return;
    } else {
      OneSignal._sessionInitAlreadyRunning = true;
    }

    if (options.modalPrompt && options.fromRegisterFor) {
      /*
        Show the HTTPS fullscreen modal permission message.
       */
      OneSignal.subscriptionModalHost = new SubscriptionModalHost(appConfig.appId, options);
      OneSignal.subscriptionModalHost.load();
    } else if (!SubscriptionHelper.isUsingSubscriptionWorkaround()) {
      /*
        Show HTTPS modal prompt.
       */
      if (options.__sdkCall && MainHelper.wasHttpsNativePromptDismissed()) {
        log.debug('OneSignal: Not automatically showing native HTTPS prompt because the user previously dismissed it.');
        OneSignal._sessionInitAlreadyRunning = false;
      } else {
        /* We don't want to resubscribe if the user is opted out, and we can't check on HTTP, because the promise will
        prevent the popup from opening. */
        if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
          SubscriptionHelper.registerForPush();
        } else {
          OneSignal.isOptedOut().then(isOptedOut => {
            if (!isOptedOut) {
             /*
              * Chrome 63 on Android permission prompts are permanent without a dismiss option. To avoid
              * permanent blocks, we want to replace sites automatically showing the native browser request
              * with a slide prompt first.
              */
              if (
                (
                  !options ||
                  options && !options.fromRegisterFor
                ) &&
                Browser.chrome &&
                Number(Browser.version) >= 63 &&
                (Browser.tablet || Browser.mobile)
                ) {
                OneSignal.showHttpPrompt();
              } else {
               SubscriptionHelper.registerForPush();
              }
            } else {
              OneSignal._sessionInitAlreadyRunning = false;
            }
          });
        }
      }
    } else {
      if (OneSignal.config.userConfig.autoRegister !== true) {
        log.debug('OneSignal: Not automatically showing popover because autoRegister is not specifically true.');
      }
      if (MainHelper.isHttpPromptAlreadyShown()) {
        log.debug('OneSignal: Not automatically showing popover because it was previously shown in the same session.');
      }
      if (OneSignal.config.userConfig.autoRegister === true && !MainHelper.isHttpPromptAlreadyShown()) {
        OneSignal.showHttpPrompt().catch(e => {
          if (
            (e instanceof InvalidStateError &&
              (e as any).reason === InvalidStateReason[InvalidStateReason.RedundantPermissionMessage]) ||
            e instanceof PermissionMessageDismissedError ||
            e instanceof AlreadySubscribedError ||
            e instanceof PushPermissionNotGrantedError
          ) {
            log.debug('[Prompt Not Showing]', e);
            // Another prompt is being shown, that's okay
          } else log.info(e);
        });
      }
      OneSignal._sessionInitAlreadyRunning = false;
    }

    Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  }

  static async ponyfillSafariFetch() {
    // If Safari - add 'fetch' pollyfill if it isn't already added.
    if (Browser.safari && typeof window.fetch == 'undefined') {
      log.debug('Loading fetch polyfill for Safari..');
      try {
        await new DynamicResourceLoader().loadFetchPolyfill();
        log.debug('Done loading fetch polyfill.');
      } catch (e) {
        log.debug('Error loading fetch polyfill:', e);
      }
    }
  }

  static async errorIfInitAlreadyCalled() {
    if (OneSignal._initCalled) {
      throw new SdkInitError(SdkInitErrorKind.MultipleInitialization);
    }
    OneSignal._initCalled = true;
  }
}
