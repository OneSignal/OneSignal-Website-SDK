import { DEV_HOST, DEV_FRAME_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js';
import './string.js';
import OneSignalApi from './oneSignalApi.js';
import IndexedDb from './indexedDb';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import Event from "./events.js";
import Bell from "./bell/bell.js";
import Cookie from 'js-cookie';
import Database from './database.js';
import * as Browser from 'bowser';
import { isPushNotificationsSupported, isPushNotificationsSupportedAndWarn, getConsoleStyle, once, guid, contains, unsubscribeFromPush, decodeHtmlEntities, getUrlQueryParam, executeAndTimeoutPromiseAfter, wipeLocalIndexedDb } from './utils.js';
import objectAssign from 'object-assign';
import EventEmitter from 'wolfy87-eventemitter';
import heir from 'heir';
import swivel from 'swivel';
import Postmam from './postmam.js';
import OneSignalHelpers from './helpers.js';
import Popover from './popover/popover';



export default class OneSignal {
  /**
   * Pass in the full URL of the default page you want to open when a notification is clicked.
   * @publiclySupportedApi
   */
  static setDefaultNotificationUrl(url) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    function __setDefaultNotificationUrl() {
      return Database.put("Options", {key: "defaultUrl", value: url});
    }

    if (!OneSignal.initialized) {
      return new Promise((resolve, reject) => {
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __setDefaultNotificationUrl().then(resolve).catch(reject));
      });
    } else {
      return __setDefaultNotificationUrl();
    }
  }

  /**
   * Sets the default title to display on notifications. Will default to the page's document.title if you don't call this.
   * @remarks Either DB value defaultTitle or pageTitle is used when showing a notification title.
   * @publiclySupportedApi
   */
  static setDefaultTitle(title) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    function __setDefaultTitle() {
      return Database.put("Options", {key: "defaultTitle", value: title});
    }

    if (!OneSignal.initialized) {
      return new Promise((resolve, reject) => {
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __setDefaultTitle().then(resolve).catch(reject));
      });
    } else {
      return __setDefaultTitle();
    }
  }

  static onNotificationPermissionChange(event) {
    OneSignalHelpers.checkAndTriggerSubscriptionChanged();
  }

  static _onSubscriptionChanged(newSubscriptionState) {
    if (newSubscriptionState === true) {
      Promise.all([
                    OneSignal.getUserId(),
                    OneSignal.getAppId()
                  ])
             .then(([userId, appId]) => {
               let welcome_notification_opts = OneSignal.config['welcomeNotification'];
               let welcome_notification_disabled = ((welcome_notification_opts !== undefined) &&
                                                    (welcome_notification_opts['disable'] === true));
               let title = ((welcome_notification_opts !== undefined) &&
                            (welcome_notification_opts['title'] !== undefined) &&
                            (welcome_notification_opts['title'] !== null)) ? welcome_notification_opts['title'] : '';
               let message = ((welcome_notification_opts !== undefined) &&
                              (welcome_notification_opts['message'] !== undefined) &&
                              (welcome_notification_opts['message'] !== null) &&
                              (welcome_notification_opts['message'].length > 0)) ?
                             welcome_notification_opts['message'] :
                             'Thanks for subscribing!';
               let unopenableWelcomeNotificationUrl = new URL(location.href);
               unopenableWelcomeNotificationUrl = unopenableWelcomeNotificationUrl.origin + '?_osp=do_not_open';
               let url = (welcome_notification_opts &&
                          welcome_notification_opts['url'] &&
                          (welcome_notification_opts['url'].length > 0)) ?
                         welcome_notification_opts['url'] :
                         unopenableWelcomeNotificationUrl;
               title = decodeHtmlEntities(title);
               message = decodeHtmlEntities(message);
               if (!welcome_notification_disabled) {
                 log.debug('Sending welcome notification.');
                 OneSignalApi.sendNotification(appId, [userId], {'en': title}, {'en': message}, url, null,
                                               {__isOneSignalWelcomeNotification: true});
                 Event.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {title: title, message: message, url: url});
               }
             })
             .catch(function (e) {
               log.error(e);
             });
    }
  }

  static _onDbValueSet(info) {
    /*
     For HTTPS sites, this is how the subscription change event gets fired.
     For HTTP sites, leaving this enabled fires the subscription change event twice. The first event is from Postmam
     remotely re-triggering the db.set event to notify the host page that the popup set the user ID in the db. The second
     event is from Postmam remotely re-triggering the subscription.changed event which is also fired from the popup.
     */
    if (info.type === 'userId' && !OneSignal.isUsingSubscriptionWorkaround()) {
      OneSignalHelpers.checkAndTriggerSubscriptionChanged();
    }
  }

  static _onInternalSubscriptionSet(event) {
    var newSubscriptionValue = event;
    LimitStore.put('setsubscription.value', newSubscriptionValue);
    OneSignalHelpers.checkAndTriggerSubscriptionChanged();
  }

  static _storeInitialValues() {
    return Promise.all([
      OneSignal.isPushNotificationsEnabled(),
      OneSignal.getNotificationPermission(),
      OneSignal.getUserId(),
      OneSignal.getSubscription()
    ])
      .then(([isPushEnabled, notificationPermission, userId, optIn]) => {
        LimitStore.put('setsubscription.value', optIn);
        return Promise.all([
          Database.put('Options', {key: 'isPushEnabled', value: isPushEnabled}),
          Database.put('Options', {key: 'notificationPermission', value: notificationPermission})
        ]);
      });
  }

  /**
   * This event occurs after init.
   * For HTTPS sites, this event is called after init.
   * For HTTP sites, this event is called after the iFrame is created, and a message is received from the iFrame signaling cross-origin messaging is ready.
   * @private
   */
  static _onSdkInitialized() {
    // Store initial values of notification permission, user ID, and manual subscription status
    // This is done so that the values can be later compared to see if anything changed
    // This is done here for HTTPS, it is done after the call to _addSessionIframe in _sessionInit for HTTP sites, since the iframe is needed for communication
    OneSignal._storeInitialValues();
    OneSignal._installNativePromptPermissionChangedHook();

    if (navigator.serviceWorker && window.location.protocol === 'https:') {
      navigator.serviceWorker.getRegistration()
          .then(registration => {
            if (registration && registration.active) {
              OneSignalHelpers.establishServiceWorkerChannel(registration);
            }
          })
          .catch(e => {
            if (e.code === 9) { // Only secure origins are allowed
              if (location.protocol === 'http:' || Environment.isIframe()) {
                // This site is an HTTP site with an <iframe>
                // We can no longer register service workers since Chrome 42
                log.debug(`Expected error getting service worker registration on ${location.href}:`, e);
              }
            } else {
              log.error(`Error getting Service Worker registration on ${location.href}:`, e);
            }
          });
    }

    if (Environment.isBrowser() && !OneSignal.notifyButton) {
      OneSignal.config.notifyButton = OneSignal.config.notifyButton || {};
      if (OneSignal.config.bell) {
        // If both bell and notifyButton, notifyButton's options take precedence
        objectAssign(OneSignal.config.bell, OneSignal.config.notifyButton);
        objectAssign(OneSignal.config.notifyButton, OneSignal.config.bell);
      }
      if (OneSignal.config.notifyButton.displayPredicate &&
          typeof OneSignal.config.notifyButton.displayPredicate === "function") {
        Promise.resolve(OneSignal.config.notifyButton.displayPredicate())
            .then(predicateValue => {
              if (predicateValue !== false) {
                OneSignal.notifyButton = new Bell(OneSignal.config.notifyButton);
                OneSignal.notifyButton.create();
              } else {
                log.debug('Notify button display predicate returned false so not showing the notify button.');
              }
            });
      } else {
        OneSignal.notifyButton = new Bell(OneSignal.config.notifyButton);
        OneSignal.notifyButton.create();
      }
    }

    if (Browser.safari && OneSignal.config.autoRegister === false) {
      OneSignal.isPushNotificationsEnabled(enabled => {
        if (enabled) {
          /*  The user is on Safari and *specifically* set autoRegister to false.
           The normal case for a user on Safari is to not set anything related to autoRegister.
           With autoRegister false, we don't automatically show the permission prompt on Safari.
           However, if push notifications are already enabled, we're actually going to make the same
           subscribe call and register the device token, because this will return the same device
           token and allow us to update the user's session count and last active.
           For sites that omit autoRegister, autoRegister is assumed to be true. For Safari, the session count
           and last active is updated from this registration call.
           */
          OneSignal._sessionInit({__sdkCall: true});
        }
      });
    }

    if (OneSignal.isUsingSubscriptionWorkaround() && !OneSignalHelpers.isContinuingBrowserSession()) {
      /*
       The user is on an HTTP site and they accessed this site by opening a new window or tab (starting a new
       session). This means we should increment their session_count and last_active by calling
       registerWithOneSignal(). Without this call, the user's session and last_active is not updated. We only
       do this if the user is actually registered with OneSignal though.
       */
      log.debug(`(${Environment.getEnv()}) Updating session info for HTTP site.`);
      OneSignal.isPushNotificationsEnabled(isPushEnabled => {
        if (isPushEnabled) {
          return OneSignal.getAppId()
              .then(appId => OneSignalHelpers.registerWithOneSignal(appId, null));
        }
      });
    }
  }

  static _onDatabaseRebuilt() {
    OneSignal._isNewVisitor = true;
  }

  /**
   * Returns true if the current browser is a supported browser for push notifications, service workers, and promises.
   * The following browsers are known to be supported:
   *  - Chrome:  On Windows, Android, Mac OS X, and Linux. Not supported on iOS. Version 42+.
   *  - Firefox: On desktop releases version 44 or higher. Not supported on iOS or mobile Firefox v44.
   *  - Safari:  Version 7.1+ on desktop Mac OS X only. Not supported on iOS.
   */
  static isPushNotificationsSupported() {
    return isPushNotificationsSupported();
  }

  static _installNativePromptPermissionChangedHook() {
    if (navigator.permissions && !(Browser.firefox && Number(Browser.version) <= 45)) {
      OneSignal._usingNativePermissionHook = true;
      // If the browser natively supports hooking the subscription prompt permission change event
      //     use it instead of our SDK method
      navigator.permissions.query({name: 'notifications'}).then(function (permissionStatus) {
        permissionStatus.onchange = function () {
          OneSignal.triggerNotificationPermissionChanged();
        };
      })
        .catch(function (e) {
          log.error(e);
        });
    }
  }

  static init(options) {
    log.debug(`Called %cinit(${JSON.stringify(options, null, 4)})`, getConsoleStyle('code'));

    if (Environment.isBrowser() && window.localStorage && window.localStorage["onesignal.debugger.init"])
      debugger;

    if (OneSignal._initCalled) {
      log.error(`OneSignal: Please don't call init() more than once. Any extra calls to init() are ignored. The following parameters were not processed: %c${JSON.stringify(Object.keys(options))}`, getConsoleStyle('code'));
      return 'return';
    }
    OneSignal._initCalled = true;

    OneSignal.config = objectAssign({
      path: '/'
    }, options);

    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    if (Browser.safari && !OneSignal.config.safari_web_id) {
      log.warn("OneSignal: Required parameter %csafari_web_id", getConsoleStyle('code'), 'was not passed to OneSignal.init(), skipping SDK initialization.');
      return;
    }

    function __init() {
      if (OneSignal.__initAlreadyCalled) {
        log.debug('OneSignal: Skipping extra init() event.');
        return;
      } else {
        OneSignal.__initAlreadyCalled = true;
      }
      OneSignalHelpers.fixWordpressManifestIfMisplaced();

      if (OneSignal.isUsingSubscriptionWorkaround()) {
        if (OneSignal.config.subdomainName) {
          OneSignal.config.subdomainName = OneSignalHelpers.autoCorrectSubdomain(OneSignal.config.subdomainName);
        } else {
          log.error('OneSignal: Your JavaScript initialization code is missing a required parameter %csubdomainName',
                    getConsoleStyle('code'),
                    '. HTTP sites require this parameter to initialize correctly. Please see steps 1.5 and 2.2 at ' +
                    'https://documentation.onesignal.com/docs/web-push-sdk-setup-http)');
          return;
        }

        if (Environment.isDev()) {
          OneSignal.iframeUrl = `${DEV_FRAME_HOST}/webPushIframe`;
          OneSignal.popupUrl = `${DEV_FRAME_HOST}/subscribe`;
        }
        else {
          OneSignal.iframeUrl = `https://${OneSignal.config.subdomainName}.onesignal.com/webPushIframe`;
          OneSignal.popupUrl = `https://${OneSignal.config.subdomainName}.onesignal.com/subscribe`;
        }
      } else {
        if (Environment.isDev()) {
          OneSignal.modalUrl = `${DEV_FRAME_HOST}/webPushModal`;
        } else {
          OneSignal.modalUrl = `https://onesignal.com/webPushModal`;
        }
      }


      let subdomainPromise = Promise.resolve();
      if (OneSignal.isUsingSubscriptionWorkaround()) {
        subdomainPromise = OneSignal.loadSubdomainIFrame(`${location.protocol}//`)
          .then(() => log.info('Subdomain iFrame loaded'))
      }

      OneSignal.on(Database.EVENTS.REBUILT, OneSignal._onDatabaseRebuilt);
      OneSignal.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, OneSignal.onNotificationPermissionChange);
      OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, OneSignal._onSubscriptionChanged);
      OneSignal.on(Database.EVENTS.SET, OneSignal._onDbValueSet);
      OneSignal.on(OneSignal.EVENTS.INTERNAL_SUBSCRIPTIONSET, OneSignal._onInternalSubscriptionSet);
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED, OneSignal._onSdkInitialized);
      subdomainPromise.then(() => {
        window.addEventListener('focus', (event) => {
          // Checks if permission changed everytime a user focuses on the page, since a user has to click out of and back on the page to check permissions
          OneSignalHelpers.checkAndTriggerNotificationPermissionChanged();
        });

        // If Safari - add 'fetch' pollyfill if it isn't already added.
        if (Browser.safari && typeof window.fetch == "undefined") {
          var s = document.createElement('script');
          s.setAttribute('src', "https://cdnjs.cloudflare.com/ajax/libs/fetch/0.9.0/fetch.js");
          document.head.appendChild(s);
        }

        OneSignal._initSaveState()
          .then(() => OneSignal._saveInitOptions())
          .then(() => OneSignal._internalInit());
      });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      __init();
    }
    else {
      log.debug('OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
                ' initialization...');
      window.addEventListener('DOMContentLoaded', () => {
        log.debug('OneSignal: DOMContentLoaded event fired. Document readyState is:', document.readyState);
        __init();
      });
      document.onreadystatechange = () => {
        log.debug('OneSignal: readyStateChange event fired. Document readyState is:', document.readyState);
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          __init();
        }
      };
    }
  }

  static _saveInitOptions() {
    let opPromises = [];
    if (OneSignal.config.persistNotification === false) {
      opPromises.push(Database.put('Options', {key: 'persistNotification', value: false}));
    } else {
      opPromises.push(Database.put('Options', {key: 'persistNotification', value: true}));
    }

    let webhookOptions = OneSignal.config.webhooks;
    ['notification.displayed', 'notification.clicked', 'notification.dismissed'].forEach(event => {
      if (webhookOptions && webhookOptions[event]) {
        opPromises.push(Database.put('Options', {key: `webhooks.${event}`, value: webhookOptions[event]}));
      } else {
        opPromises.push(Database.put('Options', {key: `webhooks.${event}`, value: false}));
      }
    });
    if (webhookOptions && webhookOptions.cors) {
      opPromises.push(Database.put('Options', {key: `webhooks.cors`, value: true}));
    } else {
      opPromises.push(Database.put('Options', {key: `webhooks.cors`, value: false}));
    }

    if (OneSignal.config.notificationClickHandlerMatch) {
      opPromises.push(Database.put('Options', {key: 'notificationClickHandlerMatch', value: OneSignal.config.notificationClickHandlerMatch}));
    } else {
      opPromises.push(Database.put('Options', {key: 'notificationClickHandlerMatch', value: 'exact'}));
    }

    if (OneSignal.config.serviceWorkerRefetchRequests === false) {
      opPromises.push(Database.put('Options', {key: 'serviceWorkerRefetchRequests', value: false}));
    } else {
      opPromises.push(Database.put('Options', {key: 'serviceWorkerRefetchRequests', value: true}));
    }
    return Promise.all(opPromises);
  }

  static closeNotifications() {
    if (navigator.serviceWorker && !OneSignal.isUsingSubscriptionWorkaround()) {
      navigator.serviceWorker.getRegistration()
          .then(registration => {
            if (registration === undefined || !registration.active) {
              log.debug('There is no active service worker.');
              return Promise.reject();
            } else if (OneSignal._channel) {
              OneSignal._channel.emit('data', 'notification.closeall');
            }
          });
    }
  }

  static _internalInit() {
    log.debug('Called %c_internalInit()', getConsoleStyle('code'));
    Database.get('Ids', 'appId')
      .then(appId => {
        if (!OneSignal.isUsingSubscriptionWorkaround() && appId && appId != OneSignal.config.appId) {
          console.warn(`OneSignal: App ID changed from ${appId} ⤑ ${OneSignal.config.appId}. Wiping IndexedDB and SessionStorage data.`);
          sessionStorage.clear();
          return Database.rebuild()
            .then(() => {
              return Database.put('Ids', {type: 'appId', id: OneSignal.config.appId})
            })
            .then(() => {
              OneSignal._initCalled = false;
              OneSignal.init(OneSignal.config);
              return Promise.reject(`OneSignal: App ID changed from ${appId} ⤑ ${OneSignal.config.appId}. Wiping IndexedDB and SessionStorage data.`)
            });
        } else {
          // HTTPS - Only register for push notifications once per session or if the user changes notification permission to Ask or Allow.
          if (sessionStorage.getItem("ONE_SIGNAL_SESSION")
            && !OneSignal.config.subdomainName
            && (Notification.permission == "denied"
            || sessionStorage.getItem("ONE_SIGNAL_NOTIFICATION_PERMISSION") == Notification.permission)) {
            Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            return;
          }

          sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);

          if (Browser.safari && OneSignal.config.autoRegister === false) {
            log.debug('On Safari and autoregister is false, skipping sessionInit().');
            // This *seems* to trigger on either Safari's autoregister false or Chrome HTTP
            // Chrome HTTP gets an SDK_INITIALIZED event from the iFrame postMessage, so don't call it here
            if (!OneSignal.isUsingSubscriptionWorkaround()) {
              Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            }
            return;
          }

          if (OneSignal.config.autoRegister === false && !OneSignal.config.subdomainName) {
            log.debug('Skipping internal init. Not auto-registering and no subdomain.');
            /* 3/25: If a user is already registered, re-register them in case the clicked Blocked and then Allow (which immediately invalidates the GCM token as soon as you click Blocked) */
            OneSignal.isPushNotificationsEnabled().then(isPushEnabled => {
              if (isPushEnabled && !OneSignal.isUsingSubscriptionWorkaround()) {
                log.info('Because the user is already subscribed and has enabled notifications, we will re-register their GCM token.');
                // Resubscribes them, and in case their GCM registration token was invalid, gets a new one
                OneSignal._registerForW3CPush({});
              } else {
                OneSignal._updateServiceWorker();
              }
            });
            Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            return;
          }

          if (document.visibilityState !== "visible") {
            once(document, 'visibilitychange', (e, destroyEventListener) => {
              if (document.visibilityState === 'visible') {
                destroyEventListener();
                OneSignal._sessionInit({__sdkCall: true});
              }
            }, true);
            return;
          }

          log.debug('Calling _sessionInit() normally from _internalInit().');
          OneSignal._sessionInit({__sdkCall: true});
        }
      })
      .catch(function (e) {
        log.error(e);
      });
  }

  /**
   * Shows a sliding modal prompt on the page for users to trigger the HTTP popup window to subscribe.
   */
  static showHttpPrompt() {
    /*
     Only show the HTTP popover if:
     - Notifications aren't already enabled
     - The user isn't manually opted out (if the user was manually opted out, we don't want to prompt the user)
     */
    if (OneSignal.__isPopoverShowing) {
      log.debug('OneSignal: Not showing popover because it is currently being shown.');
      return 'popover-already-shown';
    }
    return Promise.all([
                         OneSignal.getNotificationPermission(),
                         OneSignal.isPushNotificationsEnabled(),
                         OneSignal.getSubscription(),
                         Database.get('Options', 'popoverDoNotPrompt')
                       ])
                  .then(([permission, isEnabled, notOptedOut, doNotPrompt]) => {
                    if (doNotPrompt === true) {
                      log.debug('OneSignal: Not showing popover because the user previously clicked "No Thanks".');
                      return 'popover-previously-dismissed';
                    }
                    if (permission === 'denied') {
                      log.debug('OneSignal: Not showing popover because notification permissions are blocked.');
                      return 'notification-permission-blocked';
                    }
                    if (isEnabled) {
                      log.debug('OneSignal: Not showing popover because the current user is already subscribed.');
                      return 'user-already-subscribed';
                    }
                    if (!notOptedOut) {
                      log.debug('OneSignal: Not showing popover because the user was manually opted out.');
                      return 'user-intentionally-unsubscribed';
                    }
                    OneSignalHelpers.markHttpPopoverShown();
                    OneSignal.popover = new Popover(OneSignal.config.promptOptions);
                    OneSignal.popover.create();
                    log.debug('Showing the HTTP popover.');
                    if (OneSignal.notifyButton && OneSignal.notifyButton.launcher.state !== 'hidden') {
                      OneSignal.notifyButton.launcher.waitUntilShown()
                               .then(() => {
                                 OneSignal.notifyButton.launcher.hide();
                               });
                    }
                    OneSignal.once(Popover.EVENTS.SHOWN, () => {
                      OneSignal.__isPopoverShowing = true;
                    });
                    OneSignal.once(Popover.EVENTS.CLOSED, () => {
                      OneSignal.__isPopoverShowing = false;
                      if (OneSignal.notifyButton) {
                        OneSignal.notifyButton.launcher.show();
                      }
                    });
                    OneSignal.once(Popover.EVENTS.ALLOW_CLICK, () => {
                      OneSignal.popover.close();
                      OneSignal.registerForPushNotifications({autoAccept: true});
                    });
                    OneSignal.once(Popover.EVENTS.CANCEL_CLICK, () => {
                      log.debug("Setting flag to not show the popover to the user again.");
                      Database.put('Options', {key: 'popoverDoNotPrompt', value: true});
                    });
                  });
  }

  static registerForPushNotifications(options) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    if (Environment.isUnsupported()) {
      log.debug('OneSignal: registerForPushNotifications(): Exiting from unsupported environment.');
      return;
    }

    // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
    //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
    function __registerForPushNotifications() {
      if (OneSignal.isUsingSubscriptionWorkaround()) {
        OneSignal.loadPopup(options);
      } else {
        if (!options)
          options = {};
        options.fromRegisterFor = true;
        OneSignal._sessionInit(options);
      }
    }

    if (!OneSignal.initialized) {
      OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __registerForPushNotifications());
    } else {
      return __registerForPushNotifications();
    }
  }

  // Http only - Only called from iframe's init.js
  static _initHttp(options) {
    log.debug(`Called %c_initHttp(${JSON.stringify(options, null, 4)})`, getConsoleStyle('code'));

    if (Environment.isBrowser() && window.localStorage && window.localStorage["onesignal.debugger.inithttp"]) {
      debugger;
    }

    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    var creator = opener || parent;

    if (creator == window) {
      document.write(`<span style='font-size: 14px; color: red; font-family: sans-serif;'>OneSignal: This page cannot be directly opened, and 
must be opened as a result of a subscription call.</span>`);
      return;
    }

    // Forgetting this makes all our APIs stall forever because the promises expect this to be true
    OneSignal.config = {};
    OneSignal.initialized = true;

    let sendToOrigin = options.origin;
    let receiveFromOrigin = options.origin;
    let shouldWipeData = getUrlQueryParam('dangerouslyWipeData') || (window.__POSTDATA && window.__POSTDATA['dangerouslyWipeData'] === true);

    let preinitializePromise = Promise.resolve();
    if (shouldWipeData && Environment.isIframe()) {
      OneSignal.LOGGING = true;
      // Wipe IndexedDB and unsubscribe from push/unregister the service worker for testing.
      log.warn('Wiping away previous HTTP data (called from HTTP iFrame).');
      preinitializePromise = wipeLocalIndexedDb()
          .then(() => unsubscribeFromPush())
          .then(() => IndexedDb.put('Ids', {type: 'appId', id: options.appId}));
    }

    OneSignal._thisIsThePopup = options.isPopup;
    if (Environment.isPopup() || OneSignal._thisIsThePopup) {
      OneSignal.popupPostmam = new Postmam(this.opener, sendToOrigin, receiveFromOrigin);
    }

    OneSignal._thisIsTheModal = options.isModal;
    if (OneSignal._thisIsTheModal) {
      OneSignal.modalPostmam = new Postmam(this.parent, sendToOrigin, receiveFromOrigin);
    }

    OneSignal.iframePostmam = new Postmam(this.window, sendToOrigin, receiveFromOrigin);
    OneSignal.iframePostmam.listen();
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.CONNECTED, e => {
      log.debug(`(${Environment.getEnv()}) Fired Postmam connect event!`);
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION, message => {
      OneSignal.getNotificationPermission()
          .then(permission => message.reply(permission));
      return false;
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, message => {
      // retrievals is an array of key-value pairs e.g. [{table: 'Ids', keys: 'userId'}, {table: 'Ids', keys: 'registrationId'}]
      let retrievals = message.data;
      let retrievalOpPromises = [];
      for (let retrieval of retrievals) {
        let {table, key} = retrieval;
        if (!table || !key) {
          log.error('Missing table or key for remote database get.', 'table:', table, 'key:', key);
        }
        retrievalOpPromises.push(Database.get(table, key));
      }
      Promise.all(retrievalOpPromises)
          .then(results => message.reply(results));
      return false;
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, message => {
      // insertions is an array of key-value pairs e.g. [table: {'Options': keypath: {key: persistNotification, value: '...'}}, {table: 'Ids', keypath: {type: 'userId', id: '...'}]
      // It's formatted that way because our IndexedDB database is formatted that way
      let insertions = message.data;
      let insertionOpPromises = [];
      for (let insertion of insertions) {
        let {table, keypath} = insertion;
        insertionOpPromises.push(Database.put(table, keypath));
      }
      Promise.all(insertionOpPromises)
          .then(results => message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE));
      return false;
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, message => {
      // removals is an array of key-value pairs e.g. [table: {'Options': keypath: {key: persistNotification, value: '...'}}, {table: 'Ids', keypath: {type: 'userId', id: '...'}]
      // It's formatted that way because our IndexedDB database is formatted that way
      let removals = message.data;
      let removalOpPromises = [];
      for (let removal of removals) {
        let {table, keypath} = removal;
        removalOpPromises.push(Database.remove(table, keypath));
      }
      Promise.all(removalOpPromises)
          .then(results => message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE));
      return false;
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, message => {
      log.warn(`(${Environment.getEnv()}) The iFrame has just received initOptions from the host page!`);

      preinitializePromise.then(() => {
            OneSignal.config = objectAssign(message.data.hostInitOptions, options, {
              pageUrl: message.data.pageUrl,
              pageTitle: message.data.pageTitle
            });

            OneSignal._installNativePromptPermissionChangedHook();

            let opPromises = [];
            if (options.continuePressed) {
              opPromises.push(OneSignal.setSubscription(true));
            }
            // 3/30/16: For HTTP sites, put the host page URL as default URL if one doesn't exist already
            opPromises.push(Database.get('Options', 'defaultUrl').then(defaultUrl => {
              if (!defaultUrl) {
                return Database.put('Options', {key: 'defaultUrl', value: new URL(OneSignal.config.pageUrl).origin});
              }
            }));

            opPromises.push(Database.get("NotificationOpened", OneSignal.config.pageUrl)
                .then(notificationOpenedResult => {
                  if (notificationOpenedResult) {
                    Database.remove("NotificationOpened", OneSignal.config.pageUrl);
                    OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, notificationOpenedResult);
                  }
                }));


            opPromises.push(OneSignal._initSaveState());
            opPromises.push(OneSignal._storeInitialValues());
            opPromises.push(OneSignal._saveInitOptions());
            Promise.all(opPromises)
                .then(() => {
                  /* 3/20/16: In the future, if navigator.serviceWorker.ready is unusable inside of an insecure iFrame host, adding a message event listener will still work. */
                  //if (navigator.serviceWorker) {
                  //log.warn('We have added an event listener for service worker messages.', Environment.getEnv());
                  //navigator.serviceWorker.addEventListener('message', function(event) {
                  //  log.warn('Wow! We got a message!', event);
                  //});
                  //}

                  if (navigator.serviceWorker && window.location.protocol === 'https:') {
                    try {
                      OneSignalHelpers.establishServiceWorkerChannel();
                    } catch (e) {
                      log.error(`Error interacting with Service Worker inside an HTTP-hosted iFrame:`, e);
                    }
                  }

                  message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
                });
          })
          .catch(e => console.error(e));
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, message => {
      log.debug(Environment.getEnv() + " (Expected iFrame) has received the unsubscribe from push method.");
      unsubscribeFromPush()
          .then(() => message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE))
          .catch(e => log.warn('Failed to unsubscribe from push remotely.', e));
    });
    Event.trigger('httpInitialize');
  }

  static _initPopup() {
    OneSignal.config = {};
    OneSignal.initialized = true;

    // Do not register OneSignalSDKUpdaterWorker.js for HTTP popup sites; the file does not exist
    OneSignal.isPushNotificationsEnabled(isEnabled => {
      if (!isEnabled) {
        navigator.serviceWorker.register(OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
      } else {
        window.close();
      }
    });
  }

  static _initSaveState() {
    return Database.get('Ids', 'appId')
      .then(dbAppId => {
        if (Environment.isIframe() &&
            dbAppId &&
            dbAppId != OneSignal.config.appId &&
            OneSignal.config.dangerouslyChangeAppId) {
          console.warn(`OneSignal: App ID changed from ${dbAppId} ⤑ ${OneSignal.config.appId}. Wiping IndexedDB and SessionStorage data.`);
          sessionStorage.clear();
          return Database.rebuild()
            .then(() => {
              return Database.put('Ids', {type: 'appId', id: OneSignal.config.appId})
            })
            .then(() => {
              OneSignal._initCalled = false;
              if (!OneSignal._initCalledTimes) {
                OneSignal._initCalledTimes = 0;
              }
              OneSignal._initCalledTimes++;
              if (OneSignal._initCalledTimes < 5) {
                OneSignal.init(OneSignal.config);
              }
              return Promise.reject(`OneSignal: App ID changed from ${dbAppId} ⤑ ${OneSignal.config.appId}. Wiping IndexedDB and SessionStorage data.`)
            });
        }
      })
      .then(() => OneSignal.getAppId())
      .then(appId => {
        return Promise.all([
          Database.put("Ids", {type: "appId", id: appId}),
          Database.put("Options", {key: "pageTitle", value: document.title})
        ]).then(() => {
          log.info(`OneSignal: Set pageTitle to be '${document.title}'.`);
        });
      });
  }

  /**
   * Loads the iFrame with the OneSignal subdomain on the page so that subsequent SDK tasks can run on the service-worker-controlled origin.
   */
  static loadSubdomainIFrame() {
    let subdomainLoadPromise = new Promise((resolve, reject) => {
      log.debug(`Called %cloadSubdomainIFrame()`, getConsoleStyle('code'));

      let dangerouslyWipeData = OneSignal.config.dangerouslyWipeData;
      if (dangerouslyWipeData) {
        OneSignal.iframeUrl += '?&dangerouslyWipeData=true';
      }
      log.debug('Loading subdomain iFrame:', OneSignal.iframeUrl);
      let iframe = OneSignalHelpers.createHiddenDomIFrame(OneSignal.iframeUrl);
      iframe.onload = () => {
        log.info('iFrame onload event was called for:', iframe.src);
        let sendToOrigin = `https://${OneSignal.config.subdomainName}.onesignal.com`;
        if (Environment.isDev()) {
          sendToOrigin = DEV_FRAME_HOST;
        }
        let receiveFromOrigin = sendToOrigin;
        OneSignal.iframePostmam = new Postmam(iframe.contentWindow, sendToOrigin, receiveFromOrigin);
        OneSignal.iframePostmam.connect();
        OneSignal.iframePostmam.on('connect', e => {
          log.debug(`(${Environment.getEnv()}) Fired Postmam connect event!`);
          Promise.all([
            Database.get('Options', 'defaultUrl'),
            Database.get('Options', 'defaultTitle')
          ])
            .then(([defaultUrlResult, defaultTitleResult]) => {
              if (!defaultUrlResult) {
                var defaultUrl = location.href;
              } else {
                var defaultUrl = defaultUrlResult;
              }

              if (!defaultTitleResult) {
                var defaultTitle = document.title;
              } else {
                var defaultTitle = defaultTitleResult;
              }

              OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, {
                hostInitOptions: JSON.parse(JSON.stringify(OneSignal.config)), // Removes functions and unmessageable objects
                pageUrl: defaultUrl,
                pageTitle: defaultTitle,
              }, reply => {
                if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                  resolve();
                  Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
                }
                return false;
              });
            });
        });
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, message => {
          // e.g. { eventName: 'subscriptionChange', eventData: true}
          let { eventName, eventData } = message.data;
          Event.trigger(eventName, eventData, message.source);
          return false;
        });
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, message => {
          let newRemoteNotificationPermission = message.data;
          OneSignal.triggerNotificationPermissionChanged();
          return false;
        });
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, message => {
          OneSignal._fireTransmittedNotificationClickedCallbacks(message.data);
          return false;
        });
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REQUEST_HOST_URL, message => {
          message.reply(location.href);
          return false;
        });
      };
      OneSignal._sessionIframeAdded = true;
    });
    return executeAndTimeoutPromiseAfter(subdomainLoadPromise, 15000)
             .catch(() => console.warn(`OneSignal: Could not load iFrame with URL ${OneSignal.iframeUrl}. Please check that your 'subdomainName' matches that on your OneSignal Chrome platform settings. Also please check that your Site URL on your Chrome platform settings is a valid reachable URL pointing to your site.`));
  }

  static loadPopup(options) {
    // Important: Don't use any promises until the window is opened, otherwise the popup will be blocked
    let sendToOrigin = `https://${OneSignal.config.subdomainName}.onesignal.com`;
    if (Environment.isDev()) {
      sendToOrigin = DEV_FRAME_HOST;
    }
    let receiveFromOrigin = sendToOrigin;
    let dangerouslyWipeData = OneSignal.config.dangerouslyWipeData;
    let postData = objectAssign({}, OneSignalHelpers.getPromptOptionsPostHash(), {
      promptType: 'popup',
      parentHostname: encodeURIComponent(location.hostname)
    });
    if (options && options.autoAccept) {
      postData['autoAccept'] = true;
    }
    if (dangerouslyWipeData) {
      postData['dangerouslyWipeData'] = true;
    }
    log.info(`Opening popup window to ${OneSignal.popupUrl} with POST data:`, OneSignal.popupUrl);
    var subdomainPopup = OneSignalHelpers.openSubdomainPopup(OneSignal.popupUrl, postData);

    if (subdomainPopup)
      subdomainPopup.focus();

    OneSignal.popupPostmam = new Postmam(subdomainPopup, sendToOrigin, receiveFromOrigin);
    OneSignal.popupPostmam.startPostMessageReceive();

    return new Promise((resolve, reject) => {
      OneSignal.popupPostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, message => {
        // e.g. { eventName: 'subscriptionChange', eventData: true}
        let { eventName, eventData } = message.data;
        Event.trigger(eventName, eventData, message.source);
        return false;
      });

      OneSignal.popupPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_LOADED, message => {
        Event.trigger('popupLoad');
      });
      OneSignal.popupPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_ACCEPTED, message => {
        OneSignalHelpers.triggerCustomPromptClicked('granted');
      });
      OneSignal.popupPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_REJECTED, message => {
        OneSignalHelpers.triggerCustomPromptClicked('denied');
      });
      OneSignal.popupPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_IDS_AVAILBLE, message => {
        log.info('ids available from popup');
        OneSignal.popupPostmam.stopPostMessageReceive();
        OneSignalHelpers.checkAndTriggerSubscriptionChanged();
        resolve();
      });
      OneSignal.popupPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, message => {
        log.info('Detected popup is closing.');
        Event.trigger(OneSignal.EVENTS.POPUP_CLOSING);
        OneSignal.popupPostmam.destroy();
      });
      OneSignal.popupPostmam.once(OneSignal.POSTMAM_COMMANDS.BEGIN_BROWSING_SESSION, message => {
        log.debug(Environment.getEnv() + " Marking current session as a continuing browsing session.");
        OneSignalHelpers.beginTemporaryBrowserSession();
      });
    });
  }

  static _sessionInit(options) {
    log.debug(`Called %c_sessionInit(${JSON.stringify(options)})`, getConsoleStyle('code'));
    if (OneSignal._sessionInitAlreadyRunning) {
      log.debug('Returning from _sessionInit because it has already been called.');
      return;
    } else {
      OneSignal._sessionInitAlreadyRunning = true;
    }

    var hostPageProtocol = `${location.protocol}//`;

    if (Browser.safari) {
      if (OneSignal.config.safari_web_id) {
        OneSignal.getAppId()
            .then(appId => {
              window.safari.pushNotification.requestPermission(
                  `${OneSignal._API_URL}safari`,
                  OneSignal.config.safari_web_id,
                  {app_id: appId},
                  pushResponse => {
                    log.info('Safari Registration Result:', pushResponse);
                    if (pushResponse.deviceToken) {
                      let subscriptionInfo = {
                        // Safari's subscription returns a device token (e.g. 03D5D4A2EBCE1EE2AED68E12B72B1B995C2BFB811AB7DBF973C84FED66C6D1D5)
                        endpointOrToken: pushResponse.deviceToken.toLowerCase()
                      };
                      OneSignalHelpers.registerWithOneSignal(appId, subscriptionInfo);
                    }
                    else {
                      OneSignalHelpers.beginTemporaryBrowserSession();
                    }
                    OneSignal.triggerNotificationPermissionChanged();
                  }
              );
            })
            .catch(e => log.error(e));
      }
    }
    else if (options.modalPrompt && options.fromRegisterFor) { // If HTTPS - Show modal
      Promise.all([
            OneSignal.getAppId(),
            OneSignal.isPushNotificationsEnabled(),
            OneSignal.getNotificationPermission()
          ])
          .then(([appId, isPushEnabled, notificationPermission]) => {
            let modalUrl = `${OneSignal.modalUrl}?${OneSignalHelpers.getPromptOptionsQueryString()}&id=${appId}&httpsPrompt=true&pushEnabled=${isPushEnabled}&permissionBlocked=${notificationPermission === 'denied'}&promptType=modal`;
            log.info('Opening HTTPS modal prompt:', modalUrl);
            let modal = OneSignalHelpers.createSubscriptionDomModal(modalUrl);

            let sendToOrigin = `https://onesignal.com`;
            if (Environment.isDev()) {
              sendToOrigin = DEV_FRAME_HOST;
            }
            let receiveFromOrigin = sendToOrigin;
            OneSignal.modalPostmam = new Postmam(modal, sendToOrigin, receiveFromOrigin);
            OneSignal.modalPostmam.startPostMessageReceive();

            return new Promise((resolve, reject) => {
              OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.MODAL_LOADED, message => {
                Event.trigger('modalLoaded');
              });
              OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_ACCEPTED, message => {
                log.debug('User accepted the HTTPS modal prompt.');
                OneSignal._sessionInitAlreadyRunning = false;
                let iframeModalDom = document.getElementById('OneSignal-iframe-modal');
                iframeModalDom.parentNode.removeChild(iframeModalDom);
                OneSignal.modalPostmam.destroy();
                OneSignalHelpers.triggerCustomPromptClicked('granted');
                OneSignal._registerForW3CPush(options);
              });
              OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_REJECTED, message => {
                log.debug('User rejected the HTTPS modal prompt.');
                OneSignal._sessionInitAlreadyRunning = false;
                let iframeModalDom = document.getElementById('OneSignal-iframe-modal');
                iframeModalDom.parentNode.removeChild(iframeModalDom);
                OneSignal.modalPostmam.destroy();
                OneSignalHelpers.triggerCustomPromptClicked('denied');
              });
              OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, message => {
                log.info('Detected modal is closing.');
                OneSignal.modalPostmam.destroy();
              });
            });
          });
    }
    else if ('serviceWorker' in navigator &&
             !OneSignal.isUsingSubscriptionWorkaround()) { // If HTTPS - Show native prompt
      if (options.__sdkCall && !OneSignalHelpers.wasHttpsNativePromptDismissed()) {
        OneSignal._registerForW3CPush(options);
      } else if (options.__sdkCall && OneSignalHelpers.wasHttpsNativePromptDismissed()) {
        log.debug('OneSignal: Not automatically showing native HTTPS prompt because the user previously dismissed it.');
        OneSignal._sessionInitAlreadyRunning = false;
      } else {
        OneSignal._registerForW3CPush(options);
      }
    }
    else {
      if (OneSignal.config.autoRegister !== true) {
        log.debug('OneSignal: Not automatically showing popover because autoRegister is not specifically true.');
      }
      if (OneSignalHelpers.isHttpPromptAlreadyShown()) {
        log.debug('OneSignal: Not automatically showing popover because it was previously shown in the same session.');
      }
      if ((OneSignal.config.autoRegister === true) && !OneSignalHelpers.isHttpPromptAlreadyShown()) {
        OneSignal.showHttpPrompt();
      }
    }

    Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  }

  /*
   Updates an existing OneSignal-only service worker if an older version exists. Does not install a new service worker if none is available or overwrite other service workers.
   This also differs from the original update code we have below in that we do not subscribe for push after.
   Because we're overwriting a service worker, the push token seems to "carry over" (this is good), whereas if we unregistered and registered a new service worker, the push token would be lost (this is bad).
   By not subscribing for push after we register the SW, we don't have to care if notification permissions are granted or not, since users will not be prompted; this update process will be transparent.
   This way we can update the service worker even for autoRegister: false users.
   */
  static _updateServiceWorker() {

    let updateCheckAlreadyRan = sessionStorage.getItem('onesignal-update-serviceworker-completed');
    if (!navigator.serviceWorker || !Environment.isHost() || location.protocol !== 'https:' || updateCheckAlreadyRan == "true") {
      log.debug('Skipping service worker update for existing session.');
      return;
    }

    try {
      sessionStorage.setItem('onesignal-update-serviceworker-completed', "true");
    } catch (e) {
      log.error(e);
    }

    return navigator.serviceWorker.getRegistration().then(function (serviceWorkerRegistration) {
      var sw_path = "";

      if (OneSignal.config.path)
        sw_path = OneSignal.config.path;

      if (serviceWorkerRegistration && serviceWorkerRegistration.active) {
        // An existing service worker
        let previousWorkerUrl = serviceWorkerRegistration.active.scriptURL;
        if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_PATH)) {
          // OneSignalSDKWorker.js was installed
          log.debug('(Service Worker Update)', 'The main service worker is active.');
          return Database.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
            .then(function (version) {
              // Get version of installed worker saved to IndexedDB
              if (version) {
                // If a version exists
                log.debug('(Service Worker Update)', `Stored service worker version v${version}.`);
                if (version != OneSignal._VERSION) {
                  // If there is a different version
                  log.debug('(Service Worker Update)', 'New service worker version exists:', OneSignal._VERSION);
                  log.warn(`Upgrading service worker (v${version} -> v${OneSignal._VERSION})`);
                  return navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM);
                }
                else {
                  // No changed service worker version
                  log.debug('(Service Worker Update)', 'You already have the latest service worker version.');
                  return null;
                }
              }
              else {
                // No version was saved; somehow this got overwritten
                // Reinstall the alternate service worker
                log.debug('(Service Worker Update)', 'No stored service worker version. Reinstalling the service worker.');
                return navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM);
              }

            })
            .catch(function (e) {
              log.error(e);
            });
        }
        else if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH)) {
          // OneSignalSDKUpdaterWorker.js was installed
          log.debug('(Service Worker Update)', 'The alternate service worker is active.');
          return Database.get('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION')
            .then(function (version) {
              // Get version of installed worker saved to IndexedDB
              if (version) {
                // If a version exists
                log.debug('(Service Worker Update)', `Stored service worker version v${version}.`);
                if (version != OneSignal._VERSION) {
                  // If there is a different version
                  log.debug('(Service Worker Update)', 'New service worker version exists:', OneSignal._VERSION);
                  log.info(`Upgrading new service worker (v${version} -> v${OneSignal._VERSION})`);
                  return navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM);
                }
                else {
                  // No changed service worker version
                  log.debug('(Service Worker Update)', 'You already have the latest service worker version.');
                  return null;
                }
              }
              else {
                // No version was saved; somehow this got overwritten
                // Reinstall the alternate service worker
                log.debug('(Service Worker Update)', 'No stored service worker version. Reinstalling the service worker.');
                return navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM);
              }
            })
            .catch(function (e) {
              log.error(e);
            });
        } else {
          // Some other service worker not belonging to us was installed
          // Don't install ours over it
        }
      }
    })
      .catch(function (e) {
        log.error(e);
      });
  }

  static _registerForW3CPush(options) {
    log.debug(`Called %c_registerForW3CPush(${JSON.stringify(options)})`, getConsoleStyle('code'));
    return Database.get('Ids', 'registrationId')
      .then(function _registerForW3CPush_GotRegistrationId(registrationIdResult) {
        if (!registrationIdResult || !options.fromRegisterFor || Notification.permission != "granted" || navigator.serviceWorker.controller == null) {
          navigator.serviceWorker.getRegistration().then(function (serviceWorkerRegistration) {
            var sw_path = "";

            if (OneSignal.config.path)
              sw_path = OneSignal.config.path;

            if (typeof serviceWorkerRegistration === "undefined") // Nothing registered, very first run
              OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
            else {
              if (serviceWorkerRegistration.active) {
                let previousWorkerUrl = serviceWorkerRegistration.active.scriptURL;
                if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_PATH)) {
                  // OneSignalSDKWorker.js was installed
                  Database.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
                    .then(function (version) {
                      if (version) {
                        if (version != OneSignal._VERSION) {
                          log.info(`Installing new service worker (${version} -> ${OneSignal._VERSION})`);
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                        }
                        else
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
                      }
                      else
                        OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH);

                    })
                    .catch(function (e) {
                      log.error(e);
                    });
                }
                else if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH)) {
                  // OneSignalSDKUpdaterWorker.js was installed
                  Database.get('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION')
                    .then(function (version) {
                      if (version) {
                        if (version != OneSignal._VERSION) {
                          log.info(`Installing new service worker (${version} -> ${OneSignal._VERSION})`);
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
                        }
                        else
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                      }
                      else
                        OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
                    })
                    .catch(function (e) {
                      log.error(e);
                    });
                } else {
                  // Some other service worker not belonging to us was installed
                  // Install ours over it after unregistering theirs to get a different registration token and avoid mismatchsenderid error
                  log.info('Unregistering previous service worker:', serviceWorkerRegistration);
                  serviceWorkerRegistration.unregister().then(unregistrationSuccessful => {
                    log.info('Result of unregistering:', unregistrationSuccessful);
                    OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
                  });
                }
              }
              else if (serviceWorkerRegistration.installing == null)
                OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
            }
          })
            .catch(function (e) {
              log.error(e);
            });
        }
      })
      .catch(function (e) {
        log.error(e);
      });
  }

  static _registerServiceWorker(full_sw_and_path) {
    log.debug(`Called %c_registerServiceWorker(${JSON.stringify(full_sw_and_path, null, 4)})`, getConsoleStyle('code'));
    navigator.serviceWorker.register(full_sw_and_path, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
  }

  static _registerError(err) {
    log.error("ServiceWorker registration", err);
  }

  static _enableNotifications(existingServiceWorkerRegistration) { // is ServiceWorkerRegistration type
    log.debug(`Called %c_enableNotifications()`, getConsoleStyle('code'));
    if (!('PushManager' in window)) {
      log.warn("Push messaging is not supported. No PushManager.");
      OneSignalHelpers.beginTemporaryBrowserSession();
      return;
    }

    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      log.warn("Notifications are not supported. showNotification not available in ServiceWorkerRegistration.");
      OneSignalHelpers.beginTemporaryBrowserSession();
      return;
    }

    if (Notification.permission === 'denied') {
      log.warn("The user has blocked notifications.");
      return;
    }

    log.debug(`Calling %cnavigator.serviceWorker.ready() ...`, getConsoleStyle('code'));
    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
      log.debug('Finished calling %cnavigator.serviceWorker.ready', getConsoleStyle('code'));
      OneSignalHelpers.establishServiceWorkerChannel(serviceWorkerRegistration);
      OneSignal._subscribeForPush(serviceWorkerRegistration);
    })
      .catch(function (e) {
        log.error(e);
      });
  }

  /**
   * Returns a promise that resolves to the browser's current notification permission as 'default', 'granted', or 'denied'.
   * @param callback A callback function that will be called when the browser's current notification permission has been obtained, with one of 'default', 'granted', or 'denied'.
   */
  static getNotificationPermission(onComplete) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    let safariWebId = null;
    if (OneSignal.config) {
      safariWebId = OneSignal.config.safari_web_id;
    }
    return OneSignal._getNotificationPermission(safariWebId)
      .then(permission => {
        if (onComplete) {
          onComplete(permission);
        }
        return permission;
      });
  }

  /**
   * Returns true if web push subscription occurs on a subdomain of OneSignal.
   * If true, our main IndexedDB is stored on the subdomain of onesignal.com, and not the user's site.
   * @remarks
   *   This method returns true if:
   *     - The browser is not Safari
   *         - Safari uses a different method of subscription and does not require our workaround
   *     - The init parameters contain a subdomain (even if the protocol is HTTPS)
   *         - HTTPS users using our subdomain workaround still have the main IndexedDB stored on our subdomain
   *        - The protocol of the current webpage is http:
   *   Exceptions are:
   *     - Safe hostnames like localhost and 127.0.0.1
   *          - Because we don't want users to get the wrong idea when testing on localhost that direct permission is supported on HTTP, we'll ignore these exceptions. HTTPS will always be required for direct permission
   *        - We are already in popup or iFrame mode, or this is called from the service worker
   */
  static isUsingSubscriptionWorkaround() {
    if (!OneSignal.config) {
      throw new Error(`(${Environment.getEnv()}) isUsingSubscriptionWorkaround() cannot be called until OneSignal.config exists.`);
    }
    if (Browser.safari) {
      return false;
    }
    let result = Environment.isHost() &&
      (OneSignal.config.subdomainName ||
      location.protocol === 'http:');
    return !!result;
  }

  /*
   Returns the current browser-agnostic notification permission as "default", "granted", "denied".
   safariWebId: Used only to get the current notification permission state in Safari (required as part of the spec).
   */
  static _getNotificationPermission(safariWebId) {
    return new Promise((resolve, reject) => {
      function __getNotificationPermission() {
        if (OneSignal.isUsingSubscriptionWorkaround()) {
          // User is using our subscription workaround
          OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION, {safariWebId: safariWebId}, reply => {
            let remoteNotificationPermission = reply.data;
            resolve(remoteNotificationPermission);
          });
        } else {
          if (Browser.safari) {
            // The user is on Safari
            // A web ID is required to determine the current notificiation permission
            if (safariWebId) {
              resolve(window.safari.pushNotification.permission(safariWebId).permission);
            }
            else {
              // The user didn't set up Safari web push properly; notifications are unlikely to be enabled
              console.warn(`OneSignal: Invalid init option safari_web_id %c${safariWebId}`, getConsoleStyle('code'), '. Please pass in a valid safari_web_id to OneSignal init.');
            }
          }
          else {
            // Identical API on Firefox and Chrome
            resolve(Notification.permission);
          }
        }
      }

      if (!OneSignal.initialized) {
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, __getNotificationPermission);
      } else {
        __getNotificationPermission();
      }
    });
  }

  static triggerNotificationPermissionChanged(updateIfIdentical = false) {
    let newPermission, isUpdating;
    return Promise.all([
      OneSignal.getNotificationPermission(),
      Database.get('Options', 'notificationPermission')
    ])
      .then(([currentPermission, previousPermission]) => {
        newPermission = currentPermission;
        isUpdating = (currentPermission !== previousPermission || updateIfIdentical);

        if (isUpdating) {
          return Database.put('Options', {key: 'notificationPermission', value: currentPermission});
        }
      })
      .then(() => {
        if (isUpdating) {
          Event.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, {
            from: null,
            to: newPermission
          });
        }
      });
  }

  static triggerSubscriptionChanged(to) {
    Event.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
  }

  static triggerInternalSubscriptionSet(value) {
    Event.trigger(OneSignal.EVENTS.INTERNAL_SUBSCRIPTIONSET, value);
  }

  static _subscribeForPush(serviceWorkerRegistration) {
    log.debug(`Called %c_subscribeForPush()`, getConsoleStyle('code'));
    var notificationPermissionBeforeRequest = '';

    OneSignal.getNotificationPermission().then((permission) => {
      notificationPermissionBeforeRequest = permission;
    })
      .then(() => {
        log.debug(`Calling %cServiceWorkerRegistration.pushManager.subscribe()`, getConsoleStyle('code'));
        Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
        /*
            7/29/16: If the user dismisses the prompt, the prompt cannot be shown again via pushManager.subscribe()
            See: https://bugs.chromium.org/p/chromium/issues/detail?id=621461
            Our solution is to call Notification.requestPermission(), and then call
             pushManager.subscribe(). Because notification and push permissions are shared, the subesequent call to
             pushManager.subscribe() will go through successfully.
         */
        return OneSignalHelpers.requestNotificationPermissionPromise();
      })
      .then(permission => {
        if (permission !== "granted") {
          throw new Error("User did not grant push permission to allow notifications.");
        } else {
          return serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
        }
      })
      .then(function (subscription) {
        /*
         7/29/16: New bug, even if the user dismisses the prompt, they'll be given a subscription
         See: https://bugs.chromium.org/p/chromium/issues/detail?id=621461
         Our solution is simply to check the permission before actually subscribing the user.
         */
        log.debug(`Finished calling %cServiceWorkerRegistration.pushManager.subscribe()`,
                  getConsoleStyle('code'));
        // The user allowed the notification permission prompt, or it was already allowed; set sessionInit flag to false
        OneSignal._sessionInitAlreadyRunning = false;
        sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);

        OneSignal.getAppId()
                 .then(appId => {
                   log.debug("Finished subscribing for push via pushManager.subscribe().");

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
                   else
                     log.warn('Could not subscribe your browser for push notifications.');

                   OneSignalHelpers.registerWithOneSignal(appId, subscriptionInfo);
                 })
                 .catch(function (e) {
                   log.error(e);
                 });
      })
      .catch(function (e) {
        OneSignal._sessionInitAlreadyRunning = false;
        if (e.message === 'Registration failed - no sender id provided' || e.message === 'Registration failed - manifest empty or missing') {
          let manifestDom = document.querySelector('link[rel=manifest]');
          if (manifestDom) {
            let manifestParentTagname = document.querySelector('link[rel=manifest]').parentNode.tagName.toLowerCase();
            let manifestHtml = document.querySelector('link[rel=manifest]').outerHTML;
            let manifestLocation = document.querySelector('link[rel=manifest]').href;
            if (manifestParentTagname !== 'head') {
              console.warn(`OneSignal: Your manifest %c${manifestHtml}`,
                           getConsoleStyle('code'),
                           'must be referenced in the <head> tag to be detected properly. It is currently referenced ' +
                           'in <${manifestParentTagname}>. Please see step 3.1 at ' +
                           'https://documentation.onesignal.com/docs/web-push-sdk-setup-https.');
            } else {
              let manifestLocationOrigin = new URL(manifestLocation).origin;
              let currentOrigin = location.origin;
              if (currentOrigin !== manifestLocationOrigin) {
                console.warn(`OneSignal: Your manifest is being served from ${manifestLocationOrigin}, which is ` +
                             `different from the current page's origin of ${currentOrigin}. Please serve your ` +
                             `manifest from the same origin as your page's. If you are using a content delivery ` +
                             `network (CDN), please add an exception so that the manifest is not served by your CDN. ` +
                             `WordPress users, please see ` +
                             `https://documentation.onesignal.com/docs/troubleshooting-web-push#section-wordpress-cdn-support.`);
              } else {
                console.warn(`OneSignal: Please check your manifest at ${manifestLocation}. The %cgcm_sender_id`,
                             getConsoleStyle('code'),
                             "field is missing or invalid, and a valid value is required. Please see step 2 at " +
                             "https://documentation.onesignal.com/docs/web-push-sdk-setup-https.");
              }
            }
          } else if (location.protocol === 'https:') {
            console.warn(`OneSignal: You must reference a %cmanifest.json`,
                         getConsoleStyle('code'),
                         "in the <head> of your page. Please see step 2 at " +
                         "https://documentation.onesignal.com/docs/web-push-sdk-setup-https.");
          }
        } else {
          log.error('Error while subscribing for push:', e);
        }

        // New addition (12/22/2015), adding support for detecting the cancel 'X'
        // Chrome doesn't show when the user clicked 'X' for cancel
        // We get the same error as if the user had clicked denied, but we can check Notification.permission to see if it is still 'default'
        OneSignal.getNotificationPermission().then((permission) => {
          if (permission === 'default') {
            // The user clicked 'X'
            OneSignal.triggerNotificationPermissionChanged(true);
            OneSignalHelpers.markHttpsNativePromptDismissed();
          }

          if (!OneSignal._usingNativePermissionHook)
            OneSignal.triggerNotificationPermissionChanged();

          if (opener && OneSignal._thisIsThePopup)
            window.close();
        })
          .catch(e => log.error(e));
      });
  }

  static getTags(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return OneSignal.getUserId()
      .then(userId => {
        if (userId) {
          return OneSignalApi.get(`players/${userId}`, null);
        } else {
          return null;
        }
      })
      .then(response => {
        let tags = (response ? response.tags : null);
        if (callback) {
          callback(tags);
        }
        return tags;
      })
      .catch(e => {
        log.error(e);
        return Promise.reject(e)
      });
  }

  static sendTag(key, value, callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    let tag = {};
    tag[key] = value;
    return OneSignal.sendTags(tag, callback);
  }

  static sendTags(tags, callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      function __sendTags() {
        // Our backend considers false as removing a tag, so this allows false to be stored as a value
        if (tags) {
          Object.keys(tags).forEach(key => {
            if (tags[key] === false) {
              tags[key] = "false";
            }
          });
        }

        let willResolveInFuture = false;

        return new Promise((innerResolve, innerReject) => {
          Promise.all([
            OneSignal.getAppId(),
            OneSignal.getUserId()
          ])
            .then(([appId, userId]) => {
              if (userId) {
                return OneSignalApi.put(`players/${userId}`, {
                  app_id: appId,
                  tags: tags
                })
              }
              else {
                willResolveInFuture = true;
                OneSignal.on(Database.EVENTS.SET, e => {
                  if (e && e.type === 'userId') {
                    OneSignal.sendTags(tags, callback).then(innerResolve);
                    return true;
                  }
                });
              }
            })
            .then(() => {
              if (!willResolveInFuture) {
                if (callback) {
                  callback(tags);
                }
                innerResolve(tags);
              }
            })
            .catch(e => {
              log.error('sendTags:', e);
              innerReject(e);
            });
        });
      }

      if (!OneSignal.initialized) {
        return new Promise((resolve, reject) => {
          OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __sendTags().then(resolve).catch(reject));
        });
      } else {
        __sendTags().then(resolve).catch(reject);
      }
    });
  }

  static deleteTag(tag) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    if (typeof tag === 'string' || tag instanceof String) {
      return OneSignal.deleteTags([tag]);
    } else {
      return Promise.reject(new Error(`OneSignal: Invalid tag '${tag}' to delete. You must pass in a string.`));
    }
  }

  static deleteTags(tags, callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (tags instanceof Array && tags.length > 0) {
        var jsonPair = {};
        var length = tags.length;
        for (var i = 0; i < length; i++)
          jsonPair[tags[i]] = "";

        return OneSignal.sendTags(jsonPair)
          .then(emptySentTagsObj => {
            let emptySentTags = Object.keys(emptySentTagsObj);
            if (callback) {
              callback(emptySentTags);
            }
            resolve(emptySentTags);
          })
      } else {
        reject(new Error(`OneSignal: Invalid tags '${tags}' to delete. You must pass in array of strings with at least one tag string to be deleted.`));
      }
    });
  }

  static addListenerForNotificationOpened(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;

    }
    OneSignal._notificationOpenedCallbacks.push(callback);

    if (!OneSignal.initialized) {
      OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => OneSignal._fireSavedNotificationClickedCallbacks());
    } else {
      OneSignal._fireSavedNotificationClickedCallbacks();
    }
  }

  static _fireTransmittedNotificationClickedCallbacks(data) {
    for (let notificationOpenedCallback of OneSignal._notificationOpenedCallbacks) {
      notificationOpenedCallback(data);
    }
  }

  static _fireSavedNotificationClickedCallbacks() {
    Database.get("NotificationOpened", document.URL)
      .then(notificationOpened => {
        if (notificationOpened) {
          Database.remove("NotificationOpened", document.URL);
          let notificationData = notificationOpened.data;
          let timestamp = notificationOpened.timestamp;
          let discardNotification = false;
          // 3/4: Timestamp is a new feature and previous notification opened results don't have it
          if (timestamp) {
            let now = Date.now();
            let diffMilliseconds = Date.now() - timestamp;
            let diffMinutes = diffMilliseconds / 1000 / 60;
            /*
             When the notification is clicked, its data is saved to IndexedDB, a new tab is opened, which then retrieves the just-saved data and runs this code.
             If more than 5 minutes has passed, the page is probably being opened a long time later; do not fire the notification click event.
             */
            discardNotification = diffMinutes > 5;
          }
          if (discardNotification)
            return;

          for (let notificationOpenedCallback of OneSignal._notificationOpenedCallbacks) {
            notificationOpenedCallback(notificationData);
          }
        }
      })
      .catch(e => log.error(e));
  }

  static getIdsAvailable(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    console.info("OneSignal: getIdsAvailable() is deprecated. Please use getUserId() or getRegistrationId() instead.");

    if (callback === undefined)
      return;

    function __getIdsAvailable() {
      Promise.all([
        OneSignal.getUserId(),
        OneSignal.getRegistrationId()
      ]).then(results => {
        let [userId, registrationId] = results;

        if (callback) {
          callback({
            userId: userId,
            registrationId: registrationId
          })
        }
      });
    }

    OneSignal.isPushNotificationsEnabled(isEnabled => {
      if (!isEnabled) {
        OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, newSubscriptionState => {
          if (newSubscriptionState === true) {
            __getIdsAvailable();
          }
        })
      } else {
        return __getIdsAvailable();
      }
    });
  }

  static isServiceWorkerActive(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    function isServiceWorkerRegistrationActive(serviceWorkerRegistration) {
      return serviceWorkerRegistration.active &&
             serviceWorkerRegistration.active.state === 'activated' &&
             (contains(serviceWorkerRegistration.active.scriptURL, 'OneSignalSDKWorker') ||
              contains(serviceWorkerRegistration.active.scriptURL, 'OneSignalSDKUpdaterWorker'));
    }

    return new Promise((resolve, reject) => {
      if (!OneSignal.isUsingSubscriptionWorkaround() && !Environment.isIframe()) {
        let isServiceWorkerActive = false;
        if (navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations().then(serviceWorkerRegistrations => {
            for (let serviceWorkerRegistration of serviceWorkerRegistrations) {
              if (isServiceWorkerRegistrationActive(serviceWorkerRegistration)) {
                isServiceWorkerActive = true;
              }
            }
            if (callback) {
              callback(isServiceWorkerActive)
            }
            resolve(isServiceWorkerActive);
          });
        } else {
          navigator.serviceWorker.ready.then(serviceWorkerRegistration => {
            if (isServiceWorkerRegistrationActive(serviceWorkerRegistration)) {
              isServiceWorkerActive = true;
            }
            if (callback) {
              callback(isServiceWorkerActive)
            }
            resolve(isServiceWorkerActive);
          });
        }
      } else {
        if (callback) {
          callback(false)
        }
        resolve(false);
      }
    });
  }

  /**
   * Returns a promise that resolves to true if all required conditions for push messaging are met; otherwise resolves to false.
   * @param callback A callback function that will be called when the current subscription status has been obtained.
   */
  static isPushNotificationsEnabled(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      function __isPushNotificationsEnabled() {
        Promise.all([
          OneSignal.getUserId(),
          OneSignal.getRegistrationId(),
          OneSignal.getNotificationPermission(),
          OneSignal.getSubscription(),
          OneSignal.isServiceWorkerActive()
        ])
          .then(([userId, registrationId, notificationPermission, optIn, serviceWorkerActive]) => {
            let isPushEnabled = false;

            if ('serviceWorker' in navigator && !OneSignal.isUsingSubscriptionWorkaround() && !Environment.isIframe()) {
              isPushEnabled = userId &&
                registrationId &&
                notificationPermission === 'granted' &&
                optIn &&
                serviceWorkerActive;
            } else {
              isPushEnabled = userId &&
                registrationId &&
                notificationPermission === 'granted' &&
                optIn;
            }
            isPushEnabled = (isPushEnabled == true);

            if (callback) {
              callback(isPushEnabled);
            }
            resolve(isPushEnabled);
          })
          .catch(e => {
            log.error(e);
            reject(e);
          });
      }

      if (!OneSignal.initialized) {
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __isPushNotificationsEnabled());
      } else {
        __isPushNotificationsEnabled();
      }
    });
  }

  static getAppId() {
    if (OneSignal.config.appId) {
      return Promise.resolve(OneSignal.config.appId);
    }
    else return Database.get('Ids', 'appId');
  }

  static setSubscription(newSubscription) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Get the current subscription and user ID; will correctly retrieve values from remote iFrame IndexedDB if necessary
      Promise.all([
        OneSignal.getSubscription(),
        OneSignal.getUserId()
      ]).then(results => {
        let [subscription, userId] = results;

        if (!userId) {
          log.warn(`Cannot set the user's subscription state to '${newSubscription}' because no user ID was stored.`);
          resolve(false);
          return;
        }

        if (subscription === newSubscription) {
          // The user wants to set the new subscription to the same value; don't change it
          resolve(false);
          return;
        }

        // All checks pass, actually set the subscription
        let dbOpPromise = null;
        if (OneSignal.isUsingSubscriptionWorkaround()) {
          dbOpPromise = new Promise((resolve, reject) => {
            OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, [{table: 'Options', keypath: {key: "subscription", value: newSubscription}}], reply => {
              if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                resolve();
              } else {
                reject('Tried to set remote db subscription value, but did not get complete response.');
              }
            });
          });
        } else {
          dbOpPromise = Database.put('Options', {key: "subscription", value: newSubscription});
        }

        // Forward the result to OneSignal
        dbOpPromise
          .then(() => OneSignal.getAppId())
          .then(appId => {
            return OneSignalApi.put('players/' + userId, {
              app_id: appId,
              notification_types: OneSignalHelpers.getNotificationTypeFromOptIn(newSubscription)
            });
          })
          .then(() => {
            OneSignal.triggerInternalSubscriptionSet(newSubscription);
            resolve(true);
          })
          .catch(e => {
            log.warn(e);
            reject(e);
          })
      });
    });
  }

  /**
   * Returns a promise that resolves to false if setSubscription(false) is "in effect". Otherwise returns true.
   * This means a return value of true does not mean the user is subscribed, only that the user did not call setSubcription(false).
   * @private
   * @returns {Promise}
   */
  static isOptedOut(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return OneSignal.getSubscription().then(manualSubscriptionStatus => {
      if (callback) {
        callback(!manualSubscriptionStatus);
      }
      return !manualSubscriptionStatus;
    });
  }

  /**
   * Returns a promise that resolves once the manual subscription override has been set.
   * @private
   * @returns {Promise}
   */
  static optOut(doOptOut, callback) {
    if (doOptOut !== false || doOptOut !== true) {
      throw new Error(`Invalid parameter '${doOptOut}' passed to OneSignal.optOut(). You must specify true or false.`);
    }
    return OneSignal.setSubscription(doOptOut).then(() => {
        if (callback) {
          callback();
        }
      }
    );
  }

  /**
   * Returns a promise that resolves to the stored OneSignal user ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal user ID.
   * @returns {Promise.<T>}
   */
  static getUserId(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    function __getUserId() {
      return Database.get('Ids', 'userId')
        .then(result => {
          if (callback) {
            callback(result)
          }
          return result;
        })
        .catch(e => log.error(e));
    }

    if (!OneSignal.initialized) {
      return new Promise((resolve, reject) => {
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __getUserId().then(resolve).catch(reject));
      });
    } else {
      return __getUserId();
    }
  }

  /**
   * Returns a promise that resolves to the stored OneSignal registration ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal registration ID.
   * @returns {Promise.<T>}
   */
  static getRegistrationId(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    function __getRegistrationId() {
      return Database.get('Ids', 'registrationId')
        .then(result => {
          if (callback) {
            callback(result)
          }
          return result;
        })
        .catch(e => log.error(e));
    }

    if (!OneSignal.initialized) {
      return new Promise((resolve, reject) => {
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __getRegistrationId().then(resolve).catch(reject));
      });
    } else {
      return __getRegistrationId();
    }
  }

  /**
   * Returns a promise that resolves to false if setSubscription(false) is "in effect". Otherwise returns true.
   * This means a return value of true does not mean the user is subscribed, only that the user did not call setSubcription(false).
   * @private
   * @returns {Promise}
   */
  static getSubscription(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    function __getSubscription() {
      return Database.get('Options', 'subscription')
        .then(result => {
          if (result == null) {
            result = true;
          }
          if (callback) {
            callback(result)
          }
          return result;
        })
        .catch(e => log.error(e));
    }

    if (!OneSignal.initialized) {
      return new Promise((resolve, reject) => {
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __getSubscription().then(resolve).catch(reject));
      });
    } else {
      return __getSubscription();
    }
  }

  static _processPushes(array) {
    for (var i = 0; i < array.length; i++)
      OneSignal.push(array[i]);
  }

  static push(item) {
    if (typeof(item) == "function")
      item();
    else {
      var functionName = item.shift();
      OneSignal[functionName].apply(null, item);
    }
  }
}

