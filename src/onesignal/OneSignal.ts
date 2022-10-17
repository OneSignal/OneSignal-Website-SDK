import bowser from "bowser";
import { EnvironmentInfoHelper } from "../page/helpers/EnvironmentInfoHelper";
import AltOriginManager from "../page/managers/AltOriginManager";
import ConfigManager from "../page/managers/ConfigManager";
import LegacyManager from "../page/managers/LegacyManager";
import Context from "../page/models/Context";
import { EnvironmentInfo } from "../page/models/EnvironmentInfo";
import { SecondaryChannelDeviceRecord } from "../shared/models/SecondaryChannelDeviceRecord";
import ProxyFrame from "../page/modules/frames/ProxyFrame";
import ProxyFrameHost from "../page/modules/frames/ProxyFrameHost";
import SubscriptionModal from "../page/modules/frames/SubscriptionModal";
import SubscriptionModalHost from "../page/modules/frames/SubscriptionModalHost";
import SubscriptionPopup from "../page/modules/frames/SubscriptionPopup";
import SubscriptionPopupHost from "../page/modules/frames/SubscriptionPopupHost";
import TimedLocalStorage from "../page/modules/TimedLocalStorage";
import Slidedown from "../page/slidedown/Slidedown";
import { ProcessOneSignalPushCalls } from "../page/utils/ProcessOneSignalPushCalls";
import OneSignalApi from "../shared/api/OneSignalApi";
import { SdkInitError, SdkInitErrorKind } from "../shared/errors/SdkInitError";
import Environment from "../shared/helpers/Environment";
import EventHelper from "../shared/helpers/EventHelper";
import HttpHelper from "../shared/helpers/HttpHelper";
import InitHelper from "../shared/helpers/InitHelper";
import MainHelper from "../shared/helpers/MainHelper";
import OutcomesHelper from "../shared/helpers/OutcomesHelper";
import SubscriptionHelper from "../shared/helpers/SubscriptionHelper";
import Emitter, { EventHandler } from "../shared/libraries/Emitter";
import Log from "../shared/libraries/Log";
import SdkEnvironment from "../shared/managers/SdkEnvironment";
import { SessionManager } from "../shared/managers/sessionManager/SessionManager";
import { AppUserConfig, AppConfig } from "../shared/models/AppConfig";
import { DeviceRecord } from "../shared/models/DeviceRecord";
import { NotificationPermission } from "../shared/models/NotificationPermission";
import { OutcomeAttributionType } from "../shared/models/Outcomes";
import { AppUserConfigNotifyButton } from "../shared/models/Prompts";
import { WindowEnvironmentKind } from "../shared/models/WindowEnvironmentKind";
import Database from "../shared/services/Database";
import IndexedDb from "../shared/services/IndexedDb";
import LimitStore from "../shared/services/LimitStore";
import OneSignalUtils from "../shared/utils/OneSignalUtils";
import { logMethodCall, getConsoleStyle } from "../shared/utils/utils";
import OneSignalEvent from "../shared/services/OneSignalEvent";
import NotificationsNamespace from "./NotificationsNamespace";
import CoreModule from "../../src/core/CoreModule";
import { CoreModuleDirector } from "../../src/core/CoreModuleDirector";
import UserNamespace from "./UserNamespace";
import SlidedownNamespace from "./SlidedownNamespace";
import LocalStorage from "../shared/utils/LocalStorage";

export default class OneSignal {
  static async initializeCoreModuleAndUserNamespace() {
    const core = new CoreModule();
    OneSignal.coreDirector = new CoreModuleDirector(core);
    OneSignal.user = new UserNamespace(OneSignal.coreDirector);
    await OneSignal.user.userLoaded;
  }

  static async initializeConfig(options: AppUserConfig) {
    const appConfig = await new ConfigManager().getAppConfig(options);
    Log.debug(`OneSignal: Final web app config: %c${JSON.stringify(appConfig, null, 4)}`, getConsoleStyle('code'));

    // TODO: environmentInfo is explicitly dependent on existence of OneSignal.config. Needs refactor.
    // Workaround to temp assign config so that it can be used in context.
    OneSignal.config = appConfig;
    OneSignal.environmentInfo = EnvironmentInfoHelper.getEnvironmentInfo();

    OneSignal.context = new Context(appConfig);
    OneSignal.config = OneSignal.context.appConfig;
  }

