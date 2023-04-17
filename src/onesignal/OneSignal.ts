import bowser from "bowser";
import { EnvironmentInfoHelper } from "../page/helpers/EnvironmentInfoHelper";
import AltOriginManager from "../page/managers/AltOriginManager";
import ConfigManager from "../page/managers/ConfigManager";
import LegacyManager from "../page/managers/LegacyManager";
import Context from "../page/models/Context";
import { EnvironmentInfo } from "../page/models/EnvironmentInfo";
import ProxyFrame from "../page/modules/frames/ProxyFrame";
import ProxyFrameHost from "../page/modules/frames/ProxyFrameHost";
import SubscriptionModal from "../page/modules/frames/SubscriptionModal";
import SubscriptionModalHost from "../page/modules/frames/SubscriptionModalHost";
import SubscriptionPopup from "../page/modules/frames/SubscriptionPopup";
import SubscriptionPopupHost from "../page/modules/frames/SubscriptionPopupHost";
import TimedLocalStorage from "../page/modules/TimedLocalStorage";
import { ProcessOneSignalPushCalls } from "../page/utils/ProcessOneSignalPushCalls";
import { SdkInitError, SdkInitErrorKind } from "../shared/errors/SdkInitError";
import Environment from "../shared/helpers/Environment";
import EventHelper from "../shared/helpers/EventHelper";
import HttpHelper from "../shared/helpers/HttpHelper";
import InitHelper from "../shared/helpers/InitHelper";
import MainHelper from "../shared/helpers/MainHelper";
import Emitter from "../shared/libraries/Emitter";
import Log from "../shared/libraries/Log";
import SdkEnvironment from "../shared/managers/SdkEnvironment";
import { SessionManager } from "../shared/managers/sessionManager/SessionManager";
import { AppUserConfig, AppConfig } from "../shared/models/AppConfig";
import { DeviceRecord } from "../shared/models/DeviceRecord";
import { AppUserConfigNotifyButton } from "../shared/models/Prompts";
import { WindowEnvironmentKind } from "../shared/models/WindowEnvironmentKind";
import Database from "../shared/services/Database";
import OneSignalUtils from "../shared/utils/OneSignalUtils";
import { logMethodCall, getConsoleStyle } from "../shared/utils/utils";
import OneSignalEvent from "../shared/services/OneSignalEvent";
import NotificationsNamespace from "./NotificationsNamespace";
import CoreModule from "../core/CoreModule";
import { CoreModuleDirector } from "../core/CoreModuleDirector";
import UserNamespace from "./UserNamespace";
import SlidedownNamespace from "./SlidedownNamespace";
import LocalStorage from "../shared/utils/LocalStorage";
import LoginManager from "../page/managers/LoginManager";
import { SessionNamespace } from "./SessionNamespace";
import { OneSignalDeferredLoadedCallback } from "../page/models/OneSignalDeferredLoadedCallback";
import DebugNamespace from "./DebugNamesapce";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import { ONESIGNAL_EVENTS } from "./OneSignalEvents";

export default class OneSignal {
  static EVENTS = ONESIGNAL_EVENTS;

  private static async _initializeCoreModuleAndOSNamespaces() {
    const core = new CoreModule();
    await core.initPromise;
    OneSignal.coreDirector = new CoreModuleDirector(core);
    const subscription = await Database.getSubscription();
    const permission = await OneSignal.Notifications.getPermissionStatus();
    OneSignal.User = new UserNamespace(true, subscription, permission);
    this.Notifications = new NotificationsNamespace(permission);
  }

