import { DEV_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js'
import { sendNotification, apiCall } from './api.js';
import log from 'loglevel';
import Database from './database.js';
import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, contains, trimUndefined } from './utils.js';
import objectAssign from 'object-assign';
import swivel from 'swivel';
import * as Browser from 'bowser';

class ServiceWorker {

  static get VERSION() {
    return __VERSION__;
  }

  static get environment() {
    return Environment;
  }

  static get log() {
    return log;
  }

  static get swivel() {
    return swivel;
  }

  static get database() {
    return Database;
  }

  static get apiUrl() {
    return API_URL;
  }

  static run() {
    self.addEventListener('push', ServiceWorker.onPushReceived);
    self.addEventListener('notificationclick', ServiceWorker.onNotificationClicked);
    self.addEventListener('install', ServiceWorker.onServiceWorkerInstalled);
    self.addEventListener('activate', ServiceWorker.onServiceWorkerActivated);

    // 3/2/16: Firefox does not send the Origin header when making CORS request through service workers, which breaks some sites that depend on the Origin header being present (https://bugzilla.mozilla.org/show_bug.cgi?id=1248463)
    // Fix: If the browser is Firefox and is v44, use the following workaround:
    if (Browser.firefox && Browser.version && contains(Browser.version, '44')) {
      self.REFETCH_REQUESTS = true;
    }

    if (self.REFETCH_REQUESTS) {
      self.addEventListener('fetch', ServiceWorker.onFetch);
    }

    // Install messaging event handlers for page <-> service worker communication
    swivel.on('data', ServiceWorker.onMessageReceived);
  }

  /**
   * Occurs when a message is received from the host page.
   * @param context Used to reply to the host page.
   * @param data The message contents.
   */
  static onMessageReceived(context, data) {
    log.debug(`%c${Environment.getEnv().capitalize()} ⬸ Host:`, getConsoleStyle('serviceworkermessage'), data, context);
    if (data === 'notification.closeall') {
      self.registration.getNotifications().then(notifications => {
        for (let notification of notifications) {
          notification.close();
        }
      });
    } else if (data === 'push.mute') {
      ServiceWorker._breakOnPushReceived = true;
    } else if (data === 'push.restore') {
      ServiceWorker._breakOnPushReceived = false;
    } else if (data === 'push.status') {
      Database.get('Ids', 'backupNotification')
        .then(backupNotificationResult => {
          if (backupNotificationResult && backupNotificationResult.id) {
            var backupNotification = backupNotificationResult.id;
          }
          swivel.broadcast('data', {
            backupNotification: backupNotification,
            isPushIntentionallyBroken: ServiceWorker._breakOnPushReceived
          });
        });
    }
  }

