///<reference path="../../typings/globals/service_worker_api/index.d.ts"/>
import {DEV_FRAME_HOST, API_URL, STAGING_FRAME_HOST} from "../vars";
import Environment from "../Environment";
import OneSignalApi from "../OneSignalApi";
import * as log from "loglevel";
import Database from "../services/Database";
import {getConsoleStyle, contains, trimUndefined, getDeviceTypeForBrowser, isValidUuid, capitalize} from "../utils";
import * as objectAssign from "object-assign";
import * as swivel from "swivel";
import * as Browser from "bowser";
import { ServiceWorkerDebugScope } from "./ServiceWorkerDebugScope";
import { InvalidArgumentError } from "../errors/InvalidArgumentError";
import { Notification } from '../models/Notification';


declare var self: ServiceWorkerGlobalScope;

enum PushPayloadKind {
  Embedded,

}

class ServiceWorkerConfig {
  constructor(
    public databaseName: string = 'ONE_SIGNAL_SDK_DB'
  ) {}
}

/**
 * The main service worker script fetching and displaying notifications to users in the background even when the client
 * site is not running. The worker is registered via the navigator.serviceWorker.register() call after the user first
 * allows notification permissions, and is a pre-requisite to subscribing for push notifications.
 *
 * For HTTPS sites, the service worker is registered site-wide at the top-level scope. For HTTP sites, the service
 * worker is registered to the iFrame pointing to subdomain.onesignal.com.
 */
export default class ServiceWorker {
  REFETCH_REQUESTS: boolean;
  SKIP_REFETCH_REQUESTS: boolean;
  queries;
  UNSUBSCRIBED_FROM_NOTIFICATIONS: boolean;
  debug: ServiceWorkerDebugScope;
  log: any;
  public database: Database;

  constructor(config?: ServiceWorkerConfig) {
    if (!config) {
      config = new ServiceWorkerConfig();
    }
    this.debug = {
      /* Describes what context the JavaScript code is running in and whether we're running in local development mode. */
      environment: Environment,
      /*
       * Allows message passing between this service worker and its controlled clients, or webpages. Controlled
       * clients include any HTTPS site page, or the nested iFrame pointing to OneSignal on any HTTP site. This allows
       * events like notification dismissed, clicked, and displayed to be fired on the clients. It also allows the
       * clients to communicate with the service worker to close all active notifications.
       */
      swivel: swivel,
      /* An interface to the browser's IndexedDB. */
      database: Database,
      apiUrl: API_URL,
      browser: Browser,
    };
    this.log = log;
    this.database = new Database(config.databaseName);
  }

  /**
   * Service worker entry point.
   */
  async initialize() {
    // Set logging to the appropriate level
    log.setDefaultLevel(Environment.isDev() ? (log as any).levels.TRACE : (log as any).levels.ERROR);

    log.info(`%cOneSignal Service Worker loaded (version ${Environment.version()}, ${Environment.getEnv()} environment).`, getConsoleStyle('bold'));

    self.addEventListener('push', event => event.waitUntil(this.onPushReceived(event)));
    self.addEventListener('notificationclose', this.onNotificationClosed);
    self.addEventListener('notificationclick', event => event.waitUntil(this.onNotificationClicked(event)));
    self.addEventListener('install', this.onServiceWorkerInstalled);
    self.addEventListener('activate', this.onServiceWorkerActivated);
    self.addEventListener('pushsubscriptionchange', this.onPushSubscriptionChange);

    // Install messaging event handlers for page <-> service worker communication
    (swivel as any).on('data', this.onMessageReceived);

    // 3/2/16: Firefox does not send the Origin header when making CORS request through service workers, which breaks some sites that depend on the Origin header being present (https://bugzilla.mozilla.org/show_bug.cgi?id=1248463)
    // Fix: If the browser is Firefox and is v44, use the following workaround:
    if (Browser.firefox && Browser.version && contains(Browser.version, '44')) {
      const refetchRequests = await this.database.get<boolean>('Options', 'serviceWorkerRefetchRequests');
      try {
        if (refetchRequests == true) {
          log.info('Detected Firefox v44; installing fetch handler to refetch all requests.');
          this.REFETCH_REQUESTS = true;
          self.addEventListener('fetch', this.onFetch);
        } else {
          this.SKIP_REFETCH_REQUESTS = true;
          log.info('Detected Firefox v44 but not refetching requests because option is set to false.');
        }
      } catch (e) {
        log.error(e);
        this.REFETCH_REQUESTS = true;
        self.addEventListener('fetch', this.onFetch);
      }
    }
  }

