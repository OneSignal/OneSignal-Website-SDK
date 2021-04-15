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
import SubscriptionPopupHost from "../modules/frames/SubscriptionPopupHost";
import { OneSignalUtils } from "../utils/OneSignalUtils";
import { DeprecatedApiError, DeprecatedApiReason } from "../errors/DeprecatedApiError";
import LocalStorage from '../utils/LocalStorage';

declare var OneSignal: any;

export interface RegisterOptions extends SubscriptionPopupHostOptions {
  modalPrompt?: boolean;
  httpPermissionRequest?: boolean;
  slidedown?: boolean;
}

export default class InitHelper {
  /** Main methods */

  public static async internalInit() {
    Log.debug('Called %cinternalInit()', getConsoleStyle('code'));

    // Always check for an updated service worker
    await OneSignal.context.serviceWorkerManager.installWorker();

    const sessionManager = OneSignal.context.sessionManager;
    OneSignal.emitter.on(OneSignal.EVENTS.SESSION_STARTED,
      sessionManager.sendOnSessionUpdateFromPage.bind(sessionManager));
    OneSignal.context.pageViewManager.incrementPageViewCount();

    if (document.visibilityState !== 'visible') {
      InitHelper.postponeSessionInitUntilPageIsInFocus();
      return;
    }

    await InitHelper.sessionInit();
  }

  public static postponeSessionInitUntilPageIsInFocus(): void {
    once(
      document,
      'visibilitychange',
      (_: any, destroyEventListener: Function) => {
        if (document.visibilityState === 'visible') {
          destroyEventListener();
          InitHelper.sessionInit();
        }
      },
      true
    );
  }

  public static async sessionInit(): Promise<void> {
    Log.debug(`Called %csessionInit()`, getConsoleStyle('code'));

    if (OneSignal._sessionInitAlreadyRunning) {
      Log.debug('Returning from sessionInit because it has already been called.');
      return;
    }
    OneSignal._sessionInitAlreadyRunning = true;

    try {
      await InitHelper.doInitialize();
    } catch(err) {
      if (err instanceof SdkInitError) {
        return;
      }
      throw err;
    }

    /**
     * We don't want to resubscribe if the user is opted out, and we can't check on HTTP, because the promise will
     * prevent the popup from opening.
     */
    const isOptedOut = await OneSignal.internalIsOptedOut();
    // saves isOptedOut to localStorage. used for require user interaction functionality
    LocalStorage.setIsOptedOut(!!isOptedOut);

    /**
     * Auto-resubscribe is working only on HTTPS (and in safari)
     * Should be called before autoprompting to make sure user gets a chance to be re-subscribed first.
     */
    if (!OneSignalUtils.isUsingSubscriptionWorkaround()) {
      await InitHelper.handleAutoResubscribe(isOptedOut);
    }

    const isSubscribed = await OneSignal.privateIsPushNotificationsEnabled();
    // saves isSubscribed to localStorage. used for require user interaction functionality
    LocalStorage.setIsPushNotificationsEnabled(!!isSubscribed);

    if (OneSignal.config.userConfig.promptOptions.autoPrompt && !isOptedOut) {
      OneSignal.context.promptsManager.spawnAutoPrompts();
    }

    OneSignal._sessionInitAlreadyRunning = false;
    await Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  }