  /**
   * Initializes the SDK, called by the developer.
   * @PublicApi
   */
  static async init(options: AppUserConfig) {
    logMethodCall('init');

    await InitHelper.polyfillSafariFetch();
    InitHelper.errorIfInitAlreadyCalled();
    await OneSignal.initializeConfig(options);
    await OneSignal.initializeCoreModuleAndUserNamespace();

    if (!OneSignal.config) {
      throw new Error("OneSignal config not initialized!");
    }

    if (bowser.safari && !OneSignal.config.safariWebId) {
      /**
       * Don't throw an error for missing Safari config; many users set up
       * support on Chrome/Firefox and don't intend to support Safari but don't
       * place conditional initialization checks.
       */
      Log.warn(new SdkInitError(SdkInitErrorKind.MissingSafariWebId));
      return;
    }

    if (OneSignal.config.userConfig.requiresUserPrivacyConsent || LocalStorage.getRequiresPrivacyConsent()) {
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

      OneSignal.__initAlreadyCalled = true;

      OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED,
        EventHelper.onNotificationPermissionChange);
      OneSignal.emitter.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, EventHelper._onSubscriptionChanged);
      OneSignal.emitter.on(OneSignal.EVENTS.SDK_INITIALIZED, InitHelper.onSdkInitialized);

      if (OneSignalUtils.isUsingSubscriptionWorkaround()) {
        /**
         * The user may have forgot to choose a subdomain in his web app setup.
         *
         * Or, the user may have an HTTP & HTTPS site while using an HTTPS-only
         * config on both variants. This would cause the HTTPS site to work
         * perfectly, while causing errors and preventing web push from working
         * on the HTTP site.
         */
        if (!OneSignal.config || !OneSignal.config.subdomain)
          throw new SdkInitError(SdkInitErrorKind.MissingSubdomain);

        /**
         * We'll need to set up page activity tracking events on the main page but we can do so
         * only after the main initialization in the iframe is successful and a new session
         * is initiated.
         */
        OneSignal.emitter.on(
          OneSignal.EVENTS.SESSION_STARTED, SessionManager.setupSessionEventListenersForHttp
        );

        /**
         * The iFrame may never load (e.g. OneSignal might be down), in which
         * case the rest of the SDK's initialization will be blocked. This is a
         * good thing! We don't want to access IndexedDb before we know which
         * origin to store data on.
         */
        OneSignal.proxyFrameHost = await AltOriginManager.discoverAltOrigin(OneSignal.config);
      }

      window.addEventListener('focus', () => {
        // Checks if permission changed every time a user focuses on the page,
        //     since a user has to click out of and back on the page to check permissions
        MainHelper.checkAndTriggerNotificationPermissionChanged();
      });

