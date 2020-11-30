import bowser from "bowser";

import Environment from "../Environment";
import { WorkerMessenger, WorkerMessengerCommand, WorkerMessengerMessage } from "../libraries/WorkerMessenger";
import SdkEnvironment from "../managers/SdkEnvironment";
import ContextSW from "../models/ContextSW";
import OneSignalApiBase from "../OneSignalApiBase";
import OneSignalApiSW from "../OneSignalApiSW";
import Database from "../services/Database";

import { UnsubscriptionStrategy } from "../models/UnsubscriptionStrategy";
import { RawPushSubscription } from "../models/RawPushSubscription";
import { SubscriptionStateKind } from "../models/SubscriptionStateKind";
import { SubscriptionStrategyKind } from "../models/SubscriptionStrategyKind";
import { PushDeviceRecord } from "../models/PushDeviceRecord";
import {
  UpsertSessionPayload, DeactivateSessionPayload,
  PageVisibilityRequest, PageVisibilityResponse, SessionStatus
} from "../models/Session";
import Log from "../libraries/sw/Log";
import { ConfigHelper } from "../helpers/ConfigHelper";
import { OneSignalUtils } from "../utils/OneSignalUtils";
import { Utils } from "../context/shared/utils/Utils";
import {
  OSWindowClient, OSServiceWorkerFields
} from "./types";
import ServiceWorkerHelper from "../helpers/ServiceWorkerHelper";
import { NotificationReceived, NotificationClicked } from "../models/Notification";
import { cancelableTimeout } from "../helpers/sw/CancelableTimeout";
import { DeviceRecord } from '../models/DeviceRecord';

declare var self: ServiceWorkerGlobalScope & OSServiceWorkerFields;
declare var Notification: Notification;

/**
 * The main service worker script fetching and displaying notifications to users in the background even when the client
 * site is not running. The worker is registered via the navigator.serviceWorker.register() call after the user first
 * allows notification permissions, and is a pre-requisite to subscribing for push notifications.
 *
 * For HTTPS sites, the service worker is registered site-wide at the top-level scope. For HTTP sites, the service
 * worker is registered to the iFrame pointing to subdomain.onesignal.com.
 */
export class ServiceWorker {
  static UNSUBSCRIBED_FROM_NOTIFICATIONS: boolean | undefined;

  /**
   * An incrementing integer defined in package.json. Value doesn't matter as long as it's different from the
   * previous version.
   */
  static get VERSION() {
    return Environment.version();
  }

  /**
   * Describes what context the JavaScript code is running in and whether we're running in local development mode.
   */
  static get environment() {
    return Environment;
  }

  static get log() {
    return Log;
  }

  /**
   * An interface to the browser's IndexedDB.
   */
  static get database() {
    return Database;
  }

  /**
   * Describes the current browser name and version.
   */
  static get browser() {
    return bowser;
  }

  /**
   * Allows message passing between this service worker and its controlled clients, or webpages. Controlled
   * clients include any HTTPS site page, or the nested iFrame pointing to OneSignal on any HTTP site. This allows
   * events like notification dismissed, clicked, and displayed to be fired on the clients. It also allows the
   * clients to communicate with the service worker to close all active notifications.
   */
  static get workerMessenger(): WorkerMessenger {
    if (!(self as any).workerMessenger) {
      (self as any).workerMessenger = new WorkerMessenger(null);
    }
    return (self as any).workerMessenger;
  }

  /**
   * Service worker entry point.
   */
  static run() {
    self.addEventListener('push', ServiceWorker.onPushReceived);
    self.addEventListener('notificationclose', ServiceWorker.onNotificationClosed);
    self.addEventListener('notificationclick', event => event.waitUntil(ServiceWorker.onNotificationClicked(event)));
    self.addEventListener('install', ServiceWorker.onServiceWorkerInstalled);
    self.addEventListener('activate', ServiceWorker.onServiceWorkerActivated);
    self.addEventListener('pushsubscriptionchange', (event: PushSubscriptionChangeEvent) => {
      event.waitUntil(ServiceWorker.onPushSubscriptionChange(event))
    });


    self.addEventListener('message', (event: ExtendableMessageEvent) => {
      const data: WorkerMessengerMessage = event.data;
      if (!data || !data.command) {
        return;
      }
      const payload = data.payload;

      switch(data.command) {
        case WorkerMessengerCommand.SessionUpsert:
          Log.debug("[Service Worker] Received SessionUpsert", payload);
          ServiceWorker.debounceRefreshSession(event, payload as UpsertSessionPayload);
          break;
        case WorkerMessengerCommand.SessionDeactivate:
          Log.debug("[Service Worker] Received SessionDeactivate", payload);
          ServiceWorker.debounceRefreshSession(event, payload as DeactivateSessionPayload);
          break;
        default:
          return;
      }
    });
    /*
      According to
      https://w3c.github.io/ServiceWorker/#run-service-worker-algorithm:

      "user agents are encouraged to show a warning that the event listeners
      must be added on the very first evaluation of the worker script."

      We have to register our event handler statically (not within an
      asynchronous method) so that the browser can optimize not waking up the
      service worker for events that aren't known for sure to be listened for.

      Also see: https://github.com/w3c/ServiceWorker/issues/1156
    */
    Log.debug('Setting up message listeners.');
    // self.addEventListener('message') is statically added inside the listen() method
    ServiceWorker.workerMessenger.listen();
    // Install messaging event handlers for page <-> service worker communication
    ServiceWorker.setupMessageListeners();
  }