  /**
   * Occurs when a control message is received from the host page. Not related to the actual push message event.
   * @param context Used to reply to the host page.
   * @param data The message contents.
   */
  onMessageReceived(context, data) {
    log.debug(`%c${capitalize(Environment.getEnv())} ⬸ Host:`, getConsoleStyle('serviceworkermessage'), data, context);

    if (!data) {
      log.debug('Returning from empty data message.');
      return;
    }

    if (data === 'notification.closeall') {
      // Used for testing; the host page can close active notifications
      self.registration.getNotifications(null).then(notifications => {
        for (let notification of notifications) {
          notification.close();
        }
      });
    }
    else if (data.query) {
      this.processQuery(data.query, data.response);
    }
  }

  processQuery(queryType, response) {
    if (!this.queries) {
      log.debug(`queryClient() was not called before processQuery(). this.queries is empty.`);
    }
    if (!this.queries[queryType]) {
      log.debug(`Received query ${queryType} response ${response}. Expected this.queries to be preset to a hash.`);
      return;
    } else {
      if (!this.queries[queryType].promise) {
        log.debug(`Expected this.queries[${queryType}].promise value to be a Promise: ${this.queries[queryType]}`);
        return;
      }
      this.queries[queryType].promiseResolve(response);
    }
  }

  /**
   * Messages the service worker client the specified queryString via postMessage(), and returns a Promise that
   * resolves to the client's response.
   * @param serviceWorkerClient A service worker client.
   * @param queryType The message to send to the client.
   */
  queryClient(serviceWorkerClient, queryType) {
    if (!this.queries) {
      this.queries = {};
    }
    if (!this.queries[queryType]) {
      this.queries[queryType] = {};
    }
    this.queries[queryType].promise = new Promise((resolve, reject) => {
      this.queries[queryType].promiseResolve = resolve;
      this.queries[queryType].promiseReject = reject;
      (swivel as any).emit(serviceWorkerClient.id, queryType);
    });
    return this.queries[queryType].promise;
  }

  /**
   * Occurs when a push message is received.
   * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle
   * notifications.
   */
  async onPushReceived(event) {
    log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    try {
      const notifications = await this.parseOrFetchNotifications(event);
      if (!notifications || notifications.length == 0) {
        log.debug("No push payload or notifications to fetch; displaying backup notification.");
        return await this.displayBackupNotification();
      }

      for (let rawNotification of notifications) {
        log.debug('Raw Notification from OneSignal:', rawNotification);
        // TODO: Change to "Notification.createFromRaw
        const notification = Notification.createFromPushPayload(rawNotification);
        await this.displayNotification(notification);
        await this.updateBackupNotification(notification);
        (swivel as any).broadcast('notification.displayed', notification);
        await this.executeWebhooks('notification.displayed', notification);
      }
    }
    catch (e) {
      log.debug('Failed to display a notification:', e);
      if (this.UNSUBSCRIBED_FROM_NOTIFICATIONS) {
        log.debug('Because we have just unsubscribed from notifications, we will not show anything.');
      } else {
        log.debug(
          "Because a notification failed to display, we'll display the last known notification, so long as it isn't the welcome notification.");
        return this.displayBackupNotification();
      }
    }
  }