  /**
   * Occurs when a push message is received.
   * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle notifications.
   * @param event
   */
  static onPushReceived(event) {
    log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    event.waitUntil(new Promise((resolve, reject) => {
      var extra = {};
      var promise = Promise.resolve();
      Promise.all([
        ServiceWorker._getTitle(),
        Database.get('Options', 'defaultIcon'),
        Database.get('Options', 'persistNotification'),
        Database.get('Ids', 'appId'),
      ])
        .then(results => {
          extra.title = results[0];
          extra.defaultIconResult = results[1];
          if (extra.defaultIconResult)
            extra.defaultIconResult = extra.defaultIconResult.value;
          extra.persistNotification = results[2];
          if (extra.persistNotification)
            extra.persistNotification = extra.persistNotification.value;
          extra.appId = results[3];
          if (extra.appId)
            extra.appId = extra.appId.id;
          else
            log.error('There was no app ID stored when trying to display the notification. An app ID is required.');
        })
        .then(() => ServiceWorker._getLastNotifications())
        .then(notifications => {
          if (!notifications || notifications.length == 0) {
            log.warn('Push signal received, but there were no messages after calling chromeweb_notification().')
            ServiceWorker.logPush("chromeweb_notification_no_results", 'last_occurred');
          }
          // At this point, we have an array of notification objects (all the JSON is parsed)
          // We want to fire a notification for each object
          // We need to use event.waitUntil() to extend the life of the service worker (workers can be killed if idling)
          // We want to extend the service worker lifetime until all promises for showNotification resolve
          let notificationEventPromiseFns = [];

          for (let notification of notifications) {
            // notification is the raw object returned by the OneSignal API
            let data = {
              id: notification.custom.i,
              message: notification.alert,
              additionalData: notification.custom.a
            };

            let retrievedPushLogPromise = ServiceWorker.logPush(data.id, 'retrieved');

            if (notification.title)
              data.title = notification.title;
            else
              data.title = extra.title;

            if (notification.custom.u)
              data.launchURL = notification.custom.u;

            if (notification.icon)
              data.icon = notification.icon;
            else if (extra.defaultIconResult)
              data.icon = extra.defaultIconResult;

            let saveAsBackupNotification = true;
            let isOneSignalWelcomeNotification = data.additionalData && data.additionalData.__isOneSignalWelcomeNotification;
            if (isOneSignalWelcomeNotification) {
              saveAsBackupNotification = false;
            }
            if (saveAsBackupNotification) {
              let backupData = objectAssign({}, data, {displayedTime: Date.now()})
              Database.put('Ids', {type: 'backupNotification', id: data });
            }

            // Never nest the following line in a callback from the point of entering from _getLastNotifications
            notificationEventPromiseFns.push((data => {
              let showNotificationPromise = self.registration.showNotification(data.title, {
                // https://developers.google.com/web/updates/2015/10/notification-requireInteraction?hl=en
                // On Chrome 47+ Desktop only, notifications will be dismissed after 20 seconds unless requireInteraction is set to true
                requireInteraction: extra.persistNotification,
                body: data.message,
                icon: data.icon,
                tag: 'notification-tag-' + extra.appId,
                data: data
              });
              return showNotificationPromise.then(() => retrievedPushLogPromise).then(() => ServiceWorker.logPush(data.id, 'displayed'));
            }).bind(null, data));
            notificationEventPromiseFns.push((data => ServiceWorker.executeWebhooks('notification.displayed', data)).bind(null, data));
          }
          return notificationEventPromiseFns.reduce(function (p, fn) {
            return p = p.then(fn);
          }, promise);
        })
        .then(resolve)
        .catch(e => {
          log.error('Failed to display a notification:', e);
          log.warn("Because a notification failed to display, we'll display the last known notification, so long as it isn't the welcome notification.");

          Database.get('Ids', 'backupNotification')
            .then(backupNotificationResult => {
              if (backupNotificationResult && backupNotificationResult.id) {
                let backupNotification = backupNotificationResult.id;
                self.registration.showNotification(backupNotification.title, {
                  requireInteraction: false, // Don't persist our backup notification
                  body: backupNotification.message,
                  icon: backupNotification.icon,
                  tag: 'notification-tag-' + extra.appId,
                  data: backupNotification
                });
              } else {
                self.registration.showNotification(extra.title, {
                  requireInteraction: false, // Don't persist our backup notification
                  body: 'You have new updates.',
                  icon: extra.defaultIconResult,
                  tag: 'notification-tag-' + extra.appId,
                  data: {backupNotification: true}
                });
              }
            });

        });
    }));
  }

  static logPush(notificationId, action) {
    var currentPushLog = {};

    return Database.get("Options", "pushLog")
      .then(pushLogResult => {
        if (pushLogResult) {
          currentPushLog = pushLogResult.value;
          // Note: Because we're storing consistent data, each "entry" takes up 156 characters stringified
          // Let's only store the last 5000 pushes
          let estimateBytesPerUnicodeChar = 2.5*1024*1024/4;
          if (JSON.stringify(currentPushLog).length > 156 * 500) {
            log.warn('Clearing push log because it grew too large.');
            currentPushLog = {};
          }
        }

        // Add to our pushlog
        if (!currentPushLog.hasOwnProperty(notificationId)) {
          currentPushLog[notificationId] = {};
        }

        // Might be currentPushLog[id]['displayed'] = Tue Feb 23 2016 20:26:01 GMT-0800 (PST)  (a Date object)
        currentPushLog[notificationId][action] = new Date();
      })
      .then(() => Database.put("Options", {key: "pushLog", value: currentPushLog}));
  }

