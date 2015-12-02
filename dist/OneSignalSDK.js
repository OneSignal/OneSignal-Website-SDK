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

	"use strict";
	
	__webpack_require__(1);
	
	__webpack_require__(5);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _loglevel = __webpack_require__(2);
	
	var _loglevel2 = _interopRequireDefault(_loglevel);
	
	var _limitStore = __webpack_require__(3);
	
	var _limitStore2 = _interopRequireDefault(_limitStore);
	
	__webpack_require__(4);
	
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
	
	// Requires Chrome 42+, Safari 7+, or Firefox 44+
	// Web push notifications are supported on Mac OSX, Windows, Linux, and Android.
	var _temp_OneSignal = null;
	
	if (typeof OneSignal !== "undefined") _temp_OneSignal = OneSignal;
	
	var OneSignal = {
	  _VERSION: 109000,
	  _HOST_URL:  true ? ("https://192.168.1.206:3000") + '/api/v1/' : "https://onesignal.com/api/v1/",
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
	  SERVICE_WORKER_UPDATER_PATH: "OneSignalSDKUpdaterWorker.js",
	  SERVICE_WORKER_PATH: "OneSignalSDKWorker.js",
	  SERVICE_WORKER_PARAM: {},
	
	  _ensureDbInstance: function _ensureDbInstance() {
	    return new Promise(function (resolve, reject) {
	      if (OneSignal._oneSignal_db) {
	        resolve(OneSignal._oneSignal_db);
	      } else {
	        var request = indexedDB.open("ONE_SIGNAL_SDK_DB", 1);
	        request.onsuccess = function (event) {
	          var database = event.target.result;
	          OneSignal._oneSignal_db = database;
	          _loglevel2.default.debug('Succesfully opened IndexedDB.');
	          resolve(database);
	        };
	        request.onerror = function (event) {
	          _loglevel2.default.error('Unable to open IndexedDB.', event);
	          reject(event);
	        };
	
	        request.onupgradeneeded = function (event) {
	          _loglevel2.default.debug('Rebuilding schema in IndexedDB...');
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
	        _loglevel2.default.error(e.stack);
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
	        _loglevel2.default.error(e.stack);
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
	        _loglevel2.default.error(e.stack);
	      });
	    });
	  },
	
	  _deleteDbValue: function _deleteDbValue(table, key) {
	    return new Promise(function (resolve, reject) {
	      OneSignal._ensureDbInstance().then(function (database) {
	        database.transaction([table], "readwrite").objectStore(table).delete(key);
	        resolve(key);
	      }).catch(function (e) {
	        _loglevel2.default.error(e.stack);
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
	      if (callback != null) callback(jsonData);
	    }).catch(function (e) {
	      _loglevel2.default.error('OneSignal._sendToOneSignalApi() failed:', e);
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
	        _loglevel2.default.error(e.stack);
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
	              _loglevel2.default.debug("Sending player Id and registrationId back to host page");
	              _loglevel2.default.debug(OneSignal._initOptions);
	              var creator = opener || parent;
	              OneSignal._safePostMessage(creator, {
	                idsAvailable: {
	                  userId: userId,
	                  registrationId: registrationId
	                }
	              }, OneSignal._initOptions.origin, null);
	
	              if (opener) window.close();
	            }
	          });
	        });
	      });
	    }).catch(function (e) {
	      _loglevel2.default.error(e.stack);
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
	    _loglevel2.default.debug('Event onesignal.prompt.native.permissionchanged:', event.detail);
	    OneSignal._checkTrigger_eventSubscriptionChanged();
	  },
	
	  _onSubscriptionChanged: function _onSubscriptionChanged(event) {
	    _loglevel2.default.debug('Event onesignal.subscription.changed:', event.detail);
	  },
	
	  _onDbValueRetrieved: function _onDbValueRetrieved(event) {
	    _loglevel2.default.debug('Event onesignal.db.retrieved:', event.detail);
	  },
	
	  _onDbValueSet: function _onDbValueSet(event) {
	    _loglevel2.default.debug('Event onesignal.db.valueset:', event.detail);
	    var info = event.detail;
	    if (info.type === 'userId') {
	      _limitStore2.default.put('db.ids.userId', info.id);
	      OneSignal._checkTrigger_eventSubscriptionChanged();
	    }
	  },
	
	  _onInternalSubscriptionSet: function _onInternalSubscriptionSet(event) {
	    _loglevel2.default.debug('Event onesignal.internal.subscriptionset:', event.detail);
	    var newSubscriptionValue = event.detail;
	    _limitStore2.default.put('subscription.value', newSubscriptionValue);
	    OneSignal._checkTrigger_eventSubscriptionChanged();
	  },
	
	  _checkTrigger_eventSubscriptionChanged: function _checkTrigger_eventSubscriptionChanged() {
	    var permissions = _limitStore2.default.get('notification.permission');
	    var lastPermission = permissions[permissions.length - 2];
	    var currentPermission = permissions[permissions.length - 1];
	
	    var ids = _limitStore2.default.get('db.ids.userId');
	    var lastId = ids[ids.length - 2];
	    var currentId = ids[ids.length - 1];
	
	    var subscriptionStates = _limitStore2.default.get('subscription.value');
	    var lastSubscriptionState = subscriptionStates[subscriptionStates.length - 2];
	    var currentSubscriptionState = subscriptionStates[subscriptionStates.length - 1];
	
	    var newSubscriptionState = 'unchanged';
	
	    if ((lastPermission === 'default' || lastPermission === 'denied' || lastPermission === null) && currentPermission === 'granted' && currentId !== null && currentSubscriptionState === true || lastSubscriptionState === false && currentSubscriptionState === true && currentId != null && currentPermission === 'granted') {
	      newSubscriptionState = true;
	    }
	
	    if (lastPermission !== 'denied' && currentPermission === 'denied' || lastPermission === 'granted' && currentPermission !== 'granted' || lastId !== null && currentId === null || lastSubscriptionState !== false && currentSubscriptionState === false) {
	      newSubscriptionState = false;
	    }
	
	    if (newSubscriptionState !== "unchanged") {
	      var lastTriggerTimes = _limitStore2.default.put('event.subscriptionchanged.lastriggered', Date.now());
	      var currentTime = lastTriggerTimes[lastTriggerTimes.length - 1];
	      var lastTriggerTime = lastTriggerTimes[lastTriggerTimes.length - 2];
	      var elapsedTimeSeconds = (currentTime - lastTriggerTime) / 1000;
	
	      var lastEventStates = _limitStore2.default.put('event.subscriptionchanged.laststates', newSubscriptionState);
	      var currentState = lastEventStates[lastEventStates.length - 1];
	      var lastState = lastEventStates[lastEventStates.length - 2];
	
	      // If event already triggered within the last second, don't re-trigger.
	      var shouldNotTriggerEvent = lastTriggerTime != null && elapsedTimeSeconds <= 1 || currentState === lastState;
	      if (shouldNotTriggerEvent === false) {
	        OneSignal._triggerEvent_subscriptionChanged(newSubscriptionState);
	      }
	    }
	  },
	
	  init: function init(options) {
	    OneSignal._initOptions = options;
	
	    if (OneSignal.LOGGING) _loglevel2.default.enableAll();else _loglevel2.default.disableAll();
	
	    _loglevel2.default.info('OneSignal Web SDK loaded (version ' + OneSignal._VERSION + ').');
	    if (!OneSignal.isPushNotificationsSupported()) {
	      _loglevel2.default.warn("Your browser does not support push notifications.");
	      return;
	    }
	
	    if (navigator.permissions && !(OneSignal._isBrowserFirefox() && OneSignal._getFirefoxVersion() <= 45)) {
	      _loglevel2.default.info("Using browser's native PermissionStatus.onChange() to hook permission change event.");
	      OneSignal._usingNativePermissionHook = true;
	      var currentNotificationPermission = OneSignal._getNotificationPermission();
	      _limitStore2.default.put('notification.permission', currentNotificationPermission);
	      // If the browser natively supports hooking the subscription prompt permission change event
	      //     use it instead of our SDK method
	      navigator.permissions.query({ name: 'notifications' }).then(function (permissionStatus) {
	        permissionStatus.onchange = function () {
	          var recentPermissions = _limitStore2.default.put('notification.permission', this.state);
	          var permissionBeforePrompt = recentPermissions[0];
	          var permissionsAfterPrompt = recentPermissions[1];
	          OneSignal._triggerEvent_nativePromptPermissionChanged(permissionBeforePrompt, permissionsAfterPrompt);
	        };
	      }).catch(function (e) {
	        _loglevel2.default.error(e.stack);
	      });
	    } else {
	      var currentNotificationPermission = OneSignal._getNotificationPermission();
	      _limitStore2.default.put('notification.permission', currentNotificationPermission);
	    }
	
	    // Store the current value of Ids:registrationId, so that we can see if the value changes in the future
	    OneSignal._getDbValue('Ids', 'userId').then(function (result) {
	      var storeValue = result ? result.id : null;
	      _limitStore2.default.put('db.ids.userId', storeValue);
	    });
	
	    // Store the current value of subscription, so that we can see if the value changes in the future
	    OneSignal._getSubscription(function (currentSubscription) {
	      _limitStore2.default.put('subscription.value', currentSubscription);
	    });
	
	    window.addEventListener('onesignal.prompt.native.permissionchanged', OneSignal.onNativePromptChanged);
	    window.addEventListener('onesignal.subscription.changed', OneSignal._onSubscriptionChanged);
	    window.addEventListener('onesignal.db.valueretrieved', OneSignal._onDbValueRetrieved);
	    window.addEventListener('onesignal.db.valueset', OneSignal._onDbValueSet);
	    window.addEventListener('onesignal.db.valueset', OneSignal._onDbValueSet);
	    window.addEventListener('onesignal.internal.subscriptionset', OneSignal._onInternalSubscriptionSet);
	
	    OneSignal._useHttpMode = !OneSignal._isSupportedSafari() && (!OneSignal._supportsDirectPermission() || OneSignal._initOptions.subdomainName);
	
	    if (OneSignal._useHttpMode) OneSignal._initOneSignalHttp = 'https://' + OneSignal._initOptions.subdomainName + '.onesignal.com/sdks/initOneSignalHttp';else OneSignal._initOneSignalHttp = 'https://onesignal.com/sdks/initOneSignalHttps';
	
	    if (true) OneSignal._initOneSignalHttp = ("https://192.168.1.206:3000") + '/dev_sdks/initOneSignalHttp';
	
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
	      _loglevel2.default.error(e.stack);
	    });
	  },
	
	  registerForPushNotifications: function registerForPushNotifications(options) {
	    if (!OneSignal.isPushNotificationsSupported()) {
	      _loglevel2.default.warn("Your browser does not support push notifications.");
	      return;
	    }
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
	      _loglevel2.default.debug("ERROR:_initHttp: No opener or parent found!");
	      return;
	    }
	    // Setting up message channel to receive message from host page.
	    var messageChannel = new MessageChannel();
	    messageChannel.port1.onmessage = function (event) {
	      _loglevel2.default.debug("_initHttp.messageChannel.port1.onmessage", event);
	
	      if (event.data.initOptions) {
	        OneSignal.setDefaultNotificationUrl(event.data.initOptions.defaultUrl);
	        OneSignal.setDefaultTitle(event.data.initOptions.defaultTitle);
	        if (event.data.initOptions.defaultIcon) OneSignal.setDefaultIcon(event.data.initOptions.defaultIcon);
	
	        _loglevel2.default.debug("document.URL", event.data.initOptions.parent_url);
	        OneSignal._getDbValue("NotificationOpened", event.data.initOptions.parent_url).then(function registerForPushNotifications_GotNotificationOpened(notificationOpenedResult) {
	          _loglevel2.default.debug("_initHttp NotificationOpened db", notificationOpenedResult);
	          if (notificationOpenedResult) {
	            OneSignal._deleteDbValue("NotificationOpened", event.data.initOptions.parent_url);
	            _loglevel2.default.debug("OneSignal._safePostMessage:targetOrigin:", OneSignal._initOptions.origin);
	
	            OneSignal._safePostMessage(creator, { openedNotification: notificationOpenedResult.data }, OneSignal._initOptions.origin, null);
	          }
	        }).catch(function (e) {
	          _loglevel2.default.error(e.stack);
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
	        _loglevel2.default.debug("Before navigator.serviceWorker.register");
	        navigator.serviceWorker.register(OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	        _loglevel2.default.debug("After navigator.serviceWorker.register");
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
	      _loglevel2.default.error(e.stack);
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
	    _loglevel2.default.debug("Called OneSignal._sessionInit():", options);
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
	
	        _loglevel2.default.debug('Opening popup window.');
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
	        _loglevel2.default.debug('Opening iFrame.');
	        OneSignal._addSessionIframe(hostPageProtocol);
	      }
	
	      return;
	    }
	
	    if (OneSignal._isSupportedSafari()) {
	      if (OneSignal._initOptions.safari_web_id) {
	        var notificationPermissionBeforeRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
	        window.safari.pushNotification.requestPermission(OneSignal._HOST_URL + 'safari', OneSignal._initOptions.safari_web_id, { app_id: OneSignal._app_id }, function (data) {
	          _loglevel2.default.debug(data);
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
	        _loglevel2.default.warn('An attempt was made to open the HTTPS modal permission prompt, but push notifications are not supported on this browser. Opening canceled.');
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
	
	        _loglevel2.default.debug('Opening HTTPS modal prompt.');
	        document.getElementById("notif-permission").appendChild(iframeNode);
	      });
	    } else if ('serviceWorker' in navigator) // If HTTPS - Show native prompt
	      OneSignal._registerForW3CPush(options);else _loglevel2.default.debug('Service workers are not supported in this browser.');
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
	                        _loglevel2.default.error(e);
	                      });
	                      ;
	                    } else navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                  } else navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	                }).catch(function (e) {
	                  _loglevel2.default.error(e);
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
	                  _loglevel2.default.error(e);
	                });
	                ;
	              }
	            } else if (event.installing == null) navigator.serviceWorker.register(sw_path + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM).then(OneSignal._enableNotifications, OneSignal._registerError);
	          }
	        }).catch(function (e) {
	          _loglevel2.default.error(e);
	        });
	      }
	    }).catch(function (e) {
	      _loglevel2.default.error(e);
	    });
	    ;
	  },
	
	  _addSessionIframe: function _addSessionIframe(hostPageProtocol) {
	
	    var node = document.createElement("iframe");
	    node.style.display = "none";
	    node.src = OneSignal._initOneSignalHttp + "Iframe";
	    if (sessionStorage.getItem("ONE_SIGNAL_SESSION")) node.src += "?session=true" + "&hostPageProtocol=" + hostPageProtocol;else node.src += "?hostPageProtocol=" + hostPageProtocol;
	    document.body.appendChild(node);
	    _loglevel2.default.debug('Adding session iFrame.');
	
	    OneSignal._sessionIframeAdded = true;
	  },
	
	  _registerError: function _registerError(err) {
	    _loglevel2.default.debug("navigator.serviceWorker.register:ERROR: " + err);
	  },
	
	  _enableNotifications: function _enableNotifications(existingServiceWorkerRegistration) {
	    // is ServiceWorkerRegistration type
	    if (!('PushManager' in window)) {
	      _loglevel2.default.debug("Push messaging is not supported. No PushManager.");
	      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
	      return;
	    }
	
	    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
	      _loglevel2.default.debug("Notifications are not supported. showNotification not available in ServiceWorkerRegistration.");
	      sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
	      return;
	    }
	
	    if (Notification.permission === 'denied') {
	      _loglevel2.default.warn("The user has disabled notifications.");
	      return;
	    }
	
	    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
	      _loglevel2.default.info('Service worker active:', serviceWorkerRegistration);
	
	      OneSignal._subscribeForPush(serviceWorkerRegistration);
	    }).catch(function (e) {
	      _loglevel2.default.error(e);
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
	      _loglevel2.default.debug('Skipping triggering of event:', eventName, 'because we are running in a ServiceWorker context.');
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
	    var notificationPermissionBeforeRequest = OneSignal._getNotificationPermission(OneSignal._initOptions.safari_web_id);
	    serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true }).then(function (subscription) {
	      sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", Notification.permission);
	
	      OneSignal._getDbValue('Ids', 'appId').then(function _subscribeForPush_GotAppId(appIdResult) {
	        var appId = appIdResult.id;
	        _loglevel2.default.debug("Called OneSignal._subscribeForPush() -> serviceWorkerRegistration.pushManager.subscribe().");
	
	        var registrationId = null;
	        if (subscription) {
	          if (typeof subscription.subscriptionId != "undefined") // Chrome 43 & 42
	            registrationId = subscription.subscriptionId;else // Chrome 44+ and FireFox
	            registrationId = subscription.endpoint.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
	        } else _loglevel2.default.warn('Could not subscribe your browser for push notifications.');
	
	        OneSignal._registerWithOneSignal(appId, registrationId, OneSignal._isSupportedFireFox() ? 8 : 5);
	
	        if (!OneSignal._usingNativePermissionHook) OneSignal._triggerEvent_nativePromptPermissionChanged(notificationPermissionBeforeRequest);
	      }).catch(function (e) {
	        _loglevel2.default.error(e);
	      });
	    }).catch(function (e) {
	      _loglevel2.default.error('Error while subscribing for push:', e);
	
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
	      _loglevel2.default.error('sendTags:', e);
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
	      _loglevel2.default.error(e);
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
	      _loglevel2.default.error(e);
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
	      _loglevel2.default.error(e);
	    });
	  },
	
	  // Displays notification from content received from OneSignal.
	  _handleGCMMessage: function _handleGCMMessage(serviceWorker, event) {
	    // TODO: Read data from the GCM payload when Chrome no longer requires the below command line parameter.
	    // --enable-push-message-payload
	    // The command line param is required even on Chrome 43 nightly build 2015/03/17.
	    if (event.data && event.data.text()[0] == "{") {
	      _loglevel2.default.debug('Received data.text: ', event.data.text());
	      _loglevel2.default.debug('Received data.json: ', event.data.json());
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
	              _loglevel2.default.error(e);
	            });
	
	            OneSignal._getDbValue('Options', 'defaultUrl').then(function (defaultUrlResult) {
	              if (defaultUrlResult) OneSignal._defaultLaunchURL = defaultUrlResult.value;
	            }).catch(function (e) {
	              _loglevel2.default.error(e);
	            });
	            ;
	          }, resolve);
	        }).catch(function (e) {
	          _loglevel2.default.error(e);
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
	          _loglevel2.default.debug("Error: could not get notificationId");
	          completeCallback();
	        }
	    }).catch(function (e) {
	      _loglevel2.default.error(e);
	    });
	    ;
	  },
	
	  // HTTP & HTTPS - Runs on main page
	  _listener_receiveMessage: function receiveMessage(event) {
	    _loglevel2.default.debug("_listener_receiveMessage: ", event);
	
	    if (OneSignal._initOptions == undefined) return;
	
	    if (false) return;
	
	    if (event.data.oneSignalInitPageReady) {
	      // Only called on HTTP pages.
	      OneSignal._getDbValues("Options").then(function _listener_receiveMessage(options) {
	        _loglevel2.default.debug("current options", options);
	        if (!options.defaultUrl) options.defaultUrl = document.URL;
	        if (!options.defaultTitle) options.defaultTitle = document.title;
	
	        options.parent_url = document.URL;
	        _loglevel2.default.debug("Posting message to port[0]", event.ports[0]);
	        event.ports[0].postMessage({ initOptions: options });
	      }).catch(function (e) {
	        _loglevel2.default.error('_listener_receiveMessage:', e);
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
	        _loglevel2.default.error(e);
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
	      _loglevel2.default.error(e);
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
	      _loglevel2.default.error(e);
	    });
	    ;
	  },
	
	  isPushNotificationsEnabled: function isPushNotificationsEnabled(callback) {
	    if (!OneSignal.isPushNotificationsSupported()) {
	      _loglevel2.default.warn("Your browser does not support push notifications.");
	      return;
	    }
	
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
	      _loglevel2.default.error(e);
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
	    var chromeVersion = navigator.appVersion.match(/Chrome\/(.*?) /);
	
	    if (OneSignal._isSupportedFireFox()) return true;
	
	    if (OneSignal._isSupportedSafari()) return true;
	
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
	            _loglevel2.default.error(e);
	          });
	        }
	      });
	    }
	  },
	
	  _getSubscription: function _getSubscription(callback) {
	    OneSignal._getDbValue('Options', 'subscription').then(function (subscriptionResult) {
	      callback(!(subscriptionResult && subscriptionResult.value == false));
	    }).catch(function (e) {
	      _loglevel2.default.error(e);
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
	
	if (true) {
	  OneSignal._HOST_URL = ("https://192.168.1.206:3000") + "/api/v1/";
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
	  if (true) isSWonSubdomain = true;
	
	  self.addEventListener('install', function (event) {
	    _loglevel2.default.debug("OneSignal Installed service worker: " + OneSignal._VERSION);
	    if (self.location.pathname.indexOf("OneSignalSDKWorker.js") > -1) OneSignal._putDbValue("Ids", { type: "WORKER1_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION });else OneSignal._putDbValue("Ids", { type: "WORKER2_ONE_SIGNAL_SW_VERSION", id: OneSignal._VERSION });
	
	    if (isSWonSubdomain) {
	      event.waitUntil(caches.open("OneSignal_" + OneSignal._VERSION).then(function (cache) {
	        return cache.addAll(['/sdks/initOneSignalHttpIframe', '/sdks/initOneSignalHttpIframe?session=*', '/sdks/manifest_json']);
	      }).catch(function (e) {
	        _loglevel2.default.error(e);
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
	        _loglevel2.default.error(e);
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
/***/ function(module, exports) {

	"use strict";
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
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
	
	exports.default = LimitStore;

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";
	
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

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {module.exports = global["OneSignal"] = __webpack_require__(1);
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }
/******/ ]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgYmQxMjdmZWEwODZhNGQxNDJiZTUiLCJ3ZWJwYWNrOi8vLy4vc3JjL2VudHJ5LmpzIiwid2VicGFjazovLy8uL3NyYy9zZGsuanMiLCJ3ZWJwYWNrOi8vLy4vfi9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2xpbWl0U3RvcmUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2V2ZW50cy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvc2RrLmpzP2RmYjAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHVCQUFlO0FBQ2Y7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7O0FDcENBLG9CQUFPLENBQUMsQ0FBMkIsQ0FBQyxDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDK0JwQyxLQUFJLGVBQWUsR0FBRyxJQUFJLENBQUM7O0FBRTNCLEtBQUksT0FBTyxTQUFTLEtBQUssV0FBVyxFQUNsQyxlQUFlLEdBQUcsU0FBUyxDQUFDOztBQUU5QixLQUFJLFNBQVMsR0FBRztBQUNkLFdBQVEsRUFBRSxNQUFNO0FBQ2hCLFlBQVMsRUFBRSxLQUFPLEdBQUcsOEJBQVksR0FBRyxVQUFVLEdBQUcsK0JBQStCO0FBQ2hGLFVBQU8sRUFBRSxJQUFJO0FBQ2Isd0JBQXFCLEVBQUUsSUFBSTtBQUMzQiwrQkFBNEIsRUFBRSxJQUFJO0FBQ2xDLHlCQUFzQixFQUFFLEVBQUU7QUFDMUIsb0JBQWlCLEVBQUUsSUFBSTtBQUN2QixlQUFZLEVBQUUsSUFBSTtBQUNsQixvQkFBaUIsRUFBRSxLQUFLO0FBQ3hCLGtCQUFlLEVBQUUsSUFBSTtBQUNyQixpQ0FBOEIsRUFBRSxJQUFJO0FBQ3BDLG1CQUFnQixFQUFFLElBQUk7QUFDdEIscUJBQWtCLEVBQUUsSUFBSTtBQUN4QixzQkFBbUIsRUFBRSxLQUFLO0FBQzFCLGVBQVksRUFBRSxJQUFJO0FBQ2xCLGVBQVksRUFBRSxHQUFHO0FBQ2pCLGdCQUFhLEVBQUUsR0FBRztBQUNsQixVQUFPLEVBQUUsS0FBSztBQUNkLDhCQUEyQixFQUFFLDhCQUE4QjtBQUMzRCxzQkFBbUIsRUFBRSx1QkFBdUI7QUFDNUMsdUJBQW9CLEVBQUUsRUFBRTs7QUFFeEIsb0JBQWlCLEVBQUUsNkJBQVk7QUFDN0IsWUFBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDNUMsV0FBSSxTQUFTLENBQUMsYUFBYSxFQUFFO0FBQzNCLGdCQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xDLE1BQ0k7QUFDSCxhQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3JELGdCQUFPLENBQUMsU0FBUyxHQUFHLFVBQVUsS0FBSyxFQUFFO0FBQ25DLGVBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ25DLG9CQUFTLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQztBQUNuQyw4QkFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztBQUMzQyxrQkFBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1VBQ25CLENBQUM7QUFDRixnQkFBTyxDQUFDLE9BQU8sR0FBRyxVQUFVLEtBQUssRUFBRTtBQUNqQyw4QkFBSSxLQUFLLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDOUMsaUJBQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztVQUNmLENBQUM7O0FBRUYsZ0JBQU8sQ0FBQyxlQUFlLEdBQUcsVUFBVSxLQUFLLEVBQUU7QUFDekMsOEJBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDL0MsZUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDN0IsYUFBRSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO0FBQy9DLGFBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0FBQzdELGFBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztVQUNuRCxDQUFDO1FBQ0g7TUFDRixDQUFDLENBQUM7SUFDSjs7QUFFRCxjQUFXLEVBQUUscUJBQVUsS0FBSyxFQUFFLEdBQUcsRUFBRTtBQUNqQyxZQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUM1QyxnQkFBUyxDQUFDLGlCQUFpQixFQUFFLENBQzFCLElBQUksQ0FBQyxVQUFVLFFBQVEsRUFBRTtBQUN4QixhQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdEUsZ0JBQU8sQ0FBQyxTQUFTLEdBQUcsVUFBVSxLQUFLLEVBQUU7QUFDbkMsZUFBSSxPQUFPLENBQUMsTUFBTSxFQUNoQixTQUFTLENBQUMsOEJBQThCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNELGtCQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1VBQ3pCLENBQUM7QUFDRixnQkFBTyxDQUFDLE9BQU8sR0FBRyxVQUFVLEtBQUssRUFBRTtBQUNqQyxpQkFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztVQUMzQixDQUFDO1FBQ0gsQ0FBQyxDQUNELEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiw0QkFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLENBQUMsQ0FBQztBQUNMLFFBQUM7TUFDRixDQUFDLENBQUM7SUFDSjs7QUFFRCxlQUFZLEVBQUUsc0JBQVUsS0FBSyxFQUFFO0FBQzdCLFlBQU8sSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQzVDLGdCQUFTLENBQUMsaUJBQWlCLEVBQUUsQ0FDMUIsSUFBSSxDQUFDLFVBQVUsUUFBUSxFQUFFO0FBQ3hCLGFBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztBQUNwQixhQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUN6RSxlQUFNLENBQUMsU0FBUyxHQUFHLFVBQVUsS0FBSyxFQUFFO0FBQ2xDLGVBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ2pDLGVBQUksTUFBTSxFQUFFO0FBQ1Ysc0JBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqRCx1QkFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztBQUM1QyxtQkFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLE1BRUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1VBQ3ZCLENBQUM7QUFDRixlQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsS0FBSyxFQUFFO0FBQ2hDLGlCQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1VBQzFCLENBQUM7UUFDSCxDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDRCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsQ0FBQyxDQUFDO01BQ04sQ0FBQyxDQUFDO0lBQ0o7O0FBRUQsY0FBVyxFQUFFLHFCQUFVLEtBQUssRUFBRSxLQUFLLEVBQUU7QUFDbkMsWUFBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDNUMsZ0JBQVMsQ0FBQyxpQkFBaUIsRUFBRSxDQUMxQixJQUFJLENBQUMsVUFBVSxRQUFRLEVBQUU7QUFDeEIsaUJBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pFLGtCQUFTLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUMsZ0JBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDRCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsQ0FBQyxDQUFDO01BQ04sQ0FBQyxDQUFDO0lBQ0o7O0FBRUQsaUJBQWMsRUFBRSx3QkFBVSxLQUFLLEVBQUUsR0FBRyxFQUFFO0FBQ3BDLFlBQU8sSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQzVDLGdCQUFTLENBQUMsaUJBQWlCLEVBQUUsQ0FDMUIsSUFBSSxDQUFDLFVBQVUsUUFBUSxFQUFFO0FBQ3hCLGlCQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxRSxnQkFBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUNELEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiw0QkFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLENBQUMsQ0FBQztBQUNMLFFBQUM7TUFDRixDQUFDLENBQUM7SUFDSjs7QUFFRCxzQkFBbUIsRUFBRSw2QkFBVSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFO0FBQzVFLFNBQUksUUFBUSxHQUFHO0FBQ2IsYUFBTSxFQUFFLE1BQU07TUFFZixDQUFDOzs7QUFFRixTQUFJLE1BQU0sRUFBRTtBQUNWLGVBQVEsQ0FBQyxPQUFPLEdBQUcsRUFBQyxjQUFjLEVBQUUsZ0NBQWdDLEVBQUMsQ0FBQztBQUN0RSxlQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7TUFDeEM7O0FBRUQsVUFBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUN2QyxJQUFJLENBQUMsU0FBUyxNQUFNLENBQUMsUUFBUSxFQUFFO0FBQzlCLFdBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQ2pELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUVqQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7TUFDekQsQ0FBQyxDQUNELElBQUksQ0FBQyxTQUFTLE1BQU0sQ0FBQyxRQUFRLEVBQUU7QUFDOUIsY0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7TUFDeEIsQ0FBQyxDQUNELElBQUksQ0FBQyxVQUFVLFFBQVEsRUFBRTtBQUN4QixXQUFJLFFBQVEsSUFBSSxJQUFJLEVBQ2xCLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztNQUN0QixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyx5Q0FBeUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN4RCxXQUFJLGNBQWMsSUFBSSxJQUFJLEVBQ3hCLGNBQWMsRUFBRSxDQUFDO01BQ3BCLENBQUMsQ0FBQztJQUNOOztBQUVELGVBQVksRUFBRSx3QkFBWTtBQUN4QixZQUFPLFNBQVMsQ0FBQyxRQUFRLEdBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsUUFBUSxHQUFJLElBQUksQ0FBQztJQUM5SDs7QUFFRCxlQUFZLEVBQUUsc0JBQVUsS0FBSyxFQUFFLFFBQVEsRUFBRTtBQUN2QyxTQUFJLEtBQUssRUFDUCxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQ1o7QUFDSCxnQkFBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQ25DLElBQUksQ0FBQyxTQUFTLHNCQUFzQixDQUFDLE1BQU0sRUFBRTtBQUM1QyxhQUFJLE1BQU0sRUFDUixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBRXBCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDRCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsQ0FBQyxDQUFDO0FBQ0wsUUFBQztNQUNGO0lBQ0Y7O0FBRUQsa0JBQWUsRUFBRSwyQkFBWTtBQUMzQixTQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQzlDLE9BQU8sUUFBUSxDQUFDO0FBQ2xCLFNBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFDckQsT0FBTyxRQUFRLENBQUM7QUFDbEIsU0FBSSxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxFQUM5RCxPQUFPLFNBQVMsQ0FBQzs7QUFFbkIsWUFBTyxFQUFFLENBQUM7SUFDWDs7QUFFRCx5QkFBc0IsRUFBRSxnQ0FBVSxLQUFLLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRTs7QUFFbkUsY0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQ25DLElBQUksQ0FBQyxTQUFTLGdDQUFnQyxDQUFDLFlBQVksRUFBRTtBQUM1RCxnQkFBUyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsV0FBVyxFQUFFO0FBQ3JELGFBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQzs7QUFFM0IsYUFBSSxRQUFRLEdBQUc7QUFDYixpQkFBTSxFQUFFLEtBQUs7QUFDYixzQkFBVyxFQUFFLFVBQVU7QUFDdkIsbUJBQVEsRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFO0FBQ2xDLG1CQUFRLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsRUFBRTtBQUM5Qyx1QkFBWSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUU7QUFDcEUsb0JBQVMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNqTCxjQUFHLEVBQUUsU0FBUyxDQUFDLFFBQVE7VUFDeEIsQ0FBQzs7QUFFRixhQUFJLFlBQVksRUFBRTtBQUNoQixxQkFBVSxHQUFHLFVBQVUsR0FBRyxZQUFZLENBQUMsRUFBRSxHQUFHLGFBQWEsQ0FBQztBQUMxRCxtQkFBUSxDQUFDLGtCQUFrQixHQUFHLFdBQVc7VUFDMUMsTUFDSSxJQUFJLFdBQVcsSUFBSSxDQUFDLEVBQ3ZCLFFBQVEsQ0FBQyxrQkFBa0IsR0FBRyxXQUFXOztBQUUzQyxhQUFJLGNBQWMsRUFBRTtBQUNsQixtQkFBUSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUM7QUFDckMsb0JBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUMsQ0FBQyxDQUFDO1VBQzVFOztBQUVELGtCQUFTLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQ3hELFNBQVMsa0JBQWtCLENBQUMsWUFBWSxFQUFFO0FBQ3hDLHlCQUFjLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDOztBQUVuRCxlQUFJLFlBQVksQ0FBQyxFQUFFLEVBQUU7QUFDbkIsc0JBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7QUFDcEUsc0JBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM3Qjs7QUFFRCxvQkFBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLFVBQVUsTUFBTSxFQUFFO0FBQ3hELGlCQUFJLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQy9DLHNCQUFPLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQ2xELHFCQUFJLGFBQWEsR0FBRyxTQUFTLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDM0QsOEJBQWEsQ0FBQyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBQyxDQUFDLENBQUM7Z0JBQ2pFO2NBQ0Y7O0FBRUQsaUJBQUksU0FBUyxDQUFDLGlCQUFpQixFQUFFO0FBQy9CLGtDQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0FBQ3BFLGtDQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDbEMsbUJBQUksT0FBTyxHQUFHLE1BQU0sSUFBSSxNQUFNLENBQUM7QUFDL0Isd0JBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7QUFDbEMsNkJBQVksRUFBRTtBQUNaLHlCQUFNLEVBQUUsTUFBTTtBQUNkLGlDQUFjLEVBQUUsY0FBYztrQkFDL0I7Z0JBQ0YsRUFBRSxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzs7QUFFeEMsbUJBQUksTUFBTSxFQUNSLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztjQUNsQjtZQUNGLENBQUMsQ0FBQztVQUNKLENBQ0YsQ0FBQztRQUVILENBQUMsQ0FBQztNQUNKLENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsMEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztNQUNwQixDQUFDLENBQUM7QUFDTCxNQUFDO0lBQ0Y7O0FBRUQsa0JBQWUsRUFBRSwyQkFBWTtBQUMzQixTQUFJLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRTtBQUNuQyxnQkFBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNwRCxnQkFBUyxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQztNQUN4QztJQUNGOztBQUVELDRCQUF5QixFQUFFLG1DQUFVLEdBQUcsRUFBRTtBQUN4QyxjQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7SUFDbkU7O0FBRUQsaUJBQWMsRUFBRSx3QkFBVSxJQUFJLEVBQUU7QUFDOUIsY0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0lBQ3JFOztBQUVELGtCQUFlLEVBQUUseUJBQVUsS0FBSyxFQUFFO0FBQ2hDLGNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztJQUN2RTs7QUFFRCxvQkFBaUIsRUFBRSw2QkFBWTtBQUM3QixTQUFJLFFBQVEsQ0FBQyxlQUFlLElBQUksU0FBUyxFQUFFO0FBQ3pDLGVBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM5RSxnQkFBUyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUM1QjtJQUNGOztBQUVELHdCQUFxQixFQUFFLCtCQUFVLEtBQUssRUFBRTtBQUN0Qyx3QkFBSSxLQUFLLENBQUMsa0RBQWtELEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVFLGNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSxDQUFDO0lBQ3BEOztBQUVELHlCQUFzQixFQUFFLGdDQUFVLEtBQUssRUFBRTtBQUN2Qyx3QkFBSSxLQUFLLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xFOztBQUVELHNCQUFtQixFQUFFLDZCQUFVLEtBQUssRUFBRTtBQUNwQyx3QkFBSSxLQUFLLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzFEOztBQUVELGdCQUFhLEVBQUUsdUJBQVUsS0FBSyxFQUFFO0FBQzlCLHdCQUFJLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDeEQsU0FBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztBQUN4QixTQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO0FBQzFCLDRCQUFXLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLGdCQUFTLENBQUMsc0NBQXNDLEVBQUUsQ0FBQztNQUNwRDtJQUNGOztBQUVELDZCQUEwQixFQUFFLG9DQUFVLEtBQUssRUFBRTtBQUMzQyx3QkFBSSxLQUFLLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JFLFNBQUksb0JBQW9CLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztBQUN4QywwQkFBVyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztBQUMzRCxjQUFTLENBQUMsc0NBQXNDLEVBQUUsQ0FBQztJQUNwRDs7QUFFRCx5Q0FBc0MsRUFBRSxrREFBWTtBQUNsRCxTQUFJLFdBQVcsR0FBRyxxQkFBVyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUM1RCxTQUFJLGNBQWMsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6RCxTQUFJLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDOztBQUU1RCxTQUFJLEdBQUcsR0FBRyxxQkFBVyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDMUMsU0FBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakMsU0FBSSxTQUFTLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0FBRXBDLFNBQUksa0JBQWtCLEdBQUcscUJBQVcsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDOUQsU0FBSSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDOUUsU0FBSSx3QkFBd0IsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0FBR2pGLFNBQUksb0JBQW9CLEdBQUcsV0FBVyxDQUFDOztBQUV2QyxTQUFLLENBQUMsY0FBYyxLQUFLLFNBQVMsSUFBSSxjQUFjLEtBQUssUUFBUSxJQUFJLGNBQWMsS0FBSyxJQUFJLEtBQUssaUJBQWlCLEtBQUssU0FBUyxJQUM1SCxTQUFTLEtBQUssSUFBSSxJQUNsQix3QkFBd0IsS0FBSyxJQUFJLElBR2hDLHFCQUFxQixLQUFLLEtBQUssSUFBSSx3QkFBd0IsS0FBSyxJQUFJLElBQ3JFLFNBQVMsSUFBSSxJQUFJLElBQ2pCLGlCQUFpQixLQUFLLFNBQ3ZCLEVBQUU7QUFDSCwyQkFBb0IsR0FBRyxJQUFJLENBQUM7TUFDN0I7O0FBRUQsU0FBSyxjQUFjLEtBQUssUUFBUSxJQUFJLGlCQUFpQixLQUFLLFFBQVEsSUFDL0QsY0FBYyxLQUFLLFNBQVMsSUFBSSxpQkFBaUIsS0FBSyxTQUFVLElBQ2hFLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxLQUFLLElBQUssSUFDdEMscUJBQXFCLEtBQUssS0FBSyxJQUFJLHdCQUF3QixLQUFLLEtBQU0sRUFBRTtBQUN6RSwyQkFBb0IsR0FBRyxLQUFLLENBQUM7TUFDOUI7O0FBRUQsU0FBSSxvQkFBb0IsS0FBSyxXQUFXLEVBQUU7QUFDeEMsV0FBSSxnQkFBZ0IsR0FBRyxxQkFBVyxHQUFHLENBQUMsd0NBQXdDLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFDNUYsV0FBSSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLFdBQUksZUFBZSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNwRSxXQUFJLGtCQUFrQixHQUFHLENBQUMsV0FBVyxHQUFHLGVBQWUsSUFBSSxJQUFJLENBQUM7O0FBRWhFLFdBQUksZUFBZSxHQUFHLHFCQUFXLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQ25HLFdBQUksWUFBWSxHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9ELFdBQUksU0FBUyxHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzs7O0FBRzNELFdBQUkscUJBQXFCLEdBQUksZUFBZSxJQUFJLElBQUksSUFBSyxrQkFBa0IsSUFBSSxDQUFFLElBQU0sWUFBWSxLQUFLLFNBQVUsQ0FBQztBQUNuSCxXQUFJLHFCQUFxQixLQUFLLEtBQUssRUFBRTtBQUNuQyxrQkFBUyxDQUFDLGlDQUFpQyxDQUFDLG9CQUFvQixDQUFDO1FBQ2xFO01BQ0Y7SUFDRjs7QUFFRCxPQUFJLEVBQUUsY0FBVSxPQUFPLEVBQUU7QUFDdkIsY0FBUyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUM7O0FBRWpDLFNBQUksU0FBUyxDQUFDLE9BQU8sRUFDbkIsbUJBQUksU0FBUyxFQUFFLENBQUMsS0FFaEIsbUJBQUksVUFBVSxFQUFFLENBQUM7O0FBRW5CLHdCQUFJLElBQUksd0NBQXNDLFNBQVMsQ0FBQyxRQUFRLFFBQUssQ0FBQztBQUN0RSxTQUFJLENBQUMsU0FBUyxDQUFDLDRCQUE0QixFQUFFLEVBQUU7QUFDN0MsMEJBQUksSUFBSSxDQUFDLG1EQUFtRCxDQUFDLENBQUM7QUFDOUQsY0FBTztNQUNSOztBQUVELFNBQUksU0FBUyxDQUFDLFdBQVcsSUFBSSxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO0FBQ3JHLDBCQUFJLElBQUksQ0FBQyxxRkFBcUYsQ0FBQyxDQUFDO0FBQ2hHLGdCQUFTLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDO0FBQzVDLFdBQUksNkJBQTZCLEdBQUcsU0FBUyxDQUFDLDBCQUEwQixFQUFFLENBQUM7QUFDM0UsNEJBQVcsR0FBRyxDQUFDLHlCQUF5QixFQUFFLDZCQUE2QixDQUFDOzs7QUFHeEUsZ0JBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxFQUFFLGVBQWUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsZ0JBQWdCLEVBQUU7QUFDcEYseUJBQWdCLENBQUMsUUFBUSxHQUFHLFlBQVk7QUFDdEMsZUFBSSxpQkFBaUIsR0FBRyxxQkFBVyxHQUFHLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlFLGVBQUksc0JBQXNCLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEQsZUFBSSxzQkFBc0IsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCxvQkFBUyxDQUFDLDJDQUEyQyxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLENBQUM7VUFDdkcsQ0FBQztRQUNILENBQUMsQ0FDQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsNEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQixDQUFDLENBQUM7TUFDTixNQUNJO0FBQ0gsV0FBSSw2QkFBNkIsR0FBRyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztBQUMzRSw0QkFBVyxHQUFHLENBQUMseUJBQXlCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztNQUMxRTs7O0FBR0QsY0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQ25DLElBQUksQ0FBQyxVQUFVLE1BQU0sRUFBRTtBQUN0QixXQUFJLFVBQVUsR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDM0MsNEJBQVcsR0FBRyxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQztNQUM3QyxDQUFDOzs7QUFHSixjQUFTLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxtQkFBbUIsRUFBRTtBQUN4RCw0QkFBVyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztNQUMzRCxDQUFDLENBQUM7O0FBR0gsV0FBTSxDQUFDLGdCQUFnQixDQUFDLDJDQUEyQyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3RHLFdBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsRUFBRSxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUM1RixXQUFNLENBQUMsZ0JBQWdCLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDdEYsV0FBTSxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxRSxXQUFNLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzFFLFdBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxvQ0FBb0MsRUFBRSxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQzs7QUFFcEcsY0FBUyxDQUFDLFlBQVksR0FBRyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLHlCQUF5QixFQUFFLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFFN0ksU0FBSSxTQUFTLENBQUMsWUFBWSxFQUN4QixTQUFTLENBQUMsa0JBQWtCLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsYUFBYSxHQUFHLHVDQUF1QyxDQUFDLEtBRTNILFNBQVMsQ0FBQyxrQkFBa0IsR0FBRywrQ0FBK0MsQ0FBQzs7QUFFakYsU0FBSSxJQUFPLEVBQ1QsU0FBUyxDQUFDLGtCQUFrQixHQUFHLDhCQUFZLEdBQUcsNkJBQTZCLENBQUM7OztBQUc5RSxTQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLE9BQU8sTUFBTSxDQUFDLEtBQUssSUFBSSxXQUFXLEVBQUU7QUFDeEUsV0FBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN6QyxRQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSw2REFBNkQsQ0FBQyxDQUFDO0FBQ3JGLGVBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQzlCOztBQUVELFNBQUksUUFBUSxDQUFDLFVBQVUsS0FBSyxVQUFVLEVBQ3BDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxLQUUxQixNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM1RDs7QUFFRCxnQkFBYSxFQUFFLHlCQUFZO0FBQ3pCLFlBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsRUFDaEQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsRUFDOUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUNqRCxJQUFJLENBQUMsU0FBUywrQ0FBK0MsQ0FBQyxNQUFNLEVBQUU7QUFDckUsV0FBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCLFdBQUksb0JBQW9CLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLFdBQUksa0JBQWtCLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQzs7O0FBR2xDLFdBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUU7QUFDakUsa0JBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzFDLHVCQUFjLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDakQ7OztBQUdELFdBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxJQUMzQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsYUFBYSxLQUNwQyxZQUFZLENBQUMsVUFBVSxJQUFJLFFBQVEsSUFDcEMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsRUFDM0YsT0FBTzs7QUFFVCxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRXRGLFdBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLElBQUksS0FBSyxJQUFJLENBQUMsb0JBQW9CLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLElBQUksSUFBSSxFQUN2SCxPQUFPOztBQUVULFdBQUksUUFBUSxDQUFDLGVBQWUsSUFBSSxTQUFTLEVBQUU7QUFDekMsaUJBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMzRSxnQkFBTztRQUNSOztBQUVELGdCQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BQzVCLENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsMEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztNQUNwQixDQUFDLENBQUM7SUFDTjs7QUFFRCwrQkFBNEIsRUFBRSxzQ0FBVSxPQUFPLEVBQUU7QUFDL0MsU0FBSSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxFQUFFO0FBQzdDLDBCQUFJLElBQUksQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0FBQzlELGNBQU87TUFDUjs7O0FBR0QsU0FBSSxDQUFDLE9BQU8sRUFDVixPQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2YsWUFBTyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7QUFDL0IsY0FBUyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqQzs7O0FBR0QsWUFBUyxFQUFFLG1CQUFVLE9BQU8sRUFBRTtBQUM1QixjQUFTLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQzs7QUFFakMsU0FBSSxPQUFPLENBQUMsZUFBZSxFQUFFO0FBQzNCLGdCQUFTLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO01BQ2pDOztBQUVELFNBQUksUUFBUSxHQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU8sQ0FBQztBQUNwRCxTQUFJLE9BQU8sR0FBRyxNQUFNLElBQUksTUFBTSxDQUFDOztBQUUvQixTQUFJLENBQUMsT0FBTyxFQUFFO0FBQ1osMEJBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7QUFDekQsY0FBTztNQUNSOztBQUVELFNBQUksY0FBYyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7QUFDMUMsbUJBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLFVBQVUsS0FBSyxFQUFFO0FBQ2hELDBCQUFJLEtBQUssQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLENBQUMsQ0FBQzs7QUFFN0QsV0FBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTtBQUMxQixrQkFBUyxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3ZFLGtCQUFTLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQy9ELGFBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUNwQyxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDOztBQUUvRCw0QkFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdELGtCQUFTLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUMzRSxJQUFJLENBQUMsU0FBUyxrREFBa0QsQ0FBQyx3QkFBd0IsRUFBRTtBQUMxRiw4QkFBSSxLQUFLLENBQUMsaUNBQWlDLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztBQUN2RSxlQUFJLHdCQUF3QixFQUFFO0FBQzVCLHNCQUFTLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2xGLGdDQUFJLEtBQUssQ0FBQywwQ0FBMEMsRUFBRSxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUVyRixzQkFBUyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUFDLGtCQUFrQixFQUFFLHdCQUF3QixDQUFDLElBQUksRUFBQyxFQUFFLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQy9IO1VBQ0YsQ0FBQyxDQUNELEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiw4QkFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1VBQ3BCLENBQUMsQ0FBQztBQUNMLFVBQUM7UUFDRixNQUNJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRTtBQUM3QyxrQkFBUyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsUUFBUSxFQUFFO0FBQy9DLG9CQUFTLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUMsNkJBQTZCLEVBQUUsUUFBUSxFQUFDLEVBQUUsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7VUFDckgsQ0FBQyxDQUFDO1FBQ0osTUFDSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQ25DLFNBQVMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztNQUMzRSxDQUFDOztBQUVGLGNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLFFBQVEsRUFBRTtBQUMvQyxlQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsUUFBUSxDQUFDO0FBQ2hDLGdCQUFTLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUMsc0JBQXNCLEVBQUUsUUFBUSxFQUFDLEVBQUUsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztNQUNoSSxDQUFDLENBQUM7O0FBRUgsY0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQzNCLGNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7QUFDbkMsU0FBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQy9DLE9BQU87O0FBRVQsY0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsVUFBVSxTQUFTLEVBQUU7QUFDaEQsV0FBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLEVBQUU7QUFDMUIsNEJBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7QUFDckQsa0JBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMvSiw0QkFBSSxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQztRQUNyRDtNQUNGLENBQUMsQ0FBQztJQUNKOztBQUVELHFCQUFrQixFQUFFLDRCQUFVLFFBQVEsRUFBRTtBQUN0QyxTQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7O0FBRWYsWUFBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUNqRCxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxFQUM5QyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQ2pELElBQUksQ0FBQyxTQUFTLCtDQUErQyxDQUFDLE1BQU0sRUFBRTtBQUNyRSxXQUFJLFlBQVksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0IsV0FBSSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckMsV0FBSSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRW5DLGVBQVEsQ0FBQztBQUNQLGVBQU0sRUFBRSxZQUFZLEdBQUcsWUFBWSxDQUFDLEVBQUUsR0FBRyxJQUFJO0FBQzdDLHVCQUFjLEVBQUUsb0JBQW9CLEdBQUcsb0JBQW9CLENBQUMsRUFBRSxHQUFHLElBQUk7QUFDckUsdUJBQWMsRUFBRSxZQUFZLENBQUMsVUFBVTtBQUN2Qyx3QkFBZSxFQUFFLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLEtBQUssR0FBRyxJQUFJO0FBQ3JFLHNCQUFhLEVBQUksWUFBWSxDQUFDLFVBQVUsSUFBSSxTQUFTLElBQ2xELFlBQVksSUFDWixvQkFBb0IsS0FDbEIsa0JBQWtCLElBQUksa0JBQWtCLENBQUMsS0FBSyxJQUFLLGtCQUFrQixJQUFJLElBQUksQ0FBRTtRQUNyRixDQUFDLENBQUM7TUFDSixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7TUFDcEIsQ0FBQyxDQUFDO0FBQ0wsTUFBQztJQUNGOztBQUVELGlCQUFjLEVBQUUsMEJBQVk7QUFDMUIsY0FBUyxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztBQUNqRCxjQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDO0FBQ3JFLGNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUM7SUFDN0U7O0FBRUQsNEJBQXlCLEVBQUUscUNBQVk7QUFDckMsWUFBTyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsSUFDaEMsUUFBUSxDQUFDLFFBQVEsSUFBSSxRQUFRLElBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFDdkMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDOztBQUdELGVBQVksRUFBRSxzQkFBVSxPQUFPLEVBQUU7QUFDL0Isd0JBQUksS0FBSyxDQUFDLGtDQUFrQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZELGNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQzs7QUFFM0IsU0FBSSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7O0FBR3pFLFNBQUksU0FBUyxDQUFDLFlBQVksRUFBRTtBQUMxQixXQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUU7QUFDM0IsYUFBSSxjQUFjLEdBQUcsTUFBTSxDQUFDLFVBQVUsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ3RGLGFBQUksYUFBYSxHQUFHLE1BQU0sQ0FBQyxTQUFTLElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQzs7QUFFbEYsYUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDbkosYUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDekosYUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQztBQUN4QyxhQUFJLFdBQVcsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDOztBQUUxQyxhQUFJLElBQUksR0FBSyxTQUFTLEdBQUcsQ0FBQyxHQUFLLFVBQVUsR0FBRyxDQUFFLEdBQUksY0FBYyxDQUFDO0FBQ2pFLGFBQUksR0FBRyxHQUFLLFVBQVUsR0FBRyxDQUFDLEdBQUssV0FBVyxHQUFHLENBQUUsR0FBSSxhQUFhLENBQUM7O0FBRWpFLDRCQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ25DLGFBQUkseUJBQXlCLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4RSxhQUFJLDZCQUE2QixHQUFHLEVBQUUsQ0FBQztBQUN2QyxhQUFJLHlCQUF5QixFQUFFO0FBQzdCLGVBQUksMkJBQTJCLEdBQUcsQ0FBQyxlQUFlLEVBQ2hELGlDQUFpQyxFQUNqQyxtQ0FBbUMsRUFDbkMsZ0NBQWdDLEVBQ2hDLGtDQUFrQyxFQUNsQyw0QkFBNEIsRUFDNUIsa0JBQWtCLEVBQ2xCLGtCQUFrQixDQUFDLENBQUM7QUFDdEIsZ0JBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDM0QsaUJBQUksR0FBRyxHQUFHLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLGlCQUFJLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzQyxpQkFBSSxhQUFhLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDOUMsaUJBQUksS0FBSyxJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUU7QUFDekIsNENBQTZCLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsYUFBYSxDQUFDO2NBQ2xFO1lBQ0Y7VUFDRjtBQUNELGFBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLEdBQUcsR0FBRyw2QkFBNkIsR0FBRyxvQkFBb0IsR0FBRyxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsd0JBQXdCLEdBQUcsVUFBVSxHQUFHLFdBQVcsR0FBRyxXQUFXLEdBQUcsUUFBUSxHQUFHLEdBQUcsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUM7O0FBRTdQLGFBQUksV0FBVyxFQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUNJO0FBQ0gsNEJBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDN0Isa0JBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQy9DOztBQUVELGNBQU87TUFDUjs7QUFFRCxTQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO0FBQ2xDLFdBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUU7QUFDeEMsYUFBSSxtQ0FBbUMsR0FBRyxTQUFTLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNySCxlQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUM5QyxTQUFTLENBQUMsU0FBUyxHQUFHLFFBQVEsRUFDOUIsU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQ3BDLEVBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxPQUFPLEVBQUMsRUFDM0IsVUFBVSxJQUFJLEVBQUU7QUFDZCw4QkFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEIsZUFBSSxrQ0FBa0MsR0FBRyxTQUFTLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNwSCxlQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDcEIsc0JBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEYsTUFDSTtBQUNILDJCQUFjLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BEO0FBQ0Qsb0JBQVMsQ0FBQywyQ0FBMkMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1VBQzVGLENBQ0YsQ0FBQztRQUNIO01BQ0YsTUFDSSxJQUFJLE9BQU8sQ0FBQyxXQUFXLElBQUksT0FBTyxDQUFDLGVBQWUsRUFBRTs7QUFDdkQsV0FBSSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxFQUFFO0FBQzdDLDRCQUFJLElBQUksQ0FBQyw0SUFBNEksQ0FBQyxDQUFDO0FBQ3ZKLGdCQUFPO1FBQ1I7QUFDRCxnQkFBUyxDQUFDLDBCQUEwQixDQUFDLFVBQVUsV0FBVyxFQUFFO0FBQzFELGFBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDNUMsZ0JBQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUM7QUFDckQsZ0JBQU8sQ0FBQyxTQUFTLEdBQUcsZ0tBQWdLLENBQUM7QUFDckwsaUJBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUVuQyxhQUFJLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2xELG9CQUFXLENBQUMsU0FBUyxHQUFHLDBGQUEwRixHQUM5Ryw2SEFBNkgsQ0FBQztBQUNsSSxpQkFBUSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQzs7QUFFbEUsYUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNsRCxtQkFBVSxDQUFDLFNBQVMsR0FBRyw2QkFBNkI7QUFDcEQsbUJBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLHNEQUFzRCxDQUFDO0FBQ2xGLG1CQUFVLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxrQkFBa0IsR0FDekMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLEdBQzFCLG1CQUFtQixHQUNuQixlQUFlLEdBQUcsV0FBVyxHQUM3QixxQkFBcUIsSUFBSSxPQUFPLFlBQVksS0FBSyxXQUFXLElBQUksWUFBWSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsR0FDcEcsb0JBQW9CLEdBQUcsZ0JBQWdCLENBQUM7QUFDNUMsbUJBQVUsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQzVDLG1CQUFVLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDckQsbUJBQVUsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7QUFFdkQsNEJBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDekMsaUJBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDO01BQ0osTUFDSSxJQUFJLGVBQWUsSUFBSSxTQUFTO0FBQ25DLGdCQUFTLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsS0FFdkMsbUJBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7SUFDbkU7O0FBRUQsc0JBQW1CLEVBQUUsNkJBQVUsT0FBTyxFQUFFOztBQUV0QyxjQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUMzQyxJQUFJLENBQUMsU0FBUyxxQ0FBcUMsQ0FBQyxvQkFBb0IsRUFBRTtBQUN6RSxXQUFJLENBQUMsb0JBQW9CLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxJQUFJLFlBQVksQ0FBQyxVQUFVLElBQUksU0FBUyxFQUFFO0FBQzdGLGtCQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUM5RCxlQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7O0FBRWpCLGVBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQzdCLE9BQU8sR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQzs7QUFFeEMsZUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXO0FBQzlCLHNCQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEtBQ3RLO0FBQ0gsaUJBQUksS0FBSyxDQUFDLE1BQU0sRUFBRTtBQUNoQixtQkFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFOztBQUVoRiwwQkFBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsK0JBQStCLENBQUMsQ0FDMUQsSUFBSSxDQUFDLFVBQVUsYUFBYSxFQUFFO0FBQzdCLHVCQUFJLGFBQWEsRUFBRTtBQUNqQix5QkFBSSxhQUFhLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7QUFDMUMsNEJBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWTtBQUNsQyxrQ0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQzt3QkFDbEwsQ0FBQyxDQUNDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiw0Q0FBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2QsQ0FBQyxDQUFDO0FBQ0wsd0JBQUM7c0JBQ0YsTUFFQyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUM1SyxNQUVDLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7a0JBRTVLLENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsc0NBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2tCQUNkLENBQUMsQ0FBQztBQUNMLGtCQUFDO2dCQUNGLE1BQ0ksSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFOztBQUU3RiwwQkFBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsK0JBQStCLENBQUMsQ0FDMUQsSUFBSSxDQUFDLFVBQVUsYUFBYSxFQUFFO0FBQzdCLHVCQUFJLGFBQWEsRUFBRTtBQUNqQix5QkFBSSxhQUFhLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7QUFDMUMsNEJBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWTtBQUNsQyxrQ0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQzt3QkFDMUssQ0FBQyxDQUFDO3NCQUNKLE1BRUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztvQkFDcEwsTUFFQyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2tCQUNwTCxDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLHNDQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztrQkFDZCxDQUFDLENBQUM7QUFDTCxrQkFBQztnQkFDRjtjQUNGLE1BQ0ksSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUksRUFDL0IsU0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1SztVQUNGLENBQUMsQ0FDQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsOEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQ2QsQ0FBQyxDQUFDO1FBQ047TUFDRixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUNkLENBQUMsQ0FBQztBQUNMLE1BQUM7SUFDRjs7QUFFRCxvQkFBaUIsRUFBRSwyQkFBVSxnQkFBZ0IsRUFBRTs7QUFFN0MsU0FBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxTQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFDNUIsU0FBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsa0JBQWtCLEdBQUcsUUFBUSxDQUFDO0FBQ25ELFNBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxFQUM5QyxJQUFJLENBQUMsR0FBRyxJQUFJLGVBQWUsR0FDdkIsb0JBQW9CLEdBQUcsZ0JBQWdCLENBQUMsS0FFNUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxvQkFBb0IsR0FBRyxnQkFBZ0I7QUFDckQsYUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEMsd0JBQUksS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7O0FBRXBDLGNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7SUFDdEM7O0FBRUQsaUJBQWMsRUFBRSx3QkFBVSxHQUFHLEVBQUU7QUFDN0Isd0JBQUksS0FBSyxDQUFDLDBDQUEwQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzdEOztBQUVELHVCQUFvQixFQUFFLDhCQUFVLGlDQUFpQyxFQUFFOztBQUNqRSxTQUFJLEVBQUUsYUFBYSxJQUFJLE1BQU0sQ0FBQyxFQUFFO0FBQzlCLDBCQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO0FBQzlELHFCQUFjLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ25ELGNBQU87TUFDUjs7QUFFRCxTQUFJLEVBQUUsa0JBQWtCLElBQUkseUJBQXlCLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDaEUsMEJBQUksS0FBSyxDQUFDLCtGQUErRixDQUFDLENBQUM7QUFDM0cscUJBQWMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbkQsY0FBTztNQUNSOztBQUVELFNBQUksWUFBWSxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUU7QUFDeEMsMEJBQUksSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7QUFDakQsY0FBTztNQUNSOztBQUVELGNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLHlCQUF5QixFQUFFO0FBQ3RFLDBCQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDOztBQUU5RCxnQkFBUyxDQUFDLGlCQUFpQixDQUFDLHlCQUF5QixDQUFDLENBQUM7TUFDeEQsQ0FBQyxDQUNDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiwwQkFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDZCxDQUFDLENBQUM7QUFDTCxNQUFDO0lBQ0Y7Ozs7OztBQU1ELDZCQUEwQixFQUFFLG9DQUFVLFdBQVcsRUFBRTtBQUNqRCxTQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7OztBQUdqQixXQUFJLFdBQVcsRUFBRTtBQUNmLGdCQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUMxRSxNQUNJOztBQUVILGdCQUFPLFNBQVMsQ0FBQztRQUNsQjtNQUNGLE1BQ0k7O0FBRUgsY0FBTyxZQUFZLENBQUMsVUFBVSxDQUFDO01BQ2hDO0lBQ0Y7O0FBRUQsZ0JBQWEsRUFBRSx1QkFBVSxTQUFTLEVBQUUsSUFBSSxFQUFFO0FBQ3hDLFNBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFO0FBQ2pDLDBCQUFJLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxTQUFTLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztBQUM1RyxjQUFPO01BQ1I7QUFDRCxTQUFJLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUU7QUFDckMsY0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJO01BQy9DLENBQUMsQ0FBQztBQUNILFdBQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0I7O0FBRUQsb0NBQWlDLEVBQUUsMkNBQVUsV0FBVyxFQUFFO0FBQ3hELGNBQVMsQ0FBQyxhQUFhLENBQUMsaUNBQWlDLEVBQUU7QUFDekQsYUFBTSxFQUFFLFdBQVc7TUFDcEIsQ0FBQyxDQUFDO0lBQ0o7O0FBRUQsOENBQTJDLEVBQUUscURBQVUsSUFBSSxFQUFFLEVBQUUsRUFBRTtBQUMvRCxTQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUU7QUFDcEIsU0FBRSxHQUFHLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDO01BQ2pGO0FBQ0QsU0FBSSxJQUFJLEtBQUssRUFBRSxFQUFFO0FBQ2YsZ0JBQVMsQ0FBQyxhQUFhLENBQUMsMkNBQTJDLEVBQUU7QUFDbkUsYUFBSSxFQUFFLElBQUk7QUFDVixXQUFFLEVBQUUsRUFBRTtRQUNQLENBQUMsQ0FBQztNQUNKO0lBQ0Y7O0FBRUQsb0NBQWlDLEVBQUUsMkNBQVUsRUFBRSxFQUFFO0FBQy9DLGNBQVMsQ0FBQyxhQUFhLENBQUMsZ0NBQWdDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0Q7O0FBRUQsaUNBQThCLEVBQUUsd0NBQVUsS0FBSyxFQUFFO0FBQy9DLGNBQVMsQ0FBQyxhQUFhLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0Q7O0FBRUQsMkJBQXdCLEVBQUUsa0NBQVUsS0FBSyxFQUFFO0FBQ3pDLGNBQVMsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekQ7O0FBRUQsd0NBQXFDLEVBQUUsK0NBQVUsS0FBSyxFQUFFO0FBQ3RELGNBQVMsQ0FBQyxhQUFhLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEU7O0FBRUQsb0JBQWlCLEVBQUUsMkJBQVUseUJBQXlCLEVBQUU7QUFDdEQsU0FBSSxtQ0FBbUMsR0FBRyxTQUFTLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNySCw4QkFBeUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUMsZUFBZSxFQUFFLElBQUksRUFBQyxDQUFDLENBQ3JFLElBQUksQ0FBQyxVQUFVLFlBQVksRUFBRTtBQUM1QixxQkFBYyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRXRGLGdCQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FDbEMsSUFBSSxDQUFDLFNBQVMsMEJBQTBCLENBQUMsV0FBVyxFQUFFO0FBQ3JELGFBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUM7QUFDM0IsNEJBQUksS0FBSyxDQUFDLDRGQUE0RixDQUFDLENBQUM7O0FBRXhHLGFBQUksY0FBYyxHQUFHLElBQUksQ0FBQztBQUMxQixhQUFJLFlBQVksRUFBRTtBQUNoQixlQUFJLE9BQU8sWUFBWSxDQUFDLGNBQWMsSUFBSSxXQUFXO0FBQ25ELDJCQUFjLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQztBQUU3QywyQkFBYyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLDZGQUE2RixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7VUFDakssTUFFQyxtQkFBSSxJQUFJLENBQUMsMERBQTBELENBQUMsQ0FBQzs7QUFFdkUsa0JBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs7QUFFakcsYUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFDdkMsU0FBUyxDQUFDLDJDQUEyQyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDOUYsQ0FBQyxDQUNELEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiw0QkFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUM7TUFDTixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7QUFFbEQsV0FBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFDdkMsU0FBUyxDQUFDLDJDQUEyQyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7O0FBRTdGLFdBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLElBQUksTUFBTSxJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsRUFDdkQsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO01BQ2xCLENBQUMsQ0FBQztJQUNOOztBQUVELFVBQU8sRUFBRSxpQkFBVSxHQUFHLEVBQUUsS0FBSyxFQUFFO0FBQzdCLFNBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQztBQUN0QixpQkFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztBQUMxQixjQUFTLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ2xDOztBQUVELFdBQVEsRUFBRSxrQkFBVSxRQUFRLEVBQUU7QUFDNUIsY0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQ25DLElBQUksQ0FBQyxTQUFTLGtCQUFrQixDQUFDLFlBQVksRUFBRTtBQUM5QyxXQUFJLFlBQVksRUFDZCxTQUFTLENBQUMsbUJBQW1CLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFO0FBQ2pFLGVBQU0sRUFBRSxTQUFTLENBQUMsT0FBTztBQUN6QixhQUFJLEVBQUUsUUFBUTtRQUNmLENBQUMsQ0FBQyxLQUNBO0FBQ0gsYUFBSSxTQUFTLENBQUMscUJBQXFCLElBQUksSUFBSSxFQUN6QyxTQUFTLENBQUMscUJBQXFCLEdBQUcsUUFBUSxDQUFDLEtBQ3hDO0FBQ0gsZUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQ25CLGdCQUFLLElBQUksSUFBSSxJQUFJLFNBQVMsQ0FBQyxxQkFBcUI7QUFBRSxzQkFBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxRyxLQUFLLElBQUksSUFBSSxJQUFJLFFBQVE7QUFBRSxzQkFBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxTQUFTLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO1VBQzdDO1FBQ0Y7TUFDRixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7TUFDM0IsQ0FBQyxDQUFDO0lBQ047O0FBRUQsWUFBUyxFQUFFLG1CQUFVLEdBQUcsRUFBRTtBQUN4QixjQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM3Qjs7QUFFRCxhQUFVLEVBQUUsb0JBQVUsUUFBUSxFQUFFO0FBQzlCLFNBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztBQUNsQixTQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO0FBQzdCLFVBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFO0FBQzdCLGVBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7TUFFN0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5Qjs7QUFFRCw0QkFBeUIsRUFBRSxtQ0FBVSxLQUFLLEVBQUU7QUFDMUMsU0FBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDMUQsVUFBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs7QUFFM0IsWUFBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FDekYsSUFBSSxDQUFDLFNBQVMsdUNBQXVDLENBQUMsT0FBTyxFQUFFO0FBQzlELFdBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixXQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsV0FBSSxXQUFXLElBQUksWUFBWSxFQUFFO0FBQy9CLGtCQUFTLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRTtBQUMzRSxpQkFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFO0FBQ3RCLG9CQUFTLEVBQUUsWUFBWSxDQUFDLEVBQUU7QUFDMUIsaUJBQU0sRUFBRSxJQUFJO1VBQ2IsQ0FBQyxDQUFDO1FBQ0o7TUFDRixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUNkLENBQUMsQ0FBQztBQUNMLE1BQUM7O0FBRUQsVUFBSyxDQUFDLFNBQVMsQ0FDYixPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQy9CLElBQUksQ0FBQyxVQUFVLFVBQVUsRUFBRTtBQUMxQixXQUFJLFNBQVMsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDO0FBQ25DLFdBQUksU0FBUyxDQUFDLGlCQUFpQixFQUM3QixTQUFTLEdBQUcsU0FBUyxDQUFDLGlCQUFpQixDQUFDO0FBQzFDLFdBQUksZ0JBQWdCLENBQUMsU0FBUyxFQUM1QixTQUFTLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDOztBQUV6QyxZQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxhQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsYUFBSSxPQUFPLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksU0FBUyxFQUFFO0FBQ2hELGlCQUFNLENBQUMsS0FBSyxFQUFFOzs7QUFHZCxpQkFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3JDLGtCQUFPO1VBQ1I7UUFDRjs7QUFFRCxnQkFBUyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxFQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFDLENBQUMsQ0FBQztBQUN0RixjQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEtBQUssRUFBRTs7QUFFbkQsZ0JBQU8sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxzQkFBc0IsR0FBRyxTQUFTLENBQUMsQ0FBQztRQUM3RSxDQUFDLENBQUM7TUFDSixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUNkLENBQUMsQ0FDTCxDQUFDO0lBQ0g7O0FBRUQsWUFBUyxFQUFFLG1CQUFVLGFBQWEsRUFBRSxRQUFRLEVBQUU7QUFDNUMsU0FBSSxhQUFhLElBQUksSUFBSSxFQUFFO0FBQ3pCLGVBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN4QixjQUFPO01BQ1I7O0FBRUQsWUFBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FDM0csSUFBSSxDQUFDLFNBQVMsOEJBQThCLENBQUMsT0FBTyxFQUFFO0FBQ3JELFdBQUksa0JBQWtCLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLFdBQUksZUFBZSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFakMsV0FBSSxrQkFBa0IsRUFBRTtBQUN0QixpQkFBUSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ25DLGdCQUFPO1FBQ1IsTUFDSSxJQUFJLGVBQWUsSUFBSSxlQUFlLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtBQUN6RCxpQkFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNoQyxnQkFBTztRQUNSLE1BQ0k7QUFDSCxpQkFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2Q7TUFDRixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUNkLENBQUMsQ0FBQztJQUNOOzs7QUFHRCxvQkFBaUIsRUFBRSwyQkFBVSxhQUFhLEVBQUUsS0FBSyxFQUFFOzs7O0FBSWpELFNBQUksS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRTtBQUM3QywwQkFBSSxLQUFLLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3JELDBCQUFJLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7TUFDdEQ7O0FBRUQsVUFBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FDekIsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQ3pCLGdCQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxVQUFVLEtBQUssRUFBRTtBQUN6QyxrQkFBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQzVDLElBQUksQ0FBQyxTQUFTLGdDQUFnQyxDQUFDLGlCQUFpQixFQUFFO0FBQ2pFLG9CQUFTLENBQUMscUJBQXFCLENBQUMsVUFBVSxRQUFRLEVBQUUsS0FBSyxFQUFFO0FBQ3pELGlCQUFJLGdCQUFnQixHQUFHO0FBQ3JCLGlCQUFFLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JCLHNCQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUs7QUFDdkIsNkJBQWMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7Y0FDbEMsQ0FBQzs7QUFFRixpQkFBSSxRQUFRLENBQUMsS0FBSyxFQUNoQixnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUV4QyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDOztBQUVqQyxpQkFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDbkIsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOztBQUVqRCxpQkFBSSxRQUFRLENBQUMsSUFBSSxFQUNmLGdCQUFnQixDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQ25DLElBQUksaUJBQWlCLEVBQ3hCLGdCQUFnQixDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7OztBQUdsRCwwQkFBYSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUU7QUFDbEUsbUJBQUksRUFBRSxRQUFRLENBQUMsS0FBSztBQUNwQixtQkFBSSxFQUFFLGdCQUFnQixDQUFDLElBQUk7QUFDM0Isa0JBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDO2NBQ3RDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQ2IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLGtDQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztjQUNkLENBQUMsQ0FBQzs7QUFFTCxzQkFBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQzNDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixFQUFFO0FBQ2hDLG1CQUFJLGdCQUFnQixFQUNsQixTQUFTLENBQUMsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO2NBQ3hELENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsa0NBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQ2QsQ0FBQyxDQUFDO0FBQ0wsY0FBQztZQUNGLEVBQUUsT0FBTyxDQUFDLENBQUM7VUFDYixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDhCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUNkLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQztNQUNKLENBQUMsQ0FBQztJQUNOOztBQUVELHdCQUFxQixFQUFFLCtCQUFVLFlBQVksRUFBRSxnQkFBZ0IsRUFBRTtBQUMvRCxjQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FDbkMsSUFBSSxDQUFDLFNBQVMsK0JBQStCLENBQUMsWUFBWSxFQUFFO0FBQzNELFdBQUksWUFBWSxFQUFFO0FBQ2hCLGtCQUFTLENBQUMsbUJBQW1CLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQyxFQUFFLEdBQUcseUJBQXlCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLFFBQVEsRUFBRTtBQUN2SCxnQkFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO0FBQ3RDLHlCQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUE7VUFDekMsRUFBRSxZQUFZO0FBQ2IsMkJBQWdCLEVBQUUsQ0FBQztVQUNwQixDQUFDO0FBQUMsUUFDSixNQUNJO0FBQ0gsOEJBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7QUFDakQsMkJBQWdCLEVBQUUsQ0FBQztVQUNwQjtNQUNGLENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsMEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ2QsQ0FBQyxDQUFDO0FBQ0wsTUFBQztJQUNGOzs7QUFHRCwyQkFBd0IsRUFBRSxTQUFTLGNBQWMsQ0FBQyxLQUFLLEVBQUU7QUFDdkQsd0JBQUksS0FBSyxDQUFDLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDOztBQUUvQyxTQUFJLFNBQVMsQ0FBQyxZQUFZLElBQUksU0FBUyxFQUNyQyxPQUFPOztBQUVULFNBQUksS0FBb0ssRUFDdEssT0FBTzs7QUFFVCxTQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUU7O0FBQ3JDLGdCQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUM5QixJQUFJLENBQUMsU0FBUyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUU7QUFDL0MsNEJBQUksS0FBSyxDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3RDLGFBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUNyQixPQUFPLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUM7QUFDcEMsYUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQ3ZCLE9BQU8sQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQzs7QUFFeEMsZ0JBQU8sQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQztBQUNsQyw0QkFBSSxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hELGNBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUMsV0FBVyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUNELEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiw0QkFBSSxLQUFLLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDOztBQUVMLFdBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUM7O0FBRWxELFdBQUksU0FBUyxDQUFDLFFBQVEsRUFDcEIsU0FBUyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUV6QyxXQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQ2xCLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7QUFDdkUsV0FBSSxTQUFTLENBQUMsY0FBYyxFQUMxQixTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBQyxDQUFDLENBQUM7O0FBRXZGLGdCQUFTLENBQUMsZ0NBQWdDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3BFLGdCQUFTLENBQUMsZUFBZSxFQUFFLENBQUM7TUFDN0IsTUFDSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsNkJBQTZCO0FBQy9DLGdCQUFTLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUNoRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFOztBQUNoQyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNuRCxnQkFBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO0FBQ25GLGdCQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFDLENBQUMsQ0FBQzs7QUFFbkcsV0FBSSxTQUFTLENBQUMsc0JBQXNCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUMvQyxnQkFBTyxTQUFTLENBQUMsc0JBQXNCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNsRCxlQUFJLGFBQWEsR0FBRyxTQUFTLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFO0FBQzFELHdCQUFhLENBQUM7QUFDWixtQkFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU07QUFDdEMsMkJBQWMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjO1lBQ3ZELENBQUMsQ0FBQztVQUNKO1FBQ0Y7QUFDRCxnQkFBUyxDQUFDLGVBQWUsRUFBRSxDQUFDO01BQzdCLE1BQ0ksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFOztBQUN2QyxnQkFBUyxDQUFDLDRCQUE0QixFQUFFLENBQUM7QUFDekMsZ0JBQVMsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEMsUUFBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEYsZ0JBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztNQUN4RCxNQUNJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRTs7QUFDdkMsUUFBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEYsZ0JBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztNQUN2RCxNQUNJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTs7QUFDdEMsZ0JBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztNQUN4RCxNQUNJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTs7QUFDdEMsZ0JBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztNQUN2RCxNQUNJLElBQUksU0FBUyxDQUFDLDRCQUE0QjtBQUM3QyxnQkFBUyxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RDs7QUFFRCxtQ0FBZ0MsRUFBRSwwQ0FBVSxRQUFRLEVBQUU7QUFDcEQsY0FBUyxDQUFDLDRCQUE0QixHQUFHLFFBQVEsQ0FBQztBQUNsRCxTQUFJLE1BQU0sRUFBRTtBQUNWLGdCQUFTLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FDdEQsSUFBSSxDQUFDLFVBQVUsd0JBQXdCLEVBQUU7QUFDeEMsYUFBSSx3QkFBd0IsRUFBRTtBQUM1QixvQkFBUyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDN0Qsb0JBQVMsQ0FBQyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztVQUN2RTtRQUNGLENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsNEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDO0FBQ0wsUUFBQztNQUNGO0lBQ0Y7OztBQUdELG1DQUFnQyxFQUFFLDBDQUFVLGNBQWMsRUFBRTtBQUMxRCxTQUFJLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRTtBQUM1QyxnQkFBUyxDQUFDLDhCQUE4QixDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3pELGdCQUFTLENBQUMsOEJBQThCLEdBQUcsSUFBSSxDQUFDO01BQ2pEO0lBQ0Y7O0FBRUQsa0JBQWUsRUFBRSx5QkFBVSxRQUFRLEVBQUU7QUFDbkMsU0FBSSxRQUFRLEtBQUssU0FBUyxFQUN4QixPQUFPOztBQUVULGNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRWhELFlBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FDbEcsSUFBSSxDQUFDLFNBQVMsc0NBQXNDLENBQUMsT0FBTyxFQUFFO0FBQzdELFdBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixXQUFJLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFdEMsV0FBSSxZQUFZLEVBQUU7QUFDaEIsYUFBSSxvQkFBb0IsRUFBRTtBQUN4QixrQkFBTyxTQUFTLENBQUMsc0JBQXNCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNsRCxpQkFBSSxhQUFhLEdBQUcsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzNELDBCQUFhLENBQUM7QUFDWixxQkFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFO0FBQ3ZCLDZCQUFjLEVBQUUsb0JBQW9CLENBQUMsRUFBRTtjQUN4QyxDQUFDLENBQUM7WUFDSjtVQUNGLE1BRUMsT0FBTyxTQUFTLENBQUMsc0JBQXNCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNsRCxlQUFJLGFBQWEsR0FBRyxTQUFTLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDM0Qsd0JBQWEsQ0FBQyxFQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1VBQ2hFO1FBQ0o7TUFDRixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDBCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUNkLENBQUMsQ0FBQztBQUNMLE1BQUM7SUFDRjs7QUFFRCxVQUFPLEVBQUUsaUJBQVUsUUFBUSxFQUFFO0FBQzNCLGNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUNuQyxJQUFJLENBQUMsVUFBVSxZQUFZLEVBQUU7QUFDNUIsV0FBSSxZQUFZLEVBQUU7QUFDaEIsa0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsUUFBUSxFQUFFO0FBQzNGLG1CQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1VBQ3pCLENBQUMsQ0FBQztRQUNKO01BQ0YsQ0FBQyxDQUNELEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiwwQkFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDZCxDQUFDLENBQUM7QUFDTCxNQUFDO0lBQ0Y7O0FBRUQsNkJBQTBCLEVBQUUsb0NBQVUsUUFBUSxFQUFFO0FBQzlDLFNBQUksQ0FBQyxTQUFTLENBQUMsNEJBQTRCLEVBQUUsRUFBRTtBQUM3QywwQkFBSSxJQUFJLENBQUMsbURBQW1ELENBQUMsQ0FBQztBQUM5RCxjQUFPO01BQ1I7OztBQUdELFNBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxhQUFhLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsRUFBRTtBQUN6RSxnQkFBUyxDQUFDLDhCQUE4QixHQUFHLFFBQVEsQ0FBQztBQUNwRCxXQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQ3ZCLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUMseUJBQXlCLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztBQUN2RSxjQUFPO01BQ1I7Ozs7QUFJRCxZQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQzVHLElBQUksQ0FBQyxVQUFVLE9BQU8sRUFBRTtBQUN2QixXQUFJLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxXQUFJLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFcEMsV0FBSSxvQkFBb0IsRUFBRTtBQUN4QixhQUFJLGtCQUFrQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUNqRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFekIsaUJBQVEsQ0FBQyxZQUFZLENBQUMsVUFBVSxJQUFJLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELE1BRUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO01BQ25CLENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsMEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ2QsQ0FBQyxDQUFDO0lBQ047O0FBRUQscUJBQWtCLEVBQUUsOEJBQVk7QUFDOUIsU0FBSSxhQUFhLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUM1RSxTQUFJLGFBQWEsSUFBSSxJQUFJLEVBQ3ZCLE9BQU8sS0FBSyxDQUFDO0FBQ2YsU0FBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUMvQyxPQUFPLEtBQUssQ0FBQztBQUNmLFlBQVEsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBRTtJQUN6Qzs7QUFFRCxtQkFBZ0IsRUFBRSw0QkFBVztBQUMzQixTQUFJLGFBQWEsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzVFLFlBQU8sYUFBYSxJQUFJLElBQUksQ0FBRTtJQUMvQjs7QUFFRCxzQkFBbUIsRUFBRSwrQkFBWTtBQUMvQixTQUFJLGNBQWMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3BGLFNBQUksY0FBYyxFQUNoQixPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxRCxZQUFPLEtBQUssQ0FBQztJQUNkOztBQUVELG9CQUFpQixFQUFFLDZCQUFXO0FBQzVCLFNBQUksY0FBYyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDcEYsWUFBTyxjQUFjLElBQUksSUFBSSxDQUFFO0lBQ2hDOztBQUVELHFCQUFrQixFQUFFLDhCQUFXO0FBQzdCLFNBQUksY0FBYyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDcEYsU0FBSSxjQUFjLEVBQ2hCLE9BQU8sUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FDaEQsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNoQjs7QUFFRCwrQkFBNEIsRUFBRSx3Q0FBWTtBQUN4QyxTQUFJLGFBQWEsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDOztBQUVqRSxTQUFJLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxFQUNqQyxPQUFPLElBQUksQ0FBQzs7QUFFZCxTQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxFQUNoQyxPQUFPLElBQUksQ0FBQzs7O0FBR2QsU0FBSSxDQUFDLGFBQWEsRUFDaEIsT0FBTyxLQUFLLENBQUM7OztBQUdmLFNBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQ3BDLE9BQU8sS0FBSyxDQUFDOzs7QUFHZixTQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUNuQyxPQUFPLEtBQUssQ0FBQzs7O0FBR2YsU0FBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFDckMsT0FBTyxLQUFLLENBQUM7OztBQUdmLFNBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFDN0MsT0FBTyxLQUFLLENBQUM7O0FBRWYsWUFBTyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDeEQ7O0FBRUQsd0JBQXFCLEVBQUUsK0JBQVUsUUFBUSxFQUFFO0FBQ3pDLGNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLGtCQUFrQixFQUFFO0FBQ3ZELGVBQVEsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUN2QyxDQUFDLENBQUM7SUFDSjs7QUFFRCxrQkFBZSxFQUFFLHlCQUFVLGVBQWUsRUFBRTtBQUMxQyxTQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQ3ZCLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUMsaUJBQWlCLEVBQUUsRUFBQyxlQUFlLEVBQUUsZUFBZSxFQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQ3hGO0FBQ0gsZ0JBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLG1CQUFtQixFQUFFO0FBQ3hELGFBQUksbUJBQW1CLElBQUksZUFBZSxFQUFFO0FBQzFDLG9CQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBQyxDQUFDLENBQUM7QUFDaEYsb0JBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUNuQyxJQUFJLENBQUMsVUFBVSxZQUFZLEVBQUU7QUFDNUIsaUJBQUksWUFBWSxFQUNkLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUU7QUFDakUscUJBQU0sRUFBRSxTQUFTLENBQUMsT0FBTztBQUN6QixpQ0FBa0IsRUFBRSxlQUFlLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztjQUM3QyxFQUFFLFNBQVMsMEJBQTBCLEdBQUc7QUFDdkMsd0JBQVMsQ0FBQyxxQ0FBcUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztjQUNsRSxDQUFDLENBQUM7WUFDTixDQUFDLENBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLGdDQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLENBQUMsQ0FBQztVQUNOO1FBQ0YsQ0FBQyxDQUFDO01BQ0o7SUFDRjs7QUFFRCxtQkFBZ0IsRUFBRSwwQkFBVSxRQUFRLEVBQUU7QUFDcEMsY0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQzdDLElBQUksQ0FBQyxVQUFVLGtCQUFrQixFQUFFO0FBQ2xDLGVBQVEsQ0FBQyxFQUFFLGtCQUFrQixJQUFJLGtCQUFrQixDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO01BQ3RFLENBQUMsQ0FDRCxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDbEIsMEJBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ2QsQ0FBQyxDQUFDO0FBQ0wsTUFBQztJQUNGOztBQUVELG1CQUFnQixFQUFFLDBCQUFVLE9BQU8sRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRTtBQUNqRSxTQUFJLE9BQU8sR0FBRyxZQUFZLENBQUMsV0FBVyxFQUFFOzs7QUFHeEMsU0FBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQ2pDLFdBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUNuQixlQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxFQUFFO0FBQzNELGtCQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQztBQUNILFdBQUksZ0JBQWdCLEdBQUcsd0JBQXdCLENBQUM7QUFDaEQsY0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztNQUM1RTs7QUFFRCxTQUFJLFFBQVEsRUFDVixPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsS0FFN0MsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdEM7O0FBRUQsa0JBQWUsRUFBRSx5QkFBVSxLQUFLLEVBQUU7QUFDaEMsVUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO0FBQ25DLGdCQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQUE7SUFDNUI7O0FBRUQsT0FBSSxFQUFFLGNBQVUsSUFBSSxFQUFFO0FBQ3BCLFNBQUksT0FBTyxJQUFLLElBQUksVUFBVSxFQUM1QixJQUFJLEVBQUUsQ0FBQyxLQUNKO0FBQ0gsV0FBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2hDLGdCQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztNQUMzQztJQUNGO0VBQ0YsQ0FBQzs7QUFFRixLQUFJLElBQU8sRUFBRTtBQUNYLFlBQVMsQ0FBQyxTQUFTLEdBQUcsOEJBQVksR0FBRyxVQUFVLENBQUM7RUFDakQ7OztBQUdELEtBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUMvQixNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxLQUMzRTs7QUFDSCxnQkFBYSxDQUFDLGdFQUFnRSxDQUFDLENBQUM7O0FBRWhGLE9BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxLQUFLLEVBQUU7QUFDN0MsY0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUM7QUFDSCxPQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxLQUFLLEVBQUU7QUFDMUQsY0FBUyxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQzs7QUFFSCxPQUFJLGVBQWUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxJQUFJLElBQUksQ0FBQztBQUMxRixPQUFJLElBQU8sRUFDVCxlQUFlLEdBQUcsSUFBSSxDQUFDOztBQUV6QixPQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFVBQVUsS0FBSyxFQUFFO0FBQ2hELHdCQUFJLEtBQUssQ0FBQyxzQ0FBc0MsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkUsU0FBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDOUQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsK0JBQStCLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDLEtBRTlGLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxFQUFFLCtCQUErQixFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQzs7QUFFaEcsU0FBSSxlQUFlLEVBQUU7QUFDbkIsWUFBSyxDQUFDLFNBQVMsQ0FDYixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsS0FBSyxFQUFFO0FBQ25FLGdCQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FDbEIsK0JBQStCLEVBQy9CLHlDQUF5QyxFQUN6QyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUNDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNsQiw0QkFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDLENBQ0wsQ0FBQztNQUNIO0lBQ0YsQ0FBQyxDQUFDOztBQUVILE9BQUksZUFBZSxFQUFFO0FBQ25CLFNBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsVUFBVSxLQUFLLEVBQUU7QUFDOUMsWUFBSyxDQUFDLFdBQVcsQ0FDZixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FDeEIsSUFBSSxDQUFDLFVBQVUsUUFBUSxFQUFFOztBQUV4QixhQUFJLFFBQVEsRUFDVixPQUFPLFFBQVEsQ0FBQzs7QUFFbEIsZ0JBQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixDQUNGLENBQ0UsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2xCLDRCQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FDTCxDQUFDO01BQ0gsQ0FBQyxDQUFDO0lBQ0o7RUFDRjs7QUFFRCxLQUFJLGVBQWUsRUFDakIsU0FBUyxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQzs7QUFFN0MsT0FBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLEM7Ozs7OztBQ3ZrRDFCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBSztBQUNMO0FBQ0EsTUFBSztBQUNMO0FBQ0E7QUFDQSxFQUFDO0FBQ0Q7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSwwQkFBeUI7QUFDekIsVUFBUztBQUNUO0FBQ0EsVUFBUztBQUNUO0FBQ0EsVUFBUztBQUNUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVM7QUFDVDtBQUNBO0FBQ0EsY0FBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHdCQUF1Qix1QkFBdUI7QUFDOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVc7O0FBRVg7QUFDQTtBQUNBO0FBQ0Esc0VBQXFFO0FBQ3JFLFlBQVc7QUFDWDs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxZQUFXOztBQUVYO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJDQUEwQztBQUMxQztBQUNBLGdCQUFlO0FBQ2Y7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLHNCQUFxQjtBQUNyQjs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsdUNBQXNDO0FBQ3RDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVc7QUFDWDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsRUFBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3BORCxVQUFTLFVBQVUsR0FBRyxFQUNyQjs7QUFFRCxXQUFVLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUN0QixXQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQzs7QUFFckIsV0FBVSxDQUFDLEdBQUcsR0FBRyxVQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUU7QUFDckMsT0FBSSxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFNBQVMsRUFBRTtBQUN2QyxlQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDO0FBQ0QsYUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEMsT0FBSSxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtBQUN4RCxlQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQy9CO0FBQ0QsVUFBTyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzlCLENBQUM7O0FBRUYsV0FBVSxDQUFDLEdBQUcsR0FBRyxVQUFVLEdBQUcsRUFBRTtBQUM5QixVQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDOUIsQ0FBQzs7bUJBRWEsVUFBVSxDOzs7Ozs7OztBQy9CekIsS0FBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUU7QUFDakMsSUFBQyxZQUFZO0FBQ1gsY0FBUyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRTtBQUNsQyxhQUFNLEdBQUcsTUFBTSxJQUFJLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUMsQ0FBQztBQUMzRSxXQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzlDLFVBQUcsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUUsY0FBTyxHQUFHLENBQUM7TUFDWjs7QUFFRCxnQkFBVyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQzs7QUFFL0MsV0FBTSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7SUFDbEMsR0FBRyxDQUFDOzs7Ozs7O0FDWlAsMkdBQStLLEUiLCJmaWxlIjoiT25lU2lnbmFsU0RLLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGV4cG9ydHM6IHt9LFxuIFx0XHRcdGlkOiBtb2R1bGVJZCxcbiBcdFx0XHRsb2FkZWQ6IGZhbHNlXG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmxvYWRlZCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oMCk7XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiB3ZWJwYWNrL2Jvb3RzdHJhcCBiZDEyN2ZlYTA4NmE0ZDE0MmJlNVxuICoqLyIsImltcG9ydCBcIi4vc2RrLmpzXCI7XG5cbnJlcXVpcmUoXCJleHBvc2U/T25lU2lnbmFsIS4vc2RrLmpzXCIpO1xuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc3JjL2VudHJ5LmpzXG4gKiovIiwiaW1wb3J0IGxvZyBmcm9tICdsb2dsZXZlbCc7XG5pbXBvcnQgTGltaXRTdG9yZSBmcm9tICcuL2xpbWl0U3RvcmUuanMnXG5pbXBvcnQgXCIuL2V2ZW50cy5qc1wiXG5cbi8qKlxuICogTW9kaWZpZWQgTUlUIExpY2Vuc2VcbiAqXG4gKiBDb3B5cmlnaHQgMjAxNSBPbmVTaWduYWxcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogMS4gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIDIuIEFsbCBjb3BpZXMgb2Ygc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlIG1heSBvbmx5IGJlIHVzZWQgaW4gY29ubmVjdGlvblxuICogd2l0aCBzZXJ2aWNlcyBwcm92aWRlZCBieSBPbmVTaWduYWwuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLy8gUmVxdWlyZXMgQ2hyb21lIDQyKywgU2FmYXJpIDcrLCBvciBGaXJlZm94IDQ0K1xuLy8gV2ViIHB1c2ggbm90aWZpY2F0aW9ucyBhcmUgc3VwcG9ydGVkIG9uIE1hYyBPU1gsIFdpbmRvd3MsIExpbnV4LCBhbmQgQW5kcm9pZC5cbnZhciBfdGVtcF9PbmVTaWduYWwgPSBudWxsO1xuXG5pZiAodHlwZW9mIE9uZVNpZ25hbCAhPT0gXCJ1bmRlZmluZWRcIilcbiAgX3RlbXBfT25lU2lnbmFsID0gT25lU2lnbmFsO1xuXG52YXIgT25lU2lnbmFsID0ge1xuICBfVkVSU0lPTjogMTA5MDAwLFxuICBfSE9TVF9VUkw6IF9fREVWX18gPyBfX0RFVl9IT1NUX18gKyAnL2FwaS92MS8nIDogXCJodHRwczovL29uZXNpZ25hbC5jb20vYXBpL3YxL1wiLFxuICBfYXBwX2lkOiBudWxsLFxuICBfdGFnc1RvU2VuZE9uUmVnaXN0ZXI6IG51bGwsXG4gIF9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2s6IG51bGwsXG4gIF9pZHNBdmFpbGFibGVfY2FsbGJhY2s6IFtdLFxuICBfZGVmYXVsdExhdW5jaFVSTDogbnVsbCxcbiAgX2luaXRPcHRpb25zOiBudWxsLFxuICBfaHR0cFJlZ2lzdHJhdGlvbjogZmFsc2UsXG4gIF9tYWluX3BhZ2VfcG9ydDogbnVsbCxcbiAgX2lzTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrOiBudWxsLFxuICBfc3Vic2NyaXB0aW9uU2V0OiB0cnVlLFxuICBfaW5pdE9uZVNpZ25hbEh0dHA6IG51bGwsXG4gIF9zZXNzaW9uSWZyYW1lQWRkZWQ6IGZhbHNlLFxuICBfdXNlSHR0cE1vZGU6IG51bGwsXG4gIF93aW5kb3dXaWR0aDogNTUwLFxuICBfd2luZG93SGVpZ2h0OiA0ODAsXG4gIExPR0dJTkc6IGZhbHNlLFxuICBTRVJWSUNFX1dPUktFUl9VUERBVEVSX1BBVEg6IFwiT25lU2lnbmFsU0RLVXBkYXRlcldvcmtlci5qc1wiLFxuICBTRVJWSUNFX1dPUktFUl9QQVRIOiBcIk9uZVNpZ25hbFNES1dvcmtlci5qc1wiLFxuICBTRVJWSUNFX1dPUktFUl9QQVJBTToge30sXG5cbiAgX2Vuc3VyZURiSW5zdGFuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWYgKE9uZVNpZ25hbC5fb25lU2lnbmFsX2RiKSB7XG4gICAgICAgIHJlc29sdmUoT25lU2lnbmFsLl9vbmVTaWduYWxfZGIpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gaW5kZXhlZERCLm9wZW4oXCJPTkVfU0lHTkFMX1NES19EQlwiLCAxKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgZGF0YWJhc2UgPSBldmVudC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgIE9uZVNpZ25hbC5fb25lU2lnbmFsX2RiID0gZGF0YWJhc2U7XG4gICAgICAgICAgbG9nLmRlYnVnKCdTdWNjZXNmdWxseSBvcGVuZWQgSW5kZXhlZERCLicpO1xuICAgICAgICAgIHJlc29sdmUoZGF0YWJhc2UpO1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoJ1VuYWJsZSB0byBvcGVuIEluZGV4ZWREQi4nLCBldmVudCk7XG4gICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGxvZy5kZWJ1ZygnUmVidWlsZGluZyBzY2hlbWEgaW4gSW5kZXhlZERCLi4uJyk7XG4gICAgICAgICAgdmFyIGRiID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZShcIklkc1wiLCB7a2V5UGF0aDogXCJ0eXBlXCJ9KTtcbiAgICAgICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZShcIk5vdGlmaWNhdGlvbk9wZW5lZFwiLCB7a2V5UGF0aDogXCJ1cmxcIn0pO1xuICAgICAgICAgIGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwiT3B0aW9uc1wiLCB7a2V5UGF0aDogXCJrZXlcIn0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIF9nZXREYlZhbHVlOiBmdW5jdGlvbiAodGFibGUsIGtleSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBPbmVTaWduYWwuX2Vuc3VyZURiSW5zdGFuY2UoKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YWJhc2UpIHtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IGRhdGFiYXNlLnRyYW5zYWN0aW9uKHRhYmxlKS5vYmplY3RTdG9yZSh0YWJsZSkuZ2V0KGtleSk7XG4gICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LnJlc3VsdClcbiAgICAgICAgICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfZGJWYWx1ZVJldHJpZXZlZChyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgcmVqZWN0KHJlcXVlc3QuZXJyb3JDb2RlKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgICAgO1xuICAgIH0pO1xuICB9LFxuXG4gIF9nZXREYlZhbHVlczogZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIE9uZVNpZ25hbC5fZW5zdXJlRGJJbnN0YW5jZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhYmFzZSkge1xuICAgICAgICAgIHZhciBqc29uUmVzdWx0ID0ge307XG4gICAgICAgICAgdmFyIGN1cnNvciA9IGRhdGFiYXNlLnRyYW5zYWN0aW9uKHRhYmxlKS5vYmplY3RTdG9yZSh0YWJsZSkub3BlbkN1cnNvcigpO1xuICAgICAgICAgIGN1cnNvci5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSBldmVudC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9kYlZhbHVlUmV0cmlldmVkKGN1cnNvcik7XG4gICAgICAgICAgICAgIGpzb25SZXN1bHRbY3Vyc29yLmtleV0gPSBjdXJzb3IudmFsdWUudmFsdWU7XG4gICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICByZXNvbHZlKGpzb25SZXN1bHQpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY3Vyc29yLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJlamVjdChjdXJzb3IuZXJyb3JDb2RlKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9wdXREYlZhbHVlOiBmdW5jdGlvbiAodGFibGUsIHZhbHVlKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIE9uZVNpZ25hbC5fZW5zdXJlRGJJbnN0YW5jZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhYmFzZSkge1xuICAgICAgICAgIGRhdGFiYXNlLnRyYW5zYWN0aW9uKFt0YWJsZV0sIFwicmVhZHdyaXRlXCIpLm9iamVjdFN0b3JlKHRhYmxlKS5wdXQodmFsdWUpO1xuICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2RiVmFsdWVTZXQodmFsdWUpO1xuICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9kZWxldGVEYlZhbHVlOiBmdW5jdGlvbiAodGFibGUsIGtleSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBPbmVTaWduYWwuX2Vuc3VyZURiSW5zdGFuY2UoKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YWJhc2UpIHtcbiAgICAgICAgICBkYXRhYmFzZS50cmFuc2FjdGlvbihbdGFibGVdLCBcInJlYWR3cml0ZVwiKS5vYmplY3RTdG9yZSh0YWJsZSkuZGVsZXRlKGtleSk7XG4gICAgICAgICAgcmVzb2x2ZShrZXkpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgIH0pO1xuICAgICAgO1xuICAgIH0pO1xuICB9LFxuXG4gIF9zZW5kVG9PbmVTaWduYWxBcGk6IGZ1bmN0aW9uICh1cmwsIGFjdGlvbiwgaW5EYXRhLCBjYWxsYmFjaywgZmFpbGVkQ2FsbGJhY2spIHtcbiAgICB2YXIgY29udGVudHMgPSB7XG4gICAgICBtZXRob2Q6IGFjdGlvbixcbiAgICAgIC8vbW9kZTogJ25vLWNvcnMnLCAvLyBuby1jb3JzIGlzIGRpc2FibGVkIGZvciBub24tc2VydmljZXdvcmtlci5cbiAgICB9O1xuXG4gICAgaWYgKGluRGF0YSkge1xuICAgICAgY29udGVudHMuaGVhZGVycyA9IHtcIkNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwifTtcbiAgICAgIGNvbnRlbnRzLmJvZHkgPSBKU09OLnN0cmluZ2lmeShpbkRhdGEpO1xuICAgIH1cblxuICAgIGZldGNoKE9uZVNpZ25hbC5fSE9TVF9VUkwgKyB1cmwsIGNvbnRlbnRzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gc3RhdHVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMClcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCkpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIHN0YXR1cyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChqc29uRGF0YSkge1xuICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbClcbiAgICAgICAgICBjYWxsYmFjayhqc29uRGF0YSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcignT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkoKSBmYWlsZWQ6JywgZSk7XG4gICAgICAgIGlmIChmYWlsZWRDYWxsYmFjayAhPSBudWxsKVxuICAgICAgICAgIGZhaWxlZENhbGxiYWNrKCk7XG4gICAgICB9KTtcbiAgfSxcblxuICBfZ2V0TGFuZ3VhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmF2aWdhdG9yLmxhbmd1YWdlID8gKG5hdmlnYXRvci5sYW5ndWFnZS5sZW5ndGggPiAzID8gbmF2aWdhdG9yLmxhbmd1YWdlLnN1YnN0cmluZygwLCAyKSA6IG5hdmlnYXRvci5sYW5ndWFnZSkgOiAnZW4nO1xuICB9LFxuXG4gIF9nZXRQbGF5ZXJJZDogZnVuY3Rpb24gKHZhbHVlLCBjYWxsYmFjaykge1xuICAgIGlmICh2YWx1ZSlcbiAgICAgIGNhbGxiYWNrKHZhbHVlKVxuICAgIGVsc2Uge1xuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAndXNlcklkJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gX2dldFBsYXllcklkX2dvdFVzZXJJZChyZXN1bHQpIHtcbiAgICAgICAgICBpZiAocmVzdWx0KVxuICAgICAgICAgICAgY2FsbGJhY2socmVzdWx0LmlkKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgbG9nLmVycm9yKGUuc3RhY2spO1xuICAgICAgICB9KTtcbiAgICAgIDtcbiAgICB9XG4gIH0sXG5cbiAgX2dldEJyb3dzZXJOYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9DaHJvbWVcXC8oLio/KSAvKSlcbiAgICAgIHJldHVybiBcIkNocm9tZVwiO1xuICAgIGlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaChcIlZlcnNpb24vKC4qKSAoU2FmYXJpKVwiKSlcbiAgICAgIHJldHVybiBcIlNhZmFyaVwiO1xuICAgIGlmIChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9GaXJlZm94XFwvKFswLTldezIsfVxcLlswLTldezEsfSkvKSlcbiAgICAgIHJldHVybiBcIkZpcmVmb3hcIjtcblxuICAgIHJldHVybiBcIlwiO1xuICB9LFxuXG4gIF9yZWdpc3RlcldpdGhPbmVTaWduYWw6IGZ1bmN0aW9uIChhcHBJZCwgcmVnaXN0cmF0aW9uSWQsIGRldmljZVR5cGUpIHtcblxuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXG4gICAgICAudGhlbihmdW5jdGlvbiBfcmVnaXN0ZXJXaXRoT25lU2lnbmFsX0dvdFVzZXJJZCh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25UeXBlcyhmdW5jdGlvbiAobm90aWZfdHlwZXMpIHtcbiAgICAgICAgICB2YXIgcmVxdWVzdFVybCA9ICdwbGF5ZXJzJztcblxuICAgICAgICAgIHZhciBqc29uRGF0YSA9IHtcbiAgICAgICAgICAgIGFwcF9pZDogYXBwSWQsXG4gICAgICAgICAgICBkZXZpY2VfdHlwZTogZGV2aWNlVHlwZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBPbmVTaWduYWwuX2dldExhbmd1YWdlKCksXG4gICAgICAgICAgICB0aW1lem9uZTogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogLTYwLFxuICAgICAgICAgICAgZGV2aWNlX21vZGVsOiBuYXZpZ2F0b3IucGxhdGZvcm0gKyBcIiBcIiArIE9uZVNpZ25hbC5fZ2V0QnJvd3Nlck5hbWUoKSxcbiAgICAgICAgICAgIGRldmljZV9vczogKG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9DaHJvbWVcXC8oLio/KSAvKSB8fCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaChcIlZlcnNpb24vKC4qKSBTYWZhcmlcIikgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvRmlyZWZveFxcLyhbMC05XXsyLH1cXC5bMC05XXsxLH0pLykpWzFdLFxuICAgICAgICAgICAgc2RrOiBPbmVTaWduYWwuX1ZFUlNJT05cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgICAgcmVxdWVzdFVybCA9ICdwbGF5ZXJzLycgKyB1c2VySWRSZXN1bHQuaWQgKyAnL29uX3Nlc3Npb24nO1xuICAgICAgICAgICAganNvbkRhdGEubm90aWZpY2F0aW9uX3R5cGVzID0gbm90aWZfdHlwZXNcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAobm90aWZfdHlwZXMgIT0gMSlcbiAgICAgICAgICAgIGpzb25EYXRhLm5vdGlmaWNhdGlvbl90eXBlcyA9IG5vdGlmX3R5cGVzXG5cbiAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uSWQpIHtcbiAgICAgICAgICAgIGpzb25EYXRhLmlkZW50aWZpZXIgPSByZWdpc3RyYXRpb25JZDtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJyZWdpc3RyYXRpb25JZFwiLCBpZDogcmVnaXN0cmF0aW9uSWR9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBPbmVTaWduYWwuX3NlbmRUb09uZVNpZ25hbEFwaShyZXF1ZXN0VXJsLCAnUE9TVCcsIGpzb25EYXRhLFxuICAgICAgICAgICAgZnVuY3Rpb24gcmVnaXN0ZXJlZENhbGxiYWNrKHJlc3BvbnNlSlNPTikge1xuICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuXG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZUpTT04uaWQpIHtcbiAgICAgICAgICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwidXNlcklkXCIsIGlkOiByZXNwb25zZUpTT04uaWR9KTtcbiAgICAgICAgICAgICAgICBPbmVTaWduYWwuX3NlbmRVbnNlbnRUYWdzKCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBPbmVTaWduYWwuX2dldFBsYXllcklkKHJlc3BvbnNlSlNPTi5pZCwgZnVuY3Rpb24gKHVzZXJJZCkge1xuICAgICAgICAgICAgICAgIGlmIChPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICB3aGlsZSAoT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3Vycl9jYWxsYmFjayA9IE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyX2NhbGxiYWNrKHt1c2VySWQ6IHVzZXJJZCwgcmVnaXN0cmF0aW9uSWQ6IHJlZ2lzdHJhdGlvbklkfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKE9uZVNpZ25hbC5faHR0cFJlZ2lzdHJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiU2VuZGluZyBwbGF5ZXIgSWQgYW5kIHJlZ2lzdHJhdGlvbklkIGJhY2sgdG8gaG9zdCBwYWdlXCIpO1xuICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgdmFyIGNyZWF0b3IgPSBvcGVuZXIgfHwgcGFyZW50O1xuICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9zYWZlUG9zdE1lc3NhZ2UoY3JlYXRvciwge1xuICAgICAgICAgICAgICAgICAgICBpZHNBdmFpbGFibGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IHVzZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25JZDogcmVnaXN0cmF0aW9uSWRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSwgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5vcmlnaW4sIG51bGwpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAob3BlbmVyKVxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG5cbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlLnN0YWNrKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICBfc2VuZFVuc2VudFRhZ3M6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoT25lU2lnbmFsLl90YWdzVG9TZW5kT25SZWdpc3Rlcikge1xuICAgICAgT25lU2lnbmFsLnNlbmRUYWdzKE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIpO1xuICAgICAgT25lU2lnbmFsLl90YWdzVG9TZW5kT25SZWdpc3RlciA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIHNldERlZmF1bHROb3RpZmljYXRpb25Vcmw6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJPcHRpb25zXCIsIHtrZXk6IFwiZGVmYXVsdFVybFwiLCB2YWx1ZTogdXJsfSk7XG4gIH0sXG5cbiAgc2V0RGVmYXVsdEljb246IGZ1bmN0aW9uIChpY29uKSB7XG4gICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiT3B0aW9uc1wiLCB7a2V5OiBcImRlZmF1bHRJY29uXCIsIHZhbHVlOiBpY29ufSk7XG4gIH0sXG5cbiAgc2V0RGVmYXVsdFRpdGxlOiBmdW5jdGlvbiAodGl0bGUpIHtcbiAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJPcHRpb25zXCIsIHtrZXk6IFwiZGVmYXVsdFRpdGxlXCIsIHZhbHVlOiB0aXRsZX0pO1xuICB9LFxuXG4gIF92aXNpYmlsaXR5Y2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PSBcInZpc2libGVcIikge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgT25lU2lnbmFsLl92aXNpYmlsaXR5Y2hhbmdlKTtcbiAgICAgIE9uZVNpZ25hbC5fc2Vzc2lvbkluaXQoe30pO1xuICAgIH1cbiAgfSxcblxuICBvbk5hdGl2ZVByb21wdENoYW5nZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGxvZy5kZWJ1ZygnRXZlbnQgb25lc2lnbmFsLnByb21wdC5uYXRpdmUucGVybWlzc2lvbmNoYW5nZWQ6JywgZXZlbnQuZGV0YWlsKTtcbiAgICBPbmVTaWduYWwuX2NoZWNrVHJpZ2dlcl9ldmVudFN1YnNjcmlwdGlvbkNoYW5nZWQoKTtcbiAgfSxcblxuICBfb25TdWJzY3JpcHRpb25DaGFuZ2VkOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBsb2cuZGVidWcoJ0V2ZW50IG9uZXNpZ25hbC5zdWJzY3JpcHRpb24uY2hhbmdlZDonLCBldmVudC5kZXRhaWwpO1xuICB9LFxuXG4gIF9vbkRiVmFsdWVSZXRyaWV2ZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGxvZy5kZWJ1ZygnRXZlbnQgb25lc2lnbmFsLmRiLnJldHJpZXZlZDonLCBldmVudC5kZXRhaWwpO1xuICB9LFxuXG4gIF9vbkRiVmFsdWVTZXQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGxvZy5kZWJ1ZygnRXZlbnQgb25lc2lnbmFsLmRiLnZhbHVlc2V0OicsIGV2ZW50LmRldGFpbCk7XG4gICAgdmFyIGluZm8gPSBldmVudC5kZXRhaWw7XG4gICAgaWYgKGluZm8udHlwZSA9PT0gJ3VzZXJJZCcpIHtcbiAgICAgIExpbWl0U3RvcmUucHV0KCdkYi5pZHMudXNlcklkJywgaW5mby5pZCk7XG4gICAgICBPbmVTaWduYWwuX2NoZWNrVHJpZ2dlcl9ldmVudFN1YnNjcmlwdGlvbkNoYW5nZWQoKTtcbiAgICB9XG4gIH0sXG5cbiAgX29uSW50ZXJuYWxTdWJzY3JpcHRpb25TZXQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGxvZy5kZWJ1ZygnRXZlbnQgb25lc2lnbmFsLmludGVybmFsLnN1YnNjcmlwdGlvbnNldDonLCBldmVudC5kZXRhaWwpO1xuICAgIHZhciBuZXdTdWJzY3JpcHRpb25WYWx1ZSA9IGV2ZW50LmRldGFpbDtcbiAgICBMaW1pdFN0b3JlLnB1dCgnc3Vic2NyaXB0aW9uLnZhbHVlJywgbmV3U3Vic2NyaXB0aW9uVmFsdWUpO1xuICAgIE9uZVNpZ25hbC5fY2hlY2tUcmlnZ2VyX2V2ZW50U3Vic2NyaXB0aW9uQ2hhbmdlZCgpO1xuICB9LFxuXG4gIF9jaGVja1RyaWdnZXJfZXZlbnRTdWJzY3JpcHRpb25DaGFuZ2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBlcm1pc3Npb25zID0gTGltaXRTdG9yZS5nZXQoJ25vdGlmaWNhdGlvbi5wZXJtaXNzaW9uJyk7XG4gICAgdmFyIGxhc3RQZXJtaXNzaW9uID0gcGVybWlzc2lvbnNbcGVybWlzc2lvbnMubGVuZ3RoIC0gMl07XG4gICAgdmFyIGN1cnJlbnRQZXJtaXNzaW9uID0gcGVybWlzc2lvbnNbcGVybWlzc2lvbnMubGVuZ3RoIC0gMV07XG5cbiAgICB2YXIgaWRzID0gTGltaXRTdG9yZS5nZXQoJ2RiLmlkcy51c2VySWQnKTtcbiAgICB2YXIgbGFzdElkID0gaWRzW2lkcy5sZW5ndGggLSAyXTtcbiAgICB2YXIgY3VycmVudElkID0gaWRzW2lkcy5sZW5ndGggLSAxXTtcblxuICAgIHZhciBzdWJzY3JpcHRpb25TdGF0ZXMgPSBMaW1pdFN0b3JlLmdldCgnc3Vic2NyaXB0aW9uLnZhbHVlJyk7XG4gICAgdmFyIGxhc3RTdWJzY3JpcHRpb25TdGF0ZSA9IHN1YnNjcmlwdGlvblN0YXRlc1tzdWJzY3JpcHRpb25TdGF0ZXMubGVuZ3RoIC0gMl07XG4gICAgdmFyIGN1cnJlbnRTdWJzY3JpcHRpb25TdGF0ZSA9IHN1YnNjcmlwdGlvblN0YXRlc1tzdWJzY3JpcHRpb25TdGF0ZXMubGVuZ3RoIC0gMV07XG5cblxuICAgIHZhciBuZXdTdWJzY3JpcHRpb25TdGF0ZSA9ICd1bmNoYW5nZWQnO1xuXG4gICAgaWYgKCgobGFzdFBlcm1pc3Npb24gPT09ICdkZWZhdWx0JyB8fCBsYXN0UGVybWlzc2lvbiA9PT0gJ2RlbmllZCcgfHwgbGFzdFBlcm1pc3Npb24gPT09IG51bGwpICYmIGN1cnJlbnRQZXJtaXNzaW9uID09PSAnZ3JhbnRlZCcgJiZcbiAgICAgICAgY3VycmVudElkICE9PSBudWxsICYmXG4gICAgICAgIGN1cnJlbnRTdWJzY3JpcHRpb25TdGF0ZSA9PT0gdHJ1ZVxuICAgICAgKSB8fFxuICAgICAgKFxuICAgICAgICAobGFzdFN1YnNjcmlwdGlvblN0YXRlID09PSBmYWxzZSAmJiBjdXJyZW50U3Vic2NyaXB0aW9uU3RhdGUgPT09IHRydWUpICYmXG4gICAgICAgIGN1cnJlbnRJZCAhPSBudWxsICYmXG4gICAgICAgIGN1cnJlbnRQZXJtaXNzaW9uID09PSAnZ3JhbnRlZCdcbiAgICAgICkpIHtcbiAgICAgIG5ld1N1YnNjcmlwdGlvblN0YXRlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoKGxhc3RQZXJtaXNzaW9uICE9PSAnZGVuaWVkJyAmJiBjdXJyZW50UGVybWlzc2lvbiA9PT0gJ2RlbmllZCcpIHx8XG4gICAgICAobGFzdFBlcm1pc3Npb24gPT09ICdncmFudGVkJyAmJiBjdXJyZW50UGVybWlzc2lvbiAhPT0gJ2dyYW50ZWQnKSB8fFxuICAgICAgKGxhc3RJZCAhPT0gbnVsbCAmJiBjdXJyZW50SWQgPT09IG51bGwpIHx8XG4gICAgICAobGFzdFN1YnNjcmlwdGlvblN0YXRlICE9PSBmYWxzZSAmJiBjdXJyZW50U3Vic2NyaXB0aW9uU3RhdGUgPT09IGZhbHNlKSkge1xuICAgICAgbmV3U3Vic2NyaXB0aW9uU3RhdGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAobmV3U3Vic2NyaXB0aW9uU3RhdGUgIT09IFwidW5jaGFuZ2VkXCIpIHtcbiAgICAgIHZhciBsYXN0VHJpZ2dlclRpbWVzID0gTGltaXRTdG9yZS5wdXQoJ2V2ZW50LnN1YnNjcmlwdGlvbmNoYW5nZWQubGFzdHJpZ2dlcmVkJywgRGF0ZS5ub3coKSk7XG4gICAgICB2YXIgY3VycmVudFRpbWUgPSBsYXN0VHJpZ2dlclRpbWVzW2xhc3RUcmlnZ2VyVGltZXMubGVuZ3RoIC0gMV07XG4gICAgICB2YXIgbGFzdFRyaWdnZXJUaW1lID0gbGFzdFRyaWdnZXJUaW1lc1tsYXN0VHJpZ2dlclRpbWVzLmxlbmd0aCAtIDJdO1xuICAgICAgdmFyIGVsYXBzZWRUaW1lU2Vjb25kcyA9IChjdXJyZW50VGltZSAtIGxhc3RUcmlnZ2VyVGltZSkgLyAxMDAwO1xuXG4gICAgICB2YXIgbGFzdEV2ZW50U3RhdGVzID0gTGltaXRTdG9yZS5wdXQoJ2V2ZW50LnN1YnNjcmlwdGlvbmNoYW5nZWQubGFzdHN0YXRlcycsIG5ld1N1YnNjcmlwdGlvblN0YXRlKTtcbiAgICAgIHZhciBjdXJyZW50U3RhdGUgPSBsYXN0RXZlbnRTdGF0ZXNbbGFzdEV2ZW50U3RhdGVzLmxlbmd0aCAtIDFdO1xuICAgICAgdmFyIGxhc3RTdGF0ZSA9IGxhc3RFdmVudFN0YXRlc1tsYXN0RXZlbnRTdGF0ZXMubGVuZ3RoIC0gMl07XG5cbiAgICAgIC8vIElmIGV2ZW50IGFscmVhZHkgdHJpZ2dlcmVkIHdpdGhpbiB0aGUgbGFzdCBzZWNvbmQsIGRvbid0IHJlLXRyaWdnZXIuXG4gICAgICB2YXIgc2hvdWxkTm90VHJpZ2dlckV2ZW50ID0gKGxhc3RUcmlnZ2VyVGltZSAhPSBudWxsICYmIChlbGFwc2VkVGltZVNlY29uZHMgPD0gMSkpIHx8IChjdXJyZW50U3RhdGUgPT09IGxhc3RTdGF0ZSk7XG4gICAgICBpZiAoc2hvdWxkTm90VHJpZ2dlckV2ZW50ID09PSBmYWxzZSkge1xuICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9zdWJzY3JpcHRpb25DaGFuZ2VkKG5ld1N1YnNjcmlwdGlvblN0YXRlKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgaWYgKE9uZVNpZ25hbC5MT0dHSU5HKVxuICAgICAgbG9nLmVuYWJsZUFsbCgpO1xuICAgIGVsc2VcbiAgICAgIGxvZy5kaXNhYmxlQWxsKCk7XG5cbiAgICBsb2cuaW5mbyhgT25lU2lnbmFsIFdlYiBTREsgbG9hZGVkICh2ZXJzaW9uICR7T25lU2lnbmFsLl9WRVJTSU9OfSkuYCk7XG4gICAgaWYgKCFPbmVTaWduYWwuaXNQdXNoTm90aWZpY2F0aW9uc1N1cHBvcnRlZCgpKSB7XG4gICAgICBsb2cud2FybihcIllvdXIgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHB1c2ggbm90aWZpY2F0aW9ucy5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKG5hdmlnYXRvci5wZXJtaXNzaW9ucyAmJiAhKE9uZVNpZ25hbC5faXNCcm93c2VyRmlyZWZveCgpICYmIE9uZVNpZ25hbC5fZ2V0RmlyZWZveFZlcnNpb24oKSA8PSA0NSkpIHtcbiAgICAgIGxvZy5pbmZvKFwiVXNpbmcgYnJvd3NlcidzIG5hdGl2ZSBQZXJtaXNzaW9uU3RhdHVzLm9uQ2hhbmdlKCkgdG8gaG9vayBwZXJtaXNzaW9uIGNoYW5nZSBldmVudC5cIik7XG4gICAgICBPbmVTaWduYWwuX3VzaW5nTmF0aXZlUGVybWlzc2lvbkhvb2sgPSB0cnVlO1xuICAgICAgdmFyIGN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKCk7XG4gICAgICBMaW1pdFN0b3JlLnB1dCgnbm90aWZpY2F0aW9uLnBlcm1pc3Npb24nLCBjdXJyZW50Tm90aWZpY2F0aW9uUGVybWlzc2lvbik7XG4gICAgICAvLyBJZiB0aGUgYnJvd3NlciBuYXRpdmVseSBzdXBwb3J0cyBob29raW5nIHRoZSBzdWJzY3JpcHRpb24gcHJvbXB0IHBlcm1pc3Npb24gY2hhbmdlIGV2ZW50XG4gICAgICAvLyAgICAgdXNlIGl0IGluc3RlYWQgb2Ygb3VyIFNESyBtZXRob2RcbiAgICAgIG5hdmlnYXRvci5wZXJtaXNzaW9ucy5xdWVyeSh7bmFtZTogJ25vdGlmaWNhdGlvbnMnfSkudGhlbihmdW5jdGlvbiAocGVybWlzc2lvblN0YXR1cykge1xuICAgICAgICBwZXJtaXNzaW9uU3RhdHVzLm9uY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciByZWNlbnRQZXJtaXNzaW9ucyA9IExpbWl0U3RvcmUucHV0KCdub3RpZmljYXRpb24ucGVybWlzc2lvbicsIHRoaXMuc3RhdGUpO1xuICAgICAgICAgIHZhciBwZXJtaXNzaW9uQmVmb3JlUHJvbXB0ID0gcmVjZW50UGVybWlzc2lvbnNbMF07XG4gICAgICAgICAgdmFyIHBlcm1pc3Npb25zQWZ0ZXJQcm9tcHQgPSByZWNlbnRQZXJtaXNzaW9uc1sxXTtcbiAgICAgICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9uYXRpdmVQcm9tcHRQZXJtaXNzaW9uQ2hhbmdlZChwZXJtaXNzaW9uQmVmb3JlUHJvbXB0LCBwZXJtaXNzaW9uc0FmdGVyUHJvbXB0KTtcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGxvZy5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKCk7XG4gICAgICBMaW1pdFN0b3JlLnB1dCgnbm90aWZpY2F0aW9uLnBlcm1pc3Npb24nLCBjdXJyZW50Tm90aWZpY2F0aW9uUGVybWlzc2lvbik7XG4gICAgfVxuXG4gICAgLy8gU3RvcmUgdGhlIGN1cnJlbnQgdmFsdWUgb2YgSWRzOnJlZ2lzdHJhdGlvbklkLCBzbyB0aGF0IHdlIGNhbiBzZWUgaWYgdGhlIHZhbHVlIGNoYW5nZXMgaW4gdGhlIGZ1dHVyZVxuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXG4gICAgICAudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIHZhciBzdG9yZVZhbHVlID0gcmVzdWx0ID8gcmVzdWx0LmlkIDogbnVsbDtcbiAgICAgICAgTGltaXRTdG9yZS5wdXQoJ2RiLmlkcy51c2VySWQnLCBzdG9yZVZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gU3RvcmUgdGhlIGN1cnJlbnQgdmFsdWUgb2Ygc3Vic2NyaXB0aW9uLCBzbyB0aGF0IHdlIGNhbiBzZWUgaWYgdGhlIHZhbHVlIGNoYW5nZXMgaW4gdGhlIGZ1dHVyZVxuICAgIE9uZVNpZ25hbC5fZ2V0U3Vic2NyaXB0aW9uKGZ1bmN0aW9uIChjdXJyZW50U3Vic2NyaXB0aW9uKSB7XG4gICAgICBMaW1pdFN0b3JlLnB1dCgnc3Vic2NyaXB0aW9uLnZhbHVlJywgY3VycmVudFN1YnNjcmlwdGlvbik7XG4gICAgfSk7XG5cblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwucHJvbXB0Lm5hdGl2ZS5wZXJtaXNzaW9uY2hhbmdlZCcsIE9uZVNpZ25hbC5vbk5hdGl2ZVByb21wdENoYW5nZWQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwuc3Vic2NyaXB0aW9uLmNoYW5nZWQnLCBPbmVTaWduYWwuX29uU3Vic2NyaXB0aW9uQ2hhbmdlZCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29uZXNpZ25hbC5kYi52YWx1ZXJldHJpZXZlZCcsIE9uZVNpZ25hbC5fb25EYlZhbHVlUmV0cmlldmVkKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25lc2lnbmFsLmRiLnZhbHVlc2V0JywgT25lU2lnbmFsLl9vbkRiVmFsdWVTZXQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvbmVzaWduYWwuZGIudmFsdWVzZXQnLCBPbmVTaWduYWwuX29uRGJWYWx1ZVNldCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29uZXNpZ25hbC5pbnRlcm5hbC5zdWJzY3JpcHRpb25zZXQnLCBPbmVTaWduYWwuX29uSW50ZXJuYWxTdWJzY3JpcHRpb25TZXQpO1xuXG4gICAgT25lU2lnbmFsLl91c2VIdHRwTW9kZSA9ICFPbmVTaWduYWwuX2lzU3VwcG9ydGVkU2FmYXJpKCkgJiYgKCFPbmVTaWduYWwuX3N1cHBvcnRzRGlyZWN0UGVybWlzc2lvbigpIHx8IE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZSk7XG5cbiAgICBpZiAoT25lU2lnbmFsLl91c2VIdHRwTW9kZSlcbiAgICAgIE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHAgPSAnaHR0cHM6Ly8nICsgT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zdWJkb21haW5OYW1lICsgJy5vbmVzaWduYWwuY29tL3Nka3MvaW5pdE9uZVNpZ25hbEh0dHAnO1xuICAgIGVsc2VcbiAgICAgIE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHAgPSAnaHR0cHM6Ly9vbmVzaWduYWwuY29tL3Nka3MvaW5pdE9uZVNpZ25hbEh0dHBzJztcblxuICAgIGlmIChfX0RFVl9fKVxuICAgICAgT25lU2lnbmFsLl9pbml0T25lU2lnbmFsSHR0cCA9IF9fREVWX0hPU1RfXyArICcvZGV2X3Nka3MvaW5pdE9uZVNpZ25hbEh0dHAnO1xuXG4gICAgLy8gSWYgU2FmYXJpIC0gYWRkICdmZXRjaCcgcG9sbHlmaWxsIGlmIGl0IGlzbid0IGFscmVhZHkgYWRkZWQuXG4gICAgaWYgKE9uZVNpZ25hbC5faXNTdXBwb3J0ZWRTYWZhcmkoKSAmJiB0eXBlb2Ygd2luZG93LmZldGNoID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgICBzLnNldEF0dHJpYnV0ZSgnc3JjJywgXCJodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9mZXRjaC8wLjkuMC9mZXRjaC5qc1wiKTtcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQocyk7XG4gICAgfVxuXG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIilcbiAgICAgIE9uZVNpZ25hbC5faW50ZXJuYWxJbml0KCk7XG4gICAgZWxzZVxuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBPbmVTaWduYWwuX2ludGVybmFsSW5pdCk7XG4gIH0sXG5cbiAgX2ludGVybmFsSW5pdDogZnVuY3Rpb24gKCkge1xuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdhcHBJZCcpLFxuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAncmVnaXN0cmF0aW9uSWQnKSxcbiAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdzdWJzY3JpcHRpb24nKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBfaW50ZXJuYWxJbml0X0dvdEFwcFJlZ2lzdHJhdGlvblN1YnNjcmlwdGlvbklkcyhyZXN1bHQpIHtcbiAgICAgICAgdmFyIGFwcElkUmVzdWx0ID0gcmVzdWx0WzBdO1xuICAgICAgICB2YXIgcmVnaXN0cmF0aW9uSWRSZXN1bHQgPSByZXN1bHRbMV07XG4gICAgICAgIHZhciBzdWJzY3JpcHRpb25SZXN1bHQgPSByZXN1bHRbMl07XG5cbiAgICAgICAgLy8gSWYgQXBwSWQgY2hhbmdlZCBkZWxldGUgcGxheWVySWQgYW5kIGNvbnRpbnVlLlxuICAgICAgICBpZiAoYXBwSWRSZXN1bHQgJiYgYXBwSWRSZXN1bHQuaWQgIT0gT25lU2lnbmFsLl9pbml0T3B0aW9ucy5hcHBJZCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fZGVsZXRlRGJWYWx1ZShcIklkc1wiLCBcInVzZXJJZFwiKTtcbiAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSFRUUFMgLSBPbmx5IHJlZ2lzdGVyIGZvciBwdXNoIG5vdGlmaWNhdGlvbnMgb25jZSBwZXIgc2Vzc2lvbiBvciBpZiB0aGUgdXNlciBjaGFuZ2VzIG5vdGlmaWNhdGlvbiBwZXJtaXNzaW9uIHRvIEFzayBvciBBbGxvdy5cbiAgICAgICAgaWYgKHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIilcbiAgICAgICAgICAmJiAhT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zdWJkb21haW5OYW1lXG4gICAgICAgICAgJiYgKE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID09IFwiZGVuaWVkXCJcbiAgICAgICAgICB8fCBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFwiT05FX1NJR05BTF9OT1RJRklDQVRJT05fUEVSTUlTU0lPTlwiKSA9PSBOb3RpZmljYXRpb24ucGVybWlzc2lvbikpXG4gICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX05PVElGSUNBVElPTl9QRVJNSVNTSU9OXCIsIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uKTtcblxuICAgICAgICBpZiAoT25lU2lnbmFsLl9pbml0T3B0aW9ucy5hdXRvUmVnaXN0ZXIgPT0gZmFsc2UgJiYgIXJlZ2lzdHJhdGlvbklkUmVzdWx0ICYmIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc3ViZG9tYWluTmFtZSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlICE9IFwidmlzaWJsZVwiKSB7XG4gICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgT25lU2lnbmFsLl92aXNpYmlsaXR5Y2hhbmdlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBPbmVTaWduYWwuX3Nlc3Npb25Jbml0KHt9KTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUuc3RhY2spO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgcmVnaXN0ZXJGb3JQdXNoTm90aWZpY2F0aW9uczogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBpZiAoIU9uZVNpZ25hbC5pc1B1c2hOb3RpZmljYXRpb25zU3VwcG9ydGVkKCkpIHtcbiAgICAgIGxvZy53YXJuKFwiWW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgcHVzaCBub3RpZmljYXRpb25zLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gV0FSTklORzogRG8gTk9UIGFkZCBjYWxsYmFja3MgdGhhdCBoYXZlIHRvIGZpcmUgdG8gZ2V0IGZyb20gaGVyZSB0byB3aW5kb3cub3BlbiBpbiBfc2Vzc2lvbkluaXQuXG4gICAgLy8gICAgICAgICAgT3RoZXJ3aXNlIHRoZSBwb3AtdXAgdG8gYXNrIGZvciBwdXNoIHBlcm1pc3Npb24gb24gSFRUUCBjb25uZWN0aW9ucyB3aWxsIGJlIGJsb2NrZWQgYnkgQ2hyb21lLlxuICAgIGlmICghb3B0aW9ucylcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICBvcHRpb25zLmZyb21SZWdpc3RlckZvciA9IHRydWU7XG4gICAgT25lU2lnbmFsLl9zZXNzaW9uSW5pdChvcHRpb25zKTtcbiAgfSxcblxuICAvLyBIdHRwIG9ubHkgLSBPbmx5IGNhbGxlZCBmcm9tIGlmcmFtZSdzIGluaXQuanNcbiAgX2luaXRIdHRwOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgaWYgKG9wdGlvbnMuY29udGludWVQcmVzc2VkKSB7XG4gICAgICBPbmVTaWduYWwuc2V0U3Vic2NyaXB0aW9uKHRydWUpO1xuICAgIH1cblxuICAgIHZhciBpc0lmcmFtZSA9IChwYXJlbnQgIT0gbnVsbCAmJiBwYXJlbnQgIT0gd2luZG93KTtcbiAgICB2YXIgY3JlYXRvciA9IG9wZW5lciB8fCBwYXJlbnQ7XG5cbiAgICBpZiAoIWNyZWF0b3IpIHtcbiAgICAgIGxvZy5kZWJ1ZyhcIkVSUk9SOl9pbml0SHR0cDogTm8gb3BlbmVyIG9yIHBhcmVudCBmb3VuZCFcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFNldHRpbmcgdXAgbWVzc2FnZSBjaGFubmVsIHRvIHJlY2VpdmUgbWVzc2FnZSBmcm9tIGhvc3QgcGFnZS5cbiAgICB2YXIgbWVzc2FnZUNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBtZXNzYWdlQ2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGxvZy5kZWJ1ZyhcIl9pbml0SHR0cC5tZXNzYWdlQ2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2VcIiwgZXZlbnQpO1xuXG4gICAgICBpZiAoZXZlbnQuZGF0YS5pbml0T3B0aW9ucykge1xuICAgICAgICBPbmVTaWduYWwuc2V0RGVmYXVsdE5vdGlmaWNhdGlvblVybChldmVudC5kYXRhLmluaXRPcHRpb25zLmRlZmF1bHRVcmwpO1xuICAgICAgICBPbmVTaWduYWwuc2V0RGVmYXVsdFRpdGxlKGV2ZW50LmRhdGEuaW5pdE9wdGlvbnMuZGVmYXVsdFRpdGxlKTtcbiAgICAgICAgaWYgKGV2ZW50LmRhdGEuaW5pdE9wdGlvbnMuZGVmYXVsdEljb24pXG4gICAgICAgICAgT25lU2lnbmFsLnNldERlZmF1bHRJY29uKGV2ZW50LmRhdGEuaW5pdE9wdGlvbnMuZGVmYXVsdEljb24pO1xuXG4gICAgICAgIGxvZy5kZWJ1ZyhcImRvY3VtZW50LlVSTFwiLCBldmVudC5kYXRhLmluaXRPcHRpb25zLnBhcmVudF91cmwpO1xuICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwgZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5wYXJlbnRfdXJsKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIHJlZ2lzdGVyRm9yUHVzaE5vdGlmaWNhdGlvbnNfR290Tm90aWZpY2F0aW9uT3BlbmVkKG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCkge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiX2luaXRIdHRwIE5vdGlmaWNhdGlvbk9wZW5lZCBkYlwiLCBub3RpZmljYXRpb25PcGVuZWRSZXN1bHQpO1xuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCkge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX2RlbGV0ZURiVmFsdWUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwgZXZlbnQuZGF0YS5pbml0T3B0aW9ucy5wYXJlbnRfdXJsKTtcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiT25lU2lnbmFsLl9zYWZlUG9zdE1lc3NhZ2U6dGFyZ2V0T3JpZ2luOlwiLCBPbmVTaWduYWwuX2luaXRPcHRpb25zLm9yaWdpbik7XG5cbiAgICAgICAgICAgICAgT25lU2lnbmFsLl9zYWZlUG9zdE1lc3NhZ2UoY3JlYXRvciwge29wZW5lZE5vdGlmaWNhdGlvbjogbm90aWZpY2F0aW9uT3BlbmVkUmVzdWx0LmRhdGF9LCBPbmVTaWduYWwuX2luaXRPcHRpb25zLm9yaWdpbiwgbnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZ2V0U3ViZG9tYWluU3RhdGUoZnVuY3Rpb24gKGN1clN0YXRlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9zYWZlUG9zdE1lc3NhZ2UoY3JlYXRvciwge2N1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uOiBjdXJTdGF0ZX0sIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMub3JpZ2luLCBudWxsKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChldmVudC5kYXRhLnNldFN1YmRvbWFpblN0YXRlKVxuICAgICAgICBPbmVTaWduYWwuc2V0U3Vic2NyaXB0aW9uKGV2ZW50LmRhdGEuc2V0U3ViZG9tYWluU3RhdGUuc2V0U3Vic2NyaXB0aW9uKTtcbiAgICB9O1xuXG4gICAgT25lU2lnbmFsLl9nZXRTdWJkb21haW5TdGF0ZShmdW5jdGlvbiAoY3VyU3RhdGUpIHtcbiAgICAgIGN1clN0YXRlW1wiaXNJZnJhbWVcIl0gPSBpc0lmcmFtZTtcbiAgICAgIE9uZVNpZ25hbC5fc2FmZVBvc3RNZXNzYWdlKGNyZWF0b3IsIHtvbmVTaWduYWxJbml0UGFnZVJlYWR5OiBjdXJTdGF0ZX0sIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMub3JpZ2luLCBbbWVzc2FnZUNoYW5uZWwucG9ydDJdKTtcbiAgICB9KTtcblxuICAgIE9uZVNpZ25hbC5faW5pdFNhdmVTdGF0ZSgpO1xuICAgIE9uZVNpZ25hbC5faHR0cFJlZ2lzdHJhdGlvbiA9IHRydWU7XG4gICAgaWYgKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKFwiP3Nlc3Npb249dHJ1ZVwiKSA9PSAwKVxuICAgICAgcmV0dXJuO1xuXG4gICAgT25lU2lnbmFsLl9nZXRQbGF5ZXJJZChudWxsLCBmdW5jdGlvbiAocGxheWVyX2lkKSB7XG4gICAgICBpZiAoIWlzSWZyYW1lIHx8IHBsYXllcl9pZCkge1xuICAgICAgICBsb2cuZGVidWcoXCJCZWZvcmUgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXJcIik7XG4gICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICBsb2cuZGVidWcoXCJBZnRlciBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlclwiKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfZ2V0U3ViZG9tYWluU3RhdGU6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzdGF0ZSA9IHt9O1xuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpLFxuICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAncmVnaXN0cmF0aW9uSWQnKSxcbiAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdzdWJzY3JpcHRpb24nKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBfaW50ZXJuYWxJbml0X0dvdEFwcFJlZ2lzdHJhdGlvblN1YnNjcmlwdGlvbklkcyhyZXN1bHQpIHtcbiAgICAgICAgdmFyIHVzZXJJZFJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgdmFyIHJlZ2lzdHJhdGlvbklkUmVzdWx0ID0gcmVzdWx0WzFdO1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uUmVzdWx0ID0gcmVzdWx0WzJdO1xuXG4gICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICB1c2VySWQ6IHVzZXJJZFJlc3VsdCA/IHVzZXJJZFJlc3VsdC5pZCA6IG51bGwsXG4gICAgICAgICAgcmVnaXN0cmF0aW9uSWQ6IHJlZ2lzdHJhdGlvbklkUmVzdWx0ID8gcmVnaXN0cmF0aW9uSWRSZXN1bHQuaWQgOiBudWxsLFxuICAgICAgICAgIG5vdGlmUGVybXNzaW9uOiBOb3RpZmljYXRpb24ucGVybWlzc2lvbixcbiAgICAgICAgICBzdWJzY3JpcHRpb25TZXQ6IHN1YnNjcmlwdGlvblJlc3VsdCA/IHN1YnNjcmlwdGlvblJlc3VsdC52YWx1ZSA6IG51bGwsXG4gICAgICAgICAgaXNQdXNoRW5hYmxlZDogKCBOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PSBcImdyYW50ZWRcIlxuICAgICAgICAgICYmIHVzZXJJZFJlc3VsdFxuICAgICAgICAgICYmIHJlZ2lzdHJhdGlvbklkUmVzdWx0XG4gICAgICAgICAgJiYgKChzdWJzY3JpcHRpb25SZXN1bHQgJiYgc3Vic2NyaXB0aW9uUmVzdWx0LnZhbHVlKSB8fCBzdWJzY3JpcHRpb25SZXN1bHQgPT0gbnVsbCkpXG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZS5zdGFjayk7XG4gICAgICB9KTtcbiAgICA7XG4gIH0sXG5cbiAgX2luaXRTYXZlU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICBPbmVTaWduYWwuX2FwcF9pZCA9IE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuYXBwSWQ7XG4gICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiSWRzXCIsIHt0eXBlOiBcImFwcElkXCIsIGlkOiBPbmVTaWduYWwuX2FwcF9pZH0pO1xuICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIk9wdGlvbnNcIiwge2tleTogXCJwYWdlVGl0bGVcIiwgdmFsdWU6IGRvY3VtZW50LnRpdGxlfSk7XG4gIH0sXG5cbiAgX3N1cHBvcnRzRGlyZWN0UGVybWlzc2lvbjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBPbmVTaWduYWwuX2lzU3VwcG9ydGVkU2FmYXJpKClcbiAgICAgIHx8IGxvY2F0aW9uLnByb3RvY29sID09ICdodHRwczonXG4gICAgICB8fCBsb2NhdGlvbi5ob3N0LmluZGV4T2YoXCJsb2NhbGhvc3RcIikgPT0gMFxuICAgICAgfHwgbG9jYXRpb24uaG9zdC5pbmRleE9mKFwiMTI3LjAuMC4xXCIpID09IDA7XG4gIH0sXG5cblxuICBfc2Vzc2lvbkluaXQ6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgbG9nLmRlYnVnKFwiQ2FsbGVkIE9uZVNpZ25hbC5fc2Vzc2lvbkluaXQoKTpcIiwgb3B0aW9ucyk7XG4gICAgT25lU2lnbmFsLl9pbml0U2F2ZVN0YXRlKCk7XG5cbiAgICB2YXIgaG9zdFBhZ2VQcm90b2NvbCA9IGxvY2F0aW9uLm9yaWdpbi5tYXRjaCgvXmh0dHAoc3wpOlxcL1xcLyh3d3dcXC58KS8pWzBdO1xuXG4gICAgLy8gSWYgSFRUUCBvciB1c2luZyBzdWJkb21haW4gbW9kZVxuICAgIGlmIChPbmVTaWduYWwuX3VzZUh0dHBNb2RlKSB7XG4gICAgICBpZiAob3B0aW9ucy5mcm9tUmVnaXN0ZXJGb3IpIHtcbiAgICAgICAgdmFyIGR1YWxTY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgIT0gdW5kZWZpbmVkID8gd2luZG93LnNjcmVlbkxlZnQgOiBzY3JlZW4ubGVmdDtcbiAgICAgICAgdmFyIGR1YWxTY3JlZW5Ub3AgPSB3aW5kb3cuc2NyZWVuVG9wICE9IHVuZGVmaW5lZCA/IHdpbmRvdy5zY3JlZW5Ub3AgOiBzY3JlZW4udG9wO1xuXG4gICAgICAgIHZhciB0aGlzV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCA/IHdpbmRvdy5pbm5lcldpZHRoIDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoID8gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIDogc2NyZWVuLndpZHRoO1xuICAgICAgICB2YXIgdGhpc0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCA/IHdpbmRvdy5pbm5lckhlaWdodCA6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IDogc2NyZWVuLmhlaWdodDtcbiAgICAgICAgdmFyIGNoaWxkV2lkdGggPSBPbmVTaWduYWwuX3dpbmRvd1dpZHRoO1xuICAgICAgICB2YXIgY2hpbGRIZWlnaHQgPSBPbmVTaWduYWwuX3dpbmRvd0hlaWdodDtcblxuICAgICAgICB2YXIgbGVmdCA9ICgodGhpc1dpZHRoIC8gMikgLSAoY2hpbGRXaWR0aCAvIDIpKSArIGR1YWxTY3JlZW5MZWZ0O1xuICAgICAgICB2YXIgdG9wID0gKCh0aGlzSGVpZ2h0IC8gMikgLSAoY2hpbGRIZWlnaHQgLyAyKSkgKyBkdWFsU2NyZWVuVG9wO1xuXG4gICAgICAgIGxvZy5kZWJ1ZygnT3BlbmluZyBwb3B1cCB3aW5kb3cuJyk7XG4gICAgICAgIHZhciBtZXNzYWdlX2xvY2FsaXphdGlvbl9vcHRzID0gT25lU2lnbmFsLl9pbml0T3B0aW9uc1sncHJvbXB0T3B0aW9ucyddO1xuICAgICAgICB2YXIgbWVzc2FnZV9sb2NhbGl6YXRpb25fb3B0c19zdHIgPSAnJztcbiAgICAgICAgaWYgKG1lc3NhZ2VfbG9jYWxpemF0aW9uX29wdHMpIHtcbiAgICAgICAgICB2YXIgbWVzc2FnZV9sb2NhbGl6YXRpb25fcGFyYW1zID0gWydhY3Rpb25NZXNzYWdlJyxcbiAgICAgICAgICAgICdleGFtcGxlTm90aWZpY2F0aW9uVGl0bGVEZXNrdG9wJyxcbiAgICAgICAgICAgICdleGFtcGxlTm90aWZpY2F0aW9uTWVzc2FnZURlc2t0b3AnLFxuICAgICAgICAgICAgJ2V4YW1wbGVOb3RpZmljYXRpb25UaXRsZU1vYmlsZScsXG4gICAgICAgICAgICAnZXhhbXBsZU5vdGlmaWNhdGlvbk1lc3NhZ2VNb2JpbGUnLFxuICAgICAgICAgICAgJ2V4YW1wbGVOb3RpZmljYXRpb25DYXB0aW9uJyxcbiAgICAgICAgICAgICdhY2NlcHRCdXR0b25UZXh0JyxcbiAgICAgICAgICAgICdjYW5jZWxCdXR0b25UZXh0J107XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlX2xvY2FsaXphdGlvbl9wYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBtZXNzYWdlX2xvY2FsaXphdGlvbl9wYXJhbXNbaV07XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBtZXNzYWdlX2xvY2FsaXphdGlvbl9vcHRzW2tleV07XG4gICAgICAgICAgICB2YXIgZW5jb2RlZF92YWx1ZSA9IGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAodmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2VfbG9jYWxpemF0aW9uX29wdHNfc3RyICs9ICcmJyArIGtleSArICc9JyArIGVuY29kZWRfdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBjaGlsZFdpbmRvdyA9IHdpbmRvdy5vcGVuKE9uZVNpZ25hbC5faW5pdE9uZVNpZ25hbEh0dHAgKyBcIj9cIiArIG1lc3NhZ2VfbG9jYWxpemF0aW9uX29wdHNfc3RyICsgXCImaG9zdFBhZ2VQcm90b2NvbD1cIiArIGhvc3RQYWdlUHJvdG9jb2wsIFwiX2JsYW5rXCIsICdzY3JvbGxiYXJzPXllcywgd2lkdGg9JyArIGNoaWxkV2lkdGggKyAnLCBoZWlnaHQ9JyArIGNoaWxkSGVpZ2h0ICsgJywgdG9wPScgKyB0b3AgKyAnLCBsZWZ0PScgKyBsZWZ0KTtcblxuICAgICAgICBpZiAoY2hpbGRXaW5kb3cpXG4gICAgICAgICAgY2hpbGRXaW5kb3cuZm9jdXMoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoJ09wZW5pbmcgaUZyYW1lLicpO1xuICAgICAgICBPbmVTaWduYWwuX2FkZFNlc3Npb25JZnJhbWUoaG9zdFBhZ2VQcm90b2NvbCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoT25lU2lnbmFsLl9pc1N1cHBvcnRlZFNhZmFyaSgpKSB7XG4gICAgICBpZiAoT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zYWZhcmlfd2ViX2lkKSB7XG4gICAgICAgIHZhciBub3RpZmljYXRpb25QZXJtaXNzaW9uQmVmb3JlUmVxdWVzdCA9IE9uZVNpZ25hbC5fZ2V0Tm90aWZpY2F0aW9uUGVybWlzc2lvbihPbmVTaWduYWwuX2luaXRPcHRpb25zLnNhZmFyaV93ZWJfaWQpO1xuICAgICAgICB3aW5kb3cuc2FmYXJpLnB1c2hOb3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oXG4gICAgICAgICAgT25lU2lnbmFsLl9IT1NUX1VSTCArICdzYWZhcmknLFxuICAgICAgICAgIE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCxcbiAgICAgICAgICB7YXBwX2lkOiBPbmVTaWduYWwuX2FwcF9pZH0sXG4gICAgICAgICAgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhkYXRhKTtcbiAgICAgICAgICAgIHZhciBub3RpZmljYXRpb25QZXJtaXNzaW9uQWZ0ZXJSZXF1ZXN0ID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCk7XG4gICAgICAgICAgICBpZiAoZGF0YS5kZXZpY2VUb2tlbikge1xuICAgICAgICAgICAgICBPbmVTaWduYWwuX3JlZ2lzdGVyV2l0aE9uZVNpZ25hbChPbmVTaWduYWwuX2FwcF9pZCwgZGF0YS5kZXZpY2VUb2tlbi50b0xvd2VyQ2FzZSgpLCA3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfbmF0aXZlUHJvbXB0UGVybWlzc2lvbkNoYW5nZWQobm90aWZpY2F0aW9uUGVybWlzc2lvbkJlZm9yZVJlcXVlc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAob3B0aW9ucy5tb2RhbFByb21wdCAmJiBvcHRpb25zLmZyb21SZWdpc3RlckZvcikgeyAvLyBJZiBIVFRQUyAtIFNob3cgbW9kYWxcbiAgICAgIGlmICghT25lU2lnbmFsLmlzUHVzaE5vdGlmaWNhdGlvbnNTdXBwb3J0ZWQoKSkge1xuICAgICAgICBsb2cud2FybignQW4gYXR0ZW1wdCB3YXMgbWFkZSB0byBvcGVuIHRoZSBIVFRQUyBtb2RhbCBwZXJtaXNzaW9uIHByb21wdCwgYnV0IHB1c2ggbm90aWZpY2F0aW9ucyBhcmUgbm90IHN1cHBvcnRlZCBvbiB0aGlzIGJyb3dzZXIuIE9wZW5pbmcgY2FuY2VsZWQuJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIE9uZVNpZ25hbC5pc1B1c2hOb3RpZmljYXRpb25zRW5hYmxlZChmdW5jdGlvbiAocHVzaEVuYWJsZWQpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ09uZVNpZ25hbC1pZnJhbWUtbW9kYWwnKTtcbiAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSAnPGRpdiBpZD1cIm5vdGlmLXBlcm1pc3Npb25cIiBzdHlsZT1cImJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC43KTsgcG9zaXRpb246IGZpeGVkOyB0b3A6IDA7IGxlZnQ6IDA7IHJpZ2h0OiAwOyBib3R0b206IDA7IHotaW5kZXg6IDkwMDA7IGRpc3BsYXk6IGJsb2NrXCI+PC9kaXY+JztcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbGVtZW50KTtcblxuICAgICAgICB2YXIgaWZyYW1lU3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICBpZnJhbWVTdHlsZS5pbm5lckhUTUwgPSBcIkBtZWRpYSAobWF4LXdpZHRoOiA1NjBweCkgeyAuT25lU2lnbmFsLXBlcm1pc3Npb24taWZyYW1lIHsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTt9IH1cIlxuICAgICAgICAgICsgXCJAbWVkaWEgKG1pbi13aWR0aDogNTYxcHgpIHsgLk9uZVNpZ25hbC1wZXJtaXNzaW9uLWlmcmFtZSB7IHRvcDogNTAlOyBsZWZ0OiA1MCU7IG1hcmdpbi1sZWZ0OiAtMjc1cHg7IG1hcmdpbi10b3A6IC0yNDhweDt9IH1cIjtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChpZnJhbWVTdHlsZSk7XG5cbiAgICAgICAgdmFyIGlmcmFtZU5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgICAgICBpZnJhbWVOb2RlLmNsYXNzTmFtZSA9IFwiT25lU2lnbmFsLXBlcm1pc3Npb24taWZyYW1lXCJcbiAgICAgICAgaWZyYW1lTm9kZS5zdHlsZS5jc3NUZXh0ID0gXCJiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDEpOyBwb3NpdGlvbjogZml4ZWQ7XCI7XG4gICAgICAgIGlmcmFtZU5vZGUuc3JjID0gT25lU2lnbmFsLl9pbml0T25lU2lnbmFsSHR0cFxuICAgICAgICAgICsgJz9pZD0nICsgT25lU2lnbmFsLl9hcHBfaWRcbiAgICAgICAgICArICcmaHR0cHNQcm9tcHQ9dHJ1ZSdcbiAgICAgICAgICArICcmcHVzaEVuYWJsZWQ9JyArIHB1c2hFbmFibGVkXG4gICAgICAgICAgKyAnJnBlcm1pc3Npb25CbG9ja2VkPScgKyAodHlwZW9mIE5vdGlmaWNhdGlvbiA9PT0gXCJ1bmRlZmluZWRcIiB8fCBOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PSBcImRlbmllZFwiKVxuICAgICAgICAgICsgJyZob3N0UGFnZVByb3RvY29sPScgKyBob3N0UGFnZVByb3RvY29sO1xuICAgICAgICBpZnJhbWVOb2RlLnNldEF0dHJpYnV0ZSgnZnJhbWVib3JkZXInLCAnMCcpO1xuICAgICAgICBpZnJhbWVOb2RlLndpZHRoID0gT25lU2lnbmFsLl93aW5kb3dXaWR0aC50b1N0cmluZygpO1xuICAgICAgICBpZnJhbWVOb2RlLmhlaWdodCA9IE9uZVNpZ25hbC5fd2luZG93SGVpZ2h0LnRvU3RyaW5nKCk7XG5cbiAgICAgICAgbG9nLmRlYnVnKCdPcGVuaW5nIEhUVFBTIG1vZGFsIHByb21wdC4nKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJub3RpZi1wZXJtaXNzaW9uXCIpLmFwcGVuZENoaWxkKGlmcmFtZU5vZGUpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IpIC8vIElmIEhUVFBTIC0gU2hvdyBuYXRpdmUgcHJvbXB0XG4gICAgICBPbmVTaWduYWwuX3JlZ2lzdGVyRm9yVzNDUHVzaChvcHRpb25zKTtcbiAgICBlbHNlXG4gICAgICBsb2cuZGVidWcoJ1NlcnZpY2Ugd29ya2VycyBhcmUgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXIuJyk7XG4gIH0sXG5cbiAgX3JlZ2lzdGVyRm9yVzNDUHVzaDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcblxuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3JlZ2lzdHJhdGlvbklkJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uIF9yZWdpc3RlckZvclczQ1B1c2hfR290UmVnaXN0cmF0aW9uSWQocmVnaXN0cmF0aW9uSWRSZXN1bHQpIHtcbiAgICAgICAgaWYgKCFyZWdpc3RyYXRpb25JZFJlc3VsdCB8fCAhb3B0aW9ucy5mcm9tUmVnaXN0ZXJGb3IgfHwgTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gIT0gXCJncmFudGVkXCIpIHtcbiAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5nZXRSZWdpc3RyYXRpb24oKS50aGVuKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdmFyIHN3X3BhdGggPSBcIlwiO1xuXG4gICAgICAgICAgICBpZiAoT25lU2lnbmFsLl9pbml0T3B0aW9ucy5wYXRoKVxuICAgICAgICAgICAgICBzd19wYXRoID0gT25lU2lnbmFsLl9pbml0T3B0aW9ucy5wYXRoO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGV2ZW50ID09PSBcInVuZGVmaW5lZFwiKSAvLyBOb3RoaW5nIHJlZ2lzdGVyZWQsIHZlcnkgZmlyc3QgcnVuXG4gICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBpZiAoZXZlbnQuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmFjdGl2ZS5zY3JpcHRVUkwuaW5kZXhPZihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBVEgpID4gLTEpIHtcblxuICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAnV09SS0VSMV9PTkVfU0lHTkFMX1NXX1ZFUlNJT04nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodmVyc2lvblJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmVyc2lvblJlc3VsdC5pZCAhPSBPbmVTaWduYWwuX1ZFUlNJT04pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQudW5yZWdpc3RlcigpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfVVBEQVRFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFUSCwgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1BBUkFNKS50aGVuKE9uZVNpZ25hbC5fZW5hYmxlTm90aWZpY2F0aW9ucywgT25lU2lnbmFsLl9yZWdpc3RlckVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGV2ZW50LmFjdGl2ZS5zY3JpcHRVUkwuaW5kZXhPZihzd19wYXRoICsgT25lU2lnbmFsLlNFUlZJQ0VfV09SS0VSX1VQREFURVJfUEFUSCkgPiAtMSkge1xuXG4gICAgICAgICAgICAgICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdXT1JLRVIxX09ORV9TSUdOQUxfU1dfVkVSU0lPTicpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh2ZXJzaW9uUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnNpb25SZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uUmVzdWx0LmlkICE9IE9uZVNpZ25hbC5fVkVSU0lPTikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC51bnJlZ2lzdGVyKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9VUERBVEVSX1BBVEgsIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVJBTSkudGhlbihPbmVTaWduYWwuX2VuYWJsZU5vdGlmaWNhdGlvbnMsIE9uZVNpZ25hbC5fcmVnaXN0ZXJFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHN3X3BhdGggKyBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfVVBEQVRFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChldmVudC5pbnN0YWxsaW5nID09IG51bGwpXG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoc3dfcGF0aCArIE9uZVNpZ25hbC5TRVJWSUNFX1dPUktFUl9QQVRILCBPbmVTaWduYWwuU0VSVklDRV9XT1JLRVJfUEFSQU0pLnRoZW4oT25lU2lnbmFsLl9lbmFibGVOb3RpZmljYXRpb25zLCBPbmVTaWduYWwuX3JlZ2lzdGVyRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIF9hZGRTZXNzaW9uSWZyYW1lOiBmdW5jdGlvbiAoaG9zdFBhZ2VQcm90b2NvbCkge1xuXG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgIG5vZGUuc3JjID0gT25lU2lnbmFsLl9pbml0T25lU2lnbmFsSHR0cCArIFwiSWZyYW1lXCI7XG4gICAgaWYgKHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIikpXG4gICAgICBub2RlLnNyYyArPSBcIj9zZXNzaW9uPXRydWVcIlxuICAgICAgICArIFwiJmhvc3RQYWdlUHJvdG9jb2w9XCIgKyBob3N0UGFnZVByb3RvY29sO1xuICAgIGVsc2VcbiAgICAgIG5vZGUuc3JjICs9IFwiP2hvc3RQYWdlUHJvdG9jb2w9XCIgKyBob3N0UGFnZVByb3RvY29sXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcbiAgICBsb2cuZGVidWcoJ0FkZGluZyBzZXNzaW9uIGlGcmFtZS4nKTtcblxuICAgIE9uZVNpZ25hbC5fc2Vzc2lvbklmcmFtZUFkZGVkID0gdHJ1ZTtcbiAgfSxcblxuICBfcmVnaXN0ZXJFcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgIGxvZy5kZWJ1ZyhcIm5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyOkVSUk9SOiBcIiArIGVycik7XG4gIH0sXG5cbiAgX2VuYWJsZU5vdGlmaWNhdGlvbnM6IGZ1bmN0aW9uIChleGlzdGluZ1NlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24pIHsgLy8gaXMgU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgaWYgKCEoJ1B1c2hNYW5hZ2VyJyBpbiB3aW5kb3cpKSB7XG4gICAgICBsb2cuZGVidWcoXCJQdXNoIG1lc3NhZ2luZyBpcyBub3Qgc3VwcG9ydGVkLiBObyBQdXNoTWFuYWdlci5cIik7XG4gICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFwiT05FX1NJR05BTF9TRVNTSU9OXCIsIHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKCdzaG93Tm90aWZpY2F0aW9uJyBpbiBTZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uLnByb3RvdHlwZSkpIHtcbiAgICAgIGxvZy5kZWJ1ZyhcIk5vdGlmaWNhdGlvbnMgYXJlIG5vdCBzdXBwb3J0ZWQuIHNob3dOb3RpZmljYXRpb24gbm90IGF2YWlsYWJsZSBpbiBTZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uLlwiKTtcbiAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIiwgdHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID09PSAnZGVuaWVkJykge1xuICAgICAgbG9nLndhcm4oXCJUaGUgdXNlciBoYXMgZGlzYWJsZWQgbm90aWZpY2F0aW9ucy5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVhZHkudGhlbihmdW5jdGlvbiAoc2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbikge1xuICAgICAgbG9nLmluZm8oJ1NlcnZpY2Ugd29ya2VyIGFjdGl2ZTonLCBzZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uKTtcblxuICAgICAgT25lU2lnbmFsLl9zdWJzY3JpYmVGb3JQdXNoKHNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24pO1xuICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIC8qXG4gICBSZXR1cm5zIHRoZSBjdXJyZW50IGJyb3dzZXItYWdub3N0aWMgbm90aWZpY2F0aW9uIHBlcm1pc3Npb24gYXMgXCJkZWZhdWx0XCIsIFwiZ3JhbnRlZFwiLCBcImRlbmllZFwiLlxuICAgc2FmYXJpV2ViSWQ6IFVzZWQgb25seSB0byBnZXQgdGhlIGN1cnJlbnQgbm90aWZpY2F0aW9uIHBlcm1pc3Npb24gc3RhdGUgaW4gU2FmYXJpIChyZXF1aXJlZCBhcyBwYXJ0IG9mIHRoZSBzcGVjKS5cbiAgICovXG4gIF9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uOiBmdW5jdGlvbiAoc2FmYXJpV2ViSWQpIHtcbiAgICBpZiAod2luZG93LnNhZmFyaSkge1xuICAgICAgLy8gVGhlIHVzZXIgaXMgb24gU2FmYXJpXG4gICAgICAvLyBBIHdlYiBJRCBpcyByZXF1aXJlZCB0byBkZXRlcm1pbmUgdGhlIGN1cnJlbnQgbm90aWZpY2lhdGlvbiBwZXJtaXNzaW9uXG4gICAgICBpZiAoc2FmYXJpV2ViSWQpIHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5zYWZhcmkucHVzaE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uKHNhZmFyaVdlYklkKS5wZXJtaXNzaW9uO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIFRoZSB1c2VyIGRpZG4ndCBzZXQgdXAgU2FmYXJpIHdlYiBwdXNoIHByb3Blcmx5OyBub3RpZmljYXRpb25zIGFyZSB1bmxpa2VseSB0byBiZSBlbmFibGVkXG4gICAgICAgIHJldHVybiBcImRlZmF1bHRcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBJZGVudGljYWwgQVBJIG9uIEZpcmVmb3ggYW5kIENocm9tZVxuICAgICAgcmV0dXJuIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uO1xuICAgIH1cbiAgfSxcblxuICBfdHJpZ2dlckV2ZW50OiBmdW5jdGlvbiAoZXZlbnROYW1lLCBkYXRhKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIGxvZy5kZWJ1ZygnU2tpcHBpbmcgdHJpZ2dlcmluZyBvZiBldmVudDonLCBldmVudE5hbWUsICdiZWNhdXNlIHdlIGFyZSBydW5uaW5nIGluIGEgU2VydmljZVdvcmtlciBjb250ZXh0LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoZXZlbnROYW1lLCB7XG4gICAgICBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWxzOiBkYXRhXG4gICAgfSk7XG4gICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9LFxuXG4gIF90cmlnZ2VyRXZlbnRfY3VzdG9tUHJvbXB0Q2xpY2tlZDogZnVuY3Rpb24gKGNsaWNrUmVzdWx0KSB7XG4gICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnQoJ29uZXNpZ25hbC5wcm9tcHQuY3VzdG9tLmNsaWNrZWQnLCB7XG4gICAgICByZXN1bHQ6IGNsaWNrUmVzdWx0XG4gICAgfSk7XG4gIH0sXG5cbiAgX3RyaWdnZXJFdmVudF9uYXRpdmVQcm9tcHRQZXJtaXNzaW9uQ2hhbmdlZDogZnVuY3Rpb24gKGZyb20sIHRvKSB7XG4gICAgaWYgKHRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRvID0gT25lU2lnbmFsLl9nZXROb3RpZmljYXRpb25QZXJtaXNzaW9uKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMuc2FmYXJpX3dlYl9pZCk7XG4gICAgfVxuICAgIGlmIChmcm9tICE9PSB0bykge1xuICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnQoJ29uZXNpZ25hbC5wcm9tcHQubmF0aXZlLnBlcm1pc3Npb25jaGFuZ2VkJywge1xuICAgICAgICBmcm9tOiBmcm9tLFxuICAgICAgICB0bzogdG9cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfdHJpZ2dlckV2ZW50X3N1YnNjcmlwdGlvbkNoYW5nZWQ6IGZ1bmN0aW9uICh0bykge1xuICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50KCdvbmVzaWduYWwuc3Vic2NyaXB0aW9uLmNoYW5nZWQnLCB0byk7XG4gIH0sXG5cbiAgX3RyaWdnZXJFdmVudF9kYlZhbHVlUmV0cmlldmVkOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudCgnb25lc2lnbmFsLmRiLnZhbHVlcmV0cmlldmVkJywgdmFsdWUpO1xuICB9LFxuXG4gIF90cmlnZ2VyRXZlbnRfZGJWYWx1ZVNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnQoJ29uZXNpZ25hbC5kYi52YWx1ZXNldCcsIHZhbHVlKTtcbiAgfSxcblxuICBfdHJpZ2dlckV2ZW50X2ludGVybmFsU3Vic2NyaXB0aW9uU2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudCgnb25lc2lnbmFsLmludGVybmFsLnN1YnNjcmlwdGlvbnNldCcsIHZhbHVlKTtcbiAgfSxcblxuICBfc3Vic2NyaWJlRm9yUHVzaDogZnVuY3Rpb24gKHNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24pIHtcbiAgICB2YXIgbm90aWZpY2F0aW9uUGVybWlzc2lvbkJlZm9yZVJlcXVlc3QgPSBPbmVTaWduYWwuX2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb24oT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zYWZhcmlfd2ViX2lkKTtcbiAgICBzZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uLnB1c2hNYW5hZ2VyLnN1YnNjcmliZSh7dXNlclZpc2libGVPbmx5OiB0cnVlfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChzdWJzY3JpcHRpb24pIHtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShcIk9ORV9TSUdOQUxfTk9USUZJQ0FUSU9OX1BFUk1JU1NJT05cIiwgTm90aWZpY2F0aW9uLnBlcm1pc3Npb24pO1xuXG4gICAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ2FwcElkJylcbiAgICAgICAgICAudGhlbihmdW5jdGlvbiBfc3Vic2NyaWJlRm9yUHVzaF9Hb3RBcHBJZChhcHBJZFJlc3VsdCkge1xuICAgICAgICAgICAgdmFyIGFwcElkID0gYXBwSWRSZXN1bHQuaWQ7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJDYWxsZWQgT25lU2lnbmFsLl9zdWJzY3JpYmVGb3JQdXNoKCkgLT4gc2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbi5wdXNoTWFuYWdlci5zdWJzY3JpYmUoKS5cIik7XG5cbiAgICAgICAgICAgIHZhciByZWdpc3RyYXRpb25JZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3Vic2NyaXB0aW9uLnN1YnNjcmlwdGlvbklkICE9IFwidW5kZWZpbmVkXCIpIC8vIENocm9tZSA0MyAmIDQyXG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uSWQgPSBzdWJzY3JpcHRpb24uc3Vic2NyaXB0aW9uSWQ7XG4gICAgICAgICAgICAgIGVsc2UgIC8vIENocm9tZSA0NCsgYW5kIEZpcmVGb3hcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25JZCA9IHN1YnNjcmlwdGlvbi5lbmRwb2ludC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJeKGh0dHBzOi8vYW5kcm9pZC5nb29nbGVhcGlzLmNvbS9nY20vc2VuZC98aHR0cHM6Ly91cGRhdGVzLnB1c2guc2VydmljZXMubW96aWxsYS5jb20vcHVzaC8pXCIpLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgbG9nLndhcm4oJ0NvdWxkIG5vdCBzdWJzY3JpYmUgeW91ciBicm93c2VyIGZvciBwdXNoIG5vdGlmaWNhdGlvbnMuJyk7XG5cbiAgICAgICAgICAgIE9uZVNpZ25hbC5fcmVnaXN0ZXJXaXRoT25lU2lnbmFsKGFwcElkLCByZWdpc3RyYXRpb25JZCwgT25lU2lnbmFsLl9pc1N1cHBvcnRlZEZpcmVGb3goKSA/IDggOiA1KTtcblxuICAgICAgICAgICAgaWYgKCFPbmVTaWduYWwuX3VzaW5nTmF0aXZlUGVybWlzc2lvbkhvb2spXG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X25hdGl2ZVByb21wdFBlcm1pc3Npb25DaGFuZ2VkKG5vdGlmaWNhdGlvblBlcm1pc3Npb25CZWZvcmVSZXF1ZXN0KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoJ0Vycm9yIHdoaWxlIHN1YnNjcmliaW5nIGZvciBwdXNoOicsIGUpO1xuXG4gICAgICAgIGlmICghT25lU2lnbmFsLl91c2luZ05hdGl2ZVBlcm1pc3Npb25Ib29rKVxuICAgICAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X25hdGl2ZVByb21wdFBlcm1pc3Npb25DaGFuZ2VkKG5vdGlmaWNhdGlvblBlcm1pc3Npb25CZWZvcmVSZXF1ZXN0KTtcblxuICAgICAgICBpZiAoZS5jb2RlID09IDIwICYmIG9wZW5lciAmJiBPbmVTaWduYWwuX2h0dHBSZWdpc3RyYXRpb24pXG4gICAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICB9KTtcbiAgfSxcblxuICBzZW5kVGFnOiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBqc29uS2V5VmFsdWUgPSB7fTtcbiAgICBqc29uS2V5VmFsdWVba2V5XSA9IHZhbHVlO1xuICAgIE9uZVNpZ25hbC5zZW5kVGFncyhqc29uS2V5VmFsdWUpO1xuICB9LFxuXG4gIHNlbmRUYWdzOiBmdW5jdGlvbiAoanNvblBhaXIpIHtcbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICd1c2VySWQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24gc2VuZFRhZ3NfR290VXNlcklkKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICBpZiAodXNlcklkUmVzdWx0KVxuICAgICAgICAgIE9uZVNpZ25hbC5fc2VuZFRvT25lU2lnbmFsQXBpKFwicGxheWVycy9cIiArIHVzZXJJZFJlc3VsdC5pZCwgXCJQVVRcIiwge1xuICAgICAgICAgICAgYXBwX2lkOiBPbmVTaWduYWwuX2FwcF9pZCxcbiAgICAgICAgICAgIHRhZ3M6IGpzb25QYWlyXG4gICAgICAgICAgfSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChPbmVTaWduYWwuX3RhZ3NUb1NlbmRPblJlZ2lzdGVyID09IG51bGwpXG4gICAgICAgICAgICBPbmVTaWduYWwuX3RhZ3NUb1NlbmRPblJlZ2lzdGVyID0ganNvblBhaXI7XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0T2JqID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBfb2JqIGluIE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIpIHJlc3VsdE9ialtfb2JqXSA9IE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXJbX29ial07XG4gICAgICAgICAgICBmb3IgKHZhciBfb2JqIGluIGpzb25QYWlyKSByZXN1bHRPYmpbX29ial0gPSBqc29uUGFpcltfb2JqXTtcbiAgICAgICAgICAgIE9uZVNpZ25hbC5fdGFnc1RvU2VuZE9uUmVnaXN0ZXIgPSByZXN1bHRPYmo7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcignc2VuZFRhZ3M6JywgZSk7XG4gICAgICB9KTtcbiAgfSxcblxuICBkZWxldGVUYWc6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBPbmVTaWduYWwuZGVsZXRlVGFncyhba2V5XSk7XG4gIH0sXG5cbiAgZGVsZXRlVGFnczogZnVuY3Rpb24gKGtleUFycmF5KSB7XG4gICAgdmFyIGpzb25QYWlyID0ge307XG4gICAgdmFyIGxlbmd0aCA9IGtleUFycmF5Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAganNvblBhaXJba2V5QXJyYXlbaV1dID0gXCJcIjtcblxuICAgIE9uZVNpZ25hbC5zZW5kVGFncyhqc29uUGFpcik7XG4gIH0sXG5cbiAgX2hhbmRsZU5vdGlmaWNhdGlvbk9wZW5lZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIG5vdGlmaWNhdGlvbkRhdGEgPSBKU09OLnBhcnNlKGV2ZW50Lm5vdGlmaWNhdGlvbi50YWcpO1xuICAgIGV2ZW50Lm5vdGlmaWNhdGlvbi5jbG9zZSgpO1xuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ2FwcElkJyksIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIF9oYW5kbGVOb3RpZmljYXRpb25PcGVuZWRfR290QXBwVXNlcklkcyhyZXN1bHRzKSB7XG4gICAgICAgIHZhciBhcHBJZFJlc3VsdCA9IHJlc3VsdHNbMF07XG4gICAgICAgIHZhciB1c2VySWRSZXN1bHQgPSByZXN1bHRzWzFdO1xuICAgICAgICBpZiAoYXBwSWRSZXN1bHQgJiYgdXNlcklkUmVzdWx0KSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkoXCJub3RpZmljYXRpb25zL1wiICsgbm90aWZpY2F0aW9uRGF0YS5pZCwgXCJQVVRcIiwge1xuICAgICAgICAgICAgYXBwX2lkOiBhcHBJZFJlc3VsdC5pZCxcbiAgICAgICAgICAgIHBsYXllcl9pZDogdXNlcklkUmVzdWx0LmlkLFxuICAgICAgICAgICAgb3BlbmVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfSk7XG4gICAgO1xuXG4gICAgZXZlbnQud2FpdFVudGlsKFxuICAgICAgY2xpZW50cy5tYXRjaEFsbCh7dHlwZTogXCJ3aW5kb3dcIn0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChjbGllbnRMaXN0KSB7XG4gICAgICAgICAgdmFyIGxhdW5jaFVSTCA9IHJlZ2lzdHJhdGlvbi5zY29wZTtcbiAgICAgICAgICBpZiAoT25lU2lnbmFsLl9kZWZhdWx0TGF1bmNoVVJMKVxuICAgICAgICAgICAgbGF1bmNoVVJMID0gT25lU2lnbmFsLl9kZWZhdWx0TGF1bmNoVVJMO1xuICAgICAgICAgIGlmIChub3RpZmljYXRpb25EYXRhLmxhdW5jaFVSTClcbiAgICAgICAgICAgIGxhdW5jaFVSTCA9IG5vdGlmaWNhdGlvbkRhdGEubGF1bmNoVVJMO1xuXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGllbnRMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2xpZW50ID0gY2xpZW50TGlzdFtpXTtcbiAgICAgICAgICAgIGlmICgnZm9jdXMnIGluIGNsaWVudCAmJiBjbGllbnQudXJsID09IGxhdW5jaFVSTCkge1xuICAgICAgICAgICAgICBjbGllbnQuZm9jdXMoKTtcblxuICAgICAgICAgICAgICAvLyB0YXJnZXRPcmlnaW4gbm90IHZhbGlkIGhlcmUgYXMgdGhlIHNlcnZpY2Ugd29ya2VyIG93bnMgdGhlIHBhZ2UuXG4gICAgICAgICAgICAgIGNsaWVudC5wb3N0TWVzc2FnZShub3RpZmljYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIk5vdGlmaWNhdGlvbk9wZW5lZFwiLCB7dXJsOiBsYXVuY2hVUkwsIGRhdGE6IG5vdGlmaWNhdGlvbkRhdGF9KTtcbiAgICAgICAgICBjbGllbnRzLm9wZW5XaW5kb3cobGF1bmNoVVJMKS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIFNob3VsZCBvbmx5IGZhbGwgaW50byBoZXJlIGlmIGdvaW5nIHRvIGFuIGV4dGVybmFsIFVSTCBvbiBDaHJvbWUgb2xkZXIgdGhhbiA0My5cbiAgICAgICAgICAgIGNsaWVudHMub3BlbldpbmRvdyhyZWdpc3RyYXRpb24uc2NvcGUgKyBcInJlZGlyZWN0b3IuaHRtbD91cmw9XCIgKyBsYXVuY2hVUkwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICAgIH0pXG4gICAgKTtcbiAgfSxcblxuICBfZ2V0VGl0bGU6IGZ1bmN0aW9uIChpbmNvbWluZ1RpdGxlLCBjYWxsYmFjaykge1xuICAgIGlmIChpbmNvbWluZ1RpdGxlICE9IG51bGwpIHtcbiAgICAgIGNhbGxiYWNrKGluY29taW5nVGl0bGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIFByb21pc2UuYWxsKFtPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnZGVmYXVsdFRpdGxlJyksIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdwYWdlVGl0bGUnKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiBfZ2V0VGl0bGVfR290RGVmYXVsdFBhZ2VUaXRsZXMocmVzdWx0cykge1xuICAgICAgICB2YXIgZGVmYXVsdFRpdGxlUmVzdWx0ID0gcmVzdWx0c1swXTtcbiAgICAgICAgdmFyIHBhZ2VUaXRsZVJlc3VsdCA9IHJlc3VsdHNbMV07XG5cbiAgICAgICAgaWYgKGRlZmF1bHRUaXRsZVJlc3VsdCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRlZmF1bHRUaXRsZVJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHBhZ2VUaXRsZVJlc3VsdCAmJiBwYWdlVGl0bGVSZXN1bHQudmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgIGNhbGxiYWNrKHBhZ2VUaXRsZVJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKCcnKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICB9KTtcbiAgfSxcblxuICAvLyBEaXNwbGF5cyBub3RpZmljYXRpb24gZnJvbSBjb250ZW50IHJlY2VpdmVkIGZyb20gT25lU2lnbmFsLlxuICBfaGFuZGxlR0NNTWVzc2FnZTogZnVuY3Rpb24gKHNlcnZpY2VXb3JrZXIsIGV2ZW50KSB7XG4gICAgLy8gVE9ETzogUmVhZCBkYXRhIGZyb20gdGhlIEdDTSBwYXlsb2FkIHdoZW4gQ2hyb21lIG5vIGxvbmdlciByZXF1aXJlcyB0aGUgYmVsb3cgY29tbWFuZCBsaW5lIHBhcmFtZXRlci5cbiAgICAvLyAtLWVuYWJsZS1wdXNoLW1lc3NhZ2UtcGF5bG9hZFxuICAgIC8vIFRoZSBjb21tYW5kIGxpbmUgcGFyYW0gaXMgcmVxdWlyZWQgZXZlbiBvbiBDaHJvbWUgNDMgbmlnaHRseSBidWlsZCAyMDE1LzAzLzE3LlxuICAgIGlmIChldmVudC5kYXRhICYmIGV2ZW50LmRhdGEudGV4dCgpWzBdID09IFwie1wiKSB7XG4gICAgICBsb2cuZGVidWcoJ1JlY2VpdmVkIGRhdGEudGV4dDogJywgZXZlbnQuZGF0YS50ZXh0KCkpO1xuICAgICAgbG9nLmRlYnVnKCdSZWNlaXZlZCBkYXRhLmpzb246ICcsIGV2ZW50LmRhdGEuanNvbigpKTtcbiAgICB9XG5cbiAgICBldmVudC53YWl0VW50aWwobmV3IFByb21pc2UoXG4gICAgICBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIE9uZVNpZ25hbC5fZ2V0VGl0bGUobnVsbCwgZnVuY3Rpb24gKHRpdGxlKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdPcHRpb25zJywgJ2RlZmF1bHRJY29uJylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIF9oYW5kbGVHQ01NZXNzYWdlX0dvdERlZmF1bHRJY29uKGRlZmF1bHRJY29uUmVzdWx0KSB7XG4gICAgICAgICAgICAgIE9uZVNpZ25hbC5fZ2V0TGFzdE5vdGlmaWNhdGlvbnMoZnVuY3Rpb24gKHJlc3BvbnNlLCBhcHBJZCkge1xuICAgICAgICAgICAgICAgIHZhciBub3RpZmljYXRpb25EYXRhID0ge1xuICAgICAgICAgICAgICAgICAgaWQ6IHJlc3BvbnNlLmN1c3RvbS5pLFxuICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVzcG9uc2UuYWxlcnQsXG4gICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsRGF0YTogcmVzcG9uc2UuY3VzdG9tLmFcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnRpdGxlKVxuICAgICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uRGF0YS50aXRsZSA9IHJlc3BvbnNlLnRpdGxlO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvbkRhdGEudGl0bGUgPSB0aXRsZTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5jdXN0b20udSlcbiAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvbkRhdGEubGF1bmNoVVJMID0gcmVzcG9uc2UuY3VzdG9tLnU7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaWNvbilcbiAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvbkRhdGEuaWNvbiA9IHJlc3BvbnNlLmljb247XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZGVmYXVsdEljb25SZXN1bHQpXG4gICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25EYXRhLmljb24gPSBkZWZhdWx0SWNvblJlc3VsdC52YWx1ZTtcblxuICAgICAgICAgICAgICAgIC8vIE5ldmVyIG5lc3QgdGhlIGZvbGxvd2luZyBsaW5lIGluIGEgY2FsbGJhY2sgZnJvbSB0aGUgcG9pbnQgb2YgZW50ZXJpbmcgZnJvbSBfZ2V0TGFzdE5vdGlmaWNhdGlvbnNcbiAgICAgICAgICAgICAgICBzZXJ2aWNlV29ya2VyLnJlZ2lzdHJhdGlvbi5zaG93Tm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvbkRhdGEudGl0bGUsIHtcbiAgICAgICAgICAgICAgICAgIGJvZHk6IHJlc3BvbnNlLmFsZXJ0LFxuICAgICAgICAgICAgICAgICAgaWNvbjogbm90aWZpY2F0aW9uRGF0YS5pY29uLFxuICAgICAgICAgICAgICAgICAgdGFnOiBKU09OLnN0cmluZ2lmeShub3RpZmljYXRpb25EYXRhKVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzb2x2ZSlcbiAgICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdkZWZhdWx0VXJsJylcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkZWZhdWx0VXJsUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0VXJsUmVzdWx0KVxuICAgICAgICAgICAgICAgICAgICAgIE9uZVNpZ25hbC5fZGVmYXVsdExhdW5jaFVSTCA9IGRlZmF1bHRVcmxSZXN1bHQudmFsdWU7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgfSwgcmVzb2x2ZSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pKVxuICB9LFxuXG4gIF9nZXRMYXN0Tm90aWZpY2F0aW9uczogZnVuY3Rpb24gKGl0ZW1DYWxsYmFjaywgY29tcGxldGVDYWxsYmFjaykge1xuICAgIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpXG4gICAgICAudGhlbihmdW5jdGlvbiBfZ2V0TGFzdE5vdGlmaWNhdGlvbnNfR290VXNlcklkKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICBpZiAodXNlcklkUmVzdWx0KSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9zZW5kVG9PbmVTaWduYWxBcGkoXCJwbGF5ZXJzL1wiICsgdXNlcklkUmVzdWx0LmlkICsgXCIvY2hyb21ld2ViX25vdGlmaWNhdGlvblwiLCBcIkdFVFwiLCBudWxsLCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzcG9uc2UubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgIGl0ZW1DYWxsYmFjayhKU09OLnBhcnNlKHJlc3BvbnNlW2ldKSk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29tcGxldGVDYWxsYmFjaygpO1xuICAgICAgICAgIH0pOyAgLy8gRmFpbGVkIGNhbGxiYWNrXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiRXJyb3I6IGNvdWxkIG5vdCBnZXQgbm90aWZpY2F0aW9uSWRcIik7XG4gICAgICAgICAgY29tcGxldGVDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICAvLyBIVFRQICYgSFRUUFMgLSBSdW5zIG9uIG1haW4gcGFnZVxuICBfbGlzdGVuZXJfcmVjZWl2ZU1lc3NhZ2U6IGZ1bmN0aW9uIHJlY2VpdmVNZXNzYWdlKGV2ZW50KSB7XG4gICAgbG9nLmRlYnVnKFwiX2xpc3RlbmVyX3JlY2VpdmVNZXNzYWdlOiBcIiwgZXZlbnQpO1xuXG4gICAgaWYgKE9uZVNpZ25hbC5faW5pdE9wdGlvbnMgPT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKCFfX0RFVl9fICYmIGV2ZW50Lm9yaWdpbiAhPT0gXCJcIiAmJiBldmVudC5vcmlnaW4gIT09IFwiaHR0cHM6Ly9vbmVzaWduYWwuY29tXCIgJiYgZXZlbnQub3JpZ2luICE9PSBcImh0dHBzOi8vXCIgKyBPbmVTaWduYWwuX2luaXRPcHRpb25zLnN1YmRvbWFpbk5hbWUgKyBcIi5vbmVzaWduYWwuY29tXCIpXG4gICAgICByZXR1cm47XG5cbiAgICBpZiAoZXZlbnQuZGF0YS5vbmVTaWduYWxJbml0UGFnZVJlYWR5KSB7IC8vIE9ubHkgY2FsbGVkIG9uIEhUVFAgcGFnZXMuXG4gICAgICBPbmVTaWduYWwuX2dldERiVmFsdWVzKFwiT3B0aW9uc1wiKVxuICAgICAgICAudGhlbihmdW5jdGlvbiBfbGlzdGVuZXJfcmVjZWl2ZU1lc3NhZ2Uob3B0aW9ucykge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcImN1cnJlbnQgb3B0aW9uc1wiLCBvcHRpb25zKTtcbiAgICAgICAgICBpZiAoIW9wdGlvbnMuZGVmYXVsdFVybClcbiAgICAgICAgICAgIG9wdGlvbnMuZGVmYXVsdFVybCA9IGRvY3VtZW50LlVSTDtcbiAgICAgICAgICBpZiAoIW9wdGlvbnMuZGVmYXVsdFRpdGxlKVxuICAgICAgICAgICAgb3B0aW9ucy5kZWZhdWx0VGl0bGUgPSBkb2N1bWVudC50aXRsZTtcblxuICAgICAgICAgIG9wdGlvbnMucGFyZW50X3VybCA9IGRvY3VtZW50LlVSTDtcbiAgICAgICAgICBsb2cuZGVidWcoXCJQb3N0aW5nIG1lc3NhZ2UgdG8gcG9ydFswXVwiLCBldmVudC5wb3J0c1swXSk7XG4gICAgICAgICAgZXZlbnQucG9ydHNbMF0ucG9zdE1lc3NhZ2Uoe2luaXRPcHRpb25zOiBvcHRpb25zfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGxvZy5lcnJvcignX2xpc3RlbmVyX3JlY2VpdmVNZXNzYWdlOicsIGUpO1xuICAgICAgICB9KTtcblxuICAgICAgdmFyIGV2ZW50RGF0YSA9IGV2ZW50LmRhdGEub25lU2lnbmFsSW5pdFBhZ2VSZWFkeTtcblxuICAgICAgaWYgKGV2ZW50RGF0YS5pc0lmcmFtZSlcbiAgICAgICAgT25lU2lnbmFsLl9pZnJhbWVQb3J0ID0gZXZlbnQucG9ydHNbMF07XG5cbiAgICAgIGlmIChldmVudERhdGEudXNlcklkKVxuICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwidXNlcklkXCIsIGlkOiBldmVudERhdGEudXNlcklkfSk7XG4gICAgICBpZiAoZXZlbnREYXRhLnJlZ2lzdHJhdGlvbklkKVxuICAgICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwicmVnaXN0cmF0aW9uSWRcIiwgaWQ6IGV2ZW50RGF0YS5yZWdpc3RyYXRpb25JZH0pO1xuXG4gICAgICBPbmVTaWduYWwuX2ZpcmVOb3RpZmljYXRpb25FbmFibGVkQ2FsbGJhY2soZXZlbnREYXRhLmlzUHVzaEVuYWJsZWQpO1xuICAgICAgT25lU2lnbmFsLl9zZW5kVW5zZW50VGFncygpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldmVudC5kYXRhLmN1cnJlbnROb3RpZmljYXRpb25QZXJtaXNzaW9uKSAvLyBTdWJkb21haW4gT25seVxuICAgICAgT25lU2lnbmFsLl9maXJlTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrKGV2ZW50LmRhdGEuY3VycmVudE5vdGlmaWNhdGlvblBlcm1pc3Npb24uaXNQdXNoRW5hYmxlZCk7XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5pZHNBdmFpbGFibGUpIHsgLy8gT25seSBjYWxsZWQgb24gSFRUUCBwYWdlcy5cbiAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJPTkVfU0lHTkFMX1NFU1NJT05cIiwgdHJ1ZSk7XG4gICAgICBPbmVTaWduYWwuX3B1dERiVmFsdWUoXCJJZHNcIiwge3R5cGU6IFwidXNlcklkXCIsIGlkOiBldmVudC5kYXRhLmlkc0F2YWlsYWJsZS51c2VySWR9KTtcbiAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJyZWdpc3RyYXRpb25JZFwiLCBpZDogZXZlbnQuZGF0YS5pZHNBdmFpbGFibGUucmVnaXN0cmF0aW9uSWR9KTtcblxuICAgICAgaWYgKE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgd2hpbGUgKE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3Vycl9jYWxsYmFjayA9IE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLnBvcCgpXG4gICAgICAgICAgY3Vycl9jYWxsYmFjayh7XG4gICAgICAgICAgICB1c2VySWQ6IGV2ZW50LmRhdGEuaWRzQXZhaWxhYmxlLnVzZXJJZCxcbiAgICAgICAgICAgIHJlZ2lzdHJhdGlvbklkOiBldmVudC5kYXRhLmlkc0F2YWlsYWJsZS5yZWdpc3RyYXRpb25JZFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBPbmVTaWduYWwuX3NlbmRVbnNlbnRUYWdzKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGV2ZW50LmRhdGEuaHR0cHNQcm9tcHRBY2NlcHRlZCkgeyAvLyBIVFRQUyBPbmx5XG4gICAgICBPbmVTaWduYWwucmVnaXN0ZXJGb3JQdXNoTm90aWZpY2F0aW9ucygpO1xuICAgICAgT25lU2lnbmFsLnNldFN1YnNjcmlwdGlvbih0cnVlKTtcbiAgICAgIChlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ09uZVNpZ25hbC1pZnJhbWUtbW9kYWwnKSkucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtKTtcbiAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2N1c3RvbVByb21wdENsaWNrZWQoJ2dyYW50ZWQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5odHRwc1Byb21wdENhbmNlbGVkKSB7IC8vIEhUVFBTIE9ubHlcbiAgICAgIChlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ09uZVNpZ25hbC1pZnJhbWUtbW9kYWwnKSkucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtKTtcbiAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2N1c3RvbVByb21wdENsaWNrZWQoJ2RlbmllZCcpO1xuICAgIH1cbiAgICBlbHNlIGlmIChldmVudC5kYXRhLmh0dHBQcm9tcHRBY2NlcHRlZCkgeyAvLyBIVFRQIE9ubHlcbiAgICAgIE9uZVNpZ25hbC5fdHJpZ2dlckV2ZW50X2N1c3RvbVByb21wdENsaWNrZWQoJ2dyYW50ZWQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQuZGF0YS5odHRwUHJvbXB0Q2FuY2VsZWQpIHsgLy8gSFRUUCBPbmx5XG4gICAgICBPbmVTaWduYWwuX3RyaWdnZXJFdmVudF9jdXN0b21Qcm9tcHRDbGlja2VkKCdkZW5pZWQnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoT25lU2lnbmFsLl9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2spIC8vIEhUVFAgYW5kIEhUVFBTXG4gICAgICBPbmVTaWduYWwuX25vdGlmaWNhdGlvbk9wZW5lZF9jYWxsYmFjayhldmVudC5kYXRhKTtcbiAgfSxcblxuICBhZGRMaXN0ZW5lckZvck5vdGlmaWNhdGlvbk9wZW5lZDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgT25lU2lnbmFsLl9ub3RpZmljYXRpb25PcGVuZWRfY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBpZiAod2luZG93KSB7XG4gICAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoXCJOb3RpZmljYXRpb25PcGVuZWRcIiwgZG9jdW1lbnQuVVJMKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAobm90aWZpY2F0aW9uT3BlbmVkUmVzdWx0KSB7XG4gICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbk9wZW5lZFJlc3VsdCkge1xuICAgICAgICAgICAgT25lU2lnbmFsLl9kZWxldGVEYlZhbHVlKFwiTm90aWZpY2F0aW9uT3BlbmVkXCIsIGRvY3VtZW50LlVSTCk7XG4gICAgICAgICAgICBPbmVTaWduYWwuX25vdGlmaWNhdGlvbk9wZW5lZF9jYWxsYmFjayhub3RpZmljYXRpb25PcGVuZWRSZXN1bHQuZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICAgIH0pO1xuICAgICAgO1xuICAgIH1cbiAgfSxcblxuICAvLyBTdWJkb21haW4gLSBGaXJlZCBmcm9tIG1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSBpZnJhbWUuXG4gIF9maXJlTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrOiBmdW5jdGlvbiAobm90aWZQZXJtc3Npb24pIHtcbiAgICBpZiAoT25lU2lnbmFsLl9pc05vdGlmaWNhdGlvbkVuYWJsZWRDYWxsYmFjaykge1xuICAgICAgT25lU2lnbmFsLl9pc05vdGlmaWNhdGlvbkVuYWJsZWRDYWxsYmFjayhub3RpZlBlcm1zc2lvbik7XG4gICAgICBPbmVTaWduYWwuX2lzTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrID0gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgZ2V0SWRzQXZhaWxhYmxlOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybjtcblxuICAgIE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLnB1c2goY2FsbGJhY2spO1xuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3VzZXJJZCcpLCBPbmVTaWduYWwuX2dldERiVmFsdWUoJ0lkcycsICdyZWdpc3RyYXRpb25JZCcpXSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIGdldElkc0F2YWlsYWJsZV9Hb3RVc2VyUmVnaXN0cmF0aW9uSWRzKHJlc3VsdHMpIHtcbiAgICAgICAgdmFyIHVzZXJJZFJlc3VsdCA9IHJlc3VsdHNbMF07XG4gICAgICAgIHZhciByZWdpc3RyYXRpb25JZFJlc3VsdCA9IHJlc3VsdHNbMV07XG5cbiAgICAgICAgaWYgKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgIGlmIChyZWdpc3RyYXRpb25JZFJlc3VsdCkge1xuICAgICAgICAgICAgd2hpbGUgKE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgdmFyIGN1cnJfY2FsbGJhY2sgPSBPbmVTaWduYWwuX2lkc0F2YWlsYWJsZV9jYWxsYmFjay5wb3AoKTtcbiAgICAgICAgICAgICAgY3Vycl9jYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySWRSZXN1bHQuaWQsXG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uSWQ6IHJlZ2lzdHJhdGlvbklkUmVzdWx0LmlkXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB3aGlsZSAoT25lU2lnbmFsLl9pZHNBdmFpbGFibGVfY2FsbGJhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICB2YXIgY3Vycl9jYWxsYmFjayA9IE9uZVNpZ25hbC5faWRzQXZhaWxhYmxlX2NhbGxiYWNrLnBvcCgpO1xuICAgICAgICAgICAgICBjdXJyX2NhbGxiYWNrKHt1c2VySWQ6IHVzZXJJZFJlc3VsdC5pZCwgcmVnaXN0cmF0aW9uSWQ6IG51bGx9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICB9KTtcbiAgICA7XG4gIH0sXG5cbiAgZ2V0VGFnczogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAndXNlcklkJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgaWYgKHVzZXJJZFJlc3VsdCkge1xuICAgICAgICAgIE9uZVNpZ25hbC5fc2VuZFRvT25lU2lnbmFsQXBpKFwicGxheWVycy9cIiArIHVzZXJJZFJlc3VsdC5pZCwgJ0dFVCcsIG51bGwsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UudGFncyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfSk7XG4gICAgO1xuICB9LFxuXG4gIGlzUHVzaE5vdGlmaWNhdGlvbnNFbmFibGVkOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBpZiAoIU9uZVNpZ25hbC5pc1B1c2hOb3RpZmljYXRpb25zU3VwcG9ydGVkKCkpIHtcbiAgICAgIGxvZy53YXJuKFwiWW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgcHVzaCBub3RpZmljYXRpb25zLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBTdWJkb21haW5cbiAgICBpZiAoT25lU2lnbmFsLl9pbml0T3B0aW9ucy5zdWJkb21haW5OYW1lICYmICFPbmVTaWduYWwuX2lzQnJvd3NlclNhZmFyaSgpKSB7XG4gICAgICBPbmVTaWduYWwuX2lzTm90aWZpY2F0aW9uRW5hYmxlZENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICBpZiAoT25lU2lnbmFsLl9pZnJhbWVQb3J0KVxuICAgICAgICBPbmVTaWduYWwuX2lmcmFtZVBvcnQucG9zdE1lc3NhZ2Uoe2dldE5vdGlmaWNhdGlvblBlcm1pc3Npb246IHRydWV9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBIVFRQU1xuXG4gICAgUHJvbWlzZS5hbGwoW09uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnSWRzJywgJ3JlZ2lzdHJhdGlvbklkJyksIE9uZVNpZ25hbC5fZ2V0RGJWYWx1ZSgnT3B0aW9ucycsICdzdWJzY3JpcHRpb24nKV0pXG4gICAgICAudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgICB2YXIgcmVnaXN0cmF0aW9uSWRSZXN1bHQgPSByZXN1bHRzWzBdO1xuICAgICAgICB2YXIgc3Vic2NyaXB0aW9uUmVzdWx0ID0gcmVzdWx0c1sxXTtcblxuICAgICAgICBpZiAocmVnaXN0cmF0aW9uSWRSZXN1bHQpIHtcbiAgICAgICAgICBpZiAoc3Vic2NyaXB0aW9uUmVzdWx0ICYmICFzdWJzY3JpcHRpb25SZXN1bHQudmFsdWUpXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZmFsc2UpO1xuXG4gICAgICAgICAgY2FsbGJhY2soTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT0gXCJncmFudGVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIF9pc1N1cHBvcnRlZFNhZmFyaTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzYWZhcmlWZXJzaW9uID0gbmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goXCJWZXJzaW9uLyhbMC05XT8pLiogU2FmYXJpXCIpO1xuICAgIGlmIChzYWZhcmlWZXJzaW9uID09IG51bGwpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKC9pUGhvbmV8aVBhZHxpUG9kL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gKHBhcnNlSW50KHNhZmFyaVZlcnNpb25bMV0pID4gNik7XG4gIH0sXG5cbiAgX2lzQnJvd3NlclNhZmFyaTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNhZmFyaVZlcnNpb24gPSBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaChcIlZlcnNpb24vKFswLTldPykuKiBTYWZhcmlcIik7XG4gICAgcmV0dXJuIHNhZmFyaVZlcnNpb24gIT0gbnVsbCA7XG4gIH0sXG5cbiAgX2lzU3VwcG9ydGVkRmlyZUZveDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBmaXJlRm94VmVyc2lvbiA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goLyhGaXJlZm94XFwvKShbMC05XXsyLH1cXC5bMC05XXsxLH0pLyk7XG4gICAgaWYgKGZpcmVGb3hWZXJzaW9uKVxuICAgICAgcmV0dXJuIHBhcnNlSW50KGZpcmVGb3hWZXJzaW9uWzJdLnN1YnN0cmluZygwLCAyKSkgPiA0MztcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgX2lzQnJvd3NlckZpcmVmb3g6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaXJlRm94VmVyc2lvbiA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goLyhGaXJlZm94XFwvKShbMC05XXsyLH1cXC5bMC05XXsxLH0pLyk7XG4gICAgcmV0dXJuIGZpcmVGb3hWZXJzaW9uICE9IG51bGwgO1xuICB9LFxuXG4gIF9nZXRGaXJlZm94VmVyc2lvbjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpcmVGb3hWZXJzaW9uID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvKEZpcmVmb3hcXC8pKFswLTldezIsfVxcLlswLTldezEsfSkvKTtcbiAgICBpZiAoZmlyZUZveFZlcnNpb24pXG4gICAgICByZXR1cm4gcGFyc2VJbnQoZmlyZUZveFZlcnNpb25bMl0uc3Vic3RyaW5nKDAsIDIpKTtcbiAgICBlbHNlIHJldHVybiAtMTtcbiAgfSxcblxuICBpc1B1c2hOb3RpZmljYXRpb25zU3VwcG9ydGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNocm9tZVZlcnNpb24gPSBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvQ2hyb21lXFwvKC4qPykgLyk7XG5cbiAgICBpZiAoT25lU2lnbmFsLl9pc1N1cHBvcnRlZEZpcmVGb3goKSlcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgaWYgKE9uZVNpZ25hbC5faXNTdXBwb3J0ZWRTYWZhcmkoKSlcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgLy8gQ2hyb21lIGlzIG5vdCBmb3VuZCBpbiBhcHBWZXJzaW9uLlxuICAgIGlmICghY2hyb21lVmVyc2lvbilcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIC8vIE1pY3Jvc29mdCBFZGdlXG4gICAgaWYgKG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9FZGdlLykpXG4gICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBBbmRyb2lkIENocm9tZSBXZWJWaWV3XG4gICAgaWYgKG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC8gd3YvKSlcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIC8vIE9wZXJhXG4gICAgaWYgKG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9PUFJcXC8vKSlcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIC8vIFRoZSB1c2VyIGlzIG9uIGlPU1xuICAgIGlmICgvaVBhZHxpUGhvbmV8aVBvZC8udGVzdChuYXZpZ2F0b3IucGxhdGZvcm0pKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIHBhcnNlSW50KGNocm9tZVZlcnNpb25bMV0uc3Vic3RyaW5nKDAsIDIpKSA+IDQxO1xuICB9LFxuXG4gIF9nZXROb3RpZmljYXRpb25UeXBlczogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgT25lU2lnbmFsLl9nZXRTdWJzY3JpcHRpb24oZnVuY3Rpb24gKGRiX3N1YnNjcmlwdGlvblNldCkge1xuICAgICAgY2FsbGJhY2soZGJfc3Vic2NyaXB0aW9uU2V0ID8gMSA6IC0yKTtcbiAgICB9KTtcbiAgfSxcblxuICBzZXRTdWJzY3JpcHRpb246IGZ1bmN0aW9uIChuZXdTdWJzY3JpcHRpb24pIHtcbiAgICBpZiAoT25lU2lnbmFsLl9pZnJhbWVQb3J0KVxuICAgICAgT25lU2lnbmFsLl9pZnJhbWVQb3J0LnBvc3RNZXNzYWdlKHtzZXRTdWJkb21haW5TdGF0ZToge3NldFN1YnNjcmlwdGlvbjogbmV3U3Vic2NyaXB0aW9ufX0pO1xuICAgIGVsc2Uge1xuICAgICAgT25lU2lnbmFsLl9nZXRTdWJzY3JpcHRpb24oZnVuY3Rpb24gKGN1cnJlbnRTdWJzY3JpcHRpb24pIHtcbiAgICAgICAgaWYgKGN1cnJlbnRTdWJzY3JpcHRpb24gIT0gbmV3U3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiT3B0aW9uc1wiLCB7a2V5OiBcInN1YnNjcmlwdGlvblwiLCB2YWx1ZTogbmV3U3Vic2NyaXB0aW9ufSk7XG4gICAgICAgICAgT25lU2lnbmFsLl9nZXREYlZhbHVlKCdJZHMnLCAndXNlcklkJylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2VySWRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgaWYgKHVzZXJJZFJlc3VsdClcbiAgICAgICAgICAgICAgICBPbmVTaWduYWwuX3NlbmRUb09uZVNpZ25hbEFwaShcInBsYXllcnMvXCIgKyB1c2VySWRSZXN1bHQuaWQsIFwiUFVUXCIsIHtcbiAgICAgICAgICAgICAgICAgIGFwcF9pZDogT25lU2lnbmFsLl9hcHBfaWQsXG4gICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25fdHlwZXM6IG5ld1N1YnNjcmlwdGlvbiA/IDEgOiAtMlxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIHNldFN1YnNjcmlwdGlvblNldENhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgICAgT25lU2lnbmFsLl90cmlnZ2VyRXZlbnRfaW50ZXJuYWxTdWJzY3JpcHRpb25TZXQobmV3U3Vic2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfZ2V0U3Vic2NyaXB0aW9uOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBPbmVTaWduYWwuX2dldERiVmFsdWUoJ09wdGlvbnMnLCAnc3Vic2NyaXB0aW9uJylcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChzdWJzY3JpcHRpb25SZXN1bHQpIHtcbiAgICAgICAgY2FsbGJhY2soIShzdWJzY3JpcHRpb25SZXN1bHQgJiYgc3Vic2NyaXB0aW9uUmVzdWx0LnZhbHVlID09IGZhbHNlKSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH0pO1xuICAgIDtcbiAgfSxcblxuICBfc2FmZVBvc3RNZXNzYWdlOiBmdW5jdGlvbiAoY3JlYXRvciwgZGF0YSwgdGFyZ2V0T3JpZ2luLCByZWNlaXZlcikge1xuICAgIHZhciB0T3JpZ2luID0gdGFyZ2V0T3JpZ2luLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBJZiB3ZSBhcmUgdHJ5aW5nIHRvIHRhcmdldCBhIGh0dHAgc2l0ZSBhbGxvdyB0aGUgaHR0cHMgdmVyc2lvbi4gKHcvIG9yIHcvbyAnd3d3dy4nIHRvbylcbiAgICBpZiAodE9yaWdpbi5zdGFydHNXaXRoKFwiaHR0cDovL1wiKSkge1xuICAgICAgdmFyIHF1ZXJ5RGljdCA9IHt9O1xuICAgICAgbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKS5zcGxpdChcIiZcIikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBxdWVyeURpY3RbaXRlbS5zcGxpdChcIj1cIilbMF1dID0gaXRlbS5zcGxpdChcIj1cIilbMV1cbiAgICAgIH0pO1xuICAgICAgdmFyIHZhbGlkUHJlVVJMUmVnZXggPSAvXmh0dHAoc3wpOlxcL1xcLyh3d3dcXC58KS87XG4gICAgICB0T3JpZ2luID0gdE9yaWdpbi5yZXBsYWNlKHZhbGlkUHJlVVJMUmVnZXgsIHF1ZXJ5RGljdFtcImhvc3RQYWdlUHJvdG9jb2xcIl0pO1xuICAgIH1cblxuICAgIGlmIChyZWNlaXZlcilcbiAgICAgIGNyZWF0b3IucG9zdE1lc3NhZ2UoZGF0YSwgdE9yaWdpbiwgcmVjZWl2ZXIpO1xuICAgIGVsc2VcbiAgICAgIGNyZWF0b3IucG9zdE1lc3NhZ2UoZGF0YSwgdE9yaWdpbik7XG4gIH0sXG5cbiAgX3Byb2Nlc3NfcHVzaGVzOiBmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKVxuICAgICAgT25lU2lnbmFsLnB1c2goYXJyYXlbaV0pO1xuICB9LFxuXG4gIHB1c2g6IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKHR5cGVvZihpdGVtKSA9PSBcImZ1bmN0aW9uXCIpXG4gICAgICBpdGVtKCk7XG4gICAgZWxzZSB7XG4gICAgICB2YXIgZnVuY3Rpb25OYW1lID0gaXRlbS5zaGlmdCgpO1xuICAgICAgT25lU2lnbmFsW2Z1bmN0aW9uTmFtZV0uYXBwbHkobnVsbCwgaXRlbSk7XG4gICAgfVxuICB9XG59O1xuXG5pZiAoX19ERVZfXykge1xuICBPbmVTaWduYWwuX0hPU1RfVVJMID0gX19ERVZfSE9TVF9fICsgXCIvYXBpL3YxL1wiO1xufVxuXG4vLyBJZiBpbXBvcnRlZCBvbiB5b3VyIHBhZ2UuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIilcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIE9uZVNpZ25hbC5fbGlzdGVuZXJfcmVjZWl2ZU1lc3NhZ2UsIGZhbHNlKTtcbmVsc2UgeyAvLyBpZiBpbXBvcnRlZCBmcm9tIHRoZSBzZXJ2aWNlIHdvcmtlci5cbiAgaW1wb3J0U2NyaXB0cygnaHR0cHM6Ly9jZG4ub25lc2lnbmFsLmNvbS9zZGtzL3NlcnZpY2V3b3JrZXItY2FjaGUtcG9seWZpbGwuanMnKTtcblxuICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ3B1c2gnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBPbmVTaWduYWwuX2hhbmRsZUdDTU1lc3NhZ2Uoc2VsZiwgZXZlbnQpO1xuICB9KTtcbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdub3RpZmljYXRpb25jbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIE9uZVNpZ25hbC5faGFuZGxlTm90aWZpY2F0aW9uT3BlbmVkKGV2ZW50KTtcbiAgfSk7XG5cbiAgdmFyIGlzU1dvblN1YmRvbWFpbiA9IGxvY2F0aW9uLmhyZWYubWF0Y2goL2h0dHBzXFw6XFwvXFwvLipcXC5vbmVzaWduYWwuY29tXFwvc2Rrc1xcLy8pICE9IG51bGw7XG4gIGlmIChfX0RFVl9fKVxuICAgIGlzU1dvblN1YmRvbWFpbiA9IHRydWU7XG5cbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdpbnN0YWxsJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgbG9nLmRlYnVnKFwiT25lU2lnbmFsIEluc3RhbGxlZCBzZXJ2aWNlIHdvcmtlcjogXCIgKyBPbmVTaWduYWwuX1ZFUlNJT04pO1xuICAgIGlmIChzZWxmLmxvY2F0aW9uLnBhdGhuYW1lLmluZGV4T2YoXCJPbmVTaWduYWxTREtXb3JrZXIuanNcIikgPiAtMSlcbiAgICAgIE9uZVNpZ25hbC5fcHV0RGJWYWx1ZShcIklkc1wiLCB7dHlwZTogXCJXT1JLRVIxX09ORV9TSUdOQUxfU1dfVkVSU0lPTlwiLCBpZDogT25lU2lnbmFsLl9WRVJTSU9OfSk7XG4gICAgZWxzZVxuICAgICAgT25lU2lnbmFsLl9wdXREYlZhbHVlKFwiSWRzXCIsIHt0eXBlOiBcIldPUktFUjJfT05FX1NJR05BTF9TV19WRVJTSU9OXCIsIGlkOiBPbmVTaWduYWwuX1ZFUlNJT059KTtcblxuICAgIGlmIChpc1NXb25TdWJkb21haW4pIHtcbiAgICAgIGV2ZW50LndhaXRVbnRpbChcbiAgICAgICAgY2FjaGVzLm9wZW4oXCJPbmVTaWduYWxfXCIgKyBPbmVTaWduYWwuX1ZFUlNJT04pLnRoZW4oZnVuY3Rpb24gKGNhY2hlKSB7XG4gICAgICAgICAgcmV0dXJuIGNhY2hlLmFkZEFsbChbXG4gICAgICAgICAgICAnL3Nka3MvaW5pdE9uZVNpZ25hbEh0dHBJZnJhbWUnLFxuICAgICAgICAgICAgJy9zZGtzL2luaXRPbmVTaWduYWxIdHRwSWZyYW1lP3Nlc3Npb249KicsXG4gICAgICAgICAgICAnL3Nka3MvbWFuaWZlc3RfanNvbiddKTtcbiAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChpc1NXb25TdWJkb21haW4pIHtcbiAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2ZldGNoJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBldmVudC5yZXNwb25kV2l0aChcbiAgICAgICAgY2FjaGVzLm1hdGNoKGV2ZW50LnJlcXVlc3QpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvLyBDYWNoZSBoaXQgLSByZXR1cm4gcmVzcG9uc2VcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSlcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuXG4gICAgICAgICAgICByZXR1cm4gZmV0Y2goZXZlbnQucmVxdWVzdCk7XG4gICAgICAgICAgfVxuICAgICAgICApXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbn1cblxuaWYgKF90ZW1wX09uZVNpZ25hbClcbiAgT25lU2lnbmFsLl9wcm9jZXNzX3B1c2hlcyhfdGVtcF9PbmVTaWduYWwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9uZVNpZ25hbDtcblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NyYy9zZGsuanNcbiAqKi8iLCIvKlxyXG4qIGxvZ2xldmVsIC0gaHR0cHM6Ly9naXRodWIuY29tL3BpbXRlcnJ5L2xvZ2xldmVsXHJcbipcclxuKiBDb3B5cmlnaHQgKGMpIDIwMTMgVGltIFBlcnJ5XHJcbiogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxyXG4qL1xyXG4oZnVuY3Rpb24gKHJvb3QsIGRlZmluaXRpb24pIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzICYmIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByb290LmxvZyA9IGRlZmluaXRpb24oKTtcclxuICAgIH1cclxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcclxuICAgIHZhciB1bmRlZmluZWRUeXBlID0gXCJ1bmRlZmluZWRcIjtcclxuXHJcbiAgICBmdW5jdGlvbiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBXZSBjYW4ndCBidWlsZCBhIHJlYWwgbWV0aG9kIHdpdGhvdXQgYSBjb25zb2xlIHRvIGxvZyB0b1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZVttZXRob2ROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBiaW5kTWV0aG9kKGNvbnNvbGUsIG1ldGhvZE5hbWUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZS5sb2cgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCAnbG9nJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vb3A7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGJpbmRNZXRob2Qob2JqLCBtZXRob2ROYW1lKSB7XHJcbiAgICAgICAgdmFyIG1ldGhvZCA9IG9ialttZXRob2ROYW1lXTtcclxuICAgICAgICBpZiAodHlwZW9mIG1ldGhvZC5iaW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBtZXRob2QuYmluZChvYmopO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuY2FsbChtZXRob2QsIG9iaik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIE1pc3NpbmcgYmluZCBzaGltIG9yIElFOCArIE1vZGVybml6ciwgZmFsbGJhY2sgdG8gd3JhcHBpbmdcclxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KG1ldGhvZCwgW29iaiwgYXJndW1lbnRzXSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHRoZXNlIHByaXZhdGUgZnVuY3Rpb25zIGFsd2F5cyBuZWVkIGB0aGlzYCB0byBiZSBzZXQgcHJvcGVybHlcclxuXHJcbiAgICBmdW5jdGlvbiBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzKG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSB1bmRlZmluZWRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICByZXBsYWNlTG9nZ2luZ01ldGhvZHMuY2FsbCh0aGlzLCBsZXZlbCwgbG9nZ2VyTmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzW21ldGhvZE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlcGxhY2VMb2dnaW5nTWV0aG9kcyhsZXZlbCwgbG9nZ2VyTmFtZSkge1xyXG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsb2dNZXRob2RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBtZXRob2ROYW1lID0gbG9nTWV0aG9kc1tpXTtcclxuICAgICAgICAgICAgdGhpc1ttZXRob2ROYW1lXSA9IChpIDwgbGV2ZWwpID9cclxuICAgICAgICAgICAgICAgIG5vb3AgOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVmYXVsdE1ldGhvZEZhY3RvcnkobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpIHtcclxuICAgICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xyXG4gICAgICAgIHJldHVybiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHx8XHJcbiAgICAgICAgICAgICAgIGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgbG9nTWV0aG9kcyA9IFtcclxuICAgICAgICBcInRyYWNlXCIsXHJcbiAgICAgICAgXCJkZWJ1Z1wiLFxyXG4gICAgICAgIFwiaW5mb1wiLFxyXG4gICAgICAgIFwid2FyblwiLFxyXG4gICAgICAgIFwiZXJyb3JcIlxyXG4gICAgXTtcclxuXHJcbiAgICBmdW5jdGlvbiBMb2dnZXIobmFtZSwgZGVmYXVsdExldmVsLCBmYWN0b3J5KSB7XHJcbiAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgdmFyIGN1cnJlbnRMZXZlbDtcclxuICAgICAgdmFyIHN0b3JhZ2VLZXkgPSBcImxvZ2xldmVsXCI7XHJcbiAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgc3RvcmFnZUtleSArPSBcIjpcIiArIG5hbWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWxOdW0pIHtcclxuICAgICAgICAgIHZhciBsZXZlbE5hbWUgPSAobG9nTWV0aG9kc1tsZXZlbE51bV0gfHwgJ3NpbGVudCcpLnRvVXBwZXJDYXNlKCk7XHJcblxyXG4gICAgICAgICAgLy8gVXNlIGxvY2FsU3RvcmFnZSBpZiBhdmFpbGFibGVcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZVtzdG9yYWdlS2V5XSA9IGxldmVsTmFtZTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XHJcblxyXG4gICAgICAgICAgLy8gVXNlIHNlc3Npb24gY29va2llIGFzIGZhbGxiYWNrXHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPVxyXG4gICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9XCIgKyBsZXZlbE5hbWUgKyBcIjtcIjtcclxuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gZ2V0UGVyc2lzdGVkTGV2ZWwoKSB7XHJcbiAgICAgICAgICB2YXIgc3RvcmVkTGV2ZWw7XHJcblxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2Vbc3RvcmFnZUtleV07XHJcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XHJcblxyXG4gICAgICAgICAgaWYgKHR5cGVvZiBzdG9yZWRMZXZlbCA9PT0gdW5kZWZpbmVkVHlwZSkge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBjb29raWUgPSB3aW5kb3cuZG9jdW1lbnQuY29va2llO1xyXG4gICAgICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSBjb29raWUuaW5kZXhPZihcclxuICAgICAgICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdG9yYWdlS2V5KSArIFwiPVwiKTtcclxuICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IC9eKFteO10rKS8uZXhlYyhjb29raWUuc2xpY2UobG9jYXRpb24pKVsxXTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBJZiB0aGUgc3RvcmVkIGxldmVsIGlzIG5vdCB2YWxpZCwgdHJlYXQgaXQgYXMgaWYgbm90aGluZyB3YXMgc3RvcmVkLlxyXG4gICAgICAgICAgaWYgKHNlbGYubGV2ZWxzW3N0b3JlZExldmVsXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHN0b3JlZExldmVsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvKlxyXG4gICAgICAgKlxyXG4gICAgICAgKiBQdWJsaWMgQVBJXHJcbiAgICAgICAqXHJcbiAgICAgICAqL1xyXG5cclxuICAgICAgc2VsZi5sZXZlbHMgPSB7IFwiVFJBQ0VcIjogMCwgXCJERUJVR1wiOiAxLCBcIklORk9cIjogMiwgXCJXQVJOXCI6IDMsXHJcbiAgICAgICAgICBcIkVSUk9SXCI6IDQsIFwiU0lMRU5UXCI6IDV9O1xyXG5cclxuICAgICAgc2VsZi5tZXRob2RGYWN0b3J5ID0gZmFjdG9yeSB8fCBkZWZhdWx0TWV0aG9kRmFjdG9yeTtcclxuXHJcbiAgICAgIHNlbGYuZ2V0TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gY3VycmVudExldmVsO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VsZi5zZXRMZXZlbCA9IGZ1bmN0aW9uIChsZXZlbCwgcGVyc2lzdCkge1xyXG4gICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJzdHJpbmdcIiAmJiBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgbGV2ZWwgPSBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09IFwibnVtYmVyXCIgJiYgbGV2ZWwgPj0gMCAmJiBsZXZlbCA8PSBzZWxmLmxldmVscy5TSUxFTlQpIHtcclxuICAgICAgICAgICAgICBjdXJyZW50TGV2ZWwgPSBsZXZlbDtcclxuICAgICAgICAgICAgICBpZiAocGVyc2lzdCAhPT0gZmFsc2UpIHsgIC8vIGRlZmF1bHRzIHRvIHRydWVcclxuICAgICAgICAgICAgICAgICAgcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHJlcGxhY2VMb2dnaW5nTWV0aG9kcy5jYWxsKHNlbGYsIGxldmVsLCBuYW1lKTtcclxuICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUgJiYgbGV2ZWwgPCBzZWxmLmxldmVscy5TSUxFTlQpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29uc29sZSBhdmFpbGFibGUgZm9yIGxvZ2dpbmdcIjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRocm93IFwibG9nLnNldExldmVsKCkgY2FsbGVkIHdpdGggaW52YWxpZCBsZXZlbDogXCIgKyBsZXZlbDtcclxuICAgICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHNlbGYuc2V0RGVmYXVsdExldmVsID0gZnVuY3Rpb24gKGxldmVsKSB7XHJcbiAgICAgICAgICBpZiAoIWdldFBlcnNpc3RlZExldmVsKCkpIHtcclxuICAgICAgICAgICAgICBzZWxmLnNldExldmVsKGxldmVsLCBmYWxzZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBzZWxmLmVuYWJsZUFsbCA9IGZ1bmN0aW9uKHBlcnNpc3QpIHtcclxuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuVFJBQ0UsIHBlcnNpc3QpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VsZi5kaXNhYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xyXG4gICAgICAgICAgc2VsZi5zZXRMZXZlbChzZWxmLmxldmVscy5TSUxFTlQsIHBlcnNpc3QpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHRoZSByaWdodCBsZXZlbFxyXG4gICAgICB2YXIgaW5pdGlhbExldmVsID0gZ2V0UGVyc2lzdGVkTGV2ZWwoKTtcclxuICAgICAgaWYgKGluaXRpYWxMZXZlbCA9PSBudWxsKSB7XHJcbiAgICAgICAgICBpbml0aWFsTGV2ZWwgPSBkZWZhdWx0TGV2ZWwgPT0gbnVsbCA/IFwiV0FSTlwiIDogZGVmYXVsdExldmVsO1xyXG4gICAgICB9XHJcbiAgICAgIHNlbGYuc2V0TGV2ZWwoaW5pdGlhbExldmVsLCBmYWxzZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLypcclxuICAgICAqXHJcbiAgICAgKiBQYWNrYWdlLWxldmVsIEFQSVxyXG4gICAgICpcclxuICAgICAqL1xyXG5cclxuICAgIHZhciBkZWZhdWx0TG9nZ2VyID0gbmV3IExvZ2dlcigpO1xyXG5cclxuICAgIHZhciBfbG9nZ2Vyc0J5TmFtZSA9IHt9O1xyXG4gICAgZGVmYXVsdExvZ2dlci5nZXRMb2dnZXIgPSBmdW5jdGlvbiBnZXRMb2dnZXIobmFtZSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIiB8fCBuYW1lID09PSBcIlwiKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiWW91IG11c3Qgc3VwcGx5IGEgbmFtZSB3aGVuIGNyZWF0aW5nIGEgbG9nZ2VyLlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsb2dnZXIgPSBfbG9nZ2Vyc0J5TmFtZVtuYW1lXTtcclxuICAgICAgICBpZiAoIWxvZ2dlcikge1xyXG4gICAgICAgICAgbG9nZ2VyID0gX2xvZ2dlcnNCeU5hbWVbbmFtZV0gPSBuZXcgTG9nZ2VyKFxyXG4gICAgICAgICAgICBuYW1lLCBkZWZhdWx0TG9nZ2VyLmdldExldmVsKCksIGRlZmF1bHRMb2dnZXIubWV0aG9kRmFjdG9yeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsb2dnZXI7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdyYWIgdGhlIGN1cnJlbnQgZ2xvYmFsIGxvZyB2YXJpYWJsZSBpbiBjYXNlIG9mIG92ZXJ3cml0ZVxyXG4gICAgdmFyIF9sb2cgPSAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSkgPyB3aW5kb3cubG9nIDogdW5kZWZpbmVkO1xyXG4gICAgZGVmYXVsdExvZ2dlci5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IHVuZGVmaW5lZFR5cGUgJiZcclxuICAgICAgICAgICAgICAgd2luZG93LmxvZyA9PT0gZGVmYXVsdExvZ2dlcikge1xyXG4gICAgICAgICAgICB3aW5kb3cubG9nID0gX2xvZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gZGVmYXVsdExvZ2dlcjtcclxufSkpO1xyXG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanNcbiAqKiBtb2R1bGUgaWQgPSAyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCIvKlxuIExpbWl0U3RvcmUucHV0KCdjb2xvcmFkbycsICdyb2NreScpO1xuIFtcInJvY2t5XCJdXG4gTGltaXRTdG9yZS5wdXQoJ2NvbG9yYWRvJywgJ21vdW50YWluJyk7XG4gW1wicm9ja3lcIiwgXCJtb3VudGFpblwiXVxuIExpbWl0U3RvcmUucHV0KCdjb2xvcmFkbycsICduYXRpb25hbCcpO1xuIFtcIm1vdW50YWluXCIsIFwibmF0aW9uYWxcIl1cbiBMaW1pdFN0b3JlLnB1dCgnY29sb3JhZG8nLCAncGFyaycpO1xuIFtcIm5hdGlvbmFsXCIsIFwicGFya1wiXVxuICovXG5mdW5jdGlvbiBMaW1pdFN0b3JlKCkge1xufVxuXG5MaW1pdFN0b3JlLnN0b3JlID0ge307XG5MaW1pdFN0b3JlLkxJTUlUID0gMjtcblxuTGltaXRTdG9yZS5wdXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICBpZiAoTGltaXRTdG9yZS5zdG9yZVtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICBMaW1pdFN0b3JlLnN0b3JlW2tleV0gPSBbbnVsbCwgbnVsbF07XG4gIH1cbiAgTGltaXRTdG9yZS5zdG9yZVtrZXldLnB1c2godmFsdWUpO1xuICBpZiAoTGltaXRTdG9yZS5zdG9yZVtrZXldLmxlbmd0aCA9PSBMaW1pdFN0b3JlLkxJTUlUICsgMSkge1xuICAgIExpbWl0U3RvcmUuc3RvcmVba2V5XS5zaGlmdCgpO1xuICB9XG4gIHJldHVybiBMaW1pdFN0b3JlLnN0b3JlW2tleV07XG59O1xuXG5MaW1pdFN0b3JlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIExpbWl0U3RvcmUuc3RvcmVba2V5XTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IExpbWl0U3RvcmU7XG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zcmMvbGltaXRTdG9yZS5qc1xuICoqLyIsImlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ3VzdG9tRXZlbnQoZXZlbnQsIHBhcmFtcykge1xuICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbHM6IHVuZGVmaW5lZH07XG4gICAgICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWxzKTtcbiAgICAgIHJldHVybiBldnQ7XG4gICAgfVxuXG4gICAgQ3VzdG9tRXZlbnQucHJvdG90eXBlID0gd2luZG93LkV2ZW50LnByb3RvdHlwZTtcblxuICAgIHdpbmRvdy5DdXN0b21FdmVudCA9IEN1c3RvbUV2ZW50O1xuICB9KSgpO1xufVxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc3JjL2V2ZW50cy5qc1xuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsW1wiT25lU2lnbmFsXCJdID0gcmVxdWlyZShcIi0hL1VzZXJzL2pwYW5nL2NvZGUvT25lU2lnbmFsLVdlYnNpdGUtU0RLL25vZGVfbW9kdWxlcy9iYWJlbC1sb2FkZXIvaW5kZXguanM/e1xcXCJwcmVzZXRzXFxcIjpbXFxcImVzMjAxNVxcXCJdLFxcXCJjYWNoZURpcmVjdG9yeVxcXCI6dHJ1ZX0hL1VzZXJzL2pwYW5nL2NvZGUvT25lU2lnbmFsLVdlYnNpdGUtU0RLL3NyYy9zZGsuanNcIik7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vZXhwb3NlLWxvYWRlcj9PbmVTaWduYWwhLi9zcmMvc2RrLmpzXG4gKiogbW9kdWxlIGlkID0gNVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==