  public static async registerForPushNotifications(options: RegisterOptions = {}): Promise<void> {
    if (options && options.modalPrompt) {
      /* Show the HTTPS fullscreen modal permission message. */
      OneSignal.subscriptionModalHost = new SubscriptionModalHost(OneSignal.config.appId, options);
      await OneSignal.subscriptionModalHost.load();
      return;
    }

    if (OneSignalUtils.isUsingSubscriptionWorkaround()) {
      if (options.httpPermissionRequest) {
        /*
         * Do not throw an error because it may cause the parent event handler to
         * throw and stop processing the rest of their code. Typically, for this
         * prompt sequence, a custom modal is being shown thanking the user for
         * granting permissions. Throwing an error might cause the modal to stay
         * on screen and not close.
         *
         * Only log an error for HTTP sites. A few HTTPS sites are mistakenly be
         * using this API instead of the parameter-less version to register for
         * push notifications.
         */
        Log.error(new DeprecatedApiError(DeprecatedApiReason.HttpPermissionRequest));
        return;
      }
      await InitHelper.loadSubscriptionPopup(options);
      return;
    }

    /*
     * We don't want to resubscribe if the user is opted out, and we can't check on HTTP, because the promise will
     * prevent the popup from opening.
     */
    const isOptedOut = LocalStorage.getIsOptedOut();
    if (!isOptedOut) {
      await SubscriptionHelper.registerForPush();
    }
  }

