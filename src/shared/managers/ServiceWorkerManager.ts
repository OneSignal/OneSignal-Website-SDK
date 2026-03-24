import {
  getAvailableServiceWorker,
  getSWRegistration,
  waitUntilActive,
} from '../../sw/helpers/registration';
import { timeoutPromise } from '../context/helpers';
import type { ContextInterface } from '../context/types';
import { hasSafariWindow, supportsServiceWorkers } from '../environment/detect';
import { getBaseUrl } from '../helpers/general';
import {
  getServiceWorkerHref,
  ServiceWorkerActiveState,
  type ServiceWorkerActiveStateValue,
  type ServiceWorkerManagerConfig,
} from '../helpers/service-worker';
import Log from '../libraries/Log';
import { WorkerMessengerCommand } from '../libraries/workerMessenger/constants';
import { triggerNotificationClick } from '../listeners';
import Path from '../models/Path';
import type {
  NotificationClickEventInternal,
  NotificationForegroundWillDisplayEvent,
  NotificationForegroundWillDisplayEventSerializable,
} from '../notifications/types';
import OneSignalEvent from '../services/OneSignalEvent';
import type { PageVisibilityRequest, PageVisibilityResponse } from '../session/types';
import { VERSION } from '../utils/env';

export class ServiceWorkerManager {
  private _context: ContextInterface;
  private readonly _config: ServiceWorkerManagerConfig;

  constructor(context: ContextInterface, config: ServiceWorkerManagerConfig) {
    this._context = context;
    this._config = config;
  }

