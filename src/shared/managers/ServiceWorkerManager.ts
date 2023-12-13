import Environment from '../helpers/Environment';
import { WorkerMessengerCommand } from '../libraries/WorkerMessenger';
import Path from '../models/Path';
import SdkEnvironment from './SdkEnvironment';
import Database from '../services/Database';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import Log from '../libraries/Log';
import OneSignalEvent from '../services/OneSignalEvent';
import ServiceWorkerRegistrationError from '../errors/ServiceWorkerRegistrationError';
import OneSignalUtils from '../utils/OneSignalUtils';
import ServiceWorkerHelper, {
  ServiceWorkerActiveState,
  ServiceWorkerManagerConfig,
} from '../helpers/ServiceWorkerHelper';
import { ContextSWInterface } from '../models/ContextSW';
import { Utils } from '../context/Utils';
import {
  PageVisibilityRequest,
  PageVisibilityResponse,
} from '../models/Session';
import ServiceWorkerUtilHelper from '../../sw/helpers/ServiceWorkerUtilHelper';
import {
  NotificationClickEventInternal,
  NotificationForegroundWillDisplayEvent,
  NotificationForegroundWillDisplayEventSerializable,
} from '../models/NotificationEvent';
import EventHelper from '../helpers/EventHelper';

export class ServiceWorkerManager {
  private context: ContextSWInterface;
  private readonly config: ServiceWorkerManagerConfig;

  constructor(context: ContextSWInterface, config: ServiceWorkerManagerConfig) {
    this.context = context;
    this.config = config;
  }

  // Gets details on the OneSignal service-worker (if any)
  public async getRegistration(): Promise<
    ServiceWorkerRegistration | null | undefined
  > {
    return await ServiceWorkerUtilHelper.getRegistration(
      this.config.registrationOptions.scope,
    );
  }

  public async getActiveState(): Promise<ServiceWorkerActiveState> {
    const workerRegistration =
      await this.context.serviceWorkerManager.getRegistration();
    if (!workerRegistration) {
      return ServiceWorkerActiveState.None;
    }

    // We are now; 1. Getting the filename of the SW; 2. Checking if it is ours or a 3rd parties.
    const swFileName =
      ServiceWorkerManager.activeSwFileName(workerRegistration);
    const workerState = this.swActiveStateByFileName(swFileName);
    return workerState;
  }

  // Get the file name of the active ServiceWorker
  private static activeSwFileName(
    workerRegistration: ServiceWorkerRegistration,
  ): string | null | undefined {
    const serviceWorker =
      ServiceWorkerUtilHelper.getAvailableServiceWorker(workerRegistration);
    if (!serviceWorker) {
      return null;
    }

    const workerScriptPath = new URL(serviceWorker.scriptURL).pathname;
    const swFileName = new Path(workerScriptPath).getFileName();

    // If the current service worker is Akamai's
    if (swFileName == 'akam-sw.js') {
      // Check if its importing a ServiceWorker under it's "othersw" query param
      const searchParams = new URLSearchParams(
        new URL(serviceWorker.scriptURL).search,
      );
      const importedSw = searchParams.get('othersw');
      if (importedSw) {
        Log.debug(
          "Found a ServiceWorker under Akamai's akam-sw.js?othersw=",
          importedSw,
        );
        return new Path(new URL(importedSw).pathname).getFileName();
      }
    }
    return swFileName;
  }

  // Check if the ServiceWorker file name is ours or a third party's
  private swActiveStateByFileName(
    fileName?: string | null,
  ): ServiceWorkerActiveState {
    if (!fileName) {
      return ServiceWorkerActiveState.None;
    }
    const isValidOSWorker =
      fileName == this.config.workerPath.getFileName() ||
      fileName == 'OneSignalSDK.sw.js'; // For backwards compatibility with temporary v16 user model beta filename (remove after 5/5/24 deprecation)

    if (isValidOSWorker) {
      return ServiceWorkerActiveState.OneSignalWorker;
    }
    return ServiceWorkerActiveState.ThirdParty;
  }