  static async getAppId(): Promise<string> {
    if (self.location.search) {
      const match = self.location.search.match(/appId=([0-9a-z-]+)&?/i);
      // Successful regex matches are at position 1
      if (match && match.length > 1) {
        const appId = match[1];
        return appId;
      }
    }
    const { appId } = await Database.getAppConfig();
    return appId;
  }

  static setupMessageListeners() {
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.WorkerVersion, _ => {
      Log.debug('[Service Worker] Received worker version message.');
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.WorkerVersion, Environment.version());
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.Subscribe, async (appConfigBundle: any) => {
      const appConfig = appConfigBundle;
      Log.debug('[Service Worker] Received subscribe message.');
      const context = new ContextSW(appConfig);
      const rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.ResubscribeExisting);
      const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.Subscribe, subscription.serialize());
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.SubscribeNew, async (appConfigBundle: any) => {
      const appConfig = appConfigBundle;
      Log.debug('[Service Worker] Received subscribe new message.');
      const context = new ContextSW(appConfig);
      const rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew);
      const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.SubscribeNew, subscription.serialize());
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpSubscriptionState, async (_appConfigBundle: any) => {
      Log.debug('[Service Worker] Received AMP subscription state message.');
      const pushSubscription = await self.registration.pushManager.getSubscription();
      if (!pushSubscription) {
        ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscriptionState, false);
      } else {
        const permission = await self.registration.pushManager.permissionState(pushSubscription.options);
        const { optedOut } = await Database.getSubscription();
        const isSubscribed = !!pushSubscription && permission === "granted" && optedOut !== true;
        ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscriptionState, isSubscribed);
      }
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpSubscribe, async () => {
      Log.debug('[Service Worker] Received AMP subscribe message.');
      const appId = await ServiceWorker.getAppId();
      const appConfig = await ConfigHelper.getAppConfig({ appId }, OneSignalApiSW.downloadServerAppConfig);
      const context = new ContextSW(appConfig);
      const rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.ResubscribeExisting);
      const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscribe, subscription.deviceId);
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpUnsubscribe, async () => {
      Log.debug('[Service Worker] Received AMP unsubscribe message.');
      const appId = await ServiceWorker.getAppId();
      const appConfig = await ConfigHelper.getAppConfig({ appId }, OneSignalApiSW.downloadServerAppConfig);
      const context = new ContextSW(appConfig);
      await context.subscriptionManager.unsubscribe(UnsubscriptionStrategy.MarkUnsubscribed);
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpUnsubscribe, null);
    });
    ServiceWorker.workerMessenger.on(
      WorkerMessengerCommand.AreYouVisibleResponse, async (payload: PageVisibilityResponse) => {
        Log.debug('[Service Worker] Received response for AreYouVisible', payload);
        if (!self.clientsStatus) { return; }

        const timestamp = payload.timestamp;
        if (self.clientsStatus.timestamp !== timestamp) { return; }
        
        self.clientsStatus.receivedResponsesCount++;
        if (payload.focused) {
          self.clientsStatus.hasAnyActiveSessions = true;
        }
      }
    );
    ServiceWorker.workerMessenger.on(
      WorkerMessengerCommand.SetLogging, async (payload: {shouldLog: boolean}) => {
        if (payload.shouldLog) {
          self.shouldLog = true;
        } else {
          self.shouldLog = undefined;
        }
      }
    );
  }

  /**
   * Occurs when a push message is received.
   * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle
   * notifications.
   */
  static onPushReceived(event: PushEvent): void {
    Log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)}):`, Utils.getConsoleStyle('code'), event);

    event.waitUntil(
        ServiceWorker.parseOrFetchNotifications(event)
            .then(async (notifications: any) => {
              //Display push notifications in the order we received them
              const notificationEventPromiseFns = [];
              const notificationReceivedPromises: Promise<void>[] = [];
              const appId = await Database.get<string>("Ids", "appId");

              for (let rawNotification of notifications) {
                Log.debug('Raw Notification from OneSignal:', rawNotification);
                let notification = ServiceWorker.buildStructuredNotificationObject(rawNotification);

                const notificationReceived: NotificationReceived = {
                  notificationId: notification.id,
                  appId,
                  url: notification.url,
                  timestamp: new Date().getTime(),
                };
                notificationReceivedPromises.push(Database.put("NotificationReceived", notificationReceived));
                // TODO: decide what to do with all the notif received promises
                // Probably should have it's own error handling but not blocking the rest of the execution?

                // Never nest the following line in a callback from the point of entering from retrieveNotifications
                notificationEventPromiseFns.push((notif => {
                  return ServiceWorker.displayNotification(notif)
                      .then(() => {
                        return ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.NotificationDisplayed, notif).catch(e => Log.error(e))
                      })
                      .then(() => ServiceWorker.executeWebhooks('notification.displayed', notif)
                      .then(() => ServiceWorker.sendConfirmedDelivery(notif)).catch(e => Log.error(e)));
                }).bind(null, notification));
              }

              return notificationEventPromiseFns.reduce((p, fn) => {
                return p = p.then(fn);
               }, Promise.resolve());
            })
            .catch(e => {
              Log.debug('Failed to display a notification:', e);
              if (ServiceWorker.UNSUBSCRIBED_FROM_NOTIFICATIONS) {
                Log.debug('Because we have just unsubscribed from notifications, we will not show anything.');
                return undefined;
              }
            })
    )
  }

  /**
   * Makes a POST call to a specified URL to forward certain events.
   * @param event The name of the webhook event. Affects the DB key pulled for settings and the final event the user
   *              consumes.
   * @param notification A JSON object containing notification details the user consumes.
   * @returns {Promise}
   */
  static async executeWebhooks(event: string, notification: any): Promise<Response | null> {
    const webhookTargetUrl = await Database.get<string>('Options', `webhooks.${event}`);
    if (!webhookTargetUrl)
      return null;

    const { deviceId } = await Database.getSubscription();
    const isServerCorsEnabled = await Database.get<boolean>('Options', 'webhooks.cors');

    // JSON.stringify() does not include undefined values
    // Our response will not contain those fields here which have undefined values
    const postData = {
      event: event,
      id: notification.id,
      userId: deviceId,
      action: notification.action,
      buttons: notification.buttons,
      heading: notification.heading,
      content: notification.content,
      url: notification.url,
      icon: notification.icon,
      data: notification.data
    };
    const fetchOptions: RequestInit = {
      method: 'post',
      mode: 'no-cors',
      body: JSON.stringify(postData),
    };

    if (isServerCorsEnabled) {
      fetchOptions.mode = 'cors';
      fetchOptions.headers = {
        'X-OneSignal-Event': event,
        'Content-Type': 'application/json'
      };
    }
    Log.debug(
      `Executing ${event} webhook ${isServerCorsEnabled ? 'with' : 'without'} CORS %cPOST ${webhookTargetUrl}`,
      Utils.getConsoleStyle('code'), ':', postData
    );
    return await fetch(webhookTargetUrl, fetchOptions);
  }

  /**
   * Makes a PUT call to log the delivery of the notification
   * @param notification A JSON object containing notification details.
   * @returns {Promise}
   */
  static async sendConfirmedDelivery(notification: any): Promise<Response | null> {
    if (!notification)
      return null;

    // Received receipts enabled?
    if (notification.rr !== "y")
      return null;

    const appId = await ServiceWorker.getAppId();
    const { deviceId } = await Database.getSubscription();

    // app and notification ids are required, decided to exclude deviceId from required params
    // In rare case we don't have it we can still report as confirmed to backend to increment count
    const hasRequiredParams = !!(appId && notification.id);
    if (!hasRequiredParams) {
      return null;
    }
 
    // JSON.stringify() does not include undefined values
    // Our response will not contain those fields here which have undefined values
    const postData = {
      player_id : deviceId, 
      app_id : appId
    };
    
    Log.debug(`Called %csendConfirmedDelivery(${
      JSON.stringify(notification, null, 4)
    })`, Utils.getConsoleStyle('code'));
    
    return await OneSignalApiBase.put(`notifications/${notification.id}/report_received`, postData);
  }

  /**
   * Gets an array of active window clients along with whether each window client is the HTTP site's iFrame or an
   * HTTPS site page.
   * An active window client is a browser tab that is controlled by the service worker.
   * Technically, this list should only ever contain clients that are iFrames, or clients that are HTTPS site pages,
   * and not both. This doesn't really matter though.
   * @returns {Promise}
   */
  static async getActiveClients(): Promise<Array<OSWindowClient>> {
    const windowClients: ReadonlyArray<Client> = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    const activeClients: Array<OSWindowClient> = [];

    for (const client of windowClients) {
      const windowClient: OSWindowClient = client as OSWindowClient;
      windowClient.isSubdomainIframe = false;
      // Test if this window client is the HTTP subdomain iFrame pointing to subdomain.onesignal.com
      if (client.frameType && client.frameType === 'nested') {
        // Subdomain iFrames point to 'https://subdomain.onesignal.com...'
        if (!Utils.contains(client.url, '.os.tc') &&
            !Utils.contains(client.url, '.onesignal.com')) {
          continue;
        }
        // Indicates this window client is an HTTP subdomain iFrame
        windowClient.isSubdomainIframe = true;
      }
      activeClients.push(windowClient);
    }
    return activeClients;
  }

  static async updateSessionBasedOnHasActive(
    event: ExtendableMessageEvent,
    hasAnyActiveSessions: boolean, options: DeactivateSessionPayload
  ) {
    if (hasAnyActiveSessions) {
      await ServiceWorkerHelper.upsertSession(
        options.sessionThreshold,
        options.enableSessionDuration,
        options.deviceRecord!,
        options.deviceId,
        options.sessionOrigin,
        options.outcomesConfig
      );
    } else {
      const cancelableFinalize = await ServiceWorkerHelper.deactivateSession(
        options.sessionThreshold, options.enableSessionDuration, options.outcomesConfig
      );
      if (cancelableFinalize) {
        self.cancel = cancelableFinalize.cancel;
        event.waitUntil(cancelableFinalize.promise);
      }
    }
  }

  static async refreshSession(event: ExtendableMessageEvent, options: DeactivateSessionPayload): Promise<void> {
    Log.debug("[Service Worker] refreshSession");
    /**
     * if https -> getActiveClients -> check for the first focused
     * unfortunately, not enough for safari, it always returns false for focused state of a client
     * have to workaround it with messaging to the client.
     *
     * if http, also have to workaround with messaging:
     *   SW to iframe -> iframe to page -> page to iframe -> iframe to SW
     */
    if (options.isHttps) {
      const windowClients: ReadonlyArray<Client> = await self.clients.matchAll(
        { type: "window", includeUncontrolled: false }
      );

      if (options.isSafari) {
        await ServiceWorker.checkIfAnyClientsFocusedAndUpdateSession(event, windowClients, options);
      } else {
        const hasAnyActiveSessions: boolean = windowClients.some(w => (w as WindowClient).focused);
        Log.debug("[Service Worker] isHttps hasAnyActiveSessions", hasAnyActiveSessions);
        await ServiceWorker.updateSessionBasedOnHasActive(event, hasAnyActiveSessions, options);
      }
      return;
    } else {
      const osClients = await ServiceWorker.getActiveClients();
      await ServiceWorker.checkIfAnyClientsFocusedAndUpdateSession(event, osClients, options);
    }
  }

  static async checkIfAnyClientsFocusedAndUpdateSession(
    event: ExtendableMessageEvent,
    windowClients: ReadonlyArray<Client>,
    sessionInfo: DeactivateSessionPayload
  ): Promise<void> {
    const timestamp = new Date().getTime();
    self.clientsStatus = {
      timestamp,
      sentRequestsCount: 0,
      receivedResponsesCount: 0,
      hasAnyActiveSessions: false,
    };
    const payload: PageVisibilityRequest = { timestamp };
    windowClients.forEach(c => {
      if (self.clientsStatus) {
        // keeping track of number of sent requests mostly for debugging purposes
        self.clientsStatus.sentRequestsCount++;
      }
      c.postMessage({ command: WorkerMessengerCommand.AreYouVisible, payload });
    });
    const updateOnHasActive = async () => {
      if (!self.clientsStatus) { return; }
      if (self.clientsStatus.timestamp !== timestamp) { return; }

      Log.debug("updateSessionBasedOnHasActive", self.clientsStatus);
      await ServiceWorker.updateSessionBasedOnHasActive(event,
        self.clientsStatus.hasAnyActiveSessions, sessionInfo);
      self.clientsStatus = undefined;
    }
    const getClientStatusesCancelable = cancelableTimeout(updateOnHasActive, 0.5);
    self.cancel = getClientStatusesCancelable.cancel;
    event.waitUntil(getClientStatusesCancelable.promise);
  }

  static debounceRefreshSession(event: ExtendableMessageEvent, options: DeactivateSessionPayload) {
    Log.debug("[Service Worker] debounceRefreshSession", options);

    if (self.cancel) {
      self.cancel();
      self.cancel = undefined;
    }

    const executeRefreshSession = async () => {
      await ServiceWorker.refreshSession(event, options);
    };

    const cancelableRefreshSession = cancelableTimeout(executeRefreshSession, 1);
    self.cancel = cancelableRefreshSession.cancel;
    event.waitUntil(cancelableRefreshSession.promise);
  }

  /**
   * Constructs a structured notification object from the raw notification fetched from OneSignal's server. This
   * object is passed around from event to event, and is also returned to the host page for notification event details.
   * Constructed in onPushReceived, and passed along to other event handlers.
   * @param rawNotification The raw notification JSON returned from OneSignal's server.
   */
  static buildStructuredNotificationObject(rawNotification) {
    let notification: any = {
      id: rawNotification.custom.i,
      heading: rawNotification.title,
      content: rawNotification.alert,
      data: rawNotification.custom.a,
      url: rawNotification.custom.u,
      rr: rawNotification.custom.rr, // received receipts
      icon: rawNotification.icon,
      image: rawNotification.image,
      tag: rawNotification.tag,
      badge: rawNotification.badge,
      vibrate: rawNotification.vibrate
    };

    // Add action buttons
    if (rawNotification.o) {
      notification.buttons = [];
      for (let rawButton of rawNotification.o) {
        notification.buttons.push({
                                    action: rawButton.i,
                                    title: rawButton.n,
                                    icon: rawButton.p,
                                    url: rawButton.u
                                  });
      }
    }
    return Utils.trimUndefined(notification);
  }

  /**
   * Given an image URL, returns a proxied HTTPS image using the https://images.weserv.nl service.
   * For a null image, returns null so that no icon is displayed.
   * If the image protocol is HTTPS, or origin contains localhost or starts with 192.168.*.*, we do not proxy the image.
   * @param imageUrl An HTTP or HTTPS image URL.
   */
  static ensureImageResourceHttps(imageUrl) {
    if (imageUrl) {
      try {
        let parsedImageUrl = new URL(imageUrl);
        if (parsedImageUrl.hostname === 'localhost' ||
            parsedImageUrl.hostname.indexOf('192.168') !== -1 ||
            parsedImageUrl.hostname === '127.0.0.1' ||
            parsedImageUrl.protocol === 'https:') {
          return imageUrl;
        }
        if (parsedImageUrl.hostname === 'i0.wp.com' ||
            parsedImageUrl.hostname === 'i1.wp.com' ||
            parsedImageUrl.hostname === 'i2.wp.com' ||
            parsedImageUrl.hostname === 'i3.wp.com') {
          /* Their site already uses Jetpack, just make sure Jetpack is HTTPS */
          return `https://${parsedImageUrl.hostname}${parsedImageUrl.pathname}`
        }
        /* HTTPS origin hosts can be used by prefixing the hostname with ssl: */
        let replacedImageUrl = parsedImageUrl.host + parsedImageUrl.pathname;
        return `https://i0.wp.com/${replacedImageUrl}`;
      } catch (e) { }
    } else return null;
  }

  /**
   * Given a structured notification object, HTTPS-ifies the notification icons and action button icons, if they exist.
   */
  static ensureNotificationResourcesHttps(notification) {
    if (notification) {
      if (notification.icon) {
        notification.icon = ServiceWorker.ensureImageResourceHttps(notification.icon);
      }
      if (notification.image) {
        notification.image = ServiceWorker.ensureImageResourceHttps(notification.image);
      }
      if (notification.buttons && notification.buttons.length > 0) {
        for (let button of notification.buttons) {
          if (button.icon) {
            button.icon = ServiceWorker.ensureImageResourceHttps(button.icon);
          }
        }
      }
    }
  }

  /**
   * Actually displays a visible notification to the user.
   * Any event needing to display a notification calls this so that all the display options can be centralized here.
   * @param notification A structured notification object.
   */
  static async displayNotification(notification, overrides?) {
    Log.debug(`Called %cdisplayNotification(${JSON.stringify(notification, null, 4)}):`, Utils.getConsoleStyle('code'), notification);

    // Use the default title if one isn't provided
    const defaultTitle = await ServiceWorker._getTitle();
    // Use the default icon if one isn't provided
    const defaultIcon = await Database.get('Options', 'defaultIcon');
    // Get option of whether we should leave notification displaying indefinitely
    const persistNotification = await Database.get('Options', 'persistNotification');
    // Get app ID for tag value
    const appId = await ServiceWorker.getAppId();

    notification.heading = notification.heading ? notification.heading : defaultTitle;
    notification.icon = notification.icon ? notification.icon : (defaultIcon ? defaultIcon : undefined);

    const extra: any = {};
    extra.tag = notification.tag || appId;
    extra.persistNotification = persistNotification !== false;

    // Allow overriding some values
    if (!overrides)
      overrides = {};
    notification = {...notification, ...overrides};

    ServiceWorker.ensureNotificationResourcesHttps(notification);

    let notificationOptions = {
      body: notification.content,
      icon: notification.icon,
      /*
       On Chrome 56, a large image can be displayed:
       https://bugs.chromium.org/p/chromium/issues/detail?id=614456
       */
      image: notification.image,
      /*
       On Chrome 44+, use this property to store extra information which
       you can read back when the notification gets invoked from a
       notification click or dismissed event. We serialize the
       notification in the 'data' field and read it back in other events.
       See:
       https://developers.google.com/web/updates/2015/05/notifying-you-of-changes-to-notifications?hl=en
       */
      data: notification,
      /*
       On Chrome 48+, action buttons show below the message body of the
       notification. Clicking either button takes the user to a link. See:
       https://developers.google.com/web/updates/2016/01/notification-actions
       */
      actions: notification.buttons,
      /*
       Tags are any string value that groups notifications together. Two
       or notifications sharing a tag replace each other.
       */
      tag: extra.tag,
      /*
       On Chrome 47+ (desktop), notifications will be dismissed after 20
       seconds unless requireInteraction is set to true. See:
       https://developers.google.com/web/updates/2015/10/notification-requireInteractiom
       */
      requireInteraction: extra.persistNotification,
      /*
       On Chrome 50+, by default notifications replacing
       identically-tagged notifications no longer vibrate/signal the user
       that a new notification has come in. This flag allows subsequent
       notifications to re-alert the user. See:
       https://developers.google.com/web/updates/2016/03/notifications
       */
      renotify: true,
      /*
       On Chrome 53+, returns the URL of the image used to represent the
       notification when there is not enough space to display the
       notification itself.

       The URL of an image to represent the notification when there is not
       enough space to display the notification itself such as, for
       example, the Android Notification Bar. On Android devices, the
       badge should accommodate devices up to 4x resolution, about 96 by
       96 px, and the image will be automatically masked.
       */
      badge: notification.badge,
      /*
      A vibration pattern to run with the display of the notification. A
      vibration pattern can be an array with as few as one member. The
      values are times in milliseconds where the even indices (0, 2, 4,
      etc.) indicate how long to vibrate and the odd indices indicate how
      long to pause. For example [300, 100, 400] would vibrate 300ms,
      pause 100ms, then vibrate 400ms.
       */
      vibrate: notification.vibrate
    };

    notificationOptions = ServiceWorker.fixPlatformSpecificDisplayIssues(notificationOptions);
    return self.registration.showNotification(notification.heading, notificationOptions);
  }

  /**
   * Fixes display issue with some notification options causing the notification to never show!
   * This happens when setting requireInteraction = true on the following platforms;
   *   * macOS 10.15+ - Chrome based browsers
   *      - https://bugs.chromium.org/p/chromium/issues/detail?id=1007418
   *   * macOS 10.14+ - Opera
   *      - https://forums.opera.com/topic/31334/push-notifications-with-requireinteraction-true-do-not-display-on-macos
   * @param notificationOptions - Value passed to ServiceWorkerRegistration.prototype.showNotification
   */
  static fixPlatformSpecificDisplayIssues(notificationOptions: any): any {
    const clone = { ...notificationOptions };
    const browser = OneSignalUtils.redetectBrowserUserAgent();

    if (browser.chrome && browser.mac && Utils.isVersionAtLeast(browser.osversion, 10.15)) {
      clone.requireInteraction = false;
    }
    else if (browser.opera && browser.mac && Utils.isVersionAtLeast(browser.osversion, 10.14)) {
      clone.requireInteraction = false;
    }

    return clone;
  }

  /**
   * Returns false if the given URL matches a few special URLs designed to skip opening a URL when clicking a
   * notification. Otherwise returns true and the link will be opened.
   * @param url
     */
  static shouldOpenNotificationUrl(url) {
    return (url !== 'javascript:void(0);' &&
            url !== 'do_not_open' &&
            !Utils.contains(url, '_osp=do_not_open'));
  }

  /**
   * Occurs when a notification is dismissed by the user (clicking the 'X') or all notifications are cleared.
   * Supported on: Chrome 50+ only
   */
  static onNotificationClosed(event) {
    Log.debug(`Called %conNotificationClosed(${JSON.stringify(event, null, 4)}):`, Utils.getConsoleStyle('code'), event);
    let notification = event.notification.data;

    ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.NotificationDismissed, notification).catch(e => Log.error(e))
    event.waitUntil(
        ServiceWorker.executeWebhooks('notification.dismissed', notification)
    );
  }

  /**
   * After clicking a notification, determines the URL to open based on whether an action button was clicked or the
   * notification body was clicked.
   */
  static async getNotificationUrlToOpen(notification): Promise<string> {
    // Defaults to the URL the service worker was registered
    // TODO: This should be fixed for HTTP sites
    let launchUrl = self.registration.scope;

    // Use the user-provided default URL if one exists
    const { defaultNotificationUrl: dbDefaultNotificationUrl } = await Database.getAppState();
    if (dbDefaultNotificationUrl)
      launchUrl = dbDefaultNotificationUrl;

    // If the user clicked an action button, use the URL provided by the action button
    // Unless the action button URL is null
    if (notification.action) {
      // Find the URL tied to the action button that was clicked
      for (let button of notification.buttons) {
        if (button.action === notification.action &&
            button.url &&
            button.url !== '') {
          launchUrl = button.url;
        }
      }
    } else if (notification.url &&
               notification.url !== '') {
      // The user clicked the notification body instead of an action button
      launchUrl = notification.url;
    }

    return launchUrl;
  }

  /**
   * Occurs when the notification's body or action buttons are clicked. Does not occur if the notification is
   * dismissed by clicking the 'X' icon. See the notification close event for the dismissal event.
   */
  static async onNotificationClicked(event: NotificationEventInit) {
    Log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, Utils.getConsoleStyle('code'), event);

    // Close the notification first here, before we do anything that might fail
    event.notification.close();

    const notificationData = event.notification.data;

    // Chrome 48+: Get the action button that was clicked
    if (event.action)
      notificationData.action = event.action;

    let notificationClickHandlerMatch = 'exact';
    let notificationClickHandlerAction = 'navigate';

    const matchPreference = await Database.get<string>('Options', 'notificationClickHandlerMatch');
    if (matchPreference)
      notificationClickHandlerMatch = matchPreference;

    const actionPreference = await this.database.get<string>('Options', 'notificationClickHandlerAction');
    if (actionPreference)
      notificationClickHandlerAction = actionPreference;

    const launchUrl: string = await ServiceWorker.getNotificationUrlToOpen(notificationData);
    const notificationOpensLink: boolean = ServiceWorker.shouldOpenNotificationUrl(launchUrl);
    const appId = await Database.get<string>("Ids", "appId");
    const deviceType = DeviceRecord.prototype.getDeliveryPlatform();

    let saveNotificationClickedPromise: Promise<void> | undefined;
    const notificationClicked: NotificationClicked = {
      notificationId: notificationData.id,
      appId,
      url: launchUrl,
      timestamp: new Date().getTime(),
    }
    Log.info("NotificationClicked", notificationClicked);
    saveNotificationClickedPromise = (async (notificationClicked) => {
      try {
        const existingSession = await Database.getCurrentSession();
        if (existingSession && existingSession.status === SessionStatus.Active) {
          return;
        }
        await Database.put("NotificationClicked", notificationClicked);

        // upgrade existing session to be directly attributed to the notif
        // if it results in re-focusing the site
        if (existingSession) {
          existingSession.notificationId = notificationClicked.notificationId;
          await Database.upsertSession(existingSession);
        }
      } catch(e) {
        Log.error("Failed to save clicked notification.", e);
      }
    })(notificationClicked);

    // Start making REST API requests BEFORE self.clients.openWindow is called.
    // It will cause the service worker to stop on Chrome for Android when site is added to the home screen.
    const { deviceId } = await Database.getSubscription();
    const convertedAPIRequests = ServiceWorker.sendConvertedAPIRequests(appId, deviceId, notificationData, deviceType);

    /*
     Check if we can focus on an existing tab instead of opening a new url.
     If an existing tab with exactly the same URL already exists, then this existing tab is focused instead of
     an identical new tab being created. With a special setting, any existing tab matching the origin will
     be focused instead of an identical new tab being created.
     */
    const activeClients = await ServiceWorker.getActiveClients();
    let doNotOpenLink = false;
    for (const client of activeClients) {
      let clientUrl = client.url;
      if ((client as any).isSubdomainIframe) {
        const lastKnownHostUrl = await Database.get<string>('Options', 'lastKnownHostUrl');
        // TODO: clientUrl is being overwritten by defaultUrl and lastKnownHostUrl.
        //       Should only use clientUrl if it is not null.
        //       Also need to decide which to use over the other.
        clientUrl = lastKnownHostUrl;
        if (!lastKnownHostUrl) {
          clientUrl = await Database.get<string>('Options', 'defaultUrl');
        }
      }
      let clientOrigin = '';
      try {
        clientOrigin = new URL(clientUrl).origin;
      } catch (e) {
        Log.error(`Failed to get the HTTP site's actual origin:`, e);
      }
      let launchOrigin = null;
      try {
        // Check if the launchUrl is valid; it can be null
        launchOrigin = new URL(launchUrl).origin;
      } catch (e) {}

      if ((notificationClickHandlerMatch === 'exact' && clientUrl === launchUrl) ||
        (notificationClickHandlerMatch === 'origin' && clientOrigin === launchOrigin)) {
        if ((client['isSubdomainIframe'] && clientUrl === launchUrl) ||
            (!client['isSubdomainIframe'] && client.url === launchUrl) ||
          (notificationClickHandlerAction === 'focus' && clientOrigin === launchOrigin)) {
          ServiceWorker.workerMessenger.unicast(WorkerMessengerCommand.NotificationClicked, notificationData, client);
            try {
              if (client instanceof WindowClient)
                await client.focus();
            } catch (e) {
              Log.error("Failed to focus:", client, e);
            }
        } else {
          /*
          We must focus first; once the client navigates away, it may not be to a service worker-controlled page, and
          the client ID may change, making it unable to focus.

          client.navigate() is available on Chrome 49+ and Firefox 50+.
           */
          if (client['isSubdomainIframe']) {
            try {
              Log.debug('Client is subdomain iFrame. Attempting to focus() client.');
              if (client instanceof WindowClient)
                await client.focus();
            } catch (e) {
              Log.error("Failed to focus:", client, e);
            }
            if (notificationOpensLink) {
              Log.debug(`Redirecting HTTP site to ${launchUrl}.`);
              await Database.put("NotificationOpened", { url: launchUrl, data: notificationData, timestamp: Date.now() });
              ServiceWorker.workerMessenger.unicast(WorkerMessengerCommand.RedirectPage, launchUrl, client);
            } else {
              Log.debug('Not navigating because link is special.')
            }
          }
          else if (client instanceof WindowClient && client.navigate) {
            try {
              Log.debug('Client is standard HTTPS site. Attempting to focus() client.');
              if (client instanceof WindowClient)
                await client.focus();
            } catch (e) {
              Log.error("Failed to focus:", client, e);
            }
            try {
              if (notificationOpensLink) {
                Log.debug(`Redirecting HTTPS site to (${launchUrl}).`)
                await Database.put("NotificationOpened", { url: launchUrl, data: notificationData, timestamp: Date.now() });
                await client.navigate(launchUrl);
              } else {
                Log.debug('Not navigating because link is special.')
              }
            } catch (e) {
              Log.error("Failed to navigate:", client, launchUrl, e);
            }
          } else {
            // If client.navigate() isn't available, we have no other option but to open a new tab to the URL.
            await Database.put("NotificationOpened", { url: launchUrl, data: notificationData, timestamp: Date.now() });
            await ServiceWorker.openUrl(launchUrl);
          }
        }
        doNotOpenLink = true;
        break;
      }
    }

    if (notificationOpensLink && !doNotOpenLink) {
      await Database.put("NotificationOpened", { url: launchUrl, data: notificationData, timestamp: Date.now() });
      await ServiceWorker.openUrl(launchUrl);
    }
    if (saveNotificationClickedPromise) {
      await saveNotificationClickedPromise;
    }

    return await convertedAPIRequests;
  }

  /**
   * Makes network calls for the notification open event to;
   *    1. OneSignal.com to increase the notification open count.
   *    2. A website developer defined webhook URL, if set.
   */
  static async sendConvertedAPIRequests(
    appId: string | undefined | null,
    deviceId: string | undefined,
    notificationData: any,
    deviceType: number): Promise<void> {

    if (!notificationData.id) {
      console.error("No notification id, skipping networks calls to report open!");
      return;
    }

    let onesignalRestPromise: Promise<any> | undefined;

    if (appId) {
      onesignalRestPromise = OneSignalApiBase.put(`notifications/${notificationData.id}`, {
        app_id: appId,
        player_id: deviceId,
        opened: true,
        device_type: deviceType
      });
    }
    else
      console.error("No app Id, skipping OneSignal API call for notification open!");

    await ServiceWorker.executeWebhooks('notification.clicked', notificationData);
    if (onesignalRestPromise)
      await onesignalRestPromise;
  }

  /**
   * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
   * @param url May not be well-formed.
   */
  static async openUrl(url: string): Promise<Client | null> {
    Log.debug('Opening notification URL:', url);
    try {
      return await self.clients.openWindow(url);
    } catch (e) {
      Log.warn(`Failed to open the URL '${url}':`, e);
      return null;
    }
  }

  static onServiceWorkerInstalled(event) {
    Log.info("Installing service worker...");
    // At this point, the old service worker is still in control
    event.waitUntil(self.skipWaiting());
  }

  /*
   1/11/16: Enable the waiting service worker to immediately become the active service worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
   */
  static onServiceWorkerActivated(event) {
    // The old service worker is gone now
    Log.info(`%cOneSignal Service Worker activated (version ${Environment.version()}, ${SdkEnvironment.getWindowEnv().toString()} environment).`, Utils.getConsoleStyle('bold'));
    event.waitUntil(self.clients.claim());
  }

  static async onPushSubscriptionChange(event: PushSubscriptionChangeEvent) {
    Log.debug(`Called %conPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`, Utils.getConsoleStyle('code'), event);

    const appId = await ServiceWorker.getAppId();
    if (!appId) {
      // Without an app ID, we can't make any calls
      return;
    }
    const appConfig = await ConfigHelper.getAppConfig({ appId }, OneSignalApiSW.downloadServerAppConfig);
    if (!appConfig) {
      // Without a valid app config (e.g. deleted app), we can't make any calls
      return;
    }
    const context = new ContextSW(appConfig);

    // Get our current device ID
    let deviceIdExists: boolean;
    {
      let { deviceId } = await Database.getSubscription();
      deviceIdExists = !!deviceId;
      if (!deviceIdExists && event.oldSubscription) {
        // We don't have the device ID stored, but we can look it up from our old subscription
        deviceId = await OneSignalApiSW.getUserIdFromSubscriptionIdentifier(
          appId,
          PushDeviceRecord.prototype.getDeliveryPlatform(),
          event.oldSubscription.endpoint
        );

        // Store the device ID, so it can be looked up when subscribing
        const subscription = await Database.getSubscription();
        subscription.deviceId = deviceId;
        await Database.setSubscription(subscription);
      }
      deviceIdExists = !!deviceId;
    }

    // Get our new push subscription
    let rawPushSubscription: RawPushSubscription;

    // Set it initially by the provided new push subscription
    const providedNewSubscription = event.newSubscription;
    if (providedNewSubscription) {
      rawPushSubscription = RawPushSubscription.setFromW3cSubscription(providedNewSubscription);
    } else {
      // Otherwise set our push registration by resubscribing
      try {
        rawPushSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew);
      } catch (e) {
        // Let rawPushSubscription be null
      }
    }
    const hasNewSubscription = !!rawPushSubscription;

    if (!deviceIdExists && !hasNewSubscription) {
      await Database.remove('Ids', 'userId');
      await Database.remove('Ids', 'registrationId');
    } else {
      /*
        Determine subscription state we should set new record to.

        If the permission is revoked, we should set the subscription state to permission revoked.
       */
      let subscriptionState: null | SubscriptionStateKind = null;
      const pushPermission = Notification.permission;

      if (pushPermission !== "granted") {
        subscriptionState = SubscriptionStateKind.PermissionRevoked;
      } else if (!rawPushSubscription) {
        /*
          If it's not a permission revoked issue, the subscription expired or was revoked by the
          push server.
         */
        subscriptionState = SubscriptionStateKind.PushSubscriptionRevoked;
      }

      // rawPushSubscription may be null if no push subscription was retrieved
      await context.subscriptionManager.registerSubscription(
        rawPushSubscription,
        subscriptionState
      );
    }
  }

  /**
   * Returns a promise that is fulfilled with either the default title from the database (first priority) or the page title from the database (alternate result).
   */
  static _getTitle() {
    return new Promise(resolve => {
      Promise.all([Database.get('Options', 'defaultTitle'), Database.get('Options', 'pageTitle')])
        .then(([defaultTitle, pageTitle]) => {
          if (defaultTitle !== null) {
            resolve(defaultTitle);
          }
          else if (pageTitle != null) {
            resolve(pageTitle);
          }
          else {
            resolve('');
          }
        });
    });
  }

  /**
   * Returns an array of raw notification objects, read from the event.data.payload property
   * @param event
   * @returns An array of notifications. The new web push protocol will only ever contain one notification, however
   * an array is returned for backwards compatibility with the rest of the service worker plumbing.
     */
  static parseOrFetchNotifications(event) {
    if (!event || !event.data) {
      return Promise.reject("Missing event.data on push payload!");
    }

    const isValidPayload = ServiceWorker.isValidPushPayload(event.data);
    if (isValidPayload) {
      Log.debug("Received a valid encrypted push payload.");
      return Promise.resolve([event.data.json()]);
    }

    /*
     We received a push message payload from another service provider or a malformed
     payload. The last received notification will be displayed.
    */
    return Promise.reject(`Unexpected push message payload received: ${event.data}`);
  }

  /**
   * Returns true if the raw data payload is a OneSignal push message in the format of the new web push protocol.
   * Otherwise returns false.
   * @param rawData The raw PushMessageData from the push event's event.data, not already parsed to JSON.
   */
  static isValidPushPayload(rawData) {
    try {
      const payload = rawData.json();
      if (payload &&
          payload.custom &&
          payload.custom.i &&
          OneSignalUtils.isValidUuid(payload.custom.i)) {
        return true;
      } else {
        Log.debug('isValidPushPayload: Valid JSON but missing notification UUID:', payload);
        return false;
      }
    } catch (e) {
      Log.debug('isValidPushPayload: Parsing to JSON failed with:', e);
      return false;
    }
  }
}

// Expose this class to the global scope
if (typeof self === "undefined" &&
    typeof global !== "undefined") {
  (global as any).OneSignalWorker = ServiceWorker;
} else {
  (self as any).OneSignalWorker = ServiceWorker;
}

// Run our main file
if (typeof self !== "undefined") {
  ServiceWorker.run();
}
