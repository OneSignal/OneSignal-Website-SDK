import Environment from '../Environment';
import { WorkerMessengerCommand } from '../libraries/WorkerMessenger';
import Path from '../models/Path';
import SdkEnvironment from '../managers/SdkEnvironment';
import Database from '../services/Database';
import { IntegrationKind } from '../models/IntegrationKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import NotImplementedError from '../errors/NotImplementedError';
import ProxyFrameHost from '../modules/frames/ProxyFrameHost';
import Log from '../libraries/Log';
import Event from '../Event';
import ProxyFrame from '../modules/frames/ProxyFrame';
import ServiceWorkerRegistrationError from "../errors/ServiceWorkerRegistrationError";
import OneSignalUtils from "../utils/OneSignalUtils";
import ServiceWorkerHelper, { ServiceWorkerActiveState, ServiceWorkerManagerConfig }
  from "../helpers/ServiceWorkerHelper";
import { ContextSWInterface } from '../models/ContextSW';
import { Utils } from "../context/shared/utils/Utils";
import { PageVisibilityRequest, PageVisibilityResponse } from "../models/Session";
import ServiceWorkerUtilHelper from "../helpers/page/ServiceWorkerUtilHelper";

export class ServiceWorkerManager {
  private context: ContextSWInterface;
  private readonly config: ServiceWorkerManagerConfig;

  constructor(context: ContextSWInterface, config: ServiceWorkerManagerConfig) {
    this.context = context;
    this.config = config;
  }

  // Gets details on the OneSignal service-worker (if any)
  public async getRegistration(): Promise<ServiceWorkerRegistration | null | undefined> {
    return await ServiceWorkerUtilHelper.getRegistration(this.config.registrationOptions.scope);
  }

  public async getActiveState(): Promise<ServiceWorkerActiveState> {
    /*
      Note: This method can only be called on a secure origin. On an insecure
      origin, it'll throw on getRegistration().
    */

    const integration = await SdkEnvironment.getIntegration();
    if (integration === IntegrationKind.InsecureProxy) {
      /* Service workers are not accessible on insecure origins */
      return ServiceWorkerActiveState.Indeterminate;
    } else if (integration === IntegrationKind.SecureProxy) {
      /* If the site setup is secure proxy, we're either on the top frame without access to the
      registration, or the child proxy frame that does have access to the registration. */
      const env = SdkEnvironment.getWindowEnv();
      switch (env) {
        case WindowEnvironmentKind.Host:
        case WindowEnvironmentKind.CustomIframe:
          /* Both these top-ish frames will need to ask the proxy frame to access the service worker
          registration */
          const proxyFrameHost: ProxyFrameHost = OneSignal.proxyFrameHost;
          if (!proxyFrameHost) {
            /* On init, this function may be called. Return a null state for now */
            return ServiceWorkerActiveState.Indeterminate;
          } else {
            return await proxyFrameHost.runCommand<ServiceWorkerActiveState>(
              OneSignal.POSTMAM_COMMANDS.SERVICE_WORKER_STATE
            );
          }
        case WindowEnvironmentKind.OneSignalSubscriptionPopup:
          /* This is a top-level frame, so it can access the service worker registration */
          break;
        case WindowEnvironmentKind.OneSignalSubscriptionModal:
          throw new NotImplementedError();
      }
    }

    const workerRegistration = await this.context.serviceWorkerManager.getRegistration();
    if (!workerRegistration) {
      return ServiceWorkerActiveState.None;
    }

    // We are now; 1. Getting the filename of the SW; 2. Checking if it is ours or a 3rd parties.
    const swFileName = ServiceWorkerManager.activeSwFileName(workerRegistration);
    const workerState = this.swActiveStateByFileName(swFileName);
    return workerState;
  }

  // Get the file name of the active ServiceWorker
  private static activeSwFileName(workerRegistration: ServiceWorkerRegistration): string | null {
    const serviceWorker = ServiceWorkerUtilHelper.getAvailableServiceWorker(workerRegistration);
    if (!serviceWorker) {
      return null;
    }

    const workerScriptPath = new URL(serviceWorker.scriptURL).pathname;
    const swFileName = new Path(workerScriptPath).getFileName();

    // If the current service worker is Akamai's
    if (swFileName == "akam-sw.js") {
      // Check if its importing a ServiceWorker under it's "othersw" query param
      const searchParams = new URLSearchParams(new URL(serviceWorker.scriptURL).search);
      const importedSw = searchParams.get("othersw");
      if (importedSw) {
        Log.debug("Found a ServiceWorker under Akamai's akam-sw.js?othersw=", importedSw);
        return new Path(new URL(importedSw).pathname).getFileName();
      }
    }
    return swFileName;
  }

