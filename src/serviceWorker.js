import { DEV_HOST, DEV_FRAME_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js'
import OneSignalApi from './oneSignalApi.js';
import log from 'loglevel';
import Database from './database.js';
import { isPushNotificationsSupported, getConsoleStyle, contains, trimUndefined, getDeviceTypeForBrowser, substringAfter, isValidUuid } from './utils.js';
import objectAssign from 'object-assign';
import swivel from 'swivel';
import * as Browser from 'bowser';


/**
 * The main service worker script fetching and displaying notifications to users in the background even when the client
 * site is not running. The worker is registered via the navigator.serviceWorker.register() call after the user first
 * allows notification permissions, and is a pre-requisite to subscribing for push notifications.
 *
 * For HTTPS sites, the service worker is registered site-wide at the top-level scope. For HTTP sites, the service
 * worker is registered to the iFrame pointing to subdomain.onesignal.com.
 */
class ServiceWorker {

  /**
   * An incrementing integer defined in package.json. Value doesn't matter as long as it's different from the
   * previous version.
   */
  static get VERSION() {
    return __VERSION__;
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
   * Allows message passing between this service worker and its controlled clients, or webpages. Controlled
   * clients include any HTTPS site page, or the nested iFrame pointing to OneSignal on any HTTP site. This allows
   * events like notification dismissed, clicked, and displayed to be fired on the clients. It also allows the
   * clients to communicate with the service worker to close all active notifications.
   */
  static get swivel() {
    return swivel;
  }

  /**
   * An interface to the browser's IndexedDB.
   */
  static get database() {
    return Database;
  }

  static get apiUrl() {
    return API_URL;
  }

  /**
   * Describes the current browser name and version.
   */
  static get browser() {
    return Browser;
  }

  /**
   * Service worker entry point.
   */
  static run() {
    self.addEventListener('push', ServiceWorker.onPushReceived);
    self.addEventListener('notificationclose', ServiceWorker.onNotificationClosed);
    self.addEventListener('notificationclick', ServiceWorker.onNotificationClicked);
    self.addEventListener('install', ServiceWorker.onServiceWorkerInstalled);
    self.addEventListener('activate', ServiceWorker.onServiceWorkerActivated);
    self.addEventListener('pushsubscriptionchange', ServiceWorker.onPushSubscriptionChange);

    // Install messaging event handlers for page <-> service worker communication
    swivel.on('data', ServiceWorker.onMessageReceived);

    // 3/2/16: Firefox does not send the Origin header when making CORS request through service workers, which breaks some sites that depend on the Origin header being present (https://bugzilla.mozilla.org/show_bug.cgi?id=1248463)
    // Fix: If the browser is Firefox and is v44, use the following workaround:
    if (Browser.firefox && Browser.version && contains(Browser.version, '44')) {
      Database.get('Options', 'serviceWorkerRefetchRequests')
        .then(refetchRequests => {
          if (refetchRequests == true) {
            log.info('Detected Firefox v44; installing fetch handler to refetch all requests.');
            self.REFETCH_REQUESTS = true;
            self.addEventListener('fetch', ServiceWorker.onFetch);
          } else {
            self.SKIP_REFETCH_REQUESTS = true;
            log.info('Detected Firefox v44 but not refetching requests because option is set to false.');
          }
        })
        .catch(e => {
          log.error(e);
          self.REFETCH_REQUESTS = true;
          self.addEventListener('fetch', ServiceWorker.onFetch);
        });
    }
  }

  /**
   * Occurs when a control message is received from the host page. Not related to the actual push message event.
   * @param context Used to reply to the host page.
   * @param data The message contents.
   */
  static onMessageReceived(context, data) {
    log.debug(`%c${Environment.getEnv().capitalize()} ⬸ Host:`, getConsoleStyle('serviceworkermessage'), data, context);

    if (!data) {
      log.debug('Returning from empty data message.');
      return;
    }

    if (data === 'notification.closeall') {
      // Used for testing; the host page can close active notifications
      self.registration.getNotifications().then(notifications => {
        for (let notification of notifications) {
          notification.close();
        }
      });
    } else if (data.query) {
      ServiceWorker.processQuery(data.query, data.response);
    }
  }

  static processQuery(queryType, response) {
    if (!self.queries) {
      log.warn(`queryClient() was not called before processQuery(). self.queries is empty.`);
    }
    if (!self.queries[queryType]) {
      log.warn(`Received query ${queryType} response ${response}. Expected self.queries to be preset to a hash.`);
      return;
    } else {
      if (!self.queries[queryType].promise) {
        log.warn(`Expected self.queries[${queryType}].promise value to be a Promise: ${self.queries[queryType]}`);
        return;
      }
      self.queries[queryType].promiseResolve(response);
    }
  }

  /**
   * Messages the service worker client the specified queryString via postMessage(), and returns a Promise that
   * resolves to the client's response.
   * @param serviceWorkerClient A service worker client.
   * @param queryType The message to send to the client.
     */
  static queryClient(serviceWorkerClient, queryType) {
    if (!self.queries) {
      self.queries = {};
    }
    if (!self.queries[queryType]) {
      self.queries[queryType] = {};
    }
    self.queries[queryType].promise = new Promise((resolve, reject) => {
      self.queries[queryType].promiseResolve = resolve;
      self.queries[queryType].promiseReject = reject;
      swivel.emit(serviceWorkerClient.id, queryType);
    });
    return self.queries[queryType].promise;
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
            .then(notifications => {
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
                      .then(() => ServiceWorker.updateBackupNotification(notif))
                      .then(() => swivel.broadcast('notification.displayed', notif))
                      .then(() => ServiceWorker.executeWebhooks('notification.displayed', notif))
                }).bind(null, notification));
              }

              return notificationEventPromiseFns.reduce((p, fn) => {
                return p = p.then(fn);
               }, Promise.resolve());
            })
            .catch(e => {
              log.debug('Failed to display a notification:', e);
              if (self.UNSUBSCRIBED_FROM_NOTIFICATIONS) {
                log.debug('Because we have just unsubscribed from notifications, we will not show anything.');
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
  static executeWebhooks(event, notification) {
    var isServerCorsEnabled = false;
    var userId = null;
    return Database.get('Ids', 'userId')
      .then(theUserId => {
        userId = theUserId;
      })
      .then(() => Database.get('Options', 'webhooks.cors'))
      .then(cors => {
        isServerCorsEnabled = cors;
      })
      .then(() => Database.get('Options', `webhooks.${event}`))
      .then(webhookUrlQuery => {
        if (webhookUrlQuery) {
          let url = webhookUrlQuery;
          // JSON.stringify() does not include undefined values
          // Our response will not contain those fields here which have undefined values
          let postData = {
            event: event,
            id: notification.id,
            userId: userId,
            action: notification.action,
            buttons: notification.buttons,
            heading: notification.heading,
            content: notification.content,
            url: notification.url,
            icon: notification.icon,
            data: notification.data
          };
          let fetchOptions = {
            method: 'post',
            mode: 'no-cors',
            body: JSON.stringify(postData)
          };
          if (isServerCorsEnabled) {
            fetchOptions.mode = 'cors';
            fetchOptions.headers = {
              'X-OneSignal-Event': event,
              'Content-Type': 'application/json'
            };
          }
          log.debug(`Executing ${event} webhook ${isServerCorsEnabled ? 'with' : 'without'} CORS %cPOST ${url}`, getConsoleStyle('code'), ':', postData);
          return fetch(url, fetchOptions);
        }
      })
      .catch(e => {
        log.error('Error executing webhook:', e);
      });
  }

  /**
   * Gets an array of active window clients along with whether each window client is the HTTP site's iFrame or an
   * HTTPS site page.
   * An active window client is a browser tab that is controlled by the service worker.
   * Technically, this list should only ever contain clients that are iFrames, or clients that are HTTPS site pages,
   * and not both. This doesn't really matter though.
   * @returns {Promise}
   */
  static getActiveClients() {
    return self.clients.matchAll({type: 'window', includeUncontrolled: true})
        .then(windowClients => {
          let activeClients = [];

          for (let client of windowClients) {
            // Test if this window client is the HTTP subdomain iFrame pointing to subdomain.onesignal.com
            if (client.frameType && client.frameType === 'nested') {
              // Subdomain iFrames point to 'https://subdomain.onesignal.com...'
              if ((Environment.isDev() && !contains(client.url, DEV_FRAME_HOST)) ||
                   !Environment.isDev() && !contains(client.url, '.onesignal.com')) {
                  continue;
              }
              // Indicates this window client is an HTTP subdomain iFrame
              client.isSubdomainIframe = true;
            }
            activeClients.push(client);
          }

          return activeClients;
        });
  }

  /**
   * Constructs a structured notification object from the raw notification fetched from OneSignal's server. This
   * object is passed around from event to event, and is also returned to the host page for notification event details.
   * Constructed in onPushReceived, and passed along to other event handlers.
   * @param rawNotification The raw notification JSON returned from OneSignal's server.
   */
  static buildStructuredNotificationObject(rawNotification) {
    let notification = {
      id: rawNotification.custom.i,
      heading: rawNotification.title,
      content: rawNotification.alert,
      data: rawNotification.custom.a,
      url: rawNotification.custom.u,
      icon: rawNotification.icon
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
   * Given a structured notification object, HTTPS-ifies the notification icon and action button icons, if they exist.
   */
  static ensureNotificationResourcesHttps(notification) {
    if (notification) {
      if (notification.icon) {
        notification.icon = ServiceWorker.ensureImageResourceHttps(notification.icon);
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
  static displayNotification(notification, overrides) {
    log.debug(`Called %cdisplayNotification(${JSON.stringify(notification, null, 4)}):`, getConsoleStyle('code'), notification);
    return Promise.all([
          // Use the default title if one isn't provided
          ServiceWorker._getTitle(),
          // Use the default icon if one isn't provided
          Database.get('Options', 'defaultIcon'),
          // Get option of whether we should leave notification displaying indefinitely
          Database.get('Options', 'persistNotification'),
          // Get app ID for tag value
          Database.get('Ids', 'appId')
        ])
        .then(([defaultTitle, defaultIcon, persistNotification, appId]) => {
          notification.heading = notification.heading ? notification.heading : defaultTitle;
          notification.icon = notification.icon ? notification.icon : (defaultIcon ? defaultIcon : undefined);
          var extra = {};
          extra.tag = `${appId}`;
          extra.persistNotification = persistNotification;

          // Allow overriding some values
          if (!overrides)
            overrides = {};
          notification = objectAssign(notification, overrides);

          ServiceWorker.ensureNotificationResourcesHttps(notification);

          let notificationOptions = {
            body: notification.content,
            icon: notification.icon,
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
            actions: notification.buttons,
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
  static updateBackupNotification(notification) {
    let isWelcomeNotification = notification.data && notification.data.__isOneSignalWelcomeNotification;
    // Don't save the welcome notification, that just looks broken
    if (isWelcomeNotification)
      return;
    return Database.put('Ids', {type: 'backupNotification', id: notification});
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

    swivel.broadcast('notification.dismissed', notification);
    event.waitUntil(
        ServiceWorker.executeWebhooks('notification.dismissed', notification)
    );
  }

  /**
   * After clicking a notification, determines the URL to open based on whether an action button was clicked or the
   * notification body was clicked.
   */
  static getNotificationUrlToOpen(notification) {
    // Defaults to the URL the service worker was registered
    // TODO: This should be fixed for HTTP sites
    var launchUrl = self.registration.scope;

    // Use the user-provided default if one exists
    if (ServiceWorker.defaultLaunchUrl)
      launchUrl = ServiceWorker.defaultLaunchUrl;

    // If the user clicked an action button, use the URL provided by the action button
    // Unless the action button URL is null
    if (notification.action) {
      // Find the URL tied to the action button that was clicked
      for (let button of notification.buttons) {
        if (button.action === notification.action && button.url && button.url !== '') {
          launchUrl = button.url;
        }
      }
    } else if (notification.url && notification.url !== '') {
      // The user did not clicked the notification body instead of an action button
      launchUrl = notification.url;
    }

    return launchUrl;
  }

  /**
   * Occurs when the notification's body or action buttons are clicked. Does not occur if the notification is
   * dismissed by clicking the 'X' icon. See the notification close event for the dismissal event.
   */
  static onNotificationClicked(event) {
    log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    var notification = event.notification.data;

    // Chrome 48+: Get the action button that was clicked
    notification.action = event.action;

    event.notification.close();

    let notificationClickHandlerMatch = 'exact';

    event.waitUntil(
      Database.get('Options', 'defaultUrl')
        .then(defaultUrl=> {
          if (defaultUrl)
            ServiceWorker.defaultLaunchUrl = defaultUrl;
        })
        .then(() => Database.get('Options', 'notificationClickHandlerMatch'))
        .then(matchPreference => {
          if (matchPreference)
            notificationClickHandlerMatch = matchPreference;
        })
        .then(() => ServiceWorker.getActiveClients())
        .then(activeClients => {
          let launchUrl = ServiceWorker.getNotificationUrlToOpen(notification);
          let notificationOpensLink = ServiceWorker.shouldOpenNotificationUrl(launchUrl);

          /*
           Check if we can focus on an existing tab instead of opening a new url.
           If an existing tab with exactly the same URL already exists, then this existing tab is focused instead of
           an identical new tab being created. With a special setting, any existing tab matching the origin will
           be focused instead of an identical new tab being created.
           */
          let clientUrlPromises = [];
          let doNotOpenLink = false;
          for (let client of activeClients) {
            let getClientUrlPromise = null;
            if (client.isSubdomainIframe) {
              getClientUrlPromise = ServiceWorker.queryClient(client, 'url');
            } else {
              getClientUrlPromise = Promise.resolve(client.url);
            }
            getClientUrlPromise.then(clientUrl => {
              let clientOrigin = new URL(clientUrl).origin;
              let launchOrigin = null;
              try {
                // Check if the launchUrl is valid; it can be null
                launchOrigin = new URL(launchUrl).origin;
              } catch (e) {
              }

              if ((notificationClickHandlerMatch === 'exact' && clientUrl === launchUrl) ||
                  (notificationClickHandlerMatch === 'origin' && clientOrigin === launchOrigin)) {
                client.focus();
                swivel.emit(client.id, 'notification.clicked', notification);
                doNotOpenLink = true;
              }
            });
            clientUrlPromises.push(getClientUrlPromise);
          }
          return Promise.all(clientUrlPromises)
                         .then(() => Database.put("NotificationOpened", {url: launchUrl, data: notification, timestamp: Date.now()}))
                         .then(() => {
                           if (notificationOpensLink && !doNotOpenLink) {
                             ServiceWorker.openUrl(launchUrl);
                           }
                         });
        })
        .then(() => {
          return Promise.all([Database.get('Ids', 'appId'), Database.get('Ids', 'userId')])
        })
        .then(([appId, userId]) => {
          if (appId && userId) {
            return OneSignalApi.put('notifications/' + notification.id, {
              app_id: appId,
              player_id: userId,
              opened: true
            });
          }
        })
        .then(() => {
          return ServiceWorker.executeWebhooks('notification.clicked', notification);
        })
        .catch(e => log.error(e))
    );
  }

  /**
   * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
   * @param url May not be well-formed.
   */
  static openUrl(url) {
    log.debug('Opening notification URL:', url);
    clients.openWindow(url).catch(e => {
      log.warn(`Failed to open the URL '${url}':`, e);
      // Should only fall into here if going to an external URL on Chrome older than 43.
      clients.openWindow(`${registration.scope}redirector.html?url=${url}`);
    });
  }

  static onServiceWorkerInstalled(event) {
    // At this point, the old service worker is still in control
    log.debug(`Called %conServiceWorkerInstalled(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    log.info(`Installing service worker: %c${self.location.pathname}`, getConsoleStyle('code'), `(version ${__VERSION__})`);

    if (contains(self.location.pathname, "OneSignalSDKWorker.js"))
      var serviceWorkerVersionType = 'WORKER1_ONE_SIGNAL_SW_VERSION';
    else
      var serviceWorkerVersionType = 'WORKER2_ONE_SIGNAL_SW_VERSION';


    event.waitUntil(
        Database.put("Ids", {type: serviceWorkerVersionType, id: __VERSION__})
            .then(() => self.skipWaiting())
            .catch(e => log.error(e))
    );
  }

  /*
   1/11/16: Enable the waiting service worker to immediately become the active service worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
   */
  static onServiceWorkerActivated(event) {
    // The old service worker is gone now
    log.debug(`Called %conServiceWorkerActivated(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    var activationPromise = self.clients.claim()
                                        .then(() => Database.get('Ids', 'userId'))
                                        .then(userId => {
                                          if (self.registration && userId) {
                                            return ServiceWorker._subscribeForPush(self.registration);
                                          }
                                        })
                                        .catch(e => {
                                          console.error('onServiceWorkerActivated:', e);
                                        });
    event.waitUntil(activationPromise);
  }

  static onFetch(event) {
    event.respondWith(fetch(event.request));
  }

  static onPushSubscriptionChange(event) {
    // Subscription expired
    log.debug(`Called %conPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    event.waitUntil(ServiceWorker._subscribeForPush(self.registration));
  }

  /**
   * Simulates a service worker event.
   * @param eventName An event name like 'pushsubscriptionchange'.
   */
  static simulateEvent(eventName) {
    self.dispatchEvent(new ExtendableEvent(eventName));
  }

  static _subscribeForPush(serviceWorkerRegistration) {
    log.debug(`Called %c_subscribeForPush()`, getConsoleStyle('code'));

    var appId = null;
    return Database.get('Ids', 'appId')
        .then(retrievedAppId => {
          appId = retrievedAppId;
          log.debug(`Calling pushManager.subscribe to resubscribe expired subscription`);
          return serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true});
        }).then(subscription => {
          log.debug(`Finished calling pushManager.subscribe to resubscribe expired subscription:`, subscription);

          var subscriptionInfo = {};
          if (subscription) {
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
            log.warn('Could not subscribe your browser for push notifications.');
          }

          return ServiceWorker.registerWithOneSignal(appId, subscriptionInfo);
        })
        .then(() => {
          log.debug(`Finished updating new subscription`);
        })
        .catch(function (e) {
          log.error('Error while subscribing for push:', e);
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
  static registerWithOneSignal(appId, subscriptionInfo) {
    let deviceType = getDeviceTypeForBrowser();
    return Promise.all([
      Database.get('Ids', 'userId'),
    ])
        .then(([userId, subscription]) => {
          if (!userId) {
            return Promise.reject('No user ID found; cannot update existing player info');
          }
          let requestUrl = `players/${userId}`;

          let requestData = {
            app_id: appId,
            device_type: deviceType,
            language: Environment.getLanguage(),
            timezone: new Date().getTimezoneOffset() * -60,
            device_model: navigator.platform + " " + Browser.name,
            device_os: Browser.version,
            sdk: ServiceWorker.VERSION,
          };

          if (subscriptionInfo) {
            requestData.identifier = subscriptionInfo.endpointOrToken;
            // Although we're passing the full endpoint to OneSignal, we still need to store only the registration ID for our SDK API getRegistrationId()
            // Parse out the registration ID from the full endpoint URL and save it to our database
            let registrationId = subscriptionInfo.endpointOrToken.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
            Database.put("Ids", {type: "registrationId", id: registrationId});
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
        .then(response => {
          console.log('Response from ServiceWorker.registerWithOneSignal:', response);
          let {id: userId} = response;

          if (userId) {
            Database.put("Ids", {type: "userId", id: userId});
          }
        });
  }

  /**
   * Returns a promise that is fulfilled with either the default title from the database (first priority) or the page title from the database (alternate result).
   */
  static _getTitle() {
    return new Promise((resolve, reject) => {
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
        })
        .catch(function (e) {
          log.error(e);
          reject(e);
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
        return Promise.reject('Unexpected push message payload received.', event.data.text());
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
    return new Promise((resolve, reject) => {
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
                    Database.get('Ids', 'appId'),
                    self.registration.pushManager.getSubscription().then(subscription => subscription.endpoint)
                  ])
                .then(([appId, identifier]) => {
                  let deviceType = getDeviceTypeForBrowser();
                  // Get the user ID from OneSignal
                  return OneSignalApi.getUserIdFromSubscriptionIdentifier(appId, deviceType, identifier).then(recoveredUserId => {
                    if (recoveredUserId) {
                      log.debug('Recovered OneSignal user ID:', recoveredUserId);
                      // We now have our OneSignal user ID again
                      return Promise.all([
                        Database.put('Ids', {type: 'userId', id: recoveredUserId}),
                        Database.put('Ids', {
                          type: 'registrationId',
                          id: identifier.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "")
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
                        self.UNSUBSCRIBED_FROM_NOTIFICATIONS = true;
                      });
                });
          }
        })
        .then(response => {
          // The response is an array literal -- response.json() has been called by apiCall()
          // The result looks like this:
          // OneSignalApi.get('players/7442a553-5f61-4b3e-aedd-bb574ef6946f/chromeweb_notification').then(function(response) { console.log(response); });
          // ["{"custom":{"i":"6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"},"icon":"https://onesignal.com/images/notification_logo.png","alert":"asd","title":"ss"}"]
          // ^ Notice this is an array literal with JSON data inside
          for (var i = 0; i < response.length; i++) {
            notifications.push(JSON.parse(response[i]));
          }
          if (notifications.length == 0) {
            log.warn('OneSignal Worker: Received a GCM push signal, but there were no messages to retrieve. Are you' +
                ' using the wrong API URL?', API_URL);
          }
          resolve(notifications);
        })
        .catch(e => {
          log.error(e);
          reject(e);
        });
    });
  }
}

// Expose this class to the global scope
self.OneSignalWorker = ServiceWorker;

// Set logging to the appropriate level
log.setDefaultLevel(__DEV__ ? log.levels.TRACE : log.levels.ERROR);

// Print it's happy time!
log.info(`%cOneSignal Service Worker loaded (version ${__VERSION__}, ${Environment.getEnv()} environment).`, getConsoleStyle('bold'));

// Run our main file
ServiceWorker.run();