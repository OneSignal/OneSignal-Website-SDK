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
import { CoreModuleDirector } from "../../src/core/CoreModuleDirector";
import UserNamespace from "./UserNamespace";
import SlidedownNamespace from "./SlidedownNamespace";
import LocalStorage from "../shared/utils/LocalStorage";
import OneSignalError from "../shared/errors/OneSignalError";
import LoginManager from "../page/managers/LoginManager";
import { isCompleteSubscriptionObject } from "../core/utils/typePredicates";
import { SessionNamespace } from "./SessionNamespace";
import { OneSignalDeferredLoadedCallback } from "../page/models/OneSignalDeferredLoadedCallback";

export default class OneSignal {
  private static async _initializeCoreModuleAndUserNamespace() {
    const core = new CoreModule();
    OneSignal.coreDirector = new CoreModuleDirector(core);
    OneSignal.User = new UserNamespace(OneSignal.coreDirector);
    await OneSignal.User.userLoaded;
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
   * @param token - The JWT auth token to use when setting the external user ID
   */
  static async login(externalId: string, token?: string): Promise<void> {
    logMethodCall('login', { externalId, token });

    try {
      if (token) {
        await Database.setJWTToken(token);
      }

      const identityModel = await this.coreDirector.getIdentityModel();

      if (!identityModel) {
        throw new OneSignalError('Login: No identity model found');
      }

      const currentExternalId = identityModel?.data?.external_id;

      // if the current externalId is the same as the one we're trying to set, do nothing
      if (currentExternalId === externalId) {
        Log.debug('Login: External ID already set, skipping login');
        return;
      }

      const pushSubModel = await this.coreDirector.getCurrentPushSubscriptionModel();
      let currentPushSubscriptionId;

      if (pushSubModel && isCompleteSubscriptionObject(pushSubModel.data)) {
        currentPushSubscriptionId = pushSubModel.data.id;
      }

      const isIdentified = LoginManager.isIdentified(identityModel.data);

      // set the external id on the user locally
      LoginManager.setExternalId(identityModel, externalId);

      const userData = await UserDirector.getAllUserData();
      await this.coreDirector.resetUserWithSetting(true);

      LoginManager.identifyOrUpsertUser(userData, isIdentified, currentPushSubscriptionId).then(async result => {
        const { identity } = result;
        const onesignalId = identity?.onesignal_id;

        if (!onesignalId) {
          throw new OneSignalError('Login: No OneSignal ID found');
        }
        await LoginManager.fetchAndHydrate(onesignalId);
      })
      .catch(error => {
        throw new OneSignalError(`Login: Error while identifying or upserting user: ${error}`);
      });
    } catch (e) {
      Log.error(e);
      throw e;
    }
  }

  static async logout(): Promise<void> {
    logMethodCall('logout');
    await this.coreDirector.resetUserWithSetting(false);
  }

  /**
   * Initializes the SDK, called by the developer.
   * @PublicApi
   */
  static async init(options: AppUserConfig) {
    logMethodCall('init');

    await InitHelper.polyfillSafariFetch();
    InitHelper.errorIfInitAlreadyCalled();
    await OneSignal._initializeConfig(options);
    // TODO: move into delayedInit
    await OneSignal._initializeCoreModuleAndUserNamespace();

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

    if (OneSignal.config.userConfig.requiresUserPrivacyConsent || LocalStorage.getConsentRequired()) {
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
    await Database.setConsentGiven(consent);
    if (consent && OneSignal.pendingInit)
      await OneSignal._delayedInit();
  }

  static async setConsentRequired(requiresConsent: boolean): Promise<void> {
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

  /* NEW USER MODEL CHANGES */
  static coreDirector: CoreModuleDirector;
  static Notifications = new NotificationsNamespace();
  static Slidedown = new SlidedownNamespace();
  static Session = new SessionNamespace();
  static User: UserNamespace;
  /* END NEW USER MODEL CHANGES */

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
  static log = Log;
  private static pendingInit: boolean = true;

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
    NATIVE_PROMPT_PERMISSIONCHANGED: 'permissionChange',
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
    NOTIFICATION_WILL_DISPLAY: 'willDisplay',
    /**
     * Occurs when a notification is dismissed by the user either clicking 'X' or clearing all notifications
     * (available in Android). This event is NOT called if the user clicks the notification's body or any of the
     * action buttons.
     */
    NOTIFICATION_DISMISSED: 'dismiss',
    /**
     * New event replacing legacy addNotificationOpenedHandler(). Used when the notification was clicked.
     */
    NOTIFICATION_CLICKED: 'click',
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