  // Check if the ServiceWorker file name is ours or a third party's
  private swActiveStateByFileName(fileName: string | null): ServiceWorkerActiveState {
    if (!fileName)
      return ServiceWorkerActiveState.None;
    if (fileName == this.config.workerAPath.getFileName())
      return ServiceWorkerActiveState.WorkerA;
    if (fileName == this.config.workerBPath.getFileName())
      return  ServiceWorkerActiveState.WorkerB;
    return ServiceWorkerActiveState.ThirdParty;
  }

  public async getWorkerVersion(): Promise<number> {
    return new Promise<number>(async resolve => {
      if (OneSignalUtils.isUsingSubscriptionWorkaround()) {
        const proxyFrameHost: ProxyFrameHost = OneSignal.proxyFrameHost;
        if (!proxyFrameHost) {
          /* On init, this function may be called. Return a null state for now */
          resolve(NaN);
        } else {
          const proxyWorkerVersion =
            await proxyFrameHost.runCommand<number>(OneSignal.POSTMAM_COMMANDS.GET_WORKER_VERSION);
          resolve(proxyWorkerVersion);
        }
      } else {
        this.context.workerMessenger.once(WorkerMessengerCommand.WorkerVersion, workerVersion => {
          resolve(workerVersion);
        });
        this.context.workerMessenger.unicast(WorkerMessengerCommand.WorkerVersion);
      }
    });
  }

  private async shouldInstallWorker(): Promise<boolean> {
    // 1. Does the browser support ServiceWorkers?
    if (!Environment.supportsServiceWorkers())
      return false;

    // 2. Is OneSignal initialized?
    if (!OneSignal.config)
      return false;

    // 3. Will the service worker be installed on os.tc instead of the current domain?
    if (OneSignal.config.subdomain) {
      // No, if configured to use our subdomain (AKA HTTP setup) AND this is on their page (HTTP or HTTPS).
      // But since safari does not need subscription workaround, installing SW for session tracking.
      if (
        OneSignal.environmentInfo.browserType !== "safari" &&
          SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.Host
      ) {
        return false;
      }
    }

    // 4. Is a OneSignal ServiceWorker not installed now?
    // If not and notification permissions are enabled we should install.
    // This prevents an unnecessary install of the OneSignal worker which saves bandwidth
    const workerState = await this.getActiveState();
    Log.debug("[shouldInstallWorker] workerState", workerState);
    if (workerState === ServiceWorkerActiveState.None || workerState === ServiceWorkerActiveState.ThirdParty) {
      const permission = await OneSignal.context.permissionManager.getNotificationPermission(
        OneSignal.config!.safariWebId
      );
      const notificationsEnabled = permission === "granted";
      if (notificationsEnabled) {
        Log.info("[shouldInstallWorker] Notification Permissions enabled, will install ServiceWorker");
      }
      return notificationsEnabled;
    }

    // 5. We have a OneSignal ServiceWorker installed, but did the path or scope of the ServiceWorker change?
    if (await this.haveParamsChanged()) {
      return true;
    }

    // 6. We have a OneSignal ServiceWorker installed, is there an update?
    return this.workerNeedsUpdate();
  }

