import type Bell from 'src/page/bell/Bell';
import { getAppConfig } from 'src/shared/config/app';
import type { AppConfig, AppUserConfig } from 'src/shared/config/types';
import { db } from 'src/shared/database/client';
import {
  getConsentGiven,
  isConsentRequiredButNotGiven,
} from 'src/shared/database/config';
import { getSubscription } from 'src/shared/database/subscription';
import { windowEnvString } from 'src/shared/environment/detect';
import {
  EmptyArgumentError,
  MissingSafariWebIdError,
  WrongTypeArgumentError,
} from 'src/shared/errors/common';
import {
  errorIfInitAlreadyCalled,
  initSaveState,
  internalInit,
  onSdkInitialized,
  saveInitOptions,
} from 'src/shared/helpers/init';
import {
  getConsentRequired,
  setConsentRequired as setStorageConsentRequired,
} from 'src/shared/helpers/localStorage';
import { checkAndTriggerNotificationPermissionChanged } from 'src/shared/helpers/main';
import { debug, info, warn } from 'src/shared/libraries/log';
import {
  _onSubscriptionChanged,
  checkAndTriggerSubscriptionChanged,
} from 'src/shared/listeners';
import { Browser } from 'src/shared/useragent/constants';
import { getBrowserName, getBrowserVersion } from 'src/shared/useragent/detect';
import { VERSION } from 'src/shared/utils/env';
import { logMethodCall } from 'src/shared/utils/utils';
import CoreModule from '../core/CoreModule';
import { CoreModuleDirector } from '../core/CoreModuleDirector';
import LoginManager from '../page/managers/LoginManager';
import Context from '../page/models/Context';
import type { OneSignalDeferredLoadedCallback } from '../page/models/OneSignalDeferredLoadedCallback';
import Emitter from '../shared/libraries/Emitter';
import DebugNamespace from './DebugNamesapce';
import NotificationsNamespace from './NotificationsNamespace';
import { SessionNamespace } from './SessionNamespace';
import SlidedownNamespace from './SlidedownNamespace';
import UserNamespace from './UserNamespace';

export default class OneSignal {
  static _consentGiven = false;

  private static async _initializeCoreModuleAndOSNamespaces() {
    const core = new CoreModule();
    await core._init();
    OneSignal._coreDirector = new CoreModuleDirector(core);
    const subscription = await getSubscription();
    const permission =
      await OneSignal._context._permissionManager._getPermissionStatus();
    OneSignal.User = new UserNamespace(true, subscription, permission);
    this.Notifications = new NotificationsNamespace(permission);
  }

  private static async _initializeConfig(options: AppUserConfig) {
    const appConfig = await getAppConfig(options);

    debug('OneSignal: Final web app config:', appConfig);

    // Workaround to temp assign config so that it can be used in context.
    OneSignal.config = appConfig;
    OneSignal._context = new Context(appConfig);
    OneSignal.config = OneSignal._context._appConfig;
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
    if (isConsentRequiredButNotGiven()) return;

    if (typeof externalId === 'undefined') {
      throw EmptyArgumentError('externalId');
    }

    if (typeof externalId !== 'string') {
      throw WrongTypeArgumentError('externalId');
    }

    if (jwtToken !== undefined && typeof jwtToken !== 'string') {
      throw WrongTypeArgumentError('jwtToken');
    }

    await LoginManager.login(externalId, jwtToken);
  }

  static async logout(): Promise<void> {
    logMethodCall('logout');
    if (isConsentRequiredButNotGiven()) return;
    await LoginManager.logout();
  }

  /**
   * Initializes the SDK, called by the developer.
   * @PublicApi
   */
  static async init(options: AppUserConfig) {
    logMethodCall('init');
    debug(`Browser Environment: ${getBrowserName()} ${getBrowserVersion()}`);

    errorIfInitAlreadyCalled();
    await OneSignal._initializeConfig(options);
    if (!OneSignal.config) {
      throw new Error('OneSignal config not initialized!');
    }

    if (getBrowserName() === Browser._Safari && !OneSignal.config.safariWebId) {
      /**
       * Don't throw an error for missing Safari config; many users set up
       * support on Chrome/Firefox and don't intend to support Safari but don't
       * place conditional initialization checks.
       */
      warn(MissingSafariWebIdError);
      return;
    }

    await OneSignal._initializeCoreModuleAndOSNamespaces();

    OneSignal._consentGiven = await getConsentGiven();
    if (getConsentRequired()) {
      if (!OneSignal._consentGiven) {
        OneSignal._pendingInit = true;
        return;
      }
    }

    await OneSignal._delayedInit();
  }