objectAssign(OneSignal, {
  VERSION: __VERSION__,
  _VERSION: __VERSION__,
  _API_URL: API_URL,
  _notificationOpenedCallbacks: [],
  _idsAvailable_callback: [],
  _defaultLaunchURL: null,
  config: null,
  _thisIsThePopup: false,
  __isPopoverShowing: false,
  _sessionInitAlreadyRunning: false,
  _isNotificationEnabledCallback: [],
  _subscriptionSet: true,
  iframeUrl: null,
  popupUrl: null,
  modalUrl: null,
  _sessionIframeAdded: false,
  _windowWidth: 650,
  _windowHeight: 568,
  _isNewVisitor: false,
  _channel: null,
  cookie: Cookie,
  initialized: false,
  notifyButton: null,
  store: LimitStore,
  environment: Environment,
  database: Database,
  event: Event,
  browser: Browser,
  popover: null,
  log: log,
  swivel: swivel,
  api: OneSignalApi,
  indexedDb: IndexedDb,
  iframePostmam: null,
  popupPostmam: null,
  helpers: OneSignalHelpers,
  objectAssign: objectAssign,
  checkAndTriggerSubscriptionChanged: OneSignalHelpers.checkAndTriggerSubscriptionChanged,
  sendSelfNotification: OneSignalHelpers.sendSelfNotification,
  SERVICE_WORKER_UPDATER_PATH: 'OneSignalSDKUpdaterWorker.js',
  SERVICE_WORKER_PATH: 'OneSignalSDKWorker.js',
  SERVICE_WORKER_PARAM: {},

  POSTMAM_COMMANDS: {
    CONNECTED: 'connect',
    REMOTE_NOTIFICATION_PERMISSION: 'postmam.remoteNotificationPermission',
    REMOTE_DATABASE_GET: 'postmam.remoteDatabaseGet',
    REMOTE_DATABASE_PUT: 'postmam.remoteDatabasePut',
    REMOTE_DATABASE_REMOVE: 'postmam.remoteDatabaseRemove',
    REMOTE_OPERATION_COMPLETE: 'postman.operationComplete',
    REMOTE_RETRIGGER_EVENT: 'postmam.remoteRetriggerEvent',
    MODAL_LOADED: 'postmam.modalPrompt.loaded',
    MODAL_PROMPT_ACCEPTED: 'postmam.modalPrompt.accepted',
    MODAL_PROMPT_REJECTED: 'postmam.modalPrompt.canceled',
    POPUP_LOADED: 'postmam.popup.loaded',
    POPUP_ACCEPTED: 'postmam.popup.accepted',
    POPUP_REJECTED: 'postmam.popup.canceled',
    POPUP_CLOSING: 'postman.popup.closing',
    REMOTE_NOTIFICATION_PERMISSION_CHANGED: 'postmam.remoteNotificationPermissionChanged',
    NOTIFICATION_OPENED: 'postmam.notificationOpened',
    IFRAME_POPUP_INITIALIZE: 'postmam.iframePopupInitialize',
    POPUP_IDS_AVAILBLE: 'postman.popupIdsAvailable',
    UNSUBSCRIBE_FROM_PUSH: 'postmam.unsubscribeFromPush',
    BEGIN_BROWSING_SESSION: 'postmam.beginBrowsingSession',
    REQUEST_HOST_URL: 'postmam.requestHostUrl',
  },

  EVENTS: {
    /**
     * Occurs when the user clicks the "Continue" or "No Thanks" button on the HTTP popup or HTTPS modal prompt.
     * For HTTP sites (and HTTPS sites using the modal prompt), this event is fired before the native permission
     * prompt is shown. This event is mostly used for HTTP sites.
     */
    CUSTOM_PROMPT_CLICKED: 'customPromptClick',
    /**
     * Occurs when the user clicks "Allow" or "Block" on the native permission prompt on Chrome, Firefox, or Safari.
     * This event is used for both HTTP and HTTPS sites and occurs after the user actually grants notification
     * permissions for the site. Occurs before the user is actually subscribed to push notifications.
     */
    NATIVE_PROMPT_PERMISSIONCHANGED: 'notificationPermissionChange',
    /**
     * Occurs after the user is officially subscribed to push notifications. The service worker is fully registered
     * and activated and the user is eligible to receive push notifications at any point after this.
     */
    SUBSCRIPTION_CHANGED: 'subscriptionChange',
    /**
     * Occurs after a POST call to OneSignal's server to send the welcome notification has completed. The actual
     * notification arrives shortly after.
     */
    WELCOME_NOTIFICATION_SENT: 'sendWelcomeNotification',
    /**
     * Occurs when a notification is displayed.
     */
    NOTIFICATION_DISPLAYED: 'notificationDisplay',
    /**
     * Occurs when a notification is dismissed by the user either clicking 'X' or clearing all notifications
     * (available in Android). This event is NOT called if the user clicks the notification's body or any of the
     * action buttons.
     */
    NOTIFICATION_DISMISSED: 'notificationDismiss',
    /**
     * An internal legacy event that should be deprecated.
     */
    INTERNAL_SUBSCRIPTIONSET: 'subscriptionSet',
    /**
     * Occurs after the document ready event fires and, for HTTP sites, the iFrame to subdomain.onesignal.com has
     * loaded.
     * Before this event, IndexedDB access is not possible for HTTP sites.
     */
    SDK_INITIALIZED: 'initialize',
    /**
     * Occurs after the user subscribes to push notifications and a new user entry is created on OneSignal's server,
     * and also occurs when the user begins a new site session and the last_session and last_active is updated on
     * OneSignal's server.
     */
    REGISTERED: 'register',
    /**
     * Occurs as the HTTP popup is closing.
     */
    POPUP_CLOSING: 'popupClose',
    /**
     * Occurs when the native permission prompt is displayed.
     * This is currently used to know when to display the HTTP popup incognito notice so that it hides the notice
     * for non-incognito users.
     */
    PERMISSION_PROMPT_DISPLAYED: 'permissionPromptDisplay',
  },

  NOTIFICATION_TYPES: {
    SUBSCRIBED: 1,
    UNSUBSCRIBED: -2
  },
});

Object.defineProperty(OneSignal, 'LOGGING', {
  get: function() {
    if (!OneSignal._LOGGING) {
      OneSignal._LOGGING = false;
    }
    return OneSignal._LOGGING;
  },
  set: function(logLevel) {
    if (logLevel) {
      log.setDefaultLevel(log.levels.TRACE);
      OneSignal._LOGGING = true;
    }
    else {
      log.setDefaultLevel(log.levels.ERROR);
      OneSignal._LOGGING = false;
    }
  },
  enumerable: true,
  configurable: true
});

heir.merge(OneSignal, new EventEmitter());


if (OneSignal.LOGGING)
  log.setDefaultLevel(log.levels.TRACE);
else
  log.setDefaultLevel(log.levels.ERROR);

log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION}, ${Environment.getEnv()} environment).`, getConsoleStyle('bold'));

module.exports = OneSignal;

