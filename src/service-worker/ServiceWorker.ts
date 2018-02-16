import * as Browser from 'bowser';
import * as log from 'loglevel';
import * as objectAssign from 'object-assign';

import Environment from '../Environment';
import { WorkerMessenger, WorkerMessengerCommand } from '../libraries/WorkerMessenger';
import SdkEnvironment from '../managers/SdkEnvironment';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { BuildEnvironmentKind } from '../models/BuildEnvironmentKind';
import Context from '../models/Context';
import OneSignalApi from '../OneSignalApi';
import Database from '../services/Database';
import { contains, getConsoleStyle, getDeviceTypeForBrowser, isValidUuid, trimUndefined } from '../utils';
import { Uuid } from '../models/Uuid';
import { AppConfig, deserializeAppConfig } from '../models/AppConfig';
import { UnsubscriptionStrategy } from "../models/UnsubscriptionStrategy";
import ConfigManager from '../managers/ConfigManager';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { PushRegistration } from '../models/PushRegistration';

///<reference path="../../typings/globals/service_worker_api/index.d.ts"/>
declare var self: ServiceWorkerGlobalScope;


/**
 * The main service worker script fetching and displaying notifications to users in the background even when the client
 * site is not running. The worker is registered via the navigator.serviceWorker.register() call after the user first
 * allows notification permissions, and is a pre-requisite to subscribing for push notifications.
 *
 * For HTTPS sites, the service worker is registered site-wide at the top-level scope. For HTTP sites, the service
 * worker is registered to the iFrame pointing to subdomain.onesignal.com.
 */