  private static async _delayedInit(): Promise<void> {
    OneSignal._pendingInit = false;
    // Ignore Promise as doesn't return until the service worker becomes active.
    OneSignal._context._workerMessenger._listen();

    async function __init() {
      if (OneSignal._initAlreadyCalled) return;

      OneSignal._initAlreadyCalled = true;

      OneSignal._emitter.on(
        'permissionChangeAsString',
        checkAndTriggerSubscriptionChanged,
      );
      OneSignal._emitter.on('change', _onSubscriptionChanged);
      OneSignal._emitter.on('initializeInternal', onSdkInitialized);

      window.addEventListener('focus', () => {
        // Checks if permission changed every time a user focuses on the page,
        //     since a user has to click out of and back on the page to check permissions
        checkAndTriggerNotificationPermissionChanged();
      });

      await initSaveState();
      await saveInitOptions();
      await internalInit();
    }

    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    )
      await __init();
    else {
      debug(
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
      throw EmptyArgumentError('consent');
    }

    if (typeof consent !== 'boolean') {
      throw WrongTypeArgumentError('consent');
    }

    // for quick access as to not wait for async operations / loading from DB
    OneSignal._consentGiven = consent;
    await db.put('Options', { key: 'userConsent', value: consent });

    if (consent && OneSignal._pendingInit) await OneSignal._delayedInit();
  }

  static async setConsentRequired(requiresConsent: boolean): Promise<void> {
    logMethodCall('setConsentRequired', { requiresConsent });

    if (typeof requiresConsent === 'undefined') {
      throw EmptyArgumentError('requiresConsent');
    }

    if (typeof requiresConsent !== 'boolean') {
      throw WrongTypeArgumentError('requiresConsent');
    }

    setStorageConsentRequired(requiresConsent);
  }

  /**
   * Used to load OneSignal asynchronously / deferred from a webpage
   * Allows asynchronous function queuing while the SDK loads in the browser with <script src="..." async or defer />
   * @PublicApi
   * @param item - A function to be executed if the browser supports the OneSignal SDK
   * @Example
   *  OneSignalDeferred.push(function(onesignal) { onesignal.functionName(param1, param2); });
   */
  static async push(item: OneSignalDeferredLoadedCallback) {
    return processItem(OneSignal, item);
  }

  static _doNotShowWelcomeNotification: boolean;
  static config: AppConfig | null = null;
  static _sessionInitAlreadyRunning = false;
  static _isNewVisitor = false;
  static _initialized = false;
  static _didLoadITILibrary = false;
  static _notifyButton: Bell | null = null;
  private static _pendingInit = true;

  static _emitter: Emitter = new Emitter();
  static _cache: any = {};
  static _initCalled = false;
  static _initAlreadyCalled = false;
  static _context: Context;

  /* NEW USER MODEL CHANGES */
  static _coreDirector: CoreModuleDirector;

  static Notifications = new NotificationsNamespace();
  static Slidedown = new SlidedownNamespace();
  static Session = new SessionNamespace();
  static User = new UserNamespace(false);
  static Debug = new DebugNamespace();
  /* END NEW USER MODEL CHANGES */
}

function processItem(
  oneSignalInstance: typeof OneSignal,
  item: OneSignalDeferredLoadedCallback,
) {
  if (typeof item === 'function') return item(oneSignalInstance);
  else {
    throw new Error('Callback is not a function');
  }
}

info(
  `OneSignal Web SDK loaded (version ${VERSION},
  ${windowEnvString} environment).`,
);
debug(
  `Current Page URL: ${
    typeof location === 'undefined' ? 'NodeJS' : location.href
  }`,
);
