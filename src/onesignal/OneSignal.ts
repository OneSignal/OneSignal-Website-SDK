import { EnvironmentInfoHelper } from '../page/helpers/EnvironmentInfoHelper';
import ConfigManager from '../page/managers/ConfigManager';
import Context from '../page/models/Context';
import { EnvironmentInfo } from '../page/models/EnvironmentInfo';
import TimedLocalStorage from '../page/modules/TimedLocalStorage';
import { ProcessOneSignalPushCalls } from '../page/utils/ProcessOneSignalPushCalls';
import { SdkInitError, SdkInitErrorKind } from '../shared/errors/SdkInitError';
import Environment from '../shared/helpers/Environment';
import EventHelper from '../shared/helpers/EventHelper';
import InitHelper from '../shared/helpers/InitHelper';
import MainHelper from '../shared/helpers/MainHelper';
import Emitter from '../shared/libraries/Emitter';
import Log from '../shared/libraries/Log';
import SdkEnvironment from '../shared/managers/SdkEnvironment';
import { AppUserConfig, AppConfig } from '../shared/models/AppConfig';
import { DeviceRecord } from '../shared/models/DeviceRecord';
import { AppUserConfigNotifyButton } from '../shared/models/Prompts';
import Database from '../shared/services/Database';
import { logMethodCall } from '../shared/utils/utils';
import OneSignalEvent from '../shared/services/OneSignalEvent';
import NotificationsNamespace from './NotificationsNamespace';
import CoreModule from '../core/CoreModule';
import { CoreModuleDirector } from '../core/CoreModuleDirector';
import UserNamespace from './UserNamespace';
import SlidedownNamespace from './SlidedownNamespace';
import LocalStorage from '../shared/utils/LocalStorage';
import LoginManager from '../page/managers/LoginManager';
import { SessionNamespace } from './SessionNamespace';
import { OneSignalDeferredLoadedCallback } from '../page/models/OneSignalDeferredLoadedCallback';
import DebugNamespace from './DebugNamesapce';
import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../shared/errors/InvalidArgumentError';
import { ONESIGNAL_EVENTS } from './OneSignalEvents';
import { bowserCastle } from '../shared/utils/bowserCastle';

export default class OneSignal {
  static EVENTS = ONESIGNAL_EVENTS;

  private static async _initializeCoreModuleAndOSNamespaces() {
    const core = new CoreModule();
    await core.initPromise;
    OneSignal.coreDirector = new CoreModuleDirector(core);
    const subscription = await Database.getSubscription();
    const permission =
      await OneSignal.context.permissionManager.getPermissionStatus();
    OneSignal.User = new UserNamespace(true, subscription, permission);
    this.Notifications = new NotificationsNamespace(permission);
  }

  private static async _initializeConfig(options: AppUserConfig) {
    const appConfig = await new ConfigManager().getAppConfig(options);
    Log.debug('OneSignal: Final web app config:', appConfig);

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
      throw new InvalidArgumentError(
        'externalId',
        InvalidArgumentReason.WrongType,
      );
    }

    if (jwtToken !== undefined && typeof jwtToken !== 'string') {
      throw new InvalidArgumentError(
        'jwtToken',
        InvalidArgumentReason.WrongType,
      );
    }

    await LoginManager.login(externalId, jwtToken);
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
    Log.debug(
      `Browser Environment: ${bowserCastle().name} ${bowserCastle().version}`,
    );

    LocalStorage.removeLegacySubscriptionOptions();

    await InitHelper.polyfillSafariFetch();
    InitHelper.errorIfInitAlreadyCalled();
    await OneSignal._initializeConfig(options);

    if (!OneSignal.config) {
      throw new Error('OneSignal config not initialized!');
    }

    if (bowserCastle().name == 'safari' && !OneSignal.config.safariWebId) {
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
      if (OneSignal.__initAlreadyCalled) return;

      OneSignal.__initAlreadyCalled = true;

      OneSignal.emitter.on(
        OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING,
        EventHelper.onNotificationPermissionChange,
      );
      OneSignal.emitter.on(
        OneSignal.EVENTS.SUBSCRIPTION_CHANGED,
        EventHelper._onSubscriptionChanged,
      );
      OneSignal.emitter.on(
        OneSignal.EVENTS.SDK_INITIALIZED,
        InitHelper.onSdkInitialized,
      );

      window.addEventListener('focus', () => {
        // Checks if permission changed every time a user focuses on the page,
        //     since a user has to click out of and back on the page to check permissions
        MainHelper.checkAndTriggerNotificationPermissionChanged();
      });

      await InitHelper.initSaveState();
      await InitHelper.saveInitOptions();
      await InitHelper.internalInit();
    }

    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    )
      await __init();
    else {
      Log.debug(
        'OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
          ' initialization...',
      );
      window.addEventListener('DOMContentLoaded', () => {
        __init();
      });
      document.onreadystatechange = () => {
        if (
          document.readyState === 'complete' ||
          document.readyState === 'interactive'
        )
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
      throw new InvalidArgumentError(
        'consent',
        InvalidArgumentReason.WrongType,
      );
    }

    await Database.setConsentGiven(consent);
    if (consent && OneSignal.pendingInit) await OneSignal._delayedInit();
  }

  static async setConsentRequired(requiresConsent: boolean): Promise<void> {
    logMethodCall('setConsentRequired', { requiresConsent });

    if (typeof requiresConsent === 'undefined') {
      throw new InvalidArgumentError(
        'requiresConsent',
        InvalidArgumentReason.Empty,
      );
    }

    if (typeof requiresConsent !== 'boolean') {
      throw new InvalidArgumentError(
        'requiresConsent',
        InvalidArgumentReason.WrongType,
      );
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
  static _isNewVisitor = false;
  static timedLocalStorage = TimedLocalStorage;
  static initialized = false;
  static _didLoadITILibrary = false;
  static notifyButton: AppUserConfigNotifyButton | null = null;
  static environment = Environment;
  static database = Database;
  static event = OneSignalEvent;
  private static pendingInit = true;

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
}

Log.info(
  `OneSignal Web SDK loaded (version ${OneSignal._VERSION},
  ${SdkEnvironment.getWindowEnv().toString()} environment).`,
);
Log.debug(
  `Current Page URL: ${
    typeof location === 'undefined' ? 'NodeJS' : location.href
  }`,
);