      await InitHelper.initSaveState();
      await InitHelper.saveInitOptions();
      if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.CustomIframe)
        await OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
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
   * Call after user accepts your user consent agreement
   * @PublicApi
   */
  static async setPrivacyConsent(consent: boolean): Promise<void> {
    await Database.setProvideUserConsent(consent);
    if (consent && OneSignal.pendingInit)
      await OneSignal.delayedInit();
  }

  static async getPrivacyConsent(): Promise<boolean> {
    return await Database.getProvideUserConsent();
  }

  static async setRequiresPrivacyConsent(requiresConsent: boolean): Promise<void> {
    LocalStorage.setRequiresPrivacyConsent(requiresConsent);
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
    if (OneSignal.config) {
      EventHelper.fireStoredNotificationClicks(OneSignal.config.pageUrl || OneSignal.config.userConfig.pageUrl);
    }
  }

  /**
   * Returns a promise that resolves to true if all required conditions
   * for push messaging are met; otherwise resolves to false.
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
   * Returns a promise that resolves once the manual subscription override has been set.
   * @private
   * @PendingPublicApi
   */
  static async optOut(doOptOut: boolean, callback?: Action<void>): Promise<void> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('optOut', doOptOut, callback);
    if (!ValidatorUtils.isValidBoolean(doOptOut))
      throw new InvalidArgumentError('doOptOut', InvalidArgumentReason.Malformed);
    await OneSignal.notifications.disable(!doOptOut);
    executeCallback(callback);
  }

  /**
   * Returns a promise that resolves to the stored OneSignal email ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal email ID.
   * @PublicApi
   */
  static async getEmailId(callback?: Action<string | undefined>): Promise<string | null | undefined> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('getEmailId', callback);
    const emailProfile = await Database.getEmailProfile();
    const emailId = emailProfile.subscriptionId;
    executeCallback(callback, emailId);
    return emailId;
  }

    /**
   * Returns a promise that resolves to the stored OneSignal SMS ID if one is set; otherwise undefined.
   * @param callback A function accepting one parameter for the OneSignal SMS ID.
   * @PublicApi
   */
     static async getSMSId(callback?: Action<string | undefined>): Promise<string | null | undefined> {
      await awaitOneSignalInitAndSupported();
      logMethodCall('getSMSId', callback);
      const profile = await Database.getSMSProfile();
      const { subscriptionId } = profile;
      executeCallback(callback, subscriptionId);
      return subscriptionId;
    }

  /**
   * Returns a promise that resolves to the stored OneSignal user ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal user ID.
   * @PublicApi
   */
  static async getUserId(callback?: Action<string | undefined | null>): Promise<string | undefined | null> {
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
  static async getRegistrationId(callback?: Action<string | undefined | null>):
    Promise<string | undefined | null> {
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

  // TO DO: consider renaming to something like privateGetOptedStatus
  static async privateGetSubscription(callback?: Action<boolean>): Promise<boolean> {
    logMethodCall('getSubscription', callback);
    const subscription = await Database.getSubscription();
    const subscriptionStatus = !subscription.optedOut;
    executeCallback(callback, subscriptionStatus);
    return subscriptionStatus;
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
  static push(item: Function | object[]) {
    ProcessOneSignalPushCalls.processItem(OneSignal, item);
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
   * Used to un-subscribe from OneSignal events such as "subscriptionChange"
   * @param event - Event name to un-subscribe from
   * @param listener - Event listener to remove from the collection for a specified event
   * @PublicApi
   */
  static off(event: string, listener: EventHandler): Emitter {
    return this.emitter.off(event, listener);
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

  public static async sendOutcome(outcomeName: string, outcomeWeight?: number | undefined): Promise<void> {
    const config = OneSignal.config!.userConfig.outcomes;
    if (!config) {
      Log.error(`Could not send ${outcomeName}. No outcomes config found.`);
      return;
    }

    const outcomesHelper = new OutcomesHelper(OneSignal.config!.appId, config, outcomeName, false);
    if (typeof outcomeWeight !== "undefined" && typeof outcomeWeight !== "number") {
      Log.error("Outcome weight can only be a number if present.");
      return;
    }

    if (!await outcomesHelper.beforeOutcomeSend()) {
      return;
    }

    const outcomeAttribution = await outcomesHelper.getAttribution();

    await outcomesHelper.send({
      type: outcomeAttribution.type,
      notificationIds: outcomeAttribution.notificationIds,
      weight: outcomeWeight
    });
  }

  public static async sendUniqueOutcome(outcomeName: string): Promise<void> {
    const config = OneSignal.config!.userConfig.outcomes;
    if (!config) {
      Log.error(`Could not send ${outcomeName}. No outcomes config found.`);
      return;
    }

    const outcomesHelper = new OutcomesHelper(OneSignal.config!.appId, config, outcomeName, true);

    if (!await outcomesHelper.beforeOutcomeSend()) {
      return;
    }
    const outcomeAttribution = await outcomesHelper.getAttribution();

    if (outcomeAttribution.type === OutcomeAttributionType.NotSupported) {
      Log.warn("You are on a free plan. Please upgrade to use this functionality.");
      return;
    }

    // all notifs in attribution window
    const { notificationIds } = outcomeAttribution;
    // only new notifs that ought to be attributed
    const newNotifsToAttributeWithOutcome = await outcomesHelper.getNotifsToAttributeWithUniqueOutcome(notificationIds);

    if(!outcomesHelper.shouldSendUnique(outcomeAttribution, newNotifsToAttributeWithOutcome)) {
      Log.warn(`'${outcomeName}' was already reported for all notifications.`);
      return;
    }

    await outcomesHelper.send({
      type: outcomeAttribution.type,
      notificationIds: newNotifsToAttributeWithOutcome,
    });
  }

  /* NEW USER MODEL CHANGES */
  static coreDirector: CoreModuleDirector;
  static notifications = new NotificationsNamespace();
  static slidedown = new SlidedownNamespace();
  static user : UserNamespace;
  /* END NEW USER MODEL CHANGES */

  static __doNotShowWelcomeNotification: boolean;
  static VERSION = Environment.version();
  static _VERSION = Environment.version();
  static sdkEnvironment = SdkEnvironment;
  static environmentInfo?: EnvironmentInfo;
  static _notificationOpenedCallbacks = [];
  static _idsAvailable_callback = [];
  static _defaultLaunchURL = null;
  static config: AppConfig | null = null;
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
  static _didLoadITILibrary = false;
  static notifyButton: AppUserConfigNotifyButton | null = null;
  static store = LimitStore;
  static environment = Environment;
  static database = Database;
  static event = OneSignalEvent;
  static browser = bowser;
  static slidedown: Slidedown | null = null;
  static log = Log;
  static api = OneSignalApi;
  static indexedDb = IndexedDb;
  static mainHelper = MainHelper;
  static subscriptionHelper = SubscriptionHelper;
  static httpHelper =  HttpHelper;
  static eventHelper = EventHelper;
  static initHelper = InitHelper;
  private static pendingInit: boolean = true;

  static subscriptionPopup: SubscriptionPopup;
  static subscriptionPopupHost: SubscriptionPopupHost;
  static subscriptionModal: SubscriptionModal;
  static subscriptionModalHost: SubscriptionModalHost;
  static proxyFrameHost: ProxyFrameHost;
  static proxyFrame: ProxyFrame;
  static emitter: Emitter = new Emitter();
  static cache: any = {};

  /**
   * The additional path to the worker file.
   *
   * Usually just the filename (in case the file is named differently), but also supports cases where the folder
   * is different.
   *
   * However, the init options 'path' should be used to specify the folder path instead since service workers will not
   * auto-update correctly on HTTPS site load if the config init options 'path' is not set.
   */
  static SERVICE_WORKER_PATH = 'OneSignalSDKWorker.js';

  /**
   * By default, the service worker is expected to be accessible at the root scope. If the service worker is only
   * available with in a sub-directory, SERVICE_WORKER_PARAM must be changed to the sub-directory (with a trailing
   * slash). This would allow pages to function correctly as not to block the service worker ready call, which would
   * hang indefinitely if we requested root scope registration but the service was only available in a child scope.
   */
  static SERVICE_WORKER_PARAM: { scope: string } = { scope: '/' };
  static _LOGGING = false;
  static LOGGING = false;
  static _initCalled = false;
  static __initAlreadyCalled = false;
  static context: Context;
  static checkAndWipeUserSubscription = function () { };
  static DeviceRecord = DeviceRecord;
  static SecondaryChannelDeviceRecord = SecondaryChannelDeviceRecord;

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
    REMOTE_DATABASE_GET_ALL: 'postmam.remoteDatabaseGetAll',
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
    SESSION_UPSERT: 'postmam.sessionUpsert',
    SESSION_DEACTIVATE: 'postmam.sessionDeactivate',
    ARE_YOU_VISIBLE_REQUEST: 'postmam.areYouVisibleRequest',
    ARE_YOU_VISIBLE_RESPONSE: 'postmam.areYouVisibleResponse',
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
     * Occurs when the email subscription changes
     */
    EMAIL_SUBSCRIPTION_CHANGED: 'emailSubscriptionChanged',
    /**
     * Occurs when the SMS subscription changes
     */
    SMS_SUBSCRIPTION_CHANGED: 'smsSubscriptionChanged',
    /**
     * For internal testing only. Used for all sorts of things.
     */
    TEST_INIT_OPTION_DISABLED: 'testInitOptionDisabled',
    TEST_WOULD_DISPLAY: 'testWouldDisplay',
    TEST_FINISHED_ALLOW_CLICK_HANDLING: 'testFinishedAllowClickHandling',
    POPUP_WINDOW_TIMEOUT: 'popupWindowTimeout',
    SESSION_STARTED: "os.sessionStarted",
  };
}

LegacyManager.ensureBackwardsCompatibility(OneSignal);

Log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION},
  ${SdkEnvironment.getWindowEnv().toString()} environment).`, getConsoleStyle('bold'));
Log.debug(`Current Page URL: ${typeof location === "undefined" ? "NodeJS" : location.href}`);
Log.debug(`Browser Environment: ${bowser.name} ${bowser.version}`);
