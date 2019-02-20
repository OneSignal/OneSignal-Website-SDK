import bowser from 'bowser';

import Event from '../Event';
import LimitStore from '../LimitStore';
import { NotificationPermission } from '../models/NotificationPermission';
import SdkEnvironment from '../managers/SdkEnvironment';
import { AppConfig } from '../models/AppConfig';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import SubscriptionModalHost from '../modules/frames/SubscriptionModalHost';
import Database from '../services/Database';
import { getConsoleStyle, once, triggerNotificationPermissionChanged } from '../utils';
import MainHelper from './MainHelper';
import SubscriptionHelper from './SubscriptionHelper';
import { SdkInitError, SdkInitErrorKind } from '../errors/SdkInitError';
import OneSignalApiShared from '../OneSignalApiShared';
import { ContextInterface } from '../models/Context';
import { WorkerMessengerCommand } from '../libraries/WorkerMessenger';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';
import { EmailDeviceRecord } from '../models/EmailDeviceRecord';
import { SubscriptionStrategyKind } from "../models/SubscriptionStrategyKind";
import { IntegrationKind } from '../models/IntegrationKind';
import { Subscription } from "../models/Subscription";
import ProxyFrameHost from '../modules/frames/ProxyFrameHost';
import Log from '../libraries/Log';
import Environment from '../Environment';
import Bell from '../bell/Bell';
import { CustomLink } from '../CustomLink';
import { ServiceWorkerManager } from "../managers/ServiceWorkerManager";
import SubscriptionPopupHost from "../modules/frames/SubscriptionPopupHost";
import { OneSignalUtils } from "../utils/OneSignalUtils";

declare var OneSignal: any;

export interface SessionInitOptions {
  modalPrompt?: boolean;
  __fromRegister?: boolean;
  __fromInit?: boolean;
  autoAccept?: boolean;
}

export default class InitHelper {
  static async storeInitialValues() {
    const isPushEnabled = await OneSignal.privateIsPushNotificationsEnabled();
    const notificationPermission = await OneSignal.privateGetNotificationPermission();
    const isOptedOut = await OneSignal.internalIsOptedOut();
    LimitStore.put('subscription.optedOut', isOptedOut);
    await Database.put('Options', { key: 'isPushEnabled', value: isPushEnabled });
    await Database.put('Options', {
      key: 'notificationPermission',
      value: notificationPermission
    });
  }

