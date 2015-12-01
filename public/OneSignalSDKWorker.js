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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMzhhNzRlM2MzYjBlODlkYzc1MTEiLCJ3ZWJwYWNrOi8vLy4vc3JjL2VudHJ5LmpzIiwid2VicGFjazovLy8uL3NyYy9zZGsuanMiLCJ3ZWJwYWNrOi8vLy4vfi9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3Nkay5qcz9kZmIwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSx1QkFBZTtBQUNmO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNsQ0Esb0JBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU3QixvQkFBTyxDQUFDLENBQTJCLENBQUMsQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDa0NwQyxVQUFTLFVBQVUsR0FBRyxFQUNyQjs7QUFFRCxXQUFVLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUN0QixXQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQzs7QUFFckIsV0FBVSxDQUFDLEdBQUcsR0FBRyxVQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDckMsT0FBSSxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFNBQVMsRUFBRTtBQUN2QyxlQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDO0FBQ0QsYUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEMsT0FBSSxVQUFVLENBQUMsS0FBSyxDQUFD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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMkNBQTBDO0FBQzFDO0FBQ0EsZ0JBQWU7QUFDZjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsc0JBQXFCO0FBQ3JCOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1Q0FBc0M7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBVztBQUNYO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxFQUFDOzs7Ozs7O0FDOU5ELDJHQUErSyxFIiwiZmlsZSI6Ik9uZVNpZ25hbFNESy5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRleHBvcnRzOiB7fSxcbiBcdFx0XHRpZDogbW9kdWxlSWQsXG4gXHRcdFx0bG9hZGVkOiBmYWxzZVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sb2FkZWQgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKDApO1xuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogd2VicGFjay9ib290c3RyYXAgMzhhNzRlM2MzYjBlODlkYzc1MTFcbiAqKi8iLCJpbXBvcnQgXCIuL3Nkay5qc1wiO1xuaW1wb3J0IGxvZyBmcm9tICdsb2dsZXZlbCc7XG5cbi8vIExldCdzIHNlZSBhbGwgZXJyb3JzXG5sb2cuc2V0RGVmYXVsdExldmVsKCd0cmFjZScpO1xuXG5yZXF1aXJlKFwiZXhwb3NlP09uZVNpZ25hbCEuL3Nkay5qc1wiKTtcblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NyYy9lbnRyeS5qc1xuICoqLyIsImltcG9ydCBsb2cgZnJvbSAnbG9nbGV2ZWwnO1xuXG5cbi8qKlxuICogTW9kaWZpZWQgTUlUIExpY2Vuc2VcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNSBPbmVTaWduYWxcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogMS4gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIDIuIEFsbCBjb3BpZXMgb2Ygc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlIG1heSBvbmx5IGJlIHVzZWQgaW4gY29ubmVjdGlvblxuICogd2l0aCBzZXJ2aWNlcyBwcm92aWRlZCBieSBPbmVTaWduYWwuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLypcbiBMaW1pdFN0b3JlLnB1dCgnY29sb3JhZG8nLCAncm9ja3knKTtcbiBbXCJyb2NreVwiXVxuIExpbWl0U3RvcmUucHV0KCdjb2xvcmFkbycsICdtb3VudGFpbicpO1xuIFtcInJvY2t5XCIsIFwibW91bnRhaW5cIl1cbiBMaW1pdFN0b3JlLnB1dCgnY29sb3JhZG8nLCAnbmF0aW9uYWwnKTtcbiBbXCJtb3VudGFpblwiLCBcIm5hdGlvbmFsXCJdXG4gTGltaXRTdG9yZS5wdXQoJ2NvbG9yYWRvJywgJ3BhcmsnKTtcbiBbXCJuYXRpb25hbFwiLCBcInBhcmtcIl1cbiAqL1xuZnVuY3Rpb24gTGltaXRTdG9yZSgpIHtcbn1cblxuTGltaXRTdG9yZS5zdG9yZSA9IHt9O1xuTGltaXRTdG9yZS5MSU1JVCA9IDI7XG5cbkxpbWl0U3RvcmUucHV0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgaWYgKExpbWl0U3RvcmUuc3RvcmVba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgTGltaXRTdG9yZS5zdG9yZVtrZXldID0gW251bGwsIG51bGxdO1xuICB9XG4gIExpbWl0U3RvcmUuc3RvcmVba2V5XS5wdXNoKHZhbHVlKTtcbiAgaWYgKExpbWl0U3RvcmUuc3RvcmVba2V5XS5sZW5ndGggPT0gTGltaXRTdG9yZS5MSU1JVCArIDEpIHtcbiAgICBMaW1pdFN0b3JlLnN0b3JlW2tleV0uc2hpZnQoKTtcbiAgfVxuICByZXR1cm4gTGltaXRTdG9yZS5zdG9yZVtrZXldO1xufTtcblxuTGltaXRTdG9yZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIHJldHVybiBMaW1pdFN0b3JlLnN0b3JlW2tleV07XG59O1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7YnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWxzOiB1bmRlZmluZWR9O1xuICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgZXZ0LmluaXRDdXN0b21FdmVudChldmVudCwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlscyk7XG4gICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbiAgfSkoKTtcbn1cblxuXG4vLyBSZXF1aXJlcyBDaHJvbWUgNDIrLCBTYWZhcmkgNyssIG9yIEZpcmVmb3ggNDQrXG4vLyBXZWIgcHVzaCBub3RpZmljYXRpb25zIGFyZSBzdXBwb3J0ZWQgb24gTWFjIE9TWCwgV2luZG93cywgTGludXgsIGFuZCBBbmRyb2lkLlxudmFyIF90ZW1wX09uZVNpZ25hbCA9IG51bGw7XG5cbmlmICh0eXBlb2YgT25lU2lnbmFsICE9PSBcInVuZGVmaW5lZFwiKVxuICBfdGVtcF9PbmVTaWduYWwgPSBPbmVTaWduYWw7XG5cbnZhciBPbmVTaWduYWwgPSB7XG4gIF9WRVJTSU9OOiAxMDk3NzgsXG4gIF9IT1NUX1VSTDogXCJodHRwczovLzE5Mi4xNjguMS4yMDY6MzAwMC9hcGkvdjEvXCIsXG4gIC8vX0hPU1RfVVJMOiBcImh0dHBzOi8vb25lc2lnbmFsLmNvbS9hcGkvdjEvXCIsXG4gIF9JU19ERVY6IGZhbHNlLFxuXG4gIF9hcHBfaWQ6IG51bGwsXG5cbiAgX3RhZ3NUb1NlbmRPblJlZ2lzdGVyOiBudWxsLFxuXG4gIF9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2s6IG51bGwsXG4gIF9pZHNBdmFpbGFibGVfY2FsbGJhY2s6IFtdLFxuXG4gIF9kZWZhdWx0TGF1bmNoVVJMOiBudWxsLFxuXG4gIF9pbml0T3B0aW9uczogbnVsbCxcblxuICBfaHR0cFJlZ2lzdHJhdGlvbjogZmFsc2UsXG5cbiAgX21haW5fcGFnZV9wb3J0OiBudWxsLFxuXG4gIF9pc05vdGlmaWNhdGlvbkVuYWJsZWRDYWxsYmFjazogbnVsbCxcblxuICBfc3Vic2NyaXB0aW9uU2V0OiB0cnVlLFxuXG4gIF9pbml0T25lU2lnbmFsSHR0cDogbnVsbCxcblxuICBfc2Vzc2lvbklmcmFtZUFkZGVkOiBmYWxzZSxcblxuICBfdXNlSHR0cE1vZGU6IG51bGwsXG5cbiAgX3dpbmRvd1dpZHRoOiA1NTAsXG5cbiAgX3dpbmRvd0hlaWdodDogNDgwLFxuXG4gIExPR0dJTkc6IGZhbHNlLFxuICBMT0dHSU5HX1ZFUkJPU0U6IGZhbHNlLFxuICBMT0dHSU5HX1RSQUNJTkc6IGZhbHNlLFxuXG4gIFNFUlZJQ0VfV09SS0VSX1VQREFURVJfUEFUSDogXCJPbmVTaWduYWxTREtVcGRhdGVyV29ya2VyLmpzXCIsXG4gIFNFUlZJQ0VfV09SS0VSX1BBVEg6IFwiT25lU2lnbmFsU0RLV29ya2VyLmpzXCIsXG4gIFNFUlZJQ0VfV09SS0VSX1BBUkFNOiB7fSxcblxuICAvKlxuICAgTG9ncyB0byBjb25zb2xlLmxvZyBpZiBsb2dnaW5nIGVuYWJsZWQuIFRha2VzIHZhcmlhYmxlIGFyZ3VtZW50cywgZmlyc3QgbXVzdCBiZSBhIHN0cmluZyBtZXNzYWdlLlxuICAgU2VlIGFsc286IGh0dHBzOi8vZ2l0aHViLmNvbS9wZXRrYWFudG9ub3YvYmx1ZWJpcmQvd2lraS9PcHRpbWl6YXRpb24ta2lsbGVycyMzLW1hbmFnaW5nLWFyZ3VtZW50c1xuICAgKi9cblxuICBfZGVidWc6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoT25lU2lnbmFsLkxPR0dJTkcpIHtcbiAgICAgIGlmIChPbmVTaWduYWwuTE9HR0lOR19WRVJCT1NFKSB7XG4gICAgICAgIGNvbnNvbGVbJ2xvZyddLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChPbmVTaWduYWwuTE9HR0lOR19UUkFDSU5HKSB7XG4gICAgICAgICAgY29uc29sZVsndHJhY2UnXS5hcHBseShjb25zb2xlLCBbJyAnXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgX2xvZzogZnVuY3Rpb24gKCkge1xuICAgIGlmIChPbmVTaWduYWwuTE9HR0lORykge1xuICAgICAgY29uc29sZVsnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgIGlmIChPbmVTaWduYWwuTE9HR0lOR19UUkFDSU5HKSB7XG4gICAgICAgIGNvbnNvbGVbJ3RyYWNlJ10uYXBwbHkoY29uc29sZSwgWycgJ10pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBfaW5mbzogZnVuY3Rpb24gKCkge1xuICAgIGlmIChPbmVTaWduYWwuTE9HR0lORykge1xuICAgICAgY29uc29sZVsnaW5mbyddLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoT25lU2lnbmFsLkxPR0dJTkdfVFJBQ0lORykge1xuICAgICAgICBjb25zb2xlWyd0cmFjZSddLmFwcGx5KGNvbnNvbGUsIFsnICddKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgX3dhcm46IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlWyd3YXJuJ10uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICBpZiAoT25lU2lnbmFsLkxPR0dJTkdfVFJBQ0lORykge1xuICAgICAgY29uc29sZVsndHJhY2UnXS5hcHBseShjb25zb2xlLCBbJyAnXSk7XG4gICAgfVxuICB9LFxuXG4gIF9lcnJvcjogZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGVbJ2Vycm9yJ10uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICBpZiAoT25lU2lnbmFsLkxPR0dJTkdfVFJBQ0lORykge1xuICAgICAgY29uc29sZVsndHJhY2UnXS5hcHBseShjb25zb2xlLCBbJyAnXSk7XG4gICAgfVxuICB9LFxuXG4gIF9lbnN1cmVEYkluc3RhbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlmIChPbmVTaWduYWwuX29uZVNpZ25hbF9kYikge1xuICAgICAgICByZXNvbHZlKE9uZVNpZ25hbC5fb25lU2lnbmFsX2RiKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKFwiT05FX1NJR05BTF9TREtfREJcIiwgMSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGRhdGFiYXNlID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICBPbmVTaWduYWwuX29uZVNpZ25hbF9kYiA9IGRhdGFiYXNlO1xuICAgICAgICAgIE9uZVNpZ25hbC5fZGVidWcoJ1N1Y2Nlc2Z1bGx5IG9wZW5lZCBJbmRleGVkREIuJyk7XG4gICAgICAgICAgcmVzb2x2ZShkYXRhYmFzZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoJ1VuYWJsZSB0byBvcGVuIEluZGV4ZWREQi4nLCBldmVudCk7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fbG9nKCdSZWNyZWF0aW5nIHNjaGVtYSBpbiBJbmRleGVkREIuLi4nKTtcbiAgICAgICAgICB2YXIgZGIgPSBldmVudC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgIGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwiSWRzXCIsIHtrZXlQYXRoOiBcInR5cGVcIn0pO1xuICAgICAgICAgIGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwiTm90aWZpY2F0aW9uT3BlbmVkXCIsIHtrZXlQYXRoOiBcInVybFwifSk7XG4gICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJPcHRpb25zXCIsIHtrZXlQYXRoOiBcImtleVwifSk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgX2dldERiVmFsdWU6IGZ1bmN0aW9uICh0YWJsZSwga2V5KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIE9uZVNpZ25hbC5fZW5zdXJlRGJJbnN0YW5jZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhYmFzZSkge1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0gZGF0YWJhc2UudHJhbnNhY3Rpb24odGFibGUpLm9iamVjdFN0b3JlKHRhYmxlKS5nZXQoa2V5KTtcbiAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3QucmVzdWx0KVxuICAgICAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9kYlZhbHVlUmV0cmlldmVkKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvckNvZGUpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgICAgO1xuICAgIH0pO1xuICB9LFxuXG4gIF9nZXREYlZhbHVlczogZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIE9uZVNpZ25hbC5fZW5zdXJlRGJJbnN0YW5jZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhYmFzZSkge1xuICAgICAgICAgIHZhciBqc29uUmVzdWx0ID0ge307XG4gICAgICAgICAgdmFyIGN1cnNvciA9IGRhdGFiYXNlLnRyYW5zYWN0aW9uKHRhYmxlKS5vYmplY3RTdG9yZSh0YWJsZSkub3BlbkN1cnNvcigpO1xuICAgICAgICAgIGN1cnNvci5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSBldmVudC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9kYlZhbHVlUmV0cmlldmVkKGN1cnNvcik7XG4gICAgICAgICAgICAgIGpzb25SZXN1bHRbY3Vyc29yLmtleV0gPSBjdXJzb3IudmFsdWUudmFsdWU7XG4gICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICByZXNvbHZlKGpzb25SZXN1bHQpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY3Vyc29yLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJlamVjdChjdXJzb3IuZXJyb3JDb2RlKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBfcHV0RGJWYWx1ZTogZnVuY3Rpb24gKHRhYmxlLCB2YWx1ZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBPbmVTaWduYWwuX2Vuc3VyZURiSW5zdGFuY2UoKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YWJhc2UpIHtcbiAgICAgICAgICBkYXRhYmFzZS50cmFuc2FjdGlvbihbdGFibGVdLCBcInJlYWR3cml0ZVwiKS5vYmplY3RTdG9yZSh0YWJsZSkucHV0KHZhbHVlKTtcbiAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9kYlZhbHVlU2V0KHZhbHVlKTtcbiAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2RlbGV0ZURiVmFsdWU6IGZ1bmN0aW9uICh0YWJsZSwga2V5KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIE9uZVNpZ25hbC5fZW5zdXJlRGJJbnN0YW5jZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhYmFzZSkge1xuICAgICAgICAgIGRhdGFiYXNlLnRyYW5zYWN0aW9uKFt0YWJsZV0sIFwicmVhZHdyaXRlXCIpLm9iamVjdFN0b3JlKHRhYmxlKS5kZWxldGUoa2V5KTtcbiAgICAgICAgICByZXNvbHZlKGtleSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgICAgO1xuICAgIH0pO1xuICB9LFxuXG4gIF9zZW5kVG9PbmVTaWduYWxBcGk6IGZ1bmN0aW9uICh1cmwsIGFjdGlvbiwgaW5EYXRhLCBjYWxsYmFjaywgZmFpbGVkQ2FsbGJhY2spIHtcbiAgICB2YXIgY29udGVudHMgPSB7XG4gICAgICBtZXRob2Q6IGFjdGlvbixcbiAgICAgIC8vbW9kZTogJ25vLWNvcnMnLCAvLyBuby1jb3JzIGlzIGRpc2FibGVkIGZvciBub24tc2VydmljZXdvcmtlci5cbiAgICB9O1xuXG4gICAgaWYgKGluRGF0YSkge1xuICAgICAgY29udGVudHMuaGVhZGVycyA9IHtcIkNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwifTtcbiAgICAgIGNvbnRlbnRzLmJvZHkgPSBKU09OLnN0cmluZ2lmeShpbkRhdGEpO1xuICAgIH1cblxuICAgIGZldGNoKE9uZVNpZ25hbC5fSE9TVF9VUkwgKyB1cmwsIGNvbnRlbnRzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gc3RhdHVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMClcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCkpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIHN0YXR1cyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChqc29uRGF0YSkge1xuICAgICAgICBPbmVTaWduYWwuX2xvZyhqc29uRGF0YSk7XG4gICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKVxuICAgICAgICAgIGNhbGxiYWNrKGpzb25EYXRhKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcignUmVxdWVzdCBmYWlsZWQ6JywgZSk7XG4gICAgICAgIGlmIChmYWlsZWRDYWxsYmFjayAhPSBudWxsKVxuICAgICAgICAgIGZhaWxlZENhbGxiYWNrKCk7XG4gICAgICB9KTtcbiAgfSxcblxuICBfZ2V0TGFuZ3VhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmF2aWdhdG9yLmxhbmd1YWdlID8gKG5hdmlnYXRvci5sYW5ndWFnZS5sZW5ndGggPiAzID8gbmF2aWdhdG9yLmxhbmd1YWdlLnN1YnN0cmluZygwLCAyKSA6IG5hdmlnYXRvci5sYW5ndWFnZSkgOiAnZW4nO1xuICB9LFxuXG4gIF9nZXRQbGF5ZXJJZDogZnVuY3Rpb24gKHZhbHVlLCBjYWxsYmFjaykge1xuICAgIGlmICh2YWx1ZSlcbiAgICAgIGNhbGxiYWNrKHZhbHVlKVxuICAgIGVsc2Uge1xuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAndXNlcklkJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gX2dldFBsYXllcklkX2dvdFVzZXJJZChyZXN1bHQpIHtcbiAgICAgICAgICBpZiAocmVzdWx0KVxuICAgICAgICAgICAgY2FsbGJhY2socmVzdWx0LmlkKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgICA7XG4gICAgfVxuICB9LFxuXG4gIF9nZXRCcm93c2VyTmFtZTogZnVuY3Rpb24gKCkge1xuICAgIGlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvQ2hyb21lXFwvKC4qPykgLykpXG4gICAgICByZXR1cm4gXCJDaHJvbWVcIjtcbiAgICBpZiAobmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goXCJWZXJzaW9uLyguKikgKFNhZmFyaSlcIikpXG4gICAgICByZXR1cm4gXCJTYWZhcmlcIjtcbiAgICBpZiAobmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvRmlyZWZveFxcLyhbMC05XXsyLH1cXC5bMC05XXsxLH0pLykpXG4gICAgICByZXR1cm4gXCJGaXJlZm94XCI7XG5cbiAgICByZXR1cm4gXCJcIjtcbiAgfSxcblxuICBfcmVnaXN0ZXJXaXRoT25lU2lnbmFsOiBmdW5jdGlvbiAoYXBwSWQsIHJlZ2lzdHJhdGlvbklkLCBkZXZpY2VUeXBlKSB7XG5cbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gX3JlZ2lzdGVyV2l0aE9uZVNpZ25hbF9Hb3RVc2VySWQodXNlcklkUmVzdWx0KSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZ2V0Tm90aWZpY2F0aW9uVHlwZXMoZnVuY3Rpb24gKG5vdGlmX3R5cGVzKSB7XG4gICAgICAgICAgdmFyIHJlcXVlc3RVcmwgPSAncGxheWVycyc7XG5cbiAgICAgICAgICB2YXIganNvbkRhdGEgPSB7XG4gICAgICAgICAgICBhcHBfaWQ6IGFwcElkLFxuICAgICAgICAgICAgZGV2aWNlX3R5cGU6IGRldmljZVR5cGUsXG4gICAgICAgICAgICBsYW5ndWFnZTogT25lU2lnbmFsLl9nZXRMYW5ndWFnZSgpLFxuICAgICAgICAgICAgdGltZXpvbmU6IG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIC02MCxcbiAgICAgICAgICAgIGRldmljZV9tb2RlbDogbmF2aWdhdG9yLnBsYXRmb3JtICsgXCIgXCIgKyBPbmVTaWduYWwuX2dldEJyb3dzZXJOYW1lKCksXG4gICAgICAgICAgICBkZXZpY2Vfb3M6IChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvQ2hyb21lXFwvKC4qPykgLykgfHwgbmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goXCJWZXJzaW9uLyguKikgU2FmYXJpXCIpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0ZpcmVmb3hcXC8oWzAtOV17Mix9XFwuWzAtOV17MSx9KS8pKVsxXSxcbiAgICAgICAgICAgIHNkazogT25lU2lnbmFsLl9WRVJTSU9OXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmICh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgICAgIHJlcXVlc3RVcmwgPSAncGxheWVycy8nICsgdXNlcklkUmVzdWx0LmlkICsgJy9vbl9zZXNzaW9uJztcbiAgICAgICAgICAgIGpzb25EYXRhLm5vdGlmaWNhdGlvbl90eXBlcyA9IG5vdGlmX3R5cGVzXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKG5vdGlmX3R5cGVzICE9IDEpXG4gICAgICAgICAgICBqc29uRGF0YS5ub3RpZmljYXRpb25fdHlwZXMgPSBub3RpZl90eXBlc1xuXG4gICAgICAgICAgaWYgKHJlZ2lzdHJhdGlvbklkKSB7XG4gICAgICAgICAgICBqc29uRGF0YS5pZGVudGlmaWVyID0gcmVnaXN0cmF0aW9uSWQ7XG4gICAgICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwicmVnaXN0cmF0aW9uSWRcIiwgaWQ6IHJlZ2lzdHJhdGlvbklkfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkocmVxdWVzdFVybCwgJ1BPU1QnLCBqc29uRGF0YSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2lzdGVyZWRDYWxsYmFjayhyZXNwb25zZUpTT04pIHtcbiAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShcIk9ORV9TSUdOQUxfU0VTU0lPTlwiLCB0cnVlKTtcblxuICAgICAgICAgICAgICBpZiAocmVzcG9uc2VKU09OLmlkKSB7XG4gICAgICAgICAgICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiSWRzXCIsIHt0eXBlOiBcInVzZXJJZFwiLCBpZDogcmVzcG9uc2VKU09OLmlkfSk7XG4gICAgICAgICAgICAgICAgT25lU2lnbmFsLl9zZW5kVW5zZW50VGFncygpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgT25lU2lnbmFsLl9nZXRQbGF5ZXJJZChyZXNwb25zZUpTT04uaWQsIGZ1bmN0aW9uICh1c2VySWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgd2hpbGUgKE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnJfY2FsbGJhY2sgPSBPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgY3Vycl9jYWxsYmFjayh7dXNlcklkOiB1c2VySWQsIHJlZ2lzdHJhdGlvbklkOiByZWdpc3RyYXRpb25JZH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChPbmVTaWduYWwuX2h0dHBSZWdpc3RyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fbG9nKFwiU2VuZGluZyBwbGF5ZXIgSWQgYW5kIHJlZ2lzdHJhdGlvbklkIGJhY2sgdG8gaG9zdCBwYWdlXCIpO1xuICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9sb2coT25lU2lnbmFsLl9pbml0T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICB2YXIgY3JlYXRvciA9IG9wZW5lciB8fCBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX3NhZmVQb3N0TWVzc2FnZShjcmVhdG9yLCB7XG4gICAgICAgICAgICAgICAgICAgIGlkc0F2YWlsYWJsZToge1xuICAgICAgICAgICAgICAgICAgICAgIHVzZXJJZDogdXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvbklkOiByZWdpc3RyYXRpb25JZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9LCBPbmVTaWduYWwuX2luaXRPcHRpb25zLm9yaWdpbiwgbnVsbCk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChvcGVuZXIpXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX2RlYnVnKFwiTk8gb3BlbmVyXCIpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuXG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIF9zZW5kVW5zZW50VGFnczogZnVuY3Rpb24gKCkge1xuICAgIGlmIChPbmVTaWduYWwuX3RhZ3NUb1NlbmRPblJlZ2lzdGVyKSB7XG4gICAgICBPbmVTaWduYWwuc2VuZFRhZ3MoT25lU2lnbmFsLl90YWdzVG9TZW5kT25SZWdpc3Rlcik7XG4gICAgICBPbmVTaWduYWwuX3RhZ3NUb1NlbmRPblJlZ2lzdGVyID0gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgc2V0RGVmYXVsdE5vdGlmaWNhdGlvblVybDogZnVuY3Rpb24gKHVybCkge1xuICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIk9wdGlvbnNcIiwge2tleTogXCJkZWZhdWx0VXJsXCIsIHZhbHVlOiB1cmx9KTtcbiAgfSxcblxuICBzZXREZWZhdWx0SWNvbjogZnVuY3Rpb24gKGljb24pIHtcbiAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJPcHRpb25zXCIsIHtrZXk6IFwiZGVmYXVsdEljb25cIiwgdmFsdWU6IGljb259KTtcbiAgfSxcblxuICBzZXREZWZhdWx0VGl0bGU6IGZ1bmN0aW9uICh0aXRsZSkge1xuICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIk9wdGlvbnNcIiwge2tleTogXCJkZWZhdWx0VGl0bGVcIiwgdmFsdWU6IHRpdGxlfSk7XG4gIH0sXG5cbiAgX3Zpc2liaWxpdHljaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09IFwidmlzaWJsZVwiKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidmlzaWJpbGl0eWNoYW5nZVwiLCBPbmVTaWduYWwuX3Zpc2liaWxpdHljaGFuZ2UpO1xuICAgICAgT25lU2lnbmFsLl9zZXNzaW9uSW5pdCh7fSk7XG4gICAgfVxuICB9LFxuXG4gIG9uTmF0aXZlUHJvbXB0Q2hhbmdlZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgT25lU2lnbmFsLl9sb2coJ0V2ZW50IG9uZXNpZ25hbC5wcm9tcHQubmF0aXZlLnBlcm1pc3Npb25jaGFuZ2VkOicsIGV2ZW50LmRldGFpbCk7XG4gICAgT25lU2lnbmFsLl9jaGVja1RyaWdnZXJfZXZlbnRTdWJzY3JpcHRpb25DaGFuZ2VkKCk7XG4gIH0sXG5cbiAgX29uU3Vic2NyaXB0aW9uQ2hhbmdlZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgT25lU2lnbmFsLl9sb2coJ0V2ZW50IG9uZXNpZ25hbC5zdWJzY3JpcHRpb24uY2hhbmdlZDonLCBldmVudC5kZXRhaWwpO1xuICB9LFxuXG4gIF9vbkRiVmFsdWVSZXRyaWV2ZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIE9uZVNpZ25hbC5fbG9nKCdFdmVudCBvbmVzaWduYWwuZGIucmV0cmlldmVkOicsIGV2ZW50LmRldGFpbCk7XG4gIH0sXG5cbiAgX29uRGJWYWx1ZVNldDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgT25lU2lnbmFsLl9sb2coJ0V2ZW50IG9uZXNpZ25hbC5kYi52YWx1ZXNldDonLCBldmVudC5kZXRhaWwpO1xuICAgIHZhciBpbmZvID0gZXZlbnQuZGV0YWlsO1xuICAgIGlmIChpbmZvLnR5cGUgPT09ICd1c2VySWQnKSB7XG4gICAgICBMaW1pdFN0b3JlLnB1dCgnZGIuaWRzLnVzZXJJZCcsIGluZm8uaWQpO1xuICAgICAgT25lU2lnbmFsLl9jaGVja1RyaWdnZXJfZXZlbnRTdWJzY3JpcHRpb25DaGFuZ2VkKCk7XG4gICAgfVxuICB9LFxuXG4gIF9vbkludGVybmFsU3Vic2NyaXB0aW9uU2V0OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2xvZygnRXZlbnQgb25lc2lnbmFsLmludGVybmFsLnN1YnNjcmlwdGlvbnNldDonLCBldmVudC5kZXRhaWwpO1xuICAgIHZhciBuZXdTdWJzY3JpcHRpb25WYWx1ZSA9IGV2ZW50LmRldGFpbDtcbiAgICBMaW1pdFN0b3JlLnB1dCgnc3Vic2NyaXB0aW9uLnZhbHVlJywgbmV3U3Vic2NyaXB0aW9uVmFsdWUpO1xuICAgIE9uZVNpZ25hbC5fY2hlY2tUcmlnZ2VyX2V2ZW50U3Vic2NyaXB0aW9uQ2hhbmdlZCgpO1xuICB9LFxuXG4gIF9jaGVja1RyaWdnZXJfZXZlbnRTdWJzY3JpcHRpb25DaGFuZ2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBlcm1pc3Npb25zID0gTGltaXRTdG9yZS5nZXQoJ25vdGlmaWNhdGlvbi5wZXJtaXNzaW9uJyk7XG4gICAgdmFyIGxhc3RQZXJtaXNzaW9uID0gcGVybWlzc2lvbnNbcGVybWlzc2lvbnMubGVuZ3RoIC0gMl07XG4gICAgdmFyIGN1cnJlbnRQZXJtaXNzaW9uID0gcGVybWlzc2lvbnNbcGVybWlzc2lvbnMubGVuZ3RoIC0gMV07XG5cbiAgICB2YXIgaWRzID0gTGltaXRTdG9yZS5nZXQoJ2RiLmlkcy51c2VySWQnKTtcbiAgICB2YXIgbGFzdElkID0gaWRzW2lkcy5sZW5ndGggLSAyXTtcbiAgICB2YXIgY3VycmVudElkID0gaWRzW2lkcy5sZW5ndGggLSAxXTtcblxuICAgIHZhciBzdWJzY3JpcHRpb25TdGF0ZXMgPSBMaW1pdFN0b3JlLmdldCgnc3Vic2NyaXB0aW9uLnZhbHVlJyk7XG4gICAgdmFyIGxhc3RTdWJzY3JpcHRpb25TdGF0ZSA9IHN1YnNjcmlwdGlvblN0YXRlc1tzdWJzY3JpcHRpb25TdGF0ZXMubGVuZ3RoIC0gMl07XG4gICAgdmFyIGN1cnJlbnRTdWJzY3JpcHRpb25TdGF0ZSA9IHN1YnNjcmlwdGlvblN0YXRlc1tzdWJzY3JpcHRpb25TdGF0ZXMubGVuZ3RoIC0gMV07XG5cblxuICAgIHZhciBuZXdTdWJzY3JpcHRpb25TdGF0ZSA9ICd1bmNoYW5nZWQnO1xuXG4gICAgaWYgKCgobGFzdFBlcm1pc3Npb24gPT09ICdkZWZhdWx0JyB8fCBsYXN0UGVybWlzc2lvbiA9PT0gJ2RlbmllZCcgfHwgbGFzdFBlcm1pc3Npb24gPT09IG51bGwpICYmIGN1cnJlbnRQZXJtaXNzaW9uID09PSAnZ3JhbnRlZCcgJiZcbiAgICAgICAgY3VycmVudElkICE9PSBudWxsICYmXG4gICAgICAgIGN1cnJlbnRTdWJzY3JpcHRpb25TdGF0ZSA9PSB0cnVlXG4gICAgICApIHx8XG4gICAgICAoXG4gICAgICAgIChsYXN0U3Vic2NyaXB0aW9uU3RhdGUgPT0gZmFsc2UgJiYgY3VycmVudFN1YnNjcmlwdGlvblN0YXRlID09IHRydWUpICYmXG4gICAgICAgIGN1cnJlbnRJZCAhPSBudWxsICYmXG4gICAgICAgIGN1cnJlbnRQZXJtaXNzaW9uID09ICdncmFudGVkJ1xuICAgICAgKSkge1xuICAgICAgbmV3U3Vic2NyaXB0aW9uU3RhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICgobGFzdFBlcm1pc3Npb24gIT09ICdkZW5pZWQnICYmIGN1cnJlbnRQZXJtaXNzaW9uID09PSAnZGVuaWVkJykgfHxcbiAgICAgIChsYXN0UGVybWlzc2lvbiA9PT0gJ2dyYW50ZWQnICYmIGN1cnJlbnRQZXJtaXNzaW9uICE9PSAnZ3JhbnRlZCcpIHx8XG4gICAgICAobGFzdElkICE9PSBudWxsICYmIGN1cnJlbnRJZCA9PT0gbnVsbCkgfHxcbiAgICAgIChsYXN0U3Vic2NyaXB0aW9uU3RhdGUgIT09IGZhbHNlICYmIGN1cnJlbnRTdWJzY3JpcHRpb25TdGF0ZSA9PT0gZmFsc2UpKSB7XG4gICAgICBuZXdTdWJzY3JpcHRpb25TdGF0ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChuZXdTdWJzY3JpcHRpb25TdGF0ZSAhPT0gXCJ1bmNoYW5nZWRcIikge1xuICAgICAgT25lU2lnbmFsLl9kZWJ1ZygnU3Vic2NyaXB0aW9uQ2hhbmdlZCBldmVudCBmaXJlZCwgbmV3IHN0YXRlIGlzIG5vdzonLCBuZXdTdWJzY3JpcHRpb25TdGF0ZSk7XG4gICAgICB2YXIgbGFzdFRyaWdnZXJUaW1lcyA9IExpbWl0U3RvcmUucHV0KCdldmVudC5zdWJzY3JpcHRpb25jaGFuZ2VkLmxhc3RyaWdnZXJlZCcsIERhdGUubm93KCkpO1xuICAgICAgdmFyIGN1cnJlbnRUaW1lID0gbGFzdFRyaWdnZXJUaW1lc1tsYXN0VHJpZ2dlclRpbWVzLmxlbmd0aCAtIDFdO1xuICAgICAgdmFyIGxhc3RUcmlnZ2VyVGltZSA9IGxhc3RUcmlnZ2VyVGltZXNbbGFzdFRyaWdnZXJUaW1lcy5sZW5ndGggLSAyXTtcbiAgICAgIHZhciBlbGFwc2VkVGltZVNlY29uZHMgPSAoY3VycmVudFRpbWUgLSBsYXN0VHJpZ2dlclRpbWUpIC8gMTAwMDtcblxuICAgICAgdmFyIGxhc3RFdmVudFN0YXRlcyA9IExpbWl0U3RvcmUucHV0KCdldmVudC5zdWJzY3JpcHRpb25jaGFuZ2VkLmxhc3RzdGF0ZXMnLCBuZXdTdWJzY3JpcHRpb25TdGF0ZSk7XG4gICAgICB2YXIgY3VycmVudFN0YXRlID0gbGFzdEV2ZW50U3RhdGVzW2xhc3RFdmVudFN0YXRlcy5sZW5ndGggLSAxXTtcbiAgICAgIHZhciBsYXN0U3RhdGUgPSBsYXN0RXZlbnRTdGF0ZXNbbGFzdEV2ZW50U3RhdGVzLmxlbmd0aCAtIDJdO1xuXG4gICAgICAvLyBJZiBldmVudCBhbHJlYWR5IHRyaWdnZXJlZCB3aXRoaW4gdGhlIGxhc3Qgc2Vjb25kLCBkb24ndCByZS10cmlnZ2VyLlxuICAgICAgdmFyIHNob3VsZE5vdFRyaWdnZXJFdmVudCA9IChsYXN0VHJpZ2dlclRpbWUgIT0gbnVsbCAmJiAoZWxhcHNlZFRpbWVTZWNvbmRzIDw9IDEpKSB8fCAoY3VycmVudFN0YXRlID09PSBsYXN0U3RhdGUpO1xuICAgICAgaWYgKHNob3VsZE5vdFRyaWdnZXJFdmVudCA9PT0gZmFsc2UpIHtcbiAgICAgICAgT25lU2lnbmFsLl9pbmZvKCdUcmlnZ2VyaW5nIGV2ZW50IG9uZXNpZ25hbC5zdWJzY3JpcHRpb24uY2hhbmdlZDonLCBuZXdTdWJzY3JpcHRpb25TdGF0ZSk7XG4gICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X3N1YnNjcmlwdGlvbkNoYW5nZWQobmV3U3Vic2NyaXB0aW9uU3RhdGUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZWxhcHNlZFRpbWVTZWNvbmRzIDw9IDEpXG4gICAgICAgICAgT25lU2lnbmFsLl9kZWJ1ZygnU3Vic2NyaXB0aW9uQ2hhbmdlZCBldmVudCBmaXJlZCwgYnV0IGJlY2F1c2UgbGFzdCBldmVudCB3YXMgZmlyZWQgaW4gdGhlIGxhc3QgJywgZWxhcHNlZFRpbWVTZWNvbmRzLCAnIHNlY29uZHMsIHNraXBwaW5nIGV2ZW50IGZpcmluZy4nKTtcbiAgICAgICAgaWYgKGN1cnJlbnRTdGF0ZSA9PT0gbGFzdFN0YXRlKVxuICAgICAgICAgIE9uZVNpZ25hbC5fZGVidWcoJ1N1YnNjcmlwdGlvbkNoYW5nZWQgZXZlbnQgZmlyZWQsIGJ1dCBiZWNhdXNlIHRoZSBuZXcgc3Vic2NyaXB0aW9uIHN0YXRlICgnICsgY3VycmVudFN0YXRlICsgJykgaXMgdGhlIHNhbWUgYXMgdGhlIGxhc3Qgc3Vic2NyaXB0aW9uIHN0YXRlICgnICsgbGFzdFN0YXRlICsgJyksIHNraXBwaW5nIGV2ZW50IGZpcmluZy4nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgT25lU2lnbmFsLl9kZWJ1ZygnU3Vic2NyaXB0aW9uQ2hhbmdlZCBldmVudCBmaXJlZCwgYnV0IG5ldyBzdGF0ZSBpcyB1bmNoYW5nZWQsIHNvIHJldHVybmluZy4nKTtcbiAgICB9XG4gIH0sXG5cbiAgaW5pdDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBPbmVTaWduYWwuX2luaXRPcHRpb25zID0gb3B0aW9ucztcblxuICAgIE9uZVNpZ25hbC5fbG9nKCdPbmVTaWduYWwgU0RLIFZlcnNpb24gJyArIE9uZVNpZ25hbC5fVkVSU0lPTik7XG4gICAgaWYgKCFPbmVTaWduYWwuaXNQdXNoTm90aWZpY2F0aW9uc1N1cHBvcnRlZCgpKSB7XG4gICAgICBPbmVTaWduYWwuX3dhcm4oXCJZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBwdXNoIG5vdGlmaWNhdGlvbnMuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChuYXZpZ2F0b3IucGVybWlzc2lvbnMgJiYgIShPbmVTaWduYWwuX2lzQnJvd3NlckZpcmVmb3goKSAmJiBPbmVTaWduYWwuX2dldEZpcmVmb3hWZXJzaW9uKCkgPD0gNDUpKSB7XG4gICAgICBPbmVTaWduYWwuX2luZm8oXCJVc2luZyBicm93c2VyJ3MgbmF0aXZlIHBlcm1pc3Npb24gb25DaGFuZ2UoKSB0byBob29rIHBlcm1pc3Npb24gY2hhbmdlIGV2ZW50LlwiKTtcbiAgICAgIE9uZVNpZ25hbC5fdXNpbmdOYXRpdmVQZXJtaXNzaW9uSG9vayA9IHRydWU7XG4gICAgICB2YXIgY3VycmVudE5vdGlmaWNhdGlvblBlcm1pc3Npb24gPSBPbmVTaWduYWwuX2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb24oKTtcbiAgICAgIExpbWl0U3RvcmUucHV0KCdub3RpZmljYXRpb24ucGVybWlzc2lvbicsIGN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uKTtcbiAgICAgIC8vIElmIHRoZSBicm93c2VyIG5hdGl2ZWx5IHN1cHBvcnRzIGhvb2tpbmcgdGhlIHN1YnNjcmlwdGlvbiBwcm9tcHQgcGVybWlzc2lvbiBjaGFuZ2UgZXZlbnRcbiAgICAgIC8vICAgICB1c2UgaXQgaW5zdGVhZCBvZiBvdXIgU0RLIG1ldGhvZFxuICAgICAgbmF2aWdhdG9yLnBlcm1pc3Npb25zLnF1ZXJ5KHtuYW1lOiAnbm90aWZpY2F0aW9ucyd9KS50aGVuKGZ1bmN0aW9uIChwZXJtaXNzaW9uU3RhdHVzKSB7XG4gICAgICAgIHBlcm1pc3Npb25TdGF0dXMub25jaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHJlY2VudFBlcm1pc3Npb25zID0gTGltaXRTdG9yZS5wdXQoJ25vdGlmaWNhdGlvbi5wZXJtaXNzaW9uJywgdGhpcy5zdGF0ZSk7XG4gICAgICAgICAgdmFyIHBlcm1pc3Npb25CZWZvcmVQcm9tcHQgPSByZWNlbnRQZXJtaXNzaW9uc1swXTtcbiAgICAgICAgICB2YXIgcGVybWlzc2lvbnNBZnRlclByb21wdCA9IHJlY2VudFBlcm1pc3Npb25zWzFdO1xuICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X25hdGl2ZVByb21wdFBlcm1pc3Npb25DaGFuZ2VkKHBlcm1pc3Npb25CZWZvcmVQcm9tcHQsIHBlcm1pc3Npb25zQWZ0ZXJQcm9tcHQpO1xuICAgICAgICB9O1xuICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKCk7XG4gICAgICBMaW1pdFN0b3JlLnB1dCgnbm90aWZpY2F0aW9uLnBlcm1pc3Npb24nLCBjdXJyZW50Tm90aWZpY2F0aW9uUGVybWlzc2lvbik7XG4gICAgfVxuXG4gICAgLy8gU3RvcmUgdGhlIGN1cnJlbnQgdmFsdWUgb2YgSWRzOnJlZ2lzdHJhdGlvbklkLCBzbyB0aGF0IHdlIGNhbiBzZWUgaWYgdGhlIHZhbHVlIGNoYW5nZXMgaW4gdGhlIGZ1dHVyZVxuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXG4gICAgICAudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIHZhciBzdG9yZVZhbHVlID0gcmVzdWx0ID8gcmVzdWx0LmlkIDogbnVsbDtcbiAgICAgICAgTGltaXRTdG9yZS5wdXQoJ2RiLmlkcy51c2VySWQnLCBzdG9yZVZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gU3RvcmUgdGhlIGN1cnJlbnQgdmFsdWUgb2Ygc3Vic2NyaXB0aW9uLCBzbyB0aGF0IHdlIGNhbiBzZWUgaWYgdGhlIHZhbHVlIGNoYW5nZXMgaW4gdGhlIGZ1dHVyZVxuICAgIE9uZVNpZ25hbC5fZ2V0U3Vic2NyaXB0aW9uKGZ1bmN0aW9uIChjdXJyZW50U3Vic2NyaXB0aW9uKSB7XG4gICAgICBMaW1pdFN0b3JlLnB1dCgnc3Vic2NyaXB0aW9uLnZhbHVlJywgY3VycmVudFN1YnNjcmlwdGlvbik7XG4gICAgfSk7XG5cblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwucHJvbXB0Lm5hdGl2ZS5wZXJtaXNzaW9uY2hhbmdlZCcsIE9uZVNpZ25hbC5vbk5hdGl2ZVByb21wdENoYW5nZWQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwuc3Vic2NyaXB0aW9uLmNoYW5nZWQnLCBPbmVTaWduYWwuX29uU3Vic2NyaXB0aW9uQ2hhbmdlZCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29uZXNpZ25hbC5kYi52YWx1ZXJldHJpZXZlZCcsIE9uZVNpZ25hbC5fb25EYlZhbHVlUmV0cmlldmVkKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25lc2lnbmFsLmRiLnZhbHVlc2V0JywgT25lU2lnbmFsLl9vbkRiVmFsdWVTZXQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwuZGIudmFsdWVzZXQnLCBPbmVTaWduYWwuX29uRGJWYWx1ZVNldCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29uZXNpZ25hbC5pbnRlcm5hbC5zdWJzY3JpcHRpb25zZXQnLCBPbmVTaWduYWwuX29uSW50ZXJuYWxTdWJzY3JpcHRpb25TZXQpO1xuXG4gICAgT25lU2lnbmFsLl91c2VIdHRwTW9kZSA9ICFPbmVTaWduYWwuX2lzU3VwcG9ydGVkU2FmYXJpKCkgJiYgKCFPbmVTaWduYWwuX3N1cHBvcnRzRGlyZWN0UGVybWlzc2lvbigpIHx8IE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZSk7XG5cbiAgICBpZiAoT25lU2lnbmFsLl91c2VIdHRwTW9kZSlcbiAgICAgIE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHAgPSAnaHR0cHM6Ly8nICsgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zdWJkb21haW5OYW1lICsgJy5vbmVzaWduYWwuY29tL3Nka3MvaW5pdE9uZVNpZ25hbEh0dHAnO1xuICAgIGVsc2VcbiAgICAgIE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHAgPSAnaHR0cHM6Ly9vbmVzaWduYWwuY29tL3Nka3MvaW5pdE9uZVNpZ25hbEh0dHBzJztcblxuICAgIGlmIChPbmVTaWduYWwuX0lTX0RFVilcbiAgICAgIE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHAgPSAnaHR0cHM6Ly8xOTIuMTY4LjEuMjA2OjMwMDAvZGV2X3Nka3MvaW5pdE9uZVNpZ25hbEh0dHAnO1xuXG4gICAgLy8gSWYgU2FmYXJpIC0gYWRkICdmZXRjaCcgcG9sbHlmaWxsIGlmIGl0IGlzbid0IGFscmVhZHkgYWRkZWQuXG4gICAgaWYgKE9uZVNpZ25hbC5faXNTdXBwb3J0ZWRTYWZhcmkoKSAmJiB0eXBlb2Ygd2luZG93LmZldGNoID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgICBzLnNldEF0dHJpYnV0ZSgnc3JjJywgXCJodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9mZXRjaC8wLjkuMC9mZXRjaC5qc1wiKTtcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQocyk7XG4gICAgfVxuXG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIilcbiAgICAgIE9uZVNpZ25hbC5faW50ZXJuYWxJbml0KCk7XG4gICAgZWxzZVxuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBPbmVTaWduYWwuX2ludGVybmFsSW5pdCk7XG4gIH0sXG5cbiAgX2ludGVybmFsSW5pdDogZnVuY3Rpb24gKCkge1xuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdhcHBJZCcpLFxuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAncmVnaXN0cmF0aW9uSWQnKSxcbiAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdzdWJzY3JpcHRpb24nKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBfaW50ZXJuYWxJbml0X0dvdEFwcFJlZ2lzdHJhdGlvblN1YnNjcmlwdGlvbklkcyhyZXN1bHQpIHtcbiAgICAgICAgdmFyIGFwcElkUmVzdWx0ID0gcmVzdWx0WzBdO1xuICAgICAgICB2YXIgcmVnaXN0cmF0aW9uSWRSZXN1bHQgPSByZXN1bHRbMV07XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb25SZXN1bHQgPSByZXN1bHRbMl07XG5cbiAgICAgICAgLy8gSWYgQXBwSWQgY2hhbmdlZCBkZWxldGUgcGxheWVySWQgYW5kIGNvbnRpbnVlLlxuICAgICAgICBpZiAoYXBwSWRSZXN1bHQgJiYgYXBwSWRSZXN1bHQuaWQgIT0gT25lU2lnbmFsLl9pbml0T3B0aW9ucy5hcHBJZCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZGVsZXRlRGJWYWx1ZShcIklkc1wiLCBcInVzZXJJZFwiKTtcbiAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSFRUUFMgLSBPbmx5IHJlZ2lzdGVyIGZvciBwdXNoIG5vdGlmaWNhdGlvbnMgb25jZSBwZXIgc2Vzc2lvbiBvciBpZiB0aGUgdXNlciBjaGFuZ2VzIG5vdGlmaWNhdGlvbiBwZXJtaXNzaW9uIHRvIEFzayBvciBBbGxvdy5cbiAgICAgICAgaWYgKHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIilcbiAgICAgICAgICAmJiAhT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zdWJkb21haW5OYW1lXG4gICAgICAgICAgJiYgKE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID09IFwiZGVuaWVkXCJcbiAgICAgICAgICB8fCBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFwiT05FX1NJR05BTF9OT1RJRklDQVRJT05fUEVSTUlTU0lPTlwiKSA9PSBOb3RpZmljYXRpb24ucGVybWlzc2lvbikpXG4gICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX05PVElGSUNBVElPTl9QRVJNSVNTSU9OXCIsIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uKTtcblxuICAgICAgICBpZiAoT25lU2lnbmFsLl9pbml0T3B0aW9ucy5hdXRvUmVnaXN0ZXIgPT0gZmFsc2UgJiYgIXJlZ2lzdHJhdGlvbklkUmVzdWx0ICYmIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlICE9IFwidmlzaWJsZVwiKSB7XG4gICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgT25lU2lnbmFsLl92aXNpYmlsaXR5Y2hhbmdlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBPbmVTaWduYWwuX3Nlc3Npb25Jbml0KHt9KTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIHJlZ2lzdGVyRm9yUHVzaE5vdGlmaWNhdGlvbnM6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgLy8gV0FSTklORzogRG8gTk9UIGFkZCBjYWxsYmFja3MgdGhhdCBoYXZlIHRvIGZpcmUgdG8gZ2V0IGZyb20gaGVyZSB0byB3aW5kb3cub3BlbiBpbiBfc2Vzc2lvbkluaXQuXG4gICAgLy8gICAgICAgICAgT3RoZXJ3aXNlIHRoZSBwb3AtdXAgdG8gYXNrIGZvciBwdXNoIHBlcm1pc3Npb24gb24gSFRUUCBjb25uZWN0aW9ucyB3aWxsIGJlIGJsb2NrZWQgYnkgQ2hyb21lLlxuICAgIGlmICghb3B0aW9ucylcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICBvcHRpb25zLmZyb21SZWdpc3RlckZvciA9IHRydWU7XG4gICAgT25lU2lnbmFsLl9zZXNzaW9uSW5pdChvcHRpb25zKTtcbiAgfSxcblxuICAvLyBIdHRwIG9ubHkgLSBPbmx5IGNhbGxlZCBmcm9tIGlmcmFtZSdzIGluaXQuanNcbiAgX2luaXRIdHRwOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgaWYgKG9wdGlvbnMuY29udGludWVQcmVzc2VkKSB7XG4gICAgICBPbmVTaWduYWwuc2V0U3Vic2NyaXB0aW9uKHRydWUpO1xuICAgIH1cblxuICAgIHZhciBpc0lmcmFtZSA9IChwYXJlbnQgIT0gbnVsbCAmJiBwYXJlbnQgIT0gd2luZG93KTtcbiAgICB2YXIgY3JlYXRvciA9IG9wZW5lciB8fCBwYXJlbnQ7XG5cbiAgICBpZiAoIWNyZWF0b3IpIHtcbiAgICAgIE9uZVNpZ25hbC5fbG9nKFwiRVJST1I6X2luaXRIdHRwOiBObyBvcGVuZXIgb3IgcGFyZW50IGZvdW5kIVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gU2V0dGluZyB1cCBtZXNzYWdlIGNoYW5uZWwgdG8gcmVjZWl2ZSBtZXNzYWdlIGZyb20gaG9zdCBwYWdlLlxuICAgIHZhciBtZXNzYWdlQ2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIG1lc3NhZ2VDaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgT25lU2lnbmFsLl9sb2coXCJfaW5pdEh0dHAubWVzc2FnZUNoYW5uZWwucG9ydDEub25tZXNzYWdlXCIsIGV2ZW50KTtcblxuICAgICAgaWYgKGV2ZW50LmRhdGEuaW5pdE9wdGlvbnMpIHtcbiAgICAgICAgT25lU2lnbmFsLnNldERlZmF1bHROb3RpZmljYXRpb25VcmwoZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5kZWZhdWx0VXJsKTtcbiAgICAgICAgT25lU2lnbmFsLnNldERlZmF1bHRUaXRsZShldmVudC5kYXRhLmluaXRPcHRpb25zLmRlZmF1bHRUaXRsZSk7XG4gICAgICAgIGlmIChldmVudC5kYXRhLmluaXRPcHRpb25zLmRlZmF1bHRJY29uKVxuICAgICAgICAgIE9uZVNpZ25hbC5zZXREZWZhdWx0SWNvbihldmVudC5kYXRhLmluaXRPcHRpb25zLmRlZmF1bHRJY29uKTtcblxuICAgICAgICBPbmVTaWduYWwuX2xvZyhcImRvY3VtZW50LlVSTFwiLCBldmVudC5kYXRhLmluaXRPcHRpb25zLnBhcmVudF91cmwpO1xuICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwgZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5wYXJlbnRfdXJsKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIHJlZ2lzdGVyRm9yUHVzaE5vdGlmaWNhdGlvbnNfR290Tm90aWZpY2F0aW9uT3BlbmVkKG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCkge1xuICAgICAgICAgICAgT25lU2lnbmFsLl9sb2coXCJfaW5pdEh0dHAgTm90aWZpY2F0aW9uT3BlbmVkIGRiXCIsIG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCk7XG4gICAgICAgICAgICBpZiAobm90aWZpY2F0aW9uT3BlbmVkUmVzdWx0KSB7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fZGVsZXRlRGJWYWx1ZShcIk5vdGlmaWNhdGlvbk9wZW5lZFwiLCBldmVudC5kYXRhLmluaXRPcHRpb25zLnBhcmVudF91cmwpO1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX2xvZyhcIk9uZVNpZ25hbC5fc2FmZVBvc3RNZXNzYWdlOnRhcmdldE9yaWdpbjpcIiwgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5vcmlnaW4pO1xuXG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fc2FmZVBvc3RNZXNzYWdlKGNyZWF0b3IsIHtvcGVuZWROb3RpZmljYXRpb246IG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdC5kYXRhfSwgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5vcmlnaW4sIG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgIH0pO1xuICAgICAgICA7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChldmVudC5kYXRhLmdldE5vdGlmaWNhdGlvblBlcm1pc3Npb24pIHtcbiAgICAgICAgT25lU2lnbmFsLl9nZXRTdWJkb21haW5TdGF0ZShmdW5jdGlvbiAoY3VyU3RhdGUpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX3NhZmVQb3N0TWVzc2FnZShjcmVhdG9yLCB7Y3VycmVudE5vdGlmaWNhdGlvblBlcm1pc3Npb246IGN1clN0YXRlfSwgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5vcmlnaW4sIG51bGwpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGV2ZW50LmRhdGEuc2V0U3ViZG9tYWluU3RhdGUpXG4gICAgICAgIE9uZVNpZ25hbC5zZXRTdWJzY3JpcHRpb24oZXZlbnQuZGF0YS5zZXRTdWJkb21haW5TdGF0ZS5zZXRTdWJzY3JpcHRpb24pO1xuICAgIH07XG5cbiAgICBPbmVTaWduYWwuX2dldFN1YmRvbWFpblN0YXRlKGZ1bmN0aW9uIChjdXJTdGF0ZSkge1xuICAgICAgY3VyU3RhdGVbXCJpc0lmcmFtZVwiXSA9IGlzSWZyYW1lO1xuICAgICAgT25lU2lnbmFsLl9zYWZlUG9zdE1lc3NhZ2UoY3JlYXRvciwge29uZVNpZ25hbEluaXRQYWdlUmVhZHk6IGN1clN0YXRlfSwgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5vcmlnaW4sIFttZXNzYWdlQ2hhbm5lbC5wb3J0Ml0pO1xuICAgIH0pO1xuXG4gICAgT25lU2lnbmFsLl9pbml0U2F2ZVN0YXRlKCk7XG4gICAgT25lU2lnbmFsLl9odHRwUmVnaXN0cmF0aW9uID0gdHJ1ZTtcbiAgICBpZiAobG9jYXRpb24uc2VhcmNoLmluZGV4T2YoXCI/c2Vzc2lvbj10cnVlXCIpID09IDApXG4gICAgICByZXR1cm47XG5cbiAgICBPbmVTaWduYWwuX2dldFBsYXllcklkKG51bGwsIGZ1bmN0aW9uIChwbGF5ZXJfaWQpIHtcbiAgICAgIGlmICghaXNJZnJhbWUgfHwgcGxheWVyX2lkKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fbG9nKFwiQmVmb3JlIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyXCIpO1xuICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlcihPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgT25lU2lnbmFsLl9sb2coXCJBZnRlciBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlclwiKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfZ2V0U3ViZG9tYWluU3RhdGU6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzdGF0ZSA9IHt9O1xuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpLFxuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAncmVnaXN0cmF0aW9uSWQnKSxcbiAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdzdWJzY3JpcHRpb24nKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBfaW50ZXJuYWxJbml0X0dvdEFwcFJlZ2lzdHJhdGlvblN1YnNjcmlwdGlvbklkcyhyZXN1bHQpIHtcbiAgICAgICAgdmFyIHVzZXJJZFJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgdmFyIHJlZ2lzdHJhdGlvbklkUmVzdWx0ID0gcmVzdWx0WzFdO1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uUmVzdWx0ID0gcmVzdWx0WzJdO1xuXG4gICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICB1c2VySWQ6IHVzZXJJZFJlc3VsdCA/IHVzZXJJZFJlc3VsdC5pZCA6IG51bGwsXG4gICAgICAgICAgcmVnaXN0cmF0aW9uSWQ6IHJlZ2lzdHJhdGlvbklkUmVzdWx0ID8gcmVnaXN0cmF0aW9uSWRSZXN1bHQuaWQgOiBudWxsLFxuICAgICAgICAgIG5vdGlmUGVybXNzaW9uOiBOb3RpZmljYXRpb24ucGVybWlzc2lvbixcbiAgICAgICAgICBzdWJzY3JpcHRpb25TZXQ6IHN1YnNjcmlwdGlvblJlc3VsdCA/IHN1YnNjcmlwdGlvblJlc3VsdC52YWx1ZSA6IG51bGwsXG4gICAgICAgICAgaXNQdXNoRW5hYmxlZDogKCBOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PSBcImdyYW50ZWRcIlxuICAgICAgICAgICYmIHVzZXJJZFJlc3VsdFxuICAgICAgICAgICYmIHJlZ2lzdHJhdGlvbklkUmVzdWx0XG4gICAgICAgICAgJiYgKChzdWJzY3JpcHRpb25SZXN1bHQgJiYgc3Vic2NyaXB0aW9uUmVzdWx0LnZhbHVlKSB8fCBzdWJzY3JpcHRpb25SZXN1bHQgPT0gbnVsbCkpXG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIF9pbml0U2F2ZVN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgT25lU2lnbmFsLl9hcHBfaWQgPSBPbmVTaWduYWwuX2luaXRPcHRpb25zLmFwcElkO1xuICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJhcHBJZFwiLCBpZDogT25lU2lnbmFsLl9hcHBfaWR9KTtcbiAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJPcHRpb25zXCIsIHtrZXk6IFwicGFnZVRpdGxlXCIsIHZhbHVlOiBkb2N1bWVudC50aXRsZX0pO1xuICB9LFxuXG4gIF9zdXBwb3J0c0RpcmVjdFBlcm1pc3Npb246IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gT25lU2lnbmFsLl9pc1N1cHBvcnRlZFNhZmFyaSgpXG4gICAgICB8fCBsb2NhdGlvbi5wcm90b2NvbCA9PSAnaHR0cHM6J1xuICAgICAgfHwgbG9jYXRpb24uaG9zdC5pbmRleE9mKFwibG9jYWxob3N0XCIpID09IDBcbiAgICAgIHx8IGxvY2F0aW9uLmhvc3QuaW5kZXhPZihcIjEyNy4wLjAuMVwiKSA9PSAwO1xuICB9LFxuXG5cbiAgX3Nlc3Npb25Jbml0OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIE9uZVNpZ25hbC5fbG9nKFwiX3Nlc3Npb25Jbml0OlwiLCBvcHRpb25zKTtcbiAgICBPbmVTaWduYWwuX2luaXRTYXZlU3RhdGUoKTtcblxuICAgIHZhciBob3N0UGFnZVByb3RvY29sID0gbG9jYXRpb24ub3JpZ2luLm1hdGNoKC9eaHR0cChzfCk6XFwvXFwvKHd3d1xcLnwpLylbMF07XG5cbiAgICAvLyBJZiBIVFRQIG9yIHVzaW5nIHN1YmRvbWFpbiBtb2RlXG4gICAgaWYgKE9uZVNpZ25hbC5fdXNlSHR0cE1vZGUpIHtcbiAgICAgIGlmIChvcHRpb25zLmZyb21SZWdpc3RlckZvcikge1xuICAgICAgICB2YXIgZHVhbFNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCAhPSB1bmRlZmluZWQgPyB3aW5kb3cuc2NyZWVuTGVmdCA6IHNjcmVlbi5sZWZ0O1xuICAgICAgICB2YXIgZHVhbFNjcmVlblRvcCA9IHdpbmRvdy5zY3JlZW5Ub3AgIT0gdW5kZWZpbmVkID8gd2luZG93LnNjcmVlblRvcCA6IHNjcmVlbi50b3A7XG5cbiAgICAgICAgdmFyIHRoaXNXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoID8gd2luZG93LmlubmVyV2lkdGggOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggOiBzY3JlZW4ud2lkdGg7XG4gICAgICAgIHZhciB0aGlzSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0ID8gd2luZG93LmlubmVySGVpZ2h0IDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCA/IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgOiBzY3JlZW4uaGVpZ2h0O1xuICAgICAgICB2YXIgY2hpbGRXaWR0aCA9IE9uZVNpZ25hbC5fd2luZG93V2lkdGg7XG4gICAgICAgIHZhciBjaGlsZEhlaWdodCA9IE9uZVNpZ25hbC5fd2luZG93SGVpZ2h0O1xuXG4gICAgICAgIHZhciBsZWZ0ID0gKCh0aGlzV2lkdGggLyAyKSAtIChjaGlsZFdpZHRoIC8gMikpICsgZHVhbFNjcmVlbkxlZnQ7XG4gICAgICAgIHZhciB0b3AgPSAoKHRoaXNIZWlnaHQgLyAyKSAtIChjaGlsZEhlaWdodCAvIDIpKSArIGR1YWxTY3JlZW5Ub3A7XG5cbiAgICAgICAgT25lU2lnbmFsLl9sb2coJ09wZW5pbmcgcG9wdXAgd2luZG93LicpO1xuICAgICAgICB2YXIgbWVzc2FnZV9sb2NhbGl6YXRpb25fb3B0cyA9IE9uZVNpZ25hbC5faW5pdE9wdGlvbnNbJ3Byb21wdE9wdGlvbnMnXTtcbiAgICAgICAgdmFyIG1lc3NhZ2VfbG9jYWxpemF0aW9uX29wdHNfc3RyID0gJyc7XG4gICAgICAgIGlmIChtZXNzYWdlX2xvY2FsaXphdGlvbl9vcHRzKSB7XG4gICAgICAgICAgdmFyIG1lc3NhZ2VfbG9jYWxpemF0aW9uX3BhcmFtcyA9IFsnYWN0aW9uTWVzc2FnZScsXG4gICAgICAgICAgICAnZXhhbXBsZU5vdGlmaWNhdGlvblRpdGxlRGVza3RvcCcsXG4gICAgICAgICAgICAnZXhhbXBsZU5vdGlmaWNhdGlvbk1lc3NhZ2VEZXNrdG9wJyxcbiAgICAgICAgICAgICdleGFtcGxlTm90aWZpY2F0aW9uVGl0bGVNb2JpbGUnLFxuICAgICAgICAgICAgJ2V4YW1wbGVOb3RpZmljYXRpb25NZXNzYWdlTW9iaWxlJyxcbiAgICAgICAgICAgICdleGFtcGxlTm90aWZpY2F0aW9uQ2FwdGlvbicsXG4gICAgICAgICAgICAnYWNjZXB0QnV0dG9uVGV4dCcsXG4gICAgICAgICAgICAnY2FuY2VsQnV0dG9uVGV4dCddO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZV9sb2NhbGl6YXRpb25fcGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gbWVzc2FnZV9sb2NhbGl6YXRpb25fcGFyYW1zW2ldO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gbWVzc2FnZV9sb2NhbGl6YXRpb25fb3B0c1trZXldO1xuICAgICAgICAgICAgdmFyIGVuY29kZWRfdmFsdWUgPSBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgICAgICAgICAgaWYgKHZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICBtZXNzYWdlX2xvY2FsaXphdGlvbl9vcHRzX3N0ciArPSAnJicgKyBrZXkgKyAnPScgKyBlbmNvZGVkX3ZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hpbGRXaW5kb3cgPSB3aW5kb3cub3BlbihPbmVTaWduYWwuX2luaXRPbmVTaWduYWxIdHRwICsgXCI/XCIgKyBtZXNzYWdlX2xvY2FsaXphdGlvbl9vcHRzX3N0ciArIFwiJmhvc3RQYWdlUHJvdG9jb2w9XCIgKyBob3N0UGFnZVByb3RvY29sLCBcIl9ibGFua1wiLCAnc2Nyb2xsYmFycz15ZXMsIHdpZHRoPScgKyBjaGlsZFdpZHRoICsgJywgaGVpZ2h0PScgKyBjaGlsZEhlaWdodCArICcsIHRvcD0nICsgdG9wICsgJywgbGVmdD0nICsgbGVmdCk7XG5cbiAgICAgICAgaWYgKGNoaWxkV2luZG93KVxuICAgICAgICAgIGNoaWxkV2luZG93LmZvY3VzKCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgT25lU2lnbmFsLl9sb2coJ09wZW5pbmcgaUZyYW1lLicpO1xuICAgICAgICBPbmVTaWduYWwuX2FkZFNlc3Npb25JZnJhbWUoaG9zdFBhZ2VQcm90b2NvbCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoT25lU2lnbmFsLl9pc1N1cHBvcnRlZFNhZmFyaSgpKSB7XG4gICAgICBpZiAoT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zYWZhcmlfd2ViX2lkKSB7XG4gICAgICAgIHZhciBub3RpZmljYXRpb25QZXJtaXNzaW9uQmVmb3JlUmVxdWVzdCA9IE9uZVNpZ25hbC5fZ2V0Tm90aWZpY2F0aW9uUGVybWlzc2lvbihPbmVTaWduYWwuX2luaXRPcHRpb25zLnNhZmFyaV93ZWJfaWQpO1xuICAgICAgICB3aW5kb3cuc2FmYXJpLnB1c2hOb3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oXG4gICAgICAgICAgT25lU2lnbmFsLl9IT1NUX1VSTCArICdzYWZhcmknLFxuICAgICAgICAgIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCxcbiAgICAgICAgICB7YXBwX2lkOiBPbmVTaWduYWwuX2FwcF9pZH0sXG4gICAgICAgICAgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fbG9nKGRhdGEpO1xuICAgICAgICAgICAgdmFyIG5vdGlmaWNhdGlvblBlcm1pc3Npb25BZnRlclJlcXVlc3QgPSBPbmVTaWduYWwuX2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb24oT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zYWZhcmlfd2ViX2lkKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmRldmljZVRva2VuKSB7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fcmVnaXN0ZXJXaXRoT25lU2lnbmFsKE9uZVNpZ25hbC5fYXBwX2lkLCBkYXRhLmRldmljZVRva2VuLnRvTG93ZXJDYXNlKCksIDcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIiwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9uYXRpdmVQcm9tcHRQZXJtaXNzaW9uQ2hhbmdlZChub3RpZmljYXRpb25QZXJtaXNzaW9uQmVmb3JlUmVxdWVzdCk7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChvcHRpb25zLm1vZGFsUHJvbXB0ICYmIG9wdGlvbnMuZnJvbVJlZ2lzdGVyRm9yKSB7IC8vIElmIEhUVFBTIC0gU2hvdyBtb2RhbFxuICAgICAgaWYgKCFPbmVTaWduYWwuaXNQdXNoTm90aWZpY2F0aW9uc1N1cHBvcnRlZCgpKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fd2FybignQW4gYXR0ZW1wdCB3YXMgbWFkZSB0byBvcGVuIHRoZSBIVFRQUyBtb2RhbCBwZXJtaXNzaW9uIHByb21wdCwgYnV0IHB1c2ggbm90aWZpY2F0aW9ucyBhcmUgbm90IHN1cHBvcnRlZCBvbiB0aGlzIGJyb3dzZXIuIE9wZW5pbmcgY2FuY2VsZWQuJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIE9uZVNpZ25hbC5pc1B1c2hOb3RpZmljYXRpb25zRW5hYmxlZChmdW5jdGlvbiAocHVzaEVuYWJsZWQpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ09uZVNpZ25hbC1pZnJhbWUtbW9kYWwnKTtcbiAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSAnPGRpdiBpZD1cIm5vdGlmLXBlcm1pc3Npb25cIiBzdHlsZT1cImJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC43KTsgcG9zaXRpb246IGZpeGVkOyB0b3A6IDA7IGxlZnQ6IDA7IHJpZ2h0OiAwOyBib3R0b206IDA7IHotaW5kZXg6IDkwMDA7IGRpc3BsYXk6IGJsb2NrXCI+PC9kaXY+JztcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbGVtZW50KTtcblxuICAgICAgICB2YXIgaWZyYW1lU3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICBpZnJhbWVTdHlsZS5pbm5lckhUTUwgPSBcIkBtZWRpYSAobWF4LXdpZHRoOiA1NjBweCkgeyAuT25lU2lnbmFsLXBlcm1pc3Npb24taWZyYW1lIHsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTt9IH1cIlxuICAgICAgICAgICsgXCJAbWVkaWEgKG1pbi13aWR0aDogNTYxcHgpIHsgLk9uZVNpZ25hbC1wZXJtaXNzaW9uLWlmcmFtZSB7IHRvcDogNTAlOyBsZWZ0OiA1MCU7IG1hcmdpbi1sZWZ0OiAtMjc1cHg7IG1hcmdpbi10b3A6IC0yNDhweDt9IH1cIjtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChpZnJhbWVTdHlsZSk7XG5cbiAgICAgICAgdmFyIGlmcmFtZU5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgICAgICBpZnJhbWVOb2RlLmNsYXNzTmFtZSA9IFwiT25lU2lnbmFsLXBlcm1pc3Npb24taWZyYW1lXCJcbiAgICAgICAgaWZyYW1lTm9kZS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDEpOyBwb3NpdGlvbjogZml4ZWQ7XCI7XG4gICAgICAgIGlmcmFtZU5vZGUuc3JjID0gT25lU2lnbmFsLl9pbml0T25lU2lnbmFsSHR0cFxuICAgICAgICAgICsgJz9pZD0nICsgT25lU2lnbmFsLl9hcHBfaWRcbiAgICAgICAgICArICcmaHR0cHNQcm9tcHQ9dHJ1ZSdcbiAgICAgICAgICArICcmcHVzaEVuYWJsZWQ9JyArIHB1c2hFbmFibGVkXG4gICAgICAgICAgKyAnJnBlcm1pc3Npb25CbG9ja2VkPScgKyAodHlwZW9mIE5vdGlmaWNhdGlvbiA9PT0gXCJ1bmRlZmluZWRcIiB8fCBOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PSBcImRlbmllZFwiKVxuICAgICAgICAgICsgJyZob3N0UGFnZVByb3RvY29sPScgKyBob3N0UGFnZVByb3RvY29sO1xuICAgICAgICBpZnJhbWVOb2RlLnNldEF0dHJpYnV0ZSgnZnJhbWVib3JkZXInLCAnMCcpO1xuICAgICAgICBpZnJhbWVOb2RlLndpZHRoID0gT25lU2lnbmFsLl93aW5kb3dXaWR0aC50b1N0cmluZygpO1xuICAgICAgICBpZnJhbWVOb2RlLmhlaWdodCA9IE9uZVNpZ25hbC5fd2luZG93SGVpZ2h0LnRvU3RyaW5nKCk7XG5cbiAgICAgICAgT25lU2lnbmFsLl9sb2coJ09wZW5pbmcgSFRUUFMgbW9kYWwgcHJvbXB0LicpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5vdGlmLXBlcm1pc3Npb25cIikuYXBwZW5kQ2hpbGQoaWZyYW1lTm9kZSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvcikgLy8gSWYgSFRUUFMgLSBTaG93IG5hdGl2ZSBwcm9tcHRcbiAgICAgIE9uZVNpZ25hbC5fcmVnaXN0ZXJGb3JXM0NQdXNoKG9wdGlvbnMpO1xuICAgIGVsc2VcbiAgICAgIE9uZVNpZ25hbC5fbG9nKCdTZXJ2aWNlIHdvcmtlcnMgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyLicpO1xuICB9LFxuXG4gIF9yZWdpc3RlckZvclczQ1B1c2g6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdyZWdpc3RyYXRpb25JZCcpXG4gICAgICAudGhlbihmdW5jdGlvbiBfcmVnaXN0ZXJGb3JXM0NQdXNoX0dvdFJlZ2lzdHJhdGlvbklkKHJlZ2lzdHJhdGlvbklkUmVzdWx0KSB7XG4gICAgICAgIGlmICghcmVnaXN0cmF0aW9uSWRSZXN1bHQgfHwgIW9wdGlvbnMuZnJvbVJlZ2lzdGVyRm9yIHx8IE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uICE9IFwiZ3JhbnRlZFwiKSB7XG4gICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuZ2V0UmVnaXN0cmF0aW9uKCkudGhlbihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBzd19wYXRoID0gXCJcIjtcblxuICAgICAgICAgICAgaWYgKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMucGF0aClcbiAgICAgICAgICAgICAgc3dfcGF0aCA9IE9uZVNpZ25hbC5faW5pdE9wdGlvbnMucGF0aDtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBldmVudCA9PT0gXCJ1bmRlZmluZWRcIikgLy8gTm90aGluZyByZWdpc3RlcmVkLCB2ZXJ5IGZpcnN0IHJ1blxuICAgICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBVEgsIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVJBTSkudGhlbihPbmVTaWduYWwuX2VuYWJsZU5vdGlmaWNhdGlvbnMsIE9uZVNpZ25hbC5fcmVnaXN0ZXJFcnJvcik7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKGV2ZW50LmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5hY3RpdmUuc2NyaXB0VVJMLmluZGV4T2Yoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRIKSA+IC0xKSB7XG5cbiAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ1dPUktFUjFfT05FX1NJR05BTF9TV19WRVJTSU9OJylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHZlcnNpb25SZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodmVyc2lvblJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnNpb25SZXN1bHQuaWQgIT0gT25lU2lnbmFsLl9WRVJTSU9OKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnVucmVnaXN0ZXIoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1VQREFURVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBVEgsIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVJBTSkudGhlbihPbmVTaWduYWwuX2VuYWJsZU5vdGlmaWNhdGlvbnMsIE9uZVNpZ25hbC5fcmVnaXN0ZXJFcnJvcik7XG5cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGV2ZW50LmFjdGl2ZS5zY3JpcHRVUkwuaW5kZXhPZihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1VQREFURVJfUEFUSCkgPiAtMSkge1xuXG4gICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdXT1JLRVIxX09ORV9TSUdOQUxfU1dfVkVSU0lPTicpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh2ZXJzaW9uUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnNpb25SZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uUmVzdWx0LmlkICE9IE9uZVNpZ25hbC5fVkVSU0lPTikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC51bnJlZ2lzdGVyKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9VUERBVEVSX1BBVEgsIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVJBTSkudGhlbihPbmVTaWduYWwuX2VuYWJsZU5vdGlmaWNhdGlvbnMsIE9uZVNpZ25hbC5fcmVnaXN0ZXJFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfVVBEQVRFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZXZlbnQuaW5zdGFsbGluZyA9PSBudWxsKVxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIF9hZGRTZXNzaW9uSWZyYW1lOiBmdW5jdGlvbiAoaG9zdFBhZ2VQcm90b2NvbCkge1xuXG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgIG5vZGUuc3JjID0gT25lU2lnbmFsLl9pbml0T25lU2lnbmFsSHR0cCArIFwiSWZyYW1lXCI7XG4gICAgaWYgKHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIikpXG4gICAgICBub2RlLnNyYyArPSBcIj9zZXNzaW9uPXRydWVcIlxuICAgICAgICArIFwiJmhvc3RQYWdlUHJvdG9jb2w9XCIgKyBob3N0UGFnZVByb3RvY29sO1xuICAgIGVsc2VcbiAgICAgIG5vZGUuc3JjICs9IFwiP2hvc3RQYWdlUHJvdG9jb2w9XCIgKyBob3N0UGFnZVByb3RvY29sXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcbiAgICBPbmVTaWduYWwuX2xvZygnQWRkaW5nIHNlc3Npb24gaUZyYW1lLicpO1xuXG4gICAgT25lU2lnbmFsLl9zZXNzaW9uSWZyYW1lQWRkZWQgPSB0cnVlO1xuICB9LFxuXG4gIF9yZWdpc3RlckVycm9yOiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgT25lU2lnbmFsLl9sb2coXCJuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlcjpFUlJPUjogXCIgKyBlcnIpO1xuICB9LFxuXG4gIF9lbmFibGVOb3RpZmljYXRpb25zOiBmdW5jdGlvbiAoZXhpc3RpbmdTZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uKSB7IC8vIGlzIFNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gdHlwZVxuICAgIE9uZVNpZ25hbC5fbG9nKFwiX2VuYWJsZU5vdGlmaWNhdGlvbnM6IFwiLCBleGlzdGluZ1NlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24pO1xuXG4gICAgaWYgKCEoJ1B1c2hNYW5hZ2VyJyBpbiB3aW5kb3cpKSB7XG4gICAgICBPbmVTaWduYWwuX2xvZyhcIlB1c2ggbWVzc2FnaW5nIGlzIG5vdCBzdXBwb3J0ZWQuIE5vIFB1c2hNYW5hZ2VyLlwiKTtcbiAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIiwgdHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEoJ3Nob3dOb3RpZmljYXRpb24nIGluIFNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24ucHJvdG90eXBlKSkge1xuICAgICAgT25lU2lnbmFsLl9sb2coXCJOb3RpZmljYXRpb25zIGFyZSBub3Qgc3VwcG9ydGVkLiBzaG93Tm90aWZpY2F0aW9uIG5vdCBhdmFpbGFibGUgaW4gU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbi5cIik7XG4gICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PT0gJ2RlbmllZCcpIHtcbiAgICAgIE9uZVNpZ25hbC5fd2FybihcIlRoZSB1c2VyIGhhcyBkaXNhYmxlZCBub3RpZmljYXRpb25zLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWFkeS50aGVuKGZ1bmN0aW9uIChzZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uKSB7XG4gICAgICBPbmVTaWduYWwuX2xvZyhzZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uKTtcblxuICAgICAgT25lU2lnbmFsLl9zdWJzY3JpYmVGb3JQdXNoKHNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24pO1xuICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICAvKlxuICAgUmV0dXJucyB0aGUgY3VycmVudCBicm93c2VyLWFnbm9zdGljIG5vdGlmaWNhdGlvbiBwZXJtaXNzaW9uIGFzIFwiZGVmYXVsdFwiLCBcImdyYW50ZWRcIiwgXCJkZW5pZWRcIi5cbiAgIHNhZmFyaVdlYklkOiBVc2VkIG9ubHkgdG8gZ2V0IHRoZSBjdXJyZW50IG5vdGlmaWNhdGlvbiBwZXJtaXNzaW9uIHN0YXRlIGluIFNhZmFyaSAocmVxdWlyZWQgYXMgcGFydCBvZiB0aGUgc3BlYykuXG4gICAqL1xuICBfZ2V0Tm90aWZpY2F0aW9uUGVybWlzc2lvbjogZnVuY3Rpb24gKHNhZmFyaVdlYklkKSB7XG4gICAgaWYgKHdpbmRvdy5zYWZhcmkpIHtcbiAgICAgIC8vIFRoZSB1c2VyIGlzIG9uIFNhZmFyaVxuICAgICAgLy8gQSB3ZWIgSUQgaXMgcmVxdWlyZWQgdG8gZGV0ZXJtaW5lIHRoZSBjdXJyZW50IG5vdGlmaWNpYXRpb24gcGVybWlzc2lvblxuICAgICAgaWYgKHNhZmFyaVdlYklkKSB7XG4gICAgICAgIHJldHVybiB3aW5kb3cuc2FmYXJpLnB1c2hOb3RpZmljYXRpb24ucGVybWlzc2lvbihzYWZhcmlXZWJJZCkucGVybWlzc2lvbjtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAvLyBUaGUgdXNlciBkaWRuJ3Qgc2V0IHVwIFNhZmFyaSB3ZWIgcHVzaCBwcm9wZXJseTsgbm90aWZpY2F0aW9ucyBhcmUgdW5saWtlbHkgdG8gYmUgZW5hYmxlZFxuICAgICAgICByZXR1cm4gXCJkZWZhdWx0XCI7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gSWRlbnRpY2FsIEFQSSBvbiBGaXJlZm94IGFuZCBDaHJvbWVcbiAgICAgIHJldHVybiBOb3RpZmljYXRpb24ucGVybWlzc2lvbjtcbiAgICB9XG4gIH0sXG5cbiAgX3RyaWdnZXJFdmVudDogZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGF0YSkge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBPbmVTaWduYWwuX2RlYnVnKCdTa2lwcGluZyB0cmlnZ2VyaW5nIG9mIGV2ZW50OicsIGV2ZW50TmFtZSwgJ2JlY2F1c2Ugd2UgYXJlIHJ1bm5pbmcgaW4gYSBTZXJ2aWNlV29ya2VyIGNvbnRleHQuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudChldmVudE5hbWUsIHtcbiAgICAgIGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUsIGRldGFpbHM6IGRhdGFcbiAgICB9KTtcbiAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH0sXG5cbiAgX3RyaWdnZXJFdmVudF9jdXN0b21Qcm9tcHRDbGlja2VkOiBmdW5jdGlvbiAoY2xpY2tSZXN1bHQpIHtcbiAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudCgnb25lc2lnbmFsLnByb21wdC5jdXN0b20uY2xpY2tlZCcsIHtcbiAgICAgIHJlc3VsdDogY2xpY2tSZXN1bHRcbiAgICB9KTtcbiAgfSxcblxuICBfdHJpZ2dlckV2ZW50X25hdGl2ZVByb21wdFBlcm1pc3Npb25DaGFuZ2VkOiBmdW5jdGlvbiAoZnJvbSwgdG8pIHtcbiAgICBpZiAodG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdG8gPSBPbmVTaWduYWwuX2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb24oT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zYWZhcmlfd2ViX2lkKTtcbiAgICB9XG4gICAgaWYgKGZyb20gIT09IHRvKSB7XG4gICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudCgnb25lc2lnbmFsLnByb21wdC5uYXRpdmUucGVybWlzc2lvbmNoYW5nZWQnLCB7XG4gICAgICAgIGZyb206IGZyb20sXG4gICAgICAgIHRvOiB0b1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF90cmlnZ2VyRXZlbnRfc3Vic2NyaXB0aW9uQ2hhbmdlZDogZnVuY3Rpb24gKHRvKSB7XG4gICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnQoJ29uZXNpZ25hbC5zdWJzY3JpcHRpb24uY2hhbmdlZCcsIHRvKTtcbiAgfSxcblxuICBfdHJpZ2dlckV2ZW50X2RiVmFsdWVSZXRyaWV2ZWQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50KCdvbmVzaWduYWwuZGIudmFsdWVyZXRyaWV2ZWQnLCB2YWx1ZSk7XG4gIH0sXG5cbiAgX3RyaWdnZXJFdmVudF9kYlZhbHVlU2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudCgnb25lc2lnbmFsLmRiLnZhbHVlc2V0JywgdmFsdWUpO1xuICB9LFxuXG4gIF90cmlnZ2VyRXZlbnRfaW50ZXJuYWxTdWJzY3JpcHRpb25TZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50KCdvbmVzaWduYWwuaW50ZXJuYWwuc3Vic2NyaXB0aW9uc2V0JywgdmFsdWUpO1xuICB9LFxuXG4gIF9zdWJzY3JpYmVGb3JQdXNoOiBmdW5jdGlvbiAoc2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbikge1xuICAgIE9uZVNpZ25hbC5fbG9nKCdfc3Vic2NyaWJlRm9yUHVzaDonLCAnbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVhZHkudGhlbicpO1xuXG4gICAgdmFyIG5vdGlmaWNhdGlvblBlcm1pc3Npb25CZWZvcmVSZXF1ZXN0ID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCk7XG4gICAgc2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbi5wdXNoTWFuYWdlci5zdWJzY3JpYmUoe3VzZXJWaXNpYmxlT25seTogdHJ1ZX0pXG4gICAgICAudGhlbihmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX05PVElGSUNBVElPTl9QRVJNSVNTSU9OXCIsIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uKTtcblxuICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdhcHBJZCcpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24gX3N1YnNjcmliZUZvclB1c2hfR290QXBwSWQoYXBwSWRSZXN1bHQpIHtcbiAgICAgICAgICAgIHZhciBhcHBJZCA9IGFwcElkUmVzdWx0LmlkO1xuICAgICAgICAgICAgT25lU2lnbmFsLl9kZWJ1ZyhcInNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24ucHVzaE1hbmFnZXIuc3Vic2NyaWJlKClcIik7XG5cbiAgICAgICAgICAgIHZhciByZWdpc3RyYXRpb25JZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3Vic2NyaXB0aW9uLnN1YnNjcmlwdGlvbklkICE9IFwidW5kZWZpbmVkXCIpIC8vIENocm9tZSA0MyAmIDQyXG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uSWQgPSBzdWJzY3JpcHRpb24uc3Vic2NyaXB0aW9uSWQ7XG4gICAgICAgICAgICAgIGVsc2UgIC8vIENocm9tZSA0NCsgYW5kIEZpcmVGb3hcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25JZCA9IHN1YnNjcmlwdGlvbi5lbmRwb2ludC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJeKGh0dHBzOi8vYW5kcm9pZC5nb29nbGVhcGlzLmNvbS9nY20vc2VuZC98aHR0cHM6Ly91cGRhdGVzLnB1c2guc2VydmljZXMubW96aWxsYS5jb20vcHVzaC8pXCIpLCBcIlwiKTtcbiAgICAgICAgICAgICAgT25lU2lnbmFsLl9kZWJ1ZygncmVnaXN0cmF0aW9uIGlkIGlzOicgKyByZWdpc3RyYXRpb25JZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fbG9nKCdFcnJvciBjb3VsZCBub3Qgc3Vic2NyaWJlIHlvdXIgYnJvd3NlciBmb3IgcHVzaCEnKTtcblxuICAgICAgICAgICAgT25lU2lnbmFsLl9yZWdpc3RlcldpdGhPbmVTaWduYWwoYXBwSWQsIHJlZ2lzdHJhdGlvbklkLCBPbmVTaWduYWwuX2lzU3VwcG9ydGVkRmlyZUZveCgpID8gOCA6IDUpO1xuXG4gICAgICAgICAgICBpZiAoIU9uZVNpZ25hbC5fdXNpbmdOYXRpdmVQZXJtaXNzaW9uSG9vaylcbiAgICAgICAgICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfbmF0aXZlUHJvbXB0UGVybWlzc2lvbkNoYW5nZWQobm90aWZpY2F0aW9uUGVybWlzc2lvbkJlZm9yZVJlcXVlc3QpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKCdFcnJvciBkdXJpbmcgc3Vic2NyaWJlKCk6JywgZSk7XG5cbiAgICAgICAgaWYgKCFPbmVTaWduYWwuX3VzaW5nTmF0aXZlUGVybWlzc2lvbkhvb2spXG4gICAgICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfbmF0aXZlUHJvbXB0UGVybWlzc2lvbkNoYW5nZWQobm90aWZpY2F0aW9uUGVybWlzc2lvbkJlZm9yZVJlcXVlc3QpO1xuXG4gICAgICAgIGlmIChlLmNvZGUgPT0gMjAgJiYgb3BlbmVyICYmIE9uZVNpZ25hbC5faHR0cFJlZ2lzdHJhdGlvbilcbiAgICAgICAgICB3aW5kb3cuY2xvc2UoKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIHNlbmRUYWc6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgdmFyIGpzb25LZXlWYWx1ZSA9IHt9O1xuICAgIGpzb25LZXlWYWx1ZVtrZXldID0gdmFsdWU7XG4gICAgT25lU2lnbmFsLnNlbmRUYWdzKGpzb25LZXlWYWx1ZSk7XG4gIH0sXG5cbiAgc2VuZFRhZ3M6IGZ1bmN0aW9uIChqc29uUGFpcikge1xuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXG4gICAgICAudGhlbihmdW5jdGlvbiBzZW5kVGFnc19Hb3RVc2VySWQodXNlcklkUmVzdWx0KSB7XG4gICAgICAgIGlmICh1c2VySWRSZXN1bHQpXG4gICAgICAgICAgT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkoXCJwbGF5ZXJzL1wiICsgdXNlcklkUmVzdWx0LmlkLCBcIlBVVFwiLCB7XG4gICAgICAgICAgICBhcHBfaWQ6IE9uZVNpZ25hbC5fYXBwX2lkLFxuICAgICAgICAgICAgdGFnczoganNvblBhaXJcbiAgICAgICAgICB9KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIgPT0gbnVsbClcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIgPSBqc29uUGFpcjtcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRPYmogPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIF9vYmogaW4gT25lU2lnbmFsLl90YWdzVG9TZW5kT25SZWdpc3RlcikgcmVzdWx0T2JqW19vYmpdID0gT25lU2lnbmFsLl90YWdzVG9TZW5kT25SZWdpc3Rlcltfb2JqXTtcbiAgICAgICAgICAgIGZvciAodmFyIF9vYmogaW4ganNvblBhaXIpIHJlc3VsdE9ialtfb2JqXSA9IGpzb25QYWlyW19vYmpdO1xuICAgICAgICAgICAgT25lU2lnbmFsLl90YWdzVG9TZW5kT25SZWdpc3RlciA9IHJlc3VsdE9iajtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcignc2VuZFRhZ3M6JywgZSk7XG4gICAgICB9KTtcbiAgfSxcblxuICBkZWxldGVUYWc6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBPbmVTaWduYWwuZGVsZXRlVGFncyhba2V5XSk7XG4gIH0sXG5cbiAgZGVsZXRlVGFnczogZnVuY3Rpb24gKGtleUFycmF5KSB7XG4gICAgdmFyIGpzb25QYWlyID0ge307XG4gICAgdmFyIGxlbmd0aCA9IGtleUFycmF5Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAganNvblBhaXJba2V5QXJyYXlbaV1dID0gXCJcIjtcblxuICAgIE9uZVNpZ25hbC5zZW5kVGFncyhqc29uUGFpcik7XG4gIH0sXG5cbiAgX2hhbmRsZU5vdGlmaWNhdGlvbk9wZW5lZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIG5vdGlmaWNhdGlvbkRhdGEgPSBKU09OLnBhcnNlKGV2ZW50Lm5vdGlmaWNhdGlvbi50YWcpO1xuICAgIGV2ZW50Lm5vdGlmaWNhdGlvbi5jbG9zZSgpO1xuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ2FwcElkJyksIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIF9oYW5kbGVOb3RpZmljYXRpb25PcGVuZWRfR290QXBwVXNlcklkcyhyZXN1bHRzKSB7XG4gICAgICAgIHZhciBhcHBJZFJlc3VsdCA9IHJlc3VsdHNbMF07XG4gICAgICAgIHZhciB1c2VySWRSZXN1bHQgPSByZXN1bHRzWzFdO1xuICAgICAgICBpZiAoYXBwSWRSZXN1bHQgJiYgdXNlcklkUmVzdWx0KSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkoXCJub3RpZmljYXRpb25zL1wiICsgbm90aWZpY2F0aW9uRGF0YS5pZCwgXCJQVVRcIiwge1xuICAgICAgICAgICAgYXBwX2lkOiBhcHBJZFJlc3VsdC5pZCxcbiAgICAgICAgICAgIHBsYXllcl9pZDogdXNlcklkUmVzdWx0LmlkLFxuICAgICAgICAgICAgb3BlbmVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcblxuICAgIGV2ZW50LndhaXRVbnRpbChcbiAgICAgIGNsaWVudHMubWF0Y2hBbGwoe3R5cGU6IFwid2luZG93XCJ9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoY2xpZW50TGlzdCkge1xuICAgICAgICAgIHZhciBsYXVuY2hVUkwgPSByZWdpc3RyYXRpb24uc2NvcGU7XG4gICAgICAgICAgaWYgKE9uZVNpZ25hbC5fZGVmYXVsdExhdW5jaFVSTClcbiAgICAgICAgICAgIGxhdW5jaFVSTCA9IE9uZVNpZ25hbC5fZGVmYXVsdExhdW5jaFVSTDtcbiAgICAgICAgICBpZiAobm90aWZpY2F0aW9uRGF0YS5sYXVuY2hVUkwpXG4gICAgICAgICAgICBsYXVuY2hVUkwgPSBub3RpZmljYXRpb25EYXRhLmxhdW5jaFVSTDtcblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2xpZW50TGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNsaWVudCA9IGNsaWVudExpc3RbaV07XG4gICAgICAgICAgICBpZiAoJ2ZvY3VzJyBpbiBjbGllbnQgJiYgY2xpZW50LnVybCA9PSBsYXVuY2hVUkwpIHtcbiAgICAgICAgICAgICAgY2xpZW50LmZvY3VzKCk7XG5cbiAgICAgICAgICAgICAgLy8gdGFyZ2V0T3JpZ2luIG5vdCB2YWxpZCBoZXJlIGFzIHRoZSBzZXJ2aWNlIHdvcmtlciBvd25zIHRoZSBwYWdlLlxuICAgICAgICAgICAgICBjbGllbnQucG9zdE1lc3NhZ2Uobm90aWZpY2F0aW9uRGF0YSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwge3VybDogbGF1bmNoVVJMLCBkYXRhOiBub3RpZmljYXRpb25EYXRhfSk7XG4gICAgICAgICAgY2xpZW50cy5vcGVuV2luZG93KGxhdW5jaFVSTCkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBTaG91bGQgb25seSBmYWxsIGludG8gaGVyZSBpZiBnb2luZyB0byBhbiBleHRlcm5hbCBVUkwgb24gQ2hyb21lIG9sZGVyIHRoYW4gNDMuXG4gICAgICAgICAgICBjbGllbnRzLm9wZW5XaW5kb3cocmVnaXN0cmF0aW9uLnNjb3BlICsgXCJyZWRpcmVjdG9yLmh0bWw/dXJsPVwiICsgbGF1bmNoVVJMKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSlcbiAgICApO1xuICB9LFxuXG4gIF9nZXRUaXRsZTogZnVuY3Rpb24gKGluY29taW5nVGl0bGUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGluY29taW5nVGl0bGUgIT0gbnVsbCkge1xuICAgICAgY2FsbGJhY2soaW5jb21pbmdUaXRsZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdkZWZhdWx0VGl0bGUnKSwgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdPcHRpb25zJywgJ3BhZ2VUaXRsZScpXSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIF9nZXRUaXRsZV9Hb3REZWZhdWx0UGFnZVRpdGxlcyhyZXN1bHRzKSB7XG4gICAgICAgIHZhciBkZWZhdWx0VGl0bGVSZXN1bHQgPSByZXN1bHRzWzBdO1xuICAgICAgICB2YXIgcGFnZVRpdGxlUmVzdWx0ID0gcmVzdWx0c1sxXTtcblxuICAgICAgICBpZiAoZGVmYXVsdFRpdGxlUmVzdWx0KSB7XG4gICAgICAgICAgY2FsbGJhY2soZGVmYXVsdFRpdGxlUmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocGFnZVRpdGxlUmVzdWx0ICYmIHBhZ2VUaXRsZVJlc3VsdC52YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgY2FsbGJhY2socGFnZVRpdGxlUmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soJycpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgfSxcblxuICAvLyBEaXNwbGF5cyBub3RpZmljYXRpb24gZnJvbSBjb250ZW50IHJlY2VpdmVkIGZyb20gT25lU2lnbmFsLlxuICBfaGFuZGxlR0NNTWVzc2FnZTogZnVuY3Rpb24gKHNlcnZpY2VXb3JrZXIsIGV2ZW50KSB7XG4gICAgLy8gVE9ETzogUmVhZCBkYXRhIGZyb20gdGhlIEdDTSBwYXlsb2FkIHdoZW4gQ2hyb21lIG5vIGxvbmdlciByZXF1aXJlcyB0aGUgYmVsb3cgY29tbWFuZCBsaW5lIHBhcmFtZXRlci5cbiAgICAvLyAtLWVuYWJsZS1wdXNoLW1lc3NhZ2UtcGF5bG9hZFxuICAgIC8vIFRoZSBjb21tYW5kIGxpbmUgcGFyYW0gaXMgcmVxdWlyZWQgZXZlbiBvbiBDaHJvbWUgNDMgbmlnaHRseSBidWlsZCAyMDE1LzAzLzE3LlxuICAgIGlmIChldmVudC5kYXRhICYmIGV2ZW50LmRhdGEudGV4dCgpWzBdID09IFwie1wiKSB7XG4gICAgICBPbmVTaWduYWwuX2xvZygnUmVjZWl2ZWQgZGF0YS50ZXh0OiAnLCBldmVudC5kYXRhLnRleHQoKSk7XG4gICAgICBPbmVTaWduYWwuX2xvZygnUmVjZWl2ZWQgZGF0YS5qc29uOiAnLCBldmVudC5kYXRhLmpzb24oKSk7XG4gICAgfVxuXG4gICAgZXZlbnQud2FpdFVudGlsKG5ldyBQcm9taXNlKFxuICAgICAgZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBPbmVTaWduYWwuX2dldFRpdGxlKG51bGwsIGZ1bmN0aW9uICh0aXRsZSkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdkZWZhdWx0SWNvbicpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiBfaGFuZGxlR0NNTWVzc2FnZV9Hb3REZWZhdWx0SWNvbihkZWZhdWx0SWNvblJlc3VsdCkge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX2dldExhc3ROb3RpZmljYXRpb25zKGZ1bmN0aW9uIChyZXNwb25zZSwgYXBwSWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm90aWZpY2F0aW9uRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgIGlkOiByZXNwb25zZS5jdXN0b20uaSxcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHJlc3BvbnNlLmFsZXJ0LFxuICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbERhdGE6IHJlc3BvbnNlLmN1c3RvbS5hXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS50aXRsZSlcbiAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvbkRhdGEudGl0bGUgPSByZXNwb25zZS50aXRsZTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25EYXRhLnRpdGxlID0gdGl0bGU7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuY3VzdG9tLnUpXG4gICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25EYXRhLmxhdW5jaFVSTCA9IHJlc3BvbnNlLmN1c3RvbS51O1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmljb24pXG4gICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25EYXRhLmljb24gPSByZXNwb25zZS5pY29uO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlZmF1bHRJY29uUmVzdWx0KVxuICAgICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uRGF0YS5pY29uID0gZGVmYXVsdEljb25SZXN1bHQudmFsdWU7XG5cbiAgICAgICAgICAgICAgICAvLyBOZXZlciBuZXN0IHRoZSBmb2xsb3dpbmcgbGluZSBpbiBhIGNhbGxiYWNrIGZyb20gdGhlIHBvaW50IG9mIGVudGVyaW5nIGZyb20gX2dldExhc3ROb3RpZmljYXRpb25zXG4gICAgICAgICAgICAgICAgc2VydmljZVdvcmtlci5yZWdpc3RyYXRpb24uc2hvd05vdGlmaWNhdGlvbihub3RpZmljYXRpb25EYXRhLnRpdGxlLCB7XG4gICAgICAgICAgICAgICAgICBib2R5OiByZXNwb25zZS5hbGVydCxcbiAgICAgICAgICAgICAgICAgIGljb246IG5vdGlmaWNhdGlvbkRhdGEuaWNvbixcbiAgICAgICAgICAgICAgICAgIHRhZzogSlNPTi5zdHJpbmdpZnkobm90aWZpY2F0aW9uRGF0YSlcbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc29sdmUpXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdPcHRpb25zJywgJ2RlZmF1bHRVcmwnKVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRlZmF1bHRVcmxSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRVcmxSZXN1bHQpXG4gICAgICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9kZWZhdWx0TGF1bmNoVVJMID0gZGVmYXVsdFVybFJlc3VsdC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgfSwgcmVzb2x2ZSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KSlcbiAgfSxcblxuICBfZ2V0TGFzdE5vdGlmaWNhdGlvbnM6IGZ1bmN0aW9uIChpdGVtQ2FsbGJhY2ssIGNvbXBsZXRlQ2FsbGJhY2spIHtcbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gX2dldExhc3ROb3RpZmljYXRpb25zX0dvdFVzZXJJZCh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgaWYgKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fc2VuZFRvT25lU2lnbmFsQXBpKFwicGxheWVycy9cIiArIHVzZXJJZFJlc3VsdC5pZCArIFwiL2Nocm9tZXdlYl9ub3RpZmljYXRpb25cIiwgXCJHRVRcIiwgbnVsbCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3BvbnNlLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICBpdGVtQ2FsbGJhY2soSlNPTi5wYXJzZShyZXNwb25zZVtpXSkpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbXBsZXRlQ2FsbGJhY2soKTtcbiAgICAgICAgICB9KTsgIC8vIEZhaWxlZCBjYWxsYmFja1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIE9uZVNpZ25hbC5fbG9nKFwiRXJyb3I6IGNvdWxkIG5vdCBnZXQgbm90aWZpY2F0aW9uSWRcIik7XG4gICAgICAgICAgY29tcGxldGVDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgICA7XG4gIH0sXG5cbiAgLy8gSFRUUCAmIEhUVFBTIC0gUnVucyBvbiBtYWluIHBhZ2VcbiAgX2xpc3RlbmVyX3JlY2VpdmVNZXNzYWdlOiBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShldmVudCkge1xuICAgIE9uZVNpZ25hbC5fbG9nKFwiX2xpc3RlbmVyX3JlY2VpdmVNZXNzYWdlOiBcIiwgZXZlbnQpO1xuXG4gICAgaWYgKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMgPT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKCFPbmVTaWduYWwuX0lTX0RFViAmJiBldmVudC5vcmlnaW4gIT09IFwiXCIgJiYgZXZlbnQub3JpZ2luICE9PSBcImh0dHBzOi8vb25lc2lnbmFsLmNvbVwiICYmIGV2ZW50Lm9yaWdpbiAhPT0gXCJodHRwczovL1wiICsgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zdWJkb21haW5OYW1lICsgXCIub25lc2lnbmFsLmNvbVwiKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKGV2ZW50LmRhdGEub25lU2lnbmFsSW5pdFBhZ2VSZWFkeSkgeyAvLyBPbmx5IGNhbGxlZCBvbiBIVFRQIHBhZ2VzLlxuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlcyhcIk9wdGlvbnNcIilcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gX2xpc3RlbmVyX3JlY2VpdmVNZXNzYWdlKG9wdGlvbnMpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2xvZyhcImN1cnJlbnQgb3B0aW9uc1wiLCBvcHRpb25zKTtcbiAgICAgICAgICBpZiAoIW9wdGlvbnMuZGVmYXVsdFVybClcbiAgICAgICAgICAgIG9wdGlvbnMuZGVmYXVsdFVybCA9IGRvY3VtZW50LlVSTDtcbiAgICAgICAgICBpZiAoIW9wdGlvbnMuZGVmYXVsdFRpdGxlKVxuICAgICAgICAgICAgb3B0aW9ucy5kZWZhdWx0VGl0bGUgPSBkb2N1bWVudC50aXRsZTtcblxuICAgICAgICAgIG9wdGlvbnMucGFyZW50X3VybCA9IGRvY3VtZW50LlVSTDtcbiAgICAgICAgICBPbmVTaWduYWwuX2xvZyhcIlBvc3RpbmcgbWVzc2FnZSB0byBwb3J0WzBdXCIsIGV2ZW50LnBvcnRzWzBdKTtcbiAgICAgICAgICBldmVudC5wb3J0c1swXS5wb3N0TWVzc2FnZSh7aW5pdE9wdGlvbnM6IG9wdGlvbnN9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9lcnJvcignX2xpc3RlbmVyX3JlY2VpdmVNZXNzYWdlOicsIGUpO1xuICAgICAgICB9KTtcblxuICAgICAgdmFyIGV2ZW50RGF0YSA9IGV2ZW50LmRhdGEub25lU2lnbmFsSW5pdFBhZ2VSZWFkeTtcblxuICAgICAgaWYgKGV2ZW50RGF0YS5pc0lmcmFtZSlcbiAgICAgICAgT25lU2lnbmFsLl9pZnJhbWVQb3J0ID0gZXZlbnQucG9ydHNbMF07XG5cbiAgICAgIGlmIChldmVudERhdGEudXNlcklkKVxuICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwidXNlcklkXCIsIGlkOiBldmVudERhdGEudXNlcklkfSk7XG4gICAgICBpZiAoZXZlbnREYXRhLnJlZ2lzdHJhdGlvbklkKVxuICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwicmVnaXN0cmF0aW9uSWRcIiwgaWQ6IGV2ZW50RGF0YS5yZWdpc3RyYXRpb25JZH0pO1xuXG4gICAgICBPbmVTaWduYWwuX2ZpcmVOb3RpZmljYXRpb25FbmFibGVkQ2FsbGJhY2soZXZlbnREYXRhLmlzUHVzaEVuYWJsZWQpO1xuICAgICAgT25lU2lnbmFsLl9zZW5kVW5zZW50VGFncygpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldmVudC5kYXRhLmN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uKSAvLyBTdWJkb21haW4gT25seVxuICAgICAgT25lU2lnbmFsLl9maXJlTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrKGV2ZW50LmRhdGEuY3VycmVudE5vdGlmaWNhdGlvblBlcm1pc3Npb24uaXNQdXNoRW5hYmxlZCk7XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5pZHNBdmFpbGFibGUpIHsgLy8gT25seSBjYWxsZWQgb24gSFRUUCBwYWdlcy5cbiAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIiwgdHJ1ZSk7XG4gICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwidXNlcklkXCIsIGlkOiBldmVudC5kYXRhLmlkc0F2YWlsYWJsZS51c2VySWR9KTtcbiAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJyZWdpc3RyYXRpb25JZFwiLCBpZDogZXZlbnQuZGF0YS5pZHNBdmFpbGFibGUucmVnaXN0cmF0aW9uSWR9KTtcblxuICAgICAgaWYgKE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgd2hpbGUgKE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3Vycl9jYWxsYmFjayA9IE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLnBvcCgpXG4gICAgICAgICAgY3Vycl9jYWxsYmFjayh7XG4gICAgICAgICAgICB1c2VySWQ6IGV2ZW50LmRhdGEuaWRzQXZhaWxhYmxlLnVzZXJJZCxcbiAgICAgICAgICAgIHJlZ2lzdHJhdGlvbklkOiBldmVudC5kYXRhLmlkc0F2YWlsYWJsZS5yZWdpc3RyYXRpb25JZFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBPbmVTaWduYWwuX3NlbmRVbnNlbnRUYWdzKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2ZW50LmRhdGEuaHR0cHNQcm9tcHRBY2NlcHRlZCkgeyAvLyBIVFRQUyBPbmx5XG4gICAgICBPbmVTaWduYWwucmVnaXN0ZXJGb3JQdXNoTm90aWZpY2F0aW9ucygpO1xuICAgICAgT25lU2lnbmFsLnNldFN1YnNjcmlwdGlvbih0cnVlKTtcbiAgICAgIChlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ09uZVNpZ25hbC1pZnJhbWUtbW9kYWwnKSkucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtKTtcbiAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2N1c3RvbVByb21wdENsaWNrZWQoJ2dyYW50ZWQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5odHRwc1Byb21wdENhbmNlbGVkKSB7IC8vIEhUVFBTIE9ubHlcbiAgICAgIChlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ09uZVNpZ25hbC1pZnJhbWUtbW9kYWwnKSkucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtKTtcbiAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2N1c3RvbVByb21wdENsaWNrZWQoJ2RlbmllZCcpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldmVudC5kYXRhLmh0dHBQcm9tcHRBY2NlcHRlZCkgeyAvLyBIVFRQIE9ubHlcbiAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2N1c3RvbVByb21wdENsaWNrZWQoJ2dyYW50ZWQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5odHRwUHJvbXB0Q2FuY2VsZWQpIHsgLy8gSFRUUCBPbmx5XG4gICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9jdXN0b21Qcm9tcHRDbGlja2VkKCdkZW5pZWQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoT25lU2lnbmFsLl9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2spIC8vIEhUVFAgYW5kIEhUVFBTXG4gICAgICBPbmVTaWduYWwuX25vdGlmaWNhdGlvbk9wZW5lZF9jYWxsYmFjayhldmVudC5kYXRhKTtcbiAgfSxcblxuICBhZGRMaXN0ZW5lckZvck5vdGlmaWNhdGlvbk9wZW5lZDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgT25lU2lnbmFsLl9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBpZiAod2luZG93KSB7XG4gICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwgZG9jdW1lbnQuVVJMKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAobm90aWZpY2F0aW9uT3BlbmVkUmVzdWx0KSB7XG4gICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCkge1xuICAgICAgICAgICAgT25lU2lnbmFsLl9kZWxldGVEYlZhbHVlKFwiTm90aWZpY2F0aW9uT3BlbmVkXCIsIGRvY3VtZW50LlVSTCk7XG4gICAgICAgICAgICBPbmVTaWduYWwuX25vdGlmaWNhdGlvbk9wZW5lZF9jYWxsYmFjayhub3RpZmljYXRpb25PcGVuZWRSZXN1bHQuZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgICB9KTtcbiAgICAgIDtcbiAgICB9XG4gIH0sXG5cbiAgLy8gU3ViZG9tYWluIC0gRmlyZWQgZnJvbSBtZXNzYWdlIHJlY2VpdmVkIGZyb20gaWZyYW1lLlxuICBfZmlyZU5vdGlmaWNhdGlvbkVuYWJsZWRDYWxsYmFjazogZnVuY3Rpb24gKG5vdGlmUGVybXNzaW9uKSB7XG4gICAgaWYgKE9uZVNpZ25hbC5faXNOb3RpZmljYXRpb25FbmFibGVkQ2FsbGJhY2spIHtcbiAgICAgIE9uZVNpZ25hbC5faXNOb3RpZmljYXRpb25FbmFibGVkQ2FsbGJhY2sobm90aWZQZXJtc3Npb24pO1xuICAgICAgT25lU2lnbmFsLl9pc05vdGlmaWNhdGlvbkVuYWJsZWRDYWxsYmFjayA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIGdldElkc0F2YWlsYWJsZTogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgaWYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5wdXNoKGNhbGxiYWNrKTtcblxuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKSwgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAncmVnaXN0cmF0aW9uSWQnKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBnZXRJZHNBdmFpbGFibGVfR290VXNlclJlZ2lzdHJhdGlvbklkcyhyZXN1bHRzKSB7XG4gICAgICAgIHZhciB1c2VySWRSZXN1bHQgPSByZXN1bHRzWzBdO1xuICAgICAgICB2YXIgcmVnaXN0cmF0aW9uSWRSZXN1bHQgPSByZXN1bHRzWzFdO1xuXG4gICAgICAgIGlmICh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uSWRSZXN1bHQpIHtcbiAgICAgICAgICAgIHdoaWxlIChPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBjdXJyX2NhbGxiYWNrID0gT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2sucG9wKCk7XG4gICAgICAgICAgICAgIGN1cnJfY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHVzZXJJZDogdXNlcklkUmVzdWx0LmlkLFxuICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvbklkOiByZWdpc3RyYXRpb25JZFJlc3VsdC5pZFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgd2hpbGUgKE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgdmFyIGN1cnJfY2FsbGJhY2sgPSBPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5wb3AoKTtcbiAgICAgICAgICAgICAgY3Vycl9jYWxsYmFjayh7dXNlcklkOiB1c2VySWRSZXN1bHQuaWQsIHJlZ2lzdHJhdGlvbklkOiBudWxsfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICBnZXRUYWdzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICBpZiAodXNlcklkUmVzdWx0KSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkoXCJwbGF5ZXJzL1wiICsgdXNlcklkUmVzdWx0LmlkLCAnR0VUJywgbnVsbCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS50YWdzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBPbmVTaWduYWwuX2Vycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIGlzUHVzaE5vdGlmaWNhdGlvbnNFbmFibGVkOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAvLyBJZiBTdWJkb21haW5cbiAgICBpZiAoT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zdWJkb21haW5OYW1lICYmICFPbmVTaWduYWwuX2lzQnJvd3NlclNhZmFyaSgpKSB7XG4gICAgICBPbmVTaWduYWwuX2lzTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICBpZiAoT25lU2lnbmFsLl9pZnJhbWVQb3J0KVxuICAgICAgICBPbmVTaWduYWwuX2lmcmFtZVBvcnQucG9zdE1lc3NhZ2Uoe2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb246IHRydWV9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBIVFRQU1xuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3JlZ2lzdHJhdGlvbklkJyksIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdzdWJzY3JpcHRpb24nKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgICB2YXIgcmVnaXN0cmF0aW9uSWRSZXN1bHQgPSByZXN1bHRzWzBdO1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uUmVzdWx0ID0gcmVzdWx0c1sxXTtcblxuICAgICAgICBpZiAocmVnaXN0cmF0aW9uSWRSZXN1bHQpIHtcbiAgICAgICAgICBpZiAoc3Vic2NyaXB0aW9uUmVzdWx0ICYmICFzdWJzY3JpcHRpb25SZXN1bHQudmFsdWUpXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZmFsc2UpO1xuXG4gICAgICAgICAgY2FsbGJhY2soTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT0gXCJncmFudGVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgfSxcblxuICBfaXNTdXBwb3J0ZWRTYWZhcmk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2FmYXJpVmVyc2lvbiA9IG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKFwiVmVyc2lvbi8oWzAtOV0/KS4qIFNhZmFyaVwiKTtcbiAgICBpZiAoc2FmYXJpVmVyc2lvbiA9PSBudWxsKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICgvaVBob25lfGlQYWR8aVBvZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIChwYXJzZUludChzYWZhcmlWZXJzaW9uWzFdKSA+IDYpO1xuICB9LFxuXG4gIF9pc0Jyb3dzZXJTYWZhcmk6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gbmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goXCJWZXJzaW9uLyhbMC05XT8pLiogU2FmYXJpXCIpO1xuICAgIHJldHVybiBzYWZhcmlWZXJzaW9uICE9IG51bGwgO1xuICB9LFxuXG4gIF9pc1N1cHBvcnRlZEZpcmVGb3g6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZmlyZUZveFZlcnNpb24gPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC8oRmlyZWZveFxcLykoWzAtOV17Mix9XFwuWzAtOV17MSx9KS8pO1xuICAgIGlmIChmaXJlRm94VmVyc2lvbilcbiAgICAgIHJldHVybiBwYXJzZUludChmaXJlRm94VmVyc2lvblsyXS5zdWJzdHJpbmcoMCwgMikpID4gNDM7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIF9pc0Jyb3dzZXJGaXJlZm94OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmlyZUZveFZlcnNpb24gPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC8oRmlyZWZveFxcLykoWzAtOV17Mix9XFwuWzAtOV17MSx9KS8pO1xuICAgIHJldHVybiBmaXJlRm94VmVyc2lvbiAhPSBudWxsIDtcbiAgfSxcblxuICBfZ2V0RmlyZWZveFZlcnNpb246IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaXJlRm94VmVyc2lvbiA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goLyhGaXJlZm94XFwvKShbMC05XXsyLH1cXC5bMC05XXsxLH0pLyk7XG4gICAgaWYgKGZpcmVGb3hWZXJzaW9uKVxuICAgICAgcmV0dXJuIHBhcnNlSW50KGZpcmVGb3hWZXJzaW9uWzJdLnN1YnN0cmluZygwLCAyKSk7XG4gICAgZWxzZSByZXR1cm4gLTE7XG4gIH0sXG5cbiAgaXNQdXNoTm90aWZpY2F0aW9uc1N1cHBvcnRlZDogZnVuY3Rpb24gKCkge1xuICAgIGlmIChPbmVTaWduYWwuX2lzU3VwcG9ydGVkRmlyZUZveCgpKVxuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICBpZiAoT25lU2lnbmFsLl9pc1N1cHBvcnRlZFNhZmFyaSgpKVxuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB2YXIgY2hyb21lVmVyc2lvbiA9IG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9DaHJvbWVcXC8oLio/KSAvKTtcblxuICAgIC8vIENocm9tZSBpcyBub3QgZm91bmQgaW4gYXBwVmVyc2lvbi5cbiAgICBpZiAoIWNocm9tZVZlcnNpb24pXG4gICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBNaWNyb3NvZnQgRWRnZVxuICAgIGlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvRWRnZS8pKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gQW5kcm9pZCBDaHJvbWUgV2ViVmlld1xuICAgIGlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvIHd2LykpXG4gICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBPcGVyYVxuICAgIGlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvT1BSXFwvLykpXG4gICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBUaGUgdXNlciBpcyBvbiBpT1NcbiAgICBpZiAoL2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnBsYXRmb3JtKSlcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiBwYXJzZUludChjaHJvbWVWZXJzaW9uWzFdLnN1YnN0cmluZygwLCAyKSkgPiA0MTtcbiAgfSxcblxuICBfZ2V0Tm90aWZpY2F0aW9uVHlwZXM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIE9uZVNpZ25hbC5fZ2V0U3Vic2NyaXB0aW9uKGZ1bmN0aW9uIChkYl9zdWJzY3JpcHRpb25TZXQpIHtcbiAgICAgIGNhbGxiYWNrKGRiX3N1YnNjcmlwdGlvblNldCA/IDEgOiAtMik7XG4gICAgfSk7XG4gIH0sXG5cbiAgc2V0U3Vic2NyaXB0aW9uOiBmdW5jdGlvbiAobmV3U3Vic2NyaXB0aW9uKSB7XG4gICAgaWYgKE9uZVNpZ25hbC5faWZyYW1lUG9ydClcbiAgICAgIE9uZVNpZ25hbC5faWZyYW1lUG9ydC5wb3N0TWVzc2FnZSh7c2V0U3ViZG9tYWluU3RhdGU6IHtzZXRTdWJzY3JpcHRpb246IG5ld1N1YnNjcmlwdGlvbn19KTtcbiAgICBlbHNlIHtcbiAgICAgIE9uZVNpZ25hbC5fZ2V0U3Vic2NyaXB0aW9uKGZ1bmN0aW9uIChjdXJyZW50U3Vic2NyaXB0aW9uKSB7XG4gICAgICAgIGlmIChjdXJyZW50U3Vic2NyaXB0aW9uICE9IG5ld1N1YnNjcmlwdGlvbikge1xuICAgICAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIk9wdGlvbnNcIiwge2tleTogXCJzdWJzY3JpcHRpb25cIiwgdmFsdWU6IG5ld1N1YnNjcmlwdGlvbn0pO1xuICAgICAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcklkUmVzdWx0KSB7XG4gICAgICAgICAgICAgIGlmICh1c2VySWRSZXN1bHQpXG4gICAgICAgICAgICAgICAgT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkoXCJwbGF5ZXJzL1wiICsgdXNlcklkUmVzdWx0LmlkLCBcIlBVVFwiLCB7XG4gICAgICAgICAgICAgICAgICBhcHBfaWQ6IE9uZVNpZ25hbC5fYXBwX2lkLFxuICAgICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uX3R5cGVzOiBuZXdTdWJzY3JpcHRpb24gPyAxIDogLTJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiBzZXRTdWJzY3JpcHRpb25TZXRDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2ludGVybmFsU3Vic2NyaXB0aW9uU2V0KG5ld1N1YnNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF9nZXRTdWJzY3JpcHRpb246IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdzdWJzY3JpcHRpb24nKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHN1YnNjcmlwdGlvblJlc3VsdCkge1xuICAgICAgICBjYWxsYmFjayghKHN1YnNjcmlwdGlvblJlc3VsdCAmJiBzdWJzY3JpcHRpb25SZXN1bHQudmFsdWUgPT0gZmFsc2UpKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICBfc2FmZVBvc3RNZXNzYWdlOiBmdW5jdGlvbiAoY3JlYXRvciwgZGF0YSwgdGFyZ2V0T3JpZ2luLCByZWNlaXZlcikge1xuICAgIHZhciB0T3JpZ2luID0gdGFyZ2V0T3JpZ2luLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBJZiB3ZSBhcmUgdHJ5aW5nIHRvIHRhcmdldCBhIGh0dHAgc2l0ZSBhbGxvdyB0aGUgaHR0cHMgdmVyc2lvbi4gKHcvIG9yIHcvbyAnd3d3dy4nIHRvbylcbiAgICBpZiAodE9yaWdpbi5zdGFydHNXaXRoKFwiaHR0cDovL1wiKSkge1xuICAgICAgdmFyIHF1ZXJ5RGljdCA9IHt9O1xuICAgICAgbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKS5zcGxpdChcIiZcIikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBxdWVyeURpY3RbaXRlbS5zcGxpdChcIj1cIilbMF1dID0gaXRlbS5zcGxpdChcIj1cIilbMV1cbiAgICAgIH0pO1xuICAgICAgdmFyIHZhbGlkUHJlVVJMUmVnZXggPSAvXmh0dHAoc3wpOlxcL1xcLyh3d3dcXC58KS87XG4gICAgICB0T3JpZ2luID0gdE9yaWdpbi5yZXBsYWNlKHZhbGlkUHJlVVJMUmVnZXgsIHF1ZXJ5RGljdFtcImhvc3RQYWdlUHJvdG9jb2xcIl0pO1xuICAgIH1cblxuICAgIGlmIChyZWNlaXZlcilcbiAgICAgIGNyZWF0b3IucG9zdE1lc3NhZ2UoZGF0YSwgdE9yaWdpbiwgcmVjZWl2ZXIpO1xuICAgIGVsc2VcbiAgICAgIGNyZWF0b3IucG9zdE1lc3NhZ2UoZGF0YSwgdE9yaWdpbik7XG4gIH0sXG5cbiAgX3Byb2Nlc3NfcHVzaGVzOiBmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKVxuICAgICAgT25lU2lnbmFsLnB1c2goYXJyYXlbaV0pO1xuICB9LFxuXG4gIHB1c2g6IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKHR5cGVvZihpdGVtKSA9PSBcImZ1bmN0aW9uXCIpXG4gICAgICBpdGVtKCk7XG4gICAgZWxzZSB7XG4gICAgICB2YXIgZnVuY3Rpb25OYW1lID0gaXRlbS5zaGlmdCgpO1xuICAgICAgT25lU2lnbmFsW2Z1bmN0aW9uTmFtZV0uYXBwbHkobnVsbCwgaXRlbSk7XG4gICAgfVxuICB9XG59O1xuXG5pZiAoT25lU2lnbmFsLl9JU19ERVYpIHtcbiAgT25lU2lnbmFsLkxPR0dJTkcgPSB0cnVlO1xuICBPbmVTaWduYWwuX0hPU1RfVVJMID0gXCJodHRwczovLzE5Mi4xNjguMS4yMDY6MzAwMC9hcGkvdjEvXCI7XG59XG5cbi8vIElmIGltcG9ydGVkIG9uIHlvdXIgcGFnZS5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKVxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgT25lU2lnbmFsLl9saXN0ZW5lcl9yZWNlaXZlTWVzc2FnZSwgZmFsc2UpO1xuZWxzZSB7IC8vIGlmIGltcG9ydGVkIGZyb20gdGhlIHNlcnZpY2Ugd29ya2VyLlxuICBpbXBvcnRTY3JpcHRzKCdodHRwczovL2Nkbi5vbmVzaWduYWwuY29tL3Nka3Mvc2VydmljZXdvcmtlci1jYWNoZS1wb2x5ZmlsbC5qcycpO1xuXG4gIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcigncHVzaCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIE9uZVNpZ25hbC5faGFuZGxlR0NNTWVzc2FnZShzZWxmLCBldmVudCk7XG4gIH0pO1xuICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ25vdGlmaWNhdGlvbmNsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgT25lU2lnbmFsLl9oYW5kbGVOb3RpZmljYXRpb25PcGVuZWQoZXZlbnQpO1xuICB9KTtcblxuICB2YXIgaXNTV29uU3ViZG9tYWluID0gbG9jYXRpb24uaHJlZi5tYXRjaCgvaHR0cHNcXDpcXC9cXC8uKlxcLm9uZXNpZ25hbC5jb21cXC9zZGtzXFwvLykgIT0gbnVsbDtcbiAgaWYgKE9uZVNpZ25hbC5fSVNfREVWKVxuICAgIGlzU1dvblN1YmRvbWFpbiA9IHRydWU7O1xuXG4gIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignaW5zdGFsbCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIE9uZVNpZ25hbC5fbG9nKFwiT25lU2lnbmFsIEluc3RhbGxlZCBzZXJ2aWNlIHdvcmtlcjogXCIgKyBPbmVTaWduYWwuX1ZFUlNJT04pO1xuICAgIGlmIChzZWxmLmxvY2F0aW9uLnBhdGhuYW1lLmluZGV4T2YoXCJPbmVTaWduYWxTREtXb3JrZXIuanNcIikgPiAtMSlcbiAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJXT1JLRVIxX09ORV9TSUdOQUxfU1dfVkVSU0lPTlwiLCBpZDogT25lU2lnbmFsLl9WRVJTSU9OfSk7XG4gICAgZWxzZVxuICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiSWRzXCIsIHt0eXBlOiBcIldPUktFUjJfT05FX1NJR05BTF9TV19WRVJTSU9OXCIsIGlkOiBPbmVTaWduYWwuX1ZFUlNJT059KTtcblxuICAgIGlmIChpc1NXb25TdWJkb21haW4pIHtcbiAgICAgIGV2ZW50LndhaXRVbnRpbChcbiAgICAgICAgY2FjaGVzLm9wZW4oXCJPbmVTaWduYWxfXCIgKyBPbmVTaWduYWwuX1ZFUlNJT04pLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XG4gICAgICAgICAgcmV0dXJuIGNhY2hlLmFkZEFsbChbXG4gICAgICAgICAgICAnL3Nka3MvaW5pdE9uZVNpZ25hbEh0dHBJZnJhbWUnLFxuICAgICAgICAgICAgJy9zZGtzL2luaXRPbmVTaWduYWxIdHRwSWZyYW1lP3Nlc3Npb249KicsXG4gICAgICAgICAgICAnL3Nka3MvbWFuaWZlc3RfanNvbiddKTtcbiAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoaXNTV29uU3ViZG9tYWluKSB7XG4gICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdmZXRjaCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgZXZlbnQucmVzcG9uZFdpdGgoXG4gICAgICAgIGNhY2hlcy5tYXRjaChldmVudC5yZXF1ZXN0KVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgLy8gQ2FjaGUgaGl0IC0gcmV0dXJuIHJlc3BvbnNlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UpXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcblxuICAgICAgICAgICAgcmV0dXJuIGZldGNoKGV2ZW50LnJlcXVlc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgT25lU2lnbmFsLl9lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxufVxuXG5pZiAoX3RlbXBfT25lU2lnbmFsKVxuICBPbmVTaWduYWwuX3Byb2Nlc3NfcHVzaGVzKF90ZW1wX09uZVNpZ25hbCk7XG5cbm1vZHVsZS5leHBvcnRzID0gT25lU2lnbmFsO1xuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc3JjL3Nkay5qc1xuICoqLyIsIi8qXHJcbiogbG9nbGV2ZWwgLSBodHRwczovL2dpdGh1Yi5jb20vcGltdGVycnkvbG9nbGV2ZWxcclxuKlxyXG4qIENvcHlyaWdodCAoYykgMjAxMyBUaW0gUGVycnlcclxuKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXHJcbiovXHJcbihmdW5jdGlvbiAocm9vdCwgZGVmaW5pdGlvbikge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBkZWZpbmUoZGVmaW5pdGlvbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJvb3QubG9nID0gZGVmaW5pdGlvbigpO1xyXG4gICAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgdmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xyXG4gICAgdmFyIHVuZGVmaW5lZFR5cGUgPSBcInVuZGVmaW5lZFwiO1xyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWxNZXRob2QobWV0aG9kTmFtZSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gdW5kZWZpbmVkVHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFdlIGNhbid0IGJ1aWxkIGEgcmVhbCBtZXRob2Qgd2l0aG91dCBhIGNvbnNvbGUgdG8gbG9nIHRvXHJcbiAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlW21ldGhvZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGJpbmRNZXRob2QoY29uc29sZSwgbWV0aG9kTmFtZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlLmxvZyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBiaW5kTWV0aG9kKGNvbnNvbGUsICdsb2cnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gbm9vcDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYmluZE1ldGhvZChvYmosIG1ldGhvZE5hbWUpIHtcclxuICAgICAgICB2YXIgbWV0aG9kID0gb2JqW21ldGhvZE5hbWVdO1xyXG4gICAgICAgIGlmICh0eXBlb2YgbWV0aG9kLmJpbmQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1ldGhvZC5iaW5kKG9iaik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5jYWxsKG1ldGhvZCwgb2JqKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gTWlzc2luZyBiaW5kIHNoaW0gb3IgSUU4ICsgTW9kZXJuaXpyLCBmYWxsYmFjayB0byB3cmFwcGluZ1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuYXBwbHkobWV0aG9kLCBbb2JqLCBhcmd1bWVudHNdKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdGhlc2UgcHJpdmF0ZSBmdW5jdGlvbnMgYWx3YXlzIG5lZWQgYHRoaXNgIHRvIGJlIHNldCBwcm9wZXJseVxyXG5cclxuICAgIGZ1bmN0aW9uIGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXMobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpIHtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09IHVuZGVmaW5lZFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHJlcGxhY2VMb2dnaW5nTWV0aG9kcy5jYWxsKHRoaXMsIGxldmVsLCBsb2dnZXJOYW1lKTtcclxuICAgICAgICAgICAgICAgIHRoaXNbbWV0aG9kTmFtZV0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVwbGFjZUxvZ2dpbmdNZXRob2RzKGxldmVsLCBsb2dnZXJOYW1lKSB7XHJcbiAgICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxvZ01ldGhvZHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSBsb2dNZXRob2RzW2ldO1xyXG4gICAgICAgICAgICB0aGlzW21ldGhvZE5hbWVdID0gKGkgPCBsZXZlbCkgP1xyXG4gICAgICAgICAgICAgICAgbm9vcCA6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1ldGhvZEZhY3RvcnkobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWZhdWx0TWV0aG9kRmFjdG9yeShtZXRob2ROYW1lLCBsZXZlbCwgbG9nZ2VyTmFtZSkge1xyXG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXHJcbiAgICAgICAgcmV0dXJuIHJlYWxNZXRob2QobWV0aG9kTmFtZSkgfHxcclxuICAgICAgICAgICAgICAgZW5hYmxlTG9nZ2luZ1doZW5Db25zb2xlQXJyaXZlcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBsb2dNZXRob2RzID0gW1xyXG4gICAgICAgIFwidHJhY2VcIixcclxuICAgICAgICBcImRlYnVnXCIsXHJcbiAgICAgICAgXCJpbmZvXCIsXHJcbiAgICAgICAgXCJ3YXJuXCIsXHJcbiAgICAgICAgXCJlcnJvclwiXHJcbiAgICBdO1xyXG5cclxuICAgIGZ1bmN0aW9uIExvZ2dlcihuYW1lLCBkZWZhdWx0TGV2ZWwsIGZhY3RvcnkpIHtcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICB2YXIgY3VycmVudExldmVsO1xyXG4gICAgICB2YXIgc3RvcmFnZUtleSA9IFwibG9nbGV2ZWxcIjtcclxuICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICBzdG9yYWdlS2V5ICs9IFwiOlwiICsgbmFtZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbE51bSkge1xyXG4gICAgICAgICAgdmFyIGxldmVsTmFtZSA9IChsb2dNZXRob2RzW2xldmVsTnVtXSB8fCAnc2lsZW50JykudG9VcHBlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAvLyBVc2UgbG9jYWxTdG9yYWdlIGlmIGF2YWlsYWJsZVxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlW3N0b3JhZ2VLZXldID0gbGV2ZWxOYW1lO1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cclxuXHJcbiAgICAgICAgICAvLyBVc2Ugc2Vzc2lvbiBjb29raWUgYXMgZmFsbGJhY2tcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgd2luZG93LmRvY3VtZW50LmNvb2tpZSA9XHJcbiAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RvcmFnZUtleSkgKyBcIj1cIiArIGxldmVsTmFtZSArIFwiO1wiO1xyXG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBnZXRQZXJzaXN0ZWRMZXZlbCgpIHtcclxuICAgICAgICAgIHZhciBzdG9yZWRMZXZlbDtcclxuXHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIHN0b3JlZExldmVsID0gd2luZG93LmxvY2FsU3RvcmFnZVtzdG9yYWdlS2V5XTtcclxuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cclxuXHJcbiAgICAgICAgICBpZiAodHlwZW9mIHN0b3JlZExldmVsID09PSB1bmRlZmluZWRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgdmFyIGNvb2tpZSA9IHdpbmRvdy5kb2N1bWVudC5jb29raWU7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IGNvb2tpZS5pbmRleE9mKFxyXG4gICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9XCIpO1xyXG4gICAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN0b3JlZExldmVsID0gL14oW147XSspLy5leGVjKGNvb2tpZS5zbGljZShsb2NhdGlvbikpWzFdO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIElmIHRoZSBzdG9yZWQgbGV2ZWwgaXMgbm90IHZhbGlkLCB0cmVhdCBpdCBhcyBpZiBub3RoaW5nIHdhcyBzdG9yZWQuXHJcbiAgICAgICAgICBpZiAoc2VsZi5sZXZlbHNbc3RvcmVkTGV2ZWxdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZXR1cm4gc3RvcmVkTGV2ZWw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8qXHJcbiAgICAgICAqXHJcbiAgICAgICAqIFB1YmxpYyBBUElcclxuICAgICAgICpcclxuICAgICAgICovXHJcblxyXG4gICAgICBzZWxmLmxldmVscyA9IHsgXCJUUkFDRVwiOiAwLCBcIkRFQlVHXCI6IDEsIFwiSU5GT1wiOiAyLCBcIldBUk5cIjogMyxcclxuICAgICAgICAgIFwiRVJST1JcIjogNCwgXCJTSUxFTlRcIjogNX07XHJcblxyXG4gICAgICBzZWxmLm1ldGhvZEZhY3RvcnkgPSBmYWN0b3J5IHx8IGRlZmF1bHRNZXRob2RGYWN0b3J5O1xyXG5cclxuICAgICAgc2VsZi5nZXRMZXZlbCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiBjdXJyZW50TGV2ZWw7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBzZWxmLnNldExldmVsID0gZnVuY3Rpb24gKGxldmVsLCBwZXJzaXN0KSB7XHJcbiAgICAgICAgICBpZiAodHlwZW9mIGxldmVsID09PSBcInN0cmluZ1wiICYmIHNlbGYubGV2ZWxzW2xldmVsLnRvVXBwZXJDYXNlKCldICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICBsZXZlbCA9IHNlbGYubGV2ZWxzW2xldmVsLnRvVXBwZXJDYXNlKCldO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJudW1iZXJcIiAmJiBsZXZlbCA+PSAwICYmIGxldmVsIDw9IHNlbGYubGV2ZWxzLlNJTEVOVCkge1xyXG4gICAgICAgICAgICAgIGN1cnJlbnRMZXZlbCA9IGxldmVsO1xyXG4gICAgICAgICAgICAgIGlmIChwZXJzaXN0ICE9PSBmYWxzZSkgeyAgLy8gZGVmYXVsdHMgdG8gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICBwZXJzaXN0TGV2ZWxJZlBvc3NpYmxlKGxldmVsKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzLmNhbGwoc2VsZiwgbGV2ZWwsIG5hbWUpO1xyXG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gdW5kZWZpbmVkVHlwZSAmJiBsZXZlbCA8IHNlbGYubGV2ZWxzLlNJTEVOVCkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gXCJObyBjb25zb2xlIGF2YWlsYWJsZSBmb3IgbG9nZ2luZ1wiO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgXCJsb2cuc2V0TGV2ZWwoKSBjYWxsZWQgd2l0aCBpbnZhbGlkIGxldmVsOiBcIiArIGxldmVsO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VsZi5zZXREZWZhdWx0TGV2ZWwgPSBmdW5jdGlvbiAobGV2ZWwpIHtcclxuICAgICAgICAgIGlmICghZ2V0UGVyc2lzdGVkTGV2ZWwoKSkge1xyXG4gICAgICAgICAgICAgIHNlbGYuc2V0TGV2ZWwobGV2ZWwsIGZhbHNlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHNlbGYuZW5hYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xyXG4gICAgICAgICAgc2VsZi5zZXRMZXZlbChzZWxmLmxldmVscy5UUkFDRSwgcGVyc2lzdCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBzZWxmLmRpc2FibGVBbGwgPSBmdW5jdGlvbihwZXJzaXN0KSB7XHJcbiAgICAgICAgICBzZWxmLnNldExldmVsKHNlbGYubGV2ZWxzLlNJTEVOVCwgcGVyc2lzdCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBJbml0aWFsaXplIHdpdGggdGhlIHJpZ2h0IGxldmVsXHJcbiAgICAgIHZhciBpbml0aWFsTGV2ZWwgPSBnZXRQZXJzaXN0ZWRMZXZlbCgpO1xyXG4gICAgICBpZiAoaW5pdGlhbExldmVsID09IG51bGwpIHtcclxuICAgICAgICAgIGluaXRpYWxMZXZlbCA9IGRlZmF1bHRMZXZlbCA9PSBudWxsID8gXCJXQVJOXCIgOiBkZWZhdWx0TGV2ZWw7XHJcbiAgICAgIH1cclxuICAgICAgc2VsZi5zZXRMZXZlbChpbml0aWFsTGV2ZWwsIGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgICpcclxuICAgICAqIFBhY2thZ2UtbGV2ZWwgQVBJXHJcbiAgICAgKlxyXG4gICAgICovXHJcblxyXG4gICAgdmFyIGRlZmF1bHRMb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XHJcblxyXG4gICAgdmFyIF9sb2dnZXJzQnlOYW1lID0ge307XHJcbiAgICBkZWZhdWx0TG9nZ2VyLmdldExvZ2dlciA9IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiIHx8IG5hbWUgPT09IFwiXCIpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBzdXBwbHkgYSBuYW1lIHdoZW4gY3JlYXRpbmcgYSBsb2dnZXIuXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGxvZ2dlciA9IF9sb2dnZXJzQnlOYW1lW25hbWVdO1xyXG4gICAgICAgIGlmICghbG9nZ2VyKSB7XHJcbiAgICAgICAgICBsb2dnZXIgPSBfbG9nZ2Vyc0J5TmFtZVtuYW1lXSA9IG5ldyBMb2dnZXIoXHJcbiAgICAgICAgICAgIG5hbWUsIGRlZmF1bHRMb2dnZXIuZ2V0TGV2ZWwoKSwgZGVmYXVsdExvZ2dlci5tZXRob2RGYWN0b3J5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxvZ2dlcjtcclxuICAgIH07XHJcblxyXG4gICAgLy8gR3JhYiB0aGUgY3VycmVudCBnbG9iYWwgbG9nIHZhcmlhYmxlIGluIGNhc2Ugb2Ygb3ZlcndyaXRlXHJcbiAgICB2YXIgX2xvZyA9ICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlKSA/IHdpbmRvdy5sb2cgOiB1bmRlZmluZWQ7XHJcbiAgICBkZWZhdWx0TG9nZ2VyLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSAmJlxyXG4gICAgICAgICAgICAgICB3aW5kb3cubG9nID09PSBkZWZhdWx0TG9nZ2VyKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2cgPSBfbG9nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRMb2dnZXI7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xyXG59KSk7XHJcblxuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2xvZ2xldmVsL2xpYi9sb2dsZXZlbC5qc1xuICoqIG1vZHVsZSBpZCA9IDJcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsW1wiT25lU2lnbmFsXCJdID0gcmVxdWlyZShcIi0hL1VzZXJzL2pwYW5nL2NvZGUvT25lU2lnbmFsLVdlYnNpdGUtU0RLL25vZGVfbW9kdWxlcy9iYWJlbC1sb2FkZXIvaW5kZXguanM/e1xcXCJwcmVzZXRzXFxcIjpbXFxcImVzMjAxNVxcXCJdLFxcXCJjYWNoZURpcmVjdG9yeVxcXCI6dHJ1ZX0hL1VzZXJzL2pwYW5nL2NvZGUvT25lU2lnbmFsLVdlYnNpdGUtU0RLL3NyYy9zZGsuanNcIik7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vZXhwb3NlLWxvYWRlcj9PbmVTaWduYWwhLi9zcmMvc2RrLmpzXG4gKiogbW9kdWxlIGlkID0gM1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==