  /**
   * This event occurs after init.
   * For HTTPS sites, this event is called after init.
   * For HTTP sites, this event is called after the iFrame is created,
   *    and a message is received from the iFrame signaling cross-origin messaging is ready.
   * @private
   */
  public static async onSdkInitialized() {
    const wasUserResubscribed: boolean = await InitHelper.processExpiringSubscriptions();

    /**
     * If user's subscription was expiring and we processed it, our backend would get a player#create request.
     * If user was not subscribed before and autoPrompting is on, user would get subscribed through player#create if
     *  he clicks allow in an automatic prompt.
     * If user has granted notification permissions but cleared the data and autoResubscribe is on, we will
     *  resubscribe with autoResubscribe flag.
     * In all other cases we would send an on_session request.
     */
    const isExistingUser: boolean = await OneSignal.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (isExistingUser) {
      OneSignal.context.sessionManager.setupSessionEventListeners();
      if (!wasUserResubscribed) {
        await OneSignal.context.updateManager.sendOnSessionUpdate();
      }
    } else if (
      !OneSignal.config.userConfig.promptOptions.autoPrompt &&
      !OneSignal.config.userConfig.autoResubscribe
    ) {
      await OneSignal.context.updateManager.sendOnSessionUpdate();
    }

    await Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC);
  }

  public static async loadSubscriptionPopup(options?: SubscriptionPopupHostOptions) {
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



  /** Helper methods */

  public static async storeInitialValues() {
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

  protected static async setWelcomeNotificationFlag(): Promise<void> {
    /*
     * If the user has already granted permission, the user has previously
     * already subscribed. Don't show welcome notifications if the user is
     * automatically resubscribed.
     */
    const permission: NotificationPermission =
      await OneSignal.context.permissionManager.getNotificationPermission(OneSignal.context.appConfig.safariWebId);
    if (permission === NotificationPermission.Granted) {
      OneSignal.__doNotShowWelcomeNotification = true;
    }
  }

  protected static async establishServiceWorkerChannel(): Promise<void> {
    if (
      navigator.serviceWorker &&
      window.location.protocol === 'https:' &&
      !await SdkEnvironment.isFrameContextInsecure()
    ) {
      try {
        await OneSignal.context.serviceWorkerManager.establishServiceWorkerChannel();
      } catch (e) { 
        Log.error(e);
      }
    }
  }

  /** Entry method for any environment that sets expiring subscriptions. */
  public static async processExpiringSubscriptions(): Promise<boolean> {
    const context: ContextInterface = OneSignal.context;

    Log.debug("Checking subscription expiration...");
    const isSubscriptionExpiring = await context.subscriptionManager.isSubscriptionExpiring();
    if (!isSubscriptionExpiring) {
      Log.debug("Subscription is not considered expired.");
      return false;
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
          await this.registerSubscriptionInProxyFrame(context);
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
    return true;
  }

  public static async registerSubscriptionInProxyFrame(context: ContextInterface): Promise<Subscription> {
    const newSubscription = await new Promise<Subscription>(resolve => {
      context.workerMessenger.once(WorkerMessengerCommand.SubscribeNew, subscription => {
        resolve(Subscription.deserialize(subscription));
      });
      context.workerMessenger.unicast(WorkerMessengerCommand.SubscribeNew, context.appConfig);
    });
    Log.debug("Finished registering brand new subscription:", newSubscription);
    return newSubscription;
  }

  public static async doInitialize(): Promise<void> {
    const promises: Promise<void>[] = [];

    // Store initial values of notification permission, user ID, and manual subscription status
    // This is done so that the values can be later compared to see if anything changed
    // This is done here for HTTPS, it is done after the call to _addSessionIframe in sessionInit for HTTP sites,
    // since the iframe is needed for communication
    promises.push(InitHelper.storeInitialValues());
    promises.push(InitHelper.installNativePromptPermissionChangedHook());
    promises.push(InitHelper.setWelcomeNotificationFlag());
    promises.push(InitHelper.establishServiceWorkerChannel());
    promises.push(InitHelper.showNotifyButton());
    promises.push(InitHelper.showPromptsFromWebConfigEditor());

    try {
      await Promise.all(promises);
    } catch(e) {
      Log.error(e);
      throw new SdkInitError(SdkInitErrorKind.Unknown);
    }
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
        OneSignal.emitter.once(OneSignal.EVENTS.SDK_INITIALIZED, async () => {
          const predicateValue = await Promise.resolve(OneSignal.config.userConfig.notifyButton.displayPredicate());
          if (predicateValue !== false) {
            OneSignal.notifyButton = new Bell(OneSignal.config.userConfig.notifyButton);
            OneSignal.notifyButton.create();
          } else {
            Log.debug('Notify button display predicate returned false so not showing the notify button.');
          }
        });
      } else {
        OneSignal.notifyButton = new Bell(OneSignal.config.userConfig.notifyButton);
        OneSignal.notifyButton.create();
      }
    }
  }

  public static async updateEmailSessionCount() {
    const context: ContextInterface = OneSignal.context;
    /* Both HTTP and HTTPS pages can update email session by API request without origin/push feature restrictions */
    if (context.pageViewManager.isFirstPageView()) {
      const emailProfile = await Database.getEmailProfile();
      if (emailProfile.playerId) {
        const emailDeviceRecord = new EmailDeviceRecord(emailProfile.identifier, emailProfile.identifierAuthHash);
        emailDeviceRecord.appId = context.appConfig.appId;
        await OneSignalApiShared.updateUserSession(
          emailProfile.playerId,
          emailDeviceRecord
        );
      }
    }
  }

  protected static async showPromptsFromWebConfigEditor() {
    const config: AppConfig = OneSignal.config;
    if (config.userConfig.promptOptions) {
      await CustomLink.initialize(config.userConfig.promptOptions.customlink);
    }
  }

  public static async installNativePromptPermissionChangedHook() {
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

  public static async saveInitOptions() {
    let opPromises: Promise<any>[] = [];

    const persistNotification = OneSignal.config.userConfig.persistNotification;
    opPromises.push(
      Database.put('Options', {
        key: 'persistNotification',
        value: persistNotification != null ? persistNotification : true
      })
    );

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

  public static async initSaveState(overridingPageTitle?: string) {
    const appId = await MainHelper.getAppId();
    const config: AppConfig = OneSignal.config;
    await Database.put('Ids', { type: 'appId', id: appId });
    const pageTitle: string =
      overridingPageTitle || config.siteName || document.title || 'Notification';
    await Database.put('Options', { key: 'pageTitle', value: pageTitle });
    Log.info(`OneSignal: Set pageTitle to be '${pageTitle}'.`);
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

  public static async polyfillSafariFetch() {
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

  public static errorIfInitAlreadyCalled() {
    if (OneSignal._initCalled)
      throw new SdkInitError(SdkInitErrorKind.MultipleInitialization);
    OneSignal._initCalled = true;
  }
}