  static executeWebhooks(event, notification) {
    var isServerCorsEnabled = false;
    var userId = null;
    return Database.get('Ids', 'userId')
      .then(userIdResult => {
        if (userIdResult) {
          userId = userIdResult.id;
        }
      })
      .then(() => Database.get('Options', 'webhooks.cors'))
      .then(corsResult => {
        isServerCorsEnabled = corsResult && corsResult.value;
      })
      .then(() => Database.get('Options', `webhooks.${event}`))
      .then(webhookUrlQuery => {
        if (webhookUrlQuery && webhookUrlQuery.value) {
          let url = webhookUrlQuery.value;
          // JSON.stringify() does not include undefined values
          // Our response will not contain those fields here which have undefined values
          let postData = {
            event: event,
            id: notification.id,
            userId: userId,
            heading: notification.title,
            content: notification.message,
            url: notification.launchURL,
            icon: notification.icon,
            data: notification.additionalData
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
      });
  }

  static onNotificationClicked(event) {
    log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    var notificationData = event.notification.data;
    event.notification.close();

    event.waitUntil(
        ServiceWorker.logPush(notificationData.id, 'clicked')
        .then(() => Database.get('Options', 'defaultUrl'))
        .then(defaultUrlResult => {

          if (defaultUrlResult)
            ServiceWorker.defaultLaunchUrl = defaultUrlResult.value;
        })
        .then(() => {
          return clients.matchAll({type: 'window'});
        })
        .then(clientList => {
          var launchURL = registration.scope;
          if (ServiceWorker.defaultLaunchUrl)
            launchURL = ServiceWorker.defaultLaunchUrl;
          if (notificationData.launchURL)
            launchURL = notificationData.launchURL;

          let eventData = {
            id: notificationData.id,
            heading: notificationData.title,
            content: notificationData.message,
            url: notificationData.launchURL,
            icon: notificationData.icon,
            data: notificationData.additionalData
          };
          trimUndefined(eventData);

          for (let i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if ('focus' in client && client.url === launchURL) {
              client.focus();

              /*
               Note: If an existing browser tab, with *exactly* the same URL as launchURL, that tab will be focused and posted a message.
               This event rarely occurs. More than likely, the below will happen.
               */
              swivel.emit(client.id, 'notification.clicked', eventData);
              return;
            }
          }

          /*
           addListenerForNotificationOpened() stuff:
           - A value is stored in IndexedDB, marking this notification's click
               - If the launchURL isn't one of a couple special "don't open anything" values, a new window is then opened to the launchURL
               - If the new window opened loads our SDK, it will retrieve the value we just put in the database (in init() for HTTPS and initHttp() for HTTP)
               - The addListenerForNotificationOpened() will be fired
           */
          return Database.put("NotificationOpened", {url: launchURL, data: eventData})
            .then(() => {
              let launchURLObject = new URL(launchURL);
              if (launchURL !== 'javascript:void(0);' &&
                launchURL !== 'do_not_open' &&
                !contains(launchURLObject.search, '_osp=do_not_open')) {
                clients.openWindow(launchURL).catch(function (error) {
                  // Should only fall into here if going to an external URL on Chrome older than 43.
                  clients.openWindow(registration.scope + "redirector.html?url=" + launchURL);
                });
              }
            });
        })
        .then(() => {
          return Promise.all([Database.get('Ids', 'appId'), Database.get('Ids', 'userId')])
        })
        .then(results => {

          var [ appIdResult, userIdResult ] = results;
          if (appIdResult && userIdResult) {
            return apiCall("notifications/" + notificationData.id, "PUT", {
              app_id: appIdResult.id,
              player_id: userIdResult.id,
              opened: true
            });
          }
        })
        .then(() => {
          return ServiceWorker.executeWebhooks('notification.clicked', notificationData);
        })
        .catch(e => log.error(e))
    );
  }

  static onServiceWorkerInstalled(event) {
    // At this point, the old service worker is still in control
    log.debug(`Called %conServiceWorkerInstalled(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    log.info(`Installing service worker: %c${self.location.pathname}`, getConsoleStyle('code'), `(version ${__VERSION__})`);

    if (contains(self.location.pathname, "OneSignalSDKWorker.js"))
      var serviceWorkerVersionType = 'WORKER1_ONE_SIGNAL_SW_VERSION'
    else
      var serviceWorkerVersionType = 'WORKER2_ONE_SIGNAL_SW_VERSION';

    if (ServiceWorker.onOurSubdomain) {
      event.waitUntil(
        Database.put("Ids", {type: serviceWorkerVersionType, id: __VERSION__})
          .then(() => self.skipWaiting())
          .catch(e => log.error(e))
      );
    } else {
      event.waitUntil(
        Database.put("Ids", {type: serviceWorkerVersionType, id: __VERSION__})
          .then(() => self.skipWaiting())
      );
    }
  }

  /*
      1/11/16: Enable the waiting service worker to immediately become the active service worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
      3/2/16: Remove previous caches
   */
  static onServiceWorkerActivated(event) {
    // The old service worker is gone now
    log.debug(`Called %conServiceWorkerActivated(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

    // Remove all OneSignal caches
    let deleteCachePromise = caches.keys()
      .then(keys => Promise.all(keys.map(key => {
        if (key.indexOf('OneSignal_') == 0) {
          log.info('Deleting old OneSignal cache:', key);
          return caches.delete(key);
        }
      })));
    let claimPromise = self.clients.claim();
    event.waitUntil(deleteCachePromise.then(claimPromise));
  }

  static onFetch(event) {
    event.respondWith(fetch(event.request));
  }

  static get onOurSubdomain() {
    return __DEV__ || location.href.match(/https:\/\/.*\.onesignal.com\/sdks\//) !== null;
  }

  /**
   * Returns a promise that is fulfilled with either the default title from the database (first priority) or the page title from the database (alternate result).
   */
  static _getTitle() {
    return new Promise((resolve, reject) => {
      Promise.all([Database.get('Options', 'defaultTitle'), Database.get('Options', 'pageTitle')])
        .then((results) => {
          var [ defaultTitleResult, pageTitleResult ] = results;

          if (defaultTitleResult) {
            resolve(defaultTitleResult.value);
          }
          else if (pageTitleResult && pageTitleResult.value != null) {
            resolve(pageTitleResult.value);
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
   * Returns a promise that is fulfilled with the JSON result of chrome notifications.
   */
  static _getLastNotifications() {
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
        .then(userIdResult => {
          if (userIdResult) {
            return apiCall("players/" + userIdResult.id + "/chromeweb_notification", "GET");
          }
          else {
            log.error('Tried to get last notifications, but there was no userId found in the database.');
            reject(new Error('Tried to get last notifications, but there was no userId found in the database.'));
          }
        })
        .then(response => {
          // The response is an array literal -- response.json() has been called by apiCall()
          // The result looks like this:
          // apiCall("players/7442a553-5f61-4b3e-aedd-bb574ef6946f/chromeweb_notification", "GET").then(function(response) { console.log(response); });
          // ["{"custom":{"i":"6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"},"icon":"https://onesignal.com/images/notification_logo.png","alert":"asd","title":"ss"}"]
          // ^ Notice this is an array literal with JSON data inside
          for (var i = 0; i < response.length; i++) {
            notifications.push(JSON.parse(response[i]));
          }

          if (ServiceWorker._breakOnPushReceived) {
            log.warn('Received notifications from server, but intentionally breaking %conPushReceived', getConsoleStyle('code'), 'without displaying a notification.', response);
            throw new Error('push.mute intentionally not returning any notifications.');
          } else {
            resolve(notifications);
          }
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