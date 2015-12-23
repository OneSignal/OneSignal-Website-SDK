import { DEV_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js'
import { sendNotification, apiCall } from './api.js';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import "./cache-polyfill.js";
import Database from './database.js';
import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle } from './utils.js';

class ServiceWorker {

  static run() {
    self.addEventListener('push', ServiceWorker.onPushReceived);
    self.addEventListener('notificationclick', ServiceWorker.onNotificationClicked);
    self.addEventListener('install', ServiceWorker.onServiceWorkerInstalled);

    // If the user is proxying through our subdomain (e.g. website.onesignal.com/sdks/)
    if (ServiceWorker.onOurSubdomain) {
      // Cache resources?
      self.addEventListener('fetch', ServiceWorker.onFetch);
    }
  }

  /**
   * Occurs when a push message is received.
   * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle notifications.
   * @param event
   */
  static onPushReceived(event) {
    log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)})`, getConsoleStyle('code'));


    event.waitUntil(new Promise((resolve, reject) => {
      var extra = {};
      ServiceWorker._getTitle()
        .then(title => {
          extra.title = title;
          return Database.get('Options', 'defaultIcon');

        })
        .then(defaultIconResult => {
          extra.defaultIconResult = defaultIconResult
          return extra;

        })
        .then(extra => {
          return ServiceWorker._getLastNotifications();

        })
        .then(notifications => {

          // At this point, we have an array of notification objects (all the JSON is parsed)
          // We want to fire a notification for each object
          // We need to use event.waitUntil() to extend the life of the service worker (workers can be killed if idling)
          // We want to extend the service worker lifetime until all promises for showNotification resolve
          let notificationEventPromises = [];

          for (let notification of notifications) {
            let data = {
              id: notification.custom.i,
              message: notification.alert,
              additionalData: notification.custom.a
            };

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

            // Never nest the following line in a callback from the point of entering from _getLastNotifications
            let notificationEventPromise = self.registration.showNotification(data.title, {
              body: data.message,
              icon: data.icon,
              tag: JSON.stringify(data)
            });

            notificationEventPromises.push(notificationEventPromise);
            return Promise.all(notificationEventPromises);
          }
        })
        .then(resolve)
        .catch(e => log.error(e));
    }));
  }

  static onNotificationClicked(event) {
    log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)})`, getConsoleStyle('code'));

    var notificationData = JSON.parse(event.notification.tag);
    event.notification.close();

    event.waitUntil(
      Database.get('Options', 'defaultUrl')
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

          for (let i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if ('focus' in client && client.url == launchURL) {
              client.focus();

              // targetOrigin not valid here as the service worker owns the page.
              client.postMessage(notificationData);
              return;
            }
          }

          if (launchURL !== 'javascript:void(0);' && launchURL !== 'do_not_open') {
            return Database.put("NotificationOpened", {url: launchURL, data: notificationData})
              .then(() => {

                clients.openWindow(launchURL).catch(function (error) {
                  // Should only fall into here if going to an external URL on Chrome older than 43.
                  clients.openWindow(registration.scope + "redirector.html?url=" + launchURL);
                });
              });
          }
        })
        .then(() => {
          return Promise.all([Database.get('Ids', 'appId'), Database.get('Ids', 'userId')])
        })
        .then(results => {

          var [ appIdResult, userIdResult ] = results;
          if (appIdResult && userIdResult) {
            apiCall("notifications/" + notificationData.id, "PUT", {
              app_id: appIdResult.id,
              player_id: userIdResult.id,
              opened: true
            });
          }
        })
        .catch(e => log.error(e))
    );
  }

  static onServiceWorkerInstalled(event) {
    log.debug(`Called %conServiceWorkerInstalled(${JSON.stringify(event, null, 4)})`, getConsoleStyle('code'));
    log.info(`Installing service worker: %c${self.location.pathname}`, getConsoleStyle('code'), `(version ${__VERSION__})`);

    if (self.location.pathname.indexOf("OneSignalSDKWorker.js") > -1)
      var serviceWorkerVersionType = 'WORKER1_ONE_SIGNAL_SW_VERSION'
    else
      var serviceWorkerVersionType = 'WORKER2_ONE_SIGNAL_SW_VERSION';

    if (ServiceWorker.onOurSubdomain) {
      event.waitUntil(
        Database.put("Ids", {type: serviceWorkerVersionType, id: __VERSION__})
          .then(() => {
            return caches.open("OneSignal_" + __VERSION__)
          })
          .then(cache => {

            return cache.addAll([
              '/sdks/initOneSignalHttpIframe',
              '/sdks/initOneSignalHttpIframe?session=*',
              '/sdks/manifest_json']);
          })
          .catch(e => log.error(e))
      );
    } else {
      event.waitUntil(Database.put("Ids", {type: serviceWorkerVersionType, id: __VERSION__}));
    }
  }

  static onFetch(event) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Cache hit -- return response
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
        .catch((e) => log.error(e))
    );
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
self.OneSignalServiceWorker = ServiceWorker;

// Set logging to the appropriate level
log.setDefaultLevel(__DEV__ ? log.levels.TRACE : log.levels.ERROR);

// Print it's happy time!
log.info(`%cOneSignal Service Worker loaded (version ${__VERSION__}, ${Environment.getEnv()} environment).`, getConsoleStyle('bold'));

// Run our main file
ServiceWorker.run();