  /**
   * Gets the current ServiceWorkerRegistration in the scoped configured
   * in OneSignal.
   * WARNING: This might be a non-OneSignal service worker, use
   * getOneSignalRegistration() instead if you need this guarantee.
   */
  public async _getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    return getSWRegistration(this._config.registrationOptions.scope);
  }

  /**
   *  Gets the OneSignal ServiceWorkerRegistration reference, if it was registered
   */
  public async _getOneSignalRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    const state = await this._getActiveState();
    if (state === ServiceWorkerActiveState._OneSignalWorker) {
      return this._getRegistration();
    }
    return undefined;
  }

  public async _getActiveState(): Promise<ServiceWorkerActiveStateValue> {
    const workerRegistration = await this._getRegistration();
    if (!workerRegistration) {
      return ServiceWorkerActiveState._None;
    }

    // We are now; 1. Getting the filename of the SW; 2. Checking if it is ours or a 3rd parties.
    const swFileName = ServiceWorkerManager._activeSwFileName(workerRegistration);
    const workerState = this._swActiveStateByFileName(swFileName);
    return workerState;
  }

  // Get the file name of the active ServiceWorker
  private static _activeSwFileName(
    workerRegistration: ServiceWorkerRegistration,
  ): string | null | undefined {
    const serviceWorker = getAvailableServiceWorker(workerRegistration);
    if (!serviceWorker) {
      return null;
    }

    const workerScriptPath = new URL(serviceWorker.scriptURL).pathname;
    const swFileName = new Path(workerScriptPath)._getFileName();

    // If the current service worker is Akamai's
    if (swFileName == 'akam-sw.js') {
      // Check if its importing a ServiceWorker under it's "othersw" query param
      const searchParams = new URLSearchParams(new URL(serviceWorker.scriptURL).search);
      const importedSw = searchParams.get('othersw');
      if (importedSw) {
        Log._debug('Found SW under akam-sw.js?othersw=', importedSw);
        return new Path(new URL(importedSw).pathname)._getFileName();
      }
    }
    return swFileName;
  }

  // Check if the ServiceWorker file name is ours or a third party's
  private _swActiveStateByFileName(fileName?: string | null): ServiceWorkerActiveStateValue {
    if (!fileName) {
      return ServiceWorkerActiveState._None;
    }
    const isValidOSWorker = fileName == this._config.workerPath._getFileName();

    if (isValidOSWorker) {
      return ServiceWorkerActiveState._OneSignalWorker;
    }
    return ServiceWorkerActiveState._ThirdParty;
  }

  public async _getWorkerVersion(): Promise<string> {
    return new Promise<string>((resolve) => {
      this._context._workerMessenger._once(
        WorkerMessengerCommand._WorkerVersion,
        (workerVersion) => {
          resolve(workerVersion);
        },
      );
      this._context._workerMessenger._unicast(WorkerMessengerCommand._WorkerVersion);
    });
  }

  // Returns false if the OneSignal service worker can't be installed
  // or is already installed and doesn't need updating.
  private async _shouldInstallWorker(): Promise<boolean> {
    // 1. Does the browser support ServiceWorkers?
    if (!supportsServiceWorkers()) return false;

    // 2. Is OneSignal initialized?
    if (!OneSignal.config) return false;

    // 3. Is a OneSignal ServiceWorker not installed now?
    // If not and notification permissions are enabled we should install.
    // This prevents an unnecessary install of the OneSignal worker which saves bandwidth
    const workerState = await this._getActiveState();
    Log._debug('shouldInstallWorker state:', workerState);
    if (
      workerState === ServiceWorkerActiveState._None ||
      workerState === ServiceWorkerActiveState._ThirdParty
    ) {
      const permission = OneSignal._context._permissionManager._getNotificationPermission(
        OneSignal.config!.safariWebId,
      );
      const notificationsEnabled = permission === 'granted';
      if (notificationsEnabled) {
        Log._info('Permissions enabled, installing SW');
      }
      return notificationsEnabled;
    }

    // 4. We have a OneSignal ServiceWorker installed, but did the path or scope of the ServiceWorker change?
    if (await this._haveParamsChanged()) {
      return true;
    }

    // 5. We have a OneSignal ServiceWorker installed, is there an update?
    return this._workerNeedsUpdate();
  }

  public async _haveParamsChanged(): Promise<boolean> {
    // 1. No workerRegistration
    const workerRegistration = await this._getRegistration();
    if (!workerRegistration) {
      Log._info('SW registration not found at scope', this._config.registrationOptions.scope);
      return true;
    }

    // 2. Different scope
    const existingSwScope = new URL(workerRegistration.scope).pathname;
    const configuredSwScope = this._config.registrationOptions.scope;
    if (existingSwScope != configuredSwScope) {
      Log._info('SW scope changing', {
        a_old: existingSwScope,
        b_new: configuredSwScope,
      });
      return true;
    }

    // 3. Different href?, asking if (path + filename + queryParams) is different
    const availableWorker = getAvailableServiceWorker(workerRegistration);
    const serviceWorkerHref = getServiceWorkerHref(
      this._config,
      this._context._appConfig.appId,
      VERSION,
    );
    // 3.1 If we can't get a scriptURL assume it is different
    if (!availableWorker?.scriptURL) {
      return true;
    }
    // 3.2 If the new serviceWorkerHref (page-env SDK version as query param) is different than existing worker URL
    if (serviceWorkerHref !== availableWorker.scriptURL) {
      Log._info('SW href changing:', {
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
  private async _workerNeedsUpdate(): Promise<boolean> {
    Log._info('Checking SW version...');
    let workerVersion: string;
    try {
      workerVersion = await timeoutPromise(this._getWorkerVersion(), 2_000);
    } catch {
      Log._info('SW did not reply to version query, updating');
      return true;
    }

    if (workerVersion !== VERSION) {
      Log._info(`Updating SW ${workerVersion} -> ${VERSION}`);
      return true;
    }

    Log._info(`SW version current: ${workerVersion}`);
    return false;
  }

  public _establishServiceWorkerChannel() {
    Log._debug('establishSWChannel');
    const workerMessenger = this._context._workerMessenger;
    workerMessenger._off();

    workerMessenger._on(
      WorkerMessengerCommand._NotificationWillDisplay,
      (event: NotificationForegroundWillDisplayEventSerializable) => {
        Log._debug(location.origin, 'Notif display event from SW');

        let preventDefaultCalled = false;
        const notificationId = event.notification.notificationId;

        const publicEvent: NotificationForegroundWillDisplayEvent = {
          notification: {
            ...event.notification,
            display: () => {
              Log._debug(`display() called: ${notificationId}`);
              workerMessenger._unicast(WorkerMessengerCommand._DisplayNotification, {
                notification: event.notification,
              });
            },
          },
          preventDefault: function (): void {
            Log._debug(`preventDefault() called: ${notificationId}`);
            preventDefaultCalled = true;
          },
        };

        // Trigger the event and let listeners call preventDefault() synchronously
        OneSignalEvent._trigger(OneSignal.EVENTS.NOTIFICATION_WILL_DISPLAY, publicEvent);

        // Send response back to service worker
        Log._debug(`preventDefault response: ${preventDefaultCalled} for: ${notificationId}`);
        workerMessenger._unicast(WorkerMessengerCommand._NotificationWillDisplayResponse, {
          notificationId,
          preventDefault: preventDefaultCalled,
        });
      },
    );

    workerMessenger._on(
      WorkerMessengerCommand._NotificationClicked,
      (event: NotificationClickEventInternal) => {
        const clickedListenerCallbackCount = OneSignal._emitter._numberOfListeners(
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
          Log._debug('Click event with no listeners, storing for later');
        } else {
          triggerNotificationClick(event);
        }
      },
    );

    workerMessenger._on(WorkerMessengerCommand._NotificationDismissed, (data) => {
      OneSignalEvent._trigger(OneSignal.EVENTS.NOTIFICATION_DISMISSED, data);
    });

    const isSafari = hasSafariWindow();

    workerMessenger._on(
      WorkerMessengerCommand._AreYouVisible,
      async (incomingPayload: PageVisibilityRequest) => {
        // For https sites in Chrome and Firefox service worker (SW) can get correct value directly.
        // For Safari, unfortunately, we need this messaging workaround because SW always gets false.
        if (isSafari) {
          const payload: PageVisibilityResponse = {
            timestamp: incomingPayload.timestamp,
            focused: document.hasFocus(),
          };
          await workerMessenger._directPostMessageToSW(
            WorkerMessengerCommand._AreYouVisibleResponse,
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

  public async _installWorker(): Promise<ServiceWorkerRegistration | undefined | null> {
    if (!(await this._shouldInstallWorker())) {
      return this._getOneSignalRegistration();
    }

    Log._info('Installing worker...');
    const workerState = await this._getActiveState();

    if (workerState === ServiceWorkerActiveState._ThirdParty) {
      Log._info('3rd party SW detected');
    }

    const workerHref = getServiceWorkerHref(this._config, this._context._appConfig.appId, VERSION);

    const scope = `${getBaseUrl()}${this._config.registrationOptions.scope}`;
    Log._info(`Installing SW ${workerHref} ${scope}`);

    const registration = await navigator.serviceWorker.register(workerHref, {
      scope,
      type: import.meta.env.MODE === 'development' ? 'module' : undefined,
    });
    Log._debug('SW installed, waiting for activation');

    await waitUntilActive(registration);

    Log._debug('SW active');

    this._establishServiceWorkerChannel();
    return registration;
  }
}