  /** Entry method for any environment that sets expiring subscriptions. */
  public static async processExpiringSubscriptions() {
    const context: ContextInterface = OneSignal.context;

    Log.debug("Checking subscription expiration...");
    const isSubscriptionExpiring = await context.subscriptionManager.isSubscriptionExpiring();
    if (!isSubscriptionExpiring) {
      Log.debug("Subscription is not considered expired.");
      return;
    }

    const integrationKind = await SdkEnvironment.getIntegration();
    const windowEnv = SdkEnvironment.getWindowEnv();

    Log.debug("Subscription is considered expiring. Current Integration:", integrationKind);
    switch (integrationKind) {
      /*
        Resubscribe via the service worker.

        For Secure, we can definitely resubscribe via the current page, but for SecureProxy, we
        used to not be able to subscribe for push within secure child frames. The common supported
        and safe way is to resubscribe via the service worker.
       */
      case IntegrationKind.Secure:
        const rawPushSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew);
        await context.subscriptionManager.registerSubscription(rawPushSubscription);
        break;
      case IntegrationKind.SecureProxy:
        if (windowEnv === WindowEnvironmentKind.OneSignalProxyFrame) {
          const newSubscription = await new Promise<Subscription>(resolve => {
            context.workerMessenger.once(WorkerMessengerCommand.SubscribeNew, subscription => {
              resolve(Subscription.deserialize(subscription));
            });
            context.workerMessenger.unicast(WorkerMessengerCommand.SubscribeNew, context.appConfig);
          });
          Log.debug("Finished registering brand new subscription:", newSubscription);
        } else {
          const proxyFrame: ProxyFrameHost = OneSignal.proxyFrameHost;
          await proxyFrame.runCommand(OneSignal.POSTMAM_COMMANDS.PROCESS_EXPIRING_SUBSCRIPTIONS);
        }
        break;
      case IntegrationKind.InsecureProxy:
        /*
          We can't really do anything here except remove a value checked by
          isPushNotificationsEnabled to simulate unsubscribing.
         */
        await Database.remove("Ids", "registrationId");
        Log.debug("Unsubscribed expiring HTTP subscription by removing registration ID.");
        break;
    }
  }

  /**
   * This event occurs after init.
   * For HTTPS sites, this event is called after init.
   * For HTTP sites, this event is called after the iFrame is created,
   *    and a message is received from the iFrame signaling cross-origin messaging is ready.
   * @private
   */
  static async onSdkInitialized() {
    const context: ContextInterface = OneSignal.context;

    // Store initial values of notification permission, user ID, and manual subscription status
    // This is done so that the values can be later compared to see if anything changed
    // This is done here for HTTPS, it is done after the call to _addSessionIframe in sessionInit for HTTP sites, since the iframe is needed for communication
    await InitHelper.storeInitialValues();
    await InitHelper.installNativePromptPermissionChangedHook();
    /*
      If the user has already granted permission, the user has previously
      already subscribed. Don't show welcome notifications if the user is
      automatically resubscribed.
    */
    if (await context.permissionManager.getNotificationPermission(context.appConfig.safariWebId) === NotificationPermission.Granted)
      OneSignal.__doNotShowWelcomeNotification = true;

    if (
      navigator.serviceWorker &&
      window.location.protocol === 'https:' &&
      !await SdkEnvironment.isFrameContextInsecure()
    ) {
      try {
        const registration = await ServiceWorkerManager.getRegistration();
        if (registration && registration.active)
          await context.serviceWorkerManager.establishServiceWorkerChannel();
      } catch (e) { 
        Log.error(e);
      }
    }

    await InitHelper.processExpiringSubscriptions();
    if (OneSignal.config.userConfig.promptOptions.autoPrompt && !OneSignalUtils.isUsingSubscriptionWorkaround()) {
      OneSignal.once("ON_SESSION", async () => {
        OneSignal.context.updateManager.sendOnSessionUpdate();
      });
    } else {
      OneSignal.context.updateManager.sendOnSessionUpdate();
    }
    await Promise.all([
      InitHelper.showNotifyButton(),
      InitHelper.showPromptsFromWebConfigEditor(),
      InitHelper.updateEmailSessionCount(),
      context.cookieSyncer.install(),
    ]);

    
    await Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC);
  }

  private static async showNotifyButton() {
    if (Environment.isBrowser() && !OneSignal.notifyButton) {
      OneSignal.config.userConfig.notifyButton = OneSignal.config.userConfig.notifyButton || {};
      if (OneSignal.config.userConfig.bell) {
        // If both bell and notifyButton, notifyButton's options take precedence
        OneSignal.config.userConfig.bell = {
          ...OneSignal.config.userConfig.bell,
          ...OneSignal.config.userConfig.notifyButton
        };
        OneSignal.config.userConfig.notifyButton = {
          ...OneSignal.config.userConfig.notifyButton,
          ...OneSignal.config.userConfig.bell
        };
      }

     const displayPredicate: () => boolean = OneSignal.config.userConfig.notifyButton.displayPredicate;
      if (displayPredicate && typeof displayPredicate === 'function') {
        const predicateValue = await Promise.resolve(OneSignal.config.userConfig.notifyButton.displayPredicate());
        if (predicateValue !== false) {
          OneSignal.notifyButton = new Bell(OneSignal.config.userConfig.notifyButton);
          OneSignal.notifyButton.create();
        } else {
          Log.debug('Notify button display predicate returned false so not showing the notify button.');
        }
      } else {
        OneSignal.notifyButton = new Bell(OneSignal.config.userConfig.notifyButton);
        OneSignal.notifyButton.create();
      }
    }
  }

  public static async updateEmailSessionCount() {
    const context: ContextInterface = OneSignal.context;
    /* Both HTTP and HTTPS pages can update email session by API request without origin/push feature restrictions */
    if (context.sessionManager.isFirstPageView()) {
      const emailProfile = await Database.getEmailProfile();
      if (emailProfile.emailId) {
        const emailDeviceRecord = new EmailDeviceRecord(emailProfile.emailAddress, emailProfile.emailAuthHash);
        emailDeviceRecord.appId = context.appConfig.appId;
        await OneSignalApiShared.updateUserSession(
          emailProfile.emailId,
          emailDeviceRecord
        );
      }
    }
  }

  private static async showPromptsFromWebConfigEditor() {
    const config: AppConfig = OneSignal.config;
    if (config.userConfig.promptOptions) {
      await CustomLink.initialize(config.userConfig.promptOptions.customlink);
    }
  }

  static async installNativePromptPermissionChangedHook() {
    if (navigator.permissions && !(bowser.firefox && Number(bowser.version) <= 45)) {
      OneSignal._usingNativePermissionHook = true;
      // If the browser natively supports hooking the subscription prompt permission change event,
      // use it instead of our SDK method
      const permissionStatus = await navigator.permissions.query({ name: 'notifications' });
      permissionStatus.onchange = function() {
        triggerNotificationPermissionChanged();
      };
    }
  }

  static async saveInitOptions() {
    let opPromises: Promise<any>[] = [];
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
    Log.debug('Called %cinternalInit()', getConsoleStyle('code'));

    const context: ContextInterface = OneSignal.context;

    // Always check for an updated service worker
    await context.serviceWorkerManager.updateWorker();

    context.sessionManager.incrementPageViewCount();

    if (document.visibilityState !== 'visible') {
      once(
        document,
        'visibilitychange',
        (_: any, destroyEventListener: Function) => {
          if (document.visibilityState === 'visible') {
            destroyEventListener();
            InitHelper.sessionInit({ __fromInit: true });
          }
        },
        true
      );
      return;
    }

    await InitHelper.sessionInit({ __fromInit: true });
  }

  // overridingPageTitle: Only for the HTTP Iframe, pass the page title in from the top frame
  static async initSaveState(overridingPageTitle: string) {
    const appId = await MainHelper.getAppId();
    await Database.put('Ids', { type: 'appId', id: appId });
    const initialPageTitle = overridingPageTitle || document.title || 'Notification';
    await Database.put('Options', { key: 'pageTitle', value: initialPageTitle });
    Log.info(`OneSignal: Set pageTitle to be '${initialPageTitle}'.`);
    const config: AppConfig = OneSignal.config;
    await Database.put('Options', { key: 'emailAuthRequired', value: !!config.emailAuthRequired })
  }

  private static async finishSessionInit(options: SessionInitOptions): Promise<void> {
    OneSignal._sessionInitAlreadyRunning = false;
    if (options.__fromInit) {
      await Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
    }
  }

  public static async handleAutoResubscribe(isOptedOut: boolean) {
    Log.info("handleAutoResubscribe", { autoResubscribe: OneSignal.config.userConfig.autoResubscribe, isOptedOut });
    if (OneSignal.config.userConfig.autoResubscribe && !isOptedOut) {
      const currentPermission: NotificationPermission =
        await OneSignal.context.permissionManager.getNotificationPermission(
          OneSignal.context.appConfig.safariWebId
        );
      if (currentPermission == NotificationPermission.Granted) {
        await SubscriptionHelper.registerForPush();
      }
    }
  }

  public static async sessionInit(options?: SessionInitOptions): Promise<void> {
    if (!options) {
      options = {} as SessionInitOptions;
    }

    Log.debug(`Called %csessionInit(${JSON.stringify(options)})`, getConsoleStyle('code'));

    if (OneSignal._sessionInitAlreadyRunning) {
      Log.debug('Returning from sessionInit because it has already been called.');
      return;
    }

    OneSignal._sessionInitAlreadyRunning = true;

    const appId: string = OneSignal.context.appConfig.appId;
    if (options.__fromRegister && options.modalPrompt) {
      /* Show the HTTPS fullscreen modal permission message. */
      OneSignal.subscriptionModalHost = new SubscriptionModalHost(appId, options);
      await OneSignal.subscriptionModalHost.load();
      await InitHelper.finishSessionInit(options);
      return;
    }

    /* We don't want to resubscribe if the user is opted out, and we can't check on HTTP, because the promise will
    prevent the popup from opening. */
    const isOptedOut = await OneSignal.internalIsOptedOut();

    // TODO: can we check if user's already subscribed as well?

    // from init
    if (options.__fromInit) {
      await InitHelper.finishSessionInit(options);

      // Autoresubscribe is working only on HTTPS
      // Should be called before autoprompting to make sure user gets a chance to be re-subscribed first.
      if (!OneSignalUtils.isUsingSubscriptionWorkaround()) {
        await InitHelper.handleAutoResubscribe(isOptedOut);
      }

      const isSubscribed = await OneSignal.privateIsPushNotificationsEnabled();
      if (OneSignal.config.userConfig.promptOptions.autoPrompt && !isOptedOut && !isSubscribed) {
        /*
        * Chrome 63 on Android permission prompts are permanent without a dismiss option. To avoid
        * permanent blocks, we want to replace sites automatically showing the native browser request
        * with a slide prompt first.
        * Same for Safari 12.1+. It requires user interaction to request notification permissions.
        * It simply wouldn't work to try to show native prompt from script.
        */
        const showSlidedown =
          (
            (bowser.chrome && Number(bowser.version) >= 63 && (bowser.tablet || bowser.mobile)) ||
            (bowser.safari && Number(bowser.version) >= 12.1)
          );

        if (showSlidedown) {
          // TODO: check if force option is enough/needed
          OneSignal.config.userConfig.promptOptions.slidedown.enabled = true;
          OneSignal.context.promptsManager.internalShowSlidedownPrompt();
        } else {
          OneSignal.context.promptsManager.internalShowAutoPrompt();
        }
      }
    }

    // from register for push notifications
    if (options.__fromRegister) {
      await InitHelper.finishSessionInit(options);
      if (!isOptedOut) {
        if (bowser.safari && Number(bowser.version) >= 12.1) {
          await SubscriptionHelper.internalRegisterForPush(false);
        } else {
          await SubscriptionHelper.registerForPush();
        }
      }
    }
  }

  static async polyfillSafariFetch() {
    // If Safari - add 'fetch' pollyfill if it isn't already added.
    if (bowser.safari && typeof window.fetch == 'undefined') {
      Log.debug('Loading fetch polyfill for Safari..');
      try {
        await new DynamicResourceLoader().loadFetchPolyfill();
        Log.debug('Done loading fetch polyfill.');
      } catch (e) {
        Log.debug('Error loading fetch polyfill:', e);
      }
    }
  }

  static errorIfInitAlreadyCalled() {
    if (OneSignal._initCalled)
      throw new SdkInitError(SdkInitErrorKind.MultipleInitialization);
    OneSignal._initCalled = true;
  }

  public static async loadSubscriptionPopup(options?: any) {
    /**
     * Users may be subscribed to either .onesignal.com or .os.tc. By this time
     * that they are subscribing to the popup, the Proxy Frame has already been
     * loaded and the user's subscription status has been obtained. We can then
     * use the Proxy Frame present now and check its URL to see whether the user
     * is finally subscribed to .onesignal.com or .os.tc.
     */
    OneSignal.subscriptionPopupHost = new SubscriptionPopupHost(OneSignal.proxyFrameHost.url, options);
    await OneSignal.subscriptionPopupHost.load();
  }
}