  private async haveParamsChanged(): Promise<boolean> {
    // 1. No workerRegistration
    const workerRegistration = await this.context.serviceWorkerManager.getRegistration();
    if (!workerRegistration) {
      Log.info(
        "[changedServiceWorkerParams] workerRegistration not found at scope",
        this.config.registrationOptions.scope
      );
      return true;
    }

    // 2. Different scope
    const existingSwScope = new URL(workerRegistration.scope).pathname;
    const configuredSwScope = this.config.registrationOptions.scope;
    if (existingSwScope != configuredSwScope) {
      Log.info(
        "[changedServiceWorkerParams] ServiceWorker scope changing",
        { a_old: existingSwScope, b_new: configuredSwScope }
      );
      return true;
    }

    // 3. Different href?, asking if (path + filename [A or B] + queryParams) is different
    const availableWorker = ServiceWorkerUtilHelper.getAvailableServiceWorker(workerRegistration);
    const serviceWorkerHrefs = ServiceWorkerHelper.getPossibleServiceWorkerHrefs(
      this.config,
      this.context.appConfig.appId
    );
    // 3.1 If we can't get a scriptURL assume it is different
    if (!availableWorker?.scriptURL) {
      return true;
    }
    // 3.2 We don't care if the only differences is between OneSignal's A(Worker) vs B(WorkerUpdater) filename.
    if (serviceWorkerHrefs.indexOf(availableWorker.scriptURL) === -1) {
      Log.info(
        "[changedServiceWorkerParams] ServiceWorker href changing:",
        { a_old: availableWorker?.scriptURL, b_new: serviceWorkerHrefs }
      );
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
    Log.info("[Service Worker Update] Checking service worker version...");
    let workerVersion: number;
    try {
      workerVersion = await Utils.timeoutPromise(this.getWorkerVersion(), 2_000);
    } catch (e) {
      Log.info("[Service Worker Update] Worker did not reply to version query; assuming older version and updating.");
      return true;
    }

    if (workerVersion !== Environment.version()) {
      Log.info(`[Service Worker Update] Updating service worker from ${workerVersion} --> ${Environment.version()}.`);
      return true;
    }

    Log.info(`[Service Worker Update] Service worker version is current at ${workerVersion} (no update required).`);
    return false;
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
   * b) With AMP web push, users are to specify only the first worker file
   * OneSignalSDKWorker.js, with an app ID parameter ?appId=12345. AMP web push
   * is vendor agnostic and doesn't know about OneSignal, so all relevant
   * information has to be passed to the service worker, which is the only
   * vendor-specific file. So the service worker being installed is always
   * OneSignalSDKWorker.js?appId=12345 and never OneSignalSDKUpdaterWorker.js.
   * If AMP web push sees another worker like OneSignalSDKUpdaterWorker.js, or
   * even the same OneSignalSDKWorker.js without the app ID query parameter, the
   * user is considered unsubscribed.
   *
   * c) Due to b's restriction, we must always install
   * OneSignalSDKWorker.js?appId=xxx. We also have to appropriately handle
   * legacy cases:
   *
   *    c-1) Where developers have OneSignalSDKWorker.js or
   *    OneSignalSDKUpdaterWorker.js alternatingly installed
   *
   *    c-2) Where developers running progressive web apps force-register
   *    OneSignalSDKWorker.js
   *
   * Actually, users can customize the file names of Worker A / Worker B, but
   * it's up to them to be consistent with their naming. For AMP web push, users
   * can specify the full string to expect for the service worker. They can add
   * additional query parameters, but this must then stay consistent.
   *
   * Installation Procedure
   * ----------------------
   *
   * Worker A is always installed. If Worker A is already installed, Worker B is
   * installed first, and then Worker A is installed again. This is necessary
   * because AMP web push requires Worker A to be installed for the user to be
   * considered subscribed.
   */
  public async installWorker() {
    if (!await this.shouldInstallWorker()) {
      return;
    }

    await this.installAlternatingWorker();

    if ((await this.getActiveState()) === ServiceWorkerActiveState.WorkerB) {
      // If the worker is Worker B, reinstall Worker A
      await this.installAlternatingWorker();
    }

    await this.establishServiceWorkerChannel();
  }

  public async establishServiceWorkerChannel() {
    Log.debug('establishServiceWorkerChannel');
    const workerMessenger = this.context.workerMessenger;
    workerMessenger.off();

    workerMessenger.on(WorkerMessengerCommand.NotificationDisplayed, data => {
      Log.debug(location.origin, 'Received notification display event from service worker.');
      Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISPLAYED, data);
    });

    workerMessenger.on(WorkerMessengerCommand.NotificationClicked, async data => {
      let clickedListenerCallbackCount: number;
      if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalProxyFrame) {
        clickedListenerCallbackCount = await new Promise<number>(resolve => {
          const proxyFrame: ProxyFrame = OneSignal.proxyFrame;
          if (proxyFrame) {
            proxyFrame.messenger.message(
              OneSignal.POSTMAM_COMMANDS.GET_EVENT_LISTENER_COUNT,
              OneSignal.EVENTS.NOTIFICATION_CLICKED,
              (reply: any) => {
                const callbackCount: number = reply.data;
                resolve(callbackCount);
              }
            );
          }
        });
      }
      else
        clickedListenerCallbackCount = OneSignal.emitter.numberOfListeners(OneSignal.EVENTS.NOTIFICATION_CLICKED);

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
          'notification.clicked event received, but no event listeners; storing event in IndexedDb for later retrieval.'
        );
        /* For empty notifications without a URL, use the current document's URL */
        let url = data.url;
        if (!data.url) {
          // Least likely to modify, since modifying this property changes the page's URL
          url = location.href;
        }
        await Database.put('NotificationOpened', { url: url, data: data, timestamp: Date.now() });
      }
      else
        Event.trigger(OneSignal.EVENTS.NOTIFICATION_CLICKED, data);
    });

    workerMessenger.on(WorkerMessengerCommand.RedirectPage, data => {
      Log.debug(
        `${SdkEnvironment.getWindowEnv().toString()} Picked up command.redirect to ${data}, forwarding to host page.`
      );
      const proxyFrame: ProxyFrame = OneSignal.proxyFrame;
      if (proxyFrame) {
        proxyFrame.messenger.message(OneSignal.POSTMAM_COMMANDS.SERVICEWORKER_COMMAND_REDIRECT, data);
      }
    });

    workerMessenger.on(WorkerMessengerCommand.NotificationDismissed, data => {
      Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISMISSED, data);
    });

    const isHttps = OneSignalUtils.isHttps();
    const isSafari = OneSignalUtils.isSafari();

    workerMessenger.on(WorkerMessengerCommand.AreYouVisible, (incomingPayload: PageVisibilityRequest) => {
      // For https sites in Chrome and Firefox service worker (SW) can get correct value directly.
      // For Safari, unfortunately, we need this messaging workaround because SW always gets false.
      if (isHttps && isSafari) {
        const payload: PageVisibilityResponse = {
          timestamp: incomingPayload.timestamp,
          focused: document.hasFocus(),
        };
        workerMessenger.directPostMessageToSW(WorkerMessengerCommand.AreYouVisibleResponse, payload);
      } else {
        const httpPayload: PageVisibilityRequest = { timestamp: incomingPayload.timestamp };
        const proxyFrame: ProxyFrame | undefined = OneSignal.proxyFrame;
        if (proxyFrame) {
          proxyFrame.messenger.message(OneSignal.POSTMAM_COMMANDS.ARE_YOU_VISIBLE_REQUEST, httpPayload);
        }
      }
    });
  }

  /**
   * Installs the OneSignal service worker.
   *
   * Depending on the existing worker, the alternate swap worker may be
   * installed or, for 3rd party workers, the existing worker may be uninstalled
   * before installing ours.
   */
  private async installAlternatingWorker() {
    const workerState = await this.getActiveState();

    if (workerState === ServiceWorkerActiveState.ThirdParty) {
      Log.info(`[Service Worker Installation] 3rd party service worker detected.`);
    }

    const workerHref = ServiceWorkerHelper.getAlternatingServiceWorkerHref(
      workerState,
      this.config,
      this.context.appConfig.appId
    );

    const scope = `${OneSignalUtils.getBaseUrl()}${this.config.registrationOptions.scope}`;
    Log.info(`[Service Worker Installation] Installing service worker ${workerHref} ${scope}.`);
    try {
      await navigator.serviceWorker.register(workerHref, { scope });
    } catch (error) {
      Log.error(`[Service Worker Installation] Installing service worker failed ${error}`);
      // Try accessing the service worker path directly to find out what the problem is and report it to OneSignal api.

      // If we are inside the popup and service worker fails to register, it's not developer's fault.
      // No need to report it to the api then.
      const env = SdkEnvironment.getWindowEnv();
      if (env === WindowEnvironmentKind.OneSignalSubscriptionPopup)
        throw error;

      const response = await fetch(workerHref);
      if (response.status === 403 || response.status === 404)
        throw new ServiceWorkerRegistrationError(response.status, response.statusText);

      throw error;
    }
    Log.debug(`[Service Worker Installation] Service worker installed.`);
  }
}
