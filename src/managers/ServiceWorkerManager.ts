import Environment from '../Environment';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import { WorkerMessengerCommand } from '../libraries/WorkerMessenger';
import Context from '../models/Context';
import Path from '../models/Path';
import SdkEnvironment from './SdkEnvironment';
import { Subscription } from '../models/Subscription';
import { encodeHashAsUriComponent, timeoutPromise, isUsingSubscriptionWorkaround } from '../utils';
import SubscriptionHelper from '../helpers/SubscriptionHelper';
import Database from '../services/Database';
import MainHelper from '../helpers/MainHelper';
import { IntegrationKind } from '../models/IntegrationKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import NotImplementedError from '../errors/NotImplementedError';
import ProxyFrameHost from '../modules/frames/ProxyFrameHost';
import Log from '../libraries/Log';
import Event from '../Event';
import ProxyFrame from '../modules/frames/ProxyFrame';
import ServiceWorkerRegistrationError from "../errors/ServiceWorkerRegistrationError"
import Utils from "../utils/Utils";

export enum ServiceWorkerActiveState {
  /**
   * OneSignalSDKWorker.js, or the equivalent custom file name, is active.
   */
  WorkerA = 'Worker A (Main)',
  /**
   * OneSignalSDKUpdaterWorker.js, or the equivalent custom file name, is
   * active.
   *
   * We no longer need to use this filename. We can update Worker A by appending
   * a random query parameter to A.
   */
  WorkerB = 'Worker B (Updater)',
  /**
   * A service worker is active, but it is neither OneSignalSDKWorker.js nor
   * OneSignalSDKUpdaterWorker.js (or the equivalent custom file names as
   * provided by user config).
   */
  ThirdParty = '3rd Party',
  /**
   * A service worker is currently installing and we can't determine its final state yet. Wait until
   * the service worker is finished installing by checking for a controllerchange property..
   */
  Installing = 'Installing',
  /**
   * No service worker is installed.
   */
  None = 'None',
  /**
   * A service worker is active but not controlling the page. This can occur if
   * the page is hard-refreshed bypassing the cache, which also bypasses service
   * workers.
   */
  Bypassed = 'Bypassed',
  /**
   * Service workers are not supported in this environment. This status is used
   * on HTTP pages where it isn't possible to know whether a service worker is
   * installed or not or in any of the other states.
   */
  Indeterminate = 'Indeterminate'
}

export interface ServiceWorkerManagerConfig {
  /**
   * The path and filename of the "main" worker (e.g. '/OneSignalSDKWorker.js');
   */
  workerAPath: Path;
  /**
   * The path and filename to the "alternate" worker, used to update an existing
   * service worker. (e.g. '/OneSignalSDKUpdaterWorer.js')
   */
  workerBPath: Path;
  /**
   * Describes how much of the origin the service worker controls.
   * This is currently always "/".
   */
  registrationOptions: { scope: string };
}

export class ServiceWorkerManager {

  private context: Context;
  private config: ServiceWorkerManagerConfig;

  constructor(context: Context, config: ServiceWorkerManagerConfig) {
    this.context = context;
    this.config = config;
  }

