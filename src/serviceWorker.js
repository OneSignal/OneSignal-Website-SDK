import { DEV_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js'
import { sendNotification } from './api.js';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import "./cache-polyfill.js";
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
    event.waitUntil(new Promise(
      function (resolve, reject) {
        OneSignal._getTitle(null, function (title) {
          OneSignal._getDbValue('Options', 'defaultIcon')
            .then(function _handleGCMMessage_GotDefaultIcon(defaultIconResult) {
              OneSignal._getLastNotifications(function (response, appId) {
                var notificationData = {
                  id: response.custom.i,
                  message: response.alert,
                  additionalData: response.custom.a
                };

                if (response.title)
                  notificationData.title = response.title;
                else
                  notificationData.title = title;

                if (response.custom.u)
                  notificationData.launchURL = response.custom.u;

                if (response.icon)
                  notificationData.icon = response.icon;
                else if (defaultIconResult)
                  notificationData.icon = defaultIconResult.value;

                // Never nest the following line in a callback from the point of entering from _getLastNotifications
                serviceWorker.registration.showNotification(notificationData.title, {
                  body: response.alert,
                  icon: notificationData.icon,
                  tag: JSON.stringify(notificationData)
                }).then(resolve)
                  .catch(function (e) {
                    log.error(e);
                  });

                OneSignal._getDbValue('Options', 'defaultUrl')
                  .then(function (defaultUrlResult) {
                    if (defaultUrlResult)
                      OneSignal._defaultLaunchURL = defaultUrlResult.value;
                  })
                  .catch(function (e) {
                    log.error(e);
                  });
                ;
              }, resolve);
            })
            .catch(function (e) {
              log.error(e);
            });
        });
      }));
  }

  static onNotificationClicked(event) {
    log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)})`, getConsoleStyle('code'));

  }

  static onServiceWorkerInstalled(event) {
    log.debug(`Called %conServiceWorkerInstalled(${JSON.stringify(event, null, 4)})`, getConsoleStyle('code'));
    log.info(`Installing service worker: %c${self.location.pathname}`, getConsoleStyle('code'), `(version ${OneSignal._VERSION})`);
    if (self.location.pathname.indexOf("OneSignalSDKWorker.js") > -1)
      OneSignal._putDbValue("Ids", {type: "WORKER1_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION});
    else
      OneSignal._putDbValue("Ids", {type: "WORKER2_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION});

    if (ServiceWorker.onOurSubdomain) {
      event.waitUntil(
        caches.open("OneSignal_" + OneSignal._VERSION).then(function (cache) {
          return cache.addAll([
            '/sdks/initOneSignalHttpIframe',
            '/sdks/initOneSignalHttpIframe?session=*',
            '/sdks/manifest_json']);
        })
          .catch(function (e) {
            log.error(e);
          })
      );
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
}

// Expose this class to the global scope
self.OneSignalServiceWorker = ServiceWorker;

// Set logging to the appropriate level
log.setDefaultLevel(__DEV__ ? log.levels.TRACE : log.levels.ERROR);

// Print it's happy time!
log.info(`%cOneSignal Service Worker loaded (version ${__VERSION__}, ${Environment.getEnv()} environment).`, getConsoleStyle('bold'));

// Run our main file
ServiceWorker.run();