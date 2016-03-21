import { DEV_HOST, DEV_FRAME_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js';
import './string.js';
import { apiCall, sendNotification } from './api.js';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import Event from "./events.js";
import Bell from "./bell/bell.js";
import Database from './database.js';
import * as Browser from 'bowser';
import { isPushNotificationsSupported, isPushNotificationsSupportedAndWarn, getConsoleStyle, once, guid, contains, logError, normalizeSubdomain, decodeHtmlEntities, getUrlQueryParam, executeAndTimeoutPromiseAfter } from './utils.js';
import objectAssign from 'object-assign';
import EventEmitter from 'wolfy87-eventemitter';
import heir from 'heir';
import swivel from 'swivel';
import Postmam from './postmam.js';
import OneSignalHelpers from './OneSignalHelpers.js';


export default class OneSignal {

  /**
   * Pass in the full URL of the default page you want to open when a notification is clicked.
   * @publiclySupportedApi
   */
  static setDefaultNotificationUrl(url) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return Database.put("Options", {key: "defaultUrl", value: url});
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

    return Database.put("Options", {key: "defaultTitle", value: title});
  }

  static onNotificationPermissionChange(event) {
    OneSignalHelpers.checkAndTriggerSubscriptionChanged();
  }

  static _onSubscriptionChanged(newSubscriptionState) {
    if (newSubscriptionState === true) {
      if (OneSignal._isUninitiatedVisitor) {
        Promise.all([
            OneSignal.getUserId(),
            OneSignal.getAppId()
          ])
          .then(([userId, appId]) => {
            let welcome_notification_opts = OneSignal.config['welcomeNotification'];
            let welcome_notification_disabled = (welcome_notification_opts !== undefined && welcome_notification_opts['disable'] === true);
            let title = (welcome_notification_opts !== undefined && welcome_notification_opts['title'] !== undefined && welcome_notification_opts['title'] !== null) ? welcome_notification_opts['title'] : '';
            let message = (welcome_notification_opts !== undefined && welcome_notification_opts['message'] !== undefined && welcome_notification_opts['message'] !== null && welcome_notification_opts['message'].length > 0) ? welcome_notification_opts['message'] : 'Thanks for subscribing!';
            let unopenableWelcomeNotificationUrl = new URL(location.href);
            unopenableWelcomeNotificationUrl = unopenableWelcomeNotificationUrl.origin + '?_osp=do_not_open';
            let url = (welcome_notification_opts && welcome_notification_opts['url'] && welcome_notification_opts['url'].length > 0) ? welcome_notification_opts['url'] : unopenableWelcomeNotificationUrl;
            title = decodeHtmlEntities(title);
            message = decodeHtmlEntities(message);
            if (!welcome_notification_disabled) {
              log.debug('Because this user is a new site visitor, a welcome notification will be sent.');
              sendNotification(appId, [userId], {'en': title}, {'en': message}, url, null, {__isOneSignalWelcomeNotification: true});
              Event.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {title: title, message: message, url: url});
              OneSignal._isUninitiatedVisitor = false;
            }
          })
          .catch(function (e) {
            log.error(e);
          });
      }
    }
    LimitStore.put('subscription.value', newSubscriptionState);
  }

  static _onDbValueSet(info) {
    if (info.type === 'userId') {
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
    ])
      .then(([isPushEnabled, notificationPermission, userId]) => {
        if (!userId) {
          OneSignal._isUninitiatedVisitor = true;
        }
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
    if (OneSignal.initialized) {
      log.warn('SDK initialized event occured more than once, so skipping running init trigger code.');
      return;
    }
    OneSignal.initialized = true;

    // Store initial values of notification permission, user ID, and manual subscription status
    // This is done so that the values can be later compared to see if anything changed
    // This is done here for HTTPS, it is done after the call to _addSessionIframe in _sessionInit for HTTP sites, since the iframe is needed for communication
    OneSignal._storeInitialValues();

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
      OneSignal.notifyButton = new Bell(OneSignal.config.notifyButton);
      OneSignal.notifyButton.create();
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

    if (Environment.isBrowser() && window.localStorage["onesignal.debugger.init"])
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

    OneSignalHelpers.fixWordpressManifestIfMisplaced();

    if (OneSignal.isUsingSubscriptionWorkaround()) {
      if (OneSignal.config.subdomainName) {
        OneSignal.config.subdomainName = OneSignalHelpers.autoCorrectSubdomain(OneSignal.config.subdomainName);
      }
      if (__DEV__)
        OneSignal.iframePopupModalUrl = DEV_FRAME_HOST + '/dev_sdks/initOneSignalHttp';
      else
        OneSignal.iframePopupModalUrl = 'https://' + OneSignal.config.subdomainName + '.onesignal.com/sdks/initOneSignalHttp';
    } else {
      if (__DEV__)
        OneSignal.iframePopupModalUrl = DEV_FRAME_HOST + '/dev_sdks/initOneSignalHttps';
      else
        OneSignal.iframePopupModalUrl = 'https://onesignal.com/sdks/initOneSignalHttps';
    }

    let subdomainPromise = Promise.resolve();
    if (OneSignal.isUsingSubscriptionWorkaround()) {
      log.info('Loading subdomain iFrame...');
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

      OneSignal._saveInitOptions()
        .then(() => {
          if (document.readyState === "complete")
            OneSignal._internalInit();
          else
            window.addEventListener('load', OneSignal._internalInit);
        });
    });
  }

  static _saveInitOptions() {
    let opPromises = [];
    if (OneSignal.config.persistNotification === false) {
      opPromises.push(Database.put('Options', {key: 'persistNotification', value: false}));
    } else {
      opPromises.push(Database.put('Options', {key: 'persistNotification', value: true}));
    }

    let webhookOptions = OneSignal.config.webhooks;
    ['notification.displayed', 'notification.clicked'].forEach(event => {
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

  static _internalInit() {
    log.debug('Called %c_internalInit()', getConsoleStyle('code'));
    OneSignal.getAppId()
      .then(appId => {
        // If AppId changed delete playerId and continue.
        if (appId !== null && appId != OneSignal.config.appId) {
          log.warn(`%cWARNING: Because your app ID changed from ${appId} ⤑ ${OneSignal.config.appId}, all IndexedDB and SessionStorage data will be wiped.`, getConsoleStyle('alert'));
          //sessionStorage.clear();
          //Database.rebuild().then(() => {
          //  OneSignal.init(OneSignal.config);
          //}).catch(e => log.error(e));
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

          /* Only update the service worker for autoRegister false users; autoRegister true users will have the service worker updated when auto registering each time*/
          if (OneSignal.config.autoRegister === false) {
            OneSignal._updateServiceWorker();
          }

          if (OneSignal.config.autoRegister === false && !OneSignal.config.subdomainName) {
            log.debug('No autoregister and no subdomain -> skip _internalInit().')
            Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            return;
          }

          if (document.visibilityState !== "visible") {
            once(document, 'visibilitychange', (e, destroyEventListener) => {
              if (document.visibilityState === 'visible') {
                destroyEventListener();
                OneSignal._sessionInit({});
              }
            }, true);
            return;
          }

          log.debug('Calling _sessionInit() normally from _internalInit().');
          OneSignal._sessionInit({});
        }
      })
      .catch(function (e) {
        logError(e);
      });
  }

  static registerForPushNotifications(options) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
    //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
    if (OneSignal.isUsingSubscriptionWorkaround()) {
      OneSignal.loadPopup();
    } else {
      if (!options)
        options = {};
      options.fromRegisterFor = true;
      OneSignal._sessionInit(options);
    }
  }

  // Http only - Only called from iframe's init.js
  static _initHttp(options) {
    log.debug(`Called %c_initHttp(${JSON.stringify(options, null, 4)})`, getConsoleStyle('code'));

    if (Environment.isBrowser() && window.localStorage["onesignal.debugger._initHttp"]) {
      debugger;
    }

    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    var creator = opener || parent;

    if (creator == window) {
      log.error('This page was not opened from a parent window. This page is intended to be loaded as an iFrame in an HTTP site.');
      return;
    }

    // Forgetting this makes all our APIs stall forever because the promises expect this to be true
    OneSignal.config = {};
    OneSignal.initialized = true;
    let sendToOrigin = options.origin;
    if (Environment.isDev()) {
      sendToOrigin = options.origin;
    }
    let receiveFromOrigin = options.origin;
    let handshakeNonce = getUrlQueryParam('session');

    OneSignal._thisIsThePopup = options.isPopup;
    if (Environment.isPopup() || OneSignal._thisIsThePopup) {
      OneSignal.popupPostmam = new Postmam(this.opener, sendToOrigin, receiveFromOrigin, handshakeNonce);
    }

    OneSignal._thisIsTheModal = options.isModal;
    if (OneSignal._thisIsTheModal) {
      OneSignal.modalPostmam = new Postmam(this.parent, sendToOrigin, receiveFromOrigin, handshakeNonce);
    }

    OneSignal.iframePostmam = new Postmam(this.window, sendToOrigin, receiveFromOrigin, handshakeNonce);
    OneSignal.iframePostmam.listen();
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.CONNECTED, e => {
      log.warn(`(${Environment.getEnv()}) Fired Postmam connect event!`);
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
        let { table, key } = retrieval;
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
        let { table, keypath } = insertion;
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
        let { table, keypath } = removal;
        removalOpPromises.push(Database.remove(table, keypath));
      }
      Promise.all(removalOpPromises)
        .then(results => message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE));
      return false;
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_SERVICE_WORKER, message => {
      if ('serviceWorker' in navigator) {
        let worker = navigator.serviceWorker.controller;
        if (worker === null) {
          message.reply(null);
        } else {
          // We have to select these two components to return since the controller object cannot be cloned or stringified/parsed
          message.reply({scriptURL: worker.scriptURL, state: worker.state});
        }
      } else {
        message.reply(false);
      }
      return false;
    });
    OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, message => {
      log.warn(`(${Environment.getEnv()}) The iFrame has just received initOptions from the host page!`);
      OneSignal.config = objectAssign(message.data.hostInitOptions, options, {
        pageUrl: message.data.pageUrl,
        pageTitle: message.data.pageTitle
      });

      OneSignal._installNativePromptPermissionChangedHook();

      let opPromises = [];
      if (options.continuePressed) {
        opPromises.push(OneSignal.setSubscription(true));
      }

      opPromises.push(Database.get("NotificationOpened", OneSignal.config.pageUrl)
        .then(notificationOpenedResult => {
          if (notificationOpenedResult) {
            Database.remove("NotificationOpened", OneSignal.config.pageUrl);
            OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, notificationOpenedResult.data);
          }
        }));


      opPromises.push(OneSignal._initSaveState());
      opPromises.push(OneSignal._storeInitialValues());
      opPromises.push(OneSignal._saveInitOptions());
      Promise.all(opPromises)
        .then(() => {
          if (contains(location.search, "continuingSession=true"))
            return;
          message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
        });
    });
  }

  static _initPopup() {
    OneSignal.config = {};
    OneSignal.initialized = true;

    if (contains(location.search, "continuingSession=true"))
      return;

    // Do not register OneSignalSDKUpdaterWorker.js for HTTP popup sites; the file does not exist
    navigator.serviceWorker.register(OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
  }

  static _initSaveState() {
    return OneSignal.getAppId()
      .then(appId => {
        return Promise.all([
          Database.put("Ids", {type: "appId", id: appId}),
          Database.put("Options", {key: "pageTitle", value: document.title})
        ]);
      });
  }

  /**
   * Loads the iFrame with the OneSignal subdomain on the page so that subsequent SDK tasks can run on the service-worker-controlled origin.
   */
  static loadSubdomainIFrame() {
    let subdomainLoadPromise = new Promise((resolve, reject) => {
      log.debug(`Called %cloadSubdomainIFrame()`, getConsoleStyle('code'));

      // TODO: Previously, '?session=true' added to the iFrame's URL meant this was not a new tab (same page refresh) and that the HTTP iFrame should not re-register the service worker. Now that is gone, find an alternative way to do that.
      let iframeUrl = `${OneSignal.iframePopupModalUrl}Iframe?session=${OneSignal._sessionNonce}`;
      if (OneSignalHelpers.isContinuingBrowserSession()) {
        iframeUrl += `&continuingSession=true`;
      }
      let iframe = OneSignalHelpers.createHiddenDomIFrame(iframeUrl);
      iframe.onload = () => {
        let sendToOrigin = `https://${OneSignal.config.subdomainName}.onesignal.com`;
        if (Environment.isDev()) {
          sendToOrigin = DEV_FRAME_HOST;
        }
        let receiveFromOrigin = sendToOrigin;
        let handshakeNonce = OneSignal._sessionNonce;
        OneSignal.iframePostmam = new Postmam(iframe.contentWindow, sendToOrigin, receiveFromOrigin, handshakeNonce);
        OneSignal.iframePostmam.connect();
        OneSignal.iframePostmam.on('connect', e => {
          log.warn(`(${Environment.getEnv()}) Fired Postmam connect event!`);
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
                hostInitOptions: OneSignal.config,
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
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_ACCEPTED, message => {
          OneSignal.registerForPushNotifications();
          OneSignal.setSubscription(true);
          let elem = document.getElementById('OneSignal-iframe-modal');
          elem.parentNode.removeChild(elem);
          OneSignalHelpers.triggerCustomPromptClicked('granted');
          return false;
        });
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_REJECTED, message => {
          let elem = document.getElementById('OneSignal-iframe-modal');
          elem.parentNode.removeChild(elem);
          OneSignalHelpers.triggerCustomPromptClicked('denied');
          return false;
        });
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, message => {
          let newRemoteNotificationPermission = message.data;
          OneSignal.triggerNotificationPermissionChanged();
          return false;
        });
        OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, message => {
          OneSignal._fireTransmittedNotificationClickedCallbacks(event, data);
          return false;
        });
      };
      OneSignal._sessionIframeAdded = true;
    });
    return executeAndTimeoutPromiseAfter(subdomainLoadPromise, 15000, `OneSignal: Could not load iFrame with URL ${OneSignal.iframePopupModalUrl}. Please check that your 'subdomainName' matches that on your OneSignal platform settings.`);
  }

  static loadPopup() {
    // Important: Don't use any promises until the window is opened, otherwise the popup will be blocked
    log.debug('Opening popup window.');

    let sendToOrigin = `https://${OneSignal.config.subdomainName}.onesignal.com`;
    if (Environment.isDev()) {
      sendToOrigin = DEV_FRAME_HOST;
    }
    let receiveFromOrigin = sendToOrigin;
    let handshakeNonce = OneSignal._sessionNonce;
    var subdomainPopup = OneSignalHelpers.openSubdomainPopup(`${OneSignal.iframePopupModalUrl}?${OneSignalHelpers.getPromptOptionsQueryString()}&session=${handshakeNonce}&promptType=popup`);

    if (subdomainPopup)
      subdomainPopup.focus();

    OneSignal.popupPostmam = new Postmam(subdomainPopup, sendToOrigin, receiveFromOrigin, handshakeNonce);
    OneSignal.popupPostmam.startPostMessageReceive();

    return new Promise((resolve, reject) => {
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
        OneSignal.popupPostmam.destroy();
      });
    });
  }

  static _sessionInit(options) {
    log.debug(`Called %c_sessionInit(${JSON.stringify(options)})`, getConsoleStyle('code'));

    OneSignal._initSaveState()
      .then(() => {
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
                      OneSignalHelpers.registerWithOneSignal(appId, pushResponse.deviceToken.toLowerCase(), OneSignalHelpers.getDeviceTypeForBrowser());
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
              log.debug('Opening HTTPS modal prompt.');
              let iframeModalUrl = `${OneSignal.iframePopupModalUrl}?${OneSignalHelpers.getPromptOptionsQueryString()}&id=${appId}&httpsPrompt=true&pushEnabled=${isPushEnabled}&permissionBlocked=${notificationPermission === 'denied'}&session=${OneSignal._sessionNonce}&promptType=modal`;
              let iframeModal = OneSignalHelpers.createSubscriptionDomModal(iframeModalUrl);

              let sendToOrigin = `https://onesignal.com`;
              if (Environment.isDev()) {
                sendToOrigin = DEV_FRAME_HOST;
              }
              let receiveFromOrigin = sendToOrigin;
              OneSignal.modalPostmam = new Postmam(iframeModal, sendToOrigin, receiveFromOrigin, OneSignal._sessionNonce);
              OneSignal.modalPostmam.startPostMessageReceive();

              return new Promise((resolve, reject) => {
                OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_ACCEPTED, message => {
                  let iframeModalDom = document.getElementById('OneSignal-iframe-modal');
                  iframeModalDom.parentNode.removeChild(iframeModalDom);
                  OneSignal.modalPostmam.destroy();
                  OneSignalHelpers.triggerCustomPromptClicked('granted');
                  OneSignal.registerForPushNotifications();
                });
                OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_REJECTED, message => {
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
        else if ('serviceWorker' in navigator && !OneSignal.isUsingSubscriptionWorkaround()) // If HTTPS - Show native prompt
          OneSignal._registerForW3CPush(options);

        Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
      });
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
      log.warn('Skipping _updateServiceWorker().');
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
        log.debug('_updateServiceWorker():', 'Existing service worker');
        let previousWorkerUrl = serviceWorkerRegistration.active.scriptURL;
        if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_PATH)) {
          // OneSignalSDKWorker.js was installed
          log.debug('_updateServiceWorker():', 'OneSignalSDKWorker is active');
          return Database.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
            .then(function (version) {
              // Get version of installed worker saved to IndexedDB
              if (version) {
                // If a version exists
                log.debug('_updateServiceWorker():', 'Database version exists:', version);
                if (version != OneSignal._VERSION) {
                  // If there is a different version
                  log.debug('_updateServiceWorker():', 'New version exists:', OneSignal._VERSION);
                  log.info(`Installing new service worker (${version} -> ${OneSignal._VERSION})`);
                  return navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM);
                }
                else {
                  // No changed service worker version
                  log.debug('_updateServiceWorker():', 'No changed service worker version');
                  return null;
                }
              }
              else {
                // No version was saved; somehow this got overwritten
                // Reinstall the alternate service worker
                log.debug('_updateServiceWorker():', 'No version was saved; somehow this got overwritten; Reinstall the alternate service worker');
                return navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM);
              }

            })
            .catch(function (e) {
              log.error(e);
            });
        }
        else if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH)) {
          // OneSignalSDKUpdaterWorker.js was installed
          log.debug('_updateServiceWorker():', 'OneSignalSDKUpdaterWorker is active');
          return Database.get('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION')
            .then(function (version) {
              // Get version of installed worker saved to IndexedDB
              if (version) {
                // If a version exists
                log.debug('_updateServiceWorker():', 'Database version exists:', version);
                if (version != OneSignal._VERSION) {
                  // If there is a different version
                  log.debug('_updateServiceWorker():', 'New version exists:', OneSignal._VERSION);
                  log.info(`Installing new service worker (${version} -> ${OneSignal._VERSION})`);
                  return navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM);
                }
                else {
                  // No changed service worker version
                  log.debug('_updateServiceWorker():', 'No changed service worker version');
                  return null;
                }
              }
              else {
                // No version was saved; somehow this got overwritten
                // Reinstall the alternate service worker
                log.debug('_updateServiceWorker():', 'No version was saved; somehow this got overwritten; Reinstall the alternate service worker');
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
    ;
  }

  static _registerServiceWorker(full_sw_and_path) {
    log.debug(`Called %c_registerServiceWorker(${JSON.stringify(full_sw_and_path, null, 4)})`, getConsoleStyle('code'));
    navigator.serviceWorker.register(full_sw_and_path, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
  }

  static _registerError(err) {
    log.error("ServiceWorker registration", err);
  }

  static _enableNotifications(existingServiceWorkerRegistration) { // is ServiceWorkerRegistration type
    if (existingServiceWorkerRegistration)
      log.debug('An older ServiceWorker exists:', existingServiceWorkerRegistration);
    if (!('PushManager' in window)) {
      log.error("Push messaging is not supported. No PushManager.");
      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
      return;
    }

    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      log.error("Notifications are not supported. showNotification not available in ServiceWorkerRegistration.");
      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
      return;
    }

    if (Notification.permission === 'denied') {
      log.warn("The user has blocked notifications.");
      return;
    }

    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
      log.info('Service worker now active:', serviceWorkerRegistration);
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
              log.error(`OneSignal: Invalid init option safari_web_id %c${safariWebId}`, getConsoleStyle('code'), '. Please pass in a valid safari_web_id to OneSignal init.');
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
    var notificationPermissionBeforeRequest = '';

    OneSignal.getNotificationPermission().then((permission) => {
      notificationPermissionBeforeRequest = permission;
    })
      .then(() => {
        return serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true});
      })
      .then(function (subscription) {
        sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);

        OneSignal.getAppId()
          .then(appId => {
            log.debug("Called OneSignal._subscribeForPush() -> serviceWorkerRegistration.pushManager.subscribe().");

            var registrationId = null;
            if (subscription) {
              if (typeof subscription.subscriptionId != "undefined") // Chrome 43 & 42
                registrationId = subscription.subscriptionId;
              else  // Chrome 44+ and FireFox
                registrationId = subscription.endpoint.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
            }
            else
              log.warn('Could not subscribe your browser for push notifications.');

            OneSignalHelpers.registerWithOneSignal(appId, registrationId, OneSignalHelpers.getDeviceTypeForBrowser());
          })
          .catch(function (e) {
            log.error(e);
          });
      })
      .catch(function (e) {
        if (e.message === 'Registration failed - no sender id provided') {
          let manifestDom = document.querySelector('link[rel=manifest]');
          if (manifestDom) {
            let manifestParentTagname = document.querySelector('link[rel=manifest]').parentNode.tagName.toLowerCase();
            let manifestHtml = document.querySelector('link[rel=manifest]').outerHTML;
            let manifestLocation = document.querySelector('link[rel=manifest]').href;
            if (manifestParentTagname !== 'head') {
              log.error(`OneSignal: Your manifest %c${manifestHtml}`, getConsoleStyle('code'), `must be referenced in the <head> tag to be detected properly. It is currently referenced in <${manifestParentTagname}>. (See: https://documentation.onesignal.com/docs/website-sdk-installation#3-include-and-initialize-the-sdk)`);
            } else {
              let manifestLocationOrigin = new URL(manifestLocation).origin;
              let currentOrigin = location.origin;
              if (currentOrigin !== manifestLocationOrigin) {
                log.error(`OneSignal: Your manifest is being served from ${manifestLocationOrigin}, which is different from the current page's origin of ${currentOrigin}. Please serve your manifest from the same origin as your page's. If you are using a content delivery network (CDN), please add an exception so that the manifest is not served by your CDN. (See: https://documentation.onesignal.com/docs/website-sdk-installation#2-upload-required-files)`);
              } else {
                log.error(`OneSignal: Please check your manifest at ${manifestLocation}. The %cgcm_sender_id`, getConsoleStyle('code'), "field is missing or invalid. (See: https://documentation.onesignal.com/docs/website-sdk-installation#2-upload-required-files)");
              }
            }
          } else if (location.protocol === 'https:') {
            log.error(`OneSignal: You must reference a %cmanifest.json`, getConsoleStyle('code'), "in <head>. (See: https://documentation.onesignal.com/docs/website-sdk-installation#2-upload-required-files)");
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
          return apiCall(`players/${userId}`, 'GET', null);
        } else {
          throw new Error('Could not get tags because you are not registered with OneSignal (no user ID).');
        }
      })
      .then(response => {
        if (callback) {
          callback(response.tags);
        }
        return response.tags;
      })
      .catch(e => {
        logError(e);
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
                return apiCall(`players/${userId}`, 'PUT', {
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
        OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __sendTags().then(resolve).catch(reject));
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

    function __addListenerForNotificationOpened() {
      OneSignal._notificationOpenedCallbacks.push(callback);
      OneSignal._fireSavedNotificationClickedCallbacks();
    }

    if (!OneSignal.initialized) {
      OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __addListenerForNotificationOpened());
    } else {
      __addListenerForNotificationOpened();
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

    console.warn("OneSignal: getIdsAvailable() is deprecated. Please use getUserId() or getRegistrationId() instead.");

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

    return new Promise((resolve, reject) => {
      if (OneSignal.isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_SERVICE_WORKER, null, reply => {
          let worker = reply.data;
          let isActive = (worker !== null &&
          worker.state === 'activated');
          if (callback) {
            callback(isActive)
          }
          resolve(isActive);
        });
      } else {
        let worker = navigator.serviceWorker.controller;
        let isActive = (worker !== null &&
        worker.state === 'activated');
        if (callback) {
          callback(isActive)
        }
        resolve(isActive);
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

            if ('serviceWorker' in navigator) {
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
            logError(e);
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
            return apiCall("players/" + userId, "PUT", {
              app_id: appId,
              notification_types: OneSignalHelpers.getNotificationTypeFromOptIn(newSubscription)
            });
          })
          .then(() => {
            OneSignal.triggerInternalSubscriptionSet(newSubscription);
            resolve(true);
          })
          .catch(e => {
            log.error(e);
            reject(false);
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

    return Database.get('Ids', 'userId')
      .then(result => {
        if (callback) {
          callback(result)
        }
        return result;
      })
      .catch(e => log.error(e));
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

    return Database.get('Ids', 'registrationId')
      .then(result => {
        if (callback) {
          callback(result)
        }
        return result;
      })
      .catch(e => log.error(e));
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
  _VERSION: __VERSION__,
  _API_URL: API_URL,
  _notificationOpenedCallbacks: [],
  _idsAvailable_callback: [],
  _defaultLaunchURL: null,
  config: null,
  _thisIsThePopup: false,
  _isNotificationEnabledCallback: [],
  _subscriptionSet: true,
  iframePopupModalUrl: null,
  _sessionIframeAdded: false,
  _windowWidth: 550,
  _windowHeight: 480,
  _isUninitiatedVisitor: false,
  _isNewVisitor: false,
  _channel: null,
  logError: logError,
  initialized: false,
  notifyButton: null,
  store: LimitStore,
  environment: Environment,
  database: Database,
  event: Event,
  browser: Browser,
  log: log,
  swivel: swivel,
  _sessionNonce: guid(),
  iframePostmam: null,
  popupPostmam: null,
  helpers: OneSignalHelpers,
  apiCall: apiCall,
  objectAssign: objectAssign,
  checkAndTriggerSubscriptionChanged: OneSignalHelpers.checkAndTriggerSubscriptionChanged,
  sendSelfNotification: OneSignalHelpers.sendSelfNotification,
  SERVICE_WORKER_UPDATER_PATH: "OneSignalSDKUpdaterWorker.js",
  SERVICE_WORKER_PATH: "OneSignalSDKWorker.js",
  SERVICE_WORKER_PARAM: {},

  POSTMAM_COMMANDS: {
    CONNECTED: 'connect',
    REMOTE_NOTIFICATION_PERMISSION: 'postmam.remoteNotificationPermission',
    REMOTE_DATABASE_GET: 'postmam.remoteDatabaseGet',
    REMOTE_DATABASE_PUT: 'postmam.remoteDatabasePut',
    REMOTE_DATABASE_REMOVE: 'postmam.remoteDatabaseRemove',
    REMOTE_OPERATION_COMPLETE: 'postman.operationComplete',
    REMOTE_RETRIGGER_EVENT: 'postmam.remoteRetriggerEvent',
    MODAL_PROMPT_ACCEPTED: 'postmam.modalPrompt.accepted',
    MODAL_PROMPT_REJECTED: 'postmam.modalPrompt.canceled',
    POPUP_ACCEPTED: 'postmam.popup.accepted',
    POPUP_REJECTED: 'postmam.popup.canceled',
    POPUP_CLOSING: 'postman.popup.closing',
    REMOTE_NOTIFICATION_PERMISSION_CHANGED: 'postmam.remoteNotificationPermissionChanged',
    NOTIFICATION_OPENED: 'postmam.notificationOpened',
    IFRAME_POPUP_INITIALIZE: 'postmam.iframePopupInitialize',
    POPUP_IDS_AVAILBLE: 'postman.popupIdsAvailable',
    REMOTE_SERVICE_WORKER: 'postman.remoteServiceWorker'
  },

  EVENTS: {
    CUSTOM_PROMPT_CLICKED: 'customPromptClick',
    NATIVE_PROMPT_PERMISSIONCHANGED: 'notificationPermissionChange',
    SUBSCRIPTION_CHANGED: 'subscriptionChange',
    WELCOME_NOTIFICATION_SENT: 'sendWelcomeNotification',
    INTERNAL_SUBSCRIPTIONSET: 'subscriptionSet',
    SDK_INITIALIZED: 'initialize'
  },

  NOTIFICATION_TYPES: {
    SUBSCRIBED: 1,
    UNSUBSCRIBED: -2
  },

  DEVICE_TYPES: {
    CHROME: 5,
    SAFARI: 7,
    FIREFOX: 8,
  }
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

