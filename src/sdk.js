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
import { isPushNotificationsSupported, isPushNotificationsSupportedAndWarn, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, once, guid, contains, logError, normalizeSubdomain, decodeHtmlEntities, getUrlQueryParam } from './utils.js';
import objectAssign from 'object-assign';
import EventEmitter from 'wolfy87-eventemitter';
import heir from 'heir';
import swivel from 'swivel';
import Postmam from './postmam.js';


var OneSignal = {
  _VERSION: __VERSION__,
  _API_URL: API_URL,
  _app_id: null,
  _futureSendTags: null,
  _futureSendTagsPromiseResolves: [],
  _notificationOpenedCallbacks: [],
  _idsAvailable_callback: [],
  _defaultLaunchURL: null,
  _initOptions: null,
  _thisIsThePopup: false,
  _isNotificationEnabledCallback: [],
  _subscriptionSet: true,
  _initOneSignalHttp: null,
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

  _sendToOneSignalApi: function (url, action, inData, callback, failedCallback) {
    log.debug(`Calling ${action} ${OneSignal._API_URL + url} with data:`, inData);
    var contents = {
      method: action,
      //mode: 'no-cors', // no-cors is disabled for non-serviceworker.
    };

    if (inData) {
      contents.headers = {"Content-type": "application/json;charset=UTF-8"};
      contents.body = JSON.stringify(inData);
    }

    fetch(OneSignal._API_URL + url, contents)
      .then(function status(response) {
        if (response.status >= 200 && response.status < 300)
          return Promise.resolve(response);
        else
          return Promise.reject(new Error(response.statusText));
      })
      .then(function status(response) {
        return response.json();
      })
      .then(function (jsonData) {
        if (callback != null)
          callback(jsonData);
      })
      .catch(function (e) {
        log.error('OneSignal._sendToOneSignalApi() failed:', e);
        if (failedCallback != null)
          failedCallback();
      });
  },

  _getLanguage: function () {
    return navigator.language ? (navigator.language.length > 3 ? navigator.language.substring(0, 2) : navigator.language) : 'en';
  },

  _getPlayerId: function (value, callback) {
    if (value)
      callback(value)
    else {
      Database.get('Ids', 'userId')
        .then(function _getPlayerId_gotUserId(result) {
          if (result)
            callback(result.id);
          else
            callback(null);
        })
        .catch(function (e) {
          log.error(e);
        });
      ;
    }
  },

  _registerWithOneSignal: function (appId, registrationId, deviceType) {
    Database.get('Ids', 'userId')
      .then(function _registerWithOneSignal_GotUserId(userIdResult) {
        OneSignal._getNotificationTypes(function (notif_types) {
          var requestUrl = 'players';

          var jsonData = {
            app_id: appId,
            device_type: deviceType,
            language: OneSignal._getLanguage(),
            timezone: new Date().getTimezoneOffset() * -60,
            device_model: navigator.platform + " " + Browser.name,
            device_os: Browser.version,
            sdk: OneSignal._VERSION
          };

          if (userIdResult) {
            requestUrl = 'players/' + userIdResult.id + '/on_session';
            jsonData.notification_types = notif_types
          }
          else if (notif_types != 1)
            jsonData.notification_types = notif_types

          if (registrationId) {
            jsonData.identifier = registrationId;
            Database.put("Ids", {type: "registrationId", id: registrationId});
          }

          OneSignal._sendToOneSignalApi(requestUrl, 'POST', jsonData,
            function registeredCallback(responseJSON) {
              sessionStorage.setItem("ONE_SIGNAL_SESSION", true);

              if (responseJSON.id) {
                Database.put("Ids", {type: "userId", id: responseJSON.id});
                OneSignal._sendUnsentTags();
              }

              OneSignal._getPlayerId(responseJSON.id, function (userId) {
                if (OneSignal._idsAvailable_callback.length > 0) {
                  while (OneSignal._idsAvailable_callback.length > 0) {
                    var curr_callback = OneSignal._idsAvailable_callback.pop();
                    curr_callback({userId: userId, registrationId: registrationId});
                  }
                }

                if (OneSignal._thisIsThePopup) {
                  // 12/16/2015 -- At this point, the user has just clicked Allow on the HTTP prompt!!
                  OneSignal._getNotificationPermission()
                    .then((permission) => {
                      log.debug("Sending player Id and registrationId back to host page");
                      var creator = opener || parent;
                      OneSignal.popupPostmam.postMessage(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, permission);
                      OneSignal.popupPostmam.postMessage(OneSignal.POSTMAM_COMMANDS.POPUP_IDS_AVAILBLE, {
                        userId: userId,
                        registrationId: registrationId
                      })
                      if (opener)
                        window.close();
                    })
                    .catch(e => log.error(e));
                }
              });
            }
          );

        });
      })
      .catch(function (e) {
        log.error(e);
      });
    ;
  },

  _sendUnsentTags: function () {
    if (OneSignal._futureSendTags) {
      OneSignal.sendTags(OneSignal._futureSendTags);
      while (OneSignal._futureSendTagsPromiseResolves.length > 0) {
        var promiseResolveFn = OneSignal._futureSendTagsPromiseResolves.shift()
        promiseResolveFn();
      }
      OneSignal._futureSendTags = null;
    }
  },

  setDefaultNotificationUrl: function (url) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    Database.put("Options", {key: "defaultUrl", value: url});
  },

  setDefaultIcon: function (icon) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    Database.put("Options", {key: "defaultIcon", value: icon});
  },

  setDefaultTitle: function (title) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    Database.put("Options", {key: "defaultTitle", value: title});
  },

  onNativePromptChanged: function (event) {
    OneSignal._checkTrigger_eventSubscriptionChanged();
  },

  _sendSelfNotification: function(title, message, url, icon, data) {
    if (!title) {
      title = 'OneSignal Test Message';
    }
    if (!message) {
      message = 'This is an example notification.';
    }
    if (!url) {
      url = new URL(location.href).origin + '?_osp=do_not_open';
    }
    Database.get('Ids', 'userId')
      .then(function (result) {
        if (result && result.id) {
          sendNotification(OneSignal._app_id, [result.id], {'en': title}, {'en': message}, url, icon, data)
        } else {
          log.warn('Could not send self a test notification because there is no valid user ID.');
        }
      });
  },

  _closeAllNotifications: function() {
    navigator.serviceWorker.getRegistration()
      .then(registration => {
        if (registration === undefined || !registration.active) {
          log.debug('There is no active service worker.');
          return Promise.reject();
        } else {
          OneSignal._messageServiceWorker('notification.closeall');
        }
      });
  },

  _messageServiceWorker(message) {
    if (OneSignal._channel) {
      return OneSignal._channel.emit('data', message);
    } else {
      log.error("Please initialize the SDK before trying to communicate with the service worker. The communication channel isn't initialized yet.");
    }
  },

  _onSubscriptionChanged: function (newSubscriptionState) {
    if (newSubscriptionState === true) {
      if (OneSignal._isUninitiatedVisitor) {
        Database.get('Ids', 'userId')
          .then(function (result) {
            let welcome_notification_opts = OneSignal._initOptions['welcomeNotification'];
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
              sendNotification(OneSignal._app_id, [result.id], {'en': title}, {'en': message}, url, null, {__isOneSignalWelcomeNotification: true});
              Event.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {title: title, message: message, url: url});
              OneSignal._isUninitiatedVisitor = false;
            }
          })
          .catch(function (e) {
            log.error(e);
          });
      }
      OneSignal._sendUnsentTags();
    }
    LimitStore.put('subscription.value', newSubscriptionState);
  },

  _onDbValueRetrieved: function (event) {
  },

  _onDbValueSet: function (info) {
    if (info.type === 'userId') {
      LimitStore.put('db.ids.userId', info.id);
      OneSignal._checkTrigger_eventSubscriptionChanged();
    }
  },

  _onInternalSubscriptionSet: function (event) {
    var newSubscriptionValue = event;
    LimitStore.put('setsubscription.value', newSubscriptionValue);
    OneSignal._checkTrigger_eventSubscriptionChanged();
  },

  _establishServiceWorkerChannel: function(serviceWorkerRegistration) {
    if (OneSignal._channel) {
      OneSignal._channel.off('data');
      OneSignal._channel.off('notification.clicked');
    }
    OneSignal._channel = swivel.at(serviceWorkerRegistration.active);
    OneSignal._channel.on('data', function handler(context, data) {
      log.debug(`%c${Environment.getEnv().capitalize()} ⬸ ServiceWorker:`, getConsoleStyle('serviceworkermessage'), data, context);
    });
    OneSignal._channel.on('notification.clicked', function handler(context, data) {
      if (Environment.isHost()) {
        OneSignal._fireTransmittedNotificationClickedCallbacks(data);
      } else if (Environment.isIframe()) {
        var creator = opener || parent;
        OneSignal._safePostMessage(creator, {openedNotification: data, from: Environment.getEnv()}, OneSignal._initOptions.origin, null);
      }
    });
    log.info('Service worker messaging channel established!');
  },

  _storeInitialValues: function() {
    OneSignal.isPushNotificationsEnabled(isEnabled => {
      Database.put('Options', {key: 'isPushEnabled', value: isEnabled});
    });
  },

  /**
   * This event occurs after init.
   * For HTTPS sites, this event is called after init.
   * For HTTP sites, this event is called after the iFrame is created, and a message is received from the iFrame signaling cross-origin messaging is ready.
   * @private
   */
  _onSdkInitialized: function() {
    if (OneSignal.initialized) {
      log.warn('SDK initialized event occured more than once, so skipping running init trigger code.');
      return;
    }
    OneSignal.initialized = true;

    // Store initial values of notification permission, user ID, and manual subscription status
    // This is done so that the values can be later compared to see if anything changed
    // This is done here for HTTPS, it is done after the call to _addSessionIframe in _sessionInit for HTTP sites, since the iframe is needed for communication
    OneSignal._storeInitialValues();

    OneSignal._sendUnsentTags();

    if (navigator.serviceWorker && window.location.protocol === 'https:') {
      navigator.serviceWorker.getRegistration()
        .then(registration => {
          if (registration && registration.active) {
            OneSignal._establishServiceWorkerChannel(registration);
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
      OneSignal._initOptions.notifyButton = OneSignal._initOptions.notifyButton || {};
      if (OneSignal._initOptions.bell) {
        // If both bell and notifyButton, notifyButton's options take precedence
        objectAssign(OneSignal._initOptions.bell, OneSignal._initOptions.notifyButton);
        objectAssign(OneSignal._initOptions.notifyButton, OneSignal._initOptions.bell);
      }
      OneSignal.notifyButton = new Bell(OneSignal._initOptions.notifyButton);
      OneSignal.notifyButton.create();
    }
  },

  _onDatabaseRebuilt: function() {
    OneSignal._isNewVisitor = true;
  },

  _checkTrigger_nativePermissionChanged: function() {
    OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id)
      .then((permission) => {
        let currentPermission = permission;
        let lastPermission = LimitStore.getLast('notification.permission');
        if (lastPermission !== currentPermission) {
          OneSignal._triggerEvent_nativePromptPermissionChanged(lastPermission, currentPermission);
        }
      })
      .catch(e => log.error(e));
  },

  _checkTrigger_eventSubscriptionChanged: function () {
    log.info('Called %c_checkTrigger_eventSubscriptionChanged', getConsoleStyle('code'));
    let subscriptionChanged = false;
    let newSubscription = false;
    OneSignal.isPushNotificationsEnabled(isEnabled => {
      newSubscription = isEnabled;
      Database.get('Options', 'isPushEnabled')
        .then(storedIsEnabledResult => {
          if (storedIsEnabledResult) {
            if (storedIsEnabledResult !== isEnabled)
              subscriptionChanged = true;
          } else {
            subscriptionChanged = true;
          }
        });
    });

    if (subscriptionChanged) {
      log.info('New Subscription:', subscriptionChanged);
      Database.put('Options', {key: 'isPushEnabled', value: newSubscription})
        .then(() => {
          OneSignal._triggerEvent_subscriptionChanged(newSubscription);
        });
    }
  },

  /**
   * Returns true if the current browser is a supported browser for push notifications, service workers, and promises.
   * The following browsers are known to be supported:
   *  - Chrome:  On Windows, Android, Mac OS X, and Linux. Not supported on iOS. Version 42+.
   *  - Firefox: On desktop releases version 44 or higher. Not supported on iOS or mobile Firefox v44.
   *  - Safari:  Version 7.1+ on desktop Mac OS X only. Not supported on iOS.
   */
  isPushNotificationsSupported: function() {
    return isPushNotificationsSupported();
  },

  _installNativePromptPermissionChangedHook: function() {
    if (navigator.permissions && !(isBrowserFirefox() && getFirefoxVersion() <= 45)) {
      OneSignal._usingNativePermissionHook = true;
      // If the browser natively supports hooking the subscription prompt permission change event
      //     use it instead of our SDK method
      navigator.permissions.query({name: 'notifications'}).then(function (permissionStatus) {
        permissionStatus.onchange = function () {
          var permissionBeforePrompt = LimitStore.getFirst('notification.permission');
          OneSignal._triggerEvent_nativePromptPermissionChanged(permissionBeforePrompt);
        };
      })
        .catch(function (e) {
          log.error(e);
        });
    }
  },

  _fixWordpressManifestIfMisplaced: function() {
    var manifests = document.querySelectorAll('link[rel=manifest]');
    if (!manifests || manifests.length <= 1) {
      // Multiple manifests do not exist on this webpage; there is no issue
      return;
    }
    for (let i = 0; i < manifests.length; i++) {
      let manifest = manifests[i];
      let url = manifest.href;
      if (contains(url, 'gcm_sender_id')) {
        // Move the <manifest> to the first thing in <head>
        document.querySelector('head').insertBefore(manifest, document.querySelector('head').children[0]);
        log.warn('OneSignal: Moved the WordPress push <manifest> to the first element in <head>.');
      }
    }
  },

  _init_getNormalizedSubdomain: function(subdomain) {
    if (!subdomain) {
      log.error('OneSignal: Missing required init parameter %csubdomainName', getConsoleStyle('code'), '. You must supply a subdomain name to the SDK initialization options. (See: https://documentation.onesignal.com/docs/website-sdk-http-installation#2-include-and-initialize-onesignal)')
      throw new Error('OneSignal: Missing required init parameter subdomainName. You must supply a subdomain name to the SDK initialization options. (See: https://documentation.onesignal.com/docs/website-sdk-http-installation#2-include-and-initialize-onesignal)')
    }
    return normalizeSubdomain(subdomain);
  },

  init: function (options) {
    log.debug(`Called %cinit(${JSON.stringify(options, null, 4)})`, getConsoleStyle('code'));

    if (Environment.isBrowser() && window.localStorage["onesignal.debugger.init"]) {
      debugger;
    }

    if (OneSignal._initCalled) {
      log.error(`OneSignal: Please don't call init() more than once. Any extra calls to init() are ignored. The following parameters were not processed: %c${JSON.stringify(Object.keys(options))}`, getConsoleStyle('code'));
      return;
    }
    OneSignal._initCalled = true;

    if (!options.path) {
      options.path = '/';
    }

    OneSignal._initOptions = options;
    OneSignal._app_id = OneSignal._initOptions.appId;

    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    OneSignal._fixWordpressManifestIfMisplaced();

    if (Browser.safari && !OneSignal._initOptions.safari_web_id) {
      log.warn("You're browsing on Safari, and %csafari_web_id", getConsoleStyle('code'), 'was not passed to OneSignal.init(), so not initializing the SDK.');
      return;
    }

    OneSignal.on(Database.EVENTS.REBUILT, OneSignal._onDatabaseRebuilt);
    OneSignal.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, OneSignal.onNativePromptChanged);
    OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, OneSignal._onSubscriptionChanged);
    OneSignal.on(Database.EVENTS.RETRIEVED, OneSignal._onDbValueRetrieved);
    OneSignal.on(Database.EVENTS.SET, OneSignal._onDbValueSet);
    OneSignal.on(OneSignal.EVENTS.INTERNAL_SUBSCRIPTIONSET, OneSignal._onInternalSubscriptionSet);
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED, OneSignal._onSdkInitialized);
    window.addEventListener('focus', (event) => {
      // Checks if permission changed everytime a user focuses on the page, since a user has to click out of and back on the page to check permissions
      OneSignal._checkTrigger_nativePermissionChanged();
    });

    if (OneSignal._isUsingSubscriptionWorkaround()) {
      let inputSubdomain = OneSignal._initOptions.subdomainName;
      let normalizedSubdomain = OneSignal._init_getNormalizedSubdomain(inputSubdomain);
      if (normalizedSubdomain !== inputSubdomain) {
        log.warn(`Auto-corrected subdomain '${inputSubdomain}' to '${normalizedSubdomain}'.`);
      }
      OneSignal._initOptions.subdomainName = normalizedSubdomain;
      OneSignal._initOneSignalHttp = 'https://' + OneSignal._initOptions.subdomainName + '.onesignal.com/sdks/initOneSignalHttp';
    }
    else {
      OneSignal._initOneSignalHttp = 'https://onesignal.com/sdks/initOneSignalHttps';
    }

    if (__DEV__)
      OneSignal._initOneSignalHttp = DEV_FRAME_HOST + '/dev_sdks/initOneSignalHttp';

    if (OneSignal._initOptions.persistNotification === false) {
      Database.put('Options', {key: 'persistNotification', value: false})
    } else {
      Database.put('Options', {key: 'persistNotification', value: true})
    }

    let webhookPromises = [];
    let webhookOptions = OneSignal._initOptions.webhooks;
    ['notification.displayed', 'notification.clicked'].forEach(event => {
      if (webhookOptions && webhookOptions[event]) {
        webhookPromises.push(Database.put('Options', {key: `webhooks.${event}`, value: webhookOptions[event]}));
      } else {
        webhookPromises.push(Database.put('Options', {key: `webhooks.${event}`, value: false}));
      }
    });
    if (webhookOptions && webhookOptions.cors) {
      webhookPromises.push(Database.put('Options', {key: `webhooks.cors`, value: true}));
    } else {
      webhookPromises.push(Database.put('Options', {key: `webhooks.cors`, value: false}));
    }
    Promise.all(webhookPromises);

    if (OneSignal._initOptions.notificationClickHandlerMatch) {
      Database.put('Options', {key: 'notificationClickHandlerMatch', value: OneSignal._initOptions.notificationClickHandlerMatch})
    } else {
      Database.put('Options', {key: 'notificationClickHandlerMatch', value: 'exact'})
    }

    if (OneSignal._initOptions.serviceWorkerRefetchRequests === false) {
      Database.put('Options', {key: 'serviceWorkerRefetchRequests', value: false})
    } else {
      Database.put('Options', {key: 'serviceWorkerRefetchRequests', value: true})
    }

    // If Safari - add 'fetch' pollyfill if it isn't already added.
    if (isSupportedSafari() && typeof window.fetch == "undefined") {
      var s = document.createElement('script');
      s.setAttribute('src', "https://cdnjs.cloudflare.com/ajax/libs/fetch/0.9.0/fetch.js");
      document.head.appendChild(s);
    }

    if (document.readyState === "complete")
      OneSignal._internalInit();
    else
      window.addEventListener('load', OneSignal._internalInit);
  },

  _internalInit: function () {
    log.debug('Called %c_internalInit()', getConsoleStyle('code'));
    Promise.all([Database.get('Ids', 'appId'),
      Database.get('Ids', 'registrationId'),
      Database.get('Options', 'subscription')])
      .then(function _internalInit_GotAppRegistrationSubscriptionIds(result) {
        var appIdResult = result[0];
        var registrationIdResult = result[1];
        var subscriptionResult = result[2];

        // If AppId changed delete playerId and continue.
        if (appIdResult && appIdResult.id != OneSignal._initOptions.appId) {
          log.warn(`%cWARNING: Because your app ID changed from ${appIdResult.id} ⤑ ${OneSignal._initOptions.appId}, all IndexedDB and SessionStorage data will be wiped.`, getConsoleStyle('alert'));
          sessionStorage.clear();
          Database.rebuild().then(() => {
            OneSignal.init(OneSignal._initOptions);
          }).catch(e => log.error(e));
        } else {
          // HTTPS - Only register for push notifications once per session or if the user changes notification permission to Ask or Allow.
          if (sessionStorage.getItem("ONE_SIGNAL_SESSION")
            && !OneSignal._initOptions.subdomainName
            && (Notification.permission == "denied"
            || sessionStorage.getItem("ONE_SIGNAL_NOTIFICATION_PERMISSION") == Notification.permission)) {
            Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            return;
          }

          sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);

          if (Browser.safari && OneSignal._initOptions.autoRegister === false) {
            log.debug('On Safari and autoregister is false, skipping sessionInit().');
            // This *seems* to trigger on either Safari's autoregister false or Chrome HTTP
            // Chrome HTTP gets an SDK_INITIALIZED event from the iFrame postMessage, so don't call it here
            if (!OneSignal._isUsingSubscriptionWorkaround()) {
              Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            }
            return;
          }

          /* Only update the service worker for autoRegister false users; autoRegister true users will have the service worker updated when auto registering each time*/
          if (OneSignal._initOptions.autoRegister === false) {
            OneSignal._updateServiceWorker();
          }

          if (OneSignal._initOptions.autoRegister === false && !OneSignal._initOptions.subdomainName) {
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
  },

  registerForPushNotifications: function (options) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }
    // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
    //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
    if (!options)
      options = {};
    options.fromRegisterFor = true;
    OneSignal._sessionInit(options);
  },

  _getSessionNonceFromUrl: function() {
    let nonce = getUrlQueryParam('sessionNonce');
    return nonce;
  },

  // Http only - Only called from iframe's init.js
  _initHttp: function (options) {
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
    OneSignal.initialized = true;
    let sendToOrigin = options.origin;
    if (Environment.isDev()) {
      sendToOrigin = options.origin;
    }
    let receiveFromOrigin = options.origin;
    let handshakeNonce = OneSignal._getSessionNonceFromUrl();

    OneSignal._thisIsThePopup = options.thisIsThePopup;
    if (Environment.isPopup() || OneSignal._thisIsThePopup) {
      OneSignal.popupPostmam = new Postmam(this.opener, sendToOrigin, receiveFromOrigin, handshakeNonce);
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
      OneSignal._initOptions = objectAssign(message.data.hostInitOptions, options, {
        pageUrl: message.data.pageUrl,
        pageTitle: message.data.pageTitle
      });

      OneSignal._installNativePromptPermissionChangedHook();
      if (options.continuePressed) {
        OneSignal.setSubscription(true);
      }

      // TODO: Get parent URL so we can retrieve the right NotificationOpened
      Database.get("NotificationOpened", OneSignal._initOptions.pageUrl)
        .then(notificationOpenedResult => {
          if (notificationOpenedResult) {
            Database.remove("NotificationOpened", OneSignal._initOptions.pageUrl);
            OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, notificationOpenedResult.data);
          }
        });

      // TODO: Original code fires the onesignalinitpageready event here, we may have to move it to another location

      OneSignal._initSaveState();
      OneSignal._storeInitialValues();
      if (location.search.indexOf("?session=true") == 0)
        return;

      // TODO: Fix state replication bug for HTTP
      //navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
      //  log.info('Service worker now active:', serviceWorkerRegistration);
      //  OneSignal._establishServiceWorkerChannel(serviceWorkerRegistration);
      //  OneSignal._subscribeForPush(serviceWorkerRegistration);
      //})
      //  .catch(function (e) {
      //    log.error(e);
      //  });
      message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    });
  },

  _initPopup: function() {
    OneSignal._initOptions = {};
    OneSignal.initialized = true;
    // Do not register OneSignalSDKUpdaterWorker.js for HTTP popup sites; the file does not exist
    navigator.serviceWorker.register(OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
  },

  _getSubdomainState: function (callback) {
    var state = {};

    Promise.all([Database.get('Ids', 'userId'),
      Database.get('Ids', 'registrationId'),
      Database.get('Options', 'subscription')])
      .then(function _internalInit_GotAppRegistrationSubscriptionIds(result) {
        var userIdResult = result[0];
        var registrationIdResult = result[1];
        var subscriptionResult = result[2];

        callback({
          userId: userIdResult ? userIdResult.id : null,
          registrationId: registrationIdResult ? registrationIdResult.id : null,
          notifPermssion: Notification.permission,
          subscriptionSet: subscriptionResult ? subscriptionResult.value : null,
          isPushEnabled: ( Notification.permission == "granted"
          && userIdResult
          && registrationIdResult
          && ((subscriptionResult && subscriptionResult.value) || subscriptionResult == null))
        });
      })
      .catch(function (e) {
        log.error(e);
      });
    ;
  },

  _initSaveState: function () {
    OneSignal._app_id = OneSignal._initOptions.appId;
    Database.put("Ids", {type: "appId", id: OneSignal._app_id});
    Database.put("Options", {key: "pageTitle", value: document.title});
  },

  _supportsDirectPermission: function () {
    return isSupportedSafari()
      || location.protocol == 'https:'
      || location.host.indexOf("localhost") == 0
      || location.host.indexOf("127.0.0.1") == 0;
  },

  _getPromptOptionsQueryString: function () {
    var message_localization_opts = OneSignal._initOptions['promptOptions'];
    var message_localization_opts_str = '';
    if (message_localization_opts) {
      var message_localization_params = ['actionMessage',
        'exampleNotificationTitleDesktop',
        'exampleNotificationMessageDesktop',
        'exampleNotificationTitleMobile',
        'exampleNotificationMessageMobile',
        'exampleNotificationCaption',
        'acceptButtonText',
        'cancelButtonText',
        'showCredit'];
      for (var i = 0; i < message_localization_params.length; i++) {
        var key = message_localization_params[i];
        var value = message_localization_opts[key];
        var encoded_value = encodeURIComponent(value);
        if (value || value === false || value === '') {
          message_localization_opts_str += '&' + key + '=' + encoded_value;
        }
      }
    }
    return message_localization_opts_str;
  },

  _sessionInit: function (options) {
    log.debug(`Called %c_sessionInit(${JSON.stringify(options)})`, getConsoleStyle('code'));
    OneSignal._initSaveState();

    var hostPageProtocol = location.origin.match(/^http(s|):\/\/(www\.|)/)[0];

    // If HTTP or using subdomain mode
    if (OneSignal._isUsingSubscriptionWorkaround()) {
      if (options.fromRegisterFor) {
        var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
        var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

        var thisWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        var thisHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
        var childWidth = OneSignal._windowWidth;
        var childHeight = OneSignal._windowHeight;

        var left = ((thisWidth / 2) - (childWidth / 2)) + dualScreenLeft;
        var top = ((thisHeight / 2) - (childHeight / 2)) + dualScreenTop;

        log.debug('Opening popup window.');
        var message_localization_opts_str = OneSignal._getPromptOptionsQueryString();

        let sendToOrigin = `https://${OneSignal._initOptions.subdomainName}.onesignal.com`;
        if (Environment.isDev()) {
          sendToOrigin = DEV_FRAME_HOST;
        }
        let receiveFromOrigin = sendToOrigin;
        let handshakeNonce = OneSignal._sessionNonce;
        var childWindow = window.open(`${OneSignal._initOneSignalHttp}?${message_localization_opts_str}&hostPageProtocol=${hostPageProtocol}&sessionNonce=${OneSignal._sessionNonce}`, "_blank", `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`);
        OneSignal.popupPostmam = new Postmam(childWindow, sendToOrigin, receiveFromOrigin, handshakeNonce);
        OneSignal.popupPostmam.startPostMessageReceive();
        OneSignal.popupPostmam.on(OneSignal.POSTMAM_COMMANDS.POPUP_IDS_AVAILBLE, message => {
          log.info('ids available from popup');
          let { userId, registrationId } = message.data;
          Promise.all([
            Database.put('Ids', {type: 'userId', id: userId}),
            Database.put('Ids', {type: 'registrationId', id: registrationId})
          ])
          .then(() => {
            OneSignal._checkTrigger_eventSubscriptionChanged();
          });
        });

        if (childWindow)
          childWindow.focus();
      }
      else {
        OneSignal._addSessionIframe(hostPageProtocol);
      }
    }
    else {
      if (isSupportedSafari()) {
        if (OneSignal._initOptions.safari_web_id) {
          OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id)
            .then(permission => {
              window.safari.pushNotification.requestPermission(
                OneSignal._API_URL + 'safari',
                OneSignal._initOptions.safari_web_id,
                {app_id: OneSignal._app_id},
                function (data) {
                  log.info('Safari requestPermission() callback:', data);
                  var notificationPermissionAfterRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
                  if (data.deviceToken) {
                    OneSignal._registerWithOneSignal(OneSignal._app_id, data.deviceToken.toLowerCase(), 7);
                  }
                  else {
                    sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
                  }
                  OneSignal._triggerEvent_nativePromptPermissionChanged(permission);
                }
              );
            })
            .catch(e => log.error(e));
        }
      }
      else if (options.modalPrompt && options.fromRegisterFor) { // If HTTPS - Show modal
        if (!isPushNotificationsSupported()) {
          log.warn('An attempt was made to open the HTTPS modal permission prompt, but push notifications are not supported on this browser. Opening canceled.');
          return;
        }
        OneSignal.isPushNotificationsEnabled(function (pushEnabled) {
          var element = document.createElement('div');
          element.setAttribute('id', 'OneSignal-iframe-modal');
          element.innerHTML = '<div id="notif-permission" style="background: rgba(0, 0, 0, 0.7); position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 3000000000; display: block"></div>';
          document.body.appendChild(element);

          var iframeStyle = document.createElement('style');
          iframeStyle.innerHTML = "@media (max-width: 560px) { .OneSignal-permission-iframe { width: 100%; height: 100%;} }"
            + "@media (min-width: 561px) { .OneSignal-permission-iframe { top: 50%; left: 50%; margin-left: -275px; margin-top: -248px;} }";
          document.getElementsByTagName('head')[0].appendChild(iframeStyle);

          var message_localization_opts_str = OneSignal._getPromptOptionsQueryString();

          var iframeNode = document.createElement("iframe");
          iframeNode.className = "OneSignal-permission-iframe"
          iframeNode.style.cssText = "background: rgba(255, 255, 255, 1); position: fixed;";
          iframeNode.src = OneSignal._initOneSignalHttp
            + '?'
            + message_localization_opts_str
            + '&id=' + OneSignal._app_id
            + '&httpsPrompt=true'
            + '&pushEnabled=' + pushEnabled
            + '&permissionBlocked=' + (typeof Notification === "undefined" || Notification.permission == "denied")
            + '&hostPageProtocol=' + hostPageProtocol;
          iframeNode.setAttribute('frameborder', '0');
          iframeNode.width = OneSignal._windowWidth.toString();
          iframeNode.height = OneSignal._windowHeight.toString();

          log.debug('Opening HTTPS modal prompt.');
          document.getElementById("notif-permission").appendChild(iframeNode);
        });
      }
      else if ('serviceWorker' in navigator) // If HTTPS - Show native prompt
        OneSignal._registerForW3CPush(options);
      else
        log.debug('Service workers are not supported in this browser.');

      Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
    }
  },

  /*
    Updates an existing OneSignal-only service worker if an older version exists. Does not install a new service worker if none is available or overwrite other service workers.
    This also differs from the original update code we have below in that we do not subscribe for push after.
    Because we're overwriting a service worker, the push token seems to "carry over" (this is good), whereas if we unregistered and registered a new service worker, the push token would be lost (this is bad).
    By not subscribing for push after we register the SW, we don't have to care if notification permissions are granted or not, since users will not be prompted; this update process will be transparent.
    This way we can update the service worker even for autoRegister: false users.
   */
  _updateServiceWorker: function() {

    let updateCheckAlreadyRan = sessionStorage.getItem('onesignal-update-serviceworker-completed');
    if (!navigator.serviceWorker || !Environment.isHost() || location.protocol !== 'https:' || updateCheckAlreadyRan == "true") {
      log.warn('Skipping _updateServiceWorker().');
      return;
    }

    try {
      sessionStorage.setItem('onesignal-update-serviceworker-completed', "true");
    } catch (e) { log.error(e); }

    return navigator.serviceWorker.getRegistration().then(function (serviceWorkerRegistration) {
      var sw_path = "";

      if (OneSignal._initOptions.path)
        sw_path = OneSignal._initOptions.path;

      if (serviceWorkerRegistration && serviceWorkerRegistration.active) {
        // An existing service worker
        log.debug('_updateServiceWorker():', 'Existing service worker');
        let previousWorkerUrl = serviceWorkerRegistration.active.scriptURL;
        if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_PATH)) {
          // OneSignalSDKWorker.js was installed
          log.debug('_updateServiceWorker():', 'OneSignalSDKWorker is active');
          return Database.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
            .then(function (versionResult) {
              // Get version of installed worker saved to IndexedDB
              if (versionResult) {
                // If a version exists
                log.debug('_updateServiceWorker():', 'Database version exists:', versionResult);
                if (versionResult.id != OneSignal._VERSION) {
                  // If there is a different version
                  log.debug('_updateServiceWorker():', 'New version exists:', OneSignal._VERSION);
                  log.info(`Installing new service worker (${versionResult.id} -> ${OneSignal._VERSION})`);
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
            .then(function (versionResult) {
              // Get version of installed worker saved to IndexedDB
              if (versionResult) {
                // If a version exists
                log.debug('_updateServiceWorker():', 'Database version exists:', versionResult);
                if (versionResult.id != OneSignal._VERSION) {
                  // If there is a different version
                  log.debug('_updateServiceWorker():', 'New version exists:', OneSignal._VERSION);
                  log.info(`Installing new service worker (${versionResult.id} -> ${OneSignal._VERSION})`);
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
  },

  _registerForW3CPush: function (options) {
    log.debug(`Called %c_registerForW3CPush(${JSON.stringify(options)})`, getConsoleStyle('code'));
    return Database.get('Ids', 'registrationId')
      .then(function _registerForW3CPush_GotRegistrationId(registrationIdResult) {
        if (!registrationIdResult || !options.fromRegisterFor || Notification.permission != "granted" || navigator.serviceWorker.controller == null) {
          navigator.serviceWorker.getRegistration().then(function (serviceWorkerRegistration) {
            var sw_path = "";

            if (OneSignal._initOptions.path)
              sw_path = OneSignal._initOptions.path;

            if (typeof serviceWorkerRegistration === "undefined") // Nothing registered, very first run
              OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
            else {
              if (serviceWorkerRegistration.active) {
                let previousWorkerUrl = serviceWorkerRegistration.active.scriptURL;
                if (contains(previousWorkerUrl, sw_path + OneSignal.SERVICE_WORKER_PATH)) {
                  // OneSignalSDKWorker.js was installed
                  Database.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
                    .then(function (versionResult) {
                      if (versionResult) {
                        if (versionResult.id != OneSignal._VERSION) {
                          log.info(`Installing new service worker (${versionResult.id} -> ${OneSignal._VERSION})`);
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
                    .then(function (versionResult) {
                      if (versionResult) {
                        if (versionResult.id != OneSignal._VERSION) {
                          log.info(`Installing new service worker (${versionResult.id} -> ${OneSignal._VERSION})`);
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
  },

  _registerServiceWorker: function(full_sw_and_path) {
    log.debug(`Called %c_registerServiceWorker(${JSON.stringify(full_sw_and_path, null, 4)})`, getConsoleStyle('code'));
    navigator.serviceWorker.register(full_sw_and_path, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
  },

  _addSessionIframe: function (hostPageProtocol) {
    log.debug(`Called %c_addSessionIframe(${JSON.stringify(hostPageProtocol, null, 4)})`, getConsoleStyle('code'));

    var node = document.createElement("iframe");
    node.style.display = "none";
    node.src = OneSignal._initOneSignalHttp + "Iframe";
    if (sessionStorage.getItem("ONE_SIGNAL_SESSION"))
      node.src += "?session=true"
        + "&hostPageProtocol=" + hostPageProtocol;
    else
      node.src += "?hostPageProtocol=" + hostPageProtocol;
    node.src += `&sessionNonce=${OneSignal._sessionNonce}`;
    document.body.appendChild(node);
    node.onload = () => {
      let sendToOrigin = `https://${OneSignal._initOptions.subdomainName}.onesignal.com`;
      if (Environment.isDev()) {
        sendToOrigin = DEV_FRAME_HOST;
      }
      let receiveFromOrigin = sendToOrigin;
      let handshakeNonce = OneSignal._sessionNonce;
      OneSignal.iframePostmam = new Postmam(node.contentWindow, sendToOrigin, receiveFromOrigin, handshakeNonce);
      OneSignal.iframePostmam.connect();
      OneSignal.iframePostmam.on('connect', e => {
        log.warn(`(${Environment.getEnv()}) Fired Postmam connect event!`);
        Promise.all([
          Database.get('Options', 'defaultUrl'),
          Database.get('Options', 'defaultTitle')
        ])
          .then(results => {
            let defaultUrlResult = results[0];
            let defaultTitleResult = results[1];

            if (!defaultUrlResult) {
              var defaultUrl = location.href;
            } else {
              var defaultUrl = defaultUrlResult.value;
            }

            if (!defaultTitleResult) {
              var defaultTitle = document.title;
            } else {
              var defaultTitle = defaultTitleResult.value;
            }

            OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, {
              hostInitOptions: OneSignal._initOptions,
              pageUrl: defaultUrl,
              pageTitle: defaultTitle,
            }, reply => {
              if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
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
        OneSignal._triggerEvent_customPromptClicked('granted');
        return false;
      });
      OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_REJECTED, message => {
        let elem = document.getElementById('OneSignal-iframe-modal');
        elem.parentNode.removeChild(elem);
        OneSignal._triggerEvent_customPromptClicked('denied');
        return false;
      });
      OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.POPUP_ACCEPTED, message => {
        OneSignal._triggerEvent_customPromptClicked('granted');
        return false;
      });
      OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.POPUP_REJECTED, message => {
        OneSignal._triggerEvent_customPromptClicked('denied');
        return false;
      });
      OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, message => {
        let newRemoteNotificationPermission = message.data;
        OneSignal._triggerEvent_nativePromptPermissionChanged(null, newRemoteNotificationPermission);
        return false;
      });
      OneSignal.iframePostmam.on(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, message => {
        OneSignal._fireTransmittedNotificationClickedCallbacks(event,data);
        return false;
      });
    };
    OneSignal._sessionIframeAdded = true;
  },

  _registerError: function (err) {
    log.error("ServiceWorker registration", err);
  },

  _enableNotifications: function (existingServiceWorkerRegistration) { // is ServiceWorkerRegistration type
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
      OneSignal._establishServiceWorkerChannel(serviceWorkerRegistration);
      OneSignal._subscribeForPush(serviceWorkerRegistration);
    })
    .catch(function (e) {
      log.error(e);
    });
  },

  /**
   * Returns a promise that resolves to the browser's current notification permission as 'default', 'granted', or 'denied'.
   * @param callback A callback function that will be called when the browser's current notification permission has been obtained, with one of 'default', 'granted', or 'denied'.
   */
  getNotificationPermission: function (onComplete) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    let safariWebId = null;
    if (OneSignal._initOptions) {
      safariWebId = OneSignal._initOptions.safari_web_id;
    }
    let result = OneSignal._getNotificationPermission(safariWebId);
    return result.then((permission) => {
      if (onComplete) {
        onComplete(permission);
      }
      return permission;
    });
  },

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
*        - We are already in popup or iFrame mode
   */
  _isUsingSubscriptionWorkaround() {
    if (!OneSignal._initOptions) {
      throw new Error('This method cannot be called until init() has been called.')
    }
    if (Browser.safari) {
      return false;
    }
    if (Environment.isPopup() || Environment.isIframe()) {
      return false;
    }
    return OneSignal._initOptions.subdomainName ||
           location.protocol === 'http:';
  },

  /*
   Returns the current browser-agnostic notification permission as "default", "granted", "denied".
   safariWebId: Used only to get the current notification permission state in Safari (required as part of the spec).
   */
  _getNotificationPermission: function (safariWebId) {
    return new Promise((resolve, reject) => {
      function __getNotificationPermission() {
        if (OneSignal._isUsingSubscriptionWorkaround()) {
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
        OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED, __getNotificationPermission);
      } else {
        __getNotificationPermission();
      }
    });
  },

  _triggerEvent_customPromptClicked: function (clickResult) {
    var recentPermissions = LimitStore.put('prompt.custom.permission', clickResult);
    Event.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
      result: clickResult
    });
  },

  _triggerEvent_nativePromptPermissionChanged: function (from, to, updateIfIdentical = false) {
    if (to === undefined) {
      var promise = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id).then((permission) => {
        to = permission;
      })
        .catch(e => log.error(e));
    } else {
      var promise = Promise.resolve();
    }
    promise.then(() => {
      if (from !== to || updateIfIdentical) {
        var recentPermissions = LimitStore.put('notification.permission', to);
        Event.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, {
          from: from,
          to: to
        });
      }
    });
  },

  _triggerEvent_subscriptionChanged: function (to) {
    Event.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
  },

  _triggerEvent_dbValueRetrieved: function (value) {
    Event.trigger(OneSignal.EVENTS.RETRIEVED, value);
  },

  _triggerEvent_dbValueSet: function (value) {
    Event.trigger(OneSignal.EVENTS.SET, value);
  },

  _triggerEvent_internalSubscriptionSet: function (value) {
    Event.trigger(OneSignal.EVENTS.INTERNAL_SUBSCRIPTIONSET, value);
  },

  _subscribeForPush: function (serviceWorkerRegistration) {
    var notificationPermissionBeforeRequest = '';

    OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id).then((permission) => {
        notificationPermissionBeforeRequest = permission;
      })
      .then(() => {
        return serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true});
      })
      .then(function (subscription) {
        sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);

        Database.get('Ids', 'appId')
          .then(function _subscribeForPush_GotAppId(appIdResult) {
            var appId = appIdResult.id;
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

            OneSignal._registerWithOneSignal(appId, registrationId, isSupportedFireFox() ? 8 : 5);
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
        OneSignal._getNotificationPermission().then((permission) => {
          if (permission === 'default') {
            // The user clicked 'X'
            OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest, permission, true);
          }

          if (!OneSignal._usingNativePermissionHook)
            OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest, permission);

          if (opener && OneSignal._thisIsThePopup)
            window.close();
        })
        .catch(e => log.error(e));
      });
  },

  sendTag: function (key, value, callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    let tag = {};
    tag[key] = value;
    return OneSignal.sendTags(tag, callback);
  },

  sendTags: function (tags, callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    // Our backend considers false as removing a tag, so this allows false to be stored as a value
    if (tags) {
      Object.keys(tags).forEach(key => {
        if (tags[key] === false) {
          tags[key] = "false";
        }
      });
    }

    return new Promise((resolve, reject) => {

      var futureSendTagResolveFn = null;

      return Database.get('Ids', 'userId')
        .then(userIdResult => {
          if (userIdResult) {
            return apiCall("players/" + userIdResult.id, "PUT", {
              app_id: OneSignal._app_id,
              tags: tags
            });
          }
          else {
            if (!OneSignal._futureSendTags) {
              OneSignal._futureSendTags = {};
            }
            objectAssign(OneSignal._futureSendTags, tags);
            futureSendTagResolveFn = (currentTags) => {
              if (callback) {
                callback(currentTags);
              }
              resolve(currentTags);
            };
            OneSignal._futureSendTagsPromiseResolves.push(futureSendTagResolveFn.bind(null, tags));
          }
        })
        .then(() => {
          if (futureSendTagResolveFn == null) {
            if (callback) {
              callback(tags);
            }
            resolve(tags);
          }
        })
        .catch(e => {
          log.error('sendTags:', e);
          reject(e);
        });
    });
  },

  deleteTag: function (tag) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    if (typeof tag === 'string' || tag instanceof String) {
      return OneSignal.deleteTags([tag]);
    } else {
      return Promise.reject(new Error(`OneSignal: Invalid tag '${tag}' to delete. You must pass in a string.`));
    }
  },

  deleteTags: function (tags, callback) {
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
  },

  addListenerForNotificationOpened: function (callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    OneSignal._notificationOpenedCallbacks.push(callback);
    OneSignal._fireSavedNotificationClickedCallbacks();
  },

  _fireTransmittedNotificationClickedCallbacks: function(data) {
    for (let notificationOpenedCallback of OneSignal._notificationOpenedCallbacks) {
      notificationOpenedCallback(data);
    }
  },

  _fireSavedNotificationClickedCallbacks: function() {
    Database.get("NotificationOpened", document.URL)
      .then(notificationOpenedResult => {
        if (notificationOpenedResult) {
          Database.remove("NotificationOpened", document.URL);
          let notificationData = notificationOpenedResult.data;
          let timestamp = notificationOpenedResult.timestamp;
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
  },

  getIdsAvailable: function (callback) {
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
        let userIdResult = results[0];
        let registrationIdResult = results[1];

        if (!registrationIdResult) {
          var registrationId = null;
        } else {
          var registrationId = registrationIdResult.id;
        }

        if (!userIdResult) {
          var userId = null;
        } else {
          var userId = userIdResult.id;
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
  },

  getTags: function (callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return Database.get('Ids', 'userId')
      .then(function (userIdResult) {
        if (userIdResult) {
          return apiCall("players/" + userIdResult.id, 'GET', null);
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
      .catch(e => { logError(e); return Promise.reject(e) });
  },

  isServiceWorkerActive: function(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    return new Promise((resolve, reject) => {
      if (OneSignal._isUsingSubscriptionWorkaround()) {
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
  },

  /**
   * Returns a promise that resolves to true if all required conditions for push messaging are met; otherwise resolves to false.
   * @param callback A callback function that will be called when the current subscription status has been obtained.
   */
  isPushNotificationsEnabled: function (callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      function __isPushNotificationsEnabled() {
        Promise.all([
          OneSignal.getUserId(),
          OneSignal.getRegistrationId(),
          OneSignal.getNotificationPermission(),
          OneSignal._getSubscription(),
          OneSignal.isServiceWorkerActive()
        ])
          .then(results => {
            let [userId, registrationId, notificationPermission, optIn, serviceWorkerActive] = results;
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
        OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED, () => __isPushNotificationsEnabled());
      } else {
        __isPushNotificationsEnabled();
      }
    });
  },

  _getNotificationTypes: function (callback) {
    return new Promise((resolve, reject) => {
      OneSignal._getSubscription().then(currentSubscription => {
        let notificationType = currentSubscription ? 1 : -2;
        resolve(notificationType);
        callback(notificationType);
      });
    });
  },

  _getAppId: function() {
    return OneSignal._app_id;
  },

  setSubscription: function (newSubscription) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Get the current subscription and user ID; will correctly retrieve values from remote iFrame IndexedDB if necessary
      Promise.all([
        OneSignal._getSubscription(),
        OneSignal.getUserId()
      ]).then(results => {
        let subscription = results[0];
        let userId = results[1];

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
        if (OneSignal._isUsingSubscriptionWorkaround()) {
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
          .then(() => {
            return apiCall("players/" + userId, "PUT", {
              app_id: OneSignal._getAppId(),
              notification_types: newSubscription ? 1 : -2
            });
          })
          .then(() => {
            OneSignal._triggerEvent_internalSubscriptionSet(newSubscription);
            resolve(true);
          })
          .catch(e => {
            log.error(e);
            reject(false);
          })
      });
    });
  },

  /**
   * Returns a promise that resolves to false if setSubscription(false) is "in effect". Otherwise returns true.
   * This means a return value of true does not mean the user is subscribed, only that the user did not call setSubcription(false).
   * @private
   * @returns {Promise}
   */
  isOptedOut: function(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return OneSignal._getSubscription().then(manualSubscriptionStatus => {
      if (callback) {
        callback(!manualSubscriptionStatus);
      }
      return !manualSubscriptionStatus;
    });
  },

  /**
   * Returns a promise that resolves once the manual subscription override has been set.
   * @private
   * @returns {Promise}
   */
  optOut: function(doOptOut, callback) {
    if (doOptOut !== false || doOptOut !== true) {
      throw new Error(`Invalid parameter '${doOptOut}' passed to OneSignal.optOut(). You must specify true or false.`);
    }
    return OneSignal.setSubscription(doOptOut).then(() => {
        if (callback) {
          callback();
        }
      }
    );
  },

  /**
   * Returns a promise that resolves to the stored OneSignal user ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal user ID.
   * @returns {Promise.<T>}
   */
  getUserId: function(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (OneSignal._isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{table: 'Ids', key: 'userId'}], reply => {
          let result = reply.data[0];
          if (result) {
            let userId = result.id;
            if (callback) {
              callback(userId)
            }
            resolve(userId);
          } else {
            if (callback) {
              callback(null)
            }
            resolve(null);
          }
        });
      } else {
        Database.get('Ids', 'userId')
          .then(userIdResult => {
            if (userIdResult) {
              let userId = userIdResult.id;
              if (callback) {
                callback(userId)
              }
              resolve(userId);
            } else {
              if (callback) {
                callback(null);
              }
              resolve(null);
            }
          })
          .catch(e => log.error(e));
      }
    });
  },

  /**
   * Returns a promise that resolves to the stored OneSignal registration ID if one is set; otherwise null.
   * @param callback A function accepting one parameter for the OneSignal registration ID.
   * @returns {Promise.<T>}
   */
  getRegistrationId: function(callback) {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (OneSignal._isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{table: 'Ids', key: 'registrationId'}], reply => {
          let result = reply.data[0];
          if (result) {
            let userId = result.id;
            if (callback) {
              callback(userId)
            }
            resolve(userId);
          } else {
            if (callback) {
              callback(null)
            }
            resolve(null);
          }
        });
      } else {
        Database.get('Ids', 'registrationId')
          .then(registrationIdResult => {
            if (registrationIdResult) {
              let registrationId = registrationIdResult.id;
              if (callback) {
                callback(registrationId)
              }
              resolve(registrationId);
            } else {
              if (callback) {
                callback(null);
              }
              resolve(null);
            }
          })
          .catch(e => log.error(e));
      }
    });
  },

  /**
   * Returns a promise that resolves to false if setSubscription(false) is "in effect". Otherwise returns true.
   * This means a return value of true does not mean the user is subscribed, only that the user did not call setSubcription(false).
   * @private
   * @returns {Promise}
   */
  _getSubscription: function () {
    if (!isPushNotificationsSupportedAndWarn()) {
      return;
    }

    log.debug('Called %c_getSubscription()', getConsoleStyle('code'), `(from ${Environment.getEnv()})`);

    return new Promise((resolve, reject) => {
      if (OneSignal._isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{table: 'Options', key: 'subscription'}], reply => {
          let subscriptionResult = reply.data[0];
          if (subscriptionResult) {
            resolve(subscriptionResult.value);
          } else {
            // No subscription value in remote database; return true as the default
            resolve(true);
          }
        });
      } else {
        Database.get('Options', 'subscription')
          .then(subscriptionResult => {
            if (subscriptionResult) {
              resolve(subscriptionResult.value);
            } else {
              // No subscription value in local database; return true as the default
              resolve(true);
            }
          })
          .catch(e => log.error(e));
      }
    });
  },

  _safePostMessage: function (creator, data, targetOrigin, receiver) {
    var tOrigin = targetOrigin.toLowerCase();

    // If we are trying to target a http site allow the https version. (w/ or w/o 'wwww.' too)
    if (tOrigin.startsWith("http://")) {
      var queryDict = {};
      location.search.substr(1).split("&").forEach(function (item) {
        queryDict[item.split("=")[0]] = item.split("=")[1]
      });
      var validPreURLRegex = /^http(s|):\/\/(www\.|)/;
      tOrigin = tOrigin.replace(validPreURLRegex, queryDict["hostPageProtocol"]);
    }

    if (!data.from) {
      data['from'] = Environment.getEnv();
    }

    if (receiver)
      creator.postMessage(data, tOrigin, receiver);
    else
      creator.postMessage(data, tOrigin);
  },

  _process_pushes: function (array) {
    for (var i = 0; i < array.length; i++)
      OneSignal.push(array[i]);
  },

  push: function (item) {
    if (typeof(item) == "function")
      item();
    else {
      var functionName = item.shift();
      OneSignal[functionName].apply(null, item);
    }
  }
};

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