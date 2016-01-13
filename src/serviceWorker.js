import { DEV_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js'
import { sendNotification, apiCall } from './api.js';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import "./cache-polyfill.js";
import Database from './database.js';
import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle } from './utils.js';
//import swivel from 'swivel';

class ServiceWorker {

  static run() {
    self.addEventListener('push', ServiceWorker.onPushReceived);
    self.addEventListener('notificationclick', ServiceWorker.onNotificationClicked);
    self.addEventListener('install', ServiceWorker.onServiceWorkerInstalled);
    self.addEventListener('activate', ServiceWorker.onServiceWorkerActivated);

    // If the user is proxying through our subdomain (e.g. website.onesignal.com/sdks/)
    if (ServiceWorker.onOurSubdomain) {
      // Cache resources?
      self.addEventListener('fetch', ServiceWorker.onFetch);
    }

    // Install messaging event handlers for page <-> service worker communication
    //swivel.on('data', ServiceWorker.onMessageReceived);
  }

  static get CACHE_URLS() {
    return [
      '/sdks/initOneSignalHttpIframe',
      '/sdks/initOneSignalHttpIframe?session=*',
      '/sdks/manifest_json',
      '/dev_sdks/initOneSignalHttpIframe',
      '/dev_sdks/initOneSignalHttpIframe?session=*',
      '/dev_sdks/manifest_json'
      ];
  }

  ///**
  // * Occurs when a message is received from the host page.
  // * @param context Used to reply to the host page.
  // * @param data The message contents.
  // */
  //static onMessageReceived(context, data) {
  //  log.debug(`Called %conMessageReceived(${JSON.stringify(data, null, 4)}):`, getConsoleStyle('code'), context, data);
  //  if (data === 'notification.closeall') {
  //    self.registration.getNotifications().then(notifications => {
  //      for (let notification of notifications) {
  //        notification.close();
  //      }
  //    });
  //  }
  //  context.reply('data', 'Got your message: ' + data);
  //}

  /**
   * Occurs when a push message is received.
   * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle notifications.
   * @param event
   */
  static onPushReceived(event) {
    log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);


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
              // https://developers.google.com/web/updates/2015/10/notification-requireInteraction?hl=en
              // On Chrome 47+ Desktop only, notifications will be dismissed after 20 seconds unless requireInteraction is set to true
              requireInteraction: true,
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
    log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);

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
            if ('focus' in client && client.url === launchURL) {
              client.focus();

              /*
               Note: If an existing browser tab, with *exactly* the same URL as launchURL, that tab will be focused and posted a message.
               This event rarely occurs. More than likely, the below will happen.
               */
              client.postMessage(notificationData);
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
          return Database.put("NotificationOpened", {url: launchURL, data: notificationData})
            .then(() => {
              let launchURLObject = new URL(launchURL);
              if (launchURL !== 'javascript:void(0);' &&
                launchURL !== 'do_not_open' &&
                !launchURLObject.search.includes('_osp=do_not_open')) {
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
    // At this point, the old service worker is still in control
    log.debug(`Called %conServiceWorkerInstalled(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
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
            return cache.addAll(ServiceWorker.CACHE_URLS);
          })
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
   */
  static onServiceWorkerActivated(event) {
    // The old service worker is gone now
    log.debug(`Called %conServiceWorkerActivated(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
    event.waitUntil(self.clients.claim());
  }

  static onFetch(event) {
    let url = event.request.url;
    for (let cacheUrl of ServiceWorker.CACHE_URLS) {
      if (url.indexOf(cacheUrl) > -1) {
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
    }
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