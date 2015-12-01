/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	__webpack_require__(1);
	
	var _loglevel = __webpack_require__(2);
	
	var _loglevel2 = _interopRequireDefault(_loglevel);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	// Let's see all errors
	_loglevel2.default.setDefaultLevel('trace');
	
	__webpack_require__(3);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _loglevel = __webpack_require__(2);
	
	var _loglevel2 = _interopRequireDefault(_loglevel);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	/**
	 * Modified MIT License
	 *
	 * Copyright 2015 OneSignal
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * 1. The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * 2. All copies of substantial portions of the Software may only be used in connection
	 * with services provided by OneSignal.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */
	
	/*
	 LimitStore.put('colorado', 'rocky');
	 ["rocky"]
	 LimitStore.put('colorado', 'mountain');
	 ["rocky", "mountain"]
	 LimitStore.put('colorado', 'national');
	 ["mountain", "national"]
	 LimitStore.put('colorado', 'park');
	 ["national", "park"]
	 */
	function LimitStore() {}
	
	LimitStore.store = {};
	LimitStore.LIMIT = 2;
	
	LimitStore.put = function (key, value) {
	  if (LimitStore.store[key] === undefined) {
	    LimitStore.store[key] = [null, null];
	  }
	  LimitStore.store[key].push(value);
	  if (LimitStore.store[key].length == LimitStore.LIMIT + 1) {
	    LimitStore.store[key].shift();
	  }
	  return LimitStore.store[key];
	};
	
	LimitStore.get = function (key) {
	  return LimitStore.store[key];
	};
	
	if (typeof window !== "undefined") {
	  (function () {
	    function CustomEvent(event, params) {
	      params = params || { bubbles: false, cancelable: false, details: undefined };
	      var evt = document.createEvent('CustomEvent');
	      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.details);
	      return evt;
	    }
	
	    CustomEvent.prototype = window.Event.prototype;
	
	    window.CustomEvent = CustomEvent;
	  })();
	}
	
	// Requires Chrome 42+, Safari 7+, or Firefox 44+
	// Web push notifications are supported on Mac OSX, Windows, Linux, and Android.
	var _temp_OneSignal = null;
	
	if (typeof OneSignal !== "undefined") _temp_OneSignal = OneSignal;
	
	var OneSignal = {
	  _VERSION: 109778,
	  _HOST_URL: "https://192.168.1.206:3000/api/v1/",
	  //_HOST_URL: "https://onesignal.com/api/v1/",
	  _IS_DEV: false,
	
	  _app_id: null,
	
	  _tagsToSendOnRegister: null,
	
	  _notificationOpened_callback: null,
	  _idsAvailable_callback: [],
	
	  _defaultLaunchURL: null,
	
	  _initOptions: null,
	
	  _httpRegistration: false,
	
	  _main_page_port: null,
	
	  _isNotificationEnabledCallback: null,
	
	  _subscriptionSet: true,
	
	  _initOneSignalHttp: null,
	
	  _sessionIframeAdded: false,
	
	  _useHttpMode: null,
	
	  _windowWidth: 550,
	
	  _windowHeight: 480,
	
	  LOGGING: false,
	  LOGGING_VERBOSE: false,
	  LOGGING_TRACING: false,
	
	  SERVICE_WORKER_UPDATER_PATH: "OneSignalSDKUpdaterWorker.js",
	  SERVICE_WORKER_PATH: "OneSignalSDKWorker.js",
	  SERVICE_WORKER_PARAM: {},
	
	  /*
	   Logs to console.log if logging enabled. Takes variable arguments, first must be a string message.
	   See also: https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
	   */
	
	  _debug: function _debug() {
	    if (OneSignal.LOGGING) {
	      if (OneSignal.LOGGING_VERBOSE) {
	        console['log'].apply(console, arguments);
	        if (OneSignal.LOGGING_TRACING) {
	          console['trace'].apply(console, [' ']);
	        }
	      }
	    }
	  },
	
	  _log: function _log() {
	    if (OneSignal.LOGGING) {
	      console['log'].apply(console, arguments);
	      if (OneSignal.LOGGING_TRACING) {
	        console['trace'].apply(console, [' ']);
	      }
	    }
	  },
	
	  _info: function _info() {
	    if (OneSignal.LOGGING) {
	      console['info'].apply(console, arguments);
	      if (OneSignal.LOGGING_TRACING) {
	        console['trace'].apply(console, [' ']);
	      }
	    }
	  },
	
	  _warn: function _warn() {
	    console['warn'].apply(console, arguments);
	    if (OneSignal.LOGGING_TRACING) {
	      console['trace'].apply(console, [' ']);
	    }
	  },
	
	  _error: function _error() {
	    console['error'].apply(console, arguments);
	    if (OneSignal.LOGGING_TRACING) {
	      console['trace'].apply(console, [' ']);
	    }
	  },
	
	  _ensureDbInstance: function _ensureDbInstance() {
	    return new Promise(function (resolve, reject) {
	      if (OneSignal._oneSignal_db) {
	        resolve(OneSignal._oneSignal_db);
	      } else {
	        var request = indexedDB.open("ONE_SIGNAL_SDK_DB", 1);
	        request.onsuccess = function (event) {
	          var database = event.target.result;
	          OneSignal._oneSignal_db = database;
	          OneSignal._debug('Succesfully opened IndexedDB.');
	          resolve(database);
	        };
	        request.onerror = function (event) {
	          OneSignal._error('Unable to open IndexedDB.', event);
	          reject(event);
	        };
	
	        request.onupgradeneeded = function (event) {
	          OneSignal._log('Recreating schema in IndexedDB...');
	          var db = event.target.result;
	          db.createObjectStore("Ids", { keyPath: "type" });
	          db.createObjectStore("NotificationOpened", { keyPath: "url" });
	          db.createObjectStore("Options", { keyPath: "key" });
	        };
	      }
	    });
	  },
	
	  _getDbValue: function _getDbValue(table, key) {
	    return new Promise(function (resolve, reject) {
	      OneSignal._ensureDbInstance().then(function (database) {
	        var request = database.transaction(table).objectStore(table).get(key);
	        request.onsuccess = function (event) {
	          if (request.result) OneSignal._triggerEvent_dbValueRetrieved(request.result);
	          resolve(request.result);
	        };
	        request.onerror = function (event) {
	          reject(request.errorCode);
	        };
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	      ;
	    });
	  },
	
	  _getDbValues: function _getDbValues(table) {
	    return new Promise(function (resolve, reject) {
	      OneSignal._ensureDbInstance().then(function (database) {
	        var jsonResult = {};
	        var cursor = database.transaction(table).objectStore(table).openCursor();
	        cursor.onsuccess = function (event) {
	          var cursor = event.target.result;
	          if (cursor) {
	            OneSignal._triggerEvent_dbValueRetrieved(cursor);
	            jsonResult[cursor.key] = cursor.value.value;
	            cursor.continue();
	          } else resolve(jsonResult);
	        };
	        cursor.onerror = function (event) {
	          reject(cursor.errorCode);
	        };
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	    });
	  },
	
	  _putDbValue: function _putDbValue(table, value) {
	    return new Promise(function (resolve, reject) {
	      OneSignal._ensureDbInstance().then(function (database) {
	        database.transaction([table], "readwrite").objectStore(table).put(value);
	        OneSignal._triggerEvent_dbValueSet(value);
	        resolve(value);
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	    });
	  },
	
	  _deleteDbValue: function _deleteDbValue(table, key) {
	    return new Promise(function (resolve, reject) {
	      OneSignal._ensureDbInstance().then(function (database) {
	        database.transaction([table], "readwrite").objectStore(table).delete(key);
	        resolve(key);
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	      ;
	    });
	  },
	
	  _sendToOneSignalApi: function _sendToOneSignalApi(url, action, inData, callback, failedCallback) {
	    var contents = {
	      method: action
	    };
	
	    //mode: 'no-cors', // no-cors is disabled for non-serviceworker.
	    if (inData) {
	      contents.headers = { "Content-type": "application/json;charset=UTF-8" };
	      contents.body = JSON.stringify(inData);
	    }
	
	    fetch(OneSignal._HOST_URL + url, contents).then(function status(response) {
	      if (response.status >= 200 && response.status < 300) return Promise.resolve(response);else return Promise.reject(new Error(response.statusText));
	    }).then(function status(response) {
	      return response.json();
	    }).then(function (jsonData) {
	      OneSignal._log(jsonData);
	      if (callback != null) callback(jsonData);
	    }).catch(function (e) {
	      OneSignal._error('Request failed:', e);
	      if (failedCallback != null) failedCallback();
	    });
	  },
	
	  _getLanguage: function _getLanguage() {
	    return navigator.language ? navigator.language.length > 3 ? navigator.language.substring(0, 2) : navigator.language : 'en';
	  },
	
	  _getPlayerId: function _getPlayerId(value, callback) {
	    if (value) callback(value);else {
	      OneSignal._getDbValue('Ids', 'userId').then(function _getPlayerId_gotUserId(result) {
	        if (result) callback(result.id);else callback(null);
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	      ;
	    }
	  },
	
	  _getBrowserName: function _getBrowserName() {
	    if (navigator.appVersion.match(/Chrome\/(.*?) /)) return "Chrome";
	    if (navigator.appVersion.match("Version/(.*) (Safari)")) return "Safari";
	    if (navigator.userAgent.match(/Firefox\/([0-9]{2,}\.[0-9]{1,})/)) return "Firefox";
	
	    return "";
	  },
	
	  _registerWithOneSignal: function _registerWithOneSignal(appId, registrationId, deviceType) {
	
	    OneSignal._getDbValue('Ids', 'userId').then(function _registerWithOneSignal_GotUserId(userIdResult) {
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
	          jsonData.notification_types = notif_types;
	        } else if (notif_types != 1) jsonData.notification_types = notif_types;
	
	        if (registrationId) {
	          jsonData.identifier = registrationId;
	          OneSignal._putDbValue("Ids", { type: "registrationId", id: registrationId });
	        }
	
	        OneSignal._sendToOneSignalApi(requestUrl, 'POST', jsonData, function registeredCallback(responseJSON) {
	          sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
	
	          if (responseJSON.id) {
	            OneSignal._putDbValue("Ids", { type: "userId", id: responseJSON.id });
	            OneSignal._sendUnsentTags();
	          }
	
	          OneSignal._getPlayerId(responseJSON.id, function (userId) {
	            if (OneSignal._idsAvailable_callback.length > 0) {
	              while (OneSignal._idsAvailable_callback.length > 0) {
	                var curr_callback = OneSignal._idsAvailable_callback.pop();
	                curr_callback({ userId: userId, registrationId: registrationId });
	              }
	            }
	
	            if (OneSignal._httpRegistration) {
	              OneSignal._log("Sending player Id and registrationId back to host page");
	              OneSignal._log(OneSignal._initOptions);
	              var creator = opener || parent;
	              OneSignal._safePostMessage(creator, {
	                idsAvailable: {
	                  userId: userId,
	                  registrationId: registrationId
	                }
	              }, OneSignal._initOptions.origin, null);
	
	              if (opener) window.close();
	            } else OneSignal._debug("NO opener");
	          });
	        });
	      });
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  _sendUnsentTags: function _sendUnsentTags() {
	    if (OneSignal._tagsToSendOnRegister) {
	      OneSignal.sendTags(OneSignal._tagsToSendOnRegister);
	      OneSignal._tagsToSendOnRegister = null;
	    }
	  },
	
	  setDefaultNotificationUrl: function setDefaultNotificationUrl(url) {
	    OneSignal._putDbValue("Options", { key: "defaultUrl", value: url });
	  },
	
	  setDefaultIcon: function setDefaultIcon(icon) {
	    OneSignal._putDbValue("Options", { key: "defaultIcon", value: icon });
	  },
	
	  setDefaultTitle: function setDefaultTitle(title) {
	    OneSignal._putDbValue("Options", { key: "defaultTitle", value: title });
	  },
	
	  _visibilitychange: function _visibilitychange() {
	    if (document.visibilityState == "visible") {
	      document.removeEventListener("visibilitychange", OneSignal._visibilitychange);
	      OneSignal._sessionInit({});
	    }
	  },
	
	  onNativePromptChanged: function onNativePromptChanged(event) {
	    OneSignal._log('Event onesignal.prompt.native.permissionchanged:', event.detail);
	    OneSignal._checkTrigger_eventSubscriptionChanged();
	  },
	
	  _onSubscriptionChanged: function _onSubscriptionChanged(event) {
	    OneSignal._log('Event onesignal.subscription.changed:', event.detail);
	  },
	
	  _onDbValueRetrieved: function _onDbValueRetrieved(event) {
	    OneSignal._log('Event onesignal.db.retrieved:', event.detail);
	  },
	
	  _onDbValueSet: function _onDbValueSet(event) {
	    OneSignal._log('Event onesignal.db.valueset:', event.detail);
	    var info = event.detail;
	    if (info.type === 'userId') {
	      LimitStore.put('db.ids.userId', info.id);
	      OneSignal._checkTrigger_eventSubscriptionChanged();
	    }
	  },
	
	  _onInternalSubscriptionSet: function _onInternalSubscriptionSet(event) {
	    OneSignal._log('Event onesignal.internal.subscriptionset:', event.detail);
	    var newSubscriptionValue = event.detail;
	    LimitStore.put('subscription.value', newSubscriptionValue);
	    OneSignal._checkTrigger_eventSubscriptionChanged();
	  },
	
	  _checkTrigger_eventSubscriptionChanged: function _checkTrigger_eventSubscriptionChanged() {
	    var permissions = LimitStore.get('notification.permission');
	    var lastPermission = permissions[permissions.length - 2];
	    var currentPermission = permissions[permissions.length - 1];
	
	    var ids = LimitStore.get('db.ids.userId');
	    var lastId = ids[ids.length - 2];
	    var currentId = ids[ids.length - 1];
	
	    var subscriptionStates = LimitStore.get('subscription.value');
	    var lastSubscriptionState = subscriptionStates[subscriptionStates.length - 2];
	    var currentSubscriptionState = subscriptionStates[subscriptionStates.length - 1];
	
	    var newSubscriptionState = 'unchanged';
	
	    if ((lastPermission === 'default' || lastPermission === 'denied' || lastPermission === null) && currentPermission === 'granted' && currentId !== null && currentSubscriptionState == true || lastSubscriptionState == false && currentSubscriptionState == true && currentId != null && currentPermission == 'granted') {
	      newSubscriptionState = true;
	    }
	
	    if (lastPermission !== 'denied' && currentPermission === 'denied' || lastPermission === 'granted' && currentPermission !== 'granted' || lastId !== null && currentId === null || lastSubscriptionState !== false && currentSubscriptionState === false) {
	      newSubscriptionState = false;
	    }
	
	    if (newSubscriptionState !== "unchanged") {
	      OneSignal._debug('SubscriptionChanged event fired, new state is now:', newSubscriptionState);
	      var lastTriggerTimes = LimitStore.put('event.subscriptionchanged.lastriggered', Date.now());
	      var currentTime = lastTriggerTimes[lastTriggerTimes.length - 1];
	      var lastTriggerTime = lastTriggerTimes[lastTriggerTimes.length - 2];
	      var elapsedTimeSeconds = (currentTime - lastTriggerTime) / 1000;
	
	      var lastEventStates = LimitStore.put('event.subscriptionchanged.laststates', newSubscriptionState);
	      var currentState = lastEventStates[lastEventStates.length - 1];
	      var lastState = lastEventStates[lastEventStates.length - 2];
	
	      // If event already triggered within the last second, don't re-trigger.
	      var shouldNotTriggerEvent = lastTriggerTime != null && elapsedTimeSeconds <= 1 || currentState === lastState;
	      if (shouldNotTriggerEvent === false) {
	        OneSignal._info('Triggering event onesignal.subscription.changed:', newSubscriptionState);
	        OneSignal._triggerEvent_subscriptionChanged(newSubscriptionState);
	      } else {
	        if (elapsedTimeSeconds <= 1) OneSignal._debug('SubscriptionChanged event fired, but because last event was fired in the last ', elapsedTimeSeconds, ' seconds, skipping event firing.');
	        if (currentState === lastState) OneSignal._debug('SubscriptionChanged event fired, but because the new subscription state (' + currentState + ') is the same as the last subscription state (' + lastState + '), skipping event firing.');
	      }
	    } else {
	      OneSignal._debug('SubscriptionChanged event fired, but new state is unchanged, so returning.');
	    }
	  },
	
	  init: function init(options) {
	    OneSignal._initOptions = options;
	
	    _loglevel2.default.info(("true"));
	
	    OneSignal._log('OneSignal SDK Version ' + OneSignal._VERSION);
	    if (!OneSignal.isPushNotificationsSupported()) {
	      OneSignal._warn("Your browser does not support push notifications.");
	      return;
	    }
	
	    if (navigator.permissions && !(OneSignal._isBrowserFirefox() && OneSignal._getFirefoxVersion() <= 45)) {
	      OneSignal._info("Using browser's native permission onChange() to hook permission change event.");
	      OneSignal._usingNativePermissionHook = true;
	      var currentNotificationPermission = OneSignal._getNotificationPermission();
	      LimitStore.put('notification.permission', currentNotificationPermission);
	      // If the browser natively supports hooking the subscription prompt permission change event
	      //     use it instead of our SDK method
	      navigator.permissions.query({ name: 'notifications' }).then(function (permissionStatus) {
	        permissionStatus.onchange = function () {
	          var recentPermissions = LimitStore.put('notification.permission', this.state);
	          var permissionBeforePrompt = recentPermissions[0];
	          var permissionsAfterPrompt = recentPermissions[1];
	          OneSignal._triggerEvent_nativePromptPermissionChanged(permissionBeforePrompt, permissionsAfterPrompt);
	        };
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	    } else {
	      var currentNotificationPermission = OneSignal._getNotificationPermission();
	      LimitStore.put('notification.permission', currentNotificationPermission);
	    }
	
	    // Store the current value of Ids:registrationId, so that we can see if the value changes in the future
	    OneSignal._getDbValue('Ids', 'userId').then(function (result) {
	      var storeValue = result ? result.id : null;
	      LimitStore.put('db.ids.userId', storeValue);
	    });
	
	    // Store the current value of subscription, so that we can see if the value changes in the future
	    OneSignal._getSubscription(function (currentSubscription) {
	      LimitStore.put('subscription.value', currentSubscription);
	    });
	
	    window.addEventListener('onesignal.prompt.native.permissionchanged', OneSignal.onNativePromptChanged);
	    window.addEventListener('onesignal.subscription.changed', OneSignal._onSubscriptionChanged);
	    window.addEventListener('onesignal.db.valueretrieved', OneSignal._onDbValueRetrieved);
	    window.addEventListener('onesignal.db.valueset', OneSignal._onDbValueSet);
	    window.addEventListener('onesignal.db.valueset', OneSignal._onDbValueSet);
	    window.addEventListener('onesignal.internal.subscriptionset', OneSignal._onInternalSubscriptionSet);
	
	    OneSignal._useHttpMode = !OneSignal._isSupportedSafari() && (!OneSignal._supportsDirectPermission() || OneSignal._initOptions.subdomainName);
	
	    if (OneSignal._useHttpMode) OneSignal._initOneSignalHttp = 'https://' + OneSignal._initOptions.subdomainName + '.onesignal.com/sdks/initOneSignalHttp';else OneSignal._initOneSignalHttp = 'https://onesignal.com/sdks/initOneSignalHttps';
	
	    if (OneSignal._IS_DEV) OneSignal._initOneSignalHttp = 'https://192.168.1.206:3000/dev_sdks/initOneSignalHttp';
	
	    // If Safari - add 'fetch' pollyfill if it isn't already added.
	    if (OneSignal._isSupportedSafari() && typeof window.fetch == "undefined") {
	      var s = document.createElement('script');
	      s.setAttribute('src', "https://cdnjs.cloudflare.com/ajax/libs/fetch/0.9.0/fetch.js");
	      document.head.appendChild(s);
	    }
	
	    if (document.readyState === "complete") OneSignal._internalInit();else window.addEventListener('load', OneSignal._internalInit);
	  },
	
	  _internalInit: function _internalInit() {
	    Promise.all([OneSignal._getDbValue('Ids', 'appId'), OneSignal._getDbValue('Ids', 'registrationId'), OneSignal._getDbValue('Options', 'subscription')]).then(function _internalInit_GotAppRegistrationSubscriptionIds(result) {
	      var appIdResult = result[0];
	      var registrationIdResult = result[1];
	      var subscriptionResult = result[2];
	
	      // If AppId changed delete playerId and continue.
	      if (appIdResult && appIdResult.id != OneSignal._initOptions.appId) {
	        OneSignal._deleteDbValue("Ids", "userId");
	        sessionStorage.removeItem("ONE_SIGNAL_SESSION");
	      }
	
	      // HTTPS - Only register for push notifications once per session or if the user changes notification permission to Ask or Allow.
	      if (sessionStorage.getItem("ONE_SIGNAL_SESSION") && !OneSignal._initOptions.subdomainName && (Notification.permission == "denied" || sessionStorage.getItem("ONE_SIGNAL_NOTIFICATION_PERMISSION") == Notification.permission)) return;
	
	      sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);
	
	      if (OneSignal._initOptions.autoRegister == false && !registrationIdResult && OneSignal._initOptions.subdomainName == null) return;
	
	      if (document.visibilityState != "visible") {
	        document.addEventListener("visibilitychange", OneSignal._visibilitychange);
	        return;
	      }
	
	      OneSignal._sessionInit({});
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	  },
	
	  registerForPushNotifications: function registerForPushNotifications(options) {
	    // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
	    //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
	    if (!options) options = {};
	    options.fromRegisterFor = true;
	    OneSignal._sessionInit(options);
	  },
	
	  // Http only - Only called from iframe's init.js
	  _initHttp: function _initHttp(options) {
	    OneSignal._initOptions = options;
	
	    if (options.continuePressed) {
	      OneSignal.setSubscription(true);
	    }
	
	    var isIframe = parent != null && parent != window;
	    var creator = opener || parent;
	
	    if (!creator) {
	      OneSignal._log("ERROR:_initHttp: No opener or parent found!");
	      return;
	    }
	    // Setting up message channel to receive message from host page.
	    var messageChannel = new MessageChannel();
	    messageChannel.port1.onmessage = function (event) {
	      OneSignal._log("_initHttp.messageChannel.port1.onmessage", event);
	
	      if (event.data.initOptions) {
	        OneSignal.setDefaultNotificationUrl(event.data.initOptions.defaultUrl);
	        OneSignal.setDefaultTitle(event.data.initOptions.defaultTitle);
	        if (event.data.initOptions.defaultIcon) OneSignal.setDefaultIcon(event.data.initOptions.defaultIcon);
	
	        OneSignal._log("document.URL", event.data.initOptions.parent_url);
	        OneSignal._getDbValue("NotificationOpened", event.data.initOptions.parent_url).then(function registerForPushNotifications_GotNotificationOpened(notificationOpenedResult) {
	          OneSignal._log("_initHttp NotificationOpened db", notificationOpenedResult);
	          if (notificationOpenedResult) {
	            OneSignal._deleteDbValue("NotificationOpened", event.data.initOptions.parent_url);
	            OneSignal._log("OneSignal._safePostMessage:targetOrigin:", OneSignal._initOptions.origin);
	
	            OneSignal._safePostMessage(creator, { openedNotification: notificationOpenedResult.data }, OneSignal._initOptions.origin, null);
	          }
	        }).catch(function (e) {
	          OneSignal._error(e.stack);
	        });
	        ;
	      } else if (event.data.getNotificationPermission) {
	        OneSignal._getSubdomainState(function (curState) {
	          OneSignal._safePostMessage(creator, { currentNotificationPermission: curState }, OneSignal._initOptions.origin, null);
	        });
	      } else if (event.data.setSubdomainState) OneSignal.setSubscription(event.data.setSubdomainState.setSubscription);
	    };
	
	    OneSignal._getSubdomainState(function (curState) {
	      curState["isIframe"] = isIframe;
	      OneSignal._safePostMessage(creator, { oneSignalInitPageReady: curState }, OneSignal._initOptions.origin, [messageChannel.port2]);
	    });
	
	    OneSignal._initSaveState();
	    OneSignal._httpRegistration = true;
	    if (location.search.indexOf("?session=true") == 0) return;
	
	    OneSignal._getPlayerId(null, function (player_id) {
	      if (!isIframe || player_id) {
	        OneSignal._log("Before navigator.serviceWorker.register");
	        navigator.serviceWorker.register(OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	        OneSignal._log("After navigator.serviceWorker.register");
	      }
	    });
	  },
	
	  _getSubdomainState: function _getSubdomainState(callback) {
	    var state = {};
	
	    Promise.all([OneSignal._getDbValue('Ids', 'userId'), OneSignal._getDbValue('Ids', 'registrationId'), OneSignal._getDbValue('Options', 'subscription')]).then(function _internalInit_GotAppRegistrationSubscriptionIds(result) {
	      var userIdResult = result[0];
	      var registrationIdResult = result[1];
	      var subscriptionResult = result[2];
	
	      callback({
	        userId: userIdResult ? userIdResult.id : null,
	        registrationId: registrationIdResult ? registrationIdResult.id : null,
	        notifPermssion: Notification.permission,
	        subscriptionSet: subscriptionResult ? subscriptionResult.value : null,
	        isPushEnabled: Notification.permission == "granted" && userIdResult && registrationIdResult && (subscriptionResult && subscriptionResult.value || subscriptionResult == null)
	      });
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  _initSaveState: function _initSaveState() {
	    OneSignal._app_id = OneSignal._initOptions.appId;
	    OneSignal._putDbValue("Ids", { type: "appId", id: OneSignal._app_id });
	    OneSignal._putDbValue("Options", { key: "pageTitle", value: document.title });
	  },
	
	  _supportsDirectPermission: function _supportsDirectPermission() {
	    return OneSignal._isSupportedSafari() || location.protocol == 'https:' || location.host.indexOf("localhost") == 0 || location.host.indexOf("127.0.0.1") == 0;
	  },
	
	  _sessionInit: function _sessionInit(options) {
	    OneSignal._log("_sessionInit:", options);
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
	
	        var left = thisWidth / 2 - childWidth / 2 + dualScreenLeft;
	        var top = thisHeight / 2 - childHeight / 2 + dualScreenTop;
	
	        OneSignal._log('Opening popup window.');
	        var message_localization_opts = OneSignal._initOptions['promptOptions'];
	        var message_localization_opts_str = '';
	        if (message_localization_opts) {
	          var message_localization_params = ['actionMessage', 'exampleNotificationTitleDesktop', 'exampleNotificationMessageDesktop', 'exampleNotificationTitleMobile', 'exampleNotificationMessageMobile', 'exampleNotificationCaption', 'acceptButtonText', 'cancelButtonText'];
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
	
	        if (childWindow) childWindow.focus();
	      } else {
	        OneSignal._log('Opening iFrame.');
	        OneSignal._addSessionIframe(hostPageProtocol);
	      }
	
	      return;
	    }
	
	    if (OneSignal._isSupportedSafari()) {
	      if (OneSignal._initOptions.safari_web_id) {
	        var notificationPermissionBeforeRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
	        window.safari.pushNotification.requestPermission(OneSignal._HOST_URL + 'safari', OneSignal._initOptions.safari_web_id, { app_id: OneSignal._app_id }, function (data) {
	          OneSignal._log(data);
	          var notificationPermissionAfterRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
	          if (data.deviceToken) {
	            OneSignal._registerWithOneSignal(OneSignal._app_id, data.deviceToken.toLowerCase(), 7);
	          } else {
	            sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
	          }
	          OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest);
	        });
	      }
	    } else if (options.modalPrompt && options.fromRegisterFor) {
	      // If HTTPS - Show modal
	      if (!OneSignal.isPushNotificationsSupported()) {
	        OneSignal._warn('An attempt was made to open the HTTPS modal permission prompt, but push notifications are not supported on this browser. Opening canceled.');
	        return;
	      }
	      OneSignal.isPushNotificationsEnabled(function (pushEnabled) {
	        var element = document.createElement('div');
	        element.setAttribute('id', 'OneSignal-iframe-modal');
	        element.innerHTML = '<div id="notif-permission" style="background: rgba(0, 0, 0, 0.7); position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9000; display: block"></div>';
	        document.body.appendChild(element);
	
	        var iframeStyle = document.createElement('style');
	        iframeStyle.innerHTML = "@media (max-width: 560px) { .OneSignal-permission-iframe { width: 100%; height: 100%;} }" + "@media (min-width: 561px) { .OneSignal-permission-iframe { top: 50%; left: 50%; margin-left: -275px; margin-top: -248px;} }";
	        document.getElementsByTagName('head')[0].appendChild(iframeStyle);
	
	        var iframeNode = document.createElement("iframe");
	        iframeNode.className = "OneSignal-permission-iframe";
	        iframeNode.style.cssText = "background: rgba(255, 255, 255, 1); position: fixed;";
	        iframeNode.src = OneSignal._initOneSignalHttp + '?id=' + OneSignal._app_id + '&httpsPrompt=true' + '&pushEnabled=' + pushEnabled + '&permissionBlocked=' + (typeof Notification === "undefined" || Notification.permission == "denied") + '&hostPageProtocol=' + hostPageProtocol;
	        iframeNode.setAttribute('frameborder', '0');
	        iframeNode.width = OneSignal._windowWidth.toString();
	        iframeNode.height = OneSignal._windowHeight.toString();
	
	        OneSignal._log('Opening HTTPS modal prompt.');
	        document.getElementById("notif-permission").appendChild(iframeNode);
	      });
	    } else if ('serviceWorker' in navigator) // If HTTPS - Show native prompt
	      OneSignal._registerForW3CPush(options);else OneSignal._log('Service workers are not supported in this browser.');
	  },
	
	  _registerForW3CPush: function _registerForW3CPush(options) {
	
	    OneSignal._getDbValue('Ids', 'registrationId').then(function _registerForW3CPush_GotRegistrationId(registrationIdResult) {
	      if (!registrationIdResult || !options.fromRegisterFor || Notification.permission != "granted") {
	        navigator.serviceWorker.getRegistration().then(function (event) {
	          var sw_path = "";
	
	          if (OneSignal._initOptions.path) sw_path = OneSignal._initOptions.path;
	
	          if (typeof event === "undefined") // Nothing registered, very first run
	            navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);else {
	            if (event.active) {
	              if (event.active.scriptURL.indexOf(sw_path + OneSignal.SERVICE_WORKER_PATH) > -1) {
	
	                OneSignal._getDbValue('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION').then(function (versionResult) {
	                  if (versionResult) {
	                    if (versionResult.id != OneSignal._VERSION) {
	                      event.unregister().then(function () {
	                        navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                      }).catch(function (e) {
	                        OneSignal._error(e.stack);
	                      });
	                      ;
	                    } else navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                  } else navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                }).catch(function (e) {
	                  OneSignal._error(e.stack);
	                });
	                ;
	              } else if (event.active.scriptURL.indexOf(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH) > -1) {
	
	                OneSignal._getDbValue('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION').then(function (versionResult) {
	                  if (versionResult) {
	                    if (versionResult.id != OneSignal._VERSION) {
	                      event.unregister().then(function () {
	                        navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                      });
	                    } else navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                  } else navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                }).catch(function (e) {
	                  OneSignal._error(e.stack);
	                });
	                ;
	              }
	            } else if (event.installing == null) navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	          }
	        }).catch(function (e) {
	          OneSignal._error(e.stack);
	        });
	      }
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  _addSessionIframe: function _addSessionIframe(hostPageProtocol) {
	
	    var node = document.createElement("iframe");
	    node.style.display = "none";
	    node.src = OneSignal._initOneSignalHttp + "Iframe";
	    if (sessionStorage.getItem("ONE_SIGNAL_SESSION")) node.src += "?session=true" + "&hostPageProtocol=" + hostPageProtocol;else node.src += "?hostPageProtocol=" + hostPageProtocol;
	    document.body.appendChild(node);
	    OneSignal._log('Adding session iFrame.');
	
	    OneSignal._sessionIframeAdded = true;
	  },
	
	  _registerError: function _registerError(err) {
	    OneSignal._log("navigator.serviceWorker.register:ERROR: " + err);
	  },
	
	  _enableNotifications: function _enableNotifications(existingServiceWorkerRegistration) {
	    // is ServiceWorkerRegistration type
	    OneSignal._log("_enableNotifications: ", existingServiceWorkerRegistration);
	
	    if (!('PushManager' in window)) {
	      OneSignal._log("Push messaging is not supported. No PushManager.");
	      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
	      return;
	    }
	
	    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
	      OneSignal._log("Notifications are not supported. showNotification not available in ServiceWorkerRegistration.");
	      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
	      return;
	    }
	
	    if (Notification.permission === 'denied') {
	      OneSignal._warn("The user has disabled notifications.");
	      return;
	    }
	
	    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
	      OneSignal._log(serviceWorkerRegistration);
	
	      OneSignal._subscribeForPush(serviceWorkerRegistration);
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  /*
	   Returns the current browser-agnostic notification permission as "default", "granted", "denied".
	   safariWebId: Used only to get the current notification permission state in Safari (required as part of the spec).
	   */
	  _getNotificationPermission: function _getNotificationPermission(safariWebId) {
	    if (window.safari) {
	      // The user is on Safari
	      // A web ID is required to determine the current notificiation permission
	      if (safariWebId) {
	        return window.safari.pushNotification.permission(safariWebId).permission;
	      } else {
	        // The user didn't set up Safari web push properly; notifications are unlikely to be enabled
	        return "default";
	      }
	    } else {
	      // Identical API on Firefox and Chrome
	      return Notification.permission;
	    }
	  },
	
	  _triggerEvent: function _triggerEvent(eventName, data) {
	    if (typeof window === "undefined") {
	      OneSignal._debug('Skipping triggering of event:', eventName, 'because we are running in a ServiceWorker context.');
	      return;
	    }
	    var event = new CustomEvent(eventName, {
	      bubbles: true, cancelable: true, details: data
	    });
	    window.dispatchEvent(event);
	  },
	
	  _triggerEvent_customPromptClicked: function _triggerEvent_customPromptClicked(clickResult) {
	    OneSignal._triggerEvent('onesignal.prompt.custom.clicked', {
	      result: clickResult
	    });
	  },
	
	  _triggerEvent_nativePromptPermissionChanged: function _triggerEvent_nativePromptPermissionChanged(from, to) {
	    if (to === undefined) {
	      to = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
	    }
	    if (from !== to) {
	      OneSignal._triggerEvent('onesignal.prompt.native.permissionchanged', {
	        from: from,
	        to: to
	      });
	    }
	  },
	
	  _triggerEvent_subscriptionChanged: function _triggerEvent_subscriptionChanged(to) {
	    OneSignal._triggerEvent('onesignal.subscription.changed', to);
	  },
	
	  _triggerEvent_dbValueRetrieved: function _triggerEvent_dbValueRetrieved(value) {
	    OneSignal._triggerEvent('onesignal.db.valueretrieved', value);
	  },
	
	  _triggerEvent_dbValueSet: function _triggerEvent_dbValueSet(value) {
	    OneSignal._triggerEvent('onesignal.db.valueset', value);
	  },
	
	  _triggerEvent_internalSubscriptionSet: function _triggerEvent_internalSubscriptionSet(value) {
	    OneSignal._triggerEvent('onesignal.internal.subscriptionset', value);
	  },
	
	  _subscribeForPush: function _subscribeForPush(serviceWorkerRegistration) {
	    OneSignal._log('_subscribeForPush:', 'navigator.serviceWorker.ready.then');
	
	    var notificationPermissionBeforeRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
	    serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true }).then(function (subscription) {
	      sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);
	
	      OneSignal._getDbValue('Ids', 'appId').then(function _subscribeForPush_GotAppId(appIdResult) {
	        var appId = appIdResult.id;
	        OneSignal._debug("serviceWorkerRegistration.pushManager.subscribe()");
	
	        var registrationId = null;
	        if (subscription) {
	          if (typeof subscription.subscriptionId != "undefined") // Chrome 43 & 42
	            registrationId = subscription.subscriptionId;else // Chrome 44+ and FireFox
	            registrationId = subscription.endpoint.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
	          OneSignal._debug('registration id is:' + registrationId);
	        } else OneSignal._log('Error could not subscribe your browser for push!');
	
	        OneSignal._registerWithOneSignal(appId, registrationId, OneSignal._isSupportedFireFox() ? 8 : 5);
	
	        if (!OneSignal._usingNativePermissionHook) OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest);
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	    }).catch(function (e) {
	      OneSignal._error('Error during subscribe():', e);
	
	      if (!OneSignal._usingNativePermissionHook) OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest);
	
	      if (e.code == 20 && opener && OneSignal._httpRegistration) window.close();
	    });
	  },
	
	  sendTag: function sendTag(key, value) {
	    var jsonKeyValue = {};
	    jsonKeyValue[key] = value;
	    OneSignal.sendTags(jsonKeyValue);
	  },
	
	  sendTags: function sendTags(jsonPair) {
	    OneSignal._getDbValue('Ids', 'userId').then(function sendTags_GotUserId(userIdResult) {
	      if (userIdResult) OneSignal._sendToOneSignalApi("players/" + userIdResult.id, "PUT", {
	        app_id: OneSignal._app_id,
	        tags: jsonPair
	      });else {
	        if (OneSignal._tagsToSendOnRegister == null) OneSignal._tagsToSendOnRegister = jsonPair;else {
	          var resultObj = {};
	          for (var _obj in OneSignal._tagsToSendOnRegister) {
	            resultObj[_obj] = OneSignal._tagsToSendOnRegister[_obj];
	          }for (var _obj in jsonPair) {
	            resultObj[_obj] = jsonPair[_obj];
	          }OneSignal._tagsToSendOnRegister = resultObj;
	        }
	      }
	    }).catch(function (e) {
	      OneSignal._error('sendTags:', e);
	    });
	  },
	
	  deleteTag: function deleteTag(key) {
	    OneSignal.deleteTags([key]);
	  },
	
	  deleteTags: function deleteTags(keyArray) {
	    var jsonPair = {};
	    var length = keyArray.length;
	    for (var i = 0; i < length; i++) {
	      jsonPair[keyArray[i]] = "";
	    }OneSignal.sendTags(jsonPair);
	  },
	
	  _handleNotificationOpened: function _handleNotificationOpened(event) {
	    var notificationData = JSON.parse(event.notification.tag);
	    event.notification.close();
	
	    Promise.all([OneSignal._getDbValue('Ids', 'appId'), OneSignal._getDbValue('Ids', 'userId')]).then(function _handleNotificationOpened_GotAppUserIds(results) {
	      var appIdResult = results[0];
	      var userIdResult = results[1];
	      if (appIdResult && userIdResult) {
	        OneSignal._sendToOneSignalApi("notifications/" + notificationData.id, "PUT", {
	          app_id: appIdResult.id,
	          player_id: userIdResult.id,
	          opened: true
	        });
	      }
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	
	    event.waitUntil(clients.matchAll({ type: "window" }).then(function (clientList) {
	      var launchURL = registration.scope;
	      if (OneSignal._defaultLaunchURL) launchURL = OneSignal._defaultLaunchURL;
	      if (notificationData.launchURL) launchURL = notificationData.launchURL;
	
	      for (var i = 0; i < clientList.length; i++) {
	        var client = clientList[i];
	        if ('focus' in client && client.url == launchURL) {
	          client.focus();
	
	          // targetOrigin not valid here as the service worker owns the page.
	          client.postMessage(notificationData);
	          return;
	        }
	      }
	
	      OneSignal._putDbValue("NotificationOpened", { url: launchURL, data: notificationData });
	      clients.openWindow(launchURL).catch(function (error) {
	        // Should only fall into here if going to an external URL on Chrome older than 43.
	        clients.openWindow(registration.scope + "redirector.html?url=" + launchURL);
	      });
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    }));
	  },
	
	  _getTitle: function _getTitle(incomingTitle, callback) {
	    if (incomingTitle != null) {
	      callback(incomingTitle);
	      return;
	    }
	
	    Promise.all([OneSignal._getDbValue('Options', 'defaultTitle'), OneSignal._getDbValue('Options', 'pageTitle')]).then(function _getTitle_GotDefaultPageTitles(results) {
	      var defaultTitleResult = results[0];
	      var pageTitleResult = results[1];
	
	      if (defaultTitleResult) {
	        callback(defaultTitleResult.value);
	        return;
	      } else if (pageTitleResult && pageTitleResult.value != null) {
	        callback(pageTitleResult.value);
	        return;
	      } else {
	        callback('');
	      }
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	  },
	
	  // Displays notification from content received from OneSignal.
	  _handleGCMMessage: function _handleGCMMessage(serviceWorker, event) {
	    // TODO: Read data from the GCM payload when Chrome no longer requires the below command line parameter.
	    // --enable-push-message-payload
	    // The command line param is required even on Chrome 43 nightly build 2015/03/17.
	    if (event.data && event.data.text()[0] == "{") {
	      OneSignal._log('Received data.text: ', event.data.text());
	      OneSignal._log('Received data.json: ', event.data.json());
	    }
	
	    event.waitUntil(new Promise(function (resolve, reject) {
	      OneSignal._getTitle(null, function (title) {
	        OneSignal._getDbValue('Options', 'defaultIcon').then(function _handleGCMMessage_GotDefaultIcon(defaultIconResult) {
	          OneSignal._getLastNotifications(function (response, appId) {
	            var notificationData = {
	              id: response.custom.i,
	              message: response.alert,
	              additionalData: response.custom.a
	            };
	
	            if (response.title) notificationData.title = response.title;else notificationData.title = title;
	
	            if (response.custom.u) notificationData.launchURL = response.custom.u;
	
	            if (response.icon) notificationData.icon = response.icon;else if (defaultIconResult) notificationData.icon = defaultIconResult.value;
	
	            // Never nest the following line in a callback from the point of entering from _getLastNotifications
	            serviceWorker.registration.showNotification(notificationData.title, {
	              body: response.alert,
	              icon: notificationData.icon,
	              tag: JSON.stringify(notificationData)
	            }).then(resolve).catch(function (e) {
	              OneSignal._error(e.stack);
	            });
	
	            OneSignal._getDbValue('Options', 'defaultUrl').then(function (defaultUrlResult) {
	              if (defaultUrlResult) OneSignal._defaultLaunchURL = defaultUrlResult.value;
	            }).catch(function (e) {
	              OneSignal._error(e.stack);
	            });
	            ;
	          }, resolve);
	        }).catch(function (e) {
	          OneSignal._error(e.stack);
	        });
	      });
	    }));
	  },
	
	  _getLastNotifications: function _getLastNotifications(itemCallback, completeCallback) {
	    OneSignal._getDbValue('Ids', 'userId').then(function _getLastNotifications_GotUserId(userIdResult) {
	      if (userIdResult) {
	        OneSignal._sendToOneSignalApi("players/" + userIdResult.id + "/chromeweb_notification", "GET", null, function (response) {
	          for (var i = 0; i < response.length; i++) {
	            itemCallback(JSON.parse(response[i]));
	          }
	        }, function () {
	          completeCallback();
	        }); // Failed callback
	      } else {
	          OneSignal._log("Error: could not get notificationId");
	          completeCallback();
	        }
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  // HTTP & HTTPS - Runs on main page
	  _listener_receiveMessage: function receiveMessage(event) {
	    OneSignal._log("_listener_receiveMessage: ", event);
	
	    if (OneSignal._initOptions == undefined) return;
	
	    if (!OneSignal._IS_DEV && event.origin !== "" && event.origin !== "https://onesignal.com" && event.origin !== "https://" + OneSignal._initOptions.subdomainName + ".onesignal.com") return;
	
	    if (event.data.oneSignalInitPageReady) {
	      // Only called on HTTP pages.
	      OneSignal._getDbValues("Options").then(function _listener_receiveMessage(options) {
	        OneSignal._log("current options", options);
	        if (!options.defaultUrl) options.defaultUrl = document.URL;
	        if (!options.defaultTitle) options.defaultTitle = document.title;
	
	        options.parent_url = document.URL;
	        OneSignal._log("Posting message to port[0]", event.ports[0]);
	        event.ports[0].postMessage({ initOptions: options });
	      }).catch(function (e) {
	        OneSignal._error('_listener_receiveMessage:', e);
	      });
	
	      var eventData = event.data.oneSignalInitPageReady;
	
	      if (eventData.isIframe) OneSignal._iframePort = event.ports[0];
	
	      if (eventData.userId) OneSignal._putDbValue("Ids", { type: "userId", id: eventData.userId });
	      if (eventData.registrationId) OneSignal._putDbValue("Ids", { type: "registrationId", id: eventData.registrationId });
	
	      OneSignal._fireNotificationEnabledCallback(eventData.isPushEnabled);
	      OneSignal._sendUnsentTags();
	    } else if (event.data.currentNotificationPermission) // Subdomain Only
	      OneSignal._fireNotificationEnabledCallback(event.data.currentNotificationPermission.isPushEnabled);else if (event.data.idsAvailable) {
	      // Only called on HTTP pages.
	      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
	      OneSignal._putDbValue("Ids", { type: "userId", id: event.data.idsAvailable.userId });
	      OneSignal._putDbValue("Ids", { type: "registrationId", id: event.data.idsAvailable.registrationId });
	
	      if (OneSignal._idsAvailable_callback.length > 0) {
	        while (OneSignal._idsAvailable_callback.length > 0) {
	          var curr_callback = OneSignal._idsAvailable_callback.pop();
	          curr_callback({
	            userId: event.data.idsAvailable.userId,
	            registrationId: event.data.idsAvailable.registrationId
	          });
	        }
	      }
	      OneSignal._sendUnsentTags();
	    } else if (event.data.httpsPromptAccepted) {
	      // HTTPS Only
	      OneSignal.registerForPushNotifications();
	      OneSignal.setSubscription(true);
	      (elem = document.getElementById('OneSignal-iframe-modal')).parentNode.removeChild(elem);
	      OneSignal._triggerEvent_customPromptClicked('granted');
	    } else if (event.data.httpsPromptCanceled) {
	      // HTTPS Only
	      (elem = document.getElementById('OneSignal-iframe-modal')).parentNode.removeChild(elem);
	      OneSignal._triggerEvent_customPromptClicked('denied');
	    } else if (event.data.httpPromptAccepted) {
	      // HTTP Only
	      OneSignal._triggerEvent_customPromptClicked('granted');
	    } else if (event.data.httpPromptCanceled) {
	      // HTTP Only
	      OneSignal._triggerEvent_customPromptClicked('denied');
	    } else if (OneSignal._notificationOpened_callback) // HTTP and HTTPS
	      OneSignal._notificationOpened_callback(event.data);
	  },
	
	  addListenerForNotificationOpened: function addListenerForNotificationOpened(callback) {
	    OneSignal._notificationOpened_callback = callback;
	    if (window) {
	      OneSignal._getDbValue("NotificationOpened", document.URL).then(function (notificationOpenedResult) {
	        if (notificationOpenedResult) {
	          OneSignal._deleteDbValue("NotificationOpened", document.URL);
	          OneSignal._notificationOpened_callback(notificationOpenedResult.data);
	        }
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      });
	      ;
	    }
	  },
	
	  // Subdomain - Fired from message received from iframe.
	  _fireNotificationEnabledCallback: function _fireNotificationEnabledCallback(notifPermssion) {
	    if (OneSignal._isNotificationEnabledCallback) {
	      OneSignal._isNotificationEnabledCallback(notifPermssion);
	      OneSignal._isNotificationEnabledCallback = null;
	    }
	  },
	
	  getIdsAvailable: function getIdsAvailable(callback) {
	    if (callback === undefined) return;
	
	    OneSignal._idsAvailable_callback.push(callback);
	
	    Promise.all([OneSignal._getDbValue('Ids', 'userId'), OneSignal._getDbValue('Ids', 'registrationId')]).then(function getIdsAvailable_GotUserRegistrationIds(results) {
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
	        } else while (OneSignal._idsAvailable_callback.length > 0) {
	          var curr_callback = OneSignal._idsAvailable_callback.pop();
	          curr_callback({ userId: userIdResult.id, registrationId: null });
	        }
	      }
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  getTags: function getTags(callback) {
	    OneSignal._getDbValue('Ids', 'userId').then(function (userIdResult) {
	      if (userIdResult) {
	        OneSignal._sendToOneSignalApi("players/" + userIdResult.id, 'GET', null, function (response) {
	          callback(response.tags);
	        });
	      }
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  isPushNotificationsEnabled: function isPushNotificationsEnabled(callback) {
	    // If Subdomain
	    if (OneSignal._initOptions.subdomainName && !OneSignal._isBrowserSafari()) {
	      OneSignal._isNotificationEnabledCallback = callback;
	      if (OneSignal._iframePort) OneSignal._iframePort.postMessage({ getNotificationPermission: true });
	      return;
	    }
	
	    // If HTTPS
	
	    Promise.all([OneSignal._getDbValue('Ids', 'registrationId'), OneSignal._getDbValue('Options', 'subscription')]).then(function (results) {
	      var registrationIdResult = results[0];
	      var subscriptionResult = results[1];
	
	      if (registrationIdResult) {
	        if (subscriptionResult && !subscriptionResult.value) return callback(false);
	
	        callback(Notification.permission == "granted");
	      } else callback(false);
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	  },
	
	  _isSupportedSafari: function _isSupportedSafari() {
	    var safariVersion = navigator.appVersion.match("Version/([0-9]?).* Safari");
	    if (safariVersion == null) return false;
	    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return false;
	    return parseInt(safariVersion[1]) > 6;
	  },
	
	  _isBrowserSafari: function _isBrowserSafari() {
	    var safariVersion = navigator.appVersion.match("Version/([0-9]?).* Safari");
	    return safariVersion != null;
	  },
	
	  _isSupportedFireFox: function _isSupportedFireFox() {
	    var fireFoxVersion = navigator.userAgent.match(/(Firefox\/)([0-9]{2,}\.[0-9]{1,})/);
	    if (fireFoxVersion) return parseInt(fireFoxVersion[2].substring(0, 2)) > 43;
	    return false;
	  },
	
	  _isBrowserFirefox: function _isBrowserFirefox() {
	    var fireFoxVersion = navigator.userAgent.match(/(Firefox\/)([0-9]{2,}\.[0-9]{1,})/);
	    return fireFoxVersion != null;
	  },
	
	  _getFirefoxVersion: function _getFirefoxVersion() {
	    var fireFoxVersion = navigator.userAgent.match(/(Firefox\/)([0-9]{2,}\.[0-9]{1,})/);
	    if (fireFoxVersion) return parseInt(fireFoxVersion[2].substring(0, 2));else return -1;
	  },
	
	  isPushNotificationsSupported: function isPushNotificationsSupported() {
	    if (OneSignal._isSupportedFireFox()) return true;
	
	    if (OneSignal._isSupportedSafari()) return true;
	
	    var chromeVersion = navigator.appVersion.match(/Chrome\/(.*?) /);
	
	    // Chrome is not found in appVersion.
	    if (!chromeVersion) return false;
	
	    // Microsoft Edge
	    if (navigator.appVersion.match(/Edge/)) return false;
	
	    // Android Chrome WebView
	    if (navigator.appVersion.match(/ wv/)) return false;
	
	    // Opera
	    if (navigator.appVersion.match(/OPR\//)) return false;
	
	    // The user is on iOS
	    if (/iPad|iPhone|iPod/.test(navigator.platform)) return false;
	
	    return parseInt(chromeVersion[1].substring(0, 2)) > 41;
	  },
	
	  _getNotificationTypes: function _getNotificationTypes(callback) {
	    OneSignal._getSubscription(function (db_subscriptionSet) {
	      callback(db_subscriptionSet ? 1 : -2);
	    });
	  },
	
	  setSubscription: function setSubscription(newSubscription) {
	    if (OneSignal._iframePort) OneSignal._iframePort.postMessage({ setSubdomainState: { setSubscription: newSubscription } });else {
	      OneSignal._getSubscription(function (currentSubscription) {
	        if (currentSubscription != newSubscription) {
	          OneSignal._putDbValue("Options", { key: "subscription", value: newSubscription });
	          OneSignal._getDbValue('Ids', 'userId').then(function (userIdResult) {
	            if (userIdResult) OneSignal._sendToOneSignalApi("players/" + userIdResult.id, "PUT", {
	              app_id: OneSignal._app_id,
	              notification_types: newSubscription ? 1 : -2
	            }, function setSubscriptionSetCallback() {
	              OneSignal._triggerEvent_internalSubscriptionSet(newSubscription);
	            });
	          }).catch(function (e) {
	            OneSignal._error(e.stack);
	          });
	        }
	      });
	    }
	  },
	
	  _getSubscription: function _getSubscription(callback) {
	    OneSignal._getDbValue('Options', 'subscription').then(function (subscriptionResult) {
	      callback(!(subscriptionResult && subscriptionResult.value == false));
	    }).catch(function (e) {
	      OneSignal._error(e.stack);
	    });
	    ;
	  },
	
	  _safePostMessage: function _safePostMessage(creator, data, targetOrigin, receiver) {
	    var tOrigin = targetOrigin.toLowerCase();
	
	    // If we are trying to target a http site allow the https version. (w/ or w/o 'wwww.' too)
	    if (tOrigin.startsWith("http://")) {
	      var queryDict = {};
	      location.search.substr(1).split("&").forEach(function (item) {
	        queryDict[item.split("=")[0]] = item.split("=")[1];
	      });
	      var validPreURLRegex = /^http(s|):\/\/(www\.|)/;
	      tOrigin = tOrigin.replace(validPreURLRegex, queryDict["hostPageProtocol"]);
	    }
	
	    if (receiver) creator.postMessage(data, tOrigin, receiver);else creator.postMessage(data, tOrigin);
	  },
	
	  _process_pushes: function _process_pushes(array) {
	    for (var i = 0; i < array.length; i++) {
	      OneSignal.push(array[i]);
	    }
	  },
	
	  push: function push(item) {
	    if (typeof item == "function") item();else {
	      var functionName = item.shift();
	      OneSignal[functionName].apply(null, item);
	    }
	  }
	};
	
	if (OneSignal._IS_DEV) {
	  OneSignal.LOGGING = true;
	  OneSignal._HOST_URL = "https://192.168.1.206:3000/api/v1/";
	}
	
	// If imported on your page.
	if (typeof window !== "undefined") window.addEventListener("message", OneSignal._listener_receiveMessage, false);else {
	  // if imported from the service worker.
	  importScripts('https://cdn.onesignal.com/sdks/serviceworker-cache-polyfill.js');
	
	  self.addEventListener('push', function (event) {
	    OneSignal._handleGCMMessage(self, event);
	  });
	  self.addEventListener('notificationclick', function (event) {
	    OneSignal._handleNotificationOpened(event);
	  });
	
	  var isSWonSubdomain = location.href.match(/https\:\/\/.*\.onesignal.com\/sdks\//) != null;
	  if (OneSignal._IS_DEV) isSWonSubdomain = true;;
	
	  self.addEventListener('install', function (event) {
	    OneSignal._log("OneSignal Installed service worker: " + OneSignal._VERSION);
	    if (self.location.pathname.indexOf("OneSignalSDKWorker.js") > -1) OneSignal._putDbValue("Ids", { type: "WORKER1_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION });else OneSignal._putDbValue("Ids", { type: "WORKER2_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION });
	
	    if (isSWonSubdomain) {
	      event.waitUntil(caches.open("OneSignal_" + OneSignal._VERSION).then(function (cache) {
	        return cache.addAll(['/sdks/initOneSignalHttpIframe', '/sdks/initOneSignalHttpIframe?session=*', '/sdks/manifest_json']);
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      }));
	    }
	  });
	
	  if (isSWonSubdomain) {
	    self.addEventListener('fetch', function (event) {
	      event.respondWith(caches.match(event.request).then(function (response) {
	        // Cache hit - return response
	        if (response) return response;
	
	        return fetch(event.request);
	      }).catch(function (e) {
	        OneSignal._error(e.stack);
	      }));
	    });
	  }
	}
	
	if (_temp_OneSignal) OneSignal._process_pushes(_temp_OneSignal);
	
	module.exports = OneSignal;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
	* loglevel - https://github.com/pimterry/loglevel
	*
	* Copyright (c) 2013 Tim Perry
	* Licensed under the MIT license.
	*/
	(function (root, definition) {
	    "use strict";
	    if (typeof module === 'object' && module.exports && "function" === 'function') {
	        module.exports = definition();
	    } else if (true) {
	        !(__WEBPACK_AMD_DEFINE_FACTORY__ = (definition), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        root.log = definition();
	    }
	}(this, function () {
	    "use strict";
	    var noop = function() {};
	    var undefinedType = "undefined";
	
	    function realMethod(methodName) {
	        if (typeof console === undefinedType) {
	            return false; // We can't build a real method without a console to log to
	        } else if (console[methodName] !== undefined) {
	            return bindMethod(console, methodName);
	        } else if (console.log !== undefined) {
	            return bindMethod(console, 'log');
	        } else {
	            return noop;
	        }
	    }
	
	    function bindMethod(obj, methodName) {
	        var method = obj[methodName];
	        if (typeof method.bind === 'function') {
	            return method.bind(obj);
	        } else {
	            try {
	                return Function.prototype.bind.call(method, obj);
	            } catch (e) {
	                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
	                return function() {
	                    return Function.prototype.apply.apply(method, [obj, arguments]);
	                };
	            }
	        }
	    }
	
	    // these private functions always need `this` to be set properly
	
	    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
	        return function () {
	            if (typeof console !== undefinedType) {
	                replaceLoggingMethods.call(this, level, loggerName);
	                this[methodName].apply(this, arguments);
	            }
	        };
	    }
	
	    function replaceLoggingMethods(level, loggerName) {
	        /*jshint validthis:true */
	        for (var i = 0; i < logMethods.length; i++) {
	            var methodName = logMethods[i];
	            this[methodName] = (i < level) ?
	                noop :
	                this.methodFactory(methodName, level, loggerName);
	        }
	    }
	
	    function defaultMethodFactory(methodName, level, loggerName) {
	        /*jshint validthis:true */
	        return realMethod(methodName) ||
	               enableLoggingWhenConsoleArrives.apply(this, arguments);
	    }
	
	    var logMethods = [
	        "trace",
	        "debug",
	        "info",
	        "warn",
	        "error"
	    ];
	
	    function Logger(name, defaultLevel, factory) {
	      var self = this;
	      var currentLevel;
	      var storageKey = "loglevel";
	      if (name) {
	        storageKey += ":" + name;
	      }
	
	      function persistLevelIfPossible(levelNum) {
	          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();
	
	          // Use localStorage if available
	          try {
	              window.localStorage[storageKey] = levelName;
	              return;
	          } catch (ignore) {}
	
	          // Use session cookie as fallback
	          try {
	              window.document.cookie =
	                encodeURIComponent(storageKey) + "=" + levelName + ";";
	          } catch (ignore) {}
	      }
	
	      function getPersistedLevel() {
	          var storedLevel;
	
	          try {
	              storedLevel = window.localStorage[storageKey];
	          } catch (ignore) {}
	
	          if (typeof storedLevel === undefinedType) {
	              try {
	                  var cookie = window.document.cookie;
	                  var location = cookie.indexOf(
	                      encodeURIComponent(storageKey) + "=");
	                  if (location) {
	                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
	                  }
	              } catch (ignore) {}
	          }
	
	          // If the stored level is not valid, treat it as if nothing was stored.
	          if (self.levels[storedLevel] === undefined) {
	              storedLevel = undefined;
	          }
	
	          return storedLevel;
	      }
	
	      /*
	       *
	       * Public API
	       *
	       */
	
	      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
	          "ERROR": 4, "SILENT": 5};
	
	      self.methodFactory = factory || defaultMethodFactory;
	
	      self.getLevel = function () {
	          return currentLevel;
	      };
	
	      self.setLevel = function (level, persist) {
	          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
	              level = self.levels[level.toUpperCase()];
	          }
	          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
	              currentLevel = level;
	              if (persist !== false) {  // defaults to true
	                  persistLevelIfPossible(level);
	              }
	              replaceLoggingMethods.call(self, level, name);
	              if (typeof console === undefinedType && level < self.levels.SILENT) {
	                  return "No console available for logging";
	              }
	          } else {
	              throw "log.setLevel() called with invalid level: " + level;
	          }
	      };
	
	      self.setDefaultLevel = function (level) {
	          if (!getPersistedLevel()) {
	              self.setLevel(level, false);
	          }
	      };
	
	      self.enableAll = function(persist) {
	          self.setLevel(self.levels.TRACE, persist);
	      };
	
	      self.disableAll = function(persist) {
	          self.setLevel(self.levels.SILENT, persist);
	      };
	
	      // Initialize with the right level
	      var initialLevel = getPersistedLevel();
	      if (initialLevel == null) {
	          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
	      }
	      self.setLevel(initialLevel, false);
	    }
	
	    /*
	     *
	     * Package-level API
	     *
	     */
	
	    var defaultLogger = new Logger();
	
	    var _loggersByName = {};
	    defaultLogger.getLogger = function getLogger(name) {
	        if (typeof name !== "string" || name === "") {
	          throw new TypeError("You must supply a name when creating a logger.");
	        }
	
	        var logger = _loggersByName[name];
	        if (!logger) {
	          logger = _loggersByName[name] = new Logger(
	            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
	        }
	        return logger;
	    };
	
	    // Grab the current global log variable in case of overwrite
	    var _log = (typeof window !== undefinedType) ? window.log : undefined;
	    defaultLogger.noConflict = function() {
	        if (typeof window !== undefinedType &&
	               window.log === defaultLogger) {
	            window.log = _log;
	        }
	
	        return defaultLogger;
	    };
	
	    return defaultLogger;
	}));


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {module.exports = global["OneSignal"] = __webpack_require__(1);
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }
/******/ ]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgY2Q0ZjA3YWE4MTNlZjAyZDBjZWEiLCJ3ZWJwYWNrOi8vLy4vc3JjL2VudHJ5LmpzIiwid2VicGFjazovLy8uL3NyYy9zZGsuanMiLCJ3ZWJwYWNrOi8vLy4vfi9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3Nkay5qcz9kZmIwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSx1QkFBZTtBQUNmO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNsQ0Esb0JBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU3QixvQkFBTyxDQUFDLENBQTJCLENBQUMsQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDa0NwQyxVQUFTLFVBQVUsR0FBRyxFQUNyQjs7QUFFRCxXQUFVLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUN0QixXQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQzs7QUFFckIsV0FBVSxDQUFDLEdBQUcsR0FBRyxVQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDckMsT0FBSSxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFNBQVMsRUFBRTtBQUN2QyxlQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDO0FBQ0QsYUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEMsT0FBSSxVQUFVLENBQUMsS0FBSyxDQUFD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O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBVzs7QUFFWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQ0FBMEM7QUFDMUM7QUFDQSxnQkFBZTtBQUNmOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxzQkFBcUI7QUFDckI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVDQUFzQztBQUN0QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFXO0FBQ1g7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEVBQUM7Ozs7Ozs7QUM5TkQsMkdBQStLLEUiLCJmaWxlIjoiT25lU2lnbmFsU0RLLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGV4cG9ydHM6IHt9LFxuIFx0XHRcdGlkOiBtb2R1bGVJZCxcbiBcdFx0XHRsb2FkZWQ6IGZhbHNlXG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmxvYWRlZCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oMCk7XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiB3ZWJwYWNrL2Jvb3RzdHJhcCBjZDRmMDdhYTgxM2VmMDJkMGNlYVxuICoqLyIsImltcG9ydCBcIi4vc2RrLmpzXCI7XG5pbXBvcnQgbG9nIGZyb20gJ2xvZ2xldmVsJztcblxuLy8gTGV0J3Mgc2VlIGFsbCBlcnJvcnNcbmxvZy5zZXREZWZhdWx0TGV2ZWwoJ3RyYWNlJyk7XG5cbnJlcXVpcmUoXCJleHBvc2U/T25lU2lnbmFsIS4vc2RrLmpzXCIpO1xuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc3JjL2VudHJ5LmpzXG4gKiovIiwiaW1wb3J0IGxvZyBmcm9tICdsb2dsZXZlbCc7XG5cblxuLyoqXG4gKiBNb2RpZmllZCBNSVQgTGljZW5zZVxuICpcbiAqIENvcHlyaWdodCAyMDE1IE9uZVNpZ25hbFxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiAxLiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogMi4gQWxsIGNvcGllcyBvZiBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUgbWF5IG9ubHkgYmUgdXNlZCBpbiBjb25uZWN0aW9uXG4gKiB3aXRoIHNlcnZpY2VzIHByb3ZpZGVkIGJ5IE9uZVNpZ25hbC5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKlxuIExpbWl0U3RvcmUucHV0KCdjb2xvcmFkbycsICdyb2NreScpO1xuIFtcInJvY2t5XCJdXG4gTGltaXRTdG9yZS5wdXQoJ2NvbG9yYWRvJywgJ21vdW50YWluJyk7XG4gW1wicm9ja3lcIiwgXCJtb3VudGFpblwiXVxuIExpbWl0U3RvcmUucHV0KCdjb2xvcmFkbycsICduYXRpb25hbCcpO1xuIFtcIm1vdW50YWluXCIsIFwibmF0aW9uYWxcIl1cbiBMaW1pdFN0b3JlLnB1dCgnY29sb3JhZG8nLCAncGFyaycpO1xuIFtcIm5hdGlvbmFsXCIsIFwicGFya1wiXVxuICovXG5mdW5jdGlvbiBMaW1pdFN0b3JlKCkge1xufVxuXG5MaW1pdFN0b3JlLnN0b3JlID0ge307XG5MaW1pdFN0b3JlLkxJTUlUID0gMjtcblxuTGltaXRTdG9yZS5wdXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICBpZiAoTGltaXRTdG9yZS5zdG9yZVtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICBMaW1pdFN0b3JlLnN0b3JlW2tleV0gPSBbbnVsbCwgbnVsbF07XG4gIH1cbiAgTGltaXRTdG9yZS5zdG9yZVtrZXldLnB1c2godmFsdWUpO1xuICBpZiAoTGltaXRTdG9yZS5zdG9yZVtrZXldLmxlbmd0aCA9PSBMaW1pdFN0b3JlLkxJTUlUICsgMSkge1xuICAgIExpbWl0U3RvcmUuc3RvcmVba2V5XS5zaGlmdCgpO1xuICB9XG4gIHJldHVybiBMaW1pdFN0b3JlLnN0b3JlW2tleV07XG59O1xuXG5MaW1pdFN0b3JlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIExpbWl0U3RvcmUuc3RvcmVba2V5XTtcbn07XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ3VzdG9tRXZlbnQoZXZlbnQsIHBhcmFtcykge1xuICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbHM6IHVuZGVmaW5lZH07XG4gICAgICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWxzKTtcbiAgICAgIHJldHVybiBldnQ7XG4gICAgfVxuXG4gICAgQ3VzdG9tRXZlbnQucHJvdG90eXBlID0gd2luZG93LkV2ZW50LnByb3RvdHlwZTtcblxuICAgIHdpbmRvdy5DdXN0b21FdmVudCA9IEN1c3RvbUV2ZW50O1xuICB9KSgpO1xufVxuXG5cbi8vIFJlcXVpcmVzIENocm9tZSA0MissIFNhZmFyaSA3Kywgb3IgRmlyZWZveCA0NCtcbi8vIFdlYiBwdXNoIG5vdGlmaWNhdGlvbnMgYXJlIHN1cHBvcnRlZCBvbiBNYWMgT1NYLCBXaW5kb3dzLCBMaW51eCwgYW5kIEFuZHJvaWQuXG52YXIgX3RlbXBfT25lU2lnbmFsID0gbnVsbDtcblxuaWYgKHR5cGVvZiBPbmVTaWduYWwgIT09IFwidW5kZWZpbmVkXCIpXG4gIF90ZW1wX09uZVNpZ25hbCA9IE9uZVNpZ25hbDtcblxudmFyIE9uZVNpZ25hbCA9IHtcbiAgX1ZFUlNJT046IDEwOTc3OCxcbiAgX0hPU1RfVVJMOiBcImh0dHBzOi8vMTkyLjE2OC4xLjIwNjozMDAwL2FwaS92MS9cIixcbiAgLy9fSE9TVF9VUkw6IFwiaHR0cHM6Ly9vbmVzaWduYWwuY29tL2FwaS92MS9cIixcbiAgX0lTX0RFVjogZmFsc2UsXG5cbiAgX2FwcF9pZDogbnVsbCxcblxuICBfdGFnc1RvU2VuZE9uUmVnaXN0ZXI6IG51bGwsXG5cbiAgX25vdGlmaWNhdGlvbk9wZW5lZF9jYWxsYmFjazogbnVsbCxcbiAgX2lkc0F2YWlsYWJsZV9jYWxsYmFjazogW10sXG5cbiAgX2RlZmF1bHRMYXVuY2hVUkw6IG51bGwsXG5cbiAgX2luaXRPcHRpb25zOiBudWxsLFxuXG4gIF9odHRwUmVnaXN0cmF0aW9uOiBmYWxzZSxcblxuICBfbWFpbl9wYWdlX3BvcnQ6IG51bGwsXG5cbiAgX2lzTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrOiBudWxsLFxuXG4gIF9zdWJzY3JpcHRpb25TZXQ6IHRydWUsXG5cbiAgX2luaXRPbmVTaWduYWxIdHRwOiBudWxsLFxuXG4gIF9zZXNzaW9uSWZyYW1lQWRkZWQ6IGZhbHNlLFxuXG4gIF91c2VIdHRwTW9kZTogbnVsbCxcblxuICBfd2luZG93V2lkdGg6IDU1MCxcblxuICBfd2luZG93SGVpZ2h0OiA0ODAsXG5cbiAgTE9HR0lORzogZmFsc2UsXG4gIExPR0dJTkdfVkVSQk9TRTogZmFsc2UsXG4gIExPR0dJTkdfVFJBQ0lORzogZmFsc2UsXG5cbiAgU0VSVklDRV9XT1JLRVJfVVBEQVRFUl9QQVRIOiBcIk9uZVNpZ25hbFNES1VwZGF0ZXJXb3JrZXIuanNcIixcbiAgU0VSVklDRV9XT1JLRVJfUEFUSDogXCJPbmVTaWduYWxTREtXb3JrZXIuanNcIixcbiAgU0VSVklDRV9XT1JLRVJfUEFSQU06IHt9LFxuXG4gIC8qXG4gICBMb2dzIHRvIGNvbnNvbGUubG9nIGlmIGxvZ2dpbmcgZW5hYmxlZC4gVGFrZXMgdmFyaWFibGUgYXJndW1lbnRzLCBmaXJzdCBtdXN0IGJlIGEgc3RyaW5nIG1lc3NhZ2UuXG4gICBTZWUgYWxzbzogaHR0cHM6Ly9naXRodWIuY29tL3BldGthYW50b25vdi9ibHVlYmlyZC93aWtpL09wdGltaXphdGlvbi1raWxsZXJzIzMtbWFuYWdpbmctYXJndW1lbnRzXG4gICAqL1xuXG4gIF9kZWJ1ZzogZnVuY3Rpb24gKCkge1xuICAgIGlmIChPbmVTaWduYWwuTE9HR0lORykge1xuICAgICAgaWYgKE9uZVNpZ25hbC5MT0dHSU5HX1ZFUkJPU0UpIHtcbiAgICAgICAgY29uc29sZVsnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKE9uZVNpZ25hbC5MT0dHSU5HX1RSQUNJTkcpIHtcbiAgICAgICAgICBjb25zb2xlWyd0cmFjZSddLmFwcGx5KGNvbnNvbGUsIFsnICddKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBfbG9nOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKE9uZVNpZ25hbC5MT0dHSU5HKSB7XG4gICAgICBjb25zb2xlWydsb2cnXS5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKE9uZVNpZ25hbC5MT0dHSU5HX1RSQUNJTkcpIHtcbiAgICAgICAgY29uc29sZVsndHJhY2UnXS5hcHBseShjb25zb2xlLCBbJyAnXSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIF9pbmZvOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKE9uZVNpZ25hbC5MT0dHSU5HKSB7XG4gICAgICBjb25zb2xlWydpbmZvJ10uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgIGlmIChPbmVTaWduYWwuTE9HR0lOR19UUkFDSU5HKSB7XG4gICAgICAgIGNvbnNvbGVbJ3RyYWNlJ10uYXBwbHkoY29uc29sZSwgWycgJ10pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBfd2FybjogZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGVbJ3dhcm4nXS5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgIGlmIChPbmVTaWduYWwuTE9HR0lOR19UUkFDSU5HKSB7XG4gICAgICBjb25zb2xlWyd0cmFjZSddLmFwcGx5KGNvbnNvbGUsIFsnICddKTtcbiAgICB9XG4gIH0sXG5cbiAgX2Vycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZVsnZXJyb3InXS5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgIGlmIChPbmVTaWduYWwuTE9HR0lOR19UUkFDSU5HKSB7XG4gICAgICBjb25zb2xlWyd0cmFjZSddLmFwcGx5KGNvbnNvbGUsIFsnICddKTtcbiAgICB9XG4gIH0sXG5cbiAgX2Vuc3VyZURiSW5zdGFuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWYgKE9uZVNpZ25hbC5fb25lU2lnbmFsX2RiKSB7XG4gICAgICAgIHJlc29sdmUoT25lU2lnbmFsLl9vbmVTaWduYWxfZGIpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gaW5kZXhlZERCLm9wZW4oXCJPTkVfU0lHTkFMX1NES19EQlwiLCAxKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgZGF0YWJhc2UgPSBldmVudC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgIE9uZVNpZ25hbC5fb25lU2lnbmFsX2RiID0gZGF0YWJhc2U7XG4gICAgICAgICAgT25lU2lnbmFsLl9kZWJ1ZygnU3VjY2VzZnVsbHkgb3BlbmVkIEluZGV4ZWREQi4nKTtcbiAgICAgICAgICByZXNvbHZlKGRhdGFiYXNlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcignVW5hYmxlIHRvIG9wZW4gSW5kZXhlZERCLicsIGV2ZW50KTtcbiAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9sb2coJ1JlY3JlYXRpbmcgc2NoZW1hIGluIEluZGV4ZWREQi4uLicpO1xuICAgICAgICAgIHZhciBkYiA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJJZHNcIiwge2tleVBhdGg6IFwidHlwZVwifSk7XG4gICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwge2tleVBhdGg6IFwidXJsXCJ9KTtcbiAgICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZShcIk9wdGlvbnNcIiwge2tleVBhdGg6IFwia2V5XCJ9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfZ2V0RGJWYWx1ZTogZnVuY3Rpb24gKHRhYmxlLCBrZXkpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgT25lU2lnbmFsLl9lbnN1cmVEYkluc3RhbmNlKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRhdGFiYXNlKSB7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSBkYXRhYmFzZS50cmFuc2FjdGlvbih0YWJsZSkub2JqZWN0U3RvcmUodGFibGUpLmdldChrZXkpO1xuICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5yZXN1bHQpXG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2RiVmFsdWVSZXRyaWV2ZWQocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICAgICAgcmVzb2x2ZShyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yQ29kZSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgICA7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2dldERiVmFsdWVzOiBmdW5jdGlvbiAodGFibGUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgT25lU2lnbmFsLl9lbnN1cmVEYkluc3RhbmNlKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRhdGFiYXNlKSB7XG4gICAgICAgICAgdmFyIGpzb25SZXN1bHQgPSB7fTtcbiAgICAgICAgICB2YXIgY3Vyc29yID0gZGF0YWJhc2UudHJhbnNhY3Rpb24odGFibGUpLm9iamVjdFN0b3JlKHRhYmxlKS5vcGVuQ3Vyc29yKCk7XG4gICAgICAgICAgY3Vyc29yLm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdmFyIGN1cnNvciA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2RiVmFsdWVSZXRyaWV2ZWQoY3Vyc29yKTtcbiAgICAgICAgICAgICAganNvblJlc3VsdFtjdXJzb3Iua2V5XSA9IGN1cnNvci52YWx1ZS52YWx1ZTtcbiAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHJlc29sdmUoanNvblJlc3VsdCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBjdXJzb3Iub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgcmVqZWN0KGN1cnNvci5lcnJvckNvZGUpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9wdXREYlZhbHVlOiBmdW5jdGlvbiAodGFibGUsIHZhbHVlKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIE9uZVNpZ25hbC5fZW5zdXJlRGJJbnN0YW5jZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhYmFzZSkge1xuICAgICAgICAgIGRhdGFiYXNlLnRyYW5zYWN0aW9uKFt0YWJsZV0sIFwicmVhZHdyaXRlXCIpLm9iamVjdFN0b3JlKHRhYmxlKS5wdXQodmFsdWUpO1xuICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2RiVmFsdWVTZXQodmFsdWUpO1xuICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBfZGVsZXRlRGJWYWx1ZTogZnVuY3Rpb24gKHRhYmxlLCBrZXkpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgT25lU2lnbmFsLl9lbnN1cmVEYkluc3RhbmNlKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRhdGFiYXNlKSB7XG4gICAgICAgICAgZGF0YWJhc2UudHJhbnNhY3Rpb24oW3RhYmxlXSwgXCJyZWFkd3JpdGVcIikub2JqZWN0U3RvcmUodGFibGUpLmRlbGV0ZShrZXkpO1xuICAgICAgICAgIHJlc29sdmUoa2V5KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgICA7XG4gICAgfSk7XG4gIH0sXG5cbiAgX3NlbmRUb09uZVNpZ25hbEFwaTogZnVuY3Rpb24gKHVybCwgYWN0aW9uLCBpbkRhdGEsIGNhbGxiYWNrLCBmYWlsZWRDYWxsYmFjaykge1xuICAgIHZhciBjb250ZW50cyA9IHtcbiAgICAgIG1ldGhvZDogYWN0aW9uLFxuICAgICAgLy9tb2RlOiAnbm8tY29ycycsIC8vIG5vLWNvcnMgaXMgZGlzYWJsZWQgZm9yIG5vbi1zZXJ2aWNld29ya2VyLlxuICAgIH07XG5cbiAgICBpZiAoaW5EYXRhKSB7XG4gICAgICBjb250ZW50cy5oZWFkZXJzID0ge1wiQ29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCJ9O1xuICAgICAgY29udGVudHMuYm9keSA9IEpTT04uc3RyaW5naWZ5KGluRGF0YSk7XG4gICAgfVxuXG4gICAgZmV0Y2goT25lU2lnbmFsLl9IT1NUX1VSTCArIHVybCwgY29udGVudHMpXG4gICAgICAudGhlbihmdW5jdGlvbiBzdGF0dXMocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwKVxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KSk7XG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24gc3RhdHVzKHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKGpzb25EYXRhKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fbG9nKGpzb25EYXRhKTtcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpXG4gICAgICAgICAgY2FsbGJhY2soanNvbkRhdGEpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKCdSZXF1ZXN0IGZhaWxlZDonLCBlKTtcbiAgICAgICAgaWYgKGZhaWxlZENhbGxiYWNrICE9IG51bGwpXG4gICAgICAgICAgZmFpbGVkQ2FsbGJhY2soKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIF9nZXRMYW5ndWFnZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuYXZpZ2F0b3IubGFuZ3VhZ2UgPyAobmF2aWdhdG9yLmxhbmd1YWdlLmxlbmd0aCA+IDMgPyBuYXZpZ2F0b3IubGFuZ3VhZ2Uuc3Vic3RyaW5nKDAsIDIpIDogbmF2aWdhdG9yLmxhbmd1YWdlKSA6ICdlbic7XG4gIH0sXG5cbiAgX2dldFBsYXllcklkOiBmdW5jdGlvbiAodmFsdWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHZhbHVlKVxuICAgICAgY2FsbGJhY2sodmFsdWUpXG4gICAgZWxzZSB7XG4gICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgICAudGhlbihmdW5jdGlvbiBfZ2V0UGxheWVySWRfZ290VXNlcklkKHJlc3VsdCkge1xuICAgICAgICAgIGlmIChyZXN1bHQpXG4gICAgICAgICAgICBjYWxsYmFjayhyZXN1bHQuaWQpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICB9KTtcbiAgICAgIDtcbiAgICB9XG4gIH0sXG5cbiAgX2dldEJyb3dzZXJOYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9DaHJvbWVcXC8oLio/KSAvKSlcbiAgICAgIHJldHVybiBcIkNocm9tZVwiO1xuICAgIGlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaChcIlZlcnNpb24vKC4qKSAoU2FmYXJpKVwiKSlcbiAgICAgIHJldHVybiBcIlNhZmFyaVwiO1xuICAgIGlmIChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9GaXJlZm94XFwvKFswLTldezIsfVxcLlswLTldezEsfSkvKSlcbiAgICAgIHJldHVybiBcIkZpcmVmb3hcIjtcblxuICAgIHJldHVybiBcIlwiO1xuICB9LFxuXG4gIF9yZWdpc3RlcldpdGhPbmVTaWduYWw6IGZ1bmN0aW9uIChhcHBJZCwgcmVnaXN0cmF0aW9uSWQsIGRldmljZVR5cGUpIHtcblxuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXG4gICAgICAudGhlbihmdW5jdGlvbiBfcmVnaXN0ZXJXaXRoT25lU2lnbmFsX0dvdFVzZXJJZCh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25UeXBlcyhmdW5jdGlvbiAobm90aWZfdHlwZXMpIHtcbiAgICAgICAgICB2YXIgcmVxdWVzdFVybCA9ICdwbGF5ZXJzJztcblxuICAgICAgICAgIHZhciBqc29uRGF0YSA9IHtcbiAgICAgICAgICAgIGFwcF9pZDogYXBwSWQsXG4gICAgICAgICAgICBkZXZpY2VfdHlwZTogZGV2aWNlVHlwZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBPbmVTaWduYWwuX2dldExhbmd1YWdlKCksXG4gICAgICAgICAgICB0aW1lem9uZTogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogLTYwLFxuICAgICAgICAgICAgZGV2aWNlX21vZGVsOiBuYXZpZ2F0b3IucGxhdGZvcm0gKyBcIiBcIiArIE9uZVNpZ25hbC5fZ2V0QnJvd3Nlck5hbWUoKSxcbiAgICAgICAgICAgIGRldmljZV9vczogKG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9DaHJvbWVcXC8oLio/KSAvKSB8fCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaChcIlZlcnNpb24vKC4qKSBTYWZhcmlcIikgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvRmlyZWZveFxcLyhbMC05XXsyLH1cXC5bMC05XXsxLH0pLykpWzFdLFxuICAgICAgICAgICAgc2RrOiBPbmVTaWduYWwuX1ZFUlNJT05cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgICAgcmVxdWVzdFVybCA9ICdwbGF5ZXJzLycgKyB1c2VySWRSZXN1bHQuaWQgKyAnL29uX3Nlc3Npb24nO1xuICAgICAgICAgICAganNvbkRhdGEubm90aWZpY2F0aW9uX3R5cGVzID0gbm90aWZfdHlwZXNcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAobm90aWZfdHlwZXMgIT0gMSlcbiAgICAgICAgICAgIGpzb25EYXRhLm5vdGlmaWNhdGlvbl90eXBlcyA9IG5vdGlmX3R5cGVzXG5cbiAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uSWQpIHtcbiAgICAgICAgICAgIGpzb25EYXRhLmlkZW50aWZpZXIgPSByZWdpc3RyYXRpb25JZDtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJyZWdpc3RyYXRpb25JZFwiLCBpZDogcmVnaXN0cmF0aW9uSWR9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBPbmVTaWduYWwuX3NlbmRUb09uZVNpZ25hbEFwaShyZXF1ZXN0VXJsLCAnUE9TVCcsIGpzb25EYXRhLFxuICAgICAgICAgICAgZnVuY3Rpb24gcmVnaXN0ZXJlZENhbGxiYWNrKHJlc3BvbnNlSlNPTikge1xuICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuXG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZUpTT04uaWQpIHtcbiAgICAgICAgICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwidXNlcklkXCIsIGlkOiByZXNwb25zZUpTT04uaWR9KTtcbiAgICAgICAgICAgICAgICBPbmVTaWduYWwuX3NlbmRVbnNlbnRUYWdzKCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBPbmVTaWduYWwuX2dldFBsYXllcklkKHJlc3BvbnNlSlNPTi5pZCwgZnVuY3Rpb24gKHVzZXJJZCkge1xuICAgICAgICAgICAgICAgIGlmIChPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICB3aGlsZSAoT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3Vycl9jYWxsYmFjayA9IE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyX2NhbGxiYWNrKHt1c2VySWQ6IHVzZXJJZCwgcmVnaXN0cmF0aW9uSWQ6IHJlZ2lzdHJhdGlvbklkfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKE9uZVNpZ25hbC5faHR0cFJlZ2lzdHJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9sb2coXCJTZW5kaW5nIHBsYXllciBJZCBhbmQgcmVnaXN0cmF0aW9uSWQgYmFjayB0byBob3N0IHBhZ2VcIik7XG4gICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX2xvZyhPbmVTaWduYWwuX2luaXRPcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgIHZhciBjcmVhdG9yID0gb3BlbmVyIHx8IHBhcmVudDtcbiAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fc2FmZVBvc3RNZXNzYWdlKGNyZWF0b3IsIHtcbiAgICAgICAgICAgICAgICAgICAgaWRzQXZhaWxhYmxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySWQsXG4gICAgICAgICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uSWQ6IHJlZ2lzdHJhdGlvbklkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0sIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMub3JpZ2luLCBudWxsKTtcblxuICAgICAgICAgICAgICAgICAgaWYgKG9wZW5lcilcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZGVidWcoXCJOTyBvcGVuZXJcIik7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG5cbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgICA7XG4gIH0sXG5cbiAgX3NlbmRVbnNlbnRUYWdzOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIpIHtcbiAgICAgIE9uZVNpZ25hbC5zZW5kVGFncyhPbmVTaWduYWwuX3RhZ3NUb1NlbmRPblJlZ2lzdGVyKTtcbiAgICAgIE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICBzZXREZWZhdWx0Tm90aWZpY2F0aW9uVXJsOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiT3B0aW9uc1wiLCB7a2V5OiBcImRlZmF1bHRVcmxcIiwgdmFsdWU6IHVybH0pO1xuICB9LFxuXG4gIHNldERlZmF1bHRJY29uOiBmdW5jdGlvbiAoaWNvbikge1xuICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIk9wdGlvbnNcIiwge2tleTogXCJkZWZhdWx0SWNvblwiLCB2YWx1ZTogaWNvbn0pO1xuICB9LFxuXG4gIHNldERlZmF1bHRUaXRsZTogZnVuY3Rpb24gKHRpdGxlKSB7XG4gICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiT3B0aW9uc1wiLCB7a2V5OiBcImRlZmF1bHRUaXRsZVwiLCB2YWx1ZTogdGl0bGV9KTtcbiAgfSxcblxuICBfdmlzaWJpbGl0eWNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPT0gXCJ2aXNpYmxlXCIpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsIE9uZVNpZ25hbC5fdmlzaWJpbGl0eWNoYW5nZSk7XG4gICAgICBPbmVTaWduYWwuX3Nlc3Npb25Jbml0KHt9KTtcbiAgICB9XG4gIH0sXG5cbiAgb25OYXRpdmVQcm9tcHRDaGFuZ2VkOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2xvZygnRXZlbnQgb25lc2lnbmFsLnByb21wdC5uYXRpdmUucGVybWlzc2lvbmNoYW5nZWQ6JywgZXZlbnQuZGV0YWlsKTtcbiAgICBPbmVTaWduYWwuX2NoZWNrVHJpZ2dlcl9ldmVudFN1YnNjcmlwdGlvbkNoYW5nZWQoKTtcbiAgfSxcblxuICBfb25TdWJzY3JpcHRpb25DaGFuZ2VkOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2xvZygnRXZlbnQgb25lc2lnbmFsLnN1YnNjcmlwdGlvbi5jaGFuZ2VkOicsIGV2ZW50LmRldGFpbCk7XG4gIH0sXG5cbiAgX29uRGJWYWx1ZVJldHJpZXZlZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgT25lU2lnbmFsLl9sb2coJ0V2ZW50IG9uZXNpZ25hbC5kYi5yZXRyaWV2ZWQ6JywgZXZlbnQuZGV0YWlsKTtcbiAgfSxcblxuICBfb25EYlZhbHVlU2V0OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2xvZygnRXZlbnQgb25lc2lnbmFsLmRiLnZhbHVlc2V0OicsIGV2ZW50LmRldGFpbCk7XG4gICAgdmFyIGluZm8gPSBldmVudC5kZXRhaWw7XG4gICAgaWYgKGluZm8udHlwZSA9PT0gJ3VzZXJJZCcpIHtcbiAgICAgIExpbWl0U3RvcmUucHV0KCdkYi5pZHMudXNlcklkJywgaW5mby5pZCk7XG4gICAgICBPbmVTaWduYWwuX2NoZWNrVHJpZ2dlcl9ldmVudFN1YnNjcmlwdGlvbkNoYW5nZWQoKTtcbiAgICB9XG4gIH0sXG5cbiAgX29uSW50ZXJuYWxTdWJzY3JpcHRpb25TZXQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIE9uZVNpZ25hbC5fbG9nKCdFdmVudCBvbmVzaWduYWwuaW50ZXJuYWwuc3Vic2NyaXB0aW9uc2V0OicsIGV2ZW50LmRldGFpbCk7XG4gICAgdmFyIG5ld1N1YnNjcmlwdGlvblZhbHVlID0gZXZlbnQuZGV0YWlsO1xuICAgIExpbWl0U3RvcmUucHV0KCdzdWJzY3JpcHRpb24udmFsdWUnLCBuZXdTdWJzY3JpcHRpb25WYWx1ZSk7XG4gICAgT25lU2lnbmFsLl9jaGVja1RyaWdnZXJfZXZlbnRTdWJzY3JpcHRpb25DaGFuZ2VkKCk7XG4gIH0sXG5cbiAgX2NoZWNrVHJpZ2dlcl9ldmVudFN1YnNjcmlwdGlvbkNoYW5nZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGVybWlzc2lvbnMgPSBMaW1pdFN0b3JlLmdldCgnbm90aWZpY2F0aW9uLnBlcm1pc3Npb24nKTtcbiAgICB2YXIgbGFzdFBlcm1pc3Npb24gPSBwZXJtaXNzaW9uc1twZXJtaXNzaW9ucy5sZW5ndGggLSAyXTtcbiAgICB2YXIgY3VycmVudFBlcm1pc3Npb24gPSBwZXJtaXNzaW9uc1twZXJtaXNzaW9ucy5sZW5ndGggLSAxXTtcblxuICAgIHZhciBpZHMgPSBMaW1pdFN0b3JlLmdldCgnZGIuaWRzLnVzZXJJZCcpO1xuICAgIHZhciBsYXN0SWQgPSBpZHNbaWRzLmxlbmd0aCAtIDJdO1xuICAgIHZhciBjdXJyZW50SWQgPSBpZHNbaWRzLmxlbmd0aCAtIDFdO1xuXG4gICAgdmFyIHN1YnNjcmlwdGlvblN0YXRlcyA9IExpbWl0U3RvcmUuZ2V0KCdzdWJzY3JpcHRpb24udmFsdWUnKTtcbiAgICB2YXIgbGFzdFN1YnNjcmlwdGlvblN0YXRlID0gc3Vic2NyaXB0aW9uU3RhdGVzW3N1YnNjcmlwdGlvblN0YXRlcy5sZW5ndGggLSAyXTtcbiAgICB2YXIgY3VycmVudFN1YnNjcmlwdGlvblN0YXRlID0gc3Vic2NyaXB0aW9uU3RhdGVzW3N1YnNjcmlwdGlvblN0YXRlcy5sZW5ndGggLSAxXTtcblxuXG4gICAgdmFyIG5ld1N1YnNjcmlwdGlvblN0YXRlID0gJ3VuY2hhbmdlZCc7XG5cbiAgICBpZiAoKChsYXN0UGVybWlzc2lvbiA9PT0gJ2RlZmF1bHQnIHx8IGxhc3RQZXJtaXNzaW9uID09PSAnZGVuaWVkJyB8fCBsYXN0UGVybWlzc2lvbiA9PT0gbnVsbCkgJiYgY3VycmVudFBlcm1pc3Npb24gPT09ICdncmFudGVkJyAmJlxuICAgICAgICBjdXJyZW50SWQgIT09IG51bGwgJiZcbiAgICAgICAgY3VycmVudFN1YnNjcmlwdGlvblN0YXRlID09IHRydWVcbiAgICAgICkgfHxcbiAgICAgIChcbiAgICAgICAgKGxhc3RTdWJzY3JpcHRpb25TdGF0ZSA9PSBmYWxzZSAmJiBjdXJyZW50U3Vic2NyaXB0aW9uU3RhdGUgPT0gdHJ1ZSkgJiZcbiAgICAgICAgY3VycmVudElkICE9IG51bGwgJiZcbiAgICAgICAgY3VycmVudFBlcm1pc3Npb24gPT0gJ2dyYW50ZWQnXG4gICAgICApKSB7XG4gICAgICBuZXdTdWJzY3JpcHRpb25TdGF0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKChsYXN0UGVybWlzc2lvbiAhPT0gJ2RlbmllZCcgJiYgY3VycmVudFBlcm1pc3Npb24gPT09ICdkZW5pZWQnKSB8fFxuICAgICAgKGxhc3RQZXJtaXNzaW9uID09PSAnZ3JhbnRlZCcgJiYgY3VycmVudFBlcm1pc3Npb24gIT09ICdncmFudGVkJykgfHxcbiAgICAgIChsYXN0SWQgIT09IG51bGwgJiYgY3VycmVudElkID09PSBudWxsKSB8fFxuICAgICAgKGxhc3RTdWJzY3JpcHRpb25TdGF0ZSAhPT0gZmFsc2UgJiYgY3VycmVudFN1YnNjcmlwdGlvblN0YXRlID09PSBmYWxzZSkpIHtcbiAgICAgIG5ld1N1YnNjcmlwdGlvblN0YXRlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKG5ld1N1YnNjcmlwdGlvblN0YXRlICE9PSBcInVuY2hhbmdlZFwiKSB7XG4gICAgICBPbmVTaWduYWwuX2RlYnVnKCdTdWJzY3JpcHRpb25DaGFuZ2VkIGV2ZW50IGZpcmVkLCBuZXcgc3RhdGUgaXMgbm93OicsIG5ld1N1YnNjcmlwdGlvblN0YXRlKTtcbiAgICAgIHZhciBsYXN0VHJpZ2dlclRpbWVzID0gTGltaXRTdG9yZS5wdXQoJ2V2ZW50LnN1YnNjcmlwdGlvbmNoYW5nZWQubGFzdHJpZ2dlcmVkJywgRGF0ZS5ub3coKSk7XG4gICAgICB2YXIgY3VycmVudFRpbWUgPSBsYXN0VHJpZ2dlclRpbWVzW2xhc3RUcmlnZ2VyVGltZXMubGVuZ3RoIC0gMV07XG4gICAgICB2YXIgbGFzdFRyaWdnZXJUaW1lID0gbGFzdFRyaWdnZXJUaW1lc1tsYXN0VHJpZ2dlclRpbWVzLmxlbmd0aCAtIDJdO1xuICAgICAgdmFyIGVsYXBzZWRUaW1lU2Vjb25kcyA9IChjdXJyZW50VGltZSAtIGxhc3RUcmlnZ2VyVGltZSkgLyAxMDAwO1xuXG4gICAgICB2YXIgbGFzdEV2ZW50U3RhdGVzID0gTGltaXRTdG9yZS5wdXQoJ2V2ZW50LnN1YnNjcmlwdGlvbmNoYW5nZWQubGFzdHN0YXRlcycsIG5ld1N1YnNjcmlwdGlvblN0YXRlKTtcbiAgICAgIHZhciBjdXJyZW50U3RhdGUgPSBsYXN0RXZlbnRTdGF0ZXNbbGFzdEV2ZW50U3RhdGVzLmxlbmd0aCAtIDFdO1xuICAgICAgdmFyIGxhc3RTdGF0ZSA9IGxhc3RFdmVudFN0YXRlc1tsYXN0RXZlbnRTdGF0ZXMubGVuZ3RoIC0gMl07XG5cbiAgICAgIC8vIElmIGV2ZW50IGFscmVhZHkgdHJpZ2dlcmVkIHdpdGhpbiB0aGUgbGFzdCBzZWNvbmQsIGRvbid0IHJlLXRyaWdnZXIuXG4gICAgICB2YXIgc2hvdWxkTm90VHJpZ2dlckV2ZW50ID0gKGxhc3RUcmlnZ2VyVGltZSAhPSBudWxsICYmIChlbGFwc2VkVGltZVNlY29uZHMgPD0gMSkpIHx8IChjdXJyZW50U3RhdGUgPT09IGxhc3RTdGF0ZSk7XG4gICAgICBpZiAoc2hvdWxkTm90VHJpZ2dlckV2ZW50ID09PSBmYWxzZSkge1xuICAgICAgICBPbmVTaWduYWwuX2luZm8oJ1RyaWdnZXJpbmcgZXZlbnQgb25lc2lnbmFsLnN1YnNjcmlwdGlvbi5jaGFuZ2VkOicsIG5ld1N1YnNjcmlwdGlvblN0YXRlKTtcbiAgICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfc3Vic2NyaXB0aW9uQ2hhbmdlZChuZXdTdWJzY3JpcHRpb25TdGF0ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChlbGFwc2VkVGltZVNlY29uZHMgPD0gMSlcbiAgICAgICAgICBPbmVTaWduYWwuX2RlYnVnKCdTdWJzY3JpcHRpb25DaGFuZ2VkIGV2ZW50IGZpcmVkLCBidXQgYmVjYXVzZSBsYXN0IGV2ZW50IHdhcyBmaXJlZCBpbiB0aGUgbGFzdCAnLCBlbGFwc2VkVGltZVNlY29uZHMsICcgc2Vjb25kcywgc2tpcHBpbmcgZXZlbnQgZmlyaW5nLicpO1xuICAgICAgICBpZiAoY3VycmVudFN0YXRlID09PSBsYXN0U3RhdGUpXG4gICAgICAgICAgT25lU2lnbmFsLl9kZWJ1ZygnU3Vic2NyaXB0aW9uQ2hhbmdlZCBldmVudCBmaXJlZCwgYnV0IGJlY2F1c2UgdGhlIG5ldyBzdWJzY3JpcHRpb24gc3RhdGUgKCcgKyBjdXJyZW50U3RhdGUgKyAnKSBpcyB0aGUgc2FtZSBhcyB0aGUgbGFzdCBzdWJzY3JpcHRpb24gc3RhdGUgKCcgKyBsYXN0U3RhdGUgKyAnKSwgc2tpcHBpbmcgZXZlbnQgZmlyaW5nLicpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBPbmVTaWduYWwuX2RlYnVnKCdTdWJzY3JpcHRpb25DaGFuZ2VkIGV2ZW50IGZpcmVkLCBidXQgbmV3IHN0YXRlIGlzIHVuY2hhbmdlZCwgc28gcmV0dXJuaW5nLicpO1xuICAgIH1cbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgbG9nLmluZm8oX19ERVZfXyk7XG5cbiAgICBPbmVTaWduYWwuX2xvZygnT25lU2lnbmFsIFNESyBWZXJzaW9uICcgKyBPbmVTaWduYWwuX1ZFUlNJT04pO1xuICAgIGlmICghT25lU2lnbmFsLmlzUHVzaE5vdGlmaWNhdGlvbnNTdXBwb3J0ZWQoKSkge1xuICAgICAgT25lU2lnbmFsLl93YXJuKFwiWW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgcHVzaCBub3RpZmljYXRpb25zLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobmF2aWdhdG9yLnBlcm1pc3Npb25zICYmICEoT25lU2lnbmFsLl9pc0Jyb3dzZXJGaXJlZm94KCkgJiYgT25lU2lnbmFsLl9nZXRGaXJlZm94VmVyc2lvbigpIDw9IDQ1KSkge1xuICAgICAgT25lU2lnbmFsLl9pbmZvKFwiVXNpbmcgYnJvd3NlcidzIG5hdGl2ZSBwZXJtaXNzaW9uIG9uQ2hhbmdlKCkgdG8gaG9vayBwZXJtaXNzaW9uIGNoYW5nZSBldmVudC5cIik7XG4gICAgICBPbmVTaWduYWwuX3VzaW5nTmF0aXZlUGVybWlzc2lvbkhvb2sgPSB0cnVlO1xuICAgICAgdmFyIGN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKCk7XG4gICAgICBMaW1pdFN0b3JlLnB1dCgnbm90aWZpY2F0aW9uLnBlcm1pc3Npb24nLCBjdXJyZW50Tm90aWZpY2F0aW9uUGVybWlzc2lvbik7XG4gICAgICAvLyBJZiB0aGUgYnJvd3NlciBuYXRpdmVseSBzdXBwb3J0cyBob29raW5nIHRoZSBzdWJzY3JpcHRpb24gcHJvbXB0IHBlcm1pc3Npb24gY2hhbmdlIGV2ZW50XG4gICAgICAvLyAgICAgdXNlIGl0IGluc3RlYWQgb2Ygb3VyIFNESyBtZXRob2RcbiAgICAgIG5hdmlnYXRvci5wZXJtaXNzaW9ucy5xdWVyeSh7bmFtZTogJ25vdGlmaWNhdGlvbnMnfSkudGhlbihmdW5jdGlvbiAocGVybWlzc2lvblN0YXR1cykge1xuICAgICAgICBwZXJtaXNzaW9uU3RhdHVzLm9uY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciByZWNlbnRQZXJtaXNzaW9ucyA9IExpbWl0U3RvcmUucHV0KCdub3RpZmljYXRpb24ucGVybWlzc2lvbicsIHRoaXMuc3RhdGUpO1xuICAgICAgICAgIHZhciBwZXJtaXNzaW9uQmVmb3JlUHJvbXB0ID0gcmVjZW50UGVybWlzc2lvbnNbMF07XG4gICAgICAgICAgdmFyIHBlcm1pc3Npb25zQWZ0ZXJQcm9tcHQgPSByZWNlbnRQZXJtaXNzaW9uc1sxXTtcbiAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9uYXRpdmVQcm9tcHRQZXJtaXNzaW9uQ2hhbmdlZChwZXJtaXNzaW9uQmVmb3JlUHJvbXB0LCBwZXJtaXNzaW9uc0FmdGVyUHJvbXB0KTtcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciBjdXJyZW50Tm90aWZpY2F0aW9uUGVybWlzc2lvbiA9IE9uZVNpZ25hbC5fZ2V0Tm90aWZpY2F0aW9uUGVybWlzc2lvbigpO1xuICAgICAgTGltaXRTdG9yZS5wdXQoJ25vdGlmaWNhdGlvbi5wZXJtaXNzaW9uJywgY3VycmVudE5vdGlmaWNhdGlvblBlcm1pc3Npb24pO1xuICAgIH1cblxuICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IHZhbHVlIG9mIElkczpyZWdpc3RyYXRpb25JZCwgc28gdGhhdCB3ZSBjYW4gc2VlIGlmIHRoZSB2YWx1ZSBjaGFuZ2VzIGluIHRoZSBmdXR1cmVcbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICB2YXIgc3RvcmVWYWx1ZSA9IHJlc3VsdCA/IHJlc3VsdC5pZCA6IG51bGw7XG4gICAgICAgIExpbWl0U3RvcmUucHV0KCdkYi5pZHMudXNlcklkJywgc3RvcmVWYWx1ZSk7XG4gICAgICB9KTtcblxuICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IHZhbHVlIG9mIHN1YnNjcmlwdGlvbiwgc28gdGhhdCB3ZSBjYW4gc2VlIGlmIHRoZSB2YWx1ZSBjaGFuZ2VzIGluIHRoZSBmdXR1cmVcbiAgICBPbmVTaWduYWwuX2dldFN1YnNjcmlwdGlvbihmdW5jdGlvbiAoY3VycmVudFN1YnNjcmlwdGlvbikge1xuICAgICAgTGltaXRTdG9yZS5wdXQoJ3N1YnNjcmlwdGlvbi52YWx1ZScsIGN1cnJlbnRTdWJzY3JpcHRpb24pO1xuICAgIH0pO1xuXG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25lc2lnbmFsLnByb21wdC5uYXRpdmUucGVybWlzc2lvbmNoYW5nZWQnLCBPbmVTaWduYWwub25OYXRpdmVQcm9tcHRDaGFuZ2VkKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25lc2lnbmFsLnN1YnNjcmlwdGlvbi5jaGFuZ2VkJywgT25lU2lnbmFsLl9vblN1YnNjcmlwdGlvbkNoYW5nZWQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwuZGIudmFsdWVyZXRyaWV2ZWQnLCBPbmVTaWduYWwuX29uRGJWYWx1ZVJldHJpZXZlZCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29uZXNpZ25hbC5kYi52YWx1ZXNldCcsIE9uZVNpZ25hbC5fb25EYlZhbHVlU2V0KTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25lc2lnbmFsLmRiLnZhbHVlc2V0JywgT25lU2lnbmFsLl9vbkRiVmFsdWVTZXQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwuaW50ZXJuYWwuc3Vic2NyaXB0aW9uc2V0JywgT25lU2lnbmFsLl9vbkludGVybmFsU3Vic2NyaXB0aW9uU2V0KTtcblxuICAgIE9uZVNpZ25hbC5fdXNlSHR0cE1vZGUgPSAhT25lU2lnbmFsLl9pc1N1cHBvcnRlZFNhZmFyaSgpICYmICghT25lU2lnbmFsLl9zdXBwb3J0c0RpcmVjdFBlcm1pc3Npb24oKSB8fCBPbmVTaWduYWwuX2luaXRPcHRpb25zLnN1YmRvbWFpbk5hbWUpO1xuXG4gICAgaWYgKE9uZVNpZ25hbC5fdXNlSHR0cE1vZGUpXG4gICAgICBPbmVTaWduYWwuX2luaXRPbmVTaWduYWxIdHRwID0gJ2h0dHBzOi8vJyArIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZSArICcub25lc2lnbmFsLmNvbS9zZGtzL2luaXRPbmVTaWduYWxIdHRwJztcbiAgICBlbHNlXG4gICAgICBPbmVTaWduYWwuX2luaXRPbmVTaWduYWxIdHRwID0gJ2h0dHBzOi8vb25lc2lnbmFsLmNvbS9zZGtzL2luaXRPbmVTaWduYWxIdHRwcyc7XG5cbiAgICBpZiAoT25lU2lnbmFsLl9JU19ERVYpXG4gICAgICBPbmVTaWduYWwuX2luaXRPbmVTaWduYWxIdHRwID0gJ2h0dHBzOi8vMTkyLjE2OC4xLjIwNjozMDAwL2Rldl9zZGtzL2luaXRPbmVTaWduYWxIdHRwJztcblxuICAgIC8vIElmIFNhZmFyaSAtIGFkZCAnZmV0Y2gnIHBvbGx5ZmlsbCBpZiBpdCBpc24ndCBhbHJlYWR5IGFkZGVkLlxuICAgIGlmIChPbmVTaWduYWwuX2lzU3VwcG9ydGVkU2FmYXJpKCkgJiYgdHlwZW9mIHdpbmRvdy5mZXRjaCA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICB2YXIgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgcy5zZXRBdHRyaWJ1dGUoJ3NyYycsIFwiaHR0cHM6Ly9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvZmV0Y2gvMC45LjAvZmV0Y2guanNcIik7XG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHMpO1xuICAgIH1cblxuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImNvbXBsZXRlXCIpXG4gICAgICBPbmVTaWduYWwuX2ludGVybmFsSW5pdCgpO1xuICAgIGVsc2VcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgT25lU2lnbmFsLl9pbnRlcm5hbEluaXQpO1xuICB9LFxuXG4gIF9pbnRlcm5hbEluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBQcm9taXNlLmFsbChbT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAnYXBwSWQnKSxcbiAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3JlZ2lzdHJhdGlvbklkJyksXG4gICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnc3Vic2NyaXB0aW9uJyldKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gX2ludGVybmFsSW5pdF9Hb3RBcHBSZWdpc3RyYXRpb25TdWJzY3JpcHRpb25JZHMocmVzdWx0KSB7XG4gICAgICAgIHZhciBhcHBJZFJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgdmFyIHJlZ2lzdHJhdGlvbklkUmVzdWx0ID0gcmVzdWx0WzFdO1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uUmVzdWx0ID0gcmVzdWx0WzJdO1xuXG4gICAgICAgIC8vIElmIEFwcElkIGNoYW5nZWQgZGVsZXRlIHBsYXllcklkIGFuZCBjb250aW51ZS5cbiAgICAgICAgaWYgKGFwcElkUmVzdWx0ICYmIGFwcElkUmVzdWx0LmlkICE9IE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuYXBwSWQpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2RlbGV0ZURiVmFsdWUoXCJJZHNcIiwgXCJ1c2VySWRcIik7XG4gICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShcIk9ORV9TSUdOQUxfU0VTU0lPTlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhUVFBTIC0gT25seSByZWdpc3RlciBmb3IgcHVzaCBub3RpZmljYXRpb25zIG9uY2UgcGVyIHNlc3Npb24gb3IgaWYgdGhlIHVzZXIgY2hhbmdlcyBub3RpZmljYXRpb24gcGVybWlzc2lvbiB0byBBc2sgb3IgQWxsb3cuXG4gICAgICAgIGlmIChzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIpXG4gICAgICAgICAgJiYgIU9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZVxuICAgICAgICAgICYmIChOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PSBcImRlbmllZFwiXG4gICAgICAgICAgfHwgc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShcIk9ORV9TSUdOQUxfTk9USUZJQ0FUSU9OX1BFUk1JU1NJT05cIikgPT0gTm90aWZpY2F0aW9uLnBlcm1pc3Npb24pKVxuICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9OT1RJRklDQVRJT05fUEVSTUlTU0lPTlwiLCBOb3RpZmljYXRpb24ucGVybWlzc2lvbik7XG5cbiAgICAgICAgaWYgKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuYXV0b1JlZ2lzdGVyID09IGZhbHNlICYmICFyZWdpc3RyYXRpb25JZFJlc3VsdCAmJiBPbmVTaWduYWwuX2luaXRPcHRpb25zLnN1YmRvbWFpbk5hbWUgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSAhPSBcInZpc2libGVcIikge1xuICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsIE9uZVNpZ25hbC5fdmlzaWJpbGl0eWNoYW5nZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgT25lU2lnbmFsLl9zZXNzaW9uSW5pdCh7fSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgfSxcblxuICByZWdpc3RlckZvclB1c2hOb3RpZmljYXRpb25zOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIC8vIFdBUk5JTkc6IERvIE5PVCBhZGQgY2FsbGJhY2tzIHRoYXQgaGF2ZSB0byBmaXJlIHRvIGdldCBmcm9tIGhlcmUgdG8gd2luZG93Lm9wZW4gaW4gX3Nlc3Npb25Jbml0LlxuICAgIC8vICAgICAgICAgIE90aGVyd2lzZSB0aGUgcG9wLXVwIHRvIGFzayBmb3IgcHVzaCBwZXJtaXNzaW9uIG9uIEhUVFAgY29ubmVjdGlvbnMgd2lsbCBiZSBibG9ja2VkIGJ5IENocm9tZS5cbiAgICBpZiAoIW9wdGlvbnMpXG4gICAgICBvcHRpb25zID0ge307XG4gICAgb3B0aW9ucy5mcm9tUmVnaXN0ZXJGb3IgPSB0cnVlO1xuICAgIE9uZVNpZ25hbC5fc2Vzc2lvbkluaXQob3B0aW9ucyk7XG4gIH0sXG5cbiAgLy8gSHR0cCBvbmx5IC0gT25seSBjYWxsZWQgZnJvbSBpZnJhbWUncyBpbml0LmpzXG4gIF9pbml0SHR0cDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBPbmVTaWduYWwuX2luaXRPcHRpb25zID0gb3B0aW9ucztcblxuICAgIGlmIChvcHRpb25zLmNvbnRpbnVlUHJlc3NlZCkge1xuICAgICAgT25lU2lnbmFsLnNldFN1YnNjcmlwdGlvbih0cnVlKTtcbiAgICB9XG5cbiAgICB2YXIgaXNJZnJhbWUgPSAocGFyZW50ICE9IG51bGwgJiYgcGFyZW50ICE9IHdpbmRvdyk7XG4gICAgdmFyIGNyZWF0b3IgPSBvcGVuZXIgfHwgcGFyZW50O1xuXG4gICAgaWYgKCFjcmVhdG9yKSB7XG4gICAgICBPbmVTaWduYWwuX2xvZyhcIkVSUk9SOl9pbml0SHR0cDogTm8gb3BlbmVyIG9yIHBhcmVudCBmb3VuZCFcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFNldHRpbmcgdXAgbWVzc2FnZSBjaGFubmVsIHRvIHJlY2VpdmUgbWVzc2FnZSBmcm9tIGhvc3QgcGFnZS5cbiAgICB2YXIgbWVzc2FnZUNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBtZXNzYWdlQ2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIE9uZVNpZ25hbC5fbG9nKFwiX2luaXRIdHRwLm1lc3NhZ2VDaGFubmVsLnBvcnQxLm9ubWVzc2FnZVwiLCBldmVudCk7XG5cbiAgICAgIGlmIChldmVudC5kYXRhLmluaXRPcHRpb25zKSB7XG4gICAgICAgIE9uZVNpZ25hbC5zZXREZWZhdWx0Tm90aWZpY2F0aW9uVXJsKGV2ZW50LmRhdGEuaW5pdE9wdGlvbnMuZGVmYXVsdFVybCk7XG4gICAgICAgIE9uZVNpZ25hbC5zZXREZWZhdWx0VGl0bGUoZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5kZWZhdWx0VGl0bGUpO1xuICAgICAgICBpZiAoZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5kZWZhdWx0SWNvbilcbiAgICAgICAgICBPbmVTaWduYWwuc2V0RGVmYXVsdEljb24oZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5kZWZhdWx0SWNvbik7XG5cbiAgICAgICAgT25lU2lnbmFsLl9sb2coXCJkb2N1bWVudC5VUkxcIiwgZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5wYXJlbnRfdXJsKTtcbiAgICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKFwiTm90aWZpY2F0aW9uT3BlbmVkXCIsIGV2ZW50LmRhdGEuaW5pdE9wdGlvbnMucGFyZW50X3VybClcbiAgICAgICAgICAudGhlbihmdW5jdGlvbiByZWdpc3RlckZvclB1c2hOb3RpZmljYXRpb25zX0dvdE5vdGlmaWNhdGlvbk9wZW5lZChub3RpZmljYXRpb25PcGVuZWRSZXN1bHQpIHtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fbG9nKFwiX2luaXRIdHRwIE5vdGlmaWNhdGlvbk9wZW5lZCBkYlwiLCBub3RpZmljYXRpb25PcGVuZWRSZXN1bHQpO1xuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCkge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX2RlbGV0ZURiVmFsdWUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwgZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5wYXJlbnRfdXJsKTtcbiAgICAgICAgICAgICAgT25lU2lnbmFsLl9sb2coXCJPbmVTaWduYWwuX3NhZmVQb3N0TWVzc2FnZTp0YXJnZXRPcmlnaW46XCIsIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMub3JpZ2luKTtcblxuICAgICAgICAgICAgICBPbmVTaWduYWwuX3NhZmVQb3N0TWVzc2FnZShjcmVhdG9yLCB7b3BlbmVkTm90aWZpY2F0aW9uOiBub3RpZmljYXRpb25PcGVuZWRSZXN1bHQuZGF0YX0sIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMub3JpZ2luLCBudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZ2V0U3ViZG9tYWluU3RhdGUoZnVuY3Rpb24gKGN1clN0YXRlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9zYWZlUG9zdE1lc3NhZ2UoY3JlYXRvciwge2N1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uOiBjdXJTdGF0ZX0sIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMub3JpZ2luLCBudWxsKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChldmVudC5kYXRhLnNldFN1YmRvbWFpblN0YXRlKVxuICAgICAgICBPbmVTaWduYWwuc2V0U3Vic2NyaXB0aW9uKGV2ZW50LmRhdGEuc2V0U3ViZG9tYWluU3RhdGUuc2V0U3Vic2NyaXB0aW9uKTtcbiAgICB9O1xuXG4gICAgT25lU2lnbmFsLl9nZXRTdWJkb21haW5TdGF0ZShmdW5jdGlvbiAoY3VyU3RhdGUpIHtcbiAgICAgIGN1clN0YXRlW1wiaXNJZnJhbWVcIl0gPSBpc0lmcmFtZTtcbiAgICAgIE9uZVNpZ25hbC5fc2FmZVBvc3RNZXNzYWdlKGNyZWF0b3IsIHtvbmVTaWduYWxJbml0UGFnZVJlYWR5OiBjdXJTdGF0ZX0sIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMub3JpZ2luLCBbbWVzc2FnZUNoYW5uZWwucG9ydDJdKTtcbiAgICB9KTtcblxuICAgIE9uZVNpZ25hbC5faW5pdFNhdmVTdGF0ZSgpO1xuICAgIE9uZVNpZ25hbC5faHR0cFJlZ2lzdHJhdGlvbiA9IHRydWU7XG4gICAgaWYgKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKFwiP3Nlc3Npb249dHJ1ZVwiKSA9PSAwKVxuICAgICAgcmV0dXJuO1xuXG4gICAgT25lU2lnbmFsLl9nZXRQbGF5ZXJJZChudWxsLCBmdW5jdGlvbiAocGxheWVyX2lkKSB7XG4gICAgICBpZiAoIWlzSWZyYW1lIHx8IHBsYXllcl9pZCkge1xuICAgICAgICBPbmVTaWduYWwuX2xvZyhcIkJlZm9yZSBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlclwiKTtcbiAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBVEgsIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVJBTSkudGhlbihPbmVTaWduYWwuX2VuYWJsZU5vdGlmaWNhdGlvbnMsIE9uZVNpZ25hbC5fcmVnaXN0ZXJFcnJvcik7XG4gICAgICAgIE9uZVNpZ25hbC5fbG9nKFwiQWZ0ZXIgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXJcIik7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgX2dldFN1YmRvbWFpblN0YXRlOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgc3RhdGUgPSB7fTtcblxuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKSxcbiAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3JlZ2lzdHJhdGlvbklkJyksXG4gICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnc3Vic2NyaXB0aW9uJyldKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gX2ludGVybmFsSW5pdF9Hb3RBcHBSZWdpc3RyYXRpb25TdWJzY3JpcHRpb25JZHMocmVzdWx0KSB7XG4gICAgICAgIHZhciB1c2VySWRSZXN1bHQgPSByZXN1bHRbMF07XG4gICAgICAgIHZhciByZWdpc3RyYXRpb25JZFJlc3VsdCA9IHJlc3VsdFsxXTtcbiAgICAgICAgdmFyIHN1YnNjcmlwdGlvblJlc3VsdCA9IHJlc3VsdFsyXTtcblxuICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgdXNlcklkOiB1c2VySWRSZXN1bHQgPyB1c2VySWRSZXN1bHQuaWQgOiBudWxsLFxuICAgICAgICAgIHJlZ2lzdHJhdGlvbklkOiByZWdpc3RyYXRpb25JZFJlc3VsdCA/IHJlZ2lzdHJhdGlvbklkUmVzdWx0LmlkIDogbnVsbCxcbiAgICAgICAgICBub3RpZlBlcm1zc2lvbjogTm90aWZpY2F0aW9uLnBlcm1pc3Npb24sXG4gICAgICAgICAgc3Vic2NyaXB0aW9uU2V0OiBzdWJzY3JpcHRpb25SZXN1bHQgPyBzdWJzY3JpcHRpb25SZXN1bHQudmFsdWUgOiBudWxsLFxuICAgICAgICAgIGlzUHVzaEVuYWJsZWQ6ICggTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT0gXCJncmFudGVkXCJcbiAgICAgICAgICAmJiB1c2VySWRSZXN1bHRcbiAgICAgICAgICAmJiByZWdpc3RyYXRpb25JZFJlc3VsdFxuICAgICAgICAgICYmICgoc3Vic2NyaXB0aW9uUmVzdWx0ICYmIHN1YnNjcmlwdGlvblJlc3VsdC52YWx1ZSkgfHwgc3Vic2NyaXB0aW9uUmVzdWx0ID09IG51bGwpKVxuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICBfaW5pdFNhdmVTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIE9uZVNpZ25hbC5fYXBwX2lkID0gT25lU2lnbmFsLl9pbml0T3B0aW9ucy5hcHBJZDtcbiAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwiYXBwSWRcIiwgaWQ6IE9uZVNpZ25hbC5fYXBwX2lkfSk7XG4gICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiT3B0aW9uc1wiLCB7a2V5OiBcInBhZ2VUaXRsZVwiLCB2YWx1ZTogZG9jdW1lbnQudGl0bGV9KTtcbiAgfSxcblxuICBfc3VwcG9ydHNEaXJlY3RQZXJtaXNzaW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE9uZVNpZ25hbC5faXNTdXBwb3J0ZWRTYWZhcmkoKVxuICAgICAgfHwgbG9jYXRpb24ucHJvdG9jb2wgPT0gJ2h0dHBzOidcbiAgICAgIHx8IGxvY2F0aW9uLmhvc3QuaW5kZXhPZihcImxvY2FsaG9zdFwiKSA9PSAwXG4gICAgICB8fCBsb2NhdGlvbi5ob3N0LmluZGV4T2YoXCIxMjcuMC4wLjFcIikgPT0gMDtcbiAgfSxcblxuXG4gIF9zZXNzaW9uSW5pdDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBPbmVTaWduYWwuX2xvZyhcIl9zZXNzaW9uSW5pdDpcIiwgb3B0aW9ucyk7XG4gICAgT25lU2lnbmFsLl9pbml0U2F2ZVN0YXRlKCk7XG5cbiAgICB2YXIgaG9zdFBhZ2VQcm90b2NvbCA9IGxvY2F0aW9uLm9yaWdpbi5tYXRjaCgvXmh0dHAoc3wpOlxcL1xcLyh3d3dcXC58KS8pWzBdO1xuXG4gICAgLy8gSWYgSFRUUCBvciB1c2luZyBzdWJkb21haW4gbW9kZVxuICAgIGlmIChPbmVTaWduYWwuX3VzZUh0dHBNb2RlKSB7XG4gICAgICBpZiAob3B0aW9ucy5mcm9tUmVnaXN0ZXJGb3IpIHtcbiAgICAgICAgdmFyIGR1YWxTY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgIT0gdW5kZWZpbmVkID8gd2luZG93LnNjcmVlbkxlZnQgOiBzY3JlZW4ubGVmdDtcbiAgICAgICAgdmFyIGR1YWxTY3JlZW5Ub3AgPSB3aW5kb3cuc2NyZWVuVG9wICE9IHVuZGVmaW5lZCA/IHdpbmRvdy5zY3JlZW5Ub3AgOiBzY3JlZW4udG9wO1xuXG4gICAgICAgIHZhciB0aGlzV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCA/IHdpbmRvdy5pbm5lcldpZHRoIDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoID8gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIDogc2NyZWVuLndpZHRoO1xuICAgICAgICB2YXIgdGhpc0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCA/IHdpbmRvdy5pbm5lckhlaWdodCA6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IDogc2NyZWVuLmhlaWdodDtcbiAgICAgICAgdmFyIGNoaWxkV2lkdGggPSBPbmVTaWduYWwuX3dpbmRvd1dpZHRoO1xuICAgICAgICB2YXIgY2hpbGRIZWlnaHQgPSBPbmVTaWduYWwuX3dpbmRvd0hlaWdodDtcblxuICAgICAgICB2YXIgbGVmdCA9ICgodGhpc1dpZHRoIC8gMikgLSAoY2hpbGRXaWR0aCAvIDIpKSArIGR1YWxTY3JlZW5MZWZ0O1xuICAgICAgICB2YXIgdG9wID0gKCh0aGlzSGVpZ2h0IC8gMikgLSAoY2hpbGRIZWlnaHQgLyAyKSkgKyBkdWFsU2NyZWVuVG9wO1xuXG4gICAgICAgIE9uZVNpZ25hbC5fbG9nKCdPcGVuaW5nIHBvcHVwIHdpbmRvdy4nKTtcbiAgICAgICAgdmFyIG1lc3NhZ2VfbG9jYWxpemF0aW9uX29wdHMgPSBPbmVTaWduYWwuX2luaXRPcHRpb25zWydwcm9tcHRPcHRpb25zJ107XG4gICAgICAgIHZhciBtZXNzYWdlX2xvY2FsaXphdGlvbl9vcHRzX3N0ciA9ICcnO1xuICAgICAgICBpZiAobWVzc2FnZV9sb2NhbGl6YXRpb25fb3B0cykge1xuICAgICAgICAgIHZhciBtZXNzYWdlX2xvY2FsaXphdGlvbl9wYXJhbXMgPSBbJ2FjdGlvbk1lc3NhZ2UnLFxuICAgICAgICAgICAgJ2V4YW1wbGVOb3RpZmljYXRpb25UaXRsZURlc2t0b3AnLFxuICAgICAgICAgICAgJ2V4YW1wbGVOb3RpZmljYXRpb25NZXNzYWdlRGVza3RvcCcsXG4gICAgICAgICAgICAnZXhhbXBsZU5vdGlmaWNhdGlvblRpdGxlTW9iaWxlJyxcbiAgICAgICAgICAgICdleGFtcGxlTm90aWZpY2F0aW9uTWVzc2FnZU1vYmlsZScsXG4gICAgICAgICAgICAnZXhhbXBsZU5vdGlmaWNhdGlvbkNhcHRpb24nLFxuICAgICAgICAgICAgJ2FjY2VwdEJ1dHRvblRleHQnLFxuICAgICAgICAgICAgJ2NhbmNlbEJ1dHRvblRleHQnXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2VfbG9jYWxpemF0aW9uX3BhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IG1lc3NhZ2VfbG9jYWxpemF0aW9uX3BhcmFtc1tpXTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IG1lc3NhZ2VfbG9jYWxpemF0aW9uX29wdHNba2V5XTtcbiAgICAgICAgICAgIHZhciBlbmNvZGVkX3ZhbHVlID0gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgbWVzc2FnZV9sb2NhbGl6YXRpb25fb3B0c19zdHIgKz0gJyYnICsga2V5ICsgJz0nICsgZW5jb2RlZF92YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoaWxkV2luZG93ID0gd2luZG93Lm9wZW4oT25lU2lnbmFsLl9pbml0T25lU2lnbmFsSHR0cCArIFwiP1wiICsgbWVzc2FnZV9sb2NhbGl6YXRpb25fb3B0c19zdHIgKyBcIiZob3N0UGFnZVByb3RvY29sPVwiICsgaG9zdFBhZ2VQcm90b2NvbCwgXCJfYmxhbmtcIiwgJ3Njcm9sbGJhcnM9eWVzLCB3aWR0aD0nICsgY2hpbGRXaWR0aCArICcsIGhlaWdodD0nICsgY2hpbGRIZWlnaHQgKyAnLCB0b3A9JyArIHRvcCArICcsIGxlZnQ9JyArIGxlZnQpO1xuXG4gICAgICAgIGlmIChjaGlsZFdpbmRvdylcbiAgICAgICAgICBjaGlsZFdpbmRvdy5mb2N1cygpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIE9uZVNpZ25hbC5fbG9nKCdPcGVuaW5nIGlGcmFtZS4nKTtcbiAgICAgICAgT25lU2lnbmFsLl9hZGRTZXNzaW9uSWZyYW1lKGhvc3RQYWdlUHJvdG9jb2wpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKE9uZVNpZ25hbC5faXNTdXBwb3J0ZWRTYWZhcmkoKSkge1xuICAgICAgaWYgKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCkge1xuICAgICAgICB2YXIgbm90aWZpY2F0aW9uUGVybWlzc2lvbkJlZm9yZVJlcXVlc3QgPSBPbmVTaWduYWwuX2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb24oT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zYWZhcmlfd2ViX2lkKTtcbiAgICAgICAgd2luZG93LnNhZmFyaS5wdXNoTm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uKFxuICAgICAgICAgIE9uZVNpZ25hbC5fSE9TVF9VUkwgKyAnc2FmYXJpJyxcbiAgICAgICAgICBPbmVTaWduYWwuX2luaXRPcHRpb25zLnNhZmFyaV93ZWJfaWQsXG4gICAgICAgICAge2FwcF9pZDogT25lU2lnbmFsLl9hcHBfaWR9LFxuICAgICAgICAgIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBPbmVTaWduYWwuX2xvZyhkYXRhKTtcbiAgICAgICAgICAgIHZhciBub3RpZmljYXRpb25QZXJtaXNzaW9uQWZ0ZXJSZXF1ZXN0ID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCk7XG4gICAgICAgICAgICBpZiAoZGF0YS5kZXZpY2VUb2tlbikge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX3JlZ2lzdGVyV2l0aE9uZVNpZ25hbChPbmVTaWduYWwuX2FwcF9pZCwgZGF0YS5kZXZpY2VUb2tlbi50b0xvd2VyQ2FzZSgpLCA3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfbmF0aXZlUHJvbXB0UGVybWlzc2lvbkNoYW5nZWQobm90aWZpY2F0aW9uUGVybWlzc2lvbkJlZm9yZVJlcXVlc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAob3B0aW9ucy5tb2RhbFByb21wdCAmJiBvcHRpb25zLmZyb21SZWdpc3RlckZvcikgeyAvLyBJZiBIVFRQUyAtIFNob3cgbW9kYWxcbiAgICAgIGlmICghT25lU2lnbmFsLmlzUHVzaE5vdGlmaWNhdGlvbnNTdXBwb3J0ZWQoKSkge1xuICAgICAgICBPbmVTaWduYWwuX3dhcm4oJ0FuIGF0dGVtcHQgd2FzIG1hZGUgdG8gb3BlbiB0aGUgSFRUUFMgbW9kYWwgcGVybWlzc2lvbiBwcm9tcHQsIGJ1dCBwdXNoIG5vdGlmaWNhdGlvbnMgYXJlIG5vdCBzdXBwb3J0ZWQgb24gdGhpcyBicm93c2VyLiBPcGVuaW5nIGNhbmNlbGVkLicpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBPbmVTaWduYWwuaXNQdXNoTm90aWZpY2F0aW9uc0VuYWJsZWQoZnVuY3Rpb24gKHB1c2hFbmFibGVkKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdpZCcsICdPbmVTaWduYWwtaWZyYW1lLW1vZGFsJyk7XG4gICAgICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gJzxkaXYgaWQ9XCJub3RpZi1wZXJtaXNzaW9uXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuNyk7IHBvc2l0aW9uOiBmaXhlZDsgdG9wOiAwOyBsZWZ0OiAwOyByaWdodDogMDsgYm90dG9tOiAwOyB6LWluZGV4OiA5MDAwOyBkaXNwbGF5OiBibG9ja1wiPjwvZGl2Pic7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG5cbiAgICAgICAgdmFyIGlmcmFtZVN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgaWZyYW1lU3R5bGUuaW5uZXJIVE1MID0gXCJAbWVkaWEgKG1heC13aWR0aDogNTYwcHgpIHsgLk9uZVNpZ25hbC1wZXJtaXNzaW9uLWlmcmFtZSB7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7fSB9XCJcbiAgICAgICAgICArIFwiQG1lZGlhIChtaW4td2lkdGg6IDU2MXB4KSB7IC5PbmVTaWduYWwtcGVybWlzc2lvbi1pZnJhbWUgeyB0b3A6IDUwJTsgbGVmdDogNTAlOyBtYXJnaW4tbGVmdDogLTI3NXB4OyBtYXJnaW4tdG9wOiAtMjQ4cHg7fSB9XCI7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoaWZyYW1lU3R5bGUpO1xuXG4gICAgICAgIHZhciBpZnJhbWVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgaWZyYW1lTm9kZS5jbGFzc05hbWUgPSBcIk9uZVNpZ25hbC1wZXJtaXNzaW9uLWlmcmFtZVwiXG4gICAgICAgIGlmcmFtZU5vZGUuc3R5bGUuY3NzVGV4dCA9IFwiYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAxKTsgcG9zaXRpb246IGZpeGVkO1wiO1xuICAgICAgICBpZnJhbWVOb2RlLnNyYyA9IE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHBcbiAgICAgICAgICArICc/aWQ9JyArIE9uZVNpZ25hbC5fYXBwX2lkXG4gICAgICAgICAgKyAnJmh0dHBzUHJvbXB0PXRydWUnXG4gICAgICAgICAgKyAnJnB1c2hFbmFibGVkPScgKyBwdXNoRW5hYmxlZFxuICAgICAgICAgICsgJyZwZXJtaXNzaW9uQmxvY2tlZD0nICsgKHR5cGVvZiBOb3RpZmljYXRpb24gPT09IFwidW5kZWZpbmVkXCIgfHwgTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT0gXCJkZW5pZWRcIilcbiAgICAgICAgICArICcmaG9zdFBhZ2VQcm90b2NvbD0nICsgaG9zdFBhZ2VQcm90b2NvbDtcbiAgICAgICAgaWZyYW1lTm9kZS5zZXRBdHRyaWJ1dGUoJ2ZyYW1lYm9yZGVyJywgJzAnKTtcbiAgICAgICAgaWZyYW1lTm9kZS53aWR0aCA9IE9uZVNpZ25hbC5fd2luZG93V2lkdGgudG9TdHJpbmcoKTtcbiAgICAgICAgaWZyYW1lTm9kZS5oZWlnaHQgPSBPbmVTaWduYWwuX3dpbmRvd0hlaWdodC50b1N0cmluZygpO1xuXG4gICAgICAgIE9uZVNpZ25hbC5fbG9nKCdPcGVuaW5nIEhUVFBTIG1vZGFsIHByb21wdC4nKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJub3RpZi1wZXJtaXNzaW9uXCIpLmFwcGVuZENoaWxkKGlmcmFtZU5vZGUpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IpIC8vIElmIEhUVFBTIC0gU2hvdyBuYXRpdmUgcHJvbXB0XG4gICAgICBPbmVTaWduYWwuX3JlZ2lzdGVyRm9yVzNDUHVzaChvcHRpb25zKTtcbiAgICBlbHNlXG4gICAgICBPbmVTaWduYWwuX2xvZygnU2VydmljZSB3b3JrZXJzIGFyZSBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3Nlci4nKTtcbiAgfSxcblxuICBfcmVnaXN0ZXJGb3JXM0NQdXNoOiBmdW5jdGlvbiAob3B0aW9ucykge1xuXG4gICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAncmVnaXN0cmF0aW9uSWQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gX3JlZ2lzdGVyRm9yVzNDUHVzaF9Hb3RSZWdpc3RyYXRpb25JZChyZWdpc3RyYXRpb25JZFJlc3VsdCkge1xuICAgICAgICBpZiAoIXJlZ2lzdHJhdGlvbklkUmVzdWx0IHx8ICFvcHRpb25zLmZyb21SZWdpc3RlckZvciB8fCBOb3RpZmljYXRpb24ucGVybWlzc2lvbiAhPSBcImdyYW50ZWRcIikge1xuICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmdldFJlZ2lzdHJhdGlvbigpLnRoZW4oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgc3dfcGF0aCA9IFwiXCI7XG5cbiAgICAgICAgICAgIGlmIChPbmVTaWduYWwuX2luaXRPcHRpb25zLnBhdGgpXG4gICAgICAgICAgICAgIHN3X3BhdGggPSBPbmVTaWduYWwuX2luaXRPcHRpb25zLnBhdGg7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXZlbnQgPT09IFwidW5kZWZpbmVkXCIpIC8vIE5vdGhpbmcgcmVnaXN0ZXJlZCwgdmVyeSBmaXJzdCBydW5cbiAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGlmIChldmVudC5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuYWN0aXZlLnNjcmlwdFVSTC5pbmRleE9mKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFUSCkgPiAtMSkge1xuXG4gICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdXT1JLRVIxX09ORV9TSUdOQUxfU1dfVkVSU0lPTicpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh2ZXJzaW9uUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnNpb25SZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uUmVzdWx0LmlkICE9IE9uZVNpZ25hbC5fVkVSU0lPTikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC51bnJlZ2lzdGVyKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9VUERBVEVSX1BBVEgsIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVJBTSkudGhlbihPbmVTaWduYWwuX2VuYWJsZU5vdGlmaWNhdGlvbnMsIE9uZVNpZ25hbC5fcmVnaXN0ZXJFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChldmVudC5hY3RpdmUuc2NyaXB0VVJMLmluZGV4T2Yoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9VUERBVEVSX1BBVEgpID4gLTEpIHtcblxuICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAnV09SS0VSMV9PTkVfU0lHTkFMX1NXX1ZFUlNJT04nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodmVyc2lvblJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmVyc2lvblJlc3VsdC5pZCAhPSBPbmVTaWduYWwuX1ZFUlNJT04pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQudW5yZWdpc3RlcigpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfVVBEQVRFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1VQREFURVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgaWYgKGV2ZW50Lmluc3RhbGxpbmcgPT0gbnVsbClcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBVEgsIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVJBTSkudGhlbihPbmVTaWduYWwuX2VuYWJsZU5vdGlmaWNhdGlvbnMsIE9uZVNpZ25hbC5fcmVnaXN0ZXJFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICBfYWRkU2Vzc2lvbklmcmFtZTogZnVuY3Rpb24gKGhvc3RQYWdlUHJvdG9jb2wpIHtcblxuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICBub2RlLnNyYyA9IE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHAgKyBcIklmcmFtZVwiO1xuICAgIGlmIChzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIpKVxuICAgICAgbm9kZS5zcmMgKz0gXCI/c2Vzc2lvbj10cnVlXCJcbiAgICAgICAgKyBcIiZob3N0UGFnZVByb3RvY29sPVwiICsgaG9zdFBhZ2VQcm90b2NvbDtcbiAgICBlbHNlXG4gICAgICBub2RlLnNyYyArPSBcIj9ob3N0UGFnZVByb3RvY29sPVwiICsgaG9zdFBhZ2VQcm90b2NvbFxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgT25lU2lnbmFsLl9sb2coJ0FkZGluZyBzZXNzaW9uIGlGcmFtZS4nKTtcblxuICAgIE9uZVNpZ25hbC5fc2Vzc2lvbklmcmFtZUFkZGVkID0gdHJ1ZTtcbiAgfSxcblxuICBfcmVnaXN0ZXJFcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgIE9uZVNpZ25hbC5fbG9nKFwibmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXI6RVJST1I6IFwiICsgZXJyKTtcbiAgfSxcblxuICBfZW5hYmxlTm90aWZpY2F0aW9uczogZnVuY3Rpb24gKGV4aXN0aW5nU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbikgeyAvLyBpcyBTZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uIHR5cGVcbiAgICBPbmVTaWduYWwuX2xvZyhcIl9lbmFibGVOb3RpZmljYXRpb25zOiBcIiwgZXhpc3RpbmdTZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uKTtcblxuICAgIGlmICghKCdQdXNoTWFuYWdlcicgaW4gd2luZG93KSkge1xuICAgICAgT25lU2lnbmFsLl9sb2coXCJQdXNoIG1lc3NhZ2luZyBpcyBub3Qgc3VwcG9ydGVkLiBObyBQdXNoTWFuYWdlci5cIik7XG4gICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKCdzaG93Tm90aWZpY2F0aW9uJyBpbiBTZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uLnByb3RvdHlwZSkpIHtcbiAgICAgIE9uZVNpZ25hbC5fbG9nKFwiTm90aWZpY2F0aW9ucyBhcmUgbm90IHN1cHBvcnRlZC4gc2hvd05vdGlmaWNhdGlvbiBub3QgYXZhaWxhYmxlIGluIFNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24uXCIpO1xuICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShcIk9ORV9TSUdOQUxfU0VTU0lPTlwiLCB0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT09ICdkZW5pZWQnKSB7XG4gICAgICBPbmVTaWduYWwuX3dhcm4oXCJUaGUgdXNlciBoYXMgZGlzYWJsZWQgbm90aWZpY2F0aW9ucy5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVhZHkudGhlbihmdW5jdGlvbiAoc2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbikge1xuICAgICAgT25lU2lnbmFsLl9sb2coc2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbik7XG5cbiAgICAgIE9uZVNpZ25hbC5fc3Vic2NyaWJlRm9yUHVzaChzZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uKTtcbiAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgICA7XG4gIH0sXG5cbiAgLypcbiAgIFJldHVybnMgdGhlIGN1cnJlbnQgYnJvd3Nlci1hZ25vc3RpYyBub3RpZmljYXRpb24gcGVybWlzc2lvbiBhcyBcImRlZmF1bHRcIiwgXCJncmFudGVkXCIsIFwiZGVuaWVkXCIuXG4gICBzYWZhcmlXZWJJZDogVXNlZCBvbmx5IHRvIGdldCB0aGUgY3VycmVudCBub3RpZmljYXRpb24gcGVybWlzc2lvbiBzdGF0ZSBpbiBTYWZhcmkgKHJlcXVpcmVkIGFzIHBhcnQgb2YgdGhlIHNwZWMpLlxuICAgKi9cbiAgX2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb246IGZ1bmN0aW9uIChzYWZhcmlXZWJJZCkge1xuICAgIGlmICh3aW5kb3cuc2FmYXJpKSB7XG4gICAgICAvLyBUaGUgdXNlciBpcyBvbiBTYWZhcmlcbiAgICAgIC8vIEEgd2ViIElEIGlzIHJlcXVpcmVkIHRvIGRldGVybWluZSB0aGUgY3VycmVudCBub3RpZmljaWF0aW9uIHBlcm1pc3Npb25cbiAgICAgIGlmIChzYWZhcmlXZWJJZCkge1xuICAgICAgICByZXR1cm4gd2luZG93LnNhZmFyaS5wdXNoTm90aWZpY2F0aW9uLnBlcm1pc3Npb24oc2FmYXJpV2ViSWQpLnBlcm1pc3Npb247XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgLy8gVGhlIHVzZXIgZGlkbid0IHNldCB1cCBTYWZhcmkgd2ViIHB1c2ggcHJvcGVybHk7IG5vdGlmaWNhdGlvbnMgYXJlIHVubGlrZWx5IHRvIGJlIGVuYWJsZWRcbiAgICAgICAgcmV0dXJuIFwiZGVmYXVsdFwiO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIElkZW50aWNhbCBBUEkgb24gRmlyZWZveCBhbmQgQ2hyb21lXG4gICAgICByZXR1cm4gTm90aWZpY2F0aW9uLnBlcm1pc3Npb247XG4gICAgfVxuICB9LFxuXG4gIF90cmlnZ2VyRXZlbnQ6IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEpIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgT25lU2lnbmFsLl9kZWJ1ZygnU2tpcHBpbmcgdHJpZ2dlcmluZyBvZiBldmVudDonLCBldmVudE5hbWUsICdiZWNhdXNlIHdlIGFyZSBydW5uaW5nIGluIGEgU2VydmljZVdvcmtlciBjb250ZXh0LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoZXZlbnROYW1lLCB7XG4gICAgICBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWxzOiBkYXRhXG4gICAgfSk7XG4gICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9LFxuXG4gIF90cmlnZ2VyRXZlbnRfY3VzdG9tUHJvbXB0Q2xpY2tlZDogZnVuY3Rpb24gKGNsaWNrUmVzdWx0KSB7XG4gICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnQoJ29uZXNpZ25hbC5wcm9tcHQuY3VzdG9tLmNsaWNrZWQnLCB7XG4gICAgICByZXN1bHQ6IGNsaWNrUmVzdWx0XG4gICAgfSk7XG4gIH0sXG5cbiAgX3RyaWdnZXJFdmVudF9uYXRpdmVQcm9tcHRQZXJtaXNzaW9uQ2hhbmdlZDogZnVuY3Rpb24gKGZyb20sIHRvKSB7XG4gICAgaWYgKHRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRvID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCk7XG4gICAgfVxuICAgIGlmIChmcm9tICE9PSB0bykge1xuICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnQoJ29uZXNpZ25hbC5wcm9tcHQubmF0aXZlLnBlcm1pc3Npb25jaGFuZ2VkJywge1xuICAgICAgICBmcm9tOiBmcm9tLFxuICAgICAgICB0bzogdG9cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfdHJpZ2dlckV2ZW50X3N1YnNjcmlwdGlvbkNoYW5nZWQ6IGZ1bmN0aW9uICh0bykge1xuICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50KCdvbmVzaWduYWwuc3Vic2NyaXB0aW9uLmNoYW5nZWQnLCB0byk7XG4gIH0sXG5cbiAgX3RyaWdnZXJFdmVudF9kYlZhbHVlUmV0cmlldmVkOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudCgnb25lc2lnbmFsLmRiLnZhbHVlcmV0cmlldmVkJywgdmFsdWUpO1xuICB9LFxuXG4gIF90cmlnZ2VyRXZlbnRfZGJWYWx1ZVNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnQoJ29uZXNpZ25hbC5kYi52YWx1ZXNldCcsIHZhbHVlKTtcbiAgfSxcblxuICBfdHJpZ2dlckV2ZW50X2ludGVybmFsU3Vic2NyaXB0aW9uU2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudCgnb25lc2lnbmFsLmludGVybmFsLnN1YnNjcmlwdGlvbnNldCcsIHZhbHVlKTtcbiAgfSxcblxuICBfc3Vic2NyaWJlRm9yUHVzaDogZnVuY3Rpb24gKHNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24pIHtcbiAgICBPbmVTaWduYWwuX2xvZygnX3N1YnNjcmliZUZvclB1c2g6JywgJ25hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlYWR5LnRoZW4nKTtcblxuICAgIHZhciBub3RpZmljYXRpb25QZXJtaXNzaW9uQmVmb3JlUmVxdWVzdCA9IE9uZVNpZ25hbC5fZ2V0Tm90aWZpY2F0aW9uUGVybWlzc2lvbihPbmVTaWduYWwuX2luaXRPcHRpb25zLnNhZmFyaV93ZWJfaWQpO1xuICAgIHNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24ucHVzaE1hbmFnZXIuc3Vic2NyaWJlKHt1c2VyVmlzaWJsZU9ubHk6IHRydWV9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9OT1RJRklDQVRJT05fUEVSTUlTU0lPTlwiLCBOb3RpZmljYXRpb24ucGVybWlzc2lvbik7XG5cbiAgICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAnYXBwSWQnKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIF9zdWJzY3JpYmVGb3JQdXNoX0dvdEFwcElkKGFwcElkUmVzdWx0KSB7XG4gICAgICAgICAgICB2YXIgYXBwSWQgPSBhcHBJZFJlc3VsdC5pZDtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fZGVidWcoXCJzZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uLnB1c2hNYW5hZ2VyLnN1YnNjcmliZSgpXCIpO1xuXG4gICAgICAgICAgICB2YXIgcmVnaXN0cmF0aW9uSWQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIHN1YnNjcmlwdGlvbi5zdWJzY3JpcHRpb25JZCAhPSBcInVuZGVmaW5lZFwiKSAvLyBDaHJvbWUgNDMgJiA0MlxuICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvbklkID0gc3Vic2NyaXB0aW9uLnN1YnNjcmlwdGlvbklkO1xuICAgICAgICAgICAgICBlbHNlICAvLyBDaHJvbWUgNDQrIGFuZCBGaXJlRm94XG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uSWQgPSBzdWJzY3JpcHRpb24uZW5kcG9pbnQucmVwbGFjZShuZXcgUmVnRXhwKFwiXihodHRwczovL2FuZHJvaWQuZ29vZ2xlYXBpcy5jb20vZ2NtL3NlbmQvfGh0dHBzOi8vdXBkYXRlcy5wdXNoLnNlcnZpY2VzLm1vemlsbGEuY29tL3B1c2gvKVwiKSwgXCJcIik7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fZGVidWcoJ3JlZ2lzdHJhdGlvbiBpZCBpczonICsgcmVnaXN0cmF0aW9uSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBPbmVTaWduYWwuX2xvZygnRXJyb3IgY291bGQgbm90IHN1YnNjcmliZSB5b3VyIGJyb3dzZXIgZm9yIHB1c2ghJyk7XG5cbiAgICAgICAgICAgIE9uZVNpZ25hbC5fcmVnaXN0ZXJXaXRoT25lU2lnbmFsKGFwcElkLCByZWdpc3RyYXRpb25JZCwgT25lU2lnbmFsLl9pc1N1cHBvcnRlZEZpcmVGb3goKSA/IDggOiA1KTtcblxuICAgICAgICAgICAgaWYgKCFPbmVTaWduYWwuX3VzaW5nTmF0aXZlUGVybWlzc2lvbkhvb2spXG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X25hdGl2ZVByb21wdFBlcm1pc3Npb25DaGFuZ2VkKG5vdGlmaWNhdGlvblBlcm1pc3Npb25CZWZvcmVSZXF1ZXN0KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcignRXJyb3IgZHVyaW5nIHN1YnNjcmliZSgpOicsIGUpO1xuXG4gICAgICAgIGlmICghT25lU2lnbmFsLl91c2luZ05hdGl2ZVBlcm1pc3Npb25Ib29rKVxuICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X25hdGl2ZVByb21wdFBlcm1pc3Npb25DaGFuZ2VkKG5vdGlmaWNhdGlvblBlcm1pc3Npb25CZWZvcmVSZXF1ZXN0KTtcblxuICAgICAgICBpZiAoZS5jb2RlID09IDIwICYmIG9wZW5lciAmJiBPbmVTaWduYWwuX2h0dHBSZWdpc3RyYXRpb24pXG4gICAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICB9KTtcbiAgfSxcblxuICBzZW5kVGFnOiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBqc29uS2V5VmFsdWUgPSB7fTtcbiAgICBqc29uS2V5VmFsdWVba2V5XSA9IHZhbHVlO1xuICAgIE9uZVNpZ25hbC5zZW5kVGFncyhqc29uS2V5VmFsdWUpO1xuICB9LFxuXG4gIHNlbmRUYWdzOiBmdW5jdGlvbiAoanNvblBhaXIpIHtcbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gc2VuZFRhZ3NfR290VXNlcklkKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICBpZiAodXNlcklkUmVzdWx0KVxuICAgICAgICAgIE9uZVNpZ25hbC5fc2VuZFRvT25lU2lnbmFsQXBpKFwicGxheWVycy9cIiArIHVzZXJJZFJlc3VsdC5pZCwgXCJQVVRcIiwge1xuICAgICAgICAgICAgYXBwX2lkOiBPbmVTaWduYWwuX2FwcF9pZCxcbiAgICAgICAgICAgIHRhZ3M6IGpzb25QYWlyXG4gICAgICAgICAgfSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChPbmVTaWduYWwuX3RhZ3NUb1NlbmRPblJlZ2lzdGVyID09IG51bGwpXG4gICAgICAgICAgICBPbmVTaWduYWwuX3RhZ3NUb1NlbmRPblJlZ2lzdGVyID0ganNvblBhaXI7XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0T2JqID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBfb2JqIGluIE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIpIHJlc3VsdE9ialtfb2JqXSA9IE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXJbX29ial07XG4gICAgICAgICAgICBmb3IgKHZhciBfb2JqIGluIGpzb25QYWlyKSByZXN1bHRPYmpbX29ial0gPSBqc29uUGFpcltfb2JqXTtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIgPSByZXN1bHRPYmo7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoJ3NlbmRUYWdzOicsIGUpO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgZGVsZXRlVGFnOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgT25lU2lnbmFsLmRlbGV0ZVRhZ3MoW2tleV0pO1xuICB9LFxuXG4gIGRlbGV0ZVRhZ3M6IGZ1bmN0aW9uIChrZXlBcnJheSkge1xuICAgIHZhciBqc29uUGFpciA9IHt9O1xuICAgIHZhciBsZW5ndGggPSBrZXlBcnJheS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgIGpzb25QYWlyW2tleUFycmF5W2ldXSA9IFwiXCI7XG5cbiAgICBPbmVTaWduYWwuc2VuZFRhZ3MoanNvblBhaXIpO1xuICB9LFxuXG4gIF9oYW5kbGVOb3RpZmljYXRpb25PcGVuZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBub3RpZmljYXRpb25EYXRhID0gSlNPTi5wYXJzZShldmVudC5ub3RpZmljYXRpb24udGFnKTtcbiAgICBldmVudC5ub3RpZmljYXRpb24uY2xvc2UoKTtcblxuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdhcHBJZCcpLCBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBfaGFuZGxlTm90aWZpY2F0aW9uT3BlbmVkX0dvdEFwcFVzZXJJZHMocmVzdWx0cykge1xuICAgICAgICB2YXIgYXBwSWRSZXN1bHQgPSByZXN1bHRzWzBdO1xuICAgICAgICB2YXIgdXNlcklkUmVzdWx0ID0gcmVzdWx0c1sxXTtcbiAgICAgICAgaWYgKGFwcElkUmVzdWx0ICYmIHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fc2VuZFRvT25lU2lnbmFsQXBpKFwibm90aWZpY2F0aW9ucy9cIiArIG5vdGlmaWNhdGlvbkRhdGEuaWQsIFwiUFVUXCIsIHtcbiAgICAgICAgICAgIGFwcF9pZDogYXBwSWRSZXN1bHQuaWQsXG4gICAgICAgICAgICBwbGF5ZXJfaWQ6IHVzZXJJZFJlc3VsdC5pZCxcbiAgICAgICAgICAgIG9wZW5lZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgICA7XG5cbiAgICBldmVudC53YWl0VW50aWwoXG4gICAgICBjbGllbnRzLm1hdGNoQWxsKHt0eXBlOiBcIndpbmRvd1wifSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGNsaWVudExpc3QpIHtcbiAgICAgICAgICB2YXIgbGF1bmNoVVJMID0gcmVnaXN0cmF0aW9uLnNjb3BlO1xuICAgICAgICAgIGlmIChPbmVTaWduYWwuX2RlZmF1bHRMYXVuY2hVUkwpXG4gICAgICAgICAgICBsYXVuY2hVUkwgPSBPbmVTaWduYWwuX2RlZmF1bHRMYXVuY2hVUkw7XG4gICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbkRhdGEubGF1bmNoVVJMKVxuICAgICAgICAgICAgbGF1bmNoVVJMID0gbm90aWZpY2F0aW9uRGF0YS5sYXVuY2hVUkw7XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNsaWVudExpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjbGllbnQgPSBjbGllbnRMaXN0W2ldO1xuICAgICAgICAgICAgaWYgKCdmb2N1cycgaW4gY2xpZW50ICYmIGNsaWVudC51cmwgPT0gbGF1bmNoVVJMKSB7XG4gICAgICAgICAgICAgIGNsaWVudC5mb2N1cygpO1xuXG4gICAgICAgICAgICAgIC8vIHRhcmdldE9yaWdpbiBub3QgdmFsaWQgaGVyZSBhcyB0aGUgc2VydmljZSB3b3JrZXIgb3ducyB0aGUgcGFnZS5cbiAgICAgICAgICAgICAgY2xpZW50LnBvc3RNZXNzYWdlKG5vdGlmaWNhdGlvbkRhdGEpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiTm90aWZpY2F0aW9uT3BlbmVkXCIsIHt1cmw6IGxhdW5jaFVSTCwgZGF0YTogbm90aWZpY2F0aW9uRGF0YX0pO1xuICAgICAgICAgIGNsaWVudHMub3BlbldpbmRvdyhsYXVuY2hVUkwpLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgLy8gU2hvdWxkIG9ubHkgZmFsbCBpbnRvIGhlcmUgaWYgZ29pbmcgdG8gYW4gZXh0ZXJuYWwgVVJMIG9uIENocm9tZSBvbGRlciB0aGFuIDQzLlxuICAgICAgICAgICAgY2xpZW50cy5vcGVuV2luZG93KHJlZ2lzdHJhdGlvbi5zY29wZSArIFwicmVkaXJlY3Rvci5odG1sP3VybD1cIiArIGxhdW5jaFVSTCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pXG4gICAgKTtcbiAgfSxcblxuICBfZ2V0VGl0bGU6IGZ1bmN0aW9uIChpbmNvbWluZ1RpdGxlLCBjYWxsYmFjaykge1xuICAgIGlmIChpbmNvbWluZ1RpdGxlICE9IG51bGwpIHtcbiAgICAgIGNhbGxiYWNrKGluY29taW5nVGl0bGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnZGVmYXVsdFRpdGxlJyksIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdwYWdlVGl0bGUnKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBfZ2V0VGl0bGVfR290RGVmYXVsdFBhZ2VUaXRsZXMocmVzdWx0cykge1xuICAgICAgICB2YXIgZGVmYXVsdFRpdGxlUmVzdWx0ID0gcmVzdWx0c1swXTtcbiAgICAgICAgdmFyIHBhZ2VUaXRsZVJlc3VsdCA9IHJlc3VsdHNbMV07XG5cbiAgICAgICAgaWYgKGRlZmF1bHRUaXRsZVJlc3VsdCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRlZmF1bHRUaXRsZVJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHBhZ2VUaXRsZVJlc3VsdCAmJiBwYWdlVGl0bGVSZXN1bHQudmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgIGNhbGxiYWNrKHBhZ2VUaXRsZVJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKCcnKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgLy8gRGlzcGxheXMgbm90aWZpY2F0aW9uIGZyb20gY29udGVudCByZWNlaXZlZCBmcm9tIE9uZVNpZ25hbC5cbiAgX2hhbmRsZUdDTU1lc3NhZ2U6IGZ1bmN0aW9uIChzZXJ2aWNlV29ya2VyLCBldmVudCkge1xuICAgIC8vIFRPRE86IFJlYWQgZGF0YSBmcm9tIHRoZSBHQ00gcGF5bG9hZCB3aGVuIENocm9tZSBubyBsb25nZXIgcmVxdWlyZXMgdGhlIGJlbG93IGNvbW1hbmQgbGluZSBwYXJhbWV0ZXIuXG4gICAgLy8gLS1lbmFibGUtcHVzaC1tZXNzYWdlLXBheWxvYWRcbiAgICAvLyBUaGUgY29tbWFuZCBsaW5lIHBhcmFtIGlzIHJlcXVpcmVkIGV2ZW4gb24gQ2hyb21lIDQzIG5pZ2h0bHkgYnVpbGQgMjAxNS8wMy8xNy5cbiAgICBpZiAoZXZlbnQuZGF0YSAmJiBldmVudC5kYXRhLnRleHQoKVswXSA9PSBcIntcIikge1xuICAgICAgT25lU2lnbmFsLl9sb2coJ1JlY2VpdmVkIGRhdGEudGV4dDogJywgZXZlbnQuZGF0YS50ZXh0KCkpO1xuICAgICAgT25lU2lnbmFsLl9sb2coJ1JlY2VpdmVkIGRhdGEuanNvbjogJywgZXZlbnQuZGF0YS5qc29uKCkpO1xuICAgIH1cblxuICAgIGV2ZW50LndhaXRVbnRpbChuZXcgUHJvbWlzZShcbiAgICAgIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgT25lU2lnbmFsLl9nZXRUaXRsZShudWxsLCBmdW5jdGlvbiAodGl0bGUpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnZGVmYXVsdEljb24nKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gX2hhbmRsZUdDTU1lc3NhZ2VfR290RGVmYXVsdEljb24oZGVmYXVsdEljb25SZXN1bHQpIHtcbiAgICAgICAgICAgICAgT25lU2lnbmFsLl9nZXRMYXN0Tm90aWZpY2F0aW9ucyhmdW5jdGlvbiAocmVzcG9uc2UsIGFwcElkKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5vdGlmaWNhdGlvbkRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICBpZDogcmVzcG9uc2UuY3VzdG9tLmksXG4gICAgICAgICAgICAgICAgICBtZXNzYWdlOiByZXNwb25zZS5hbGVydCxcbiAgICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxEYXRhOiByZXNwb25zZS5jdXN0b20uYVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudGl0bGUpXG4gICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25EYXRhLnRpdGxlID0gcmVzcG9uc2UudGl0bGU7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uRGF0YS50aXRsZSA9IHRpdGxlO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmN1c3RvbS51KVxuICAgICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uRGF0YS5sYXVuY2hVUkwgPSByZXNwb25zZS5jdXN0b20udTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5pY29uKVxuICAgICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uRGF0YS5pY29uID0gcmVzcG9uc2UuaWNvbjtcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChkZWZhdWx0SWNvblJlc3VsdClcbiAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvbkRhdGEuaWNvbiA9IGRlZmF1bHRJY29uUmVzdWx0LnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgLy8gTmV2ZXIgbmVzdCB0aGUgZm9sbG93aW5nIGxpbmUgaW4gYSBjYWxsYmFjayBmcm9tIHRoZSBwb2ludCBvZiBlbnRlcmluZyBmcm9tIF9nZXRMYXN0Tm90aWZpY2F0aW9uc1xuICAgICAgICAgICAgICAgIHNlcnZpY2VXb3JrZXIucmVnaXN0cmF0aW9uLnNob3dOb3RpZmljYXRpb24obm90aWZpY2F0aW9uRGF0YS50aXRsZSwge1xuICAgICAgICAgICAgICAgICAgYm9keTogcmVzcG9uc2UuYWxlcnQsXG4gICAgICAgICAgICAgICAgICBpY29uOiBub3RpZmljYXRpb25EYXRhLmljb24sXG4gICAgICAgICAgICAgICAgICB0YWc6IEpTT04uc3RyaW5naWZ5KG5vdGlmaWNhdGlvbkRhdGEpXG4gICAgICAgICAgICAgICAgfSkudGhlbihyZXNvbHZlKVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdkZWZhdWx0VXJsJylcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkZWZhdWx0VXJsUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0VXJsUmVzdWx0KVxuICAgICAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZGVmYXVsdExhdW5jaFVSTCA9IGRlZmF1bHRVcmxSZXN1bHQudmFsdWU7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgIH0sIHJlc29sdmUpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSkpXG4gIH0sXG5cbiAgX2dldExhc3ROb3RpZmljYXRpb25zOiBmdW5jdGlvbiAoaXRlbUNhbGxiYWNrLCBjb21wbGV0ZUNhbGxiYWNrKSB7XG4gICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAndXNlcklkJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uIF9nZXRMYXN0Tm90aWZpY2F0aW9uc19Hb3RVc2VySWQodXNlcklkUmVzdWx0KSB7XG4gICAgICAgIGlmICh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX3NlbmRUb09uZVNpZ25hbEFwaShcInBsYXllcnMvXCIgKyB1c2VySWRSZXN1bHQuaWQgKyBcIi9jaHJvbWV3ZWJfbm90aWZpY2F0aW9uXCIsIFwiR0VUXCIsIG51bGwsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXNwb25zZS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgaXRlbUNhbGxiYWNrKEpTT04ucGFyc2UocmVzcG9uc2VbaV0pKTtcbiAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb21wbGV0ZUNhbGxiYWNrKCk7XG4gICAgICAgICAgfSk7ICAvLyBGYWlsZWQgY2FsbGJhY2tcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2xvZyhcIkVycm9yOiBjb3VsZCBub3QgZ2V0IG5vdGlmaWNhdGlvbklkXCIpO1xuICAgICAgICAgIGNvbXBsZXRlQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIC8vIEhUVFAgJiBIVFRQUyAtIFJ1bnMgb24gbWFpbiBwYWdlXG4gIF9saXN0ZW5lcl9yZWNlaXZlTWVzc2FnZTogZnVuY3Rpb24gcmVjZWl2ZU1lc3NhZ2UoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2xvZyhcIl9saXN0ZW5lcl9yZWNlaXZlTWVzc2FnZTogXCIsIGV2ZW50KTtcblxuICAgIGlmIChPbmVTaWduYWwuX2luaXRPcHRpb25zID09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybjtcblxuICAgIGlmICghT25lU2lnbmFsLl9JU19ERVYgJiYgZXZlbnQub3JpZ2luICE9PSBcIlwiICYmIGV2ZW50Lm9yaWdpbiAhPT0gXCJodHRwczovL29uZXNpZ25hbC5jb21cIiAmJiBldmVudC5vcmlnaW4gIT09IFwiaHR0cHM6Ly9cIiArIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZSArIFwiLm9uZXNpZ25hbC5jb21cIilcbiAgICAgIHJldHVybjtcblxuICAgIGlmIChldmVudC5kYXRhLm9uZVNpZ25hbEluaXRQYWdlUmVhZHkpIHsgLy8gT25seSBjYWxsZWQgb24gSFRUUCBwYWdlcy5cbiAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZXMoXCJPcHRpb25zXCIpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIF9saXN0ZW5lcl9yZWNlaXZlTWVzc2FnZShvcHRpb25zKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9sb2coXCJjdXJyZW50IG9wdGlvbnNcIiwgb3B0aW9ucyk7XG4gICAgICAgICAgaWYgKCFvcHRpb25zLmRlZmF1bHRVcmwpXG4gICAgICAgICAgICBvcHRpb25zLmRlZmF1bHRVcmwgPSBkb2N1bWVudC5VUkw7XG4gICAgICAgICAgaWYgKCFvcHRpb25zLmRlZmF1bHRUaXRsZSlcbiAgICAgICAgICAgIG9wdGlvbnMuZGVmYXVsdFRpdGxlID0gZG9jdW1lbnQudGl0bGU7XG5cbiAgICAgICAgICBvcHRpb25zLnBhcmVudF91cmwgPSBkb2N1bWVudC5VUkw7XG4gICAgICAgICAgT25lU2lnbmFsLl9sb2coXCJQb3N0aW5nIG1lc3NhZ2UgdG8gcG9ydFswXVwiLCBldmVudC5wb3J0c1swXSk7XG4gICAgICAgICAgZXZlbnQucG9ydHNbMF0ucG9zdE1lc3NhZ2Uoe2luaXRPcHRpb25zOiBvcHRpb25zfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoJ19saXN0ZW5lcl9yZWNlaXZlTWVzc2FnZTonLCBlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHZhciBldmVudERhdGEgPSBldmVudC5kYXRhLm9uZVNpZ25hbEluaXRQYWdlUmVhZHk7XG5cbiAgICAgIGlmIChldmVudERhdGEuaXNJZnJhbWUpXG4gICAgICAgIE9uZVNpZ25hbC5faWZyYW1lUG9ydCA9IGV2ZW50LnBvcnRzWzBdO1xuXG4gICAgICBpZiAoZXZlbnREYXRhLnVzZXJJZClcbiAgICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiSWRzXCIsIHt0eXBlOiBcInVzZXJJZFwiLCBpZDogZXZlbnREYXRhLnVzZXJJZH0pO1xuICAgICAgaWYgKGV2ZW50RGF0YS5yZWdpc3RyYXRpb25JZClcbiAgICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiSWRzXCIsIHt0eXBlOiBcInJlZ2lzdHJhdGlvbklkXCIsIGlkOiBldmVudERhdGEucmVnaXN0cmF0aW9uSWR9KTtcblxuICAgICAgT25lU2lnbmFsLl9maXJlTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrKGV2ZW50RGF0YS5pc1B1c2hFbmFibGVkKTtcbiAgICAgIE9uZVNpZ25hbC5fc2VuZFVuc2VudFRhZ3MoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5jdXJyZW50Tm90aWZpY2F0aW9uUGVybWlzc2lvbikgLy8gU3ViZG9tYWluIE9ubHlcbiAgICAgIE9uZVNpZ25hbC5fZmlyZU5vdGlmaWNhdGlvbkVuYWJsZWRDYWxsYmFjayhldmVudC5kYXRhLmN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uLmlzUHVzaEVuYWJsZWQpO1xuICAgIGVsc2UgaWYgKGV2ZW50LmRhdGEuaWRzQXZhaWxhYmxlKSB7IC8vIE9ubHkgY2FsbGVkIG9uIEhUVFAgcGFnZXMuXG4gICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiSWRzXCIsIHt0eXBlOiBcInVzZXJJZFwiLCBpZDogZXZlbnQuZGF0YS5pZHNBdmFpbGFibGUudXNlcklkfSk7XG4gICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwicmVnaXN0cmF0aW9uSWRcIiwgaWQ6IGV2ZW50LmRhdGEuaWRzQXZhaWxhYmxlLnJlZ2lzdHJhdGlvbklkfSk7XG5cbiAgICAgIGlmIChPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgIHdoaWxlIChPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cnJfY2FsbGJhY2sgPSBPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5wb3AoKVxuICAgICAgICAgIGN1cnJfY2FsbGJhY2soe1xuICAgICAgICAgICAgdXNlcklkOiBldmVudC5kYXRhLmlkc0F2YWlsYWJsZS51c2VySWQsXG4gICAgICAgICAgICByZWdpc3RyYXRpb25JZDogZXZlbnQuZGF0YS5pZHNBdmFpbGFibGUucmVnaXN0cmF0aW9uSWRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgT25lU2lnbmFsLl9zZW5kVW5zZW50VGFncygpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldmVudC5kYXRhLmh0dHBzUHJvbXB0QWNjZXB0ZWQpIHsgLy8gSFRUUFMgT25seVxuICAgICAgT25lU2lnbmFsLnJlZ2lzdGVyRm9yUHVzaE5vdGlmaWNhdGlvbnMoKTtcbiAgICAgIE9uZVNpZ25hbC5zZXRTdWJzY3JpcHRpb24odHJ1ZSk7XG4gICAgICAoZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdPbmVTaWduYWwtaWZyYW1lLW1vZGFsJykpLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbSk7XG4gICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9jdXN0b21Qcm9tcHRDbGlja2VkKCdncmFudGVkJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2ZW50LmRhdGEuaHR0cHNQcm9tcHRDYW5jZWxlZCkgeyAvLyBIVFRQUyBPbmx5XG4gICAgICAoZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdPbmVTaWduYWwtaWZyYW1lLW1vZGFsJykpLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbSk7XG4gICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9jdXN0b21Qcm9tcHRDbGlja2VkKCdkZW5pZWQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5odHRwUHJvbXB0QWNjZXB0ZWQpIHsgLy8gSFRUUCBPbmx5XG4gICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9jdXN0b21Qcm9tcHRDbGlja2VkKCdncmFudGVkJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2ZW50LmRhdGEuaHR0cFByb21wdENhbmNlbGVkKSB7IC8vIEhUVFAgT25seVxuICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfY3VzdG9tUHJvbXB0Q2xpY2tlZCgnZGVuaWVkJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKE9uZVNpZ25hbC5fbm90aWZpY2F0aW9uT3BlbmVkX2NhbGxiYWNrKSAvLyBIVFRQIGFuZCBIVFRQU1xuICAgICAgT25lU2lnbmFsLl9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2soZXZlbnQuZGF0YSk7XG4gIH0sXG5cbiAgYWRkTGlzdGVuZXJGb3JOb3RpZmljYXRpb25PcGVuZWQ6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIE9uZVNpZ25hbC5fbm90aWZpY2F0aW9uT3BlbmVkX2NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgaWYgKHdpbmRvdykge1xuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKFwiTm90aWZpY2F0aW9uT3BlbmVkXCIsIGRvY3VtZW50LlVSTClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCkge1xuICAgICAgICAgIGlmIChub3RpZmljYXRpb25PcGVuZWRSZXN1bHQpIHtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fZGVsZXRlRGJWYWx1ZShcIk5vdGlmaWNhdGlvbk9wZW5lZFwiLCBkb2N1bWVudC5VUkwpO1xuICAgICAgICAgICAgT25lU2lnbmFsLl9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2sobm90aWZpY2F0aW9uT3BlbmVkUmVzdWx0LmRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgICA7XG4gICAgfVxuICB9LFxuXG4gIC8vIFN1YmRvbWFpbiAtIEZpcmVkIGZyb20gbWVzc2FnZSByZWNlaXZlZCBmcm9tIGlmcmFtZS5cbiAgX2ZpcmVOb3RpZmljYXRpb25FbmFibGVkQ2FsbGJhY2s6IGZ1bmN0aW9uIChub3RpZlBlcm1zc2lvbikge1xuICAgIGlmIChPbmVTaWduYWwuX2lzTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrKSB7XG4gICAgICBPbmVTaWduYWwuX2lzTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrKG5vdGlmUGVybXNzaW9uKTtcbiAgICAgIE9uZVNpZ25hbC5faXNOb3RpZmljYXRpb25FbmFibGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICBnZXRJZHNBdmFpbGFibGU6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2sucHVzaChjYWxsYmFjayk7XG5cbiAgICBQcm9taXNlLmFsbChbT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAndXNlcklkJyksIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3JlZ2lzdHJhdGlvbklkJyldKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gZ2V0SWRzQXZhaWxhYmxlX0dvdFVzZXJSZWdpc3RyYXRpb25JZHMocmVzdWx0cykge1xuICAgICAgICB2YXIgdXNlcklkUmVzdWx0ID0gcmVzdWx0c1swXTtcbiAgICAgICAgdmFyIHJlZ2lzdHJhdGlvbklkUmVzdWx0ID0gcmVzdWx0c1sxXTtcblxuICAgICAgICBpZiAodXNlcklkUmVzdWx0KSB7XG4gICAgICAgICAgaWYgKHJlZ2lzdHJhdGlvbklkUmVzdWx0KSB7XG4gICAgICAgICAgICB3aGlsZSAoT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICB2YXIgY3Vycl9jYWxsYmFjayA9IE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLnBvcCgpO1xuICAgICAgICAgICAgICBjdXJyX2NhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICB1c2VySWQ6IHVzZXJJZFJlc3VsdC5pZCxcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25JZDogcmVnaXN0cmF0aW9uSWRSZXN1bHQuaWRcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHdoaWxlIChPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBjdXJyX2NhbGxiYWNrID0gT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2sucG9wKCk7XG4gICAgICAgICAgICAgIGN1cnJfY2FsbGJhY2soe3VzZXJJZDogdXNlcklkUmVzdWx0LmlkLCByZWdpc3RyYXRpb25JZDogbnVsbH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgICA7XG4gIH0sXG5cbiAgZ2V0VGFnczogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAndXNlcklkJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgaWYgKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fc2VuZFRvT25lU2lnbmFsQXBpKFwicGxheWVycy9cIiArIHVzZXJJZFJlc3VsdC5pZCwgJ0dFVCcsIG51bGwsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UudGFncyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICBpc1B1c2hOb3RpZmljYXRpb25zRW5hYmxlZDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgLy8gSWYgU3ViZG9tYWluXG4gICAgaWYgKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZSAmJiAhT25lU2lnbmFsLl9pc0Jyb3dzZXJTYWZhcmkoKSkge1xuICAgICAgT25lU2lnbmFsLl9pc05vdGlmaWNhdGlvbkVuYWJsZWRDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgaWYgKE9uZVNpZ25hbC5faWZyYW1lUG9ydClcbiAgICAgICAgT25lU2lnbmFsLl9pZnJhbWVQb3J0LnBvc3RNZXNzYWdlKHtnZXROb3RpZmljYXRpb25QZXJtaXNzaW9uOiB0cnVlfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgSFRUUFNcblxuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdyZWdpc3RyYXRpb25JZCcpLCBPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnc3Vic2NyaXB0aW9uJyldKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdHMpIHtcbiAgICAgICAgdmFyIHJlZ2lzdHJhdGlvbklkUmVzdWx0ID0gcmVzdWx0c1swXTtcbiAgICAgICAgdmFyIHN1YnNjcmlwdGlvblJlc3VsdCA9IHJlc3VsdHNbMV07XG5cbiAgICAgICAgaWYgKHJlZ2lzdHJhdGlvbklkUmVzdWx0KSB7XG4gICAgICAgICAgaWYgKHN1YnNjcmlwdGlvblJlc3VsdCAmJiAhc3Vic2NyaXB0aW9uUmVzdWx0LnZhbHVlKVxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGZhbHNlKTtcblxuICAgICAgICAgIGNhbGxiYWNrKE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID09IFwiZ3JhbnRlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgX2lzU3VwcG9ydGVkU2FmYXJpOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNhZmFyaVZlcnNpb24gPSBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaChcIlZlcnNpb24vKFswLTldPykuKiBTYWZhcmlcIik7XG4gICAgaWYgKHNhZmFyaVZlcnNpb24gPT0gbnVsbClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAoL2lQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiAocGFyc2VJbnQoc2FmYXJpVmVyc2lvblsxXSkgPiA2KTtcbiAgfSxcblxuICBfaXNCcm93c2VyU2FmYXJpOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2FmYXJpVmVyc2lvbiA9IG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKFwiVmVyc2lvbi8oWzAtOV0/KS4qIFNhZmFyaVwiKTtcbiAgICByZXR1cm4gc2FmYXJpVmVyc2lvbiAhPSBudWxsIDtcbiAgfSxcblxuICBfaXNTdXBwb3J0ZWRGaXJlRm94OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZpcmVGb3hWZXJzaW9uID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvKEZpcmVmb3hcXC8pKFswLTldezIsfVxcLlswLTldezEsfSkvKTtcbiAgICBpZiAoZmlyZUZveFZlcnNpb24pXG4gICAgICByZXR1cm4gcGFyc2VJbnQoZmlyZUZveFZlcnNpb25bMl0uc3Vic3RyaW5nKDAsIDIpKSA+IDQzO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICBfaXNCcm93c2VyRmlyZWZveDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpcmVGb3hWZXJzaW9uID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvKEZpcmVmb3hcXC8pKFswLTldezIsfVxcLlswLTldezEsfSkvKTtcbiAgICByZXR1cm4gZmlyZUZveFZlcnNpb24gIT0gbnVsbCA7XG4gIH0sXG5cbiAgX2dldEZpcmVmb3hWZXJzaW9uOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmlyZUZveFZlcnNpb24gPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC8oRmlyZWZveFxcLykoWzAtOV17Mix9XFwuWzAtOV17MSx9KS8pO1xuICAgIGlmIChmaXJlRm94VmVyc2lvbilcbiAgICAgIHJldHVybiBwYXJzZUludChmaXJlRm94VmVyc2lvblsyXS5zdWJzdHJpbmcoMCwgMikpO1xuICAgIGVsc2UgcmV0dXJuIC0xO1xuICB9LFxuXG4gIGlzUHVzaE5vdGlmaWNhdGlvbnNTdXBwb3J0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoT25lU2lnbmFsLl9pc1N1cHBvcnRlZEZpcmVGb3goKSlcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgaWYgKE9uZVNpZ25hbC5faXNTdXBwb3J0ZWRTYWZhcmkoKSlcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgdmFyIGNocm9tZVZlcnNpb24gPSBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvQ2hyb21lXFwvKC4qPykgLyk7XG5cbiAgICAvLyBDaHJvbWUgaXMgbm90IGZvdW5kIGluIGFwcFZlcnNpb24uXG4gICAgaWYgKCFjaHJvbWVWZXJzaW9uKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gTWljcm9zb2Z0IEVkZ2VcbiAgICBpZiAobmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goL0VkZ2UvKSlcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIC8vIEFuZHJvaWQgQ2hyb21lIFdlYlZpZXdcbiAgICBpZiAobmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goLyB3di8pKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gT3BlcmFcbiAgICBpZiAobmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goL09QUlxcLy8pKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gVGhlIHVzZXIgaXMgb24gaU9TXG4gICAgaWYgKC9pUGFkfGlQaG9uZXxpUG9kLy50ZXN0KG5hdmlnYXRvci5wbGF0Zm9ybSkpXG4gICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gcGFyc2VJbnQoY2hyb21lVmVyc2lvblsxXS5zdWJzdHJpbmcoMCwgMikpID4gNDE7XG4gIH0sXG5cbiAgX2dldE5vdGlmaWNhdGlvblR5cGVzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBPbmVTaWduYWwuX2dldFN1YnNjcmlwdGlvbihmdW5jdGlvbiAoZGJfc3Vic2NyaXB0aW9uU2V0KSB7XG4gICAgICBjYWxsYmFjayhkYl9zdWJzY3JpcHRpb25TZXQgPyAxIDogLTIpO1xuICAgIH0pO1xuICB9LFxuXG4gIHNldFN1YnNjcmlwdGlvbjogZnVuY3Rpb24gKG5ld1N1YnNjcmlwdGlvbikge1xuICAgIGlmIChPbmVTaWduYWwuX2lmcmFtZVBvcnQpXG4gICAgICBPbmVTaWduYWwuX2lmcmFtZVBvcnQucG9zdE1lc3NhZ2Uoe3NldFN1YmRvbWFpblN0YXRlOiB7c2V0U3Vic2NyaXB0aW9uOiBuZXdTdWJzY3JpcHRpb259fSk7XG4gICAgZWxzZSB7XG4gICAgICBPbmVTaWduYWwuX2dldFN1YnNjcmlwdGlvbihmdW5jdGlvbiAoY3VycmVudFN1YnNjcmlwdGlvbikge1xuICAgICAgICBpZiAoY3VycmVudFN1YnNjcmlwdGlvbiAhPSBuZXdTdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJPcHRpb25zXCIsIHtrZXk6IFwic3Vic2NyaXB0aW9uXCIsIHZhbHVlOiBuZXdTdWJzY3JpcHRpb259KTtcbiAgICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgICAgICBpZiAodXNlcklkUmVzdWx0KVxuICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fc2VuZFRvT25lU2lnbmFsQXBpKFwicGxheWVycy9cIiArIHVzZXJJZFJlc3VsdC5pZCwgXCJQVVRcIiwge1xuICAgICAgICAgICAgICAgICAgYXBwX2lkOiBPbmVTaWduYWwuX2FwcF9pZCxcbiAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvbl90eXBlczogbmV3U3Vic2NyaXB0aW9uID8gMSA6IC0yXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gc2V0U3Vic2NyaXB0aW9uU2V0Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9pbnRlcm5hbFN1YnNjcmlwdGlvblNldChuZXdTdWJzY3JpcHRpb24pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfZ2V0U3Vic2NyaXB0aW9uOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnc3Vic2NyaXB0aW9uJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChzdWJzY3JpcHRpb25SZXN1bHQpIHtcbiAgICAgICAgY2FsbGJhY2soIShzdWJzY3JpcHRpb25SZXN1bHQgJiYgc3Vic2NyaXB0aW9uUmVzdWx0LnZhbHVlID09IGZhbHNlKSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgICA7XG4gIH0sXG5cbiAgX3NhZmVQb3N0TWVzc2FnZTogZnVuY3Rpb24gKGNyZWF0b3IsIGRhdGEsIHRhcmdldE9yaWdpbiwgcmVjZWl2ZXIpIHtcbiAgICB2YXIgdE9yaWdpbiA9IHRhcmdldE9yaWdpbi50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gSWYgd2UgYXJlIHRyeWluZyB0byB0YXJnZXQgYSBodHRwIHNpdGUgYWxsb3cgdGhlIGh0dHBzIHZlcnNpb24uICh3LyBvciB3L28gJ3d3d3cuJyB0b28pXG4gICAgaWYgKHRPcmlnaW4uc3RhcnRzV2l0aChcImh0dHA6Ly9cIikpIHtcbiAgICAgIHZhciBxdWVyeURpY3QgPSB7fTtcbiAgICAgIGxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkuc3BsaXQoXCImXCIpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcXVlcnlEaWN0W2l0ZW0uc3BsaXQoXCI9XCIpWzBdXSA9IGl0ZW0uc3BsaXQoXCI9XCIpWzFdXG4gICAgICB9KTtcbiAgICAgIHZhciB2YWxpZFByZVVSTFJlZ2V4ID0gL15odHRwKHN8KTpcXC9cXC8od3d3XFwufCkvO1xuICAgICAgdE9yaWdpbiA9IHRPcmlnaW4ucmVwbGFjZSh2YWxpZFByZVVSTFJlZ2V4LCBxdWVyeURpY3RbXCJob3N0UGFnZVByb3RvY29sXCJdKTtcbiAgICB9XG5cbiAgICBpZiAocmVjZWl2ZXIpXG4gICAgICBjcmVhdG9yLnBvc3RNZXNzYWdlKGRhdGEsIHRPcmlnaW4sIHJlY2VpdmVyKTtcbiAgICBlbHNlXG4gICAgICBjcmVhdG9yLnBvc3RNZXNzYWdlKGRhdGEsIHRPcmlnaW4pO1xuICB9LFxuXG4gIF9wcm9jZXNzX3B1c2hlczogZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKylcbiAgICAgIE9uZVNpZ25hbC5wdXNoKGFycmF5W2ldKTtcbiAgfSxcblxuICBwdXNoOiBmdW5jdGlvbiAoaXRlbSkge1xuICAgIGlmICh0eXBlb2YoaXRlbSkgPT0gXCJmdW5jdGlvblwiKVxuICAgICAgaXRlbSgpO1xuICAgIGVsc2Uge1xuICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IGl0ZW0uc2hpZnQoKTtcbiAgICAgIE9uZVNpZ25hbFtmdW5jdGlvbk5hbWVdLmFwcGx5KG51bGwsIGl0ZW0pO1xuICAgIH1cbiAgfVxufTtcblxuaWYgKE9uZVNpZ25hbC5fSVNfREVWKSB7XG4gIE9uZVNpZ25hbC5MT0dHSU5HID0gdHJ1ZTtcbiAgT25lU2lnbmFsLl9IT1NUX1VSTCA9IFwiaHR0cHM6Ly8xOTIuMTY4LjEuMjA2OjMwMDAvYXBpL3YxL1wiO1xufVxuXG4vLyBJZiBpbXBvcnRlZCBvbiB5b3VyIHBhZ2UuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIilcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIE9uZVNpZ25hbC5fbGlzdGVuZXJfcmVjZWl2ZU1lc3NhZ2UsIGZhbHNlKTtcbmVsc2UgeyAvLyBpZiBpbXBvcnRlZCBmcm9tIHRoZSBzZXJ2aWNlIHdvcmtlci5cbiAgaW1wb3J0U2NyaXB0cygnaHR0cHM6Ly9jZG4ub25lc2lnbmFsLmNvbS9zZGtzL3NlcnZpY2V3b3JrZXItY2FjaGUtcG9seWZpbGwuanMnKTtcblxuICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ3B1c2gnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2hhbmRsZUdDTU1lc3NhZ2Uoc2VsZiwgZXZlbnQpO1xuICB9KTtcbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdub3RpZmljYXRpb25jbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIE9uZVNpZ25hbC5faGFuZGxlTm90aWZpY2F0aW9uT3BlbmVkKGV2ZW50KTtcbiAgfSk7XG5cbiAgdmFyIGlzU1dvblN1YmRvbWFpbiA9IGxvY2F0aW9uLmhyZWYubWF0Y2goL2h0dHBzXFw6XFwvXFwvLipcXC5vbmVzaWduYWwuY29tXFwvc2Rrc1xcLy8pICE9IG51bGw7XG4gIGlmIChPbmVTaWduYWwuX0lTX0RFVilcbiAgICBpc1NXb25TdWJkb21haW4gPSB0cnVlOztcblxuICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2luc3RhbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2xvZyhcIk9uZVNpZ25hbCBJbnN0YWxsZWQgc2VydmljZSB3b3JrZXI6IFwiICsgT25lU2lnbmFsLl9WRVJTSU9OKTtcbiAgICBpZiAoc2VsZi5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKFwiT25lU2lnbmFsU0RLV29ya2VyLmpzXCIpID4gLTEpXG4gICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwiV09SS0VSMV9PTkVfU0lHTkFMX1NXX1ZFUlNJT05cIiwgaWQ6IE9uZVNpZ25hbC5fVkVSU0lPTn0pO1xuICAgIGVsc2VcbiAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJXT1JLRVIyX09ORV9TSUdOQUxfU1dfVkVSU0lPTlwiLCBpZDogT25lU2lnbmFsLl9WRVJTSU9OfSk7XG5cbiAgICBpZiAoaXNTV29uU3ViZG9tYWluKSB7XG4gICAgICBldmVudC53YWl0VW50aWwoXG4gICAgICAgIGNhY2hlcy5vcGVuKFwiT25lU2lnbmFsX1wiICsgT25lU2lnbmFsLl9WRVJTSU9OKS50aGVuKGZ1bmN0aW9uIChjYWNoZSkge1xuICAgICAgICAgIHJldHVybiBjYWNoZS5hZGRBbGwoW1xuICAgICAgICAgICAgJy9zZGtzL2luaXRPbmVTaWduYWxIdHRwSWZyYW1lJyxcbiAgICAgICAgICAgICcvc2Rrcy9pbml0T25lU2lnbmFsSHR0cElmcmFtZT9zZXNzaW9uPSonLFxuICAgICAgICAgICAgJy9zZGtzL21hbmlmZXN0X2pzb24nXSk7XG4gICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGlzU1dvblN1YmRvbWFpbikge1xuICAgIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignZmV0Y2gnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnJlc3BvbmRXaXRoKFxuICAgICAgICBjYWNoZXMubWF0Y2goZXZlbnQucmVxdWVzdClcbiAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIENhY2hlIGhpdCAtIHJldHVybiByZXNwb25zZVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlKVxuICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG5cbiAgICAgICAgICAgIHJldHVybiBmZXRjaChldmVudC5yZXF1ZXN0KTtcbiAgICAgICAgICB9XG4gICAgICAgIClcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbn1cblxuaWYgKF90ZW1wX09uZVNpZ25hbClcbiAgT25lU2lnbmFsLl9wcm9jZXNzX3B1c2hlcyhfdGVtcF9PbmVTaWduYWwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9uZVNpZ25hbDtcblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NyYy9zZGsuanNcbiAqKi8iLCIvKlxyXG4qIGxvZ2xldmVsIC0gaHR0cHM6Ly9naXRodWIuY29tL3BpbXRlcnJ5L2xvZ2xldmVsXHJcbipcclxuKiBDb3B5cmlnaHQgKGMpIDIwMTMgVGltIFBlcnJ5XHJcbiogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxyXG4qL1xyXG4oZnVuY3Rpb24gKHJvb3QsIGRlZmluaXRpb24pIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzICYmIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByb290LmxvZyA9IGRlZmluaXRpb24oKTtcclxuICAgIH1cclxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcclxuICAgIHZhciB1bmRlZmluZWRUeXBlID0gXCJ1bmRlZmluZWRcIjtcclxuXHJcbiAgICBmdW5jdGlvbiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBXZSBjYW4ndCBidWlsZCBhIHJlYWwgbWV0aG9kIHdpdGhvdXQgYSBjb25zb2xlIHRvIGxvZyB0b1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZVttZXRob2ROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBiaW5kTWV0aG9kKGNvbnNvbGUsIG1ldGhvZE5hbWUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZS5sb2cgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCAnbG9nJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vb3A7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGJpbmRNZXRob2Qob2JqLCBtZXRob2ROYW1lKSB7XHJcbiAgICAgICAgdmFyIG1ldGhvZCA9IG9ialttZXRob2ROYW1lXTtcclxuICAgICAgICBpZiAodHlwZW9mIG1ldGhvZC5iaW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBtZXRob2QuYmluZChvYmopO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuY2FsbChtZXRob2QsIG9iaik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIE1pc3NpbmcgYmluZCBzaGltIG9yIElFOCArIE1vZGVybml6ciwgZmFsbGJhY2sgdG8gd3JhcHBpbmdcclxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KG1ldGhvZCwgW29iaiwgYXJndW1lbnRzXSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHRoZXNlIHByaXZhdGUgZnVuY3Rpb25zIGFsd2F5cyBuZWVkIGB0aGlzYCB0byBiZSBzZXQgcHJvcGVybHlcclxuXHJcbiAgICBmdW5jdGlvbiBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzKG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSB1bmRlZmluZWRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICByZXBsYWNlTG9nZ2luZ01ldGhvZHMuY2FsbCh0aGlzLCBsZXZlbCwgbG9nZ2VyTmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzW21ldGhvZE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlcGxhY2VMb2dnaW5nTWV0aG9kcyhsZXZlbCwgbG9nZ2VyTmFtZSkge1xyXG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsb2dNZXRob2RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBtZXRob2ROYW1lID0gbG9nTWV0aG9kc1tpXTtcclxuICAgICAgICAgICAgdGhpc1ttZXRob2ROYW1lXSA9IChpIDwgbGV2ZWwpID9cclxuICAgICAgICAgICAgICAgIG5vb3AgOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVmYXVsdE1ldGhvZEZhY3RvcnkobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpIHtcclxuICAgICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xyXG4gICAgICAgIHJldHVybiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHx8XHJcbiAgICAgICAgICAgICAgIGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgbG9nTWV0aG9kcyA9IFtcclxuICAgICAgICBcInRyYWNlXCIsXHJcbiAgICAgICAgXCJkZWJ1Z1wiLFxyXG4gICAgICAgIFwiaW5mb1wiLFxyXG4gICAgICAgIFwid2FyblwiLFxyXG4gICAgICAgIFwiZXJyb3JcIlxyXG4gICAgXTtcclxuXHJcbiAgICBmdW5jdGlvbiBMb2dnZXIobmFtZSwgZGVmYXVsdExldmVsLCBmYWN0b3J5KSB7XHJcbiAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgdmFyIGN1cnJlbnRMZXZlbDtcclxuICAgICAgdmFyIHN0b3JhZ2VLZXkgPSBcImxvZ2xldmVsXCI7XHJcbiAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgc3RvcmFnZUtleSArPSBcIjpcIiArIG5hbWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWxOdW0pIHtcclxuICAgICAgICAgIHZhciBsZXZlbE5hbWUgPSAobG9nTWV0aG9kc1tsZXZlbE51bV0gfHwgJ3NpbGVudCcpLnRvVXBwZXJDYXNlKCk7XHJcblxyXG4gICAgICAgICAgLy8gVXNlIGxvY2FsU3RvcmFnZSBpZiBhdmFpbGFibGVcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZVtzdG9yYWdlS2V5XSA9IGxldmVsTmFtZTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XHJcblxyXG4gICAgICAgICAgLy8gVXNlIHNlc3Npb24gY29va2llIGFzIGZhbGxiYWNrXHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPVxyXG4gICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9XCIgKyBsZXZlbE5hbWUgKyBcIjtcIjtcclxuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gZ2V0UGVyc2lzdGVkTGV2ZWwoKSB7XHJcbiAgICAgICAgICB2YXIgc3RvcmVkTGV2ZWw7XHJcblxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2Vbc3RvcmFnZUtleV07XHJcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XHJcblxyXG4gICAgICAgICAgaWYgKHR5cGVvZiBzdG9yZWRMZXZlbCA9PT0gdW5kZWZpbmVkVHlwZSkge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBjb29raWUgPSB3aW5kb3cuZG9jdW1lbnQuY29va2llO1xyXG4gICAgICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSBjb29raWUuaW5kZXhPZihcclxuICAgICAgICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdG9yYWdlS2V5KSArIFwiPVwiKTtcclxuICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IC9eKFteO10rKS8uZXhlYyhjb29raWUuc2xpY2UobG9jYXRpb24pKVsxXTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGUgc3RvcmVkIGxldmVsIGlzIG5vdCB2YWxpZCwgdHJlYXQgaXQgYXMgaWYgbm90aGluZyB3YXMgc3RvcmVkLlxyXG4gICAgICAgICAgaWYgKHNlbGYubGV2ZWxzW3N0b3JlZExldmVsXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHN0b3JlZExldmVsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvKlxyXG4gICAgICAgKlxyXG4gICAgICAgKiBQdWJsaWMgQVBJXHJcbiAgICAgICAqXHJcbiAgICAgICAqL1xyXG5cclxuICAgICAgc2VsZi5sZXZlbHMgPSB7IFwiVFJBQ0VcIjogMCwgXCJERUJVR1wiOiAxLCBcIklORk9cIjogMiwgXCJXQVJOXCI6IDMsXHJcbiAgICAgICAgICBcIkVSUk9SXCI6IDQsIFwiU0lMRU5UXCI6IDV9O1xyXG5cclxuICAgICAgc2VsZi5tZXRob2RGYWN0b3J5ID0gZmFjdG9yeSB8fCBkZWZhdWx0TWV0aG9kRmFjdG9yeTtcclxuXHJcbiAgICAgIHNlbGYuZ2V0TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gY3VycmVudExldmVsO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VsZi5zZXRMZXZlbCA9IGZ1bmN0aW9uIChsZXZlbCwgcGVyc2lzdCkge1xyXG4gICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJzdHJpbmdcIiAmJiBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgbGV2ZWwgPSBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09IFwibnVtYmVyXCIgJiYgbGV2ZWwgPj0gMCAmJiBsZXZlbCA8PSBzZWxmLmxldmVscy5TSUxFTlQpIHtcclxuICAgICAgICAgICAgICBjdXJyZW50TGV2ZWwgPSBsZXZlbDtcclxuICAgICAgICAgICAgICBpZiAocGVyc2lzdCAhPT0gZmFsc2UpIHsgIC8vIGRlZmF1bHRzIHRvIHRydWVcclxuICAgICAgICAgICAgICAgICAgcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHJlcGxhY2VMb2dnaW5nTWV0aG9kcy5jYWxsKHNlbGYsIGxldmVsLCBuYW1lKTtcclxuICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUgJiYgbGV2ZWwgPCBzZWxmLmxldmVscy5TSUxFTlQpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29uc29sZSBhdmFpbGFibGUgZm9yIGxvZ2dpbmdcIjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRocm93IFwibG9nLnNldExldmVsKCkgY2FsbGVkIHdpdGggaW52YWxpZCBsZXZlbDogXCIgKyBsZXZlbDtcclxuICAgICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHNlbGYuc2V0RGVmYXVsdExldmVsID0gZnVuY3Rpb24gKGxldmVsKSB7XHJcbiAgICAgICAgICBpZiAoIWdldFBlcnNpc3RlZExldmVsKCkpIHtcclxuICAgICAgICAgICAgICBzZWxmLnNldExldmVsKGxldmVsLCBmYWxzZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBzZWxmLmVuYWJsZUFsbCA9IGZ1bmN0aW9uKHBlcnNpc3QpIHtcclxuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuVFJBQ0UsIHBlcnNpc3QpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VsZi5kaXNhYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xyXG4gICAgICAgICAgc2VsZi5zZXRMZXZlbChzZWxmLmxldmVscy5TSUxFTlQsIHBlcnNpc3QpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHRoZSByaWdodCBsZXZlbFxyXG4gICAgICB2YXIgaW5pdGlhbExldmVsID0gZ2V0UGVyc2lzdGVkTGV2ZWwoKTtcclxuICAgICAgaWYgKGluaXRpYWxMZXZlbCA9PSBudWxsKSB7XHJcbiAgICAgICAgICBpbml0aWFsTGV2ZWwgPSBkZWZhdWx0TGV2ZWwgPT0gbnVsbCA/IFwiV0FSTlwiIDogZGVmYXVsdExldmVsO1xyXG4gICAgICB9XHJcbiAgICAgIHNlbGYuc2V0TGV2ZWwoaW5pdGlhbExldmVsLCBmYWxzZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAqXHJcbiAgICAgKiBQYWNrYWdlLWxldmVsIEFQSVxyXG4gICAgICpcclxuICAgICAqL1xyXG5cclxuICAgIHZhciBkZWZhdWx0TG9nZ2VyID0gbmV3IExvZ2dlcigpO1xyXG5cclxuICAgIHZhciBfbG9nZ2Vyc0J5TmFtZSA9IHt9O1xyXG4gICAgZGVmYXVsdExvZ2dlci5nZXRMb2dnZXIgPSBmdW5jdGlvbiBnZXRMb2dnZXIobmFtZSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIiB8fCBuYW1lID09PSBcIlwiKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiWW91IG11c3Qgc3VwcGx5IGEgbmFtZSB3aGVuIGNyZWF0aW5nIGEgbG9nZ2VyLlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsb2dnZXIgPSBfbG9nZ2Vyc0J5TmFtZVtuYW1lXTtcclxuICAgICAgICBpZiAoIWxvZ2dlcikge1xyXG4gICAgICAgICAgbG9nZ2VyID0gX2xvZ2dlcnNCeU5hbWVbbmFtZV0gPSBuZXcgTG9nZ2VyKFxyXG4gICAgICAgICAgICBuYW1lLCBkZWZhdWx0TG9nZ2VyLmdldExldmVsKCksIGRlZmF1bHRMb2dnZXIubWV0aG9kRmFjdG9yeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsb2dnZXI7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdyYWIgdGhlIGN1cnJlbnQgZ2xvYmFsIGxvZyB2YXJpYWJsZSBpbiBjYXNlIG9mIG92ZXJ3cml0ZVxyXG4gICAgdmFyIF9sb2cgPSAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSkgPyB3aW5kb3cubG9nIDogdW5kZWZpbmVkO1xyXG4gICAgZGVmYXVsdExvZ2dlci5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IHVuZGVmaW5lZFR5cGUgJiZcclxuICAgICAgICAgICAgICAgd2luZG93LmxvZyA9PT0gZGVmYXVsdExvZ2dlcikge1xyXG4gICAgICAgICAgICB3aW5kb3cubG9nID0gX2xvZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gZGVmYXVsdExvZ2dlcjtcclxufSkpO1xyXG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanNcbiAqKiBtb2R1bGUgaWQgPSAyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IGdsb2JhbFtcIk9uZVNpZ25hbFwiXSA9IHJlcXVpcmUoXCItIS9Vc2Vycy9qcGFuZy9jb2RlL09uZVNpZ25hbC1XZWJzaXRlLVNESy9ub2RlX21vZHVsZXMvYmFiZWwtbG9hZGVyL2luZGV4LmpzP3tcXFwicHJlc2V0c1xcXCI6W1xcXCJlczIwMTVcXFwiXSxcXFwiY2FjaGVEaXJlY3RvcnlcXFwiOnRydWV9IS9Vc2Vycy9qcGFuZy9jb2RlL09uZVNpZ25hbC1XZWJzaXRlLVNESy9zcmMvc2RrLmpzXCIpO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2V4cG9zZS1sb2FkZXI/T25lU2lnbmFsIS4vc3JjL3Nkay5qc1xuICoqIG1vZHVsZSBpZCA9IDNcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyJdLCJzb3VyY2VSb290IjoiIn0=