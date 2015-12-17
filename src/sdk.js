import { DEV_HOST, PROD_HOST, HOST_URL } from './vars.js';
import Environment from './environment.js'
import './string.js'
import { sendNotification } from './api.js';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import "./events-polyfill.js";
import Event from "./events.js";
import Bell from "./bell.js";
import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle } from './utils.js';

var OneSignal = {
  _VERSION: 109018,
  _HOST_URL: HOST_URL,
  _app_id: null,
  _tagsToSendOnRegister: null,
  _notificationOpened_callback: null,
  _idsAvailable_callback: [],
  _defaultLaunchURL: null,
  _initOptions: null,
  _httpRegistration: false,
  _main_page_port: null,
  _isNotificationEnabledCallback: [],
  _subscriptionSet: true,
  _initOneSignalHttp: null,
  _sessionIframeAdded: false,
  _useHttpMode: null,
  _windowWidth: 550,
  _windowHeight: 480,
  _isNewVisitor: false,
  _isInitialized: false,
  bell: null,
  store: LimitStore,
  environment: Environment,
  LOGGING: __DEV__,
  log: log,
  SERVICE_WORKER_UPDATER_PATH: "OneSignalSDKUpdaterWorker.js",
  SERVICE_WORKER_PATH: "OneSignalSDKWorker.js",
  SERVICE_WORKER_PARAM: {},

  /* Event Definitions */
  EVENTS: {
    CUSTOM_PROMPT_CLICKED: 'onesignal.prompt.custom.clicked',
    NATIVE_PROMPT_PERMISSIONCHANGED: 'onesignal.prompt.native.permissionchanged',
    SUBSCRIPTION_CHANGED: 'onesignal.subscription.changed',
    WELCOME_NOTIFICATION_SENT: 'onesignal.actions.welcomenotificationsent',
    DB_VALUE_RETRIEVED: 'onesignal.db.valueretrieved',
    DB_VALUE_SET: 'onesignal.db.valueset',
    INTERNAL_SUBSCRIPTIONSET: 'onesignal.internal.subscriptionset',
    SDK_INITIALIZED: 'onesignal.sdk.initialized'
  },

  _ensureDbInstance: function () {
    return new Promise(function (resolve, reject) {
      if (OneSignal._oneSignal_db) {
        resolve(OneSignal._oneSignal_db);
      }
      else {
        var request = indexedDB.open("ONE_SIGNAL_SDK_DB", 1);
        request.onsuccess = function (event) {
          var database = event.target.result;
          OneSignal._oneSignal_db = database;
          resolve(database);
        };
        request.onerror = function (event) {
          log.error('Unable to open IndexedDB.', event);
          reject(event);
        };

        request.onupgradeneeded = function (event) {
          log.info('The OneSignal SDK is rebuilding its IndexedDB schema from a clean slate.');
          var db = event.target.result;
          db.createObjectStore("Ids", {keyPath: "type"});
          db.createObjectStore("NotificationOpened", {keyPath: "url"});
          db.createObjectStore("Options", {keyPath: "key"});
        };
      }
    });
  },

  _getDbValue: function (table, key) {
    return new Promise(function (resolve, reject) {
      OneSignal._ensureDbInstance()
        .then(function (database) {
          var request = database.transaction(table).objectStore(table).get(key);
          request.onsuccess = function (event) {
            if (request.result)
              OneSignal._triggerEvent_dbValueRetrieved(request.result);
            resolve(request.result);
          };
          request.onerror = function (event) {
            reject(request.errorCode);
          };
        })
        .catch(function (e) {
          log.error(e);
        });
      ;
    });
  },

  _getDbValues: function (table) {
    return new Promise(function (resolve, reject) {
      OneSignal._ensureDbInstance()
        .then(function (database) {
          var jsonResult = {};
          var cursor = database.transaction(table).objectStore(table).openCursor();
          cursor.onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
              OneSignal._triggerEvent_dbValueRetrieved(cursor);
              jsonResult[cursor.key] = cursor.value.value;
              cursor.continue();
            }
            else
              resolve(jsonResult);
          };
          cursor.onerror = function (event) {
            reject(cursor.errorCode);
          };
        })
        .catch(function (e) {
          log.error(e);
        });
    });
  },

  _putDbValue: function (table, value) {
    return new Promise(function (resolve, reject) {
      OneSignal._ensureDbInstance()
        .then(function (database) {
          database.transaction([table], "readwrite").objectStore(table).put(value);
          OneSignal._triggerEvent_dbValueSet(value);
          resolve(value);
        })
        .catch(function (e) {
          log.error(e);
        });
    });
  },

  _deleteDbValue: function (table, key) {
    return new Promise(function (resolve, reject) {
      OneSignal._ensureDbInstance()
        .then(function (database) {
          database.transaction([table], "readwrite").objectStore(table).delete(key);
          resolve(key);
        })
        .catch(function (e) {
          log.error(e);
        });
      ;
    });
  },

  _sendToOneSignalApi: function (url, action, inData, callback, failedCallback) {
    log.debug(`Calling ${action} ${OneSignal._HOST_URL + url} with data:`, inData);
    var contents = {
      method: action,
      //mode: 'no-cors', // no-cors is disabled for non-serviceworker.
    };

    if (inData) {
      contents.headers = {"Content-type": "application/json;charset=UTF-8"};
      contents.body = JSON.stringify(inData);
    }

    fetch(OneSignal._HOST_URL + url, contents)
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
      OneSignal._getDbValue('Ids', 'userId')
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

  _getBrowserName: function () {
    if (navigator.appVersion.match(/Chrome\/(.*?) /))
      return "Chrome";
    if (navigator.appVersion.match("Version/(.*) (Safari)"))
      return "Safari";
    if (navigator.userAgent.match(/Firefox\/([0-9]{2,}\.[0-9]{1,})/))
      return "Firefox";

    return "";
  },

  _registerWithOneSignal: function (appId, registrationId, deviceType) {

    OneSignal._getDbValue('Ids', 'userId')
      .then(function _registerWithOneSignal_GotUserId(userIdResult) {
        OneSignal._getNotificationTypes(function (notif_types) {
          var requestUrl = 'players';

          var jsonData = {
            app_id: appId,
            device_type: deviceType,
            language: OneSignal._getLanguage(),
            timezone: new Date().getTimezoneOffset() * -60,
            device_model: navigator.platform + " " + OneSignal._getBrowserName(),
            device_os: (navigator.appVersion.match(/Chrome\/(.*?) /) || navigator.appVersion.match("Version/(.*) Safari") || navigator.userAgent.match(/Firefox\/([0-9]{2,}\.[0-9]{1,})/))[1],
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
            OneSignal._putDbValue("Ids", {type: "registrationId", id: registrationId});
          }

          OneSignal._sendToOneSignalApi(requestUrl, 'POST', jsonData,
            function registeredCallback(responseJSON) {
              sessionStorage.setItem("ONE_SIGNAL_SESSION", true);

              if (responseJSON.id) {
                OneSignal._putDbValue("Ids", {type: "userId", id: responseJSON.id});
                OneSignal._sendUnsentTags();
              }

              OneSignal._getPlayerId(responseJSON.id, function (userId) {
                if (OneSignal._idsAvailable_callback.length > 0) {
                  while (OneSignal._idsAvailable_callback.length > 0) {
                    var curr_callback = OneSignal._idsAvailable_callback.pop();
                    curr_callback({userId: userId, registrationId: registrationId});
                  }
                }

                if (OneSignal._httpRegistration) {
                  // 12/16/2015 -- At this point, the user has just clicked Allow on the HTTP prompt!!
                  log.debug("Sending player Id and registrationId back to host page");
                  log.debug(OneSignal._initOptions);
                  var creator = opener || parent;
                  OneSignal._safePostMessage(creator, {
                    idsAvailable: {
                      userId: userId,
                      registrationId: registrationId
                    },
                    from: Environment.getEnv()
                  }, OneSignal._initOptions.origin, null);
                  OneSignal._safePostMessage(creator, {
                    httpNativePromptPermissionChanged: OneSignal._getNotificationPermission(),
                    from: Environment.getEnv()
                  }, OneSignal._initOptions.origin, null);

                  if (opener)
                    window.close();
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
    if (OneSignal._tagsToSendOnRegister) {
      OneSignal.sendTags(OneSignal._tagsToSendOnRegister);
      OneSignal._tagsToSendOnRegister = null;
    }
  },

  setDefaultNotificationUrl: function (url) {
    OneSignal._putDbValue("Options", {key: "defaultUrl", value: url});
  },

  setDefaultIcon: function (icon) {
    OneSignal._putDbValue("Options", {key: "defaultIcon", value: icon});
  },

  setDefaultTitle: function (title) {
    OneSignal._putDbValue("Options", {key: "defaultTitle", value: title});
  },

  _visibilitychange: function () {
    if (document.visibilityState == "visible") {
      document.removeEventListener("visibilitychange", OneSignal._visibilitychange);
      OneSignal._sessionInit({});
    }
  },

  onCustomPromptClicked: function (event) {
    OneSignal._checkTrigger_eventSubscriptionChanged();
  },

  onNativePromptChanged: function (event) {
    OneSignal._checkTrigger_eventSubscriptionChanged();
  },

  _onSubscriptionChanged: function (event) {
    if (OneSignal._isNewVisitor && event.detail === true) {
      OneSignal._getDbValue('Ids', 'userId')
        .then(function (result) {
          let welcome_notification_opts = OneSignal._initOptions['welcomeNotification'];
          let welcome_notification_disabled = (welcome_notification_opts !== undefined && welcome_notification_opts['disable'] === true);
          let title = (welcome_notification_opts !== undefined && welcome_notification_opts['title'] !== undefined && welcome_notification_opts['title'] !== null) ? welcome_notification_opts['title'] : '';
          let message = (welcome_notification_opts !== undefined && welcome_notification_opts['message'] !== undefined && welcome_notification_opts['message'] !== null && welcome_notification_opts['message'].length > 0) ? welcome_notification_opts['message'] : 'Thanks for subscribing!';
          if (!welcome_notification_disabled) {
            log.debug('Because this user is a new site visitor, a welcome notification will be sent.');
            sendNotification(OneSignal._app_id, [result.id], {'en': title}, {'en': message})
            Event.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {title: title, message: message});
            OneSignal._isNewVisitor = false;
          }
        })
        .catch(function (e) {
          log.error(e);
        });
    }
    LimitStore.put('subscription.value', event.detail);
  },

  _onDbValueRetrieved: function (event) {
  },

  _onDbValueSet: function (event) {
    var info = event.detail;
    if (info.type === 'userId') {
      LimitStore.put('db.ids.userId', info.id);
      OneSignal._checkTrigger_eventSubscriptionChanged();
    }
  },

  _onInternalSubscriptionSet: function (event) {
    var newSubscriptionValue = event.detail;
    LimitStore.put('setsubscription.value', newSubscriptionValue);
    OneSignal._checkTrigger_eventSubscriptionChanged();
  },

  _onSdkInitialized: function() {
    if (Environment.isBrowser() && !OneSignal.bell) {
      log.info('Showing bell.');
      OneSignal.bell = new Bell({
        size: 'large',
        position: 'bottom-right',
        theme: 'default'
      });
      OneSignal.bell.create();
    }

    OneSignal._isInitialized = true;
    log.trace('OneSignal SDK has been fully initialized.');
  },

  _checkTrigger_eventSubscriptionChanged: function () {
    log.debug('Called %c_checkTrigger_eventSubscriptionChanged()', getConsoleStyle('code'));
    var permissions = LimitStore.get('notification.permission');
    var lastPermission = permissions[permissions.length - 2];
    var currentPermission = permissions[permissions.length - 1];
    log.debug('%c_checkTrigger_eventSubscriptionChanged():', getConsoleStyle('code'), 'Permissions:', {lastPermission, currentPermission});

    var ids = LimitStore.get('db.ids.userId');
    var lastId = ids[ids.length - 2];
    var currentId = ids[ids.length - 1];
    log.debug('%c_checkTrigger_eventSubscriptionChanged():', getConsoleStyle('code'), 'Ids:', {lastId, currentId});

    var subscriptionStates = LimitStore.get('setsubscription.value');
    var lastSubscriptionState = subscriptionStates[subscriptionStates.length - 2];
    var currentSubscriptionState = subscriptionStates[subscriptionStates.length - 1];
    log.debug('%c_checkTrigger_eventSubscriptionChanged():', getConsoleStyle('code'), 'Subscriptions:', {lastSubscriptionState, currentSubscriptionState});


    var newSubscriptionState = 'unchanged';

    if (((lastPermission === 'default' || lastPermission === 'denied' || lastPermission === null) && currentPermission === 'granted' &&
        currentId !== null &&
        currentSubscriptionState === true
      ) ||
      (
        (lastSubscriptionState === false && currentSubscriptionState === true) &&
        currentId != null &&
        currentPermission === 'granted'
      )) {
      newSubscriptionState = true;
    }

    if ((lastPermission !== 'denied' && currentPermission === 'denied') ||
      (lastPermission === 'granted' && currentPermission !== 'granted') ||
      (lastId !== null && currentId === null) ||
      (lastSubscriptionState !== false && currentSubscriptionState === false)) {
      newSubscriptionState = false;
    }

    if (newSubscriptionState !== "unchanged") {
      var lastTriggerTimes = LimitStore.put('event.subscriptionchanged.lastriggered', Date.now());
      var currentTime = lastTriggerTimes[lastTriggerTimes.length - 1];
      var lastTriggerTime = lastTriggerTimes[lastTriggerTimes.length - 2];
      var elapsedTimeSeconds = (currentTime - lastTriggerTime) / 1000;

      var lastEventStates = LimitStore.put('event.subscriptionchanged.laststates', newSubscriptionState);
      var currentState = lastEventStates[lastEventStates.length - 1];
      var lastState = lastEventStates[lastEventStates.length - 2];

      // If event already triggered within the last second, don't re-trigger.
      var shouldNotTriggerEvent = (lastTriggerTime != null && (elapsedTimeSeconds <= 1)) || (currentState === lastState);
      if (shouldNotTriggerEvent === false) {
        OneSignal._triggerEvent_subscriptionChanged(newSubscriptionState)
      }
    }
  },

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
          var recentPermissions = LimitStore.get('notification.permission');
          var permissionBeforePrompt = recentPermissions[0];
          OneSignal._triggerEvent_nativePromptPermissionChanged(permissionBeforePrompt);

          // If we are not the main page, send this event back to main page
          if (!Environment.isHost()) {
            let creator = opener || parent;
            OneSignal._safePostMessage(creator, {
              httpNativePromptPermissionChanged: OneSignal._getNotificationPermission(),
              from: Environment.getEnv()
            }, OneSignal._initOptions.origin, null);
          }
        };
      })
        .catch(function (e) {
          log.error(e);
        });
    }
  },

  init: function (options) {
    if (Environment.isBrowser() && window.localStorage["onesignal.debugger.init"]) {
      debugger;
    }
    log.debug(`Called %cinit(${JSON.stringify(options, null, 4)})`, getConsoleStyle('code'));
    if (OneSignal._isInitialized) {
      log.warn('OneSignal.init() was called again, but the SDK is already initialized. Skipping initialization.');
      return;
    }
    OneSignal._initOptions = options;

    if (!isPushNotificationsSupported()) {
      log.warn("Your browser does not support push notifications.");
      return;
    }

    var currentNotificationPermission = OneSignal._getNotificationPermission();
    LimitStore.put('notification.permission', currentNotificationPermission);

    OneSignal._installNativePromptPermissionChangedHook();

    // Store the current value of Ids:registrationId, so that we can see if the value changes in the future
    OneSignal._getDbValue('Ids', 'userId')
      .then(function (result) {
        if (result === undefined) {
          OneSignal._isNewVisitor = true;
        }
        var storeValue = result ? result.id : null;
        LimitStore.put('db.ids.userId', storeValue);
      });

    // Store the current value of subscription, so that we can see if the value changes in the future
    OneSignal._getSubscription(function (currentSubscription) {
      LimitStore.put('setsubscription.value', currentSubscription);
    });


    window.addEventListener(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, OneSignal.onCustomPromptClicked);
    window.addEventListener(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, OneSignal.onNativePromptChanged);
    window.addEventListener(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, OneSignal._onSubscriptionChanged);
    window.addEventListener(OneSignal.EVENTS.DB_VALUE_RETRIEVED, OneSignal._onDbValueRetrieved);
    window.addEventListener(OneSignal.EVENTS.DB_VALUE_SET, OneSignal._onDbValueSet);
    window.addEventListener(OneSignal.EVENTS.INTERNAL_SUBSCRIPTIONSET, OneSignal._onInternalSubscriptionSet);
    window.addEventListener(OneSignal.EVENTS.SDK_INITIALIZED, OneSignal._onSdkInitialized);

    OneSignal._useHttpMode = !isSupportedSafari() && (!OneSignal._supportsDirectPermission() || OneSignal._initOptions.subdomainName);

    if (OneSignal._useHttpMode)
      OneSignal._initOneSignalHttp = 'https://' + OneSignal._initOptions.subdomainName + '.onesignal.com/sdks/initOneSignalHttp';
    else
      OneSignal._initOneSignalHttp = 'https://onesignal.com/sdks/initOneSignalHttps';

    if (__DEV__)
      OneSignal._initOneSignalHttp = DEV_HOST + '/dev_sdks/initOneSignalHttp';

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
    Promise.all([OneSignal._getDbValue('Ids', 'appId'),
      OneSignal._getDbValue('Ids', 'registrationId'),
      OneSignal._getDbValue('Options', 'subscription')])
      .then(function _internalInit_GotAppRegistrationSubscriptionIds(result) {
        var appIdResult = result[0];
        var registrationIdResult = result[1];
        var subscriptionResult = result[2];

        // If AppId changed delete playerId and continue.
        if (appIdResult && appIdResult.id != OneSignal._initOptions.appId) {
          OneSignal._deleteDbValue("Ids", "userId");
          sessionStorage.removeItem("ONE_SIGNAL_SESSION");
        }

        // HTTPS - Only register for push notifications once per session or if the user changes notification permission to Ask or Allow.
        if (sessionStorage.getItem("ONE_SIGNAL_SESSION")
          && !OneSignal._initOptions.subdomainName
          && (Notification.permission == "denied"
          || sessionStorage.getItem("ONE_SIGNAL_NOTIFICATION_PERMISSION") == Notification.permission)) {
          Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
          return;
        }

        sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);

        if (OneSignal._initOptions.autoRegister == false && !registrationIdResult && !OneSignal._initOptions.subdomainName) {
          Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
          return;
        }

        if (document.visibilityState != "visible") {
          document.addEventListener("visibilitychange", OneSignal._visibilitychange);
          return;
        }

        OneSignal._sessionInit({});
      })
      .catch(function (e) {
        log.error(e);
      });
  },

  registerForPushNotifications: function (options) {
    if (!isPushNotificationsSupported()) {
      log.warn("Your browser does not support push notifications.");
      return;
    }
    // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
    //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
    if (!options)
      options = {};
    options.fromRegisterFor = true;
    OneSignal._sessionInit(options);
  },

  // Http only - Only called from iframe's init.js
  _initHttp: function (options) {
    log.debug('Called %c _initHttp', getConsoleStyle('code'));
    OneSignal._initOptions = options;

    OneSignal._installNativePromptPermissionChangedHook();
    if (options.continuePressed) {
      OneSignal.setSubscription(true);
    }

    var isIframe = (parent != null && parent != window);
    var creator = opener || parent;

    if (!creator) {
      log.error('_initHttp (from <iframe>):', 'No opener or parent found!');
      return;
    }
    // Setting up message channel to receive message from host page.
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function (event) {
      log.debug(`%c${Environment.getEnv().capitalize()} ⬸ ${event.data.from.capitalize()}:`, getConsoleStyle('postmessage'), event.data);

      if (event.data.initOptions) {
        OneSignal.setDefaultNotificationUrl(event.data.initOptions.defaultUrl);
        OneSignal.setDefaultTitle(event.data.initOptions.defaultTitle);
        if (event.data.initOptions.defaultIcon)
          OneSignal.setDefaultIcon(event.data.initOptions.defaultIcon);

        OneSignal._getDbValue("NotificationOpened", event.data.initOptions.parent_url)
          .then(function registerForPushNotifications_GotNotificationOpened(notificationOpenedResult) {
            if (notificationOpenedResult) {
              OneSignal._deleteDbValue("NotificationOpened", event.data.initOptions.parent_url);
              log.debug("OneSignal._safePostMessage:targetOrigin:", OneSignal._initOptions.origin);

              OneSignal._safePostMessage(creator, {openedNotification: notificationOpenedResult.data, from: Environment.getEnv()}, OneSignal._initOptions.origin, null);
            }
          })
          .catch(function (e) {
            log.error(e);
          });
        ;
      }
      else if (event.data.getNotificationPermission) {
        //log.info('%cIn the <iframe>: getNotificationPermission message was received.', getConsoleStyle('alert'));
        OneSignal._getSubdomainState(function (curState) {
          OneSignal._safePostMessage(creator, {currentNotificationPermission: curState, from: Environment.getEnv()}, OneSignal._initOptions.origin, null);
        });
      }
      else if (event.data.setSubdomainState)
        OneSignal.setSubscription(event.data.setSubdomainState.setSubscription);
    };

    OneSignal._getSubdomainState(function (curState) {
      curState["isIframe"] = isIframe;
      OneSignal._safePostMessage(creator, {oneSignalInitPageReady: curState, from: Environment.getEnv()}, OneSignal._initOptions.origin, [messageChannel.port2]);
    });

    OneSignal._initSaveState();
    OneSignal._httpRegistration = true;
    if (location.search.indexOf("?session=true") == 0)
      return;

    OneSignal._getPlayerId(null, function (player_id) {
      if (!isIframe || player_id) {
        navigator.serviceWorker.register(OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
      }
    });
  },

  _getSubdomainState: function (callback) {
    var state = {};

    Promise.all([OneSignal._getDbValue('Ids', 'userId'),
      OneSignal._getDbValue('Ids', 'registrationId'),
      OneSignal._getDbValue('Options', 'subscription')])
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
    OneSignal._putDbValue("Ids", {type: "appId", id: OneSignal._app_id});
    OneSignal._putDbValue("Options", {key: "pageTitle", value: document.title});
  },

  _supportsDirectPermission: function () {
    return isSupportedSafari()
      || location.protocol == 'https:'
      || location.host.indexOf("localhost") == 0
      || location.host.indexOf("127.0.0.1") == 0;
  },


  _sessionInit: function (options) {
    log.debug(`Called %c_sessionInit(${JSON.stringify(options)})`, getConsoleStyle('code'));
    OneSignal._initSaveState();

    var hostPageProtocol = location.origin.match(/^http(s|):\/\/(www\.|)/)[0];

    // If HTTP or using subdomain mode
    if (OneSignal._useHttpMode) {
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
            'cancelButtonText'];
          for (var i = 0; i < message_localization_params.length; i++) {
            var key = message_localization_params[i];
            var value = message_localization_opts[key];
            var encoded_value = encodeURIComponent(value);
            if (value || value === '') {
              message_localization_opts_str += '&' + key + '=' + encoded_value;
            }
          }
        }
        var childWindow = window.open(OneSignal._initOneSignalHttp + "?" + message_localization_opts_str + "&hostPageProtocol=" + hostPageProtocol, "_blank", 'scrollbars=yes, width=' + childWidth + ', height=' + childHeight + ', top=' + top + ', left=' + left);

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
          var notificationPermissionBeforeRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
          window.safari.pushNotification.requestPermission(
            OneSignal._HOST_URL + 'safari',
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
              OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest);
            }
          );
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
          element.innerHTML = '<div id="notif-permission" style="background: rgba(0, 0, 0, 0.7); position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9000; display: block"></div>';
          document.body.appendChild(element);

          var iframeStyle = document.createElement('style');
          iframeStyle.innerHTML = "@media (max-width: 560px) { .OneSignal-permission-iframe { width: 100%; height: 100%;} }"
            + "@media (min-width: 561px) { .OneSignal-permission-iframe { top: 50%; left: 50%; margin-left: -275px; margin-top: -248px;} }";
          document.getElementsByTagName('head')[0].appendChild(iframeStyle);

          var iframeNode = document.createElement("iframe");
          iframeNode.className = "OneSignal-permission-iframe"
          iframeNode.style.cssText = "background: rgba(255, 255, 255, 1); position: fixed;";
          iframeNode.src = OneSignal._initOneSignalHttp
            + '?id=' + OneSignal._app_id
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

  _registerForW3CPush: function (options) {

    OneSignal._getDbValue('Ids', 'registrationId')
      .then(function _registerForW3CPush_GotRegistrationId(registrationIdResult) {
        if (!registrationIdResult || !options.fromRegisterFor || Notification.permission != "granted") {
          navigator.serviceWorker.getRegistration().then(function (serviceWorkerRegistration) {
            var sw_path = "";

            if (OneSignal._initOptions.path)
              sw_path = OneSignal._initOptions.path;

            if (typeof serviceWorkerRegistration === "undefined") // Nothing registered, very first run
              OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
            else {
              if (serviceWorkerRegistration.active) {
                if (serviceWorkerRegistration.active.scriptURL.indexOf(sw_path + OneSignal.SERVICE_WORKER_PATH) > -1) {

                  OneSignal._getDbValue('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
                    .then(function (versionResult) {
                      if (versionResult) {
                        if (versionResult.id != OneSignal._VERSION)
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                        else
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
                      }
                      else
                        OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);

                    })
                    .catch(function (e) {
                      log.error(e);
                    });
                }
                else if (serviceWorkerRegistration.active.scriptURL.indexOf(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH) > -1) {

                  OneSignal._getDbValue('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION')
                    .then(function (versionResult) {
                      if (versionResult) {
                        if (versionResult.id != OneSignal._VERSION)
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_PATH);
                        else
                          OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                      }
                      else
                        OneSignal._registerServiceWorker(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                    })
                    .catch(function (e) {
                      log.error(e);
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
      node.src += "?hostPageProtocol=" + hostPageProtocol
    document.body.appendChild(node);

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
      log.warn("The user has disabled notifications.");
      return;
    }

    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
      log.info('Service worker now active:', serviceWorkerRegistration);

      OneSignal._subscribeForPush(serviceWorkerRegistration);
    })
      .catch(function (e) {
        log.error(e);
      });
    ;
  },

  /*
   Returns the current browser-agnostic notification permission as "default", "granted", "denied".
   safariWebId: Used only to get the current notification permission state in Safari (required as part of the spec).
   */
  _getNotificationPermission: function (safariWebId) {
    if (window.safari) {
      // The user is on Safari
      // A web ID is required to determine the current notificiation permission
      if (safariWebId) {
        return window.safari.pushNotification.permission(safariWebId).permission;
      }
      else {
        // The user didn't set up Safari web push properly; notifications are unlikely to be enabled
        return "default";
      }
    }
    else {
      // Identical API on Firefox and Chrome
      return Notification.permission;
    }
  },

  _triggerEvent_customPromptClicked: function (clickResult) {
    var recentPermissions = LimitStore.put('prompt.custom.permission', clickResult);
    Event.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
      result: clickResult
    });
  },

  _triggerEvent_nativePromptPermissionChanged: function (from, to) {
    if (to === undefined) {
      to = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
    }
    if (from !== to) {
      var recentPermissions = LimitStore.put('notification.permission', to);
      Event.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, {
        from: from,
        to: to
      });
    }
  },

  _triggerEvent_subscriptionChanged: function (to) {
    Event.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
  },

  _triggerEvent_dbValueRetrieved: function (value) {
    Event.trigger(OneSignal.EVENTS.DB_VALUE_RETRIEVED, value);
  },

  _triggerEvent_dbValueSet: function (value) {
    Event.trigger(OneSignal.EVENTS.DB_VALUE_SET, value);
  },

  _triggerEvent_internalSubscriptionSet: function (value) {
    Event.trigger(OneSignal.EVENTS.INTERNAL_SUBSCRIPTIONSET, value);
  },

  _subscribeForPush: function (serviceWorkerRegistration) {
    var notificationPermissionBeforeRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
    serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
      .then(function (subscription) {
        sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);

        OneSignal._getDbValue('Ids', 'appId')
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

            if (!OneSignal._usingNativePermissionHook) {
              OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest);
            }
          })
          .catch(function (e) {
            log.error(e);
          });
      })
      .catch(function (e) {
        log.error('Error while subscribing for push:', e);

        if (!OneSignal._usingNativePermissionHook)
          OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest);

        if (e.code == 20 && opener && OneSignal._httpRegistration)
          window.close();
      });
  },

  sendTag: function (key, value) {
    var jsonKeyValue = {};
    jsonKeyValue[key] = value;
    OneSignal.sendTags(jsonKeyValue);
  },

  sendTags: function (jsonPair) {
    OneSignal._getDbValue('Ids', 'userId')
      .then(function sendTags_GotUserId(userIdResult) {
        if (userIdResult)
          OneSignal._sendToOneSignalApi("players/" + userIdResult.id, "PUT", {
            app_id: OneSignal._app_id,
            tags: jsonPair
          });
        else {
          if (OneSignal._tagsToSendOnRegister == null)
            OneSignal._tagsToSendOnRegister = jsonPair;
          else {
            var resultObj = {};
            for (var _obj in OneSignal._tagsToSendOnRegister) resultObj[_obj] = OneSignal._tagsToSendOnRegister[_obj];
            for (var _obj in jsonPair) resultObj[_obj] = jsonPair[_obj];
            OneSignal._tagsToSendOnRegister = resultObj;
          }
        }
      })
      .catch(function (e) {
        log.error('sendTags:', e);
      });
  },

  deleteTag: function (key) {
    OneSignal.deleteTags([key]);
  },

  deleteTags: function (keyArray) {
    var jsonPair = {};
    var length = keyArray.length;
    for (var i = 0; i < length; i++)
      jsonPair[keyArray[i]] = "";

    OneSignal.sendTags(jsonPair);
  },

  _handleNotificationOpened: function (event) {
    var notificationData = JSON.parse(event.notification.tag);
    event.notification.close();

    Promise.all([OneSignal._getDbValue('Ids', 'appId'), OneSignal._getDbValue('Ids', 'userId')])
      .then(function _handleNotificationOpened_GotAppUserIds(results) {
        var appIdResult = results[0];
        var userIdResult = results[1];
        if (appIdResult && userIdResult) {
          OneSignal._sendToOneSignalApi("notifications/" + notificationData.id, "PUT", {
            app_id: appIdResult.id,
            player_id: userIdResult.id,
            opened: true
          });
        }
      })
      .catch(function (e) {
        log.error(e);
      });
    ;

    event.waitUntil(
      clients.matchAll({type: "window"})
        .then(function (clientList) {
          var launchURL = registration.scope;
          if (OneSignal._defaultLaunchURL)
            launchURL = OneSignal._defaultLaunchURL;
          if (notificationData.launchURL)
            launchURL = notificationData.launchURL;

          for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if ('focus' in client && client.url == launchURL) {
              client.focus();

              // targetOrigin not valid here as the service worker owns the page.
              client.postMessage(notificationData);
              return;
            }
          }

          if (launchURL !== 'javascript:void(0);' && launchURL !== 'do_not_open') {
            OneSignal._putDbValue("NotificationOpened", {url: launchURL, data: notificationData});
            clients.openWindow(launchURL).catch(function (error) {
              // Should only fall into here if going to an external URL on Chrome older than 43.
              clients.openWindow(registration.scope + "redirector.html?url=" + launchURL);
            });
          }
        })
        .catch(function (e) {
          log.error(e);
        })
    );
  },

  _getTitle: function (incomingTitle, callback) {
    if (incomingTitle != null) {
      callback(incomingTitle);
      return;
    }

    Promise.all([OneSignal._getDbValue('Options', 'defaultTitle'), OneSignal._getDbValue('Options', 'pageTitle')])
      .then(function _getTitle_GotDefaultPageTitles(results) {
        var defaultTitleResult = results[0];
        var pageTitleResult = results[1];

        if (defaultTitleResult) {
          callback(defaultTitleResult.value);
          return;
        }
        else if (pageTitleResult && pageTitleResult.value != null) {
          callback(pageTitleResult.value);
          return;
        }
        else {
          callback('');
        }
      })
      .catch(function (e) {
        log.error(e);
      });
  },

  // Displays notification from content received from OneSignal.
  // This method is only called by ServiceWorker
  _handleGCMMessage: function (serviceWorker, event) {
    // TODO: Read data from the GCM payload when Chrome no longer requires the below command line parameter.
    // --enable-push-message-payload
    // The command line param is required even on Chrome 43 nightly build 2015/03/17.
    if (event.data && event.data.text()[0] == "{") {
      log.debug('Received data.text: ', event.data.text());
      log.debug('Received data.json: ', event.data.json());
    }

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
      }))
  },

  _getLastNotifications: function (itemCallback, completeCallback) {
    OneSignal._getDbValue('Ids', 'userId')
      .then(function _getLastNotifications_GotUserId(userIdResult) {
        if (userIdResult) {
          OneSignal._sendToOneSignalApi("players/" + userIdResult.id + "/chromeweb_notification", "GET", null, function (response) {
            for (var i = 0; i < response.length; i++)
              itemCallback(JSON.parse(response[i]));
          }, function () {
            completeCallback();
          });  // Failed callback
        }
        else {
          log.debug("Error: could not get notificationId");
          completeCallback();
        }
      })
      .catch(function (e) {
        log.error(e);
      });
    ;
  },

  // HTTP & HTTPS - Runs on main page (receives events from iframe / popup)
  _listener_receiveMessage: function receiveMessage(event) {
    if (event.data.from) {
      var from = event.data.from.capitalize()
    } else {
      var from = 'IFrame/Popup';
    }
    log.debug(`%c${Environment.getEnv().capitalize()} ⬸ ${from}:`, getConsoleStyle('postmessage'), event.data);

    if (OneSignal._initOptions == undefined)
      return;

    if (!__DEV__ && event.origin !== "" && event.origin !== "https://onesignal.com" && event.origin !== "https://" + OneSignal._initOptions.subdomainName + ".onesignal.com")
      return;

    if (event.data.oneSignalInitPageReady) { // Only called on HTTP pages.
      var eventData = event.data.oneSignalInitPageReady;

      if (eventData.isIframe) {
        OneSignal._iframePort = event.ports[0];
      }

      if (eventData.userId)
        OneSignal._putDbValue("Ids", {type: "userId", id: eventData.userId});
      if (eventData.registrationId)
        OneSignal._putDbValue("Ids", {type: "registrationId", id: eventData.registrationId});

      OneSignal._fireNotificationEnabledCallback(eventData.isPushEnabled);
      OneSignal._sendUnsentTags();

      OneSignal._getDbValues("Options")
        .then(function _listener_receiveMessage(options) {
          if (!options.defaultUrl)
            options.defaultUrl = document.URL;
          if (!options.defaultTitle)
            options.defaultTitle = document.title;

          options.parent_url = document.URL;
          event.ports[0].postMessage({initOptions: options, from: Environment.getEnv()});

          // For HTTP sites, only now is the SDK initialized and able to communicate with the iframe
          Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
        })
        .catch(function (e) {
          log.error('_listener_receiveMessage:', e);
        });
    }
    else if (event.data.currentNotificationPermission) { // Subdomain Only
      OneSignal._fireNotificationEnabledCallback(event.data.currentNotificationPermission.isPushEnabled);
    }
    else if (event.data.idsAvailable) { // Only called on HTTP pages.
      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
      OneSignal._putDbValue("Ids", {type: "userId", id: event.data.idsAvailable.userId});
      OneSignal._putDbValue("Ids", {type: "registrationId", id: event.data.idsAvailable.registrationId});

      if (OneSignal._idsAvailable_callback.length > 0) {
        while (OneSignal._idsAvailable_callback.length > 0) {
          var curr_callback = OneSignal._idsAvailable_callback.pop()
          curr_callback({
            userId: event.data.idsAvailable.userId,
            registrationId: event.data.idsAvailable.registrationId
          });
        }
      }
      OneSignal._sendUnsentTags();
    }
    else if (event.data.httpsPromptAccepted) { // HTTPS Only
      OneSignal.registerForPushNotifications();
      OneSignal.setSubscription(true);
      let elem = document.getElementById('OneSignal-iframe-modal');
      elem.parentNode.removeChild(elem);
      OneSignal._triggerEvent_customPromptClicked('granted');
    }
    else if (event.data.httpsPromptCanceled) { // HTTPS Only
      let elem = document.getElementById('OneSignal-iframe-modal');
      elem.parentNode.removeChild(elem);
      OneSignal._triggerEvent_customPromptClicked('denied');
    }
    else if (event.data.httpPromptAccepted) { // HTTP Only
      OneSignal._triggerEvent_customPromptClicked('granted');
    }
    else if (event.data.httpPromptCanceled) { // HTTP Only
      OneSignal._triggerEvent_customPromptClicked('denied');
    }
    else if (event.data.httpNativePromptPermissionChanged) {
      var recentPermissions = LimitStore.get('notification.permission');
      var permissionBeforePrompt = recentPermissions[0];
      OneSignal._triggerEvent_nativePromptPermissionChanged(permissionBeforePrompt, event.data.httpNativePromptPermissionChanged);
    }
    else if (OneSignal._notificationOpened_callback) { // HTTP and HTTPS
      OneSignal._notificationOpened_callback(event.data);
    }
  },

  addListenerForNotificationOpened: function (callback) {
    OneSignal._notificationOpened_callback = callback;
    if (window) {
      OneSignal._getDbValue("NotificationOpened", document.URL)
        .then(function (notificationOpenedResult) {
          if (notificationOpenedResult) {
            OneSignal._deleteDbValue("NotificationOpened", document.URL);
            OneSignal._notificationOpened_callback(notificationOpenedResult.data);
          }
        })
        .catch(function (e) {
          log.error(e);
        });
      ;
    }
  },

  // Subdomain - Fired from message received from iframe.
  _fireNotificationEnabledCallback: function (newNotificationPermission) {
    if (OneSignal._isNotificationEnabledCallback) {
      while (OneSignal._isNotificationEnabledCallback.length > 0) {
        let callback = OneSignal._isNotificationEnabledCallback.pop();
        callback(newNotificationPermission);
      }
    }
  },

  getIdsAvailable: function (callback) {
    if (callback === undefined)
      return;

    OneSignal._idsAvailable_callback.push(callback);

    Promise.all([OneSignal._getDbValue('Ids', 'userId'), OneSignal._getDbValue('Ids', 'registrationId')])
      .then(function getIdsAvailable_GotUserRegistrationIds(results) {
        var userIdResult = results[0];
        var registrationIdResult = results[1];

        if (userIdResult) {
          if (registrationIdResult) {
            while (OneSignal._idsAvailable_callback.length > 0) {
              var curr_callback = OneSignal._idsAvailable_callback.pop();
              curr_callback({
                userId: userIdResult.id,
                registrationId: registrationIdResult.id
              });
            }
          }
          else
            while (OneSignal._idsAvailable_callback.length > 0) {
              var curr_callback = OneSignal._idsAvailable_callback.pop();
              curr_callback({userId: userIdResult.id, registrationId: null});
            }
        }
      })
      .catch(function (e) {
        log.error(e);
      });
    ;
  },

  getTags: function (callback) {
    OneSignal._getDbValue('Ids', 'userId')
      .then(function (userIdResult) {
        if (userIdResult) {
          OneSignal._sendToOneSignalApi("players/" + userIdResult.id, 'GET', null, function (response) {
            callback(response.tags);
          });
        }
      })
      .catch(function (e) {
        log.error(e);
      });
    ;
  },

  isPushNotificationsEnabled: function (callback) {
    if (!isPushNotificationsSupported()) {
      log.warn("Your browser does not support push notifications.");
      return;
    }

    // If Subdomain
    if (OneSignal._initOptions.subdomainName && !isBrowserSafari()) {
      OneSignal._isNotificationEnabledCallback.push(callback);
      if (OneSignal._iframePort) {
        OneSignal._iframePort.postMessage({getNotificationPermission: true, from: Environment.getEnv()});
      }
      return;
    }

    // If HTTPS

    Promise.all([OneSignal._getDbValue('Ids', 'registrationId'), OneSignal._getDbValue('Options', 'subscription')])
      .then(function (results) {
        var registrationIdResult = results[0];
        var subscriptionResult = results[1];

        if (registrationIdResult) {
          if (subscriptionResult && !subscriptionResult.value)
            return callback(false);

          callback(Notification.permission == "granted");
        }
        else
          callback(false);
      })
      .catch(function (e) {
        log.error(e);
      });
  },

  _getNotificationTypes: function (callback) {
    OneSignal._getSubscription(function (db_subscriptionSet) {
      callback(db_subscriptionSet ? 1 : -2);
    });
  },

  setSubscription: function (newSubscription) {
    if (OneSignal._iframePort)
      OneSignal._iframePort.postMessage({setSubdomainState: {setSubscription: newSubscription}, from: Environment.getEnv()});
    else {
      OneSignal._getSubscription(function (currentSubscription) {
        if (currentSubscription != newSubscription) {
          OneSignal._putDbValue("Options", {key: "subscription", value: newSubscription});
          OneSignal._getDbValue('Ids', 'userId')
            .then(function (userIdResult) {
              if (userIdResult)
                OneSignal._sendToOneSignalApi("players/" + userIdResult.id, "PUT", {
                  app_id: OneSignal._app_id,
                  notification_types: newSubscription ? 1 : -2
                }, function setSubscriptionSetCallback() {
                  OneSignal._triggerEvent_internalSubscriptionSet(newSubscription);
                });
            })
            .catch(function (e) {
              log.error(e);
            });
        }
      });
    }
  },

  /**
   * Returns false if setSubscription(false) has been explicitly called at any point in time. Otherwise returns true.
   * This means a return value of true does not mean the user is subscribed, only that the user did not call setSubcription(false).
   * @param callback
   * @private
   */
  _getSubscription: function (callback) {
    OneSignal._getDbValue('Options', 'subscription')
      .then(function (subscriptionResult) {
        callback(!(subscriptionResult && subscriptionResult.value == false))
      })
      .catch(function (e) {
        log.error(e);
      });
    ;
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

// If imported on your page.
if (Environment.isBrowser())
  window.addEventListener("message", OneSignal._listener_receiveMessage, false);
else { // if imported from the service worker.
  importScripts('https://cdn.onesignal.com/sdks/serviceworker-cache-polyfill.js');

  self.addEventListener('push', function (event) {
    OneSignal._handleGCMMessage(self, event); // Can handle messages from any browser (except Safari), rename method
  });
  self.addEventListener('notificationclick', function (event) {
    // Also only by SW
    OneSignal._handleNotificationOpened(event);
  });

  var isSWonSubdomain = location.href.match(/https\:\/\/.*\.onesignal.com\/sdks\//) != null;
  if (__DEV__)
    isSWonSubdomain = true;

  self.addEventListener('install', function (event) {
    log.info(`Installing service worker: %c${self.location.pathname}`, getConsoleStyle('code'), `(version ${OneSignal._VERSION})`);
    if (self.location.pathname.indexOf("OneSignalSDKWorker.js") > -1)
      OneSignal._putDbValue("Ids", {type: "WORKER1_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION});
    else
      OneSignal._putDbValue("Ids", {type: "WORKER2_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION});

    if (isSWonSubdomain) {
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
  });

  if (isSWonSubdomain) {
    self.addEventListener('fetch', function (event) {
      event.respondWith(
        caches.match(event.request)
          .then(function (response) {
            // Cache hit - return response
            if (response)
              return response;

            return fetch(event.request);
          }
        )
          .catch(function (e) {
            log.error(e);
          })
      );
    });
  }
}

if (OneSignal.LOGGING)
  log.setDefaultLevel(log.levels.TRACE);
else
  log.setDefaultLevel(log.levels.ERROR);

log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION}, ${Environment.getEnv()} environment).`, getConsoleStyle('bold'));

module.exports = OneSignal;