  public static async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    try {
      // location.origin is used for <base> tag compatibility when it is set to a different origin
      return navigator.serviceWorker.getRegistration(location.origin);
    } catch (e) {
      // This could be null in an HTTP context or error if the user doesn't accept cookies
      Log.warn("[Service Worker Status] Error Checking service worker registration");
      return null;
    }
  }

  public async getActiveState(): Promise<ServiceWorkerActiveState> {
    /*
      Note: This method can only be called on a secure origin. On an insecure
      origin, it'll throw on getRegistration().
    */

    /*
      We want to find out if the *current* page is currently controlled by an
      active service worker.

      There are three ways (sort of) to do this:
        - getRegistration()
        - getRegistrations()
        - navigator.serviceWorker.ready

      We want to use getRegistration(), since it will not return a value if the
      page is not currently controlled by an active service worker.

      getRegistrations() returns all service worker registrations under the
      origin (i.e. registrations in nested folders).

      navigator.serviceWorker.ready will hang indefinitely and never resolve if
      no registration is active.
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

    const workerRegistration = await ServiceWorkerManager.getRegistration();
    if (!workerRegistration) {
      /*
        A site may have a service worker nested at /folder1/folder2/folder3, while the user is
        currently on /folder1. The nested service worker does not control /folder1 though. Although
        the nested service worker can receive push notifications without issue, it cannot perform
        other SDK operations like checking whether existing tabs are optn eo the site on /folder1
        (used to prevent opening unnecessary new tabs on notification click.)

        Because we rely on being able to communicate with the service worker for SDK operations, we
        only say we're active if the service worker directly controls this page.
       */
      return ServiceWorkerActiveState.None;
    }
    else if (workerRegistration.installing) {
      /*
        Workers that are installing block for a while, since we can't use them until they're done
        installing.
       */
      return ServiceWorkerActiveState.Installing;
    }
    else if (!workerRegistration.active) {
      /*
        Workers that are waiting won't be our service workers, since we use clients.claim() and
        skipWaiting() to bypass the install and waiting stages.
       */
      return ServiceWorkerActiveState.ThirdParty;
    }

    const workerScriptPath = new URL(workerRegistration.active.scriptURL).pathname;
    let workerState: ServiceWorkerActiveState;

    /*
      At this point, there is an active service worker registration controlling this page.

      Check the filename to see if it belongs to our A / B worker.
    */

    if (new Path(workerScriptPath).getFileName() == this.config.workerAPath.getFileName())
      workerState = ServiceWorkerActiveState.WorkerA;
    else if (new Path(workerScriptPath).getFileName() == this.config.workerBPath.getFileName())
      workerState = ServiceWorkerActiveState.WorkerB;
    else
      workerState = ServiceWorkerActiveState.ThirdParty;

    /*
      Our service worker registration can be both active and in the controlling scope of the current
      page, but if the page was hard refreshed to bypass the cache (e.g. Ctrl + Shift + R), a
      service worker will not control the page.

      For a third-party service worker, if it does not call clients.claim(), even if its
      registration is both active and in the controlling scope of the current page,
      navigator.serviceWorker.controller will still be null on the first page visit. So we only
      check if the controller is null for our worker, which we know uses clients.claim().
     */
    if (!navigator.serviceWorker.controller && (
      workerState === ServiceWorkerActiveState.WorkerA ||
      workerState === ServiceWorkerActiveState.WorkerB
    ))
      return ServiceWorkerActiveState.Bypassed;
    return workerState;
  }

  public async getWorkerVersion(): Promise<number> {
    return new Promise<number>(async resolve => {
      if (isUsingSubscriptionWorkaround()) {
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

  async shouldInstallWorker(): Promise<boolean> {
    const workerState = await this.getActiveState();

    if (workerState !== ServiceWorkerActiveState.WorkerA && workerState !== ServiceWorkerActiveState.WorkerB) {
      return true;
    }
    return false;
  }

  async subscribeForPushNotifications(): Promise<Subscription> {
    const workerState = await this.getActiveState();

    if (workerState !== ServiceWorkerActiveState.WorkerA && workerState !== ServiceWorkerActiveState.WorkerB) {
      throw new InvalidStateError(InvalidStateReason.ServiceWorkerNotActivated);
    }
    return new Promise<Subscription>(resolve => {
      this.context.workerMessenger.once(WorkerMessengerCommand.Subscribe, subscription => {
        resolve(Subscription.deserialize(subscription));
      });
      this.context.workerMessenger.unicast(WorkerMessengerCommand.Subscribe, this.context.appConfig);
    });
  }

  /**
   * Performs a service worker update by swapping out the current service worker
   * with a content-identical but differently named alternate service worker
   * file.
   */
  async updateWorker() {
    if (!Environment.supportsServiceWorkers()) {
      return;
    }

    const workerState = await this.getActiveState();
    Log.info(`[Service Worker Update] Checking service worker version...`);
    let workerVersion;
    try {
      workerVersion = await timeoutPromise(this.getWorkerVersion(), 2000);
    } catch (e) {
      Log.info(`[Service Worker Update] Worker did not reply to version query; assuming older version.`);
      workerVersion = 1;
    }

    if (workerState !== ServiceWorkerActiveState.WorkerA && workerState !== ServiceWorkerActiveState.WorkerB) {
      // Do not update 3rd party workers
      Log.debug(
        `[Service Worker Update] Not updating service worker, current active worker state is ${workerState}.`
      );
      return;
    }

    if (workerVersion !== Environment.version()) {
      Log.info(`[Service Worker Update] Updating service worker from v${workerVersion} --> v${Environment.version()}.`);
      await this.installWorker();
    } else {
      Log.info(`[Service Worker Update] Service worker version is current at v${workerVersion} (no update required).`);
    }
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
    if (!Environment.supportsServiceWorkers()) {
      return;
    }

    const preInstallWorkerState = await this.getActiveState();
    await this.installAlternatingWorker();
    await new Promise(async resolve => {
      const postInstallWorkerState = await this.getActiveState();
      if (preInstallWorkerState !== postInstallWorkerState &&
        postInstallWorkerState !== ServiceWorkerActiveState.Installing) {
        resolve();
      } else {
        navigator.serviceWorker.addEventListener('controllerchange', async e => {
          const postInstallWorkerState = await this.getActiveState();
          if (postInstallWorkerState !== preInstallWorkerState &&
            postInstallWorkerState !== ServiceWorkerActiveState.Installing) {
            resolve();
          }
        });
      }
    });
    if ((await this.getActiveState()) === ServiceWorkerActiveState.WorkerB) {
      // If the worker is Worker B, reinstall Worker A
      await this.installAlternatingWorker();
    }

    await this.establishServiceWorkerChannel();
  }

  public async establishServiceWorkerChannel() {
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
              reply => {
                let callbackCount: number = reply.data;
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
      /*
         Always unregister 3rd party service workers.

         Unregistering unsubscribes the existing push subscription and allows us
         to register a new push subscription. This takes care of possible previous mismatched sender IDs
       */
      const workerRegistration = await ServiceWorkerManager.getRegistration();
      if (workerRegistration)
        await workerRegistration.unregister();
    }

    let workerDirectory, workerFileName, fullWorkerPath;

    // Determine which worker to install
    if (
      workerState === ServiceWorkerActiveState.WorkerA
    ) {
      workerDirectory = this.config.workerBPath.getPathWithoutFileName();
      workerFileName = this.config.workerBPath.getFileName();
    } else if (workerState === ServiceWorkerActiveState.WorkerB ||
      workerState === ServiceWorkerActiveState.ThirdParty ||
      workerState === ServiceWorkerActiveState.None) {
      workerDirectory = this.config.workerAPath.getPathWithoutFileName();
      workerFileName = this.config.workerAPath.getFileName();
    } else if (workerState === ServiceWorkerActiveState.Bypassed) {
      /*
        if the page is hard refreshed bypassing the cache, no service worker
        will control the page.

        It doesn't matter if we try to reinstall an existing worker; still no
        service worker will control the page after installation.
       */
      throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    const installUrlQueryParams = encodeHashAsUriComponent({
      appId: this.context.appConfig.appId
    });
    fullWorkerPath = `${Utils.getBaseUrl()}${workerDirectory}/${workerFileName}?${installUrlQueryParams}`;
    Log.info(`[Service Worker Installation] Installing service worker ${fullWorkerPath}.`);
    try {
      const registerScope = `${Utils.getBaseUrl()}${this.config.registrationOptions.scope}`;
      await navigator.serviceWorker.register(fullWorkerPath, {scope: registerScope});
    } catch (error) {
      Log.error(`[Service Worker Installation] Installing service worker failed ${error}`);
      // Try accessing the service worker path directly to find out what the problem is and report it to OneSignal api.

      // If we are inside the popup and service worker fails to register, it's not developer's fault.
      // No need to report it to the api then.
      const env = SdkEnvironment.getWindowEnv();
      if (env === WindowEnvironmentKind.OneSignalSubscriptionPopup)
        throw error;

      const response = await fetch(fullWorkerPath);
      if (response.status === 403 || response.status === 404)
        throw new ServiceWorkerRegistrationError(response.status, response.statusText);

      throw error;
    }
    Log.debug(`[Service Worker Installation] Service worker installed.`);
  }
}