export class ServiceWorker {
  static UNSUBSCRIBED_FROM_NOTIFICATIONS;

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
    return log;
  }

  /**
   * An interface to the browser's IndexedDB.
   */
  static get database() {
    return Database;
  }

  static get sdkEnvironment() {
    return SdkEnvironment;
  }

  /**
   * Describes the current browser name and version.
   */
  static get browser() {
    return Browser;
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
    log.debug('Setting up message listeners.');
    // self.addEventListener('message') is statically added inside the listen() method
    ServiceWorker.workerMessenger.listen();
    // Install messaging event handlers for page <-> service worker communication
    ServiceWorker.setupMessageListeners();
  }

  static async getAppId(): Promise<Uuid> {
    if (self.location.search) {
      // Successful regex matches are at position 1
      const appId = self.location.search.match(/appId=([0-9a-z-]+)&?/i)[1];
      return new Uuid(appId);
    } else {
      const { appId } = await Database.getAppConfig();
      return appId;
    }
  }

  static async setupMessageListeners() {
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.WorkerVersion, _ => {
      log.debug('[Service Worker] Received worker version message.');
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.WorkerVersion, Environment.version());
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.Subscribe, async (appConfigBundle: any) => {
      const appConfig = deserializeAppConfig(appConfigBundle);
      log.debug('[Service Worker] Received subscribe message.');
      const context = new Context(appConfig);
      const subscription = await context.subscriptionManager.subscribe();
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.Subscribe, subscription.serialize());
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpSubscriptionState, async (appConfigBundle: any) => {
      log.debug('[Service Worker] Received AMP subscription state message.');
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
      log.debug('[Service Worker] Received AMP subscribe message.');
      const appId = await ServiceWorker.getAppId();
      const appConfig = await new ConfigManager().getAppConfig({
        appId: appId.value
      });
      const context = new Context(appConfig);
      const subscription = await context.subscriptionManager.subscribe();
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscribe, subscription.deviceId);
    });
    ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpUnsubscribe, async () => {
      log.debug('[Service Worker] Received AMP unsubscribe message.');
      const appId = await ServiceWorker.getAppId();
      const appConfig = await new ConfigManager().getAppConfig({
        appId: appId.value
      });
      const context = new Context(appConfig);
      await context.subscriptionManager.unsubscribe(UnsubscriptionStrategy.MarkUnsubscribed);
      ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpUnsubscribe, null);
    });
  }

  /**
   * Occurs when a push message is received.
   * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle
   * notifications.
   */
  static onPushReceived(event) {
    log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    event.waitUntil(
        ServiceWorker.parseOrFetchNotifications(event)
            .then((notifications: any) => {
              if (!notifications || notifications.length == 0) {
                log.debug("Because no notifications were retrieved, we'll display the last known notification, so" +
                          " long as it isn't the welcome notification.");
                return ServiceWorker.displayBackupNotification();
              }

              //Display push notifications in the order we received them
              let notificationEventPromiseFns = [];

              for (let rawNotification of notifications) {
                log.debug('Raw Notification from OneSignal:', rawNotification);
                let notification = ServiceWorker.buildStructuredNotificationObject(rawNotification);

                // Never nest the following line in a callback from the point of entering from retrieveNotifications
                notificationEventPromiseFns.push((notif => {
                  return ServiceWorker.displayNotification(notif)
                      .then(() => ServiceWorker.updateBackupNotification(notif).catch(e => log.error(e)))
                      .then(() => {
                        return ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.NotificationDisplayed, notif).catch(e => log.error(e))
                      })
                      .then(() => ServiceWorker.executeWebhooks('notification.displayed', notif).catch(e => log.error(e)))
                }).bind(null, notification));
              }

              return notificationEventPromiseFns.reduce((p, fn) => {
                return p = p.then(fn);
               }, Promise.resolve());
            })
            .catch(e => {
              log.debug('Failed to display a notification:', e);
              if (ServiceWorker.UNSUBSCRIBED_FROM_NOTIFICATIONS) {
                log.debug('Because we have just unsubscribed from notifications, we will not show anything.');
                return undefined;
              } else {
                log.debug(
                    "Because a notification failed to display, we'll display the last known notification, so long as it isn't the welcome notification.");
                return ServiceWorker.displayBackupNotification();
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
  static async executeWebhooks(event, notification) {
    const {deviceId} = await Database.getSubscription();
    const isServerCorsEnabled = await Database.get<boolean>('Options', 'webhooks.cors');
    const webhookTargetUrl = await Database.get('Options', `webhooks.${event}`);

    if (webhookTargetUrl) {
      // JSON.stringify() does not include undefined values
      // Our response will not contain those fields here which have undefined values
      let postData = {
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
      let fetchOptions: any = {
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
      log.debug(`Executing ${event} webhook ${isServerCorsEnabled ? 'with' : 'without'} CORS %cPOST ${webhookTargetUrl}`, getConsoleStyle('code'), ':', postData);
      return await fetch(webhookTargetUrl, fetchOptions);
    }
  }

  /**
   * Gets an array of active window clients along with whether each window client is the HTTP site's iFrame or an
   * HTTPS site page.
   * An active window client is a browser tab that is controlled by the service worker.
   * Technically, this list should only ever contain clients that are iFrames, or clients that are HTTPS site pages,
   * and not both. This doesn't really matter though.
   * @returns {Promise}
   */
  static async getActiveClients(): Promise<Array<WindowClient>> {
    const windowClients: Array<WindowClient> = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    let activeClients: Array<WindowClient> = [];

    for (let client of windowClients) {
      // Test if this window client is the HTTP subdomain iFrame pointing to subdomain.onesignal.com
      if (client.frameType && client.frameType === 'nested') {
        // Subdomain iFrames point to 'https://subdomain.onesignal.com...'
        if (!contains(client.url, SdkEnvironment.getOneSignalApiUrl().host) &&
            !contains(client.url, '.os.tc')) {
          continue;
        }
        // Indicates this window client is an HTTP subdomain iFrame
        (client as any).isSubdomainIframe = true;
      }
      activeClients.push(client);
    }

    return activeClients;
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
    return trimUndefined(notification);
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
    log.debug(`Called %cdisplayNotification(${JSON.stringify(notification, null, 4)}):`, getConsoleStyle('code'), notification);

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
    var extra: any = {};
    extra.tag = notification.tag || appId.toString();
    if (persistNotification === 'force') {
      extra.persistNotification = true;
    } else {
      extra.persistNotification = persistNotification;
    }

    // Allow overriding some values
    if (!overrides)
      overrides = {};
    notification = objectAssign(notification, overrides);

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

    notificationOptions = ServiceWorker.filterNotificationOptions(notificationOptions, persistNotification === 'force');
    return self.registration.showNotification(notification.heading, notificationOptions);
  }

  static filterNotificationOptions(options: any, forcePersistNotifications?: boolean): any {
    /**
     * Due to Chrome 59+ notifications on Mac OS X using the native toast style
     * which limits the number of characters available to display the subdomain
     * to 14 with requireInteraction and 28 without, we force Mac OS X Chrome
     * notifications to be transient.
     */
    if (typeof options !== "object") {
      return options;
    } else {
      const clone = objectAssign({}, options);

      if (Browser.name === '' && Browser.version === '') {
        var browser = (Browser as any)._detect(navigator.userAgent);
      } else {
        var browser: any = Browser;
      }

      if (browser.chrome &&
        browser.mac &&
        clone) {
        clone.requireInteraction = false;
      }
      if (forcePersistNotifications) {
        clone.requireInteraction = true;
      }
      return clone;
    }
  }

  /**
   * Stores the most recent notification into IndexedDB so that it can be shown as a backup if a notification fails
   * to be displayed. This is to avoid Chrome's forced "This site has been updated in the background" message. See
   * this post for more details: http://stackoverflow.com/a/35045513/555547.
   * This is called every time is a push message is received so that the most recent message can be used as the
   * backup notification.
   * @param notification The most recent notification as a structured notification object.
   */
  static async updateBackupNotification(notification): Promise<void> {
    let isWelcomeNotification = notification.data && notification.data.__isOneSignalWelcomeNotification;
    // Don't save the welcome notification, that just looks broken
    if (isWelcomeNotification)
      return;
    await Database.put('Ids', {type: 'backupNotification', id: notification});
  }

  /**
   * Displays a fail-safe notification during a push event in case notification contents could not be retrieved.
   * This is to avoid Chrome's forced "This site has been updated in the background" message. See this post for
   * more details: http://stackoverflow.com/a/35045513/555547.
   */
  static displayBackupNotification() {
    return Database.get('Ids', 'backupNotification')
        .then(backupNotification => {
          let overrides = {
            // Don't persist our backup notification; users should ideally not see them
            persistNotification: false,
            data: {__isOneSignalBackupNotification: true}
          };
          if (backupNotification) {
            return ServiceWorker.displayNotification(backupNotification, overrides);
          } else {
            return ServiceWorker.displayNotification({
              content: 'You have new updates.'
            }, overrides);
          }
        });
  }

  /**
   * Returns false if the given URL matches a few special URLs designed to skip opening a URL when clicking a
   * notification. Otherwise returns true and the link will be opened.
   * @param url
     */
  static shouldOpenNotificationUrl(url) {
    return (url !== 'javascript:void(0);' &&
            url !== 'do_not_open' &&
            !contains(url, '_osp=do_not_open'));
  }

  /**
   * Occurs when a notification is dismissed by the user (clicking the 'X') or all notifications are cleared.
   * Supported on: Chrome 50+ only
   */
  static onNotificationClosed(event) {
    log.debug(`Called %conNotificationClosed(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    let notification = event.notification.data;

    ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.NotificationDismissed, notification).catch(e => log.error(e))
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
  static async onNotificationClicked(event) {
    log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    // Close the notification first here, before we do anything that might fail
    event.notification.close();

    const notification = event.notification.data;

    // Chrome 48+: Get the action button that was clicked
    if (event.action)
      notification.action = event.action;

    let notificationClickHandlerMatch = 'exact';
    let notificationClickHandlerAction = 'navigate';

    const matchPreference = await Database.get<string>('Options', 'notificationClickHandlerMatch');
    if (matchPreference)
      notificationClickHandlerMatch = matchPreference;

    const actionPreference = await this.database.get<string>('Options', 'notificationClickHandlerAction');
    if (actionPreference)
      notificationClickHandlerAction = actionPreference;

    const activeClients = await ServiceWorker.getActiveClients();

    let launchUrl = await ServiceWorker.getNotificationUrlToOpen(notification);
    let notificationOpensLink = ServiceWorker.shouldOpenNotificationUrl(launchUrl);

    /*
     Check if we can focus on an existing tab instead of opening a new url.
     If an existing tab with exactly the same URL already exists, then this existing tab is focused instead of
     an identical new tab being created. With a special setting, any existing tab matching the origin will
     be focused instead of an identical new tab being created.
     */
    let doNotOpenLink = false;
    for (let client of activeClients) {
      let clientUrl = client.url;
      if ((client as any).isSubdomainIframe) {
        const lastKnownHostUrl = await Database.get<string>('Options', 'lastKnownHostUrl');
        clientUrl = lastKnownHostUrl;
        if (!lastKnownHostUrl) {
          clientUrl = await Database.get<string>('Options', 'defaultUrl');
        }
      }
      let clientOrigin = '';
      try {
        clientOrigin = new URL(clientUrl).origin;
      } catch (e) {
        log.error(`Failed to get the HTTP site's actual origin:`, e);
      }
      let launchOrigin = null;
      try {
        // Check if the launchUrl is valid; it can be null
        launchOrigin = new URL(launchUrl).origin;
      } catch (e) {
      }

      if ((notificationClickHandlerMatch === 'exact' && clientUrl === launchUrl) ||
        (notificationClickHandlerMatch === 'origin' && clientOrigin === launchOrigin)) {
        if ((client['isSubdomainIframe'] && clientUrl === launchUrl) ||
            (!client['isSubdomainIframe'] && client.url === launchUrl) ||
          (notificationClickHandlerAction === 'focus' && clientOrigin === launchOrigin)) {
          ServiceWorker.workerMessenger.unicast(WorkerMessengerCommand.NotificationClicked, notification, client);
            try {
              await client.focus();
            } catch (e) {
              log.error("Failed to focus:", client, e);
            }
        } else {
          /*
          We must focus first; once the client navigates away, it may not be to a service worker-controlled page, and
          the client ID may change, making it unable to focus.

          client.navigate() is available on Chrome 49+ and Firefox 50+.
           */
          if (client['isSubdomainIframe']) {
            try {
              log.debug('Client is subdomain iFrame. Attempting to focus() client.')
              await client.focus();
            } catch (e) {
              log.error("Failed to focus:", client, e);
            }
            if (notificationOpensLink) {
              log.debug(`Redirecting HTTP site to ${launchUrl}.`);
              await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
              ServiceWorker.workerMessenger.unicast(WorkerMessengerCommand.RedirectPage, launchUrl, client);
            } else {
              log.debug('Not navigating because link is special.')
            }
          }
          else if (client.navigate) {
            try {
              log.debug('Client is standard HTTPS site. Attempting to focus() client.')
              await client.focus();
            } catch (e) {
              log.error("Failed to focus:", client, e);
            }
            try {
              if (notificationOpensLink) {
                log.debug(`Redirecting HTTPS site to (${launchUrl}).`)
                await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                await client.navigate(launchUrl);
              } else {
                log.debug('Not navigating because link is special.')
              }
            } catch (e) {
              console.error("Failed to navigate.");
              console.error("Failed to navigate because:", e);
              console.error("Failed to navigate to " + launchUrl + " because:", e);
              log.error("Failed to navigate:", client, launchUrl, e);
            }
          } else {
            /*
            If client.navigate() isn't available, we have no other option but to open a new tab to the URL.
             */
            await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
            await ServiceWorker.openUrl(launchUrl);
          }
        }
        doNotOpenLink = true;
        break;
      }
    }

    if (notificationOpensLink && !doNotOpenLink) {
      await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
      await ServiceWorker.openUrl(launchUrl);
    }

    const { appId } = await Database.getAppConfig();
    const { deviceId } = await Database.getSubscription();
    if (appId && deviceId) {
      await OneSignalApi.put('notifications/' + notification.id, {
        app_id: appId.toString(),
        player_id: deviceId.toString(),
        opened: true
      });
    }
    return await ServiceWorker.executeWebhooks('notification.clicked', notification);
  }

  /**
   * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
   * @param url May not be well-formed.
   */
  static async openUrl(url): Promise<WindowClient> {
    log.debug('Opening notification URL:', url);
    try {
      return await self.clients.openWindow(url);
    } catch (e) {
      log.warn(`Failed to open the URL '${url}':`, e);
      return undefined;
    }
  }

  static onServiceWorkerInstalled(event) {
    // At this point, the old service worker is still in control
    event.waitUntil(self.skipWaiting());
  }

  /*
   1/11/16: Enable the waiting service worker to immediately become the active service worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
   */
  static onServiceWorkerActivated(event) {
    // The old service worker is gone now
    log.info(`%cOneSignal Service Worker activated (version ${Environment.version()}, ${SdkEnvironment.getWindowEnv().toString()} environment).`, getConsoleStyle('bold'));
    event.waitUntil(self.clients.claim());
  }

  static async onPushSubscriptionChange(event: PushSubscriptionChangeEvent) {
    log.debug(`Called %conPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    const appId = await ServiceWorker.getAppId();
    if (!appId || !appId.value) {
      // Without an app ID, we can't make any calls
      return;
    }
    const appConfig = await new ConfigManager().getAppConfig({
      appId: appId.value
    });
    if (!appConfig) {
      // Without a valid app config (e.g. deleted app), we can't make any calls
      return;
    }
    const context = new Context(appConfig);

    // Get our current device ID
    let { deviceId } = await Database.getSubscription();
    const deviceIdExists = !!(deviceId && deviceId.value);
    if (!deviceIdExists && event.oldSubscription) {
      // We don't have the device ID stored, but we can look it up from our old subscription
      deviceId = await OneSignalApi.getUserIdFromSubscriptionIdentifier(
        appId.value,
        getDeviceTypeForBrowser(),
        event.oldSubscription.endpoint
      );
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
        rawPushSubscription = await context.subscriptionManager.subscribeFcmFromWorker();
      } catch (e) {
        // Let rawPushSubscription be null
      }
    }
    const hasNewSubscription = !!rawPushSubscription;

    if (!deviceIdExists && !hasNewSubscription) {
      await Database.remove('Ids', 'userId');
      await Database.remove('Ids', 'registrationId');
    }

    // rawPushSubscription may be null if no push subscription was retrieved; in this case, the user will be
    // marked as not subscribed
    await context.subscriptionManager.registerSubscriptionWithOneSignal(rawPushSubscription);
  }

  /**
   * Simulates a service worker event.
   * @param eventName An event name like 'pushsubscriptionchange'.
   */
  static simulateEvent(eventName) {
    (self as any).dispatchEvent(new ExtendableEvent(eventName));
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
   * Returns an array of raw notification objects, either fetched from the server (as from legacy GCM push), or read
   * from the event.data.payload property (as from the new web push protocol).
   * @param event
   * @returns An array of notifications. The new web push protocol will only ever contain one notification, however
   * an array is returned for backwards compatibility with the rest of the service worker plumbing.
     */
  static parseOrFetchNotifications(event) {
    if (event.data) {
      const isValidPayload = ServiceWorker.isValidPushPayload(event.data);
      if (isValidPayload) {
        log.debug('Received a valid encrypted push payload.');
        return Promise.resolve([event.data.json()]);
      } else {
        return Promise.reject('Unexpected push message payload received: ' + event.data.text());
        /*
         We received a push message payload from another service provider or a malformed
         payload. The last received notification will be displayed.
         */
      }
    }
    else return ServiceWorker.retrieveNotifications();
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
          isValidUuid(payload.custom.i)) {
        return true;
      } else {
        log.debug('isValidPushPayload: Valid JSON but missing notification UUID:', payload);
        return false;
      }
    } catch (e) {
      log.debug('isValidPushPayload: Parsing to JSON failed with:', e);
      return false;
    }
  }

  /**
   * Retrieves unread notifications from OneSignal's servers. For Chrome and Firefox's legacy web push protocol,
   * a push signal is sent to the service worker without any message contents, and the service worker must retrieve
   * the contents from OneSignal's servers. In Chrome and Firefox's new web push protocols involving payloads, the
   * notification contents will arrive with the push signal. The legacy format must be supported for a while.
   */
  static retrieveNotifications() {
    return new Promise(resolve => {
      var notifications = [];
      // Each entry is like:
      /*
       Object {custom: Object, icon: "https://onesignal.com/images/notification_logo.png", alert: "asd", title: "ss"}
       alert: "asd"
       custom: Object
       i: "6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"
       __proto__: Object
       icon: "https://onesignal.com/images/notification_logo.png"
       title: "ss"
       __proto__: Object
       */
      Database.get('Ids', 'userId')
        .then(userId => {
          if (userId) {
            log.debug(`Legacy push signal received, retrieving contents from players/${userId}/chromeweb_notification`);
            return OneSignalApi.get(`players/${userId}/chromeweb_notification`);
          }
          else {
            log.debug('Tried to get notification contents, but IndexedDB is missing user ID info.');
            return Promise.all([
                    ServiceWorker.getAppId(),
                    self.registration.pushManager.getSubscription().then(subscription => subscription.endpoint)
                  ])
                .then(([appId, identifier]) => {
                  let deviceType = getDeviceTypeForBrowser();
                  // Get the user ID from OneSignal
                  return OneSignalApi.getUserIdFromSubscriptionIdentifier(appId.toString(), deviceType, identifier).then(recoveredUserId => {
                    if (recoveredUserId) {
                      log.debug('Recovered OneSignal user ID:', recoveredUserId);
                      // We now have our OneSignal user ID again
                      return Promise.all([
                        Database.put('Ids', {type: 'userId', id: recoveredUserId}),
                        Database.put('Ids', {
                          type: 'registrationId',
                          id: (identifier as string).replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "")
                        }),
                      ]).then(() => {
                        // Try getting the notification again
                        log.debug('Attempting to retrieve the notification again now with a recovered user ID.');
                        return OneSignalApi.get(`players/${recoveredUserId}/chromeweb_notification`);
                      });
                    } else {
                      return Promise.reject('Recovered user ID was null. Unsubscribing from push notifications.');
                    }
                  });
                })
                .catch(error => {
                  log.debug('Unsuccessfully attempted to recover OneSignal user ID:', error);
                  // Actually unsubscribe from push so this user doesn't get bothered again
                  return self.registration.pushManager.getSubscription()
                      .then(subscription => {
                        return subscription.unsubscribe()
                      })
                      .then (unsubscriptionResult => {
                        log.debug('Unsubscribed from push notifications result:', unsubscriptionResult);
                        ServiceWorker.UNSUBSCRIBED_FROM_NOTIFICATIONS = true;
                      });
                });
          }
        })
        .then((response: any) => {
          // The response is an array literal -- response.json() has been called by apiCall()
          // The result looks like this:
          // OneSignalApi.get('players/7442a553-5f61-4b3e-aedd-bb574ef6946f/chromeweb_notification').then(function(response) { log.debug(response); });
          // ["{"custom":{"i":"6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"},"icon":"https://onesignal.com/images/notification_logo.png","alert":"asd","title":"ss"}"]
          // ^ Notice this is an array literal with JSON data inside
          for (var i = 0; i < response.length; i++) {
            notifications.push(JSON.parse(response[i]));
          }
          if (notifications.length == 0) {
            log.warn('OneSignal Worker: Received a GCM push signal, but there were no messages to retrieve. Are you' +
                ' using the wrong API URL?', SdkEnvironment.getOneSignalApiUrl().toString());
          }
          resolve(notifications);
        });
    });
  }
}

// Expose this class to the global scope
if (typeof self === "undefined" &&
    typeof global !== "undefined") {
  (global as any).OneSignalWorker = ServiceWorker;
} else {
  (self as any).OneSignalWorker = ServiceWorker;
}

// Set logging to the appropriate level
log.setDefaultLevel(SdkEnvironment.getBuildEnv() === BuildEnvironmentKind.Development ? (log as any).levels.TRACE : (log as any).levels.ERROR);

// Run our main file
if (typeof self !== "undefined") {
  ServiceWorker.run();
}