  public async getWorkerVersion(): Promise<number> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<number>(async (resolve) => {
      this.context.workerMessenger.once(
        WorkerMessengerCommand.WorkerVersion,
        (workerVersion) => {
          resolve(workerVersion);
        },
      );
      await this.context.workerMessenger.unicast(
        WorkerMessengerCommand.WorkerVersion,
      );
    });
  }

  // Returns false if the OneSignal service worker can't be installed
  // or is already installed and doesn't need updating.
  private async shouldInstallWorker(): Promise<boolean> {
    // 1. Does the browser support ServiceWorkers?
    if (!Environment.supportsServiceWorkers()) return false;

    // 2. Is OneSignal initialized?
    if (!OneSignal.config) return false;

    // 3. Is a OneSignal ServiceWorker not installed now?
    // If not and notification permissions are enabled we should install.
    // This prevents an unnecessary install of the OneSignal worker which saves bandwidth
    const workerState = await this.getActiveState();
    Log.debug('[shouldInstallWorker] workerState', workerState);
    if (
      workerState === ServiceWorkerActiveState.None ||
      workerState === ServiceWorkerActiveState.ThirdParty
    ) {
      const permission =
        await OneSignal.context.permissionManager.getNotificationPermission(
          OneSignal.config!.safariWebId,
        );
      const notificationsEnabled = permission === 'granted';
      if (notificationsEnabled) {
        Log.info(
          '[shouldInstallWorker] Notification Permissions enabled, will install ServiceWorker',
        );
      }
      return notificationsEnabled;
    }

    // 4. We have a OneSignal ServiceWorker installed, but did the path or scope of the ServiceWorker change?
    if (await this.haveParamsChanged()) {
      return true;
    }

    // 5. We have a OneSignal ServiceWorker installed, is there an update?
    return this.workerNeedsUpdate();
  }

  private async haveParamsChanged(): Promise<boolean> {
    // 1. No workerRegistration
    const workerRegistration =
      await this.context.serviceWorkerManager.getRegistration();
    if (!workerRegistration) {
      Log.info(
        '[changedServiceWorkerParams] workerRegistration not found at scope',
        this.config.registrationOptions.scope,
      );
      return true;
    }

    // 2. Different scope
    const existingSwScope = new URL(workerRegistration.scope).pathname;
    const configuredSwScope = this.config.registrationOptions.scope;
    if (existingSwScope != configuredSwScope) {
      Log.info('[changedServiceWorkerParams] ServiceWorker scope changing', {
        a_old: existingSwScope,
        b_new: configuredSwScope,
      });
      return true;
    }

    // 3. Different href?, asking if (path + filename + queryParams) is different
    const availableWorker =
      ServiceWorkerUtilHelper.getAvailableServiceWorker(workerRegistration);
    const serviceWorkerHref = ServiceWorkerHelper.getServiceWorkerHref(
      this.config,
      this.context.appConfig.appId,
      Environment.version(),
    );
    // 3.1 If we can't get a scriptURL assume it is different
    if (!availableWorker?.scriptURL) {
      return true;
    }
    // 3.2 If the new serviceWorkerHref (page-env SDK version as query param) is different than existing worker URL
    if (serviceWorkerHref !== availableWorker.scriptURL) {
      Log.info('[changedServiceWorkerParams] ServiceWorker href changing:', {
        a_old: availableWorker?.scriptURL,
        b_new: serviceWorkerHref,
      });
      return true;
    }

    return false;
  }

  /**
   * Performs a service worker update by swapping out the current service worker
   * with a content-identical but differently named alternate service worker
   * file.
   */
  private async workerNeedsUpdate(): Promise<boolean> {
    Log.info('[Service Worker Update] Checking service worker version...');
    let workerVersion: number;
    try {
      workerVersion = await Utils.timeoutPromise(
        this.getWorkerVersion(),
        2_000,
      );
    } catch (e) {
      Log.info(
        '[Service Worker Update] Worker did not reply to version query; assuming older version and updating.',
      );
      return true;
    }

    if (workerVersion !== Environment.version()) {
      Log.info(
        `[Service Worker Update] Updating service worker from ${workerVersion} --> ${Environment.version()}.`,
      );
      return true;
    }

    Log.info(
      `[Service Worker Update] Service worker version is current at ${workerVersion} (no update required).`,
    );
    return false;
  }

  public async establishServiceWorkerChannel() {
    Log.debug('establishServiceWorkerChannel');
    const workerMessenger = this.context.workerMessenger;
    workerMessenger.off();

    workerMessenger.on(
      WorkerMessengerCommand.NotificationWillDisplay,
      async (event: NotificationForegroundWillDisplayEventSerializable) => {
        Log.debug(
          location.origin,
          'Received notification display event from service worker.',
        );
        const publicEvent: NotificationForegroundWillDisplayEvent = {
          notification: event.notification,
          preventDefault: function (): void {
            throw new Error('Browser does not support preventing display.');
          },
        };
        await OneSignalEvent.trigger(
          OneSignal.EVENTS.NOTIFICATION_WILL_DISPLAY,
          publicEvent,
        );
      },
    );

    workerMessenger.on(
      WorkerMessengerCommand.NotificationClicked,
      async (event: NotificationClickEventInternal) => {
        const clickedListenerCallbackCount =
          OneSignal.emitter.numberOfListeners(
            OneSignal.EVENTS.NOTIFICATION_CLICKED,
          );

        if (clickedListenerCallbackCount === 0) {
          /*
          A site's page can be open but not listening to the
          notification.clicked event because it didn't call
          addListenerForNotificationOpened(). In this case, if there are no
          detected event listeners, we should save the event, instead of firing
          it without anybody receiving it.

          Or, since addListenerForNotificationOpened() only works once (you have
          to call it again each time), maybe it was only called once and the
          user isn't receiving the notification.clicked event for subsequent
          notifications on the same browser tab.

          Example: notificationClickHandlerMatch: 'origin', tab is clicked,
                   event fires without anybody listening, calling
                   addListenerForNotificationOpened() returns no results even
                   though a notification was just clicked.
        */
          Log.debug(
            'notification.clicked event received, but no event listeners; storing event in IndexedDb for later retrieval.',
          );
          /* For empty notifications without a URL, use the current document's URL */
          let url = event.result.url;
          if (!url) {
            // Least likely to modify, since modifying this property changes the page's URL
            url = location.href;
          }
          await Database.putNotificationClickedEventPendingUrlOpening(event);
        } else {
          await EventHelper.triggerNotificationClick(event);
        }
      },
    );

    workerMessenger.on(
      WorkerMessengerCommand.NotificationDismissed,
      async (data) => {
        await OneSignalEvent.trigger(
          OneSignal.EVENTS.NOTIFICATION_DISMISSED,
          data,
        );
      },
    );

    const isSafari = OneSignalUtils.isSafari();

    workerMessenger.on(
      WorkerMessengerCommand.AreYouVisible,
      async (incomingPayload: PageVisibilityRequest) => {
        // For https sites in Chrome and Firefox service worker (SW) can get correct value directly.
        // For Safari, unfortunately, we need this messaging workaround because SW always gets false.
        if (isSafari) {
          const payload: PageVisibilityResponse = {
            timestamp: incomingPayload.timestamp,
            focused: document.hasFocus(),
          };
          await workerMessenger.directPostMessageToSW(
            WorkerMessengerCommand.AreYouVisibleResponse,
            payload,
          );
        }
      },
    );
  }

  /**
   * Installs a newer version of the OneSignal service worker.
   *
   * We have a couple different models of installing service workers:
   *
   * a) Originally, we provided users with two worker files:
   * OneSignalSDKWorker.js and OneSignalSDKUpdaterWorker.js. Two workers were
   * provided so each could be swapped with the other when the worker needed to
   * update. The contents of both workers were identical; only the filenames
   * were different, which is enough to update the worker.
   *
   * Starting with version 151510, the need for two files is no longer required.
   * We are able to update the worker automatically by always passing in the sdk
   * version as a query parameter. This is enough for the browser to detect a
   * change and re-install the worker.
   *
   * b) With AMP web push, users specify the worker file OneSignalSDKWorker.js
   * with an app ID parameter ?appId=12345. AMP web push
   * is vendor agnostic and doesn't know about OneSignal, so all relevant
   * information has to be passed to the service worker, which is the only
   * vendor-specific file.
   *
   * If AMP web push sees another worker like OneSignalSDKUpdaterWorker.js (deprecated), or
   * even the same OneSignalSDKWorker.js without the app ID query parameter, the
   * user is considered unsubscribed.
   *
   * c) Due to b's restriction, we must always install
   * OneSignalSDKWorker.js?appId=xxx. We also have to appropriately handle the
   * legacy case:
   *
   *    c-1) Where developers running progressive web apps force-register
   *    OneSignalSDKWorker.js
   *
   * Actually, users can customize the file names of the Service Worker but
   * it's up to them to be consistent with their naming. For AMP web push, users
   * can specify the full string to expect for the service worker. They can add
   * additional query parameters, but this must then stay consistent.
   */

  public async installWorker(): Promise<
    ServiceWorkerRegistration | undefined | null
  > {
    if (!(await this.shouldInstallWorker())) {
      return this.getRegistration();
    }

    Log.info('Installing worker...');
    const workerState = await this.getActiveState();

    if (workerState === ServiceWorkerActiveState.ThirdParty) {
      Log.info(
        `[Service Worker Installation] 3rd party service worker detected.`,
      );
    }

    const workerHref = ServiceWorkerHelper.getServiceWorkerHref(
      this.config,
      this.context.appConfig.appId,
      Environment.version(),
    );

    const scope = `${OneSignalUtils.getBaseUrl()}${
      this.config.registrationOptions.scope
    }`;
    Log.info(
      `[Service Worker Installation] Installing service worker ${workerHref} ${scope}.`,
    );

    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register(workerHref, {
        scope,
      });
    } catch (error) {
      Log.error(
        `[Service Worker Installation] Installing service worker failed ${error}`,
      );
      registration = await this.fallbackToUserModelBetaWorker();
    }
    Log.debug(
      `[Service Worker Installation] Service worker installed. Waiting for activation`,
    );

    await ServiceWorkerUtilHelper.waitUntilActive(registration);

    Log.debug(`[Service Worker Installation] Service worker active`);

    await this.establishServiceWorkerChannel();
    return registration;
  }

  async fallbackToUserModelBetaWorker(): Promise<ServiceWorkerRegistration> {
    const BETA_WORKER_NAME = 'OneSignalSDK.sw.js';

    const configWithBetaWorkerName: ServiceWorkerManagerConfig = {
      workerPath: new Path(`/${BETA_WORKER_NAME}`),
      registrationOptions: this.config.registrationOptions,
    };

    const workerHref = ServiceWorkerHelper.getServiceWorkerHref(
      configWithBetaWorkerName,
      this.context.appConfig.appId,
      Environment.version(),
    );

    const scope = `${OneSignalUtils.getBaseUrl()}${
      this.config.registrationOptions.scope
    }`;

    Log.info(
      `[Service Worker Installation] Attempting to install v16 Beta Worker ${workerHref} ${scope}.`,
    );

    try {
      const registration = await navigator.serviceWorker.register(workerHref, {
        scope,
      });

      const DEPRECATION_ERROR = `
        [Service Worker Installation] Successfully installed v16 Beta Worker.
        Deprecation warning: support for the v16 beta worker name of ${BETA_WORKER_NAME}
        will be removed May 5 2024. We have decided to keep the v15 name.
        To avoid breaking changes for your users, please host both worker files:
        OneSignalSDK.sw.js & OneSignalSDKWorker.js.
      `;

      Log.error(DEPRECATION_ERROR);
      return registration;
    } catch (error) {
      const response = await fetch(workerHref);
      if (response.status === 403 || response.status === 404) {
        throw new ServiceWorkerRegistrationError(
          response.status,
          response.statusText,
        );
      }

      throw error;
    }
  }
}