  private static async _initializeConfig(options: AppUserConfig) {
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
   * Login user
   * @PublicApi
   *
   * When logging in, we must set a new blank temporary user that will be able to hold potential changes following the
   * login call (e.g: addTag) while we wait for the result of the login call (in particular the final `onesignal_id`).
   *
   * After the call completes, we should fetch the user and hydrate the models with updated data.
   *
   * Finally, we should transfer the push subscription if the `externalId` already exists on the target login user.
   *
   *          anon -> identified   |   identified -> identified
   *          -------------------------------------------------
   *  success: fetch user data     |   fetch user data
   *                               |   transfer push subscription
   *                               |   merge users (v2)
   *          -------------------------------------------------
   *  failure: fetch user data     |   fetch user data
   *           transfer push sub   |   transfer push subscription
   *           merge users (v2)    |   merge users (v2)
   *
   * @param externalId - The external user ID to set
   * @param jwtToken - The JWT auth token to use when setting the external user ID
   */
  static async login(externalId: string, jwtToken?: string): Promise<void> {
    logMethodCall('login', { externalId, jwtToken });

    if (typeof externalId === 'undefined') {
      throw new InvalidArgumentError('externalId', InvalidArgumentReason.Empty);
    }

    if (typeof externalId !== 'string') {
      throw new InvalidArgumentError('externalId', InvalidArgumentReason.WrongType);
    }

    if (typeof token !== 'string') {
      throw new InvalidArgumentError('token', InvalidArgumentReason.WrongType);
    }

    LoginManager.login(externalId, jwtToken);
  }

  static async logout(): Promise<void> {
    logMethodCall('logout');
    LoginManager.logout();
  }

  /**
   * Initializes the SDK, called by the developer.
   * @PublicApi
   */
  static async init(options: AppUserConfig) {
    logMethodCall('init');

    LocalStorage.removeLegacySubscriptionOptions();

    await InitHelper.polyfillSafariFetch();
    InitHelper.errorIfInitAlreadyCalled();
    await OneSignal._initializeConfig(options);

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

    await OneSignal._initializeCoreModuleAndOSNamespaces();

    if (LocalStorage.getConsentRequired()) {
      const providedConsent = await Database.getConsentGiven();
      if (!providedConsent) {
        OneSignal.pendingInit = true;
        return;
      }
    }

    await OneSignal._delayedInit();
  }

  private static async _delayedInit(): Promise<void> {
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
  static async setConsentGiven(consent: boolean): Promise<void> {
    logMethodCall('setConsentGiven', { consent });

    if (typeof consent === 'undefined') {
      throw new InvalidArgumentError('consent', InvalidArgumentReason.Empty);
    }

    if (typeof consent !== 'boolean') {
      throw new InvalidArgumentError('consent', InvalidArgumentReason.WrongType);
    }

    await Database.setConsentGiven(consent);
    if (consent && OneSignal.pendingInit)
      await OneSignal._delayedInit();
  }

  static async setConsentRequired(requiresConsent: boolean): Promise<void> {
    logMethodCall('setConsentRequired', { requiresConsent });

    if (typeof requiresConsent === 'undefined') {
      throw new InvalidArgumentError('requiresConsent', InvalidArgumentReason.Empty);
    }

    if (typeof requiresConsent !== 'boolean') {
      throw new InvalidArgumentError('requiresConsent', InvalidArgumentReason.WrongType);
    }

    LocalStorage.setConsentRequired(requiresConsent);
  }

  /**
   * Used to load OneSignal asynchronously / deferred from a webpage
   * Allows asynchronous function queuing while the SDK loads in the browser with <script src="..." async or defer />
   * @PublicApi
   * @param item - A function to be executed if the browser supports the OneSignal SDK
   * @Example
   *  OneSignalDeferred.push(function(onesignal) { onesignal.functionName(param1, param2); });
   */
  static push(item: OneSignalDeferredLoadedCallback) {
    ProcessOneSignalPushCalls.processItem(OneSignal, item);
  }

  static __doNotShowWelcomeNotification: boolean;
  static VERSION = Environment.version();
  static _VERSION = Environment.version();
  static sdkEnvironment = SdkEnvironment;
  static environmentInfo?: EnvironmentInfo;
  static config: AppConfig | null = null;
  static _sessionInitAlreadyRunning = false;
  static _windowWidth = 650;
  static _windowHeight = 568;
  static _isNewVisitor = false;
  static _channel = null;
  static timedLocalStorage = TimedLocalStorage;
  static initialized = false;
  static _didLoadITILibrary = false;
  static notifyButton: AppUserConfigNotifyButton | null = null;
  static environment = Environment;
  static database = Database;
  static event = OneSignalEvent;
  private static pendingInit = true;

  static subscriptionPopup: SubscriptionPopup;
  static subscriptionPopupHost: SubscriptionPopupHost;
  static subscriptionModal: SubscriptionModal;
  static subscriptionModalHost: SubscriptionModalHost;
  static proxyFrameHost: ProxyFrameHost;
  static proxyFrame: ProxyFrame;
  static emitter: Emitter = new Emitter();
  static cache: any = {};
  static _LOGGING = false;
  static LOGGING = false;
  static _initCalled = false;
  static __initAlreadyCalled = false;
  static context: Context;
  static DeviceRecord = DeviceRecord;

  /* NEW USER MODEL CHANGES */
  static coreDirector: CoreModuleDirector;
  static Notifications = new NotificationsNamespace();
  static Slidedown = new SlidedownNamespace();
  static Session = new SessionNamespace();
  static User = new UserNamespace(false);
  static Debug = new DebugNamespace();
  /* END NEW USER MODEL CHANGES */

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
}

LegacyManager.ensureBackwardsCompatibility(OneSignal);

Log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION},
  ${SdkEnvironment.getWindowEnv().toString()} environment).`, getConsoleStyle('bold'));
Log.debug(`Current Page URL: ${typeof location === "undefined" ? "NodeJS" : location.href}`);
Log.debug(`Browser Environment: ${bowser.name} ${bowser.version}`);