  /**
   * Makes a POST call to a specified URL to forward certain events.
   * @param event The name of the webhook event. Affects the DB key pulled for settings and the final event the user
   *              consumes.
   * @param notification A JSON object containing notification details the user consumes.
   * @returns {Promise}
   */
  async executeWebhooks(event, notification) {
    const { deviceId } = await this.database.getSubscription();
    const isServerCorsEnabled = await this.database.get<boolean>('Options', 'webhooks.cors');
    const webhookTargetUrl = await this.database.get('Options', `webhooks.${event}`);

    if (webhookTargetUrl) {
      // JSON.stringify() does not include undefined values
      // Our response will not contain those fields here which have undefined values
      let postData = {
        event: event,
        id: notification.id,
        userId: deviceId,
        action: notification.action,
        buttons: notification.actions,
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
  async getActiveClients() {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    let activeClients = [];

    for (let client of windowClients) {
      // Test if this window client is the HTTP subdomain iFrame pointing to subdomain.onesignal.com
      if (client.frameType && client.frameType === 'nested') {
        // Subdomain iFrames point to 'https://subdomain.onesignal.com...'
        if ((Environment.isDev() && !contains(client.url, DEV_FRAME_HOST)) ||
          !Environment.isDev() && !contains(client.url, '.onesignal.com') ||
          Environment.isStaging() && !contains(client.url, STAGING_FRAME_HOST)) {
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
  buildStructuredNotificationObject(rawNotification) {
    let notification: any = {
      id: rawNotification.custom.i,
      heading: rawNotification.title,
      content: rawNotification.alert,
      data: rawNotification.custom.a,
      url: rawNotification.custom.u,
      icon: rawNotification.icon,
      tag: rawNotification.tag
    };

    // Add action buttons
    if (rawNotification.o) {
      notification.actions = [];
      for (let rawButton of rawNotification.o) {
        notification.actions.push({
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
  ensureImageResourceHttps(imageUrl) {
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
      } catch (e) {
      }
    } else return null;
  }

  /**
   * Given a structured notification object, HTTPS-ifies the notification icons and action button icons, if they exist.
   */

  ensureNotificationResourcesHttps(notification) {
    if (notification) {
      if (notification.icon) {
        notification.icon = this.ensureImageResourceHttps(notification.icon);
      }
      if (notification.image) {
        notification.image = this.ensureImageResourceHttps(notification.image);
      }
      if (notification.actions && notification.actions.length > 0) {
        for (let action of notification.actions) {
          if (action.icon) {
            action.icon = this.ensureImageResourceHttps(action.icon);
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
  displayNotification(notification, overrides?) {
    log.debug(`Called %cdisplayNotification(${JSON.stringify(notification, null, 4)}):`, getConsoleStyle('code'), notification);
    return Promise.all([
      // Use the default title if one isn't provided
      this._getTitle(),
      // Use the default icon if one isn't provided
      this.database.get('Options', 'defaultIcon'),
      // Get option of whether we should leave notification displaying indefinitely
      this.database.get('Options', 'persistNotification'),
      // Get app ID for tag value
      this.database.get('Ids', 'appId')
    ])
                  .then(([defaultTitle, defaultIcon, persistNotification, appId]) => {
                    notification.heading = notification.heading ? notification.heading : defaultTitle;
                    notification.icon = notification.icon ? notification.icon : (defaultIcon ? defaultIcon : undefined);
                    var extra: any = {};
                    extra.tag = notification.tag || appId;
                    extra.persistNotification = persistNotification;

                    // Allow overriding some values
                    if (!overrides)
                      overrides = {};
                    notification = objectAssign(notification, overrides);

                    this.ensureNotificationResourcesHttps(notification);

                    let notificationOptions = {
                      body: notification.body,
                      icon: notification.icon,
                      /*
                       On Chrome 56, a large image can be displayed: https://bugs.chromium.org/p/chromium/issues/detail?id=614456
                       */
                      image: notification.image,
                      /*
                       On Chrome 44+, use this property to store extra information which you can read back when the
                       notification gets invoked from a notification click or dismissed event. We serialize the
                       notification in the 'data' field and read it back in other events. See:
                       https://developers.google.com/web/updates/2015/05/notifying-you-of-changes-to-notifications?hl=en
                       */
                      data: notification,
                      /*
                       On Chrome 48+, action buttons show below the message body of the notification. Clicking either
                       button takes the user to a link. See:
                       https://developers.google.com/web/updates/2016/01/notification-actions
                       */
                      actions: notification.actions,
                      /*
                       Tags are any string value that groups notifications together. Two or notifications sharing a tag
                       replace each other.
                       */
                      tag: extra.tag,
                      /*
                       On Chrome 47+ (desktop), notifications will be dismissed after 20 seconds unless requireInteraction
                       is set to true. See:
                       https://developers.google.com/web/updates/2015/10/notification-requireInteractiom
                       */
                      requireInteraction: extra.persistNotification,
                      /*
                       On Chrome 50+, by default notifications replacing identically-tagged notifications no longer
                       vibrate/signal the user that a new notification has come in. This flag allows subsequent
                       notifications to re-alert the user. See:
                       https://developers.google.com/web/updates/2016/03/notifications
                       */
                      renotify: true
                    };
                    return self.registration.showNotification(notification.heading, notificationOptions)
                  });
  }

  /**
   * Stores the most recent notification into IndexedDB so that it can be shown as a backup if a notification fails
   * to be displayed. This is to avoid Chrome's forced "This site has been updated in the background" message. See
   * this post for more details: http://stackoverflow.com/a/35045513/555547.
   * This is called every time is a push message is received so that the most recent message can be used as the
   * backup notification.
   * @param notification The most recent notification as a structured notification object.
   */
  async updateBackupNotification(notification): Promise<void> {
    let isWelcomeNotification = notification.data && notification.data.__isOneSignalWelcomeNotification;
    // Don't save the welcome notification, that just looks broken
    if (isWelcomeNotification)
      return;
    await this.database.put('Ids', { type: 'backupNotification', id: notification });
  }

  /**
   * Displays a fail-safe notification during a push event in case notification contents could not be retrieved.
   * This is to avoid Chrome's forced "This site has been updated in the background" message. See this post for
   * more details: http://stackoverflow.com/a/35045513/555547.
   */
  async displayBackupNotification(): Promise<void> {
    const backupNotification = await this.database.get<Notification>('Ids', 'backupNotification')
    let overrides = {
      // Don't persist our backup notification; users should ideally not see them
      persistNotification: false,
      data: { __isOneSignalBackupNotification: true }
    };
    if (backupNotification) {
      await this.displayNotification(backupNotification, overrides);
    } else {
      await this.displayNotification({
        body: 'You have new updates.'
      }, overrides);
    }
  }

  /**
   * Returns false if the given URL matches a few special URLs designed to skip opening a URL when clicking a
   * notification. Otherwise returns true and the link will be opened.
   * @param url
   */
  shouldOpenNotificationUrl(url) {
    return (url !== 'javascript:void(0);' &&
    url !== 'do_not_open' && !contains(url, '_osp=do_not_open'));
  }

  /**
   * Occurs when a notification is dismissed by the user (clicking the 'X') or all notifications are cleared.
   * Supported on: Chrome 50+ only
   */
  onNotificationClosed(event) {
    log.debug(`Called %conNotificationClosed(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    let notification = event.notification.data;

    (swivel as any).broadcast('notification.dismissed', notification);
    event.waitUntil(
      this.executeWebhooks('notification.dismissed', notification)
    );
  }

  /**
   * After clicking a notification, determines the URL to open based on whether an action button was clicked or the
   * notification body was clicked.
   */
  async getNotificationUrlToOpen(notification): Promise<string> {
    // Defaults to the URL the service worker was registered
    // TODO: This should be fixed for HTTP sites
    let launchUrl = self.registration.scope;

    // Use the user-provided default URL if one exists
    const { defaultNotificationUrl: dbDefaultNotificationUrl } = await this.database.getAppState();
    if (dbDefaultNotificationUrl)
      launchUrl = dbDefaultNotificationUrl;

    // If the user clicked an action button, use the URL provided by the action button
    // Unless the action button URL is null
    if (notification.action) {
      // Find the URL tied to the action button that was clicked
      for (let button of notification.actions) {
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
  async onNotificationClicked(event) {
    log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    // Close the notification first here, before we do anything that might fail
    event.notification.close();

    const notification = event.notification.data;

    // Chrome 48+: Get the action button that was clicked
    if (event.action)
      notification.action = event.action;

    let notificationClickHandlerMatch = 'exact';

    const matchPreference = await this.database.get<string>('Options', 'notificationClickHandlerMatch');
    if (matchPreference)
      notificationClickHandlerMatch = matchPreference;

    const activeClients = await this.getActiveClients();

    let launchUrl = await this.getNotificationUrlToOpen(notification);
    let notificationOpensLink = this.shouldOpenNotificationUrl(launchUrl);

    /*
     Check if we can focus on an existing tab instead of opening a new url.
     If an existing tab with exactly the same URL already exists, then this existing tab is focused instead of
     an identical new tab being created. With a special setting, any existing tab matching the origin will
     be focused instead of an identical new tab being created.
     */
    let doNotOpenLink = false;
    for (let client: WindowClient of activeClients) {
      let clientUrl = client.url;
      if ((client as any).isSubdomainIframe) {
        const lastKnownHostUrl = await this.database.get<string>('Options', 'lastKnownHostUrl');
        clientUrl = lastKnownHostUrl;
        if (!lastKnownHostUrl) {
          clientUrl = await this.database.get<string>('Options', 'defaultUrl');
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

      await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });

      if ((notificationClickHandlerMatch === 'exact' && clientUrl === launchUrl) ||
        (notificationClickHandlerMatch === 'origin' && clientOrigin === launchOrigin)) {
        if ((client.isSubdomainIframe && clientUrl === launchUrl) || (!client.isSubdomainIframe && client.url === launchUrl)) {
          (swivel as any).emit(client.id, 'notification.clicked', notification);
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
          if (client.isSubdomainIframe) {
            try {
              log.debug('Attempting to focus() client.')
              await client.focus();
            } catch (e) {
              log.error("Failed to focus:", client, e);
            }
            if (notificationOpensLink) {
              log.debug(`Sending command.redirect to ${launchUrl}.`);
              (swivel as any).emit(client.id, 'command.redirect', launchUrl);
            } else {
              log.debug('Not navigating because link is special.')
            }
          }
          else if (client.navigate) {
            try {
              log.debug('Attempting to focus() client.')
              await client.focus();
            } catch (e) {
              log.error("Failed to focus:", client, e);
            }
            try {
              if (notificationOpensLink) {
                log.debug(`Attempting to navigate(${launchUrl}) client.`)
                await client.navigate(launchUrl);
              } else {
                log.debug('Not navigating because link is special.')
              }
            } catch (e) {
              log.error("Failed to navigate:", client, launchUrl, e);
            }
          } else {
            /*
            If client.navigate() isn't available, we have no other option but to open a new tab to the URL.
             */
            await ServiceWorker.openUrl(launchUrl);
          }
        }
        doNotOpenLink = true;
        break;
      }
    }

    if (notificationOpensLink && !doNotOpenLink) {
      await this.openUrl(launchUrl);
    }

    const { appId } = await this.database.getAppConfig();
    const { deviceId } = await this.database.getSubscription();
    if (appId && deviceId) {
      await OneSignalApi.put('notifications/' + notification.id, {
        app_id: appId,
        player_id: deviceId,
        opened: true
      });
    }
    return await this.executeWebhooks('notification.clicked', notification);
  }

  /**
   * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
   * @param url May not be well-formed.
   */
  async openUrl(url): Promise<WindowClient> {
    log.debug('Opening notification URL:', url);
    try {
      return await self.clients.openWindow(url);
    } catch (e) {
      log.warn(`Failed to open the URL '${url}':`, e);
    }
  }

  onServiceWorkerInstalled(event) {
    // At this point, the old service worker is still in control
    log.debug(`Called %conServiceWorkerInstalled(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    log.info(`Installing service worker: %c${(self as any).location.pathname}`, getConsoleStyle('code'), `(version ${Environment.version()})`);

    if (contains((self as any).location.pathname, "OneSignalSDKWorker"))
      var serviceWorkerVersionType = 'WORKER1_ONE_SIGNAL_SW_VERSION';
    else
      var serviceWorkerVersionType = 'WORKER2_ONE_SIGNAL_SW_VERSION';


    event.waitUntil(
      this.database.put("Ids", { type: serviceWorkerVersionType, id: Environment.version() })
          .then(() => self.skipWaiting())
    );
  }

  /*
   1/11/16: Enable the waiting service worker to immediately become the active service worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
   */
  onServiceWorkerActivated(event) {
    // The old service worker is gone now
    log.debug(`Called %conServiceWorkerActivated(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    var _this = this;
    var activationPromise = self.clients.claim()
                                .then(() => _this.database.get('Ids', 'userId'))
                                .then(userId => {
                                  if (self.registration && userId) {
                                    return this._subscribeForPush(self.registration).catch(e => log.error(e));
                                  }
                                });
    event.waitUntil(activationPromise);
  }

  onFetch(event) {
    event.respondWith(fetch(event.request));
  }

  onPushSubscriptionChange(event) {
    // Subscription expired
    log.debug(`Called %conPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    event.waitUntil(this._subscribeForPush(self.registration));
  }

  /**
   * Simulates a service worker event.
   * @param eventName An event name like 'pushsubscriptionchange'.
   */
  simulateEvent(eventName) {
    (self as any).dispatchEvent(new ExtendableEvent(eventName));
  }

  _subscribeForPush(serviceWorkerRegistration) {
    log.debug(`Called %c_subscribeForPush()`, getConsoleStyle('code'));

    var appId = null;
    return this.database.get('Ids', 'appId')
               .then(retrievedAppId => {
                 appId = retrievedAppId;
                 return serviceWorkerRegistration.pushManager.getSubscription()
               }).then(oldSubscription => {
        log.debug(`Resubscribing old subscription`, oldSubscription, `within the service worker ...`);
        // Only re-subscribe if there was an existing subscription and we are on Chrome 54+ wth PushSubscriptionOptions
        // Otherwise there's really no way to resubscribe since we don't have the manifest.json sender ID
        if (oldSubscription && oldSubscription.options) {
          return serviceWorkerRegistration.pushManager.subscribe(oldSubscription.options);
        } else {
          return Promise.resolve();
        }
      }).then(subscription => {
        var subscriptionInfo: any = null;
        if (subscription) {
          subscriptionInfo = {};
          log.debug(`Finished resubscribing for push:`, subscription);
          if (typeof subscription.subscriptionId != "undefined") {
            // Chrome 43 & 42
            subscriptionInfo.endpointOrToken = subscription.subscriptionId;
          }
          else {
            // Chrome 44+ and FireFox
            // 4/13/16: We now store the full endpoint instead of just the registration token
            subscriptionInfo.endpointOrToken = subscription.endpoint;
          }

          // 4/13/16: Retrieve p256dh and auth for new encrypted web push protocol in Chrome 50
          if (subscription.getKey) {
            // p256dh and auth are both ArrayBuffer
            let p256dh = null;
            try {
              p256dh = subscription.getKey('p256dh');
            } catch (e) {
              // User is most likely running < Chrome < 50
            }
            let auth = null;
            try {
              auth = subscription.getKey('auth');
            } catch (e) {
              // User is most likely running < Firefox 45
            }

            if (p256dh) {
              // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
              let p256dh_base64encoded = btoa(
                String.fromCharCode.apply(null, new Uint8Array(p256dh)));
              subscriptionInfo.p256dh = p256dh_base64encoded;
            }
            if (auth) {
              // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
              let auth_base64encoded = btoa(
                String.fromCharCode.apply(null, new Uint8Array(auth)));
              subscriptionInfo.auth = auth_base64encoded;
            }
          }
        }
        else {
          log.info('Could not subscribe your browser for push notifications.');
        }

        return this.registerWithOneSignal(appId, subscriptionInfo);
      });
  }

  /**
   * Creates a new or updates an existing OneSignal user (player) on the server.
   *
   * @param appId The app ID passed to init.
   *        subscriptionInfo A hash containing 'endpointOrToken', 'auth', and 'p256dh'.
   *
   * @remarks Called from both the host page and HTTP popup.
   *          If a user already exists and is subscribed, updates the session count by calling /players/:id/on_session; otherwise, a new player is registered via the /players endpoint.
   *          Saves the user ID and registration ID to the local web database after the response from OneSignal.
   */
  registerWithOneSignal(appId, subscriptionInfo) {
    let deviceType = getDeviceTypeForBrowser();
    var _this = this;
    return Promise.all([
      this.database.get('Ids', 'userId'),
    ])
                  .then(([userId, subscription]) => {
                    if (!userId) {
                      return Promise.reject('No user ID found; cannot update existing player info');
                    }
                    let requestUrl = `players/${userId}`;

                    let requestData: any = {
                      app_id: appId,
                      device_type: deviceType,
                      language: Environment.getLanguage(),
                      timezone: new Date().getTimezoneOffset() * -60,
                      device_model: navigator.platform + " " + Browser.name,
                      device_os: Browser.version,
                      sdk: Environment.version(),
                    };

                    if (subscriptionInfo) {
                      requestData.identifier = subscriptionInfo.endpointOrToken;
                      // Although we're passing the full endpoint to OneSignal, we still need to store only the registration ID for our SDK API getRegistrationId()
                      // Parse out the registration ID from the full endpoint URL and save it to our database
                      let registrationId = subscriptionInfo.endpointOrToken.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
                      _this.database.put("Ids", { type: "registrationId", id: registrationId });
                      // New web push standard in Firefox 46+ and Chrome 50+ includes 'auth' and 'p256dh' in PushSubscription
                      if (subscriptionInfo.auth) {
                        requestData.web_auth = subscriptionInfo.auth;
                      }
                      if (subscriptionInfo.p256dh) {
                        requestData.web_p256 = subscriptionInfo.p256dh;
                      }
                    }

                    return OneSignalApi.put(requestUrl, requestData);
                  })
                  .then((response: any) => {
                    if (response) {
                      if (!response.success) {
                        log.error('Resubscription registration with OneSignal failed:', response);
                      }
                      let { id: userId } = response;

                      if (userId) {
                        _this.database.put("Ids", { type: "userId", id: userId });
                      }
                    } else {
                      // No user ID found, this returns undefined
                      log.debug('Resubscription registration failed because no user ID found.');
                    }
                  });
  }

  /**
   * Returns a promise that is fulfilled with either the default title from the database (first priority) or the page title from the database (alternate result).
   */
  _getTitle() {
    return new Promise((resolve, reject) => {
      Promise.all([this.database.get('Options', 'defaultTitle'), this.database.get('Options', 'pageTitle')])
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
  async parseOrFetchNotifications(event: PushEvent): Promise<Notification[]> {
    if (event.data) {
      const payload = event.data.json();
      const isValidPayload = this.isValidPushPayload(payload);
      if (isValidPayload) {
        log.debug('Received a valid encrypted push payload.');
        return await [payload];
      } else {
        throw new Error('Unexpected push message payload received: ' + event.data.text());
        /*
         We received a push message payload from another service provider or a malformed
         payload. The last received notification will be displayed.
         */
      }
    }
    else return this.retrieveNotifications();
  }

  /**
   * Returns true if the raw data payload is a OneSignal push message in the format of the new web push protocol.
   * Otherwise returns false.
   * @param rawData The raw PushMessageData from the push event's event.data, not already parsed to JSON.
   */
  isValidPushPayload(payload: any): boolean {
    try {
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
  async retrieveNotifications(): Promise<Notification[]> {
    var notifications = [];
    // Each entry is like:
    /*
      {
        custom: {
          i: "6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"
        },
        icon: "https://onesignal.com/images/notification_logo.png",
        alert: "asd",
        title: "ss"
      }
     */
    const userId = this.database.get('Ids', 'userId');
    let rawNotificationsResponse;

    if (userId) {
      log.debug(`Legacy push signal received, retrieving contents from players/${userId}/chromeweb_notification`);
      rawNotificationsResponse = await OneSignalApi.get(`players/${userId}/chromeweb_notification`);
    }
    else {
      log.debug('Tried to get notification contents, but IndexedDB is missing user ID info.');
      const appId = await this.database.get('Ids', 'appId');
      const pushSubscription = await self.registration.pushManager.getSubscription();
      const deviceType = getDeviceTypeForBrowser();

      // Get the user ID from OneSignal
      try {
        const recoveredUserId = await OneSignalApi.getUserIdFromSubscriptionIdentifier(appId, deviceType, pushSubscription.endpoint);
        if (recoveredUserId) {
          log.debug('Recovered OneSignal user ID:', recoveredUserId);
          // We now have our OneSignal user ID again
          await this.database.put('Ids', { type: 'userId', id: recoveredUserId });
          await this.database.put('Ids', {
            type: 'registrationId',
            id: pushSubscription.endpoint.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "")
          });
          // Try getting the notification again
          log.debug('Attempting to retrieve the notification again now with a recovered user ID.');
          rawNotificationsResponse = await OneSignalApi.get(`players/${recoveredUserId}/chromeweb_notification`);
        } else {
          throw new Error('Recovered user ID was null. Unsubscribing from push notifications.');
        }
      }
      catch (error) {
        log.debug('Unsuccessfully attempted to recover OneSignal user ID:', error);
        // Actually unsubscribe from push so this user doesn't get bothered again
        const pushSubscription = await self.registration.pushManager.getSubscription()
        const unsubscriptionResult = await pushSubscription.unsubscribe()
        log.debug('Unsubscribed from push notifications result:', unsubscriptionResult);
        this.UNSUBSCRIBED_FROM_NOTIFICATIONS = true;
        return [];
      }
    }

    // The response is an array literal -- response.json() has been called by apiCall()
    // The result looks like this:
    // OneSignalApi.get('players/7442a553-5f61-4b3e-aedd-bb574ef6946f/chromeweb_notification').then(function(response) { log.debug(response); });
    // ["{"custom":{"i":"6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"},"icon":"https://onesignal.com/images/notification_logo.png","alert":"asd","title":"ss"}"]
    // ^ Notice this is an array literal with JSON data inside
    for (var i = 0; i < rawNotificationsResponse.length; i++) {
      notifications.push(JSON.parse(rawNotificationsResponse[i]));
    }
    if (notifications.length == 0) {
      log.warn('OneSignal Worker: Received a GCM push signal, but there were no messages to retrieve. Are you' +
        ' using the wrong API URL?', API_URL);
    }
    return notifications;
  }
}