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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
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
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 54);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (true) {
        !(__WEBPACK_AMD_DEFINE_FACTORY__ = (definition),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
				__WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
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


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const Browser = __webpack_require__(11);
const Environment_1 = __webpack_require__(8);
const Database_1 = __webpack_require__(7);
const SubscriptionHelper_1 = __webpack_require__(6);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
const TimeoutError_1 = __webpack_require__(33);
function isArray(variable) {
    return Object.prototype.toString.call(variable) === '[object Array]';
}
exports.isArray = isArray;
var decodeTextArea = null;
function decodeHtmlEntities(text) {
    if (Environment_1.default.isBrowser()) {
        if (!decodeTextArea) {
            decodeTextArea = document.createElement("textarea");
        }
    }
    if (decodeTextArea) {
        decodeTextArea.innerHTML = text;
        return decodeTextArea.value;
    }
    else {
        // Not running in a browser environment, text cannot be decoded
        return text;
    }
}
exports.decodeHtmlEntities = decodeHtmlEntities;
function isPushNotificationsSupported() {
    /**
     * It's possible a browser's user agent is modified, so we do some basic feature detection to make sure initializing
     * the SDK won't fail. Promises are required to initialize the SDK.
     */
    if (typeof window.Promise === "undefined") {
        return false;
    }
    /*
     TODO: Make this a little neater
     During testing, the browser object may be initialized before the userAgent is injected
    */
    if (Browser.name === '' && Browser.version === '') {
        var browser = Browser._detect(navigator.userAgent);
    }
    else {
        var browser = Browser;
    }
    let userAgent = navigator.userAgent || '';
    if (!browser.safari && typeof navigator.serviceWorker === "undefined") {
        /**
         * Browsers like Firefox Extended Support Release don't support service workers
         */
        return false;
    }
    if (browser.ios || browser.ipod || browser.iphone || browser.ipad)
        return false;
    if (browser.msedge || browser.msie)
        return false;
    // Facebook in-app browser
    if ((userAgent.indexOf("FBAN") > -1) || (userAgent.indexOf("FBAV") > -1)) {
        return false;
    }
    // Android Chrome WebView
    if (navigator.appVersion.match(/ wv/))
        return false;
    /* Firefox on Android push notifications not supported until at least 48: https://bugzilla.mozilla.org/show_bug.cgi?id=1206207#c6 */
    if (browser.firefox && Number(browser.version) < 48 && (browser.mobile || browser.tablet)) {
        return false;
    }
    if (browser.firefox && Number(browser.version) >= 44)
        return true;
    if (browser.safari && Number(browser.version) >= 7.1)
        return true;
    // Web push is supported in Samsung Internet for Android 4.0+
    // http://developer.samsung.com/internet/android/releases
    if (browser.samsungBrowser && Number(browser.version) >= 4) {
        return true;
    }
    if ((browser.chrome || browser.chromium) && Number(browser.version) >= 42)
        return true;
    if (browser.yandexbrowser && Number(browser.version) >= 15.12)
        return true;
    // https://www.chromestatus.com/feature/5416033485586432
    if (browser.opera && (browser.mobile || browser.tablet) && Number(browser.version) >= 37 ||
        browser.opera && Number(browser.version) >= 42)
        return true;
    // The earliest version of Vivaldi uses around Chrome 50
    if (browser.vivaldi)
        return true;
    return false;
}
exports.isPushNotificationsSupported = isPushNotificationsSupported;
function removeDomElement(selector) {
    var els = document.querySelectorAll(selector);
    if (els.length > 0) {
        for (let i = 0; i < els.length; i++)
            els[i].parentNode.removeChild(els[i]);
    }
}
exports.removeDomElement = removeDomElement;
/**
 * Helper method for public APIs that waits until OneSignal is initialized, rejects if push notifications are
 * not supported, and wraps these tasks in a Promise.
 */
function awaitOneSignalInitAndSupported() {
    return new Promise((resolve, reject) => {
        if (!OneSignal.initialized) {
            OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, resolve);
        }
        else {
            resolve();
        }
    });
}
exports.awaitOneSignalInitAndSupported = awaitOneSignalInitAndSupported;
/**
 * JSON.stringify() but converts functions to "[Function]" so they aren't lost.
 * Helps when logging method calls.
 */
function stringify(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'function') {
            return "[Function]";
        }
        else {
            return value;
        }
    }, 4);
}
exports.stringify = stringify;
function executeCallback(callback, ...args) {
    if (callback) {
        return callback.apply(null, args);
    }
}
exports.executeCallback = executeCallback;
function logMethodCall(methodName, ...args) {
    return log.debug(`Called %c${methodName}(${args.map(stringify).join(', ')})`, getConsoleStyle('code'), '.');
}
exports.logMethodCall = logMethodCall;
function isValidEmail(email) {
    return !!email &&
        !!email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/);
}
exports.isValidEmail = isValidEmail;
function addDomElement(targetSelectorOrElement, addOrder, elementHtml) {
    if (typeof targetSelectorOrElement === 'string')
        document.querySelector(targetSelectorOrElement).insertAdjacentHTML(addOrder, elementHtml);
    else if (typeof targetSelectorOrElement === 'object')
        targetSelectorOrElement.insertAdjacentHTML(addOrder, elementHtml);
    else
        throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}
exports.addDomElement = addDomElement;
function clearDomElementChildren(targetSelectorOrElement) {
    if (typeof targetSelectorOrElement === 'string') {
        var element = document.querySelector(targetSelectorOrElement);
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    else if (typeof targetSelectorOrElement === 'object') {
        while (targetSelectorOrElement.firstChild) {
            targetSelectorOrElement.removeChild(targetSelectorOrElement.firstChild);
        }
    }
    else
        throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}
exports.clearDomElementChildren = clearDomElementChildren;
function addCssClass(targetSelectorOrElement, cssClass) {
    if (typeof targetSelectorOrElement === 'string')
        document.querySelector(targetSelectorOrElement).classList.add(cssClass);
    else if (typeof targetSelectorOrElement === 'object')
        targetSelectorOrElement.classList.add(cssClass);
    else
        throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}
exports.addCssClass = addCssClass;
function removeCssClass(targetSelectorOrElement, cssClass) {
    if (typeof targetSelectorOrElement === 'string')
        document.querySelector(targetSelectorOrElement).classList.remove(cssClass);
    else if (typeof targetSelectorOrElement === 'object')
        targetSelectorOrElement.classList.remove(cssClass);
    else
        throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}
exports.removeCssClass = removeCssClass;
function hasCssClass(targetSelectorOrElement, cssClass) {
    if (typeof targetSelectorOrElement === 'string')
        return document.querySelector(targetSelectorOrElement).classList.contains(cssClass);
    else if (typeof targetSelectorOrElement === 'object')
        return targetSelectorOrElement.classList.contains(cssClass);
    else
        throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}
exports.hasCssClass = hasCssClass;
var DEVICE_TYPES = {
    CHROME: 5,
    SAFARI: 7,
    FIREFOX: 8,
};
function getDeviceTypeForBrowser() {
    if (Browser.chrome ||
        Browser.yandexbrowser ||
        Browser.opera ||
        Browser.vivaldi ||
        Browser.samsungBrowser ||
        Browser.chromium) {
        return DEVICE_TYPES.CHROME;
    }
    else if (Browser.firefox) {
        return DEVICE_TYPES.FIREFOX;
    }
    else if (Browser.safari) {
        return DEVICE_TYPES.SAFARI;
    }
    else {
        log.error(`OneSignal: Unable to associate device type for browser ${Browser.name} ${Browser.version}`);
    }
}
exports.getDeviceTypeForBrowser = getDeviceTypeForBrowser;
function getConsoleStyle(style) {
    if (style == 'code') {
        return `padding: 0 1px 1px 5px;border: 1px solid #ddd;border-radius: 3px;font-family: Monaco,"DejaVu Sans Mono","Courier New",monospace;color: #444;`;
    }
    else if (style == 'bold') {
        return `font-weight: 600;color: rgb(51, 51, 51);`;
    }
    else if (style == 'alert') {
        return `font-weight: 600;color: red;`;
    }
    else if (style == 'event') {
        return `color: green;`;
    }
    else if (style == 'postmessage') {
        return `color: orange;`;
    }
    else if (style == 'serviceworkermessage') {
        return `color: purple;`;
    }
}
exports.getConsoleStyle = getConsoleStyle;
/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
function delay(durationMs) {
    return new Promise((resolve) => {
        setTimeout(resolve, durationMs);
    });
}
exports.delay = delay;
function nothing() {
    return Promise.resolve();
}
exports.nothing = nothing;
function timeoutPromise(promise, milliseconds) {
    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new TimeoutError_1.default());
        }, milliseconds);
    });
    return Promise.race([promise, timeoutPromise]);
}
exports.timeoutPromise = timeoutPromise;
function when(condition, promiseIfTrue, promiseIfFalse) {
    if (promiseIfTrue === undefined)
        promiseIfTrue = nothing();
    if (promiseIfFalse === undefined)
        promiseIfFalse = nothing();
    return (condition ? promiseIfTrue : promiseIfFalse);
}
exports.when = when;
/**
 * Returns true if match is in string; otherwise, returns false.
 */
function contains(indexOfAble, match) {
    if (!indexOfAble)
        return false;
    return indexOfAble.indexOf(match) !== -1;
}
exports.contains = contains;
/**
 * Returns the current object without keys that have undefined values.
 * Regardless of whether the return result is used, the passed-in object is destructively modified.
 * Only affects keys that the object directly contains (i.e. not those inherited via the object's prototype).
 * @param object
 */
function trimUndefined(object) {
    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            if (object[property] === undefined) {
                delete object[property];
            }
        }
    }
    return object;
}
exports.trimUndefined = trimUndefined;
/**
 * Returns true if the UUID is a string of 36 characters;
 * @param uuid
 * @returns {*|boolean}
 */
function isValidUuid(uuid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid);
}
exports.isValidUuid = isValidUuid;
function getUrlQueryParam(name) {
    let url = window.location.href;
    url = url.toLowerCase(); // This is just to avoid case sensitiveness
    name = name.replace(/[\[\]]/g, "\\$&").toLowerCase(); // This is just to avoid case sensitiveness for query parameter name
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
exports.getUrlQueryParam = getUrlQueryParam;
/**
 * Wipe OneSignal-related IndexedDB data on the "correct" computed origin, but OneSignal must be initialized first to use.
 */
function wipeIndexedDb() {
    log.warn('OneSignal: Wiping IndexedDB data.');
    return Promise.all([
        Database_1.default.remove('Ids'),
        Database_1.default.remove('NotificationOpened'),
        Database_1.default.remove('Options')
    ]);
}
exports.wipeIndexedDb = wipeIndexedDb;
/**
 * Capitalizes the first letter of the string.
 * @returns {string} The string with the first letter capitalized.
 */
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
exports.capitalize = capitalize;
/**
 * Unsubscribe from push notifications without removing the active service worker.
 */
function unsubscribeFromPush() {
    log.warn('OneSignal: Unsubscribing from push.');
    if (SdkEnvironment_1.default.getWindowEnv() !== WindowEnvironmentKind_1.WindowEnvironmentKind.ServiceWorker) {
        return self.registration.pushManager.getSubscription()
            .then(subscription => {
            if (subscription) {
                return subscription.unsubscribe();
            }
            else
                throw new Error('Cannot unsubscribe because not subscribed.');
        });
    }
    else {
        if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
            return new Promise((resolve, reject) => {
                log.debug("Unsubscribe from push got called, and we're going to remotely execute it in HTTPS iFrame.");
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, null, reply => {
                    log.debug("Unsubscribe from push succesfully remotely executed.");
                    if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                        resolve();
                    }
                    else {
                        reject('Failed to remotely unsubscribe from push.');
                    }
                });
            });
        }
        else {
            if (!navigator.serviceWorker || !navigator.serviceWorker.controller)
                return Promise.resolve();
            return navigator.serviceWorker.ready
                .then(registration => registration.pushManager)
                .then(pushManager => pushManager.getSubscription())
                .then(subscription => {
                if (subscription) {
                    return subscription.unsubscribe();
                }
            });
        }
    }
}
exports.unsubscribeFromPush = unsubscribeFromPush;
/**
 * Unregisters the active service worker.
 */
function wipeServiceWorker() {
    log.warn('OneSignal: Unregistering service worker.');
    if (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame) {
        return;
    }
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller)
        return Promise.resolve();
    return navigator.serviceWorker.ready
        .then(registration => registration.unregister());
}
exports.wipeServiceWorker = wipeServiceWorker;
/**
 * Unsubscribe from push notifications and remove any active service worker.
 */
function wipeServiceWorkerAndUnsubscribe() {
    return Promise.all([
        unsubscribeFromPush(),
        wipeServiceWorker()
    ]);
}
exports.wipeServiceWorkerAndUnsubscribe = wipeServiceWorkerAndUnsubscribe;
function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
exports.wait = wait;
/**
 * Returns the part of the string after the first occurence of the specified search.
 * @param string The entire string.
 * @param search The text returned will be everything *after* search.
 * e.g. substringAfter('A white fox', 'white') => ' fox'
 */
function substringAfter(string, search) {
    return string.substr(string.indexOf(search) + search.length);
}
exports.substringAfter = substringAfter;
function once(targetSelectorOrElement, event, task, manualDestroy = false) {
    if (!event) {
        log.error('Cannot call on() with no event: ', event);
    }
    if (!task) {
        log.error('Cannot call on() with no task: ', task);
    }
    if (typeof targetSelectorOrElement === 'string') {
        let els = document.querySelectorAll(targetSelectorOrElement);
        if (els.length > 0) {
            for (let i = 0; i < els.length; i++)
                once(els[i], event, task);
        }
    }
    else if (isArray(targetSelectorOrElement)) {
        for (let i = 0; i < targetSelectorOrElement.length; i++)
            once(targetSelectorOrElement[i], event, task);
    }
    else if (typeof targetSelectorOrElement === 'object') {
        var taskWrapper = (function () {
            var internalTaskFunction = function (e) {
                var destroyEventListener = function () {
                    targetSelectorOrElement.removeEventListener(e.type, taskWrapper);
                };
                if (!manualDestroy) {
                    destroyEventListener();
                }
                task(e, destroyEventListener);
            };
            return internalTaskFunction;
        })();
        targetSelectorOrElement.addEventListener(event, taskWrapper);
    }
    else
        throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}
exports.once = once;
/**
 * Returns the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
function getSdkLoadCount() {
    return window.__oneSignalSdkLoadCount || 0;
}
exports.getSdkLoadCount = getSdkLoadCount;
async function awaitSdkEvent(eventName, predicate) {
    return await new Promise((resolve, reject) => {
        OneSignal.once(eventName, event => {
            if (predicate) {
                const predicateResult = predicate(event);
                if (predicateResult)
                    resolve(event);
            }
            else
                resolve(event);
        });
    });
}
exports.awaitSdkEvent = awaitSdkEvent;
/**
 * Increments the counter describing the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
function incrementSdkLoadCount() {
    window.__oneSignalSdkLoadCount = getSdkLoadCount() + 1;
}
exports.incrementSdkLoadCount = incrementSdkLoadCount;
/**
 * Returns the email with all whitespace removed and converted to lower case.
 */
function prepareEmailForHashing(email) {
    return email.replace(/\s/g, '').toLowerCase();
}
exports.prepareEmailForHashing = prepareEmailForHashing;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/utils.js.map

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const BuildEnvironmentKind_1 = __webpack_require__(23);
const TestEnvironmentKind_1 = __webpack_require__(41);
const WindowEnvironmentKind_1 = __webpack_require__(5);
class SdkEnvironment {
    /**
     * Returns development, staging, or production.
     *
     * The magic constants used to detect the environment is set or unset when
     * building the SDK.
     */
    static getBuildEnv() {
        if ("boolean" !== undefined && false) {
            return BuildEnvironmentKind_1.BuildEnvironmentKind.Development;
        }
        else if ("boolean" !== undefined && false) {
            return BuildEnvironmentKind_1.BuildEnvironmentKind.Staging;
        }
        else {
            return BuildEnvironmentKind_1.BuildEnvironmentKind.Production;
        }
    }
    static getWindowEnv() {
        if (typeof window === "undefined") {
            if (typeof self !== "undefined" && typeof self.registration !== "undefined") {
                return WindowEnvironmentKind_1.WindowEnvironmentKind.ServiceWorker;
            }
            else {
                return WindowEnvironmentKind_1.WindowEnvironmentKind.Unknown;
            }
        }
        else {
            // If the window is the root top-most level
            if (window === window.top) {
                if (location.href.indexOf("initOneSignal") !== -1 ||
                    (location.pathname === '/subscribe' &&
                        location.search === '') &&
                        (location.hostname.endsWith('.onesignal.com') ||
                            location.hostname.endsWith('.os.tc') ||
                            (location.hostname.indexOf('.localhost') !== -1 && SdkEnvironment.getBuildEnv() === BuildEnvironmentKind_1.BuildEnvironmentKind.Development))) {
                    return WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup;
                }
                else {
                    return WindowEnvironmentKind_1.WindowEnvironmentKind.Host;
                }
            }
            else if (location.pathname === '/webPushIframe') {
                return WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame;
            }
            else if (location.pathname === '/webPushModal') {
                return WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionModal;
            }
            else {
                return WindowEnvironmentKind_1.WindowEnvironmentKind.CustomIframe;
            }
        }
    }
    /**
     * Describes whether the SDK is built in tests mode or not.
     *
     * The magic constants used to detect the environment is set or unset when
     * building the SDK.
     */
    static getTestEnv() {
        if (("boolean" !== undefined && true)) {
            return TestEnvironmentKind_1.TestEnvironmentKind.UnitTesting;
        }
        else {
            return TestEnvironmentKind_1.TestEnvironmentKind.None;
        }
    }
    /**
     * Returns build-specific prefixes used for operations like registering the
     * service worker.
     *
     * For example, in staging the registered service worker filename is
     * Staging-OneSignalSDKWorker.js.
     */
    static getBuildEnvPrefix(buildEnv = SdkEnvironment.getBuildEnv()) {
        switch (buildEnv) {
            case BuildEnvironmentKind_1.BuildEnvironmentKind.Development:
                return 'Dev-';
            case BuildEnvironmentKind_1.BuildEnvironmentKind.Staging:
                return 'Staging-';
            case BuildEnvironmentKind_1.BuildEnvironmentKind.Production:
                return '';
        }
    }
    /**
     * Returns the URL object representing the components of OneSignal's API
     * endpoint.
     */
    static getOneSignalApiUrl(buildEnv = SdkEnvironment.getBuildEnv()) {
        switch (buildEnv) {
            case BuildEnvironmentKind_1.BuildEnvironmentKind.Development:
                return new URL('https://localhost:3001/api/v1');
            case BuildEnvironmentKind_1.BuildEnvironmentKind.Staging:
                return new URL('https://onesignal-staging.pw/api/v1');
            case BuildEnvironmentKind_1.BuildEnvironmentKind.Production:
                return new URL('https://onesignal.com/api/v1');
        }
    }
}
exports.default = SdkEnvironment;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/managers/SdkEnvironment.js.map

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const Environment_1 = __webpack_require__(8);
const utils_1 = __webpack_require__(1);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
const SILENT_EVENTS = [
    'notifyButtonHovering',
    'notifyButtonHover',
    'notifyButtonButtonClick',
    'notifyButtonLauncherClick',
    'animatedElementHiding',
    'animatedElementHidden',
    'animatedElementShowing',
    'animatedElementShown',
    'activeAnimatedElementActivating',
    'activeAnimatedElementActive',
    'activeAnimatedElementInactivating',
    'activeAnimatedElementInactive',
    'dbRetrieved',
    'dbSet',
    'testEvent'
];
const RETRIGGER_REMOTE_EVENTS = [
    'onesignal.prompt.custom.clicked',
    'onesignal.prompt.native.permissionchanged',
    'onesignal.subscription.changed',
    'onesignal.internal.subscriptionset',
    'dbRebuilt',
    'initialize',
    'subscriptionSet',
    'sendWelcomeNotification',
    'subscriptionChange',
    'notificationPermissionChange',
    'dbSet',
    'register',
    'notificationDisplay',
    'notificationDismiss',
    'notificationClick',
    'permissionPromptDisplay',
    'testWouldDisplay',
    'testInitOptionDisabled',
    'popupWindowTimeout'
];
const LEGACY_EVENT_MAP = {
    'notificationPermissionChange': 'onesignal.prompt.native.permissionchanged',
    'subscriptionChange': 'onesignal.subscription.changed',
    'customPromptClick': 'onesignal.prompt.custom.clicked',
};
class Event {
    /**
     * Triggers the specified event with optional custom data.
     * @param eventName The string event name to be emitted.
     * @param data Any JavaScript variable to be passed with the event.
     * @param remoteTriggerEnv If this method is being called in a different environment (e.g. was triggered in iFrame but now retriggered on main host), this is the string of the original environment for logging purposes.
     */
    static trigger(eventName, data, remoteTriggerEnv = null) {
        if (!utils_1.contains(SILENT_EVENTS, eventName)) {
            let displayData = data;
            if (remoteTriggerEnv) {
                var env = `${utils_1.capitalize(SdkEnvironment_1.default.getWindowEnv().toString())} ⬸ ${utils_1.capitalize(remoteTriggerEnv)}`;
            }
            else {
                var env = utils_1.capitalize(SdkEnvironment_1.default.getWindowEnv().toString());
            }
            if (displayData || displayData === false) {
                log.debug(`(${env}) » %c${eventName}:`, utils_1.getConsoleStyle('event'), displayData);
            }
            else {
                log.debug(`(${env}) » %c${eventName}`, utils_1.getConsoleStyle('event'));
            }
        }
        // Actually fire the event that can be listened to via OneSignal.on()
        if (Environment_1.default.isBrowser()) {
            if (eventName === OneSignal.EVENTS.SDK_INITIALIZED) {
                if (OneSignal.initialized)
                    return;
                else
                    OneSignal.initialized = true;
            }
            OneSignal.emit(eventName, data);
        }
        if (LEGACY_EVENT_MAP.hasOwnProperty(eventName)) {
            let legacyEventName = LEGACY_EVENT_MAP[eventName];
            Event._triggerLegacy(legacyEventName, data);
        }
        // If this event was triggered in an iFrame or Popup environment, also trigger it on the host page
        if (Environment_1.default.isBrowser() &&
            (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup ||
                SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame)) {
            var creator = opener || parent;
            if (!creator) {
                log.error(`Could not send event '${eventName}' back to host page because no creator (opener or parent) found!`);
            }
            else {
                // But only if the event matches certain events
                if (utils_1.contains(RETRIGGER_REMOTE_EVENTS, eventName)) {
                    if (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup) {
                        OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, { eventName: eventName, eventData: data });
                    }
                    else {
                        OneSignal.proxyFrame.retriggerRemoteEvent(eventName, data);
                    }
                }
            }
        }
    }
    /**
     * Fires the event to be listened to via window.addEventListener().
     * @param eventName The string event name.
     * @param data Any JavaScript variable to be passed with the event.
     * @private
     */
    static _triggerLegacy(eventName, data) {
        var event = new CustomEvent(eventName, {
            bubbles: true, cancelable: true, detail: data
        });
        // Fire the event that listeners can listen to via 'window.addEventListener()'
        window.dispatchEvent(event);
    }
}
exports.default = Event;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/Event.js.map

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/* eslint-disable no-unused-vars */
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var WindowEnvironmentKind;
(function (WindowEnvironmentKind) {
    /**
     * A service worker environment.
     */
    WindowEnvironmentKind[WindowEnvironmentKind["ServiceWorker"] = 'ServiceWorker'] = "ServiceWorker";
    /**
     * The top-level frame to the "main" client's site.
     */
    WindowEnvironmentKind[WindowEnvironmentKind["Host"] = 'Host'] = "Host";
    /**
     * Our subscription popup for alt-origin sites.
     */
    WindowEnvironmentKind[WindowEnvironmentKind["OneSignalSubscriptionPopup"] = 'Popup'] = "OneSignalSubscriptionPopup";
    /**
     * Our subscription modal for HTTPS sites, which loads in an iFrame.
     */
    WindowEnvironmentKind[WindowEnvironmentKind["OneSignalSubscriptionModal"] = 'Modal'] = "OneSignalSubscriptionModal";
    /**
     * Our subscription helper iFrame.
     */
    WindowEnvironmentKind[WindowEnvironmentKind["OneSignalProxyFrame"] = 'ProxyFrame'] = "OneSignalProxyFrame";
    /**
     * A custom iFrame on the site.
     */
    WindowEnvironmentKind[WindowEnvironmentKind["CustomIframe"] = 'CustomFrame'] = "CustomIframe";
    /**
     * An unknown window context type not matching any of the above.
     */
    WindowEnvironmentKind[WindowEnvironmentKind["Unknown"] = 'Unknown'] = "Unknown";
})(WindowEnvironmentKind = exports.WindowEnvironmentKind || (exports.WindowEnvironmentKind = {}));
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/WindowEnvironmentKind.js.map

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
const Database_1 = __webpack_require__(7);
const Browser = __webpack_require__(11);
const utils_1 = __webpack_require__(1);
const MainHelper_1 = __webpack_require__(10);
const ServiceWorkerHelper_1 = __webpack_require__(22);
const EventHelper_1 = __webpack_require__(13);
const PushPermissionNotGrantedError_1 = __webpack_require__(32);
const TestHelper_1 = __webpack_require__(18);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
const TimeoutError_1 = __webpack_require__(33);
class SubscriptionHelper {
    static registerForW3CPush(options) {
        log.debug(`Called %cregisterForW3CPush(${JSON.stringify(options)})`, utils_1.getConsoleStyle('code'));
        return Database_1.default.get('Ids', 'registrationId')
            .then(function _registerForW3CPush_GotRegistrationId(registrationIdResult) {
            if (!registrationIdResult || !options.fromRegisterFor || window.Notification.permission != "granted" || navigator.serviceWorker.controller == null) {
                navigator.serviceWorker.getRegistration().then(function (serviceWorkerRegistration) {
                    var sw_path = "";
                    if (OneSignal.config.path)
                        sw_path = OneSignal.config.path;
                    if (typeof serviceWorkerRegistration === "undefined")
                        ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH);
                    else {
                        if (serviceWorkerRegistration.active) {
                            let previousWorkerUrl = serviceWorkerRegistration.active.scriptURL;
                            if (utils_1.contains(previousWorkerUrl, sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH)) {
                                // OneSignalSDKWorker.js was installed
                                Database_1.default.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
                                    .then(function (version) {
                                    if (version) {
                                        if (version != OneSignal._VERSION) {
                                            log.info(`Installing new service worker (${version} -> ${OneSignal._VERSION})`);
                                            ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                                        }
                                        else
                                            ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH);
                                    }
                                    else
                                        ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                                });
                            }
                            else if (utils_1.contains(previousWorkerUrl, sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_UPDATER_PATH)) {
                                // OneSignalSDKUpdaterWorker.js was installed
                                Database_1.default.get('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION')
                                    .then(function (version) {
                                    if (version) {
                                        if (version != OneSignal._VERSION) {
                                            log.info(`Installing new service worker (${version} -> ${OneSignal._VERSION})`);
                                            ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH);
                                        }
                                        else
                                            ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_UPDATER_PATH);
                                    }
                                    else
                                        ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH);
                                });
                            }
                            else {
                                // Some other service worker not belonging to us was installed
                                // Install ours over it after unregistering theirs to get a different registration token and avoid mismatchsenderid error
                                log.info('Unregistering previous service worker:', serviceWorkerRegistration);
                                serviceWorkerRegistration.unregister().then(unregistrationSuccessful => {
                                    log.info('Result of unregistering:', unregistrationSuccessful);
                                    ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH);
                                });
                            }
                        }
                        else if (serviceWorkerRegistration.installing == null)
                            ServiceWorkerHelper_1.default.registerServiceWorker(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH);
                    }
                });
            }
            else {
                OneSignal._sessionInitAlreadyRunning = false;
            }
        });
    }
    static enableNotifications(existingServiceWorkerRegistration) {
        log.debug(`Called %cenableNotifications()`, utils_1.getConsoleStyle('code'));
        if (!('PushManager' in window)) {
            log.info("Push messaging is not supported. No PushManager.");
            MainHelper_1.default.beginTemporaryBrowserSession();
            return;
        }
        if (window.Notification.permission === 'denied') {
            log.warn("The user has blocked notifications.");
            return;
        }
        log.debug(`Calling %cnavigator.serviceWorker.ready() ...`, utils_1.getConsoleStyle('code'));
        navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
            log.debug('Finished calling %cnavigator.serviceWorker.ready', utils_1.getConsoleStyle('code'));
            MainHelper_1.default.establishServiceWorkerChannel(serviceWorkerRegistration);
            SubscriptionHelper.subscribeForPush(serviceWorkerRegistration);
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
            throw new Error(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) isUsingSubscriptionWorkaround() cannot be called until OneSignal.config exists.`);
        }
        if (Browser.safari) {
            return false;
        }
        if (SubscriptionHelper.isLocalhostAllowedAsSecureOrigin() &&
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1') {
            return false;
        }
        return ((SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.Host) &&
            (!!OneSignal.config.subdomainName || location.protocol === 'http:'));
    }
    /**
     * Returns true if the current frame context is a child iFrame, and the parent is not HTTPS.
     *
     * This is used to check if isPushNotificationsEnabled() should grab the service worker registration. In an HTTPS iframe of an HTTP page,
     * getting the service worker registration would throw an error.
     */
    static async hasInsecureParentOrigin() {
        // If we are the top frame, or service workers aren't available, don't run this check
        if (window === window.top ||
            !('serviceWorker' in navigator) ||
            typeof navigator.serviceWorker.getRegistration === "undefined") {
            return false;
        }
        try {
            await navigator.serviceWorker.getRegistration();
            return false;
        }
        catch (e) {
            return true;
        }
    }
    static isLocalhostAllowedAsSecureOrigin() {
        return OneSignal.config && OneSignal.config.allowLocalhostAsSecureOrigin === true;
    }
    static subscribeForPush(serviceWorkerRegistration) {
        log.debug(`Called %c_subscribeForPush()`, utils_1.getConsoleStyle('code'));
        var notificationPermissionBeforeRequest = '';
        OneSignal.getNotificationPermission().then((permission) => {
            notificationPermissionBeforeRequest = permission;
        })
            .then(() => {
            log.debug(`Calling %cServiceWorkerRegistration.pushManager.subscribe()`, utils_1.getConsoleStyle('code'));
            if (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup) {
                Event_1.default.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
            }
            /*
             7/29/16: If the user dismisses the prompt, the prompt cannot be shown again via pushManager.subscribe()
             See: https://bugs.chromium.org/p/chromium/issues/detail?id=621461
             Our solution is to call Notification.requestPermission(), and then call
             pushManager.subscribe(). Because notification and push permissions are shared, the subesequent call to
             pushManager.subscribe() will go through successfully.
             */
            /*
             We're now requesting Notification permissions before registering
             the service worker, so this code only gets called for the HTTP
             popup. Calling this a second time doesn't show any extra
             prompts, but it may cause the browser to block the request in
             the future without a user-visible gesture.
             */
            if (Notification.permission !== "granted") {
                return MainHelper_1.default.requestNotificationPermissionPromise();
            }
            else {
                return "granted";
            }
        })
            .then(permission => {
            if (permission !== "granted") {
                throw new PushPermissionNotGrantedError_1.default();
            }
            else {
                return utils_1.timeoutPromise(serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true }), 15000);
            }
        })
            .then(function (subscription) {
            /*
             7/29/16: New bug, even if the user dismisses the prompt, they'll be given a subscription
             See: https://bugs.chromium.org/p/chromium/issues/detail?id=621461
             Our solution is simply to check the permission before actually subscribing the user.
             */
            log.debug(`Finished calling %cServiceWorkerRegistration.pushManager.subscribe()`, utils_1.getConsoleStyle('code'));
            log.debug('Subscription details:', subscription);
            // The user allowed the notification permission prompt, or it was already allowed; set sessionInit flag to false
            OneSignal._sessionInitAlreadyRunning = false;
            sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", window.Notification.permission);
            MainHelper_1.default.getAppId()
                .then(appId => {
                log.debug("Finished subscribing for push via pushManager.subscribe().");
                var subscriptionInfo = {};
                if (subscription) {
                    if (typeof (subscription).subscriptionId != "undefined") {
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
                        }
                        catch (e) {
                            // User is most likely running < Chrome < 50
                        }
                        let auth = null;
                        try {
                            auth = subscription.getKey('auth');
                        }
                        catch (e) {
                            // User is most likely running < Firefox 45
                        }
                        if (p256dh) {
                            // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
                            let p256dh_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh)));
                            subscriptionInfo.p256dh = p256dh_base64encoded;
                        }
                        if (auth) {
                            // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
                            let auth_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(auth)));
                            subscriptionInfo.auth = auth_base64encoded;
                        }
                    }
                }
                else
                    log.warn('Could not subscribe your browser for push notifications.');
                if (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup) {
                    // 12/16/2015 -- At this point, the user has just clicked Allow on the HTTP popup!!
                    // 11/22/2016 - HTTP popup should move non-essential subscription parts to the iframe
                    OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.FINISH_REMOTE_REGISTRATION, {
                        subscriptionInfo: subscriptionInfo
                    }, message => {
                        if (message.data.progress === true) {
                            log.debug('Got message from host page that remote reg. is in progress, closing popup.');
                            var creator = opener || parent;
                            if (opener) {
                                /* Note: This is hard to find, but this is actually the code that closes the HTTP popup window */
                                window.close();
                            }
                        }
                        else {
                            log.debug('Got message from host page that remote reg. could not be finished.');
                        }
                    });
                }
                else {
                    // If we are not doing HTTP subscription, continue finish subscribing by registering with OneSignal
                    MainHelper_1.default.registerWithOneSignal(appId, subscriptionInfo);
                }
            });
        })
            .catch(function (e) {
            OneSignal._sessionInitAlreadyRunning = false;
            if (e instanceof TimeoutError_1.default) {
                log.error("A possible Chrome bug (https://bugs.chromium.org/p/chromium/issues/detail?id=623062) is preventing this subscription from completing.");
            }
            if (e.message === 'Registration failed - no sender id provided' || e.message === 'Registration failed - manifest empty or missing') {
                let manifestDom = document.querySelector('link[rel=manifest]');
                if (manifestDom) {
                    let manifestParentTagname = document.querySelector('link[rel=manifest]').parentNode.tagName.toLowerCase();
                    let manifestHtml = document.querySelector('link[rel=manifest]').outerHTML;
                    let manifestLocation = document.querySelector('link[rel=manifest]').href;
                    if (manifestParentTagname !== 'head') {
                        log.warn(`OneSignal: Your manifest %c${manifestHtml}`, utils_1.getConsoleStyle('code'), 'must be referenced in the <head> tag to be detected properly. It is currently referenced ' +
                            'in <${manifestParentTagname}>. Please see step 3.1 at ' +
                            'https://documentation.onesignal.com/docs/web-push-sdk-setup-https.');
                    }
                    else {
                        let manifestLocationOrigin = new URL(manifestLocation).origin;
                        let currentOrigin = location.origin;
                        if (currentOrigin !== manifestLocationOrigin) {
                            log.warn(`OneSignal: Your manifest is being served from ${manifestLocationOrigin}, which is ` +
                                `different from the current page's origin of ${currentOrigin}. Please serve your ` +
                                `manifest from the same origin as your page's. If you are using a content delivery ` +
                                `network (CDN), please add an exception so that the manifest is not served by your CDN. ` +
                                `WordPress users, please see ` +
                                `https://documentation.onesignal.com/docs/troubleshooting-web-push#section-wordpress-cdn-support.`);
                        }
                        else {
                            log.warn(`OneSignal: Please check your manifest at ${manifestLocation}. The %cgcm_sender_id`, utils_1.getConsoleStyle('code'), "field is missing or invalid, and a valid value is required. Please see step 2 at " +
                                "https://documentation.onesignal.com/docs/web-push-sdk-setup-https.");
                        }
                    }
                }
                else if (location.protocol === 'https:') {
                    log.warn(`OneSignal: You must reference a %cmanifest.json`, utils_1.getConsoleStyle('code'), "in the <head> of your page. Please see step 2 at " +
                        "https://documentation.onesignal.com/docs/web-push-sdk-setup-https.");
                }
            }
            else if (e instanceof PushPermissionNotGrantedError_1.default) {
            }
            else {
                log.error('Error while subscribing for push:', e);
            }
            // In Chrome, closing a tab while the prompt is displayed is the same as dismissing the prompt by clicking X
            // Our SDK receives the same event as if the user clicked X, when in fact the user just closed the tab. If
            // we had some code that prevented showing the prompt for 8 hours, the user would accidentally not be able
            // to subscribe.
            // New addition (12/22/2015), adding support for detecting the cancel 'X'
            // Chrome doesn't show when the user clicked 'X' for cancel
            // We get the same error as if the user had clicked denied, but we can check Notification.permission to see if it is still 'default'
            OneSignal.getNotificationPermission().then((permission) => {
                if (permission === 'default') {
                    // The user clicked 'X'
                    EventHelper_1.default.triggerNotificationPermissionChanged(true);
                    TestHelper_1.default.markHttpsNativePromptDismissed();
                }
                if (!OneSignal._usingNativePermissionHook)
                    EventHelper_1.default.triggerNotificationPermissionChanged();
                if (opener && SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup)
                    window.close();
            });
            // If there was an error subscribing like the timeout bug, close the popup anyways
            if (opener && SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup)
                window.close();
        });
    }
}
exports.default = SubscriptionHelper;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/helpers/SubscriptionHelper.js.map

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const IndexedDb_1 = __webpack_require__(42);
const AppState_1 = __webpack_require__(61);
const Subscription_1 = __webpack_require__(65);
const AppConfig_1 = __webpack_require__(38);
const ServiceWorkerConfig_1 = __webpack_require__(63);
const ServiceWorkerState_1 = __webpack_require__(64);
const SubscriptionHelper_1 = __webpack_require__(6);
const Emitter_1 = __webpack_require__(36);
const SdkEnvironment_1 = __webpack_require__(2);
const TestEnvironmentKind_1 = __webpack_require__(41);
const WindowEnvironmentKind_1 = __webpack_require__(5);
var DatabaseEventName;
(function (DatabaseEventName) {
    DatabaseEventName[DatabaseEventName["SET"] = 0] = "SET";
})(DatabaseEventName || (DatabaseEventName = {}));
class Database {
    constructor(databaseName) {
        this.databaseName = databaseName;
        this.emitter = new Emitter_1.default();
        this.database = new IndexedDb_1.default(this.databaseName);
    }
    static applyDbResultFilter(table, key, result) {
        switch (table) {
            case 'Options':
                if (result && key) {
                    return result.value;
                }
                else if (result && !key) {
                    return result;
                }
                else {
                    return null;
                }
                break;
            case 'Ids':
                if (result && key) {
                    return result.id;
                }
                else if (result && !key) {
                    return result;
                }
                else {
                    return null;
                }
                break;
            case 'NotificationOpened':
                if (result && key) {
                    return { data: result.data, timestamp: result.timestamp };
                }
                else if (result && !key) {
                    return result;
                }
                else {
                    return null;
                }
                break;
            default:
                if (result) {
                    return result;
                }
                else {
                    return null;
                }
                break;
        }
    }
    /**
     * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table (if key is not specified).
     * If on an iFrame or popup environment, retrieves from the correct IndexedDB database using cross-domain messaging.
     * @param table The table to retrieve the value from.
     * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
     * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
     */
    async get(table, key) {
        return await new Promise(async (resolve) => {
            if (SdkEnvironment_1.default.getWindowEnv() !== WindowEnvironmentKind_1.WindowEnvironmentKind.ServiceWorker &&
                SubscriptionHelper_1.default.isUsingSubscriptionWorkaround() &&
                SdkEnvironment_1.default.getTestEnv() === TestEnvironmentKind_1.TestEnvironmentKind.None) {
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{
                        table: table,
                        key: key
                    }], reply => {
                    let result = reply.data[0];
                    resolve(result);
                });
            }
            else {
                const result = await this.database.get(table, key);
                let cleanResult = Database.applyDbResultFilter(table, key, result);
                resolve(cleanResult);
            }
        });
    }
    /**
     * Asynchronously puts the specified value in the specified table.
     * @param table
     * @param keypath
     */
    async put(table, keypath) {
        await new Promise(async (resolve, reject) => {
            if (SdkEnvironment_1.default.getWindowEnv() !== WindowEnvironmentKind_1.WindowEnvironmentKind.ServiceWorker &&
                SubscriptionHelper_1.default.isUsingSubscriptionWorkaround() &&
                SdkEnvironment_1.default.getTestEnv() === TestEnvironmentKind_1.TestEnvironmentKind.None) {
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, [{ table: table, keypath: keypath }], reply => {
                    if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                        resolve();
                    }
                    else {
                        reject(`(Database) Attempted remote IndexedDB put(${table}, ${keypath}), but did not get success response.`);
                    }
                });
            }
            else {
                await this.database.put(table, keypath);
                resolve();
            }
        });
        this.emitter.emit(Database.EVENTS.SET, keypath);
    }
    /**
     * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
     * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
     */
    remove(table, keypath) {
        if (SdkEnvironment_1.default.getWindowEnv() !== WindowEnvironmentKind_1.WindowEnvironmentKind.ServiceWorker &&
            SubscriptionHelper_1.default.isUsingSubscriptionWorkaround() &&
            SdkEnvironment_1.default.getTestEnv() === TestEnvironmentKind_1.TestEnvironmentKind.None) {
            return new Promise((resolve, reject) => {
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, [{ table: table, keypath: keypath }], reply => {
                    if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                        resolve();
                    }
                    else {
                        reject(`(Database) Attempted remote IndexedDB remove(${table}, ${keypath}), but did not get success response.`);
                    }
                });
            });
        }
        else {
            return this.database.remove(table, keypath);
        }
    }
    async getAppConfig() {
        const config = new AppConfig_1.AppConfig();
        config.appId = await this.get('Ids', 'appId');
        config.subdomain = await this.get('Options', 'subdomain');
        config.autoRegister = await this.get('Options', 'autoRegister');
        config.serviceWorkerConfig = await this.get('Options', 'serviceWorkerConfig');
        return config;
    }
    async setAppConfig(appConfig) {
        if (appConfig.appId)
            await this.put('Ids', { type: 'appId', id: appConfig.appId });
        if (appConfig.subdomain)
            await this.put('Options', { key: 'subdomain', value: appConfig.subdomain });
        if (appConfig.autoRegister)
            await this.put('Options', { key: 'autoRegister', value: appConfig.autoRegister });
        if (appConfig.serviceWorkerConfig)
            await this.put('Options', { key: 'serviceWorkerConfig', value: appConfig.serviceWorkerConfig });
        if (appConfig.httpUseOneSignalCom)
            await this.put('Options', { key: 'httpUseOneSignalCom', value: true });
        else
            await this.put('Options', { key: 'httpUseOneSignalCom', value: false });
    }
    async getAppState() {
        const state = new AppState_1.AppState();
        state.defaultNotificationUrl = await this.get('Options', 'defaultUrl');
        state.defaultNotificationTitle = await this.get('Options', 'defaultTitle');
        state.lastKnownPushEnabled = await this.get('Options', 'isPushEnabled');
        state.clickedNotifications = await this.get('NotificationOpened');
        return state;
    }
    async setAppState(appState) {
        if (appState.defaultNotificationUrl)
            await this.put("Options", { key: "defaultUrl", value: appState.defaultNotificationUrl });
        if (appState.defaultNotificationTitle || appState.defaultNotificationTitle === '')
            await this.put("Options", { key: "defaultTitle", value: appState.defaultNotificationTitle });
        if (appState.lastKnownPushEnabled != null)
            await this.put('Options', { key: 'isPushEnabled', value: appState.lastKnownPushEnabled });
        if (appState.clickedNotifications) {
            const clickedNotificationUrls = Object.keys(appState.clickedNotifications);
            for (let url of clickedNotificationUrls) {
                const notificationDetails = appState.clickedNotifications[url];
                if (notificationDetails) {
                    await this.put('NotificationOpened', {
                        url: url,
                        data: notificationDetails.data,
                        timestamp: notificationDetails.timestamp
                    });
                }
                else if (notificationDetails === null) {
                    // If we get an object like:
                    // { "http://site.com/page": null}
                    // It means we need to remove that entry
                    await this.remove('NotificationOpened', url);
                }
            }
        }
    }
    async getServiceWorkerConfig() {
        const config = new ServiceWorkerConfig_1.ServiceWorkerConfig();
        config.scope = await this.get('Options', 'workerScope');
        config.workerName = await this.get('Options', 'workerName');
        config.updaterWorkerName = await this.get('Options', 'updaterWorkerName');
        config.workerFilePath = await this.get('Options', 'workerFilePath');
        return config;
    }
    async setServiceWorkerConfig(config) {
        if (config.scope)
            await this.put('Options', { key: 'workerScope', value: config.scope });
        if (config.workerName)
            await this.put('Options', { key: 'workerName', value: config.workerName });
        if (config.updaterWorkerName)
            await this.put('Options', { key: 'updaterWorkerName', value: config.updaterWorkerName });
        if (config.workerFilePath)
            await this.put('Options', { key: 'workerFilePath', value: config.workerFilePath });
    }
    async getServiceWorkerState() {
        const state = new ServiceWorkerState_1.ServiceWorkerState();
        state.workerVersion = await this.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION');
        state.updaterWorkerVersion = await this.get('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION');
        state.backupNotification = await this.get('Ids', 'backupNotification');
        return state;
    }
    async setServiceWorkerState(state) {
        if (state.workerVersion)
            await this.put('Ids', { type: 'WORKER1_ONE_SIGNAL_SW_VERSION', id: state.workerVersion });
        if (state.updaterWorkerVersion)
            await this.put('Ids', { type: 'WORKER2_ONE_SIGNAL_SW_VERSION', id: state.updaterWorkerVersion });
        if (state.backupNotification)
            await this.put('Ids', { type: 'backupNotification', id: state.backupNotification });
    }
    async getSubscription() {
        const subscription = new Subscription_1.Subscription();
        subscription.deviceId = await this.get('Ids', 'userId');
        subscription.pushEndpoint = await this.get('Options', 'subscriptionEndpoint');
        subscription.pushToken = await this.get('Ids', 'registrationId');
        // The preferred database key to store our subscription
        const dbOptedOut = await this.get('Options', 'optedOut');
        // For backwards compatibility, we need to read from this if the above is not found
        const dbNotOptedOut = await this.get('Options', 'subscription');
        if (dbOptedOut != null) {
            subscription.optedOut = dbOptedOut;
        }
        else {
            if (dbNotOptedOut == null) {
                subscription.optedOut = false;
            }
            else {
                subscription.optedOut = !dbNotOptedOut;
            }
        }
        return subscription;
    }
    async setSubscription(subscription) {
        if (subscription.deviceId)
            await this.put('Ids', { type: 'userId', id: subscription.deviceId });
        if (subscription.pushEndpoint)
            await this.put('Options', { key: 'subscriptionEndpoint', value: subscription.pushEndpoint });
        if (subscription.pushToken)
            await this.put('Ids', { type: 'registrationId', id: subscription.pushToken });
        if (subscription.optedOut != null)
            await this.put('Options', { key: 'optedOut', value: subscription.optedOut });
    }
    /**
     * Asynchronously removes the Ids, NotificationOpened, and Options tables from the database and recreates them with blank values.
     * @returns {Promise} Returns a promise that is fulfilled when rebuilding is completed, or rejects with an error.
     */
    static async rebuild() {
        Database.ensureSingletonInstance();
        return Promise.all([
            Database.databaseInstance.remove('Ids'),
            Database.databaseInstance.remove('NotificationOpened'),
            Database.databaseInstance.remove('Options'),
        ]);
    }
    /* Temp Database Proxy */
    static ensureSingletonInstance() {
        if (!Database.databaseInstanceName) {
            Database.databaseInstanceName = "ONE_SIGNAL_SDK_DB";
        }
        if (!Database.databaseInstance) {
            Database.databaseInstance = new Database(Database.databaseInstanceName);
        }
    }
    /* End Temp Database Proxy */
    static async on(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.emitter.on.apply(Database.databaseInstance.emitter, args);
    }
    static async setSubscription(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.setSubscription.apply(Database.databaseInstance, args);
    }
    static async getSubscription(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.getSubscription.apply(Database.databaseInstance, args);
    }
    static async setServiceWorkerState(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.setServiceWorkerState.apply(Database.databaseInstance, args);
    }
    static async getServiceWorkerState(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.getServiceWorkerState.apply(Database.databaseInstance, args);
    }
    static async setServiceWorkerConfig(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.setServiceWorkerConfig.apply(Database.databaseInstance, args);
    }
    static async getServiceWorkerConfig(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.getServiceWorkerConfig.apply(Database.databaseInstance, args);
    }
    static async setAppState(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.setAppState.apply(Database.databaseInstance, args);
    }
    static async getAppState(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.getAppState.apply(Database.databaseInstance, args);
    }
    static async setAppConfig(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.setAppConfig.apply(Database.databaseInstance, args);
    }
    static async getAppConfig(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.getAppConfig.apply(Database.databaseInstance, args);
    }
    static async remove(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.remove.apply(Database.databaseInstance, args);
    }
    static async put(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.put.apply(Database.databaseInstance, args);
    }
    static async get(...args) {
        Database.ensureSingletonInstance();
        return Database.databaseInstance.get.apply(Database.databaseInstance, args);
    }
}
/* End Temp Database Proxy */
Database.EVENTS = DatabaseEventName;
exports.default = Database;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/services/Database.js.map

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class Environment {
    /**
     * True if not in a service worker environment.
     */
    static isBrowser() {
        return typeof window !== 'undefined';
    }
    static version() {
        return ( false ? 1 : "130065");
    }
    static get TRADITIONAL_CHINESE_LANGUAGE_TAG() {
        return ['tw', 'hant'];
    }
    static get SIMPLIFIED_CHINESE_LANGUAGE_TAG() {
        return ['cn', 'hans'];
    }
    /* Specifications: https://tools.ietf.org/html/bcp47 */
    static getLanguage(testLanguage) {
        let languageTag = testLanguage || navigator.language;
        if (languageTag) {
            languageTag = languageTag.toLowerCase();
            let languageSubtags = languageTag.split('-');
            if (languageSubtags[0] == 'zh') {
                // The language is zh-?
                // We must categorize the language as either zh-Hans (simplified) or zh-Hant (traditional); OneSignal only supports these two Chinese variants
                for (let traditionalSubtag of Environment.TRADITIONAL_CHINESE_LANGUAGE_TAG) {
                    if (languageSubtags.indexOf(traditionalSubtag) !== -1) {
                        return 'zh-Hant';
                    }
                }
                for (let simpleSubtag of Environment.SIMPLIFIED_CHINESE_LANGUAGE_TAG) {
                    if (languageSubtags.indexOf(simpleSubtag) !== -1) {
                        return 'zh-Hans';
                    }
                }
                return 'zh-Hant'; // Return Chinese traditional by default
            }
            else {
                // Return the language subtag (it can be three characters, so truncate it down to 2 just to be sure)
                return languageSubtags[0].substring(0, 2);
            }
        }
        else {
            return 'en';
        }
    }
    static supportsServiceWorkers() {
        return typeof navigator !== "undefined" &&
            'serviceWorker' in navigator;
    }
}
exports.default = Environment;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/Environment.js.map

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ExtendableError = __webpack_require__(80);
class OneSignalError extends ExtendableError {
    constructor(message) {
        super(message);
    }
}
exports.default = OneSignalError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/OneSignalError.js.map

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Environment_1 = __webpack_require__(8);
const OneSignalApi_1 = __webpack_require__(16);
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
const Database_1 = __webpack_require__(7);
const Browser = __webpack_require__(11);
const utils_1 = __webpack_require__(1);
const objectAssign = __webpack_require__(4);
const swivel = __webpack_require__(27);
const Cookie = __webpack_require__(26);
const HttpModal_1 = __webpack_require__(59);
const Bell_1 = __webpack_require__(17);
const SubscriptionHelper_1 = __webpack_require__(6);
const EventHelper_1 = __webpack_require__(13);
const InvalidStateError_1 = __webpack_require__(14);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
class MainHelper {
    /**
     * If there are multiple manifests, and one of them is our OneSignal manifest, we move it to the top of <head> to ensure our manifest is used for push subscription (manifests after the first are ignored as part of the spec).
     */
    static fixWordpressManifestIfMisplaced() {
        var manifests = document.querySelectorAll('link[rel=manifest]');
        if (!manifests || manifests.length <= 1) {
            // Multiple manifests do not exist on this webpage; there is no issue
            return;
        }
        for (let i = 0; i < manifests.length; i++) {
            let manifest = manifests[i];
            let url = manifest.href;
            if (utils_1.contains(url, 'gcm_sender_id')) {
                // Move the <manifest> to the first thing in <head>
                document.querySelector('head').insertBefore(manifest, document.querySelector('head').children[0]);
                log.info('OneSignal: Moved the WordPress push <manifest> to the first element in <head>.');
            }
        }
    }
    /**
     * If the user has manually opted out of notifications (OneSignal.setSubscription), returns -2; otherwise returns 1.
     * @param isOptedIn The result of OneSignal.getSubscription().
     */
    static getNotificationTypeFromOptIn(isOptedIn) {
        if (isOptedIn == true || isOptedIn == null) {
            return 1;
        }
        else {
            return -2;
        }
    }
    /*
     Returns the current browser-agnostic notification permission as "default", "granted", "denied".
     safariWebId: Used only to get the current notification permission state in Safari (required as part of the spec).
     */
    static getNotificationPermission(safariWebId) {
        return utils_1.awaitOneSignalInitAndSupported()
            .then(() => {
            return new Promise((resolve, reject) => {
                if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
                    // User is using our subscription workaround
                    OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION, { safariWebId: safariWebId }, reply => {
                        let remoteNotificationPermission = reply.data;
                        resolve(remoteNotificationPermission);
                    });
                }
                else {
                    if (Browser.safari) {
                        // The user is on Safari
                        // A web ID is required to determine the current notificiation permission
                        if (safariWebId) {
                            resolve(window.safari.pushNotification.permission(safariWebId).permission);
                        }
                        else {
                            // The user didn't set up Safari web push properly; notifications are unlikely to be enabled
                            log.debug(`OneSignal: Invalid init option safari_web_id %c${safariWebId}`, utils_1.getConsoleStyle('code'), '. Please pass in a valid safari_web_id to OneSignal init.');
                        }
                    }
                    else {
                        // Identical API on Firefox and Chrome
                        resolve(window.Notification.permission);
                    }
                }
            });
        });
    }
    /**
     * Assigns a variable into sessionStorage to represent the beginning of a OneSignal session. A session is
     * initiated by opening a new tab or window to a OneSignal active page. While the same session lasts, refreshes to
     * the same page won't re-subscribe the user to OneSignal or update the last_active or session_count property.
     *
     * This method ensures that the sessionStorage is appropriately set for HTTP sites by communicating with the host
     * page.
     *
     * The only time we do start a browsing session on HTTP is after we register, so we get the popupPostman and post
     * a message back to the host to also start a browsing session.
     */
    static beginTemporaryBrowserSession() {
        log.debug('OneSignal: Marking browser session as continuing.');
        sessionStorage.setItem("ONE_SIGNAL_SESSION", "true");
        if (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup) {
            // If we're setting sessionStorage and we're in an Popup, we need to also set sessionStorage on the
            // main page
            if (OneSignal.subscriptionPopup) {
                OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.BEGIN_BROWSING_SESSION);
            }
        }
    }
    /**
     * Returns true if the experimental HTTP permission request is being used to prompt the user.
     */
    static isUsingHttpPermissionRequest() {
        return OneSignal.config.httpPermissionRequest &&
            OneSignal.config.httpPermissionRequest.enable == true &&
            (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame ||
                SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.Host && SubscriptionHelper_1.default.isUsingSubscriptionWorkaround());
    }
    /**
     * Returns true if the site using the HTTP permission request is supplying its own modal prompt to the user.
     */
    static isUsingCustomHttpPermissionRequestPostModal() {
        return (OneSignal.config.httpPermissionRequest &&
            OneSignal.config.httpPermissionRequest.useCustomModal == true);
    }
    /**
     * Returns true if a session cookie exists for noting the user dismissed the native prompt.
     */
    static wasHttpsNativePromptDismissed() {
        return Cookie.get('onesignal-notification-prompt') === 'dismissed';
    }
    /**
     * Stores a flag in sessionStorage that we've already shown the HTTP popover to this user and that we should not
     * show it again until they open a new window or tab to the site.
     */
    static markHttpPopoverShown() {
        sessionStorage.setItem("ONESIGNAL_HTTP_PROMPT_SHOWN", "true");
    }
    /**
     * Returns true if the HTTP popover was already shown inside the same session.
     */
    static isHttpPromptAlreadyShown() {
        return sessionStorage.getItem("ONESIGNAL_HTTP_PROMPT_SHOWN") == "true";
    }
    /**
     * Returns true if this current window session is continuing and not a newly opened tab or window.
     */
    static isContinuingBrowserSession() {
        /*
         We don't need to communicate with any iFrames for HTTP sites because the same sessionStorage is set on all
         frames of the window.
         */
        return sessionStorage.getItem("ONE_SIGNAL_SESSION") == "true";
    }
    /**
     * Creates a new or updates an existing OneSignal user (player) on the server.
     *
     * @param appId The app ID passed to init.
     *        subscriptionInfo A hash containing 'endpointOrToken', 'auth', and 'p256dh'.
     *
     * @remarks Called from both the host page and HTTP popup.
     *          If a user already exists and is subscribed, updates the session count by calling /players/:id/on_session; otherwise, a new player is registered via the /players endpoint.
     *          Saves the user ID and registration ID to the local web database after the response from OneSignal.
     */
    static registerWithOneSignal(appId, subscriptionInfo) {
        let deviceType = utils_1.getDeviceTypeForBrowser();
        return Promise.all([
            OneSignal.getUserId(),
            OneSignal.getSubscription()
        ])
            .then(([userId, subscription]) => {
            let requestUrl = userId ?
                `players/${userId}/on_session` :
                `players`;
            let requestData = {
                app_id: appId,
                device_type: deviceType,
                language: Environment_1.default.getLanguage(),
                timezone: new Date().getTimezoneOffset() * -60,
                device_model: navigator.platform + " " + Browser.name,
                device_os: Browser.version,
                sdk: OneSignal._VERSION,
                notification_types: MainHelper.getNotificationTypeFromOptIn(subscription)
            };
            if (subscriptionInfo) {
                requestData.identifier = subscriptionInfo.endpointOrToken;
                // Although we're passing the full endpoint to OneSignal, we still need to store only the registration ID for our SDK API getRegistrationId()
                // Parse out the registration ID from the full endpoint URL and save it to our database
                let registrationId = subscriptionInfo.endpointOrToken.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
                Database_1.default.put("Ids", { type: "registrationId", id: registrationId });
                // New web push standard in Firefox 46+ and Chrome 50+ includes 'auth' and 'p256dh' in PushSubscription
                if (subscriptionInfo.auth) {
                    requestData.web_auth = subscriptionInfo.auth;
                }
                if (subscriptionInfo.p256dh) {
                    requestData.web_p256 = subscriptionInfo.p256dh;
                }
            }
            return OneSignalApi_1.default.post(requestUrl, requestData);
        })
            .then((response) => {
            let { id: userId } = response;
            MainHelper.beginTemporaryBrowserSession();
            if (userId) {
                return Database_1.default.put("Ids", { type: "userId", id: userId });
            }
        })
            .then(() => {
            // We've finished registering with OneSignal, our session_count and last_active has been updated
            Event_1.default.trigger(OneSignal.EVENTS.REGISTERED);
            if (!SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
                /*
                For HTTPS sites, this is how the subscription change event gets fired. For HTTP sites, leaving this enabled fires the subscription change event twice.
                */
                EventHelper_1.default.checkAndTriggerSubscriptionChanged();
            }
        });
    }
    static checkAndTriggerNotificationPermissionChanged() {
        Promise.all([
            Database_1.default.get('Options', 'notificationPermission'),
            OneSignal.getNotificationPermission()
        ])
            .then(([previousPermission, currentPermission]) => {
            if (previousPermission !== currentPermission) {
                EventHelper_1.default.triggerNotificationPermissionChanged()
                    .then(() => Database_1.default.put('Options', {
                    key: 'notificationPermission',
                    value: currentPermission
                }));
            }
        });
    }
    /**
     * Calls Notification.requestPermission(), but returns a Promise instead of accepting a callback like the a ctual
     * Notification.requestPermission();
     */
    static requestNotificationPermissionPromise() {
        return new Promise(resolve => window.Notification.requestPermission(resolve));
    }
    static showNotifyButton() {
        if (Environment_1.default.isBrowser() && !OneSignal.notifyButton) {
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
                        OneSignal.notifyButton = new Bell_1.default(OneSignal.config.notifyButton);
                        OneSignal.notifyButton.create();
                    }
                    else {
                        log.debug('Notify button display predicate returned false so not showing the notify button.');
                    }
                });
            }
            else {
                OneSignal.notifyButton = new Bell_1.default(OneSignal.config.notifyButton);
                OneSignal.notifyButton.create();
            }
        }
    }
    static checkAndDoHttpPermissionRequest() {
        log.debug('Called %ccheckAndDoHttpPermissionRequest()', utils_1.getConsoleStyle('code'));
        if (this.isUsingHttpPermissionRequest()) {
            if (OneSignal.config.autoRegister) {
                OneSignal.showHttpPermissionRequest({ _sdkCall: true })
                    .then(result => {
                    if (result === 'granted' && !this.isUsingCustomHttpPermissionRequestPostModal()) {
                        log.debug('Showing built-in post HTTP permission request in-page modal because permission is granted and not using custom modal.');
                        this.showHttpPermissionRequestPostModal(OneSignal.config.httpPermissionRequest);
                    }
                });
            }
            else {
                Event_1.default.trigger(OneSignal.EVENTS.TEST_INIT_OPTION_DISABLED);
            }
        }
    }
    static async getNotificationIcons() {
        const appId = await MainHelper.getAppId();
        if (!appId) {
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.MissingAppId);
        }
        var url = `${SdkEnvironment_1.default.getOneSignalApiUrl().toString()}/apps/${appId}/icon`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.errors) {
            log.error(`API call %c${url}`, utils_1.getConsoleStyle('code'), 'failed with:', data.errors);
            throw new Error('Failed to get notification icons.');
        }
        return data;
    }
    static establishServiceWorkerChannel(serviceWorkerRegistration) {
        if (OneSignal._channel) {
            OneSignal._channel.off('data');
            OneSignal._channel.off('notification.displayed');
            OneSignal._channel.off('notification.clicked');
        }
        OneSignal._channel = swivel.at(serviceWorkerRegistration ? serviceWorkerRegistration.active : null);
        OneSignal._channel.on('data', function handler(context, data) {
            log.debug(`%c${utils_1.capitalize(SdkEnvironment_1.default.getWindowEnv().toString())} ⬸ ServiceWorker:`, utils_1.getConsoleStyle('serviceworkermessage'), data, context);
        });
        OneSignal._channel.on('notification.displayed', function handler(context, data) {
            Event_1.default.trigger(OneSignal.EVENTS.NOTIFICATION_DISPLAYED, data);
        });
        OneSignal._channel.on('notification.clicked', async function handler(context, data) {
            if (OneSignal.getListeners(OneSignal.EVENTS.NOTIFICATION_CLICKED).length === 0) {
                /*
                  A site's page can be open but not listening to the notification.clicked event because it didn't call addListenerForNotificationOpened().
                  In this case, if there are no detected event listeners, we should save the event, instead of firing it without anybody recieving it.
        
                  Or, since addListenerForNotificationOpened() only works once (you have to call it again each time), maybe it was only called once and the
                  user isn't receiving the notification.clicked event for subsequent notifications on the same browser tab.
        
                  Example: notificationClickHandlerMatch: 'origin', tab is clicked, event fires without anybody listening, calling addListenerForNotificationOpened()
                           returns no results even though a notification was just clicked.
                */
                log.debug('notification.clicked event received, but no event listeners; storing event in IndexedDb for later retrieval.');
                /* For empty notifications without a URL, use the current document's URL */
                let url = data.url;
                if (!data.url) {
                    // Least likely to modify, since modifying this property changes the page's URL
                    url = location.href;
                }
                await Database_1.default.put("NotificationOpened", { url: url, data: data, timestamp: Date.now() });
            }
            else {
                Event_1.default.trigger(OneSignal.EVENTS.NOTIFICATION_CLICKED, data);
            }
        });
        OneSignal._channel.on('command.redirect', function handler(context, data) {
            log.debug(`${SdkEnvironment_1.default.getWindowEnv().toString()} Picked up command.redirect to ${data}, forwarding to host page.`);
            if (OneSignal.proxyFrameHost) {
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.SERVICEWORKER_COMMAND_REDIRECT, data);
            }
        });
        OneSignal._channel.on('notification.dismissed', function handler(context, data) {
            Event_1.default.trigger(OneSignal.EVENTS.NOTIFICATION_DISMISSED, data);
        });
    }
    static getPromptOptionsQueryString() {
        let promptOptions = OneSignal.config['promptOptions'];
        let promptOptionsStr = '';
        if (promptOptions) {
            let hash = MainHelper.getPromptOptionsPostHash();
            for (let key of Object.keys(hash)) {
                var value = hash[key];
                promptOptionsStr += '&' + key + '=' + value;
            }
        }
        return promptOptionsStr;
    }
    /**
     * Shows the modal on the page users must click on after the local notification prompt to trigger the standard
     * HTTP popup window.
     */
    static async showHttpPermissionRequestPostModal(options) {
        const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
        if (sdkStylesLoadResult !== 0 /* Loaded */) {
            log.debug('Not showing HTTP permission request post-modal because styles failed to load.');
            return;
        }
        OneSignal.httpPermissionRequestPostModal = new HttpModal_1.default(options);
        OneSignal.httpPermissionRequestPostModal.create();
    }
    static getPromptOptionsPostHash() {
        let promptOptions = OneSignal.config['promptOptions'];
        if (promptOptions) {
            var legacyParams = {
                'exampleNotificationTitleDesktop': 'exampleNotificationTitle',
                'exampleNotificationMessageDesktop': 'exampleNotificationMessage',
                'exampleNotificationTitleMobile': 'exampleNotificationTitle',
                'exampleNotificationMessageMobile': 'exampleNotificationMessage',
            };
            for (let legacyParamKey of Object.keys(legacyParams)) {
                let legacyParamValue = legacyParams[legacyParamKey];
                if (promptOptions[legacyParamKey]) {
                    promptOptions[legacyParamValue] = promptOptions[legacyParamKey];
                }
            }
            var allowedPromptOptions = [
                'autoAcceptTitle',
                'siteName',
                'autoAcceptTitle',
                'subscribeText',
                'showGraphic',
                'actionMessage',
                'exampleNotificationTitle',
                'exampleNotificationMessage',
                'exampleNotificationCaption',
                'acceptButtonText',
                'cancelButtonText',
                'timeout',
            ];
            var hash = {};
            for (var i = 0; i < allowedPromptOptions.length; i++) {
                var key = allowedPromptOptions[i];
                var value = promptOptions[key];
                var encoded_value = encodeURIComponent(value);
                if (value || value === false || value === '') {
                    hash[key] = encoded_value;
                }
            }
        }
        return hash;
    }
    static triggerCustomPromptClicked(clickResult) {
        Event_1.default.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
            result: clickResult
        });
    }
    static getAppId() {
        if (OneSignal.config.appId) {
            return Promise.resolve(OneSignal.config.appId);
        }
        else
            return Database_1.default.get('Ids', 'appId');
    }
}
exports.default = MainHelper;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/helpers/MainHelper.js.map

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

/*!
 * Bowser - a browser detector
 * https://github.com/ded/bowser
 * MIT License | (c) Dustin Diaz 2015
 */

!function (name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (true) __webpack_require__(92)(name, definition)
  else this[name] = definition()
}('bowser', function () {
  /**
    * See useragents.js for examples of navigator.userAgent
    */

  var t = true

  function detect(ua) {

    function getFirstMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[1]) || '';
    }

    function getSecondMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[2]) || '';
    }

    var iosdevice = getFirstMatch(/(ipod|iphone|ipad)/i).toLowerCase()
      , likeAndroid = /like android/i.test(ua)
      , android = !likeAndroid && /android/i.test(ua)
      , nexusMobile = /nexus\s*[0-6]\s*/i.test(ua)
      , nexusTablet = !nexusMobile && /nexus\s*[0-9]+/i.test(ua)
      , chromeos = /CrOS/.test(ua)
      , silk = /silk/i.test(ua)
      , sailfish = /sailfish/i.test(ua)
      , tizen = /tizen/i.test(ua)
      , webos = /(web|hpw)os/i.test(ua)
      , windowsphone = /windows phone/i.test(ua)
      , samsungBrowser = /SamsungBrowser/i.test(ua)
      , windows = !windowsphone && /windows/i.test(ua)
      , mac = !iosdevice && !silk && /macintosh/i.test(ua)
      , linux = !android && !sailfish && !tizen && !webos && /linux/i.test(ua)
      , edgeVersion = getFirstMatch(/edge\/(\d+(\.\d+)?)/i)
      , versionIdentifier = getFirstMatch(/version\/(\d+(\.\d+)?)/i)
      , tablet = /tablet/i.test(ua)
      , mobile = !tablet && /[^-]mobi/i.test(ua)
      , xbox = /xbox/i.test(ua)
      , result

    if (/opera/i.test(ua)) {
      //  an old Opera
      result = {
        name: 'Opera'
      , opera: t
      , version: versionIdentifier || getFirstMatch(/(?:opera|opr|opios)[\s\/](\d+(\.\d+)?)/i)
      }
    } else if (/opr|opios/i.test(ua)) {
      // a new Opera
      result = {
        name: 'Opera'
        , opera: t
        , version: getFirstMatch(/(?:opr|opios)[\s\/](\d+(\.\d+)?)/i) || versionIdentifier
      }
    }
    else if (/SamsungBrowser/i.test(ua)) {
      result = {
        name: 'Samsung Internet for Android'
        , samsungBrowser: t
        , version: versionIdentifier || getFirstMatch(/(?:SamsungBrowser)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/coast/i.test(ua)) {
      result = {
        name: 'Opera Coast'
        , coast: t
        , version: versionIdentifier || getFirstMatch(/(?:coast)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/yabrowser/i.test(ua)) {
      result = {
        name: 'Yandex Browser'
      , yandexbrowser: t
      , version: versionIdentifier || getFirstMatch(/(?:yabrowser)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/ucbrowser/i.test(ua)) {
      result = {
          name: 'UC Browser'
        , ucbrowser: t
        , version: getFirstMatch(/(?:ucbrowser)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/mxios/i.test(ua)) {
      result = {
        name: 'Maxthon'
        , maxthon: t
        , version: getFirstMatch(/(?:mxios)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/epiphany/i.test(ua)) {
      result = {
        name: 'Epiphany'
        , epiphany: t
        , version: getFirstMatch(/(?:epiphany)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/puffin/i.test(ua)) {
      result = {
        name: 'Puffin'
        , puffin: t
        , version: getFirstMatch(/(?:puffin)[\s\/](\d+(?:\.\d+)?)/i)
      }
    }
    else if (/sleipnir/i.test(ua)) {
      result = {
        name: 'Sleipnir'
        , sleipnir: t
        , version: getFirstMatch(/(?:sleipnir)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/k-meleon/i.test(ua)) {
      result = {
        name: 'K-Meleon'
        , kMeleon: t
        , version: getFirstMatch(/(?:k-meleon)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (windowsphone) {
      result = {
        name: 'Windows Phone'
      , windowsphone: t
      }
      if (edgeVersion) {
        result.msedge = t
        result.version = edgeVersion
      }
      else {
        result.msie = t
        result.version = getFirstMatch(/iemobile\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/msie|trident/i.test(ua)) {
      result = {
        name: 'Internet Explorer'
      , msie: t
      , version: getFirstMatch(/(?:msie |rv:)(\d+(\.\d+)?)/i)
      }
    } else if (chromeos) {
      result = {
        name: 'Chrome'
      , chromeos: t
      , chromeBook: t
      , chrome: t
      , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    } else if (/chrome.+? edge/i.test(ua)) {
      result = {
        name: 'Microsoft Edge'
      , msedge: t
      , version: edgeVersion
      }
    }
    else if (/vivaldi/i.test(ua)) {
      result = {
        name: 'Vivaldi'
        , vivaldi: t
        , version: getFirstMatch(/vivaldi\/(\d+(\.\d+)?)/i) || versionIdentifier
      }
    }
    else if (sailfish) {
      result = {
        name: 'Sailfish'
      , sailfish: t
      , version: getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/seamonkey\//i.test(ua)) {
      result = {
        name: 'SeaMonkey'
      , seamonkey: t
      , version: getFirstMatch(/seamonkey\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/firefox|iceweasel|fxios/i.test(ua)) {
      result = {
        name: 'Firefox'
      , firefox: t
      , version: getFirstMatch(/(?:firefox|iceweasel|fxios)[ \/](\d+(\.\d+)?)/i)
      }
      if (/\((mobile|tablet);[^\)]*rv:[\d\.]+\)/i.test(ua)) {
        result.firefoxos = t
      }
    }
    else if (silk) {
      result =  {
        name: 'Amazon Silk'
      , silk: t
      , version : getFirstMatch(/silk\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/phantom/i.test(ua)) {
      result = {
        name: 'PhantomJS'
      , phantom: t
      , version: getFirstMatch(/phantomjs\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/slimerjs/i.test(ua)) {
      result = {
        name: 'SlimerJS'
        , slimer: t
        , version: getFirstMatch(/slimerjs\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/blackberry|\bbb\d+/i.test(ua) || /rim\stablet/i.test(ua)) {
      result = {
        name: 'BlackBerry'
      , blackberry: t
      , version: versionIdentifier || getFirstMatch(/blackberry[\d]+\/(\d+(\.\d+)?)/i)
      }
    }
    else if (webos) {
      result = {
        name: 'WebOS'
      , webos: t
      , version: versionIdentifier || getFirstMatch(/w(?:eb)?osbrowser\/(\d+(\.\d+)?)/i)
      };
      /touchpad\//i.test(ua) && (result.touchpad = t)
    }
    else if (/bada/i.test(ua)) {
      result = {
        name: 'Bada'
      , bada: t
      , version: getFirstMatch(/dolfin\/(\d+(\.\d+)?)/i)
      };
    }
    else if (tizen) {
      result = {
        name: 'Tizen'
      , tizen: t
      , version: getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.\d+)?)/i) || versionIdentifier
      };
    }
    else if (/qupzilla/i.test(ua)) {
      result = {
        name: 'QupZilla'
        , qupzilla: t
        , version: getFirstMatch(/(?:qupzilla)[\s\/](\d+(?:\.\d+)+)/i) || versionIdentifier
      }
    }
    else if (/chromium/i.test(ua)) {
      result = {
        name: 'Chromium'
        , chromium: t
        , version: getFirstMatch(/(?:chromium)[\s\/](\d+(?:\.\d+)?)/i) || versionIdentifier
      }
    }
    else if (/chrome|crios|crmo/i.test(ua)) {
      result = {
        name: 'Chrome'
        , chrome: t
        , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    }
    else if (android) {
      result = {
        name: 'Android'
        , version: versionIdentifier
      }
    }
    else if (/safari|applewebkit/i.test(ua)) {
      result = {
        name: 'Safari'
      , safari: t
      }
      if (versionIdentifier) {
        result.version = versionIdentifier
      }
    }
    else if (iosdevice) {
      result = {
        name : iosdevice == 'iphone' ? 'iPhone' : iosdevice == 'ipad' ? 'iPad' : 'iPod'
      }
      // WTF: version is not part of user agent in web apps
      if (versionIdentifier) {
        result.version = versionIdentifier
      }
    }
    else if(/googlebot/i.test(ua)) {
      result = {
        name: 'Googlebot'
      , googlebot: t
      , version: getFirstMatch(/googlebot\/(\d+(\.\d+))/i) || versionIdentifier
      }
    }
    else {
      result = {
        name: getFirstMatch(/^(.*)\/(.*) /),
        version: getSecondMatch(/^(.*)\/(.*) /)
     };
   }

    // set webkit or gecko flag for browsers based on these engines
    if (!result.msedge && /(apple)?webkit/i.test(ua)) {
      if (/(apple)?webkit\/537\.36/i.test(ua)) {
        result.name = result.name || "Blink"
        result.blink = t
      } else {
        result.name = result.name || "Webkit"
        result.webkit = t
      }
      if (!result.version && versionIdentifier) {
        result.version = versionIdentifier
      }
    } else if (!result.opera && /gecko\//i.test(ua)) {
      result.name = result.name || "Gecko"
      result.gecko = t
      result.version = result.version || getFirstMatch(/gecko\/(\d+(\.\d+)?)/i)
    }

    // set OS flags for platforms that have multiple browsers
    if (!result.msedge && (android || result.silk)) {
      result.android = t
    } else if (iosdevice) {
      result[iosdevice] = t
      result.ios = t
    } else if (mac) {
      result.mac = t
    } else if (xbox) {
      result.xbox = t
    } else if (windows) {
      result.windows = t
    } else if (linux) {
      result.linux = t
    }

    // OS version extraction
    var osVersion = '';
    if (result.windowsphone) {
      osVersion = getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i);
    } else if (iosdevice) {
      osVersion = getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i);
      osVersion = osVersion.replace(/[_\s]/g, '.');
    } else if (android) {
      osVersion = getFirstMatch(/android[ \/-](\d+(\.\d+)*)/i);
    } else if (result.webos) {
      osVersion = getFirstMatch(/(?:web|hpw)os\/(\d+(\.\d+)*)/i);
    } else if (result.blackberry) {
      osVersion = getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i);
    } else if (result.bada) {
      osVersion = getFirstMatch(/bada\/(\d+(\.\d+)*)/i);
    } else if (result.tizen) {
      osVersion = getFirstMatch(/tizen[\/\s](\d+(\.\d+)*)/i);
    }
    if (osVersion) {
      result.osversion = osVersion;
    }

    // device type extraction
    var osMajorVersion = osVersion.split('.')[0];
    if (
         tablet
      || nexusTablet
      || iosdevice == 'ipad'
      || (android && (osMajorVersion == 3 || (osMajorVersion >= 4 && !mobile)))
      || result.silk
    ) {
      result.tablet = t
    } else if (
         mobile
      || iosdevice == 'iphone'
      || iosdevice == 'ipod'
      || android
      || nexusMobile
      || result.blackberry
      || result.webos
      || result.bada
    ) {
      result.mobile = t
    }

    // Graded Browser Support
    // http://developer.yahoo.com/yui/articles/gbs
    if (result.msedge ||
        (result.msie && result.version >= 10) ||
        (result.yandexbrowser && result.version >= 15) ||
		    (result.vivaldi && result.version >= 1.0) ||
        (result.chrome && result.version >= 20) ||
        (result.samsungBrowser && result.version >= 4) ||
        (result.firefox && result.version >= 20.0) ||
        (result.safari && result.version >= 6) ||
        (result.opera && result.version >= 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] >= 6) ||
        (result.blackberry && result.version >= 10.1)
        || (result.chromium && result.version >= 20)
        ) {
      result.a = t;
    }
    else if ((result.msie && result.version < 10) ||
        (result.chrome && result.version < 20) ||
        (result.firefox && result.version < 20.0) ||
        (result.safari && result.version < 6) ||
        (result.opera && result.version < 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] < 6)
        || (result.chromium && result.version < 20)
        ) {
      result.c = t
    } else result.x = t

    return result
  }

  var bowser = detect(typeof navigator !== 'undefined' ? navigator.userAgent || '' : '')

  bowser.test = function (browserList) {
    for (var i = 0; i < browserList.length; ++i) {
      var browserItem = browserList[i];
      if (typeof browserItem=== 'string') {
        if (browserItem in bowser) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get version precisions count
   *
   * @example
   *   getVersionPrecision("1.10.3") // 3
   *
   * @param  {string} version
   * @return {number}
   */
  function getVersionPrecision(version) {
    return version.split(".").length;
  }

  /**
   * Array::map polyfill
   *
   * @param  {Array} arr
   * @param  {Function} iterator
   * @return {Array}
   */
  function map(arr, iterator) {
    var result = [], i;
    if (Array.prototype.map) {
      return Array.prototype.map.call(arr, iterator);
    }
    for (i = 0; i < arr.length; i++) {
      result.push(iterator(arr[i]));
    }
    return result;
  }

  /**
   * Calculate browser version weight
   *
   * @example
   *   compareVersions(['1.10.2.1',  '1.8.2.1.90'])    // 1
   *   compareVersions(['1.010.2.1', '1.09.2.1.90']);  // 1
   *   compareVersions(['1.10.2.1',  '1.10.2.1']);     // 0
   *   compareVersions(['1.10.2.1',  '1.0800.2']);     // -1
   *
   * @param  {Array<String>} versions versions to compare
   * @return {Number} comparison result
   */
  function compareVersions(versions) {
    // 1) get common precision for both versions, for example for "10.0" and "9" it should be 2
    var precision = Math.max(getVersionPrecision(versions[0]), getVersionPrecision(versions[1]));
    var chunks = map(versions, function (version) {
      var delta = precision - getVersionPrecision(version);

      // 2) "9" -> "9.0" (for precision = 2)
      version = version + new Array(delta + 1).join(".0");

      // 3) "9.0" -> ["000000000"", "000000009"]
      return map(version.split("."), function (chunk) {
        return new Array(20 - chunk.length).join("0") + chunk;
      }).reverse();
    });

    // iterate in reverse order by reversed chunks array
    while (--precision >= 0) {
      // 4) compare: "000000009" > "000000010" = false (but "9" > "10" = true)
      if (chunks[0][precision] > chunks[1][precision]) {
        return 1;
      }
      else if (chunks[0][precision] === chunks[1][precision]) {
        if (precision === 0) {
          // all version chunks are same
          return 0;
        }
      }
      else {
        return -1;
      }
    }
  }

  /**
   * Check if browser is unsupported
   *
   * @example
   *   bowser.isUnsupportedBrowser({
   *     msie: "10",
   *     firefox: "23",
   *     chrome: "29",
   *     safari: "5.1",
   *     opera: "16",
   *     phantom: "534"
   *   });
   *
   * @param  {Object}  minVersions map of minimal version to browser
   * @param  {Boolean} [strictMode = false] flag to return false if browser wasn't found in map
   * @param  {String}  [ua] user agent string
   * @return {Boolean}
   */
  function isUnsupportedBrowser(minVersions, strictMode, ua) {
    var _bowser = bowser;

    // make strictMode param optional with ua param usage
    if (typeof strictMode === 'string') {
      ua = strictMode;
      strictMode = void(0);
    }

    if (strictMode === void(0)) {
      strictMode = false;
    }
    if (ua) {
      _bowser = detect(ua);
    }

    var version = "" + _bowser.version;
    for (var browser in minVersions) {
      if (minVersions.hasOwnProperty(browser)) {
        if (_bowser[browser]) {
          // browser version and min supported version.
          return compareVersions([version, minVersions[browser]]) < 0;
        }
      }
    }

    return strictMode; // not found
  }

  /**
   * Check if browser is supported
   *
   * @param  {Object} minVersions map of minimal version to browser
   * @param  {Boolean} [strictMode = false] flag to return false if browser wasn't found in map
   * @param  {String}  [ua] user agent string
   * @return {Boolean}
   */
  function check(minVersions, strictMode, ua) {
    return !isUnsupportedBrowser(minVersions, strictMode, ua);
  }

  bowser.isUnsupportedBrowser = isUnsupportedBrowser;
  bowser.compareVersions = compareVersions;
  bowser.check = check;

  /*
   * Set our detect method to the main bowser object so we can
   * reuse it to test other user agents.
   * This is needed to implement future tests.
   */
  bowser._detect = detect;

  return bowser
});


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const EventEmitter = __webpack_require__(46);
const heir = __webpack_require__(44);
const Environment_1 = __webpack_require__(8);
const objectAssign = __webpack_require__(4);
const log = __webpack_require__(0);
const Uuid_1 = __webpack_require__(19);
const SdkEnvironment_1 = __webpack_require__(2);
/**
 * Establishes a cross-domain MessageChannel between the current browsing context (this page) and another (an iFrame, popup, or parent page).
 */
class Postmam {
    /**
     * Initializes Postmam with settings but does not establish a connection a channel or set up any message listeners.
     * @param windowReference The window to postMessage() the initial MessageChannel port to.
     * @param sendToOrigin The origin that will receive the initial postMessage with the transferred message channel port object.
     * @param receiveFromOrigin The origin to allow incoming messages from. If messages do not come from this origin they will be discarded. Only affects the initial handshake.
     * @remarks The initiating (client) page must call this after the page has been loaded so that the other page has a chance to receive the initial handshake message. The receiving (server) page must set up a message listener to catch the initial handshake message.
     */
    constructor(windowReference, sendToOrigin, receiveFromOrigin) {
        this.windowReference = windowReference;
        this.sendToOrigin = sendToOrigin;
        this.receiveFromOrigin = receiveFromOrigin;
        if (!window || !window.postMessage) {
            throw new Error('Must pass in a valid window reference supporting postMessage():' + windowReference);
        }
        if (!sendToOrigin || !receiveFromOrigin) {
            throw new Error('Invalid origin. Must be set.');
        }
        heir.merge(this, new EventEmitter());
        this.channel = new MessageChannel();
        this.messagePort = null;
        this.isListening = false;
        this.isConnected = false;
        this.replies = {};
    }
    static get HANDSHAKE_MESSAGE() {
        return "onesignal.postmam.handshake";
    }
    static get CONNECTED_MESSAGE() {
        return "onesignal.postmam.connected";
    }
    /**
     * Opens a message event listener to listen for a Postmam handshake from another browsing context. This listener is closed as soon as the connection is established.
     */
    listen() {
        log.debug('(Postmam) Called listen().');
        if (this.isListening) {
            log.debug('(Postmam) Already listening for Postmam connections.');
            return;
        }
        if (!Environment_1.default.isBrowser()) {
            return;
        }
        this.isListening = true;
        log.debug('(Postmam) Listening for Postmam connections.', this);
        // One of the messages will contain our MessageChannel port
        window.addEventListener('message', this.onWindowMessagePostmanConnectReceived.bind(this));
    }
    startPostMessageReceive() {
        window.addEventListener('message', this.onWindowPostMessageReceived.bind(this));
    }
    stopPostMessageReceive() {
        window.removeEventListener('message', this.onWindowPostMessageReceived);
    }
    destroy() {
        this.stopPostMessageReceive();
        this.removeEvent();
    }
    onWindowPostMessageReceived(e) {
        // Discard messages from unexpected origins; messages come frequently from other origins
        if (!this.isSafeOrigin(e.origin)) {
            // log.debug(`(Postmam) Discarding message because ${e.origin} is not an allowed origin:`, e.data);
            return;
        }
        //log.debug(`(Postmam) (onWindowPostMessageReceived) (${SdkEnvironment.getWindowEnv().toString()}):`, e);
        let { id: messageId, command: messageCommand, data: messageData, source: messageSource } = e.data;
        if (messageCommand === Postmam.CONNECTED_MESSAGE) {
            this.emit('connect');
            this.isConnected = true;
            return;
        }
        let messageBundle = {
            id: messageId,
            command: messageCommand,
            data: messageData,
            source: messageSource
        };
        let messageBundleWithReply = objectAssign({
            reply: this.reply.bind(this, messageBundle)
        }, messageBundle);
        if (this.replies.hasOwnProperty(messageId)) {
            log.info('(Postmam) This message is a reply.');
            let replyFn = this.replies[messageId].bind(window);
            let replyFnReturnValue = replyFn(messageBundleWithReply);
            if (replyFnReturnValue === false) {
                delete this.replies[messageId];
            }
        }
        else {
            this.emit(messageCommand, messageBundleWithReply);
        }
    }
    onWindowMessagePostmanConnectReceived(e) {
        log.debug(`(Postmam) (${SdkEnvironment_1.default.getWindowEnv().toString()}) Window postmessage for Postman connect received:`, e);
        // Discard messages from unexpected origins; messages come frequently from other origins
        if (!this.isSafeOrigin(e.origin)) {
            // log.debug(`(Postmam) Discarding message because ${e.origin} is not an allowed origin:`, e.data)
            return;
        }
        var { handshake } = e.data;
        if (handshake !== Postmam.HANDSHAKE_MESSAGE) {
            log.info('(Postmam) Got a postmam message, but not our expected handshake:', e.data);
            // This was not our expected handshake message
            return;
        }
        else {
            log.info('(Postmam) Got our expected Postmam handshake message (and connecting...):', e.data);
            // This was our expected handshake message
            // Remove our message handler so we don't get spammed with cross-domain messages
            window.removeEventListener('message', this.onWindowMessagePostmanConnectReceived);
            // Get the message port
            this.messagePort = e.ports[0];
            this.messagePort.addEventListener('message', this.onMessageReceived.bind(this), false);
            log.info('(Postmam) Removed previous message event listener for handshakes, replaced with main message listener.');
            this.messagePort.start();
            this.isConnected = true;
            log.info(`(Postmam) (${SdkEnvironment_1.default.getWindowEnv().toString()}) Connected.`);
            this.message(Postmam.CONNECTED_MESSAGE);
            this.emit('connect');
        }
    }
    /**
     * Establishes a message channel with a listening Postmam on another browsing context.
     * @remarks Only call this if listen() is called on another page.
     */
    connect() {
        log.info(`(Postmam) (${SdkEnvironment_1.default.getWindowEnv().toString()}) Establishing a connection to ${this.sendToOrigin}.`);
        this.messagePort = this.channel.port1;
        this.messagePort.addEventListener('message', this.onMessageReceived.bind(this), false);
        this.messagePort.start();
        this.windowReference.postMessage({
            handshake: Postmam.HANDSHAKE_MESSAGE
        }, this.sendToOrigin, [this.channel.port2]);
    }
    onMessageReceived(e) {
        //log.debug(`(Postmam) (${SdkEnvironment.getWindowEnv().toString()}):`, e.data);
        if (!e.data) {
            log.debug(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) Received an empty Postmam message:`, e);
            return;
        }
        let { id: messageId, command: messageCommand, data: messageData, source: messageSource } = e.data;
        if (messageCommand === Postmam.CONNECTED_MESSAGE) {
            this.emit('connect');
            this.isConnected = true;
            return;
        }
        let messageBundle = {
            id: messageId,
            command: messageCommand,
            data: messageData,
            source: messageSource
        };
        let messageBundleWithReply = objectAssign({
            reply: this.reply.bind(this, messageBundle)
        }, messageBundle);
        if (this.replies.hasOwnProperty(messageId)) {
            let replyFn = this.replies[messageId].bind(window);
            let replyFnReturnValue = replyFn(messageBundleWithReply);
            if (replyFnReturnValue === false) {
                delete this.replies[messageId];
            }
        }
        else {
            this.emit(messageCommand, messageBundleWithReply);
        }
    }
    reply(originalMessageBundle, data, onReply) {
        const messageBundle = {
            id: originalMessageBundle.id,
            command: originalMessageBundle.command,
            data: data,
            source: SdkEnvironment_1.default.getWindowEnv().toString(),
            isReply: true
        };
        if (typeof onReply === 'function') {
            this.replies[messageBundle.id] = onReply;
        }
        this.messagePort.postMessage(messageBundle);
    }
    /**
     * Sends via window.postMessage.
     */
    postMessage(command, data, onReply) {
        if (!command || command == '') {
            throw new Error("(Postmam) Postmam command must not be empty.");
        }
        if (typeof data === 'function') {
            log.debug('You passed a function to data, did you mean to pass null?');
            return;
        }
        const messageBundle = {
            id: Uuid_1.Uuid.generate(),
            command: command,
            data: data,
            source: SdkEnvironment_1.default.getWindowEnv().toString()
        };
        if (typeof onReply === 'function') {
            this.replies[messageBundle.id] = onReply;
        }
        this.windowReference.postMessage(messageBundle, '*');
    }
    /**
     * Sends via MessageChannel.port.postMessage
     */
    message(command, data, onReply) {
        if (!command || command == '') {
            throw new Error("(Postmam) Postmam command must not be empty.");
        }
        if (typeof data === 'function') {
            log.debug('You passed a function to data, did you mean to pass null?');
            return;
        }
        const messageBundle = {
            id: Uuid_1.Uuid.generate(),
            command: command,
            data: data,
            source: SdkEnvironment_1.default.getWindowEnv().toString()
        };
        if (typeof onReply === 'function') {
            this.replies[messageBundle.id] = onReply;
        }
        this.messagePort.postMessage(messageBundle);
    }
    /**
     * If the provided Site URL on the dashboard, which restricts the post message origin, uses the https:// protocol
     * Then relax the postMessage restriction to also allow the http:// protocol for the same domain.
     */
    generateSafeOrigins(origin) {
        let otherAllowedOrigins = [origin];
        try {
            let url = new URL(origin);
            let host = url.host.replace('www.', '');
            if (url.protocol === 'https:') {
                otherAllowedOrigins.push(`https://${host}`);
                otherAllowedOrigins.push(`https://www.${host}`);
            }
            else if (url.protocol === 'http:') {
                otherAllowedOrigins.push(`http://${host}`);
                otherAllowedOrigins.push(`http://www.${host}`);
                otherAllowedOrigins.push(`https://${host}`);
                otherAllowedOrigins.push(`https://www.${host}`);
            }
        }
        catch (ex) {
            // Invalid URL: Users can enter '*' or 'https://*.google.com' which is invalid.
        }
        return otherAllowedOrigins;
    }
    isSafeOrigin(messageOrigin) {
        if (!OneSignal.config) {
            var subdomain = "x";
        }
        else {
            var subdomain = OneSignal.config.subdomainName;
        }
        const otherAllowedOrigins = this.generateSafeOrigins(this.receiveFromOrigin);
        return (messageOrigin === 'https://onesignal.com' ||
            messageOrigin === `https://${subdomain || ''}.onesignal.com` ||
            messageOrigin === `https://${subdomain || ''}.os.tc` ||
            messageOrigin === `https://${subdomain || ''}.os.tc:3001` ||
            (messageOrigin === SdkEnvironment_1.default.getOneSignalApiUrl().origin) ||
            this.receiveFromOrigin === '*' ||
            utils_1.contains(otherAllowedOrigins, messageOrigin));
    }
    on(...args) {
        // Overriden by event emitter lib
    }
    once(...args) {
        // Overriden by event emitter lib
    }
}
exports.default = Postmam;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/Postmam.js.map

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalApi_1 = __webpack_require__(16);
const log = __webpack_require__(0);
const LimitStore_1 = __webpack_require__(15);
const Event_1 = __webpack_require__(3);
const Database_1 = __webpack_require__(7);
const utils_1 = __webpack_require__(1);
const MainHelper_1 = __webpack_require__(10);
class EventHelper {
    static onNotificationPermissionChange(event) {
        EventHelper.checkAndTriggerSubscriptionChanged();
    }
    static async onInternalSubscriptionSet(optedOut) {
        LimitStore_1.default.put('subscription.optedOut', optedOut);
    }
    static async checkAndTriggerSubscriptionChanged() {
        utils_1.logMethodCall('checkAndTriggerSubscriptionChanged');
        const pushEnabled = await OneSignal.isPushNotificationsEnabled();
        const appState = await Database_1.default.getAppState();
        const { lastKnownPushEnabled } = appState;
        const didStateChange = (lastKnownPushEnabled === null || pushEnabled !== lastKnownPushEnabled);
        if (!didStateChange)
            return;
        log.info(`The user's subscription state changed from ` +
            `${lastKnownPushEnabled === null ? '(not stored)' : lastKnownPushEnabled} ⟶ ${pushEnabled}`);
        appState.lastKnownPushEnabled = pushEnabled;
        await Database_1.default.setAppState(appState);
        EventHelper.triggerSubscriptionChanged(pushEnabled);
    }
    static _onSubscriptionChanged(newSubscriptionState) {
        if (OneSignal.__doNotShowWelcomeNotification) {
            log.debug('Not showing welcome notification because user has previously subscribed.');
            return;
        }
        if (newSubscriptionState === true) {
            Promise.all([
                OneSignal.getUserId(),
                MainHelper_1.default.getAppId()
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
                let unopenableWelcomeNotificationUrl = new URL(location.href).origin + '?_osp=do_not_open';
                let url = (welcome_notification_opts &&
                    welcome_notification_opts['url'] &&
                    (welcome_notification_opts['url'].length > 0)) ?
                    welcome_notification_opts['url'] :
                    unopenableWelcomeNotificationUrl;
                title = utils_1.decodeHtmlEntities(title);
                message = utils_1.decodeHtmlEntities(message);
                if (!welcome_notification_disabled) {
                    log.debug('Sending welcome notification.');
                    OneSignalApi_1.default.sendNotification(appId, [userId], { 'en': title }, { 'en': message }, url, null, { __isOneSignalWelcomeNotification: true }, undefined);
                    Event_1.default.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, { title: title, message: message, url: url });
                }
            });
        }
    }
    static triggerNotificationPermissionChanged(updateIfIdentical = false) {
        let newPermission, isUpdating;
        return Promise.all([
            OneSignal.getNotificationPermission(),
            Database_1.default.get('Options', 'notificationPermission')
        ])
            .then(([currentPermission, previousPermission]) => {
            newPermission = currentPermission;
            isUpdating = (currentPermission !== previousPermission || updateIfIdentical);
            if (isUpdating) {
                return Database_1.default.put('Options', { key: 'notificationPermission', value: currentPermission });
            }
        })
            .then(() => {
            if (isUpdating) {
                Event_1.default.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, {
                    to: newPermission
                });
            }
        });
    }
    static triggerSubscriptionChanged(to) {
        Event_1.default.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
    }
    /**
     * When notifications are clicked, because the site isn't open, the notification is stored in the database. The next
     * time the page opens, the event is triggered if its less than 5 minutes (usually page opens instantly from click).
     *
     * This method is fired for both HTTPS and HTTP sites, so for HTTP sites, the host URL needs to be used, not the
     * subdomain.onesignal.com URL.
     */
    static async fireStoredNotificationClicks(url = document.URL) {
        async function fireEventWithNotification(clickedNotificationInfo) {
            // Remove the notification from the recently clicked list
            // Once this page processes this retroactively provided clicked event, nothing should get the same event
            const appState = await Database_1.default.getAppState();
            appState.clickedNotifications[clickedNotificationInfo.url] = null;
            await Database_1.default.setAppState(appState);
            /* Clicked notifications look like:
            {
              "url": "https://notify.tech",
              "data": {
                "id": "f44dfcc7-e8cd-47c6-af7e-e2b7ac68afca",
                "heading": "Example Notification",
                "content": "This is an example notification.",
                "icon": "https://onesignal.com/images/notification_logo.png"
                (there would be a URL field here if it was set)
              },
              "timestamp": 1490998270607
            }
            */
            const { data: notification, timestamp } = clickedNotificationInfo;
            if (timestamp) {
                const minutesSinceNotificationClicked = (Date.now() - timestamp) / 1000 / 60;
                if (minutesSinceNotificationClicked > 5)
                    return;
            }
            Event_1.default.trigger(OneSignal.EVENTS.NOTIFICATION_CLICKED, notification);
        }
        const appState = await Database_1.default.getAppState();
        /* Is the flag notificationClickHandlerMatch: origin enabled?
    
           If so, this means we should provide a retroactive notification.clicked event as long as there exists any recently clicked
           notification that matches this site's origin.
    
           Otherwise, the default behavior is to only provide a retroactive notification.clicked event if this page's URL exactly
           matches the notification's URL.
        */
        const notificationClickHandlerMatch = await Database_1.default.get('Options', 'notificationClickHandlerMatch');
        if (notificationClickHandlerMatch === 'origin') {
            for (const clickedNotificationUrl of Object.keys(appState.clickedNotifications)) {
                // Using notificationClickHandlerMatch: 'origin', as long as the notification's URL's origin matches our current tab's origin,
                // fire the clicked event
                if (new URL(clickedNotificationUrl).origin === location.origin) {
                    const clickedNotification = appState.clickedNotifications[clickedNotificationUrl];
                    await fireEventWithNotification(clickedNotification);
                }
            }
        }
        else {
            /*
              If a user is on https://site.com, document.URL and location.href both report the page's URL as https://site.com/.
              This causes checking for notifications for the current URL to fail, since there is a notification for https://site.com,
              but there is no notification for https://site.com/.
      
              As a workaround, if there are no notifications for https://site.com/, we'll do a check for https://site.com.
            */
            var pageClickedNotifications = appState.clickedNotifications[url];
            if (pageClickedNotifications) {
                await fireEventWithNotification(pageClickedNotifications);
            }
            else if (!pageClickedNotifications &&
                url.endsWith('/')) {
                var urlWithoutTrailingSlash = url.substring(0, url.length - 1);
                pageClickedNotifications = appState.clickedNotifications[urlWithoutTrailingSlash];
                if (pageClickedNotifications) {
                    await fireEventWithNotification(pageClickedNotifications);
                }
            }
        }
    }
}
exports.default = EventHelper;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/helpers/EventHelper.js.map

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
const PermissionPromptType_1 = __webpack_require__(40);
var InvalidStateReason;
(function (InvalidStateReason) {
    InvalidStateReason[InvalidStateReason["MissingAppId"] = 0] = "MissingAppId";
    InvalidStateReason[InvalidStateReason["RedundantPermissionMessage"] = 1] = "RedundantPermissionMessage";
    InvalidStateReason[InvalidStateReason["PushPermissionAlreadyGranted"] = 2] = "PushPermissionAlreadyGranted";
    InvalidStateReason[InvalidStateReason["UnsupportedEnvironment"] = 3] = "UnsupportedEnvironment";
    InvalidStateReason[InvalidStateReason["MissingDomElement"] = 4] = "MissingDomElement";
})(InvalidStateReason = exports.InvalidStateReason || (exports.InvalidStateReason = {}));
class InvalidStateError extends OneSignalError_1.default {
    constructor(reason, extra) {
        switch (reason) {
            case InvalidStateReason.MissingAppId:
                super(`Missing required app ID.`);
                break;
            case InvalidStateReason.RedundantPermissionMessage:
                let extraInfo = '';
                if (extra.permissionPromptType)
                    extraInfo = `(${PermissionPromptType_1.PermissionPromptType[extra.permissionPromptType]})`;
                super(`Another permission message ${extraInfo} is being displayed.`);
                break;
            case InvalidStateReason.PushPermissionAlreadyGranted:
                super(`Push permission has already been granted.`);
                break;
            case InvalidStateReason.UnsupportedEnvironment:
                super(`The current environment does not support this operation.`);
                break;
        }
        this.description = InvalidStateReason[reason];
        this.reason = reason;
    }
}
exports.InvalidStateError = InvalidStateError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/InvalidStateError.js.map

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
class LimitStore {
    static put(key, value) {
        if (LimitStore.store[key] === undefined) {
            LimitStore.store[key] = [null, null];
        }
        LimitStore.store[key].push(value);
        if (LimitStore.store[key].length == LimitStore.LIMIT + 1) {
            LimitStore.store[key].shift();
        }
        return LimitStore.store[key];
    }
    static get(key) {
        if (LimitStore.store[key] === undefined) {
            LimitStore.store[key] = [null, null];
        }
        return LimitStore.store[key];
    }
    static getFirst(key) {
        return LimitStore.get(key)[0];
    }
    static getLast(key) {
        return LimitStore.get(key)[1];
    }
    static remove(key) {
        delete LimitStore.store[key];
    }
    static isEmpty(key) {
        let values = LimitStore.get(key);
        return values[0] === null && values[1] === null;
    }
}
LimitStore.store = {};
LimitStore.LIMIT = 2;
exports.default = LimitStore;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/LimitStore.js.map

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const utils_1 = __webpack_require__(1);
const objectAssign = __webpack_require__(4);
const Environment_1 = __webpack_require__(8);
const AppConfig_1 = __webpack_require__(38);
const SdkEnvironment_1 = __webpack_require__(2);
const JSONP = __webpack_require__(82);
class OneSignalApi {
    static get(action, data, headers) {
        return OneSignalApi.call('GET', action, data, headers);
    }
    static post(action, data, headers) {
        return OneSignalApi.call('POST', action, data, headers);
    }
    static put(action, data, headers) {
        return OneSignalApi.call('PUT', action, data, headers);
    }
    static delete(action, data, headers) {
        return OneSignalApi.call('DELETE', action, data, headers);
    }
    static call(method, action, data, headers) {
        let callHeaders = new Headers();
        callHeaders.append('SDK-Version', `onesignal/web/${Environment_1.default.version()}`);
        callHeaders.append('Content-Type', 'application/json;charset=UTF-8');
        if (headers) {
            for (let key of Object.keys(headers)) {
                callHeaders.append(key, headers[key]);
            }
        }
        let contents = {
            method: method || 'NO_METHOD_SPECIFIED',
            headers: callHeaders,
            cache: 'no-cache'
        };
        if (data)
            contents.body = JSON.stringify(data);
        var status;
        return fetch(SdkEnvironment_1.default.getOneSignalApiUrl().toString() + '/' + action, contents)
            .then(response => {
            status = response.status;
            return response.json();
        })
            .then(json => {
            if (status >= 200 && status < 300)
                return json;
            else {
                let error = OneSignalApi.identifyError(json);
                if (error === 'no-user-id-error') {
                    // TODO: This returns undefined
                }
                else {
                    return Promise.reject(json);
                }
            }
        });
    }
    static identifyError(error) {
        if (!error || !error.errors) {
            return 'no-error';
        }
        let errors = error.errors;
        if (utils_1.contains(errors, 'No user with this id found') ||
            utils_1.contains(errors, 'Could not find app_id for given player id.')) {
            return 'no-user-id-error';
        }
        return 'unknown-error';
    }
    /**
     * Given a GCM or Firefox subscription endpoint or Safari device token, returns the user ID from OneSignal's server.
     * Used if the user clears his or her IndexedDB database and we need the user ID again.
     */
    static getUserIdFromSubscriptionIdentifier(appId, deviceType, identifier) {
        // Calling POST /players with an existing identifier returns us that player ID
        return OneSignalApi.post('players', {
            app_id: appId,
            device_type: deviceType,
            identifier: identifier
        }).then(response => {
            if (response && response.id) {
                return response.id;
            }
            else {
                return null;
            }
        }).catch(e => {
            log.debug('Error getting user ID from subscription identifier:', e);
            return null;
        });
    }
    static getPlayer(appId, playerId) {
        return OneSignalApi.get(`players/${playerId}?app_id=${appId}`);
    }
    static updatePlayer(appId, playerId, options) {
        return OneSignalApi.put(`players/${playerId}`, objectAssign({ app_id: appId }, options));
    }
    static sendNotification(appId, playerIds, titles, contents, url, icon, data, buttons) {
        var params = {
            app_id: appId,
            contents: contents,
            include_player_ids: playerIds,
            isAnyWeb: true,
            data: data,
            web_buttons: buttons
        };
        if (titles) {
            params.headings = titles;
        }
        if (url) {
            params.url = url;
        }
        if (icon) {
            params.chrome_web_icon = icon;
            params.firefox_icon = icon;
        }
        utils_1.trimUndefined(params);
        return OneSignalApi.post('notifications', params);
    }
    static async getAppConfig(appId) {
        try {
            const serverConfig = await new Promise((resolve, reject) => {
                /**
                 * Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
                 */
                JSONP(`${SdkEnvironment_1.default.getOneSignalApiUrl().toString()}/sync/${appId.value}/web`, null, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        if (data.success) {
                            resolve(data);
                        }
                        else {
                            // For JSONP, we return a 200 even for errors, there's a success: false param
                            reject(data);
                        }
                    }
                });
            });
            const config = new AppConfig_1.AppConfig();
            if (serverConfig.features) {
                if (serverConfig.features.cookie_sync && serverConfig.features.cookie_sync.enable) {
                    config.cookieSyncEnabled = true;
                }
            }
            if (serverConfig.config) {
                if (serverConfig.config.http_use_onesignal_com) {
                    config.httpUseOneSignalCom = true;
                }
                if (serverConfig.config.safari_web_id) {
                    config.safariWebId = serverConfig.config.safari_web_id;
                }
                if (serverConfig.config.subdomain) {
                    config.subdomain = serverConfig.config.subdomain;
                }
            }
            return config;
        }
        catch (e) {
            throw e;
        }
    }
}
exports.default = OneSignalApi;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/OneSignalApi.js.map

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
const Browser = __webpack_require__(11);
const MainHelper_1 = __webpack_require__(10);
const Launcher_1 = __webpack_require__(53);
const Badge_1 = __webpack_require__(50);
const Button_1 = __webpack_require__(51);
const Dialog_1 = __webpack_require__(52);
const Message_1 = __webpack_require__(29);
const SubscriptionHelper_1 = __webpack_require__(6);
var logoSvg = `<svg class="onesignal-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7"><circle class="background" cx="49.9" cy="49.9" r="49.9"/><path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z"/><ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"/></svg>`;
class Bell {
    static get EVENTS() {
        return {
            STATE_CHANGED: 'notifyButtonStateChange',
            LAUNCHER_CLICK: 'notifyButtonLauncherClick',
            BELL_CLICK: 'notifyButtonButtonClick',
            SUBSCRIBE_CLICK: 'notifyButtonSubscribeClick',
            UNSUBSCRIBE_CLICK: 'notifyButtonUnsubscribeClick',
            HOVERING: 'notifyButtonHovering',
            HOVERED: 'notifyButtonHover'
        };
    }
    static get STATES() {
        return {
            UNINITIALIZED: 'uninitialized',
            SUBSCRIBED: 'subscribed',
            UNSUBSCRIBED: 'unsubscribed',
            BLOCKED: 'blocked'
        };
    }
    static get TEXT_SUBS() {
        return {
            'prompt.native.grant': {
                default: 'Allow',
                chrome: 'Allow',
                firefox: 'Always Receive Notifications',
                safari: 'Allow'
            }
        };
    }
    substituteText() {
        // key: 'message.action.subscribing'
        // value: 'Click <strong>{{prompt.native.grant}}</strong> to receive notifications'
        for (var key in this.text) {
            if (this.text.hasOwnProperty(key)) {
                let value = this.text[key];
                // browserName could be 'chrome' or 'firefox' or 'safari'
                let browserName = Browser.name.toLowerCase();
                // tKey: 'prompt.native.grant'  (from TEXT_SUBS)
                // tValue: { chrome: 'Allow', firefox: 'Al... }
                // zValue: 'Allow', if browserName === 'chrome'
                for (var tKey in Bell.TEXT_SUBS) {
                    if (Bell.TEXT_SUBS.hasOwnProperty(tKey)) {
                        let tValue = Bell.TEXT_SUBS[tKey];
                        let zValue = tValue[browserName];
                        if (value && utils_1.contains(value, '{{')) {
                            this.text[key] = value.replace(`{{${tKey}}}`, (zValue !== undefined ? zValue : tValue['default']));
                        }
                    }
                }
            }
        }
    }
    constructor({ enable = false, size = 'medium', position = 'bottom-right', theme = 'default', showLauncherAfter = 10, showBadgeAfter = 300, text = {
            'tip.state.unsubscribed': 'Subscribe to notifications',
            'tip.state.subscribed': "You're subscribed to notifications",
            'tip.state.blocked': "You've blocked notifications",
            'message.prenotify': 'Click to subscribe to notifications',
            'message.action.subscribing': "Click <strong>{{prompt.native.grant}}</strong> to receive notifications",
            'message.action.subscribed': "Thanks for subscribing!",
            'message.action.resubscribed': "You're subscribed to notifications",
            'message.action.unsubscribed': "You won't receive notifications again",
            'dialog.main.title': 'Manage Site Notifications',
            'dialog.main.button.subscribe': 'SUBSCRIBE',
            'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            'dialog.blocked.title': 'Unblock Notifications',
            'dialog.blocked.message': "Follow these instructions to allow notifications:"
        }, prenotify = true, showCredit = true, colors = null, offset = null, launcher = null } = {}) {
        this.options = {
            enable: enable,
            size: size,
            position: position,
            theme: theme,
            showLauncherAfter: showLauncherAfter,
            showBadgeAfter: showBadgeAfter,
            text: text,
            prenotify: prenotify,
            showCredit: showCredit,
            colors: colors,
            offset: offset
        };
        if (!this.options.enable)
            return;
        if (!utils_1.contains(['small', 'medium', 'large'], this.options.size))
            throw new Error(`Invalid size ${this.options.size} for notify button. Choose among 'small', 'medium', or 'large'.`);
        if (!utils_1.contains(['bottom-left', 'bottom-right'], this.options.position))
            throw new Error(`Invalid position ${this.options.position} for notify button. Choose either 'bottom-left', or 'bottom-right'.`);
        if (!utils_1.contains(['default', 'inverse'], this.options.theme))
            throw new Error(`Invalid theme ${this.options.theme} for notify button. Choose either 'default', or 'inverse'.`);
        if (this.options.showLauncherAfter < 0)
            throw new Error(`Invalid delay duration of ${this.options.showLauncherAfter} for showing the notify button. Choose a value above 0.`);
        if (this.options.showBadgeAfter < 0)
            throw new Error(`Invalid delay duration of ${this.options.showBadgeAfter} for showing the notify button's badge. Choose a value above 0.`);
        this.size = this.options.size;
        this.position = this.options.position;
        this.text = this.options.text;
        if (!this.text['tip.state.unsubscribed'])
            this.text['tip.state.unsubscribed'] = 'Subscribe to notifications';
        if (!this.text['tip.state.subscribed'])
            this.text['tip.state.subscribed'] = "You're subscribed to notifications";
        if (!this.text['tip.state.blocked'])
            this.text['tip.state.blocked'] = "You've blocked notifications";
        if (!this.text['message.prenotify'])
            this.text['message.prenotify'] = "Click to subscribe to notifications";
        if (!this.text['message.action.subscribed'])
            this.text['message.action.subscribed'] = "Thanks for subscribing!";
        if (!this.text['message.action.resubscribed'])
            this.text['message.action.resubscribed'] = "You're subscribed to notifications";
        if (!this.text['message.action.subscribing'])
            this.text['message.action.subscribing'] = "Click <strong>{{prompt.native.grant}}</strong> to receive notifications";
        if (!this.text['message.action.unsubscribed'])
            this.text['message.action.unsubscribed'] = "You won't receive notifications again";
        if (!this.text['dialog.main.title'])
            this.text['dialog.main.title'] = 'Manage Site Notifications';
        if (!this.text['dialog.main.button.subscribe'])
            this.text['dialog.main.button.subscribe'] = 'SUBSCRIBE';
        if (!this.text['dialog.main.button.unsubscribe'])
            this.text['dialog.main.button.unsubscribe'] = 'UNSUBSCRIBE';
        if (!this.text['dialog.blocked.title'])
            this.text['dialog.blocked.title'] = 'Unblock Notifications';
        if (!this.text['dialog.blocked.message'])
            this.text['dialog.blocked.message'] = 'Follow these instructions to allow notifications:';
        this._launcher = launcher;
        this.substituteText();
        this.state = Bell.STATES.UNINITIALIZED;
        this._ignoreSubscriptionState = false;
        // Install event hooks
        OneSignal.on(Bell.EVENTS.SUBSCRIBE_CLICK, () => {
            this.dialog.subscribeButton.disabled = true;
            this._ignoreSubscriptionState = true;
            OneSignal.setSubscription(true)
                .then(() => {
                this.dialog.subscribeButton.disabled = false;
                return this.dialog.hide();
            })
                .then(() => {
                return this.message.display(Message_1.default.TYPES.MESSAGE, this.text['message.action.resubscribed'], Message_1.default.TIMEOUT);
            })
                .then(() => {
                this._ignoreSubscriptionState = false;
                this.launcher.clearIfWasInactive();
                return this.launcher.inactivate();
            })
                .then(() => {
                return this.updateState();
            });
        });
        OneSignal.on(Bell.EVENTS.UNSUBSCRIBE_CLICK, () => {
            this.dialog.unsubscribeButton.disabled = true;
            OneSignal.setSubscription(false)
                .then(() => {
                this.dialog.unsubscribeButton.disabled = false;
                return this.dialog.hide();
            })
                .then(() => {
                this.launcher.clearIfWasInactive();
                return this.launcher.activate();
            })
                .then(() => {
                return this.message.display(Message_1.default.TYPES.MESSAGE, this.text['message.action.unsubscribed'], Message_1.default.TIMEOUT);
            })
                .then(() => {
                return this.updateState();
            });
        });
        OneSignal.on(Bell.EVENTS.HOVERING, () => {
            this.hovering = true;
            this.launcher.activateIfInactive();
            // If there's already a message being force shown, do not override
            if (this.message.shown || this.dialog.shown) {
                this.hovering = false;
                return;
            }
            // If the message is a message and not a tip, don't show it (only show tips)
            // Messages will go away on their own
            if (this.message.contentType === Message_1.default.TYPES.MESSAGE) {
                this.hovering = false;
                return;
            }
            new Promise((resolve, reject) => {
                // If a message is being shown
                if (this.message.queued.length > 0) {
                    return this.message.dequeue().then((msg) => {
                        this.message.content = msg;
                        this.message.contentType = Message_1.default.TYPES.QUEUED;
                        resolve();
                    });
                }
                else {
                    this.message.content = utils_1.decodeHtmlEntities(this.message.getTipForState());
                    this.message.contentType = Message_1.default.TYPES.TIP;
                    resolve();
                }
            }).then(() => {
                return this.message.show();
            })
                .then(() => {
                this.hovering = false;
            });
        });
        OneSignal.on(Bell.EVENTS.HOVERED, () => {
            // If a message is displayed (and not a tip), don't control it. Visitors have no control over messages
            if (this.message.contentType === Message_1.default.TYPES.MESSAGE) {
                return;
            }
            if (!this.dialog.hidden) {
                // If the dialog is being brought up when clicking button, don't shrink
                return;
            }
            if (this.hovering) {
                this.hovering = false;
                // Hovering still being true here happens on mobile where the message could still be showing (i.e. animating) when a HOVERED event fires
                // In other words, you tap on mobile, HOVERING fires, and then HOVERED fires immediately after because of the way mobile click events work
                // Basically only happens if HOVERING and HOVERED fire within a few milliseconds of each other
                this.message.waitUntilShown()
                    .then(() => utils_1.delay(Message_1.default.TIMEOUT))
                    .then(() => this.message.hide())
                    .then(() => {
                    if (this.launcher.wasInactive && this.dialog.hidden) {
                        this.launcher.inactivate();
                        this.launcher.wasInactive = null;
                    }
                });
            }
            if (this.message.shown) {
                this.message.hide()
                    .then(() => {
                    if (this.launcher.wasInactive && this.dialog.hidden) {
                        this.launcher.inactivate();
                        this.launcher.wasInactive = null;
                    }
                });
            }
        });
        OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, async (isSubscribed) => {
            if (isSubscribed == true) {
                if (this.badge.shown && this.options.prenotify) {
                    this.badge.hide();
                }
                if (this.dialog.notificationIcons === null) {
                    const icons = await MainHelper_1.default.getNotificationIcons();
                    this.dialog.notificationIcons = icons;
                }
            }
            OneSignal.getNotificationPermission(permission => {
                this.setState((isSubscribed ?
                    Bell.STATES.SUBSCRIBED :
                    ((permission === 'denied') ? Bell.STATES.BLOCKED : Bell.STATES.UNSUBSCRIBED)), this._ignoreSubscriptionState);
            });
        });
        OneSignal.on(Bell.EVENTS.STATE_CHANGED, (state) => {
            if (!this.launcher.element) {
                // Notify button doesn't exist
                return;
            }
            if (state.to === Bell.STATES.SUBSCRIBED) {
                this.launcher.inactivate();
            }
            else if (state.to === Bell.STATES.UNSUBSCRIBED ||
                Bell.STATES.BLOCKED) {
                this.launcher.activate();
            }
        });
        OneSignal.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, (from, to) => {
            this.updateState();
        });
        this.updateState();
    }
    showDialogProcedure() {
        if (!this.dialog.shown) {
            this.dialog.show()
                .then(() => {
                utils_1.once(document, 'click', (e, destroyEventListener) => {
                    let wasDialogClicked = this.dialog.element.contains(e.target);
                    if (wasDialogClicked) {
                    }
                    else {
                        destroyEventListener();
                        if (this.dialog.shown) {
                            this.dialog.hide()
                                .then((e) => {
                                this.launcher.inactivateIfWasInactive();
                            });
                        }
                    }
                }, true);
            });
        }
    }
    async create() {
        if (!this.options.enable)
            return;
        const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
        if (sdkStylesLoadResult !== 0 /* Loaded */) {
            log.debug('Not showing notify button because styles failed to load.');
            return;
        }
        // Remove any existing bell
        if (this.container) {
            utils_1.removeDomElement('#onesignal-bell-container');
        }
        // Insert the bell container
        utils_1.addDomElement('body', 'beforeend', '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-reset"></div>');
        // Insert the bell launcher
        utils_1.addDomElement(this.container, 'beforeend', '<div id="onesignal-bell-launcher" class="onesignal-bell-launcher"></div>');
        // Insert the bell launcher button
        utils_1.addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-button"></div>');
        // Insert the bell launcher badge
        utils_1.addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-badge"></div>');
        // Insert the bell launcher message
        utils_1.addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-message"></div>');
        utils_1.addDomElement(this.message.selector, 'beforeend', '<div class="onesignal-bell-launcher-message-body"></div>');
        // Insert the bell launcher dialog
        utils_1.addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog"></div>');
        utils_1.addDomElement(this.dialog.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog-body"></div>');
        // Install events
        // Add visual elements
        utils_1.addDomElement(this.button.selector, 'beforeEnd', logoSvg);
        const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
        const notOptedOut = await OneSignal.getSubscription();
        const doNotPrompt = await MainHelper_1.default.wasHttpsNativePromptDismissed();
        // Resize to small instead of specified size if enabled, otherwise there's a jerking motion where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
        let resizeTo = (isPushEnabled ? 'small' : this.options.size);
        // Add default classes
        await this.launcher.resize(resizeTo);
        if (this.options.position === 'bottom-left') {
            utils_1.addCssClass(this.container, 'onesignal-bell-container-bottom-left');
            utils_1.addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-left');
        }
        else if (this.options.position === 'bottom-right') {
            utils_1.addCssClass(this.container, 'onesignal-bell-container-bottom-right');
            utils_1.addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-right');
        }
        else {
            throw new Error('Invalid OneSignal notify button position ' + this.options.position);
        }
        if (this.options.theme === 'default') {
            utils_1.addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-default');
        }
        else if (this.options.theme === 'inverse') {
            utils_1.addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-inverse');
        }
        else {
            throw new Error('Invalid OneSignal notify button theme ' + this.options.theme);
        }
        this.applyOffsetIfSpecified();
        this.setCustomColorsIfSpecified();
        this.patchSafariSvgFilterBug();
        log.info('Showing the notify button.');
        await (isPushEnabled ? this.launcher.inactivate() : utils_1.nothing())
            .then(() => OneSignal.getSubscription())
            .then(isNotOptedOut => {
            if ((isPushEnabled || !isNotOptedOut) && this.dialog.notificationIcons === null) {
                return MainHelper_1.default.getNotificationIcons().then((icons) => {
                    this.dialog.notificationIcons = icons;
                });
            }
            else
                return utils_1.nothing();
        })
            .then(() => utils_1.delay(this.options.showLauncherAfter))
            .then(() => {
            if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround() &&
                notOptedOut &&
                doNotPrompt !== true && !isPushEnabled &&
                (OneSignal.config.autoRegister === true) && !MainHelper_1.default.isHttpPromptAlreadyShown() && !MainHelper_1.default.isUsingHttpPermissionRequest()) {
                log.debug('Not showing notify button because popover will be shown.');
                return utils_1.nothing();
            }
            else {
                return this.launcher.show();
            }
        })
            .then(() => {
            return utils_1.delay(this.options.showBadgeAfter);
        })
            .then(() => {
            if (this.options.prenotify && !isPushEnabled && OneSignal._isNewVisitor) {
                return this.message.enqueue(this.text['message.prenotify'])
                    .then(() => this.badge.show());
            }
            else
                return utils_1.nothing();
        })
            .then(() => this.initialized = true);
    }
    patchSafariSvgFilterBug() {
        if (!(Browser.safari && Number(Browser.version) >= 9.1)) {
            let bellShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0.35));`;
            let badgeShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0));`;
            let dialogShadow = `drop-shadow(0px 2px 2px rgba(34,36,38,.15));`;
            this.graphic.setAttribute('style', `filter: ${bellShadow}; -webkit-filter: ${bellShadow};`);
            this.badge.element.setAttribute('style', `filter: ${badgeShadow}; -webkit-filter: ${badgeShadow};`);
            this.dialog.element.setAttribute('style', `filter: ${dialogShadow}; -webkit-filter: ${dialogShadow};`);
        }
        if (Browser.safari) {
            this.badge.element.setAttribute('style', `display: none;`);
        }
    }
    applyOffsetIfSpecified() {
        let offset = this.options.offset;
        if (offset) {
            // Reset styles first
            this.launcher.element.style.cssText = '';
            if (offset.bottom) {
                this.launcher.element.style.cssText += `bottom: ${offset.bottom};`;
            }
            if (this.options.position === 'bottom-right') {
                if (offset.right) {
                    this.launcher.element.style.cssText += `right: ${offset.right};`;
                }
            }
            else if (this.options.position === 'bottom-left') {
                if (offset.left) {
                    this.launcher.element.style.cssText += `left: ${offset.left};`;
                }
            }
        }
    }
    setCustomColorsIfSpecified() {
        // Some common vars first
        let dialogButton = this.dialog.element.querySelector('button.action');
        let pulseRing = this.button.element.querySelector('.pulse-ring');
        // Reset added styles first
        this.graphic.querySelector('.background').style.cssText = '';
        let foregroundElements = this.graphic.querySelectorAll('.foreground');
        for (let i = 0; i < foregroundElements.length; i++) {
            let element = foregroundElements[i];
            element.style.cssText = '';
        }
        this.graphic.querySelector('.stroke').style.cssText = '';
        this.badge.element.style.cssText = '';
        if (dialogButton) {
            dialogButton.style.cssText = '';
            dialogButton.style.cssText = '';
        }
        if (pulseRing) {
            pulseRing.style.cssText = '';
        }
        // Set new styles
        if (this.options.colors) {
            let colors = this.options.colors;
            if (colors['circle.background']) {
                this.graphic.querySelector('.background').style.cssText += `fill: ${colors['circle.background']}`;
            }
            if (colors['circle.foreground']) {
                let foregroundElements = this.graphic.querySelectorAll('.foreground');
                for (let i = 0; i < foregroundElements.length; i++) {
                    let element = foregroundElements[i];
                    element.style.cssText += `fill: ${colors['circle.foreground']}`;
                }
                this.graphic.querySelector('.stroke').style.cssText += `stroke: ${colors['circle.foreground']}`;
            }
            if (colors['badge.background']) {
                this.badge.element.style.cssText += `background: ${colors['badge.background']}`;
            }
            if (colors['badge.bordercolor']) {
                this.badge.element.style.cssText += `border-color: ${colors['badge.bordercolor']}`;
            }
            if (colors['badge.foreground']) {
                this.badge.element.style.cssText += `color: ${colors['badge.foreground']}`;
            }
            if (dialogButton) {
                if (colors['dialog.button.background']) {
                    this.dialog.element.querySelector('button.action').style.cssText += `background: ${colors['dialog.button.background']}`;
                }
                if (colors['dialog.button.foreground']) {
                    this.dialog.element.querySelector('button.action').style.cssText += `color: ${colors['dialog.button.foreground']}`;
                }
                if (colors['dialog.button.background.hovering']) {
                    this.addCssToHead('onesignal-background-hover-style', `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:hover { background: ${colors['dialog.button.background.hovering']} !important; }`);
                }
                if (colors['dialog.button.background.active']) {
                    this.addCssToHead('onesignal-background-active-style', `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:active { background: ${colors['dialog.button.background.active']} !important; }`);
                }
            }
            if (pulseRing) {
                if (colors['pulse.color']) {
                    this.button.element.querySelector('.pulse-ring').style.cssText = `border-color: ${colors['pulse.color']}`;
                }
            }
        }
    }
    addCssToHead(id, css) {
        let existingStyleDom = document.getElementById(id);
        if (existingStyleDom)
            return;
        let styleDom = document.createElement('style');
        styleDom.id = id;
        styleDom.type = 'text/css';
        styleDom.appendChild(document.createTextNode(css));
        document.head.appendChild(styleDom);
    }
    /**
     * Updates the current state to the correct new current state. Returns a promise.
     */
    updateState() {
        Promise.all([
            OneSignal.isPushNotificationsEnabled(),
            OneSignal.getNotificationPermission()
        ])
            .then(([isEnabled, permission]) => {
            this.setState(isEnabled ? Bell.STATES.SUBSCRIBED : Bell.STATES.UNSUBSCRIBED);
            if (permission === 'denied') {
                this.setState(Bell.STATES.BLOCKED);
            }
        });
    }
    /**
     * Updates the current state to the specified new state.
     * @param newState One of ['subscribed', 'unsubscribed'].
     */
    setState(newState, silent = false) {
        let lastState = this.state;
        this.state = newState;
        if (lastState !== newState && !silent) {
            Event_1.default.trigger(Bell.EVENTS.STATE_CHANGED, { from: lastState, to: newState });
            // Update anything that should be changed here in the new state
        }
        // Update anything that should be reset to the same state
    }
    get container() {
        return document.querySelector('#onesignal-bell-container');
    }
    get graphic() {
        return this.button.element.querySelector('svg');
    }
    get launcher() {
        if (!this._launcher)
            this._launcher = new Launcher_1.default(this);
        return this._launcher;
    }
    get button() {
        if (!this._button)
            this._button = new Button_1.default(this);
        return this._button;
    }
    get badge() {
        if (!this._badge)
            this._badge = new Badge_1.default();
        return this._badge;
    }
    get message() {
        if (!this._message)
            this._message = new Message_1.default(this);
        return this._message;
    }
    get dialog() {
        if (!this._dialog)
            this._dialog = new Dialog_1.default(this);
        return this._dialog;
    }
    get subscribed() {
        return this.state === Bell.STATES.SUBSCRIBED;
    }
    get unsubscribed() {
        return this.state === Bell.STATES.UNSUBSCRIBED;
    }
    get blocked() {
        return this.state === Bell.STATES.BLOCKED;
    }
}
exports.default = Bell;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/Bell.js.map

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const Database_1 = __webpack_require__(7);
const Cookie = __webpack_require__(26);
const SubscriptionHelper_1 = __webpack_require__(6);
const SdkEnvironment_1 = __webpack_require__(2);
class TestHelper {
    /**
     * Just for debugging purposes, removes the coookie from hiding the native prompt.
     * @returns {*}
     */
    static unmarkHttpsNativePromptDismissed() {
        if (Cookie.remove('onesignal-notification-prompt')) {
            log.debug('OneSignal: Removed the native notification prompt dismissed cookie.');
        }
        else {
            log.debug('OneSignal: Cookie not marked.');
        }
    }
    /**
     * Creates a session cookie to note that the user does not want to be disturbed.
     */
    static async markHttpsNativePromptDismissed() {
        /**
         * Note: The cookie must be stored both on subdomain.onesignal.com and the main site.
         *
         * When checking whether the prompt was previously dismissed, certain code cannot be asynchronous otherwise the browser
         * treats it like a blocked popup, so Cookies are synchronous while IndexedDb access / PostMessage querying across origins are
         * both asynchronous.
         */
        if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
            await new Promise((resolve, reject) => {
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.MARK_PROMPT_DISMISSED, {}, reply => {
                    if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                        resolve();
                    }
                    else {
                        reject();
                    }
                });
            });
        }
        let dismissCount = await Database_1.default.get('Options', 'promptDismissCount');
        if (!dismissCount) {
            dismissCount = 0;
        }
        /**
         * This will be run twice for HTTP sites, since we share IndexedDb, so we don't run it for HTTP sites.
         */
        if (!SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
            dismissCount += 1;
        }
        let dismissDays = 3;
        if (dismissCount == 2) {
            dismissDays = 7;
        }
        else if (dismissCount > 2) {
            dismissDays = 30;
        }
        log.debug(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) OneSignal: User dismissed the native notification prompt; reprompt after ${dismissDays} days.`);
        await Database_1.default.put('Options', { key: 'promptDismissCount', value: dismissCount });
        return Cookie.set('onesignal-notification-prompt', 'dismissed', {
            // In 8 hours, or 1/3 of the day
            expires: dismissDays
        });
    }
}
exports.default = TestHelper;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/helpers/TestHelper.js.map

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {
Object.defineProperty(exports, "__esModule", { value: true });
const isUuid = __webpack_require__(90);
const InvalidUuidError_1 = __webpack_require__(56);
class Uuid {
    get value() {
        return this.uuid;
    }
    constructor(uuid = Uuid.generate()) {
        if (isUuid(uuid)) {
            this.uuid = uuid;
        }
        else {
            throw new InvalidUuidError_1.default(uuid);
        }
    }
    static generate() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var crypto = typeof window === "undefined" ? global.crypto : (window.crypto || window.msCrypto);
            if (crypto) {
                var r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }
            else {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
        });
    }
}
exports.Uuid = Uuid;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/Uuid.js.map
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(28)))

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
const AnimatedElement_1 = __webpack_require__(21);
const objectAssign = __webpack_require__(4);
class ActiveAnimatedElement extends AnimatedElement_1.default {
    /**
     * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
     * @param selector {string} The CSS selector of the element.
     * @param showClass {string} The CSS class name to add to show the element.
     * @param hideClass {string} The CSS class name to remove to hide the element.
     * @param activeClass {string} The CSS class name to add to activate the element.
     * @param inactiveClass {string} The CSS class name to remove to inactivate the element.
     * @param state {string} The current state of the element, defaults to 'shown'.
     * @param activeState {string} The current state of the element, defaults to 'active'.
     * @param targetTransitionEvents {string} An array of properties (e.g. ['transform', 'opacity']) to look for on transitionend of show() and hide() to know the transition is complete. As long as one matches, the transition is considered complete.
     * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
     */
    constructor(selector, showClass, hideClass, activeClass, inactiveClass, state = 'shown', activeState = 'active', targetTransitionEvents = ['opacity', 'transform'], nestedContentSelector = null) {
        super(selector, showClass, hideClass, state, targetTransitionEvents);
        this.selector = selector;
        this.showClass = showClass;
        this.hideClass = hideClass;
        this.activeClass = activeClass;
        this.inactiveClass = inactiveClass;
        this.state = state;
        this.activeState = activeState;
        this.targetTransitionEvents = targetTransitionEvents;
        this.nestedContentSelector = nestedContentSelector;
    }
    /**
     * Asynchronously activates an element by applying its {activeClass} CSS class.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    activate() {
        if (!this.inactive || !this.shown) {
            return Promise.resolve(this);
        }
        else
            return new Promise((resolve) => {
                this.activeState = 'activating';
                Event_1.default.trigger(ActiveAnimatedElement.EVENTS.ACTIVATING, this);
                if (this.inactiveClass)
                    utils_1.removeCssClass(this.element, this.inactiveClass);
                if (this.activeClass)
                    utils_1.addCssClass(this.element, this.activeClass);
                if (this.shown) {
                    if (this.targetTransitionEvents.length == 0) {
                        return resolve(this);
                    }
                    else {
                        var timerId = setTimeout(() => {
                            log.debug(`Element did not completely activate (state: ${this.state}, activeState: ${this.activeState}).`);
                        }, this.transitionCheckTimeout);
                        utils_1.once(this.element, 'transitionend', (event, destroyListenerFn) => {
                            if (event.target === this.element &&
                                utils_1.contains(this.targetTransitionEvents, event.propertyName)) {
                                clearTimeout(timerId);
                                // Uninstall the event listener for transitionend
                                destroyListenerFn();
                                this.activeState = 'active';
                                Event_1.default.trigger(ActiveAnimatedElement.EVENTS.ACTIVE, this);
                                return resolve(this);
                            }
                        }, true);
                    }
                }
                else {
                    log.debug(`Ending activate() transition (alternative).`);
                    this.activeState = 'active';
                    Event_1.default.trigger(ActiveAnimatedElement.EVENTS.ACTIVE, this);
                    return resolve(this);
                }
            });
    }
    /**
     * Asynchronously activates an element by applying its {activeClass} CSS class.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    inactivate() {
        if (!this.active) {
            return Promise.resolve(this);
        }
        else
            return new Promise((resolve) => {
                this.activeState = 'inactivating';
                Event_1.default.trigger(ActiveAnimatedElement.EVENTS.INACTIVATING, this);
                if (this.activeClass)
                    utils_1.removeCssClass(this.element, this.activeClass);
                if (this.inactiveClass)
                    utils_1.addCssClass(this.element, this.inactiveClass);
                if (this.shown) {
                    if (this.targetTransitionEvents.length == 0) {
                        return resolve(this);
                    }
                    else {
                        var timerId = setTimeout(() => {
                            log.debug(`Element did not completely inactivate (state: ${this.state}, activeState: ${this.activeState}).`);
                        }, this.transitionCheckTimeout);
                        utils_1.once(this.element, 'transitionend', (event, destroyListenerFn) => {
                            if (event.target === this.element &&
                                utils_1.contains(this.targetTransitionEvents, event.propertyName)) {
                                clearTimeout(timerId);
                                // Uninstall the event listener for transitionend
                                destroyListenerFn();
                                this.activeState = 'inactive';
                                Event_1.default.trigger(ActiveAnimatedElement.EVENTS.INACTIVE, this);
                                return resolve(this);
                            }
                        }, true);
                    }
                }
                else {
                    this.activeState = 'inactive';
                    Event_1.default.trigger(ActiveAnimatedElement.EVENTS.INACTIVE, this);
                    return resolve(this);
                }
            });
    }
    /**
     * Asynchronously waits for an element to finish transitioning to being active.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    waitUntilActive() {
        if (this.active)
            return Promise.resolve(this);
        else
            return new Promise((resolve) => {
                OneSignal.once(ActiveAnimatedElement.EVENTS.ACTIVE, (event) => {
                    if (event === this) {
                        return resolve(this);
                    }
                }, true);
            });
    }
    /**
     * Asynchronously waits for an element to finish transitioning to being inactive.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    waitUntilInactive() {
        if (this.inactive)
            return Promise.resolve(this);
        else
            return new Promise((resolve) => {
                OneSignal.once(ActiveAnimatedElement.EVENTS.INACTIVE, (event) => {
                    if (event === this) {
                        return resolve(this);
                    }
                }, true);
            });
    }
    static get EVENTS() {
        return objectAssign({}, AnimatedElement_1.default.EVENTS, {
            ACTIVATING: 'activeAnimatedElementActivating',
            ACTIVE: 'activeAnimatedElementActive',
            INACTIVATING: 'activeAnimatedElementInactivating',
            INACTIVE: 'activeAnimatedElementInactive',
        });
    }
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be transitioning to being activated.
     */
    get activating() {
        return this.activeState === 'activating';
    }
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be already active.
     */
    get active() {
        return this.activeState === 'active';
    }
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be transitioning to inactive.
     */
    get inactivating() {
        return this.activeState === 'inactivating';
    }
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be already inactive.
     */
    get inactive() {
        return this.activeState === 'inactive';
    }
}
exports.default = ActiveAnimatedElement;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/ActiveAnimatedElement.js.map

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
class AnimatedElement {
    /**
     * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
     * @param selector {string} The CSS selector of the element.
     * @param showClass {string} The CSS class name to add to show the element.
     * @param hideClass {string} The CSS class name to remove to hide the element.
     * @param state {string} The current state of the element, defaults to 'shown'.
     * @param targetTransitionEvents {string} An array of properties (e.g. ['transform', 'opacity']) to look for on transitionend of show() and hide() to know the transition is complete. As long as one matches, the transition is considered complete.
     * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
     */
    constructor(selector, showClass, hideClass, state = 'shown', targetTransitionEvents = ['opacity', 'transform'], nestedContentSelector = null, transitionCheckTimeout = 500) {
        this.selector = selector;
        this.showClass = showClass;
        this.hideClass = hideClass;
        this.state = state;
        this.targetTransitionEvents = targetTransitionEvents;
        this.nestedContentSelector = nestedContentSelector;
        this.transitionCheckTimeout = transitionCheckTimeout;
    }
    /**
     * Asynchronously shows an element by applying its {showClass} CSS class.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    show() {
        if (!this.hidden) {
            return Promise.resolve(this);
        }
        else
            return new Promise((resolve) => {
                var self = this;
                this.state = 'showing';
                Event_1.default.trigger(AnimatedElement.EVENTS.SHOWING, this);
                if (this.hideClass)
                    utils_1.removeCssClass(this.element, this.hideClass);
                if (this.showClass)
                    utils_1.addCssClass(this.element, this.showClass);
                if (this.targetTransitionEvents.length == 0) {
                    return resolve(this);
                }
                else {
                    var timerId = setTimeout(() => {
                        log.debug(`Element did not completely show (state: ${this.state}).`);
                    }, this.transitionCheckTimeout);
                    utils_1.once(this.element, 'transitionend', (event, destroyListenerFn) => {
                        if (event.target === this.element &&
                            utils_1.contains(this.targetTransitionEvents, event.propertyName)) {
                            clearTimeout(timerId);
                            // Uninstall the event listener for transitionend
                            destroyListenerFn();
                            this.state = 'shown';
                            Event_1.default.trigger(AnimatedElement.EVENTS.SHOWN, this);
                            return resolve(this);
                        }
                    }, true);
                }
            });
    }
    /**
     * Asynchronously hides an element by applying its {hideClass} CSS class.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    hide() {
        if (!this.shown) {
            return Promise.resolve(this);
        }
        else
            return new Promise((resolve) => {
                this.state = 'hiding';
                Event_1.default.trigger(AnimatedElement.EVENTS.HIDING, this);
                if (this.showClass)
                    utils_1.removeCssClass(this.element, this.showClass);
                if (this.hideClass)
                    utils_1.addCssClass(this.element, this.hideClass);
                if (this.targetTransitionEvents.length == 0) {
                    return resolve(this);
                }
                else {
                    utils_1.once(this.element, 'transitionend', (event, destroyListenerFn) => {
                        var timerId = setTimeout(() => {
                            log.debug(`Element did not completely hide (state: ${this.state}).`);
                        }, this.transitionCheckTimeout);
                        if (event.target === this.element &&
                            utils_1.contains(this.targetTransitionEvents, event.propertyName)) {
                            clearTimeout(timerId);
                            // Uninstall the event listener for transitionend
                            destroyListenerFn();
                            this.state = 'hidden';
                            Event_1.default.trigger(AnimatedElement.EVENTS.HIDDEN, this);
                            return resolve(this);
                        }
                    }, true);
                }
            });
    }
    /**
     * Asynchronously waits for an element to finish transitioning to being shown.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    waitUntilShown() {
        if (this.state === 'shown')
            return Promise.resolve(this);
        else
            return new Promise((resolve) => {
                OneSignal.once(AnimatedElement.EVENTS.SHOWN, (event) => {
                    var self = this;
                    if (event === this) {
                        return resolve(this);
                    }
                }, true);
            });
    }
    /**
     * Asynchronously waits for an element to finish transitioning to being hidden.
     * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
     */
    waitUntilHidden() {
        if (this.state === 'hidden')
            return Promise.resolve(this);
        else
            return new Promise((resolve) => {
                OneSignal.once(AnimatedElement.EVENTS.HIDDEN, (event) => {
                    if (event === this) {
                        return resolve(this);
                    }
                }, true);
            });
    }
    static get EVENTS() {
        return {
            SHOWING: 'animatedElementShowing',
            SHOWN: 'animatedElementShown',
            HIDING: 'animatedElementHiding',
            HIDDEN: 'animatedElementHidden',
        };
    }
    /**
     * Returns the native element's innerHTML property.
     * @returns {string} Returns the native element's innerHTML property.
     */
    get content() {
        if (this.nestedContentSelector)
            return this.element.querySelector(this.nestedContentSelector).innerHTML;
        else
            return this.element.innerHTML;
    }
    /**
     * Sets the native element's innerHTML property.
     * @param value {string} The HTML to set to the element.
     */
    set content(value) {
        if (this.nestedContentSelector) {
            this.element.querySelector(this.nestedContentSelector).innerHTML = value;
        }
        else {
            this.element.innerHTML = value;
        }
    }
    /**
     * Returns the native {Element} via document.querySelector().
     * @returns {Element} Returns the native {Element} via document.querySelector().
     */
    get element() {
        return document.querySelector(this.selector);
    }
    /* States an element can be in */
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be transitioning to being shown.
     */
    get showing() {
        return this.state === 'showing';
    }
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be already shown.
     */
    get shown() {
        return this.state === 'shown';
    }
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be transitioning to hiding.
     */
    get hiding() {
        return this.state === 'hiding';
    }
    /**
     * Synchronously returns the last known state of the element.
     * @returns {boolean} Returns true if the element was last known to be already hidden.
     */
    get hidden() {
        return this.state === 'hidden';
    }
}
exports.default = AnimatedElement;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/AnimatedElement.js.map

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const Database_1 = __webpack_require__(7);
const utils_1 = __webpack_require__(1);
const SubscriptionHelper_1 = __webpack_require__(6);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
class ServiceWorkerHelper {
    static closeNotifications() {
        if (navigator.serviceWorker && !SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
            navigator.serviceWorker.getRegistration()
                .then(registration => {
                if (registration === undefined || !registration.active) {
                    throw new Error('There is no active service worker.');
                }
                else if (OneSignal._channel) {
                    OneSignal._channel.emit('data', 'notification.closeall');
                }
            });
        }
    }
    /*
     Updates an existing OneSignal-only service worker if an older version exists. Does not install a new service worker if none is available or overwrite other service workers.
     This also differs from the original update code we have below in that we do not subscribe for push after.
     Because we're overwriting a service worker, the push token seems to "carry over" (this is good), whereas if we unregistered and registered a new service worker, the push token would be lost (this is bad).
     By not subscribing for push after we register the SW, we don't have to care if notification permissions are granted or not, since users will not be prompted; this update process will be transparent.
     This way we can update the service worker even for autoRegister: false users.
     */
    static updateServiceWorker() {
        let updateCheckAlreadyRan = sessionStorage.getItem('onesignal-update-serviceworker-completed');
        if (!navigator.serviceWorker || (SdkEnvironment_1.default.getWindowEnv() !== WindowEnvironmentKind_1.WindowEnvironmentKind.Host) || location.protocol !== 'https:' || updateCheckAlreadyRan == "true") {
            log.debug('Skipping service worker update for existing session.');
            return;
        }
        try {
            sessionStorage.setItem('onesignal-update-serviceworker-completed', "true");
        }
        catch (e) {
            log.error(e);
        }
        return navigator.serviceWorker.getRegistration().then(function (serviceWorkerRegistration) {
            var sw_path = "";
            if (OneSignal.config.path)
                sw_path = OneSignal.config.path;
            if (serviceWorkerRegistration && serviceWorkerRegistration.active) {
                // An existing service worker
                let previousWorkerUrl = serviceWorkerRegistration.active.scriptURL;
                if (utils_1.contains(previousWorkerUrl, sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH)) {
                    // OneSignalSDKWorker.js was installed
                    log.debug('(Service Worker Update)', 'The main service worker is active.');
                    return Database_1.default.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION')
                        .then(function (version) {
                        // Get version of installed worker saved to IndexedDB
                        if (version) {
                            // If a version exists
                            log.debug('(Service Worker Update)', `Stored service worker version v${version}.`);
                            if (version != OneSignal._VERSION) {
                                // If there is a different version
                                log.debug('(Service Worker Update)', 'New service worker version exists:', OneSignal._VERSION);
                                log.info(`Upgrading service worker (v${version} -> v${OneSignal._VERSION})`);
                                return navigator.serviceWorker.register(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM);
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
                            return navigator.serviceWorker.register(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_UPDATER_PATH, OneSignal.SERVICE_WORKER_PARAM);
                        }
                    });
                }
                else if (utils_1.contains(previousWorkerUrl, sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_UPDATER_PATH)) {
                    // OneSignalSDKUpdaterWorker.js was installed
                    log.debug('(Service Worker Update)', 'The alternate service worker is active.');
                    return Database_1.default.get('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION')
                        .then(function (version) {
                        // Get version of installed worker saved to IndexedDB
                        if (version) {
                            // If a version exists
                            log.debug('(Service Worker Update)', `Stored service worker version v${version}.`);
                            if (version != OneSignal._VERSION) {
                                // If there is a different version
                                log.debug('(Service Worker Update)', 'New service worker version exists:', OneSignal._VERSION);
                                log.info(`Upgrading new service worker (v${version} -> v${OneSignal._VERSION})`);
                                return navigator.serviceWorker.register(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM);
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
                            return navigator.serviceWorker.register(sw_path + SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM);
                        }
                    });
                }
                else {
                    // Some other service worker not belonging to us was installed
                    // Don't install ours over it
                }
            }
        });
    }
    static registerServiceWorker(full_sw_and_path) {
        log.debug(`Called %cregisterServiceWorker(${JSON.stringify(full_sw_and_path, null, 4)})`, utils_1.getConsoleStyle('code'));
        navigator.serviceWorker.register(full_sw_and_path, OneSignal.SERVICE_WORKER_PARAM).then(SubscriptionHelper_1.default.enableNotifications, ServiceWorkerHelper.registerError);
    }
    static registerError(err) {
        log.error("ServiceWorker registration", err);
    }
    static isServiceWorkerActive(callback) {
        if (!('serviceWorker' in navigator)) {
            return false;
        }
        function isServiceWorkerRegistrationActive(serviceWorkerRegistration) {
            return serviceWorkerRegistration &&
                serviceWorkerRegistration.active &&
                serviceWorkerRegistration.active.state === 'activated' &&
                (utils_1.contains(serviceWorkerRegistration.active.scriptURL, 'OneSignalSDKWorker') ||
                    utils_1.contains(serviceWorkerRegistration.active.scriptURL, 'OneSignalSDKUpdaterWorker'));
        }
        return new Promise((resolve, reject) => {
            if (!SubscriptionHelper_1.default.isUsingSubscriptionWorkaround() && SdkEnvironment_1.default.getWindowEnv() !== WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame) {
                let isServiceWorkerActive = false;
                if (navigator.serviceWorker.getRegistrations) {
                    navigator.serviceWorker.getRegistrations().then(serviceWorkerRegistrations => {
                        for (let serviceWorkerRegistration of serviceWorkerRegistrations) {
                            if (isServiceWorkerRegistrationActive(serviceWorkerRegistration)) {
                                isServiceWorkerActive = true;
                            }
                        }
                        if (callback) {
                            callback(isServiceWorkerActive);
                        }
                        resolve(isServiceWorkerActive);
                    });
                }
                else {
                    navigator.serviceWorker.ready.then(serviceWorkerRegistration => {
                        if (isServiceWorkerRegistrationActive(serviceWorkerRegistration)) {
                            isServiceWorkerActive = true;
                        }
                        if (callback) {
                            callback(isServiceWorkerActive);
                        }
                        resolve(isServiceWorkerActive);
                    });
                }
            }
            else {
                if (callback) {
                    callback(false);
                }
                resolve(false);
            }
        });
    }
}
exports.default = ServiceWorkerHelper;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/helpers/ServiceWorkerHelper.js.map

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var BuildEnvironmentKind;
(function (BuildEnvironmentKind) {
    BuildEnvironmentKind[BuildEnvironmentKind["Development"] = "Development"] = "Development";
    BuildEnvironmentKind[BuildEnvironmentKind["Staging"] = "Staging"] = "Staging";
    BuildEnvironmentKind[BuildEnvironmentKind["Production"] = "Production"] = "Production";
})(BuildEnvironmentKind = exports.BuildEnvironmentKind || (exports.BuildEnvironmentKind = {}));
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/BuildEnvironmentKind.js.map

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Uuid_1 = __webpack_require__(19);
const objectAssign = __webpack_require__(4);
const SdkEnvironment_1 = __webpack_require__(2);
const SubscriptionHelper_1 = __webpack_require__(6);
const log = __webpack_require__(0);
class RemoteFrame {
    constructor(initOptions) {
        this.options = {
            appId: new Uuid_1.Uuid(initOptions.appId),
            subdomain: initOptions.subdomainName,
            origin: initOptions.origin
        };
    }
    /**
     * Loads the messenger on the iFrame to communicate with the host page and
     * assigns init options to an iFrame-only initialization of OneSignal.
     *
     * Our main host page will wait for all iFrame scripts to complete since the
     * host page uses the iFrame onload event to begin sending handshake messages
     * to the iFrame.
     *
     * There is no load timeout here; the iFrame initializes it scripts and waits
     * forever for the first handshake message.
     */
    initialize() {
        const creator = window.opener || window.parent;
        if (creator == window) {
            document.write(`<span style='font-size: 14px; color: red; font-family: sans-serif;'>OneSignal: This page cannot be directly opened, and must be opened as a result of a subscription call.</span>`);
            return;
        }
        // The rest of our SDK isn't refactored enough yet to accept typed objects
        // Within this class, we can use them, but when we assign them to
        // OneSignal.config, assign the simple string versions
        const rasterizedOptions = objectAssign(this.options);
        rasterizedOptions.appId = rasterizedOptions.appId.value;
        rasterizedOptions.origin = rasterizedOptions.origin;
        OneSignal.config = rasterizedOptions || {};
        OneSignal.initialized = true;
        this.loadPromise = {};
        this.loadPromise.promise = new Promise((resolve, reject) => {
            this.loadPromise.resolver = resolve;
            this.loadPromise.rejector = reject;
        });
        this.establishCrossOriginMessaging();
        return this.loadPromise.promise;
    }
    establishCrossOriginMessaging() {
    }
    dispose() {
        // Removes all events
        this.messenger.destroy();
    }
    finishInitialization() {
        this.loadPromise.resolver();
    }
    async subscribe() {
        // Do not register OneSignalSDKUpdaterWorker.js for HTTP popup sites; the file does not exist
        const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
        if (!isPushEnabled) {
            try {
                const workerRegistration = await navigator.serviceWorker.register(SdkEnvironment_1.default.getBuildEnvPrefix() + OneSignal.SERVICE_WORKER_PATH, OneSignal.SERVICE_WORKER_PARAM);
                SubscriptionHelper_1.default.enableNotifications(workerRegistration);
            }
            catch (e) {
                log.error('Failed to register service worker in the popup/modal:', e);
            }
        }
        else {
            window.close();
        }
    }
}
exports.default = RemoteFrame;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/frames/RemoteFrame.js.map

/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = function atoa (a, n) { return Array.prototype.slice.call(a, n); }


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
 * JavaScript Cookie v2.1.3
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader = false;
	if (true) {
		!(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
				__WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		registeredInModuleLoader = true;
	}
	if (true) {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function init (converter) {
		function api (key, value, attributes) {
			var result;
			if (typeof document === 'undefined') {
				return;
			}

			// Write

			if (arguments.length > 1) {
				attributes = extend({
					path: '/'
				}, api.defaults, attributes);

				if (typeof attributes.expires === 'number') {
					var expires = new Date();
					expires.setMilliseconds(expires.getMilliseconds() + attributes.expires * 864e+5);
					attributes.expires = expires;
				}

				try {
					result = JSON.stringify(value);
					if (/^[\{\[]/.test(result)) {
						value = result;
					}
				} catch (e) {}

				if (!converter.write) {
					value = encodeURIComponent(String(value))
						.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
				} else {
					value = converter.write(value, key);
				}

				key = encodeURIComponent(String(key));
				key = key.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent);
				key = key.replace(/[\(\)]/g, escape);

				return (document.cookie = [
					key, '=', value,
					attributes.expires ? '; expires=' + attributes.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
					attributes.path ? '; path=' + attributes.path : '',
					attributes.domain ? '; domain=' + attributes.domain : '',
					attributes.secure ? '; secure' : ''
				].join(''));
			}

			// Read

			if (!key) {
				result = {};
			}

			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling "get()"
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var rdecode = /(%[0-9A-Z]{2})+/g;
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = parts[0].replace(rdecode, decodeURIComponent);
					cookie = converter.read ?
						converter.read(cookie, name) : converter(cookie, name) ||
						cookie.replace(rdecode, decodeURIComponent);

					if (this.json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					if (key === name) {
						result = cookie;
						break;
					}

					if (!key) {
						result[name] = cookie;
					}
				} catch (e) {}
			}

			return result;
		}

		api.set = api;
		api.get = function (key) {
			return api.call(api, key);
		};
		api.getJSON = function () {
			return api.apply({
				json: true
			}, [].slice.call(arguments));
		};
		api.defaults = {};

		api.remove = function (key, attributes) {
			api(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

if (typeof navigator === "undefined") {
} else {
  var page = __webpack_require__(86);
  var worker = __webpack_require__(87);
  var api;

  if ('serviceWorker' in navigator) {
    api = page();
  } else if ('clients' in self) {
    api = worker();
  } else {
    api = {
      on: complain,
      once: complain,
      off: complain,
      emit: complain,
      broadcast: complain
    };
  }

  function complain () {
    throw new Error('Swivel couldn\'t detect ServiceWorker support. Please feature detect before using Swivel in your web pages!');
  }

  module.exports = api;
}


/***/ }),
/* 28 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const AnimatedElement_1 = __webpack_require__(21);
const Bell_1 = __webpack_require__(17);
class Message extends AnimatedElement_1.default {
    constructor(bell) {
        super('.onesignal-bell-launcher-message', 'onesignal-bell-launcher-message-opened', null, 'hidden', ['opacity', 'transform'], '.onesignal-bell-launcher-message-body');
        this.bell = bell;
        this.contentType = '';
        this.queued = [];
    }
    static get TIMEOUT() {
        return 2500;
    }
    static get TYPES() {
        return {
            TIP: 'tip',
            MESSAGE: 'message',
            QUEUED: 'queued' // This message was a user-queued message
        };
    }
    display(type, content, duration = 0) {
        log.debug(`Calling %cdisplay(${type}, ${content}, ${duration}).`, utils_1.getConsoleStyle('code'));
        return (this.shown ? this.hide() : utils_1.nothing())
            .then(() => {
            this.content = utils_1.decodeHtmlEntities(content);
            this.contentType = type;
        })
            .then(() => {
            return this.show();
        })
            .then(() => utils_1.delay(duration))
            .then(() => {
            return this.hide();
        })
            .then(() => {
            // Reset back to normal content type so stuff can show a gain
            this.content = this.getTipForState();
            this.contentType = 'tip';
        });
    }
    getTipForState() {
        if (this.bell.state === Bell_1.default.STATES.UNSUBSCRIBED)
            return this.bell.text['tip.state.unsubscribed'];
        else if (this.bell.state === Bell_1.default.STATES.SUBSCRIBED)
            return this.bell.text['tip.state.subscribed'];
        else if (this.bell.state === Bell_1.default.STATES.BLOCKED)
            return this.bell.text['tip.state.blocked'];
    }
    enqueue(message, notify = false) {
        this.queued.push(utils_1.decodeHtmlEntities(message));
        return new Promise((resolve) => {
            if (this.bell.badge.shown) {
                this.bell.badge.hide()
                    .then(() => this.bell.badge.increment())
                    .then(() => this.bell.badge.show())
                    .then(resolve);
            }
            else {
                this.bell.badge.increment();
                if (this.bell.initialized)
                    this.bell.badge.show().then(resolve);
                else
                    resolve();
            }
        });
    }
    dequeue(message) {
        let dequeuedMessage = this.queued.pop(message);
        return new Promise((resolve) => {
            if (this.bell.badge.shown) {
                this.bell.badge.hide()
                    .then(() => this.bell.badge.decrement())
                    .then((numMessagesLeft) => {
                    if (numMessagesLeft > 0) {
                        return this.bell.badge.show();
                    }
                    else {
                        return Promise.resolve(this);
                    }
                })
                    .then(resolve(dequeuedMessage));
            }
            else {
                this.bell.badge.decrement();
                resolve(dequeuedMessage);
            }
        });
    }
}
exports.default = Message;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/Message.js.map

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
class AlreadySubscribedError extends OneSignalError_1.default {
    constructor() {
        super('This operation can only be performed when the user is not subscribed.');
    }
}
exports.default = AlreadySubscribedError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/AlreadySubscribedError.js.map

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
class PermissionMessageDismissedError extends OneSignalError_1.default {
    constructor() {
        super('The permission message was previously dismissed.');
    }
}
exports.default = PermissionMessageDismissedError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/PermissionMessageDismissedError.js.map

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
class PushPermissionNotGrantedError extends OneSignalError_1.default {
    constructor() {
        super(`The push permission was not granted.`);
    }
}
exports.default = PushPermissionNotGrantedError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/PushPermissionNotGrantedError.js.map

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
class TimeoutError extends OneSignalError_1.default {
    constructor(message = "The asynchronous operation has timed out.") {
        super(message);
        this.message = message;
    }
}
exports.default = TimeoutError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/TimeoutError.js.map

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
const utils_1 = __webpack_require__(1);
const SubscriptionHelper_1 = __webpack_require__(6);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
const SubscriptionModal_1 = __webpack_require__(69);
const SubscriptionPopup_1 = __webpack_require__(71);
const ProxyFrame_1 = __webpack_require__(67);
const LegacyManager_1 = __webpack_require__(37);
class HttpHelper {
    static async isShowingHttpPermissionRequest() {
        if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
            return await OneSignal.proxyFrameHost.isShowingHttpPermissionRequest();
        }
        else {
            return OneSignal._showingHttpPermissionRequest;
        }
    }
    // Http only - Only called from iframe's init.js
    static async initHttp(options) {
        log.debug(`Called %cinitHttp(${JSON.stringify(options, null, 4)})`, utils_1.getConsoleStyle('code'));
        switch (SdkEnvironment_1.default.getWindowEnv()) {
            case WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame:
                OneSignal.proxyFrame = new ProxyFrame_1.default(options);
                await OneSignal.proxyFrame.initialize();
                /**
                 * Our Rails-side subscription popup/modal depends on
                 * OneSignal.iframePostmam, OneSignal.popupPostmam, and
                 * OneSignal.modalPostmam, which don't exist anymore.
                 */
                LegacyManager_1.default.ensureBackwardsCompatibility(OneSignal);
                break;
            case WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup:
                OneSignal.subscriptionPopup = new SubscriptionPopup_1.default(options);
                await OneSignal.subscriptionPopup.initialize();
                /**
                 * Our Rails-side subscription popup/modal depends on
                 * OneSignal.iframePostmam, OneSignal.popupPostmam, and
                 * OneSignal.modalPostmam, which don't exist anymore.
                 */
                LegacyManager_1.default.ensureBackwardsCompatibility(OneSignal);
                Event_1.default.trigger('httpInitialize');
                break;
            case WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionModal:
                OneSignal.subscriptionModal = new SubscriptionModal_1.default(options);
                // Do not await on modal initialization; the modal uses direct
                // postmessage and does not establish a "connection" to wait on
                OneSignal.subscriptionModal.initialize();
                /**
                 * Our Rails-side subscription popup/modal depends on
                 * OneSignal.iframePostmam, OneSignal.popupPostmam, and
                 * OneSignal.modalPostmam, which don't exist anymore.
                 */
                LegacyManager_1.default.ensureBackwardsCompatibility(OneSignal);
                Event_1.default.trigger('httpInitialize');
                break;
            default:
                log.error("Unsupported HTTP initialization branch.");
                break;
        }
    }
}
exports.default = HttpHelper;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/helpers/HttpHelper.js.map

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const LimitStore_1 = __webpack_require__(15);
const Event_1 = __webpack_require__(3);
const Database_1 = __webpack_require__(7);
const Browser = __webpack_require__(11);
const utils_1 = __webpack_require__(1);
const MainHelper_1 = __webpack_require__(10);
const ServiceWorkerHelper_1 = __webpack_require__(22);
const SubscriptionHelper_1 = __webpack_require__(6);
const EventHelper_1 = __webpack_require__(13);
const InvalidStateError_1 = __webpack_require__(14);
const AlreadySubscribedError_1 = __webpack_require__(30);
const PermissionMessageDismissedError_1 = __webpack_require__(31);
const NotificationPermission_1 = __webpack_require__(39);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
const SubscriptionModalHost_1 = __webpack_require__(70);
const objectAssign = __webpack_require__(4);
const TestHelper_1 = __webpack_require__(18);
class InitHelper {
    static storeInitialValues() {
        return Promise.all([
            OneSignal.isPushNotificationsEnabled(),
            OneSignal.getNotificationPermission(),
            OneSignal.getUserId(),
            OneSignal.isOptedOut()
        ])
            .then(([isPushEnabled, notificationPermission, userId, isOptedOut]) => {
            LimitStore_1.default.put('subscription.optedOut', isOptedOut);
            return Promise.all([
                Database_1.default.put('Options', { key: 'isPushEnabled', value: isPushEnabled }),
                Database_1.default.put('Options', {
                    key: 'notificationPermission',
                    value: notificationPermission
                })
            ]);
        });
    }
    /**
     * This event occurs after init.
     * For HTTPS sites, this event is called after init.
     * For HTTP sites, this event is called after the iFrame is created, and a message is received from the iFrame signaling cross-origin messaging is ready.
     * @private
     */
    static async onSdkInitialized() {
        // Store initial values of notification permission, user ID, and manual subscription status
        // This is done so that the values can be later compared to see if anything changed
        // This is done here for HTTPS, it is done after the call to _addSessionIframe in sessionInit for HTTP sites, since the iframe is needed for communication
        InitHelper.storeInitialValues();
        InitHelper.installNativePromptPermissionChangedHook();
        if (await OneSignal.getNotificationPermission() === NotificationPermission_1.NotificationPermission.Granted) {
            /*
              If the user has already granted permission, the user has previously
              already subscribed. Don't show welcome notifications if the user is
              automatically resubscribed.
            */
            OneSignal.__doNotShowWelcomeNotification = true;
        }
        if (navigator.serviceWorker &&
            window.location.protocol === 'https:' &&
            !(await SubscriptionHelper_1.default.hasInsecureParentOrigin())) {
            navigator.serviceWorker.getRegistration()
                .then(registration => {
                if (registration && registration.active) {
                    MainHelper_1.default.establishServiceWorkerChannel(registration);
                }
            })
                .catch(e => {
                if (e.code === 9) {
                    if (location.protocol === 'http:' || SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame) {
                        // This site is an HTTP site with an <iframe>
                        // We can no longer register service workers since Chrome 42
                        log.debug(`Expected error getting service worker registration on ${location.href}:`, e);
                    }
                }
                else {
                    log.error(`Error getting Service Worker registration on ${location.href}:`, e);
                }
            });
        }
        MainHelper_1.default.showNotifyButton();
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
                    InitHelper.sessionInit({ __sdkCall: true });
                }
            });
        }
        if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround() && !MainHelper_1.default.isContinuingBrowserSession()) {
            /*
             The user is on an HTTP site and they accessed this site by opening a new window or tab (starting a new
             session). This means we should increment their session_count and last_active by calling
             registerWithOneSignal(). Without this call, the user's session and last_active is not updated. We only
             do this if the user is actually registered with OneSignal though.
             */
            log.debug(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) Updating session info for HTTP site.`);
            OneSignal.isPushNotificationsEnabled(isPushEnabled => {
                if (isPushEnabled) {
                    return MainHelper_1.default.getAppId()
                        .then(appId => MainHelper_1.default.registerWithOneSignal(appId, null));
                }
            });
        }
        MainHelper_1.default.checkAndDoHttpPermissionRequest();
        OneSignal.cookieSyncer.install();
    }
    static installNativePromptPermissionChangedHook() {
        if (navigator.permissions && !(Browser.firefox && Number(Browser.version) <= 45)) {
            OneSignal._usingNativePermissionHook = true;
            // If the browser natively supports hooking the subscription prompt permission change event
            //     use it instead of our SDK method
            navigator.permissions.query({ name: 'notifications' }).then(function (permissionStatus) {
                permissionStatus.onchange = function () {
                    EventHelper_1.default.triggerNotificationPermissionChanged();
                };
            });
        }
    }
    static saveInitOptions() {
        let opPromises = [];
        if (OneSignal.config.persistNotification === false) {
            opPromises.push(Database_1.default.put('Options', { key: 'persistNotification', value: false }));
        }
        else {
            if (OneSignal.config.persistNotification === true) {
                opPromises.push(Database_1.default.put('Options', { key: 'persistNotification', value: 'force' }));
            }
            else {
                opPromises.push(Database_1.default.put('Options', { key: 'persistNotification', value: true }));
            }
        }
        let webhookOptions = OneSignal.config.webhooks;
        ['notification.displayed', 'notification.clicked', 'notification.dismissed'].forEach(event => {
            if (webhookOptions && webhookOptions[event]) {
                opPromises.push(Database_1.default.put('Options', { key: `webhooks.${event}`, value: webhookOptions[event] }));
            }
            else {
                opPromises.push(Database_1.default.put('Options', { key: `webhooks.${event}`, value: false }));
            }
        });
        if (webhookOptions && webhookOptions.cors) {
            opPromises.push(Database_1.default.put('Options', { key: `webhooks.cors`, value: true }));
        }
        else {
            opPromises.push(Database_1.default.put('Options', { key: `webhooks.cors`, value: false }));
        }
        if (OneSignal.config.notificationClickHandlerMatch) {
            opPromises.push(Database_1.default.put('Options', {
                key: 'notificationClickHandlerMatch',
                value: OneSignal.config.notificationClickHandlerMatch
            }));
        }
        else {
            opPromises.push(Database_1.default.put('Options', { key: 'notificationClickHandlerMatch', value: 'exact' }));
        }
        if (OneSignal.config.notificationClickHandlerAction) {
            opPromises.push(Database_1.default.put('Options', {
                key: 'notificationClickHandlerAction',
                value: OneSignal.config.notificationClickHandlerAction
            }));
        }
        else {
            opPromises.push(Database_1.default.put('Options', { key: 'notificationClickHandlerAction', value: 'navigate' }));
        }
        if (OneSignal.config.serviceWorkerRefetchRequests === false) {
            opPromises.push(Database_1.default.put('Options', { key: 'serviceWorkerRefetchRequests', value: false }));
        }
        else {
            opPromises.push(Database_1.default.put('Options', { key: 'serviceWorkerRefetchRequests', value: true }));
        }
        return Promise.all(opPromises);
    }
    static async internalInit() {
        log.debug('Called %cinternalInit()', utils_1.getConsoleStyle('code'));
        const appId = await Database_1.default.get('Ids', 'appId');
        // HTTPS - Only register for push notifications once per session or if the user changes notification permission to Ask or Allow.
        if (sessionStorage.getItem("ONE_SIGNAL_SESSION")
            && !OneSignal.config.subdomainName
            && (window.Notification.permission == "denied"
                || sessionStorage.getItem("ONE_SIGNAL_NOTIFICATION_PERMISSION") == window.Notification.permission)) {
            Event_1.default.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            return;
        }
        sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", window.Notification.permission);
        if (Browser.safari && OneSignal.config.autoRegister === false) {
            log.debug('On Safari and autoregister is false, skipping sessionInit().');
            // This *seems* to trigger on either Safari's autoregister false or Chrome HTTP
            // Chrome HTTP gets an SDK_INITIALIZED event from the iFrame postMessage, so don't call it here
            if (!SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
                Event_1.default.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            }
            return;
        }
        if (OneSignal.config.autoRegister === false && !OneSignal.config.subdomainName) {
            log.debug('Skipping internal init. Not auto-registering and no subdomain.');
            /* 3/25: If a user is already registered, re-register them in case the clicked Blocked and then Allow (which immediately invalidates the GCM token as soon as you click Blocked) */
            Event_1.default.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
            if (isPushEnabled && !SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
                log.info('Because the user is already subscribed and has enabled notifications, we will re-register their GCM token.');
                // Resubscribes them, and in case their GCM registration token was invalid, gets a new one
                SubscriptionHelper_1.default.registerForW3CPush({});
            }
            else {
                ServiceWorkerHelper_1.default.updateServiceWorker();
            }
            return;
        }
        if (document.visibilityState !== "visible") {
            utils_1.once(document, 'visibilitychange', (e, destroyEventListener) => {
                if (document.visibilityState === 'visible') {
                    destroyEventListener();
                    InitHelper.sessionInit({ __sdkCall: true });
                }
            }, true);
            return;
        }
        InitHelper.sessionInit({ __sdkCall: true });
    }
    // overridingPageTitle: Only for the HTTP Iframe, pass the page title in from the top frame
    static async initSaveState(overridingPageTitle) {
        const appId = await MainHelper_1.default.getAppId();
        await Database_1.default.put("Ids", { type: "appId", id: appId });
        const initialPageTitle = overridingPageTitle || document.title || 'Notification';
        await Database_1.default.put("Options", { key: "pageTitle", value: initialPageTitle });
        log.info(`OneSignal: Set pageTitle to be '${initialPageTitle}'.`);
    }
    static sessionInit(options) {
        log.debug(`Called %csessionInit(${JSON.stringify(options)})`, utils_1.getConsoleStyle('code'));
        if (OneSignal._sessionInitAlreadyRunning) {
            log.debug('Returning from sessionInit because it has already been called.');
            return;
        }
        else {
            OneSignal._sessionInitAlreadyRunning = true;
        }
        var hostPageProtocol = `${location.protocol}//`;
        if (Browser.safari) {
            if (OneSignal.config.safari_web_id) {
                MainHelper_1.default.getAppId()
                    .then(appId => {
                    window.safari.pushNotification.requestPermission(`${SdkEnvironment_1.default.getOneSignalApiUrl().toString()}/safari`, OneSignal.config.safari_web_id, { app_id: appId }, pushResponse => {
                        log.info('Safari Registration Result:', pushResponse);
                        if (pushResponse.deviceToken) {
                            let subscriptionInfo = {
                                // Safari's subscription returns a device token (e.g. 03D5D4A2EBCE1EE2AED68E12B72B1B995C2BFB811AB7DBF973C84FED66C6D1D5)
                                endpointOrToken: pushResponse.deviceToken.toLowerCase()
                            };
                            MainHelper_1.default.registerWithOneSignal(appId, subscriptionInfo);
                        }
                        else {
                            MainHelper_1.default.beginTemporaryBrowserSession();
                        }
                        EventHelper_1.default.triggerNotificationPermissionChanged();
                    });
                });
            }
        }
        else if (options.modalPrompt && options.fromRegisterFor) {
            Promise.all([
                MainHelper_1.default.getAppId(),
                OneSignal.isPushNotificationsEnabled(),
                OneSignal.getNotificationPermission()
            ])
                .then(([appId, isPushEnabled, notificationPermission]) => {
                OneSignal.subscriptionModalHost = new SubscriptionModalHost_1.default({ appId: appId }, options);
                OneSignal.subscriptionModalHost.load();
            });
        }
        else if ('serviceWorker' in navigator && !SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
            if (options.__sdkCall && MainHelper_1.default.wasHttpsNativePromptDismissed()) {
                log.debug('OneSignal: Not automatically showing native HTTPS prompt because the user previously dismissed it.');
                OneSignal._sessionInitAlreadyRunning = false;
            }
            else {
                const permission = window.Notification.permission;
                if (permission === NotificationPermission_1.NotificationPermission.Default) {
                    Event_1.default.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
                }
                window.Notification.requestPermission(permission => {
                    MainHelper_1.default.checkAndTriggerNotificationPermissionChanged();
                    if (permission === "granted") {
                        SubscriptionHelper_1.default.registerForW3CPush(options);
                    }
                    else if (window.Notification.permission === "default") {
                        OneSignal._sessionInitAlreadyRunning = false;
                        EventHelper_1.default.triggerNotificationPermissionChanged(true);
                        TestHelper_1.default.markHttpsNativePromptDismissed();
                    }
                    else if (window.Notification.permission === "denied") {
                        OneSignal._sessionInitAlreadyRunning = false;
                    }
                });
            }
        }
        else {
            if (OneSignal.config.autoRegister !== true) {
                log.debug('OneSignal: Not automatically showing popover because autoRegister is not specifically true.');
            }
            if (MainHelper_1.default.isHttpPromptAlreadyShown()) {
                log.debug('OneSignal: Not automatically showing popover because it was previously shown in the same session.');
            }
            if ((OneSignal.config.autoRegister === true) && !MainHelper_1.default.isHttpPromptAlreadyShown()) {
                OneSignal.showHttpPrompt().catch(e => {
                    if (e instanceof InvalidStateError_1.InvalidStateError && (e.reason === InvalidStateError_1.InvalidStateReason[InvalidStateError_1.InvalidStateReason.RedundantPermissionMessage]) ||
                        e instanceof PermissionMessageDismissedError_1.default ||
                        e instanceof AlreadySubscribedError_1.default) {
                        log.debug('[Prompt Not Showing]', e);
                        // Another prompt is being shown, that's okay
                    }
                    else
                        throw e;
                });
            }
        }
        Event_1.default.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
    }
    static getMergedLegacyConfig(userConfig, serverConfig) {
        /**
         * How Object.assign() works: any hash property can be overriden by another
         * with the same name below it. The bottom-most hash properties are the most
         * final "source of truth".
         */
        const finalConfig = objectAssign({
            path: '/'
        }, {
            subdomainName: serverConfig.subdomain
        }, {
            safari_web_id: serverConfig.safariWebId
        }, {
            cookieSyncEnabled: serverConfig.cookieSyncEnabled
        }, userConfig);
        // For users that do not specify a subdomainName but have one still assigned
        // in the dashboard, do not assign the dashboard-provided subdomain,
        // otherwise the site that may be intended for an HTTPS integration will
        // become HTTP-only
        if (!userConfig.subdomainName) {
            delete finalConfig.subdomainName;
        }
        return finalConfig;
    }
}
exports.default = InitHelper;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/helpers/InitHelper.js.map

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Source: https://github.com/pazguille/emitter-es6
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Creates a new instance of Emitter.
 * @class
 * @returns {Object} emitter - An instance of Emitter.
 * @example
 * var emitter = new Emitter();
 */
class Emitter {
    constructor() {
        this._events = {};
    }
    ;
    /**
     * Adds a listener to the collection for a specified event.
     * @public
     * @function
     * @name Emitter#on
     * @param {String} event - Event name.
     * @param {Function} listener - Listener function.
     * @returns {Object} emitter
     * @example
     * emitter.on('ready', listener);
     */
    on(event, listener) {
        this._events[event] = this._events[event] || [];
        this._events[event].push(listener);
        return this;
    }
    ;
    /**
     * Adds a one time listener to the collection for a specified event. It will execute only once.
     * @public
     * @function
     * @name Emitter#once
     * @param {String} event - Event name.
     * @param {Function} listener - Listener function.
     * @returns {Object} emitter
     * @example
     * me.once('contentLoad', listener);
     */
    once(event, listener) {
        let that = this;
        function fn() {
            that.off(event, fn);
            listener.apply(this, arguments);
        }
        fn.listener = listener;
        this.on(event, fn);
        return this;
    }
    ;
    /**
     * Removes a listener from the collection for a specified event.
     * @public
     * @function
     * @name Emitter#off
     * @param {String} event - Event name.
     * @param {Function} listener -  Listener function.
     * @returns {Object} emitter
     * @example
     * me.off('ready', listener);
     */
    off(event, listener) {
        let listeners = this._events[event];
        if (listeners !== undefined) {
            for (let j = 0; j < listeners.length; j += 1) {
                if (listeners[j] === listener || listeners[j].listener === listener) {
                    listeners.splice(j, 1);
                    break;
                }
            }
            if (listeners.length === 0) {
                this.removeAllListeners(event);
            }
        }
        return this;
    }
    ;
    /**
     * Removes all listeners from the collection for a specified event.
     * @public
     * @function
     * @name Emitter#removeAllListeners
     * @param {String} event - Event name.
     * @returns {Object} emitter
     * @example
     * me.removeAllListeners('ready');
     */
    removeAllListeners(event) {
        try {
            delete this._events[event];
        }
        catch (e) { }
        ;
        return this;
    }
    ;
    /**
     * Returns all listeners from the collection for a specified event.
     * @public
     * @function
     * @name Emitter#listeners
     * @param {String} event - Event name.
     * @returns {Array}
     * @example
     * me.listeners('ready');
     */
    listeners(event) {
        try {
            return this._events[event];
        }
        catch (e) { }
        ;
    }
    ;
    /**
     * Execute each item in the listener collection in order with the specified data.
     * @name Emitter#emit
     * @public
     * @function
     * @param {String} event - The name of the event you want to emit.
     * @param {...args} [args] - Data to pass to the listeners.
     * @example
     * me.emit('ready', 'param1', {..}, [...]);
     */
    emit(...vargs) {
        let args = [].slice.call(arguments, 0); // converted to array
        let event = args.shift();
        let listeners = this._events[event];
        if (listeners !== undefined) {
            listeners = listeners.slice(0);
            let len = listeners.length;
            for (let i = 0; i < len; i += 1) {
                listeners[i].apply(this, args);
            }
        }
        return this;
    }
    ;
}
/**
 * Exports Emitter
 */
exports.default = Emitter;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/libraries/Emitter.js.map

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
/**
 * Creates method proxies for once-supported methods.
 */
class LegacyManager {
    static ensureBackwardsCompatibility(oneSignal) {
        LegacyManager.environmentPolyfill(oneSignal);
        LegacyManager.postmams(oneSignal);
    }
    static environmentPolyfill(oneSignal) {
        oneSignal.environment = {};
        oneSignal.environment.getEnv = function () { return ''; };
        oneSignal.environment.isPopup = function () {
            return SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalSubscriptionPopup;
        };
        oneSignal.environment.isIframe = function () {
            return SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame;
        };
    }
    static postmams(oneSignal) {
        const postmamMessageFunc = function message(...args) {
            this.messenger.message.apply(this.messenger, arguments);
        };
        const postmamPostMessageFunc = function postMessage(...args) {
            this.messenger.postMessage.apply(this.messenger, arguments);
        };
        function assignPostmamLegacyFunctions(postmamLikeObject) {
            postmamLikeObject.message = postmamMessageFunc;
            postmamLikeObject.postMessage = postmamPostMessageFunc;
        }
        if (oneSignal.proxyFrame) {
            oneSignal.iframePostmam = oneSignal.proxyFrame;
            assignPostmamLegacyFunctions(oneSignal.iframePostmam);
        }
        if (oneSignal.subscriptionPopup) {
            oneSignal.popupPostmam = oneSignal.subscriptionPopup;
            assignPostmamLegacyFunctions(oneSignal.popupPostmam);
        }
        if (oneSignal.subscriptionModal) {
            oneSignal.modalPostmam = oneSignal.subscriptionModal;
            assignPostmamLegacyFunctions(oneSignal.modalPostmam);
        }
    }
}
exports.default = LegacyManager;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/managers/LegacyManager.js.map

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class AppConfig {
}
exports.AppConfig = AppConfig;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/AppConfig.js.map

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var NotificationPermission;
(function (NotificationPermission) {
    /**
     * The user has not granted notification permissions and may have just dismissed the notification permission prompt.
     */
    NotificationPermission[NotificationPermission["Default"] = "default"] = "Default";
    /**
     * The user has granted notification permissions.
     */
    NotificationPermission[NotificationPermission["Granted"] = "granted"] = "Granted";
    /**
     * The user has blocked notifications.
     */
    NotificationPermission[NotificationPermission["Denied"] = "denied"] = "Denied";
})(NotificationPermission || (NotificationPermission = {}));
exports.NotificationPermission = NotificationPermission;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/NotificationPermission.js.map

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var PermissionPromptType;
(function (PermissionPromptType) {
    /**
     * Local notification hack for HTTP sites triggered by prompting for local notification permissions.
     */
    PermissionPromptType[PermissionPromptType["HttpPermissionRequest"] = 'HTTP permission request'] = "HttpPermissionRequest";
    /**
     * The "main" browser native permission request dialog when prompting for local or push notification permissions.
     */
    PermissionPromptType[PermissionPromptType["HttpsPermissionRequest"] = 'HTTPS permission request'] = "HttpsPermissionRequest";
    /**
     * The "popup" to subdomain.onesignal.com.
     */
    PermissionPromptType[PermissionPromptType["FullscreenHttpPermissionMessage"] = 'fullscreen HTTP permission message'] = "FullscreenHttpPermissionMessage";
    /**
     * The full-screen HTTPS modal with a dimmed backdrop.
     */
    PermissionPromptType[PermissionPromptType["FullscreenHttpsPermissionMessage"] = 'fullscreen HTTPS permission message'] = "FullscreenHttpsPermissionMessage";
    /**
     * The "sliding down" prompt.
     */
    PermissionPromptType[PermissionPromptType["SlidedownPermissionMessage"] = 'slidedown permission message'] = "SlidedownPermissionMessage";
    /**
     * The "notify button".
     */
    PermissionPromptType[PermissionPromptType["SubscriptionBell"] = 'subscription bell'] = "SubscriptionBell";
})(PermissionPromptType = exports.PermissionPromptType || (exports.PermissionPromptType = {}));
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/PermissionPromptType.js.map

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var TestEnvironmentKind;
(function (TestEnvironmentKind) {
    TestEnvironmentKind[TestEnvironmentKind["None"] = "None"] = "None";
    TestEnvironmentKind[TestEnvironmentKind["UnitTesting"] = "Unit Testing"] = "UnitTesting";
})(TestEnvironmentKind = exports.TestEnvironmentKind || (exports.TestEnvironmentKind = {}));
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/TestEnvironmentKind.js.map

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
const Emitter_1 = __webpack_require__(36);
const utils_1 = __webpack_require__(1);
class IndexedDb {
    constructor(databaseName) {
        this.databaseName = databaseName;
        this.emitter = new Emitter_1.default();
    }
    open(databaseName) {
        return new Promise((resolve, reject) => {
            try {
                // Open algorithm: https://www.w3.org/TR/IndexedDB/#h-opening
                var request = indexedDB.open(databaseName, 1);
            }
            catch (e) {
                // Errors should be thrown on the request.onerror event, but just in case Firefox throws additional errors
                // for profile schema too high
            }
            request.onerror = this.onDatabaseOpenError;
            request.onblocked = this.onDatabaseOpenBlocked;
            request.onupgradeneeded = this.onDatabaseUpgradeNeeded;
            request.onsuccess = () => {
                this.database = request.result;
                this.database.onerror = this.onDatabaseError;
                this.database.onversionchange = this.onDatabaseVersionChange;
                resolve(this.database);
            };
        });
    }
    async ensureDatabaseOpen() {
        if (!this.openLock) {
            this.openLock = this.open(this.databaseName);
        }
        await this.openLock;
        return this.database;
    }
    onDatabaseOpenError(event) {
        // Prevent the error from bubbling: https://bugzilla.mozilla.org/show_bug.cgi?id=1331103#c3
        /**
         * To prevent error reporting tools like Sentry.io from picking up errors that
         * the site owner can't do anything about and use up their quota, hide database open
         * errors.
         */
        event.preventDefault();
        const error = event.target.error;
        if (utils_1.contains(error.message, 'The operation failed for reasons unrelated to the database itself and not covered by any other error code') ||
            utils_1.contains(error.message, 'A mutation operation was attempted on a database that did not allow mutations')) {
            log.warn("OneSignal: IndexedDb web storage is not available on this origin since this profile's IndexedDb schema has been upgraded in a newer version of Firefox. See: https://bugzilla.mozilla.org/show_bug.cgi?id=1236557#c6");
        }
        else {
            log.warn('OneSignal: Fatal error opening IndexedDb database:', error);
        }
    }
    /**
     * Error events bubble. Error events are targeted at the request that generated the error, then the event bubbles to
     * the transaction, and then finally to the database object. If you want to avoid adding error handlers to every
     * request, you can instead add a single error handler on the database object.
     */
    onDatabaseError(event) {
        log.debug('IndexedDb: Generic database error', event.target.errorCode);
    }
    /**
     * Occurs when the upgradeneeded should be triggered because of a version change but the database is still in use
     * (that is, not closed) somewhere, even after the versionchange event was sent.
     */
    onDatabaseOpenBlocked() {
        log.debug('IndexedDb: Blocked event');
    }
    /**
     * Occurs when a database structure change (IDBOpenDBRequest.onupgradeneeded event or IDBFactory.deleteDatabase) was
     * requested elsewhere (most probably in another window/tab on the same computer).
     *
     * versionchange Algorithm: https://www.w3.org/TR/IndexedDB/#h-versionchange-transaction-steps
     *
     * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/onversionchange
     */
    onDatabaseVersionChange(event) {
        log.debug('IndexedDb: versionchange event');
    }
    /**
     * Occurs when a new version of the database needs to be created, or has not been created before, or a new version
     * of the database was requested to be opened when calling window.indexedDB.open.
     *
     * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onupgradeneeded
     */
    onDatabaseUpgradeNeeded(event) {
        log.debug('IndexedDb: Database is being rebuilt or upgraded (upgradeneeded event).');
        const db = event.target.result;
        db.createObjectStore("Ids", {
            keyPath: "type"
        });
        db.createObjectStore("NotificationOpened", {
            keyPath: "url"
        });
        db.createObjectStore("Options", {
            keyPath: "key"
        });
    }
    /**
     * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table (if key is not specified).
     * @param table The table to retrieve the value from.
     * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
     * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
     */
    async get(table, key) {
        await this.ensureDatabaseOpen();
        if (key) {
            // Return a table-key value
            return await new Promise((resolve, reject) => {
                var request = this.database.transaction(table).objectStore(table).get(key);
                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = e => {
                    reject(request.error);
                };
            });
        }
        else {
            // Return all values in table
            return await new Promise((resolve, reject) => {
                let jsonResult = {};
                let cursor = this.database.transaction(table).objectStore(table).openCursor();
                cursor.onsuccess = (event) => {
                    var cursorResult = event.target.result;
                    if (cursorResult) {
                        let cursorResultKey = cursorResult.key;
                        jsonResult[cursorResultKey] = cursorResult.value;
                        cursorResult.continue();
                    }
                    else {
                        resolve(jsonResult);
                    }
                };
                cursor.onerror = (event) => {
                    reject(cursor.error);
                };
            });
        }
    }
    /**
     * Asynchronously puts the specified value in the specified table.
     */
    async put(table, key) {
        await this.ensureDatabaseOpen();
        return await new Promise((resolve, reject) => {
            try {
                let request = this.database.transaction([table], 'readwrite').objectStore(table).put(key);
                request.onsuccess = (event) => {
                    resolve(key);
                };
                request.onerror = (e) => {
                    log.error('Database PUT Transaction Error:', e);
                    reject(e);
                };
            }
            catch (e) {
                log.error('Database PUT Error:', e);
                reject(e);
            }
        });
    }
    /**
     * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
     * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
     */
    remove(table, key) {
        if (key) {
            // Remove a single key from a table
            var method = "delete";
        }
        else {
            // Remove all keys from the table (wipe the table)
            var method = "clear";
        }
        return new Promise((resolve, reject) => {
            try {
                let request = this.database.transaction([table], 'readwrite').objectStore(table)[method](key);
                request.onsuccess = (event) => {
                    resolve(key);
                };
                request.onerror = (e) => {
                    log.error('Database REMOVE Transaction Error:', e);
                    reject(e);
                };
            }
            catch (e) {
                log.error('Database REMOVE Error:', e);
                reject(e);
            }
        });
    }
}
exports.default = IndexedDb;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/services/IndexedDb.js.map

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var atoa = __webpack_require__(25);
var debounce = __webpack_require__(77);

module.exports = function emitter (thing, options) {
  var opts = options || {};
  var evt = {};
  if (thing === undefined) { thing = {}; }
  thing.on = function (type, fn) {
    if (!evt[type]) {
      evt[type] = [fn];
    } else {
      evt[type].push(fn);
    }
    return thing;
  };
  thing.once = function (type, fn) {
    fn._once = true; // thing.off(fn) still works!
    thing.on(type, fn);
    return thing;
  };
  thing.off = function (type, fn) {
    var c = arguments.length;
    if (c === 1) {
      delete evt[type];
    } else if (c === 0) {
      evt = {};
    } else {
      var et = evt[type];
      if (!et) { return thing; }
      et.splice(et.indexOf(fn), 1);
    }
    return thing;
  };
  thing.emit = function () {
    var args = atoa(arguments);
    return thing.emitterSnapshot(args.shift()).apply(this, args);
  };
  thing.emitterSnapshot = function (type) {
    var et = (evt[type] || []).slice(0);
    return function () {
      var args = atoa(arguments);
      var ctx = this || thing;
      if (type === 'error' && opts.throws !== false && !et.length) { throw args.length === 1 ? args[0] : args; }
      et.forEach(function emitter (listen) {
        if (opts.async) { debounce(listen, args, ctx); } else { listen.apply(ctx, args); }
        if (listen._once) { thing.off(type, listen); }
      });
      return thing;
    };
  };
  return thing;
};


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
 * Heir v3.0.0 - http://git.io/F87mKg
 * Oliver Caldwell - http://oli.me.uk/
 * Unlicense - http://unlicense.org/
 */

(function (name, root, factory) {
    if (true) {
        !(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
				__WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    }
    else if (typeof exports === 'object') {
        module.exports = factory();
    }
    else {
        root[name] = factory();
    }
}('heir', this, function () {
    /*global define,module*/
    'use strict';

    var heir = {
        /**
         * Causes your desired class to inherit from a source class. This uses
         * prototypical inheritance so you can override methods without ruining
         * the parent class.
         *
         * This will alter the actual destination class though, it does not
         * create a new class.
         *
         * @param {Function} destination The target class for the inheritance.
         * @param {Function} source Class to inherit from.
         * @param {Boolean} addSuper Should we add the _super property to the prototype? Defaults to true.
         */
        inherit: function inherit(destination, source, addSuper) {
            var proto = destination.prototype = heir.createObject(source.prototype);
            proto.constructor = destination;

            if (addSuper || typeof addSuper === 'undefined') {
                destination._super = source.prototype;
            }
        },

        /**
         * Creates a new object with the source object nestled within its
         * prototype chain.
         *
         * @param {Object} source Method to insert into the new object's prototype.
         * @return {Object} An empty object with the source object in it's prototype chain.
         */
        createObject: Object.create || function createObject(source) {
            var Host = function () {};
            Host.prototype = source;
            return new Host();
        },

        /**
         * Mixes the specified object into your class. This can be used to add
         * certain capabilities and helper methods to a class that is already
         * inheriting from some other class. You can mix in as many object as
         * you want, but only inherit from one.
         *
         * These values are mixed into the actual prototype object of your
         * class, they are not added to the prototype chain like inherit.
         *
         * @param {Function} destination Class to mix the object into.
         * @param {Object} source Object to mix into the class.
         */
        mixin: function mixin(destination, source) {
            return heir.merge(destination.prototype, source);
        },

        /**
         * Merges one object into another, change the object in place.
         *
         * @param {Object} destination The destination for the merge.
         * @param {Object} source The source of the properties to merge.
         */
        merge: function merge(destination, source) {
            var key;

            for (key in source) {
                destination[key] = source[key];
            }
        },

        /**
         * Shortcut for `Object.prototype.hasOwnProperty`.
         *
         * Uses `Object.prototype.hasOwnPropety` rather than
         * `object.hasOwnProperty` as it could be overwritten.
         *
         * @param {Object} object The object to check
         * @param {String} key The key to check for.
         * @return {Boolean} Does object have key as an own propety?
         */
        hasOwn: function hasOwn(object, key) {
            return Object.prototype.hasOwnProperty.call(object, key);
        }
    };

    return heir;
}));


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function serializeError (err) {
  return err ? err.toString() : null;
}

function deserializeError (err) {
  return err ? new Error(err) : null;
}

function parsePayload (payload) {
  var type = payload.shift();
  if (type === 'error') {
    return { error: serializeError(payload[0]), type: type, payload: [] };
  }
  return { error: null, type: type, payload: payload };
}

function emission (emitter, context) {
  return emit;
  function emit (e) {
    var data = e.data;
    if (data.type === 'error') {
      emitter.emit.call(null, 'error', context, deserializeError(data.error));
    } else {
      emitter.emit.apply(null, [data.type, context].concat(data.payload));
    }
  }
}

module.exports = {
  parsePayload: parsePayload,
  emission: emission
};


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;/*!
 * EventEmitter v5.1.0 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function (exports) {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    function isValidListener (listener) {
        if (typeof listener === 'function' || listener instanceof RegExp) {
            return true
        } else if (listener && typeof listener === 'object') {
            return isValidListener(listener.listener)
        } else {
            return false
        }
    }

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);

                for (i = 0; i < listeners.length; i++) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (true) {
        !(__WEBPACK_AMD_DEFINE_RESULT__ = function () {
            return EventEmitter;
        }.call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}(this || {}));


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Environment_1 = __webpack_require__(8);
const OneSignalApi_1 = __webpack_require__(16);
const IndexedDb_1 = __webpack_require__(42);
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
const Cookie = __webpack_require__(26);
const Database_1 = __webpack_require__(7);
const Browser = __webpack_require__(11);
const utils_1 = __webpack_require__(1);
const ValidatorUtils_1 = __webpack_require__(76);
const objectAssign = __webpack_require__(4);
const EventEmitter = __webpack_require__(46);
const heir = __webpack_require__(44);
const swivel = __webpack_require__(27);
const EventHelper_1 = __webpack_require__(13);
const MainHelper_1 = __webpack_require__(10);
const Popover_1 = __webpack_require__(73);
const Uuid_1 = __webpack_require__(19);
const InvalidArgumentError_1 = __webpack_require__(55);
const LimitStore_1 = __webpack_require__(15);
const InvalidStateError_1 = __webpack_require__(14);
const InitHelper_1 = __webpack_require__(35);
const ServiceWorkerHelper_1 = __webpack_require__(22);
const SubscriptionHelper_1 = __webpack_require__(6);
const HttpHelper_1 = __webpack_require__(34);
const TestHelper_1 = __webpack_require__(18);
const NotificationPermission_1 = __webpack_require__(39);
const PermissionMessageDismissedError_1 = __webpack_require__(31);
const PushPermissionNotGrantedError_1 = __webpack_require__(32);
const NotSubscribedError_1 = __webpack_require__(57);
const AlreadySubscribedError_1 = __webpack_require__(30);
const PermissionPromptType_1 = __webpack_require__(40);
const Context_1 = __webpack_require__(62);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
const AltOriginManager_1 = __webpack_require__(60);
const LegacyManager_1 = __webpack_require__(37);
const SubscriptionPopupHost_1 = __webpack_require__(72);
const SdkInitError_1 = __webpack_require__(58);
const CookieSyncer_1 = __webpack_require__(66);
const Crypto_1 = __webpack_require__(74);
class OneSignal {
    /**
     * Pass in the full URL of the default page you want to open when a notification is clicked.
     * @PublicApi
     */
    static async setDefaultNotificationUrl(url) {
        if (!ValidatorUtils_1.ValidatorUtils.isValidUrl(url, { allowNull: true }))
            throw new InvalidArgumentError_1.InvalidArgumentError('url', InvalidArgumentError_1.InvalidArgumentReason.Malformed);
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('setDefaultNotificationUrl', url);
        const appState = await Database_1.default.getAppState();
        appState.defaultNotificationUrl = url;
        await Database_1.default.setAppState(appState);
    }
    /**
     * Sets the default title to display on notifications. Will default to the page's document.title if you don't call this.
     * @remarks Either DB value defaultTitle or pageTitle is used when showing a notification title.
     * @PublicApi
     */
    static async setDefaultTitle(title) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('setDefaultTitle', title);
        const appState = await Database_1.default.getAppState();
        appState.defaultNotificationTitle = title;
        await Database_1.default.setAppState(appState);
    }
    /**
     * Hashes the provided email and uploads to OneSignal.
     * @remarks The email is voluntarily provided.
     * @PublicApi
     */
    static async syncHashedEmail(email) {
        if (!email)
            throw new InvalidArgumentError_1.InvalidArgumentError('email', InvalidArgumentError_1.InvalidArgumentReason.Empty);
        let sanitizedEmail = utils_1.prepareEmailForHashing(email);
        if (!utils_1.isValidEmail(sanitizedEmail))
            throw new InvalidArgumentError_1.InvalidArgumentError('email', InvalidArgumentError_1.InvalidArgumentReason.Malformed);
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('syncHashedEmail', email);
        const { appId } = await Database_1.default.getAppConfig();
        const { deviceId } = await Database_1.default.getSubscription();
        if (!deviceId)
            throw new NotSubscribedError_1.NotSubscribedError(NotSubscribedError_1.NotSubscribedReason.NoDeviceId);
        const result = await OneSignalApi_1.default.updatePlayer(appId, deviceId, {
            em_m: Crypto_1.default.md5(sanitizedEmail),
            em_s: Crypto_1.default.sha1(sanitizedEmail),
            em_s256: Crypto_1.default.sha256(sanitizedEmail)
        });
        if (result && result.success) {
            return true;
        }
        else {
            throw result;
        }
    }
    /**
     * Returns true if the current browser supports web push.
     * @PublicApi
     */
    static isPushNotificationsSupported() {
        utils_1.logMethodCall('isPushNotificationsSupported');
        /*
          Push notification support is checked in the initial entry code. If in an unsupported environment, a stubbed empty
          version of the SDK will be loaded instead. This file will only be loaded if push notifications are supported.
         */
        return true;
    }
    /**
     * Initializes the SDK, called by the developer.
     * @PublicApi
     */
    static async init(options) {
        utils_1.logMethodCall('init');
        // If Safari - add 'fetch' pollyfill if it isn't already added.
        if (Browser.safari && typeof window.fetch == "undefined") {
            log.debug('Loading fetch polyfill for Safari..');
            try {
                await OneSignal.context.dynamicResourceLoader.loadFetchPolyfill();
                log.debug('Done loading fetch polyfill.');
            }
            catch (e) {
                log.debug('Error loading fetch polyfill:', e);
            }
        }
        if (OneSignal._initCalled) {
            throw new SdkInitError_1.SdkInitError(SdkInitError_1.SdkInitErrorKind.MultipleInitialization);
        }
        OneSignal._initCalled = true;
        let appConfig;
        try {
            appConfig = await OneSignalApi_1.default.getAppConfig(new Uuid_1.Uuid(options.appId));
            OneSignal.cookieSyncer = new CookieSyncer_1.default(appConfig.cookieSyncEnabled);
            OneSignal.config = InitHelper_1.default.getMergedLegacyConfig(options, appConfig);
            log.debug(`OneSignal: Final web app config: %c${JSON.stringify(OneSignal.config, null, 4)}`, utils_1.getConsoleStyle('code'));
        }
        catch (e) {
            if (e) {
                if (e.code === 1) {
                    throw new SdkInitError_1.SdkInitError(SdkInitError_1.SdkInitErrorKind.InvalidAppId);
                }
                else if (e.code === 2) {
                    throw new SdkInitError_1.SdkInitError(SdkInitError_1.SdkInitErrorKind.AppNotConfiguredForWebPush);
                }
            }
            throw e;
        }
        if (Browser.safari && !OneSignal.config.safari_web_id) {
            /**
             * Don't throw an error for missing Safari config; many users set up
             * support on Chrome/Firefox and don't intend to support Safari but don't
             * place conditional initialization checks.
             */
            log.warn(new SdkInitError_1.SdkInitError(SdkInitError_1.SdkInitErrorKind.MissingSafariWebId));
            return;
        }
        async function __init() {
            if (OneSignal.__initAlreadyCalled) {
                return;
            }
            else {
                OneSignal.__initAlreadyCalled = true;
            }
            MainHelper_1.default.fixWordpressManifestIfMisplaced();
            OneSignal.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, EventHelper_1.default.onNotificationPermissionChange);
            OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, EventHelper_1.default._onSubscriptionChanged);
            OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED, InitHelper_1.default.onSdkInitialized);
            if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
                OneSignal.appConfig = appConfig;
                /**
                 * The user may have forgot to choose a subdomain in his web app setup.
                 *
                 * Or, the user may have an HTTP & HTTPS site while using an HTTPS-only
                 * config on both variants. This would cause the HTTPS site to work
                 * perfectly, while causing errors and preventing web push from working
                 * on the HTTP site.
                 */
                if (!appConfig.subdomain) {
                    throw new SdkInitError_1.SdkInitError(SdkInitError_1.SdkInitErrorKind.MissingSubdomain);
                }
                /**
                 * The iFrame may never load (e.g. OneSignal might be down), in which
                 * case the rest of the SDK's initialization will be blocked. This is a
                 * good thing! We don't want to access IndexedDb before we know which
                 * origin to store data on.
                 */
                OneSignal.proxyFrameHost = await AltOriginManager_1.default.discoverAltOrigin(appConfig);
            }
            window.addEventListener('focus', (event) => {
                // Checks if permission changed everytime a user focuses on the page, since a user has to click out of and back on the page to check permissions
                MainHelper_1.default.checkAndTriggerNotificationPermissionChanged();
            });
            InitHelper_1.default.initSaveState(document.title)
                .then(() => InitHelper_1.default.saveInitOptions())
                .then(() => {
                if (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.CustomIframe) {
                    Event_1.default.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
                }
                else {
                    InitHelper_1.default.internalInit();
                }
            });
        }
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            __init();
        }
        else {
            log.debug('OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
                ' initialization...');
            window.addEventListener('DOMContentLoaded', () => {
                __init();
            });
            document.onreadystatechange = () => {
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    __init();
                }
            };
        }
    }
    /**
     * Shows a sliding modal prompt on the page for users to trigger the HTTP popup window to subscribe.
     * @PublicApi
     */
    static async showHttpPrompt(options) {
        if (!options) {
            options = {};
        }
        await utils_1.awaitOneSignalInitAndSupported();
        /*
         Only show the HTTP popover if:
         - Notifications aren't already enabled
         - The user isn't manually opted out (if the user was manually opted out, we don't want to prompt the user)
         */
        if (OneSignal.__isPopoverShowing) {
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.RedundantPermissionMessage, {
                permissionPromptType: PermissionPromptType_1.PermissionPromptType.SlidedownPermissionMessage
            });
        }
        const permission = await OneSignal.getNotificationPermission();
        const isEnabled = await OneSignal.isPushNotificationsEnabled();
        const notOptedOut = await OneSignal.getSubscription();
        const doNotPrompt = await MainHelper_1.default.wasHttpsNativePromptDismissed();
        const isShowingHttpPermissionRequest = await OneSignal.httpHelper.isShowingHttpPermissionRequest();
        if (doNotPrompt && !options.force) {
            throw new PermissionMessageDismissedError_1.default();
        }
        if (permission === NotificationPermission_1.NotificationPermission.Denied) {
            throw new PushPermissionNotGrantedError_1.default();
        }
        if (isEnabled) {
            throw new AlreadySubscribedError_1.default();
        }
        if (!notOptedOut) {
            throw new NotSubscribedError_1.NotSubscribedError(NotSubscribedError_1.NotSubscribedReason.OptedOut);
        }
        if (MainHelper_1.default.isUsingHttpPermissionRequest()) {
            if (options.__sdkCall && options.__useHttpPermissionRequestStyle) {
            }
            else {
                log.debug('The slidedown permission message cannot be used while the HTTP perm. req. is enabled.');
                throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.RedundantPermissionMessage, {
                    permissionPromptType: PermissionPromptType_1.PermissionPromptType.HttpPermissionRequest
                });
            }
        }
        MainHelper_1.default.markHttpPopoverShown();
        const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
        if (sdkStylesLoadResult !== 0 /* Loaded */) {
            log.debug('Not showing slidedown permission message because styles failed to load.');
            return;
        }
        OneSignal.popover = new Popover_1.default(OneSignal.config.promptOptions);
        OneSignal.popover.create();
        log.debug('Showing the HTTP popover.');
        if (OneSignal.notifyButton &&
            OneSignal.notifyButton.options.enable &&
            OneSignal.notifyButton.launcher.state !== 'hidden') {
            OneSignal.notifyButton.launcher.waitUntilShown()
                .then(() => {
                OneSignal.notifyButton.launcher.hide();
            });
        }
        OneSignal.once(Popover_1.default.EVENTS.SHOWN, () => {
            OneSignal.__isPopoverShowing = true;
        });
        OneSignal.once(Popover_1.default.EVENTS.CLOSED, () => {
            OneSignal.__isPopoverShowing = false;
            if (OneSignal.notifyButton &&
                OneSignal.notifyButton.options.enable) {
                OneSignal.notifyButton.launcher.show();
            }
        });
        OneSignal.once(Popover_1.default.EVENTS.ALLOW_CLICK, () => {
            OneSignal.popover.close();
            log.debug("Setting flag to not show the popover to the user again.");
            TestHelper_1.default.markHttpsNativePromptDismissed();
            if (options.__sdkCall && options.__useHttpPermissionRequestStyle) {
                OneSignal.registerForPushNotifications({ httpPermissionRequest: true });
            }
            else {
                OneSignal.registerForPushNotifications({ autoAccept: true });
            }
        });
        OneSignal.once(Popover_1.default.EVENTS.CANCEL_CLICK, () => {
            log.debug("Setting flag to not show the popover to the user again.");
            TestHelper_1.default.markHttpsNativePromptDismissed();
        });
    }
    /**
     * Prompts the user to subscribe.
     * @PublicApi
     */
    static registerForPushNotifications(options) {
        // WARNING: Do NOT add callbacks that have to fire to get from here to window.open in _sessionInit.
        //          Otherwise the pop-up to ask for push permission on HTTP connections will be blocked by Chrome.
        function __registerForPushNotifications() {
            if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
                /**
                 * Users may be subscribed to either .onesignal.com or .os.tc. By this time
                 * that they are subscribing to the popup, the Proxy Frame has already been
                 * loaded and the user's subscription status has been obtained. We can then
                 * use the Proxy Frame present now and check its URL to see whether the user
                 * is finally subscribed to .onesignal.com or .os.tc.
                 */
                OneSignal.subscriptionPopupHost = new SubscriptionPopupHost_1.default(OneSignal.proxyFrameHost.url, options);
                OneSignal.subscriptionPopupHost.load();
            }
            else {
                if (!options)
                    options = {};
                options.fromRegisterFor = true;
                InitHelper_1.default.sessionInit(options);
            }
        }
        if (!OneSignal.initialized) {
            OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, () => __registerForPushNotifications());
        }
        else {
            return __registerForPushNotifications();
        }
    }
    /**
     * Prompts the user to subscribe using the remote local notification workaround for HTTP sites.
     * @PublicApi
     */
    static async showHttpPermissionRequest(options) {
        log.debug('Called showHttpPermissionRequest().');
        await utils_1.awaitOneSignalInitAndSupported();
        // Safari's push notifications are one-click Allow and shouldn't support this workaround
        if (Browser.safari) {
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.UnsupportedEnvironment);
        }
        if (OneSignal.__isPopoverShowing) {
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.RedundantPermissionMessage, {
                permissionPromptType: PermissionPromptType_1.PermissionPromptType.SlidedownPermissionMessage
            });
        }
        if (OneSignal._showingHttpPermissionRequest) {
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.RedundantPermissionMessage, {
                permissionPromptType: PermissionPromptType_1.PermissionPromptType.HttpPermissionRequest
            });
        }
        if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
            return await new Promise((resolve, reject) => {
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.SHOW_HTTP_PERMISSION_REQUEST, options, reply => {
                    let { status, result } = reply.data;
                    if (status === 'resolve') {
                        resolve(result);
                    }
                    else {
                        reject(result);
                    }
                });
            });
        }
        else {
            if (!MainHelper_1.default.isUsingHttpPermissionRequest()) {
                log.debug('Not showing HTTP permission request because its not enabled. Check init option httpPermissionRequest.');
                return;
            }
            // Default call by our SDK, not forced by user, don't show if the HTTP perm. req. was dismissed by user
            if (MainHelper_1.default.wasHttpsNativePromptDismissed()) {
                if (options._sdkCall === true) {
                    // TODO: Throw an error; Postmam currently does not serialize errors across cross-domain messaging
                    //       In the future, Postmam should serialize errors so we can throw a PermissionMessageDismissedError
                    log.debug('The HTTP perm. req. permission was dismissed, so we are not showing the request.');
                    return;
                }
                else {
                    log.debug('The HTTP perm. req. was previously dismissed, but this call was made explicitly.');
                }
            }
            const notificationPermission = await OneSignal.getNotificationPermission();
            if (notificationPermission === NotificationPermission_1.NotificationPermission.Default) {
                log.debug(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) Showing HTTP permission request.`);
                OneSignal._showingHttpPermissionRequest = true;
                return await new Promise((resolve, reject) => {
                    window.Notification.requestPermission(permission => {
                        OneSignal._showingHttpPermissionRequest = false;
                        resolve(permission);
                        log.debug('HTTP Permission Request Result:', permission);
                        if (permission === 'default') {
                            TestHelper_1.default.markHttpsNativePromptDismissed();
                            OneSignal.proxyFrame.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, {
                                permission: permission,
                                forceUpdatePermission: true
                            });
                        }
                    });
                    Event_1.default.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
                });
            }
            else if (notificationPermission === NotificationPermission_1.NotificationPermission.Granted &&
                !(await OneSignal.isPushNotificationsEnabled())) {
                // User unsubscribed but permission granted. Reprompt the user for push on the host page
                OneSignal.proxyFrame.message(OneSignal.POSTMAM_COMMANDS.HTTP_PERMISSION_REQUEST_RESUBSCRIBE);
            }
        }
    }
    /**
     * Returns a promise that resolves to the browser's current notification permission as 'default', 'granted', or 'denied'.
     * @param callback A callback function that will be called when the browser's current notification permission has been obtained, with one of 'default', 'granted', or 'denied'.
     * @PublicApi
     */
    static getNotificationPermission(onComplete) {
        return utils_1.awaitOneSignalInitAndSupported()
            .then(() => {
            let safariWebId = null;
            if (OneSignal.config) {
                safariWebId = OneSignal.config.safari_web_id;
            }
            return MainHelper_1.default.getNotificationPermission(safariWebId);
        })
            .then(permission => {
            if (onComplete) {
                onComplete(permission);
            }
            return permission;
        });
    }
    /**
     * @PublicApi
     */
    static async getTags(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('getTags', callback);
        const { appId } = await Database_1.default.getAppConfig();
        const { deviceId } = await Database_1.default.getSubscription();
        if (!deviceId) {
            // TODO: Throw an error here in future v2; for now it may break existing client implementations.
            log.info(new NotSubscribedError_1.NotSubscribedError(NotSubscribedError_1.NotSubscribedReason.NoDeviceId));
            return null;
        }
        const { tags } = await OneSignalApi_1.default.getPlayer(appId, deviceId);
        utils_1.executeCallback(callback, tags);
        return tags;
    }
    /**
     * @PublicApi
     */
    static async sendTag(key, value, callback) {
        const tag = {};
        tag[key] = value;
        return await OneSignal.sendTags(tag, callback);
    }
    /**
     * @PublicApi
     */
    static async sendTags(tags, callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('sendTags', tags, callback);
        if (!tags || Object.keys(tags).length === 0) {
            // TODO: Throw an error here in future v2; for now it may break existing client implementations.
            log.info(new InvalidArgumentError_1.InvalidArgumentError('tags', InvalidArgumentError_1.InvalidArgumentReason.Empty));
            return;
        }
        // Our backend considers false as removing a tag, so convert false -> "false" to allow storing as a value
        Object.keys(tags).forEach(key => {
            if (tags[key] === false)
                tags[key] = "false";
        });
        const { appId } = await Database_1.default.getAppConfig();
        var { deviceId } = await Database_1.default.getSubscription();
        if (!deviceId) {
            await utils_1.awaitSdkEvent(OneSignal.EVENTS.REGISTERED);
        }
        // After the user subscribers, he will have a device ID, so get it again
        var { deviceId: newDeviceId } = await Database_1.default.getSubscription();
        await OneSignalApi_1.default.updatePlayer(appId, newDeviceId, {
            tags: tags
        });
        utils_1.executeCallback(callback, tags);
        return tags;
    }
    /**
     * @PublicApi
     */
    static async deleteTag(tag) {
        return await OneSignal.deleteTags([tag]);
    }
    /**
     * @PublicApi
     */
    static async deleteTags(tags, callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('deleteTags', tags, callback);
        if (!ValidatorUtils_1.ValidatorUtils.isValidArray(tags))
            throw new InvalidArgumentError_1.InvalidArgumentError('tags', InvalidArgumentError_1.InvalidArgumentReason.Malformed);
        if (tags.length === 0) {
            // TODO: Throw an error here in future v2; for now it may break existing client implementations.
            log.info(new InvalidArgumentError_1.InvalidArgumentError('tags', InvalidArgumentError_1.InvalidArgumentReason.Empty));
        }
        const tagsToSend = {};
        for (let tag of tags) {
            tagsToSend[tag] = '';
        }
        const deletedTags = await OneSignal.sendTags(tagsToSend);
        const deletedTagKeys = Object.keys(deletedTags);
        utils_1.executeCallback(callback, deletedTagKeys);
        return deletedTagKeys;
    }
    /**
     * @PublicApi
     */
    static async addListenerForNotificationOpened(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('addListenerForNotificationOpened', callback);
        OneSignal.once(OneSignal.EVENTS.NOTIFICATION_CLICKED, notification => {
            utils_1.executeCallback(callback, notification);
        });
        EventHelper_1.default.fireStoredNotificationClicks(OneSignal.config.pageUrl);
    }
    /**
     * @PublicApi
     * @Deprecated
     */
    static async getIdsAvailable(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('getIdsAvailable', callback);
        const { deviceId, pushToken } = await Database_1.default.getSubscription();
        const bundle = {
            userId: deviceId,
            registrationId: pushToken
        };
        utils_1.executeCallback(callback, bundle);
        return bundle;
    }
    /**
     * Returns a promise that resolves to true if all required conditions for push messaging are met; otherwise resolves to false.
     * @param callback A callback function that will be called when the current subscription status has been obtained.
     * @PublicApi
     */
    static async isPushNotificationsEnabled(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('isPushNotificationsEnabled', callback);
        const hasInsecureParentOrigin = await SubscriptionHelper_1.default.hasInsecureParentOrigin();
        const { deviceId, pushToken, optedOut } = await Database_1.default.getSubscription();
        const notificationPermission = await OneSignal.getNotificationPermission();
        let isPushEnabled = false;
        if (Environment_1.default.supportsServiceWorkers() &&
            !SubscriptionHelper_1.default.isUsingSubscriptionWorkaround() &&
            SdkEnvironment_1.default.getWindowEnv() !== WindowEnvironmentKind_1.WindowEnvironmentKind.OneSignalProxyFrame &&
            !hasInsecureParentOrigin) {
            const serviceWorkerActive = await ServiceWorkerHelper_1.default.isServiceWorkerActive();
            isPushEnabled = !!(deviceId &&
                pushToken &&
                notificationPermission === NotificationPermission_1.NotificationPermission.Granted &&
                !optedOut &&
                serviceWorkerActive);
            const serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
            if (serviceWorkerRegistration) {
                const actualSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
                /**
                 * Check the actual subscription, and not just the stored cached subscription, to ensure the user is still really subscribed.
                 * Users typically test resubscribing by clearing their site permissions, which doesn't remove the stored subscription token
                 * in IndexedDb we get from Google. Clearing their site permission will unsubscribe them though, so this method should reflect
                 * that by checking the real state.
                 */
                if (!actualSubscription) {
                    isPushEnabled = false;
                }
            }
        }
        else {
            isPushEnabled = !!(deviceId &&
                pushToken &&
                notificationPermission === NotificationPermission_1.NotificationPermission.Granted &&
                !optedOut);
        }
        utils_1.executeCallback(callback, isPushEnabled);
        return isPushEnabled;
    }
    /**
     * @PublicApi
     */
    static async setSubscription(newSubscription) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('setSubscription', newSubscription);
        const appConfig = await Database_1.default.getAppConfig();
        const { appId } = appConfig;
        const subscription = await Database_1.default.getSubscription();
        const { deviceId } = subscription;
        if (!appConfig.appId)
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.MissingAppId);
        if (!ValidatorUtils_1.ValidatorUtils.isValidBoolean(newSubscription))
            throw new InvalidArgumentError_1.InvalidArgumentError('newSubscription', InvalidArgumentError_1.InvalidArgumentReason.Malformed);
        if (!deviceId) {
            // TODO: Throw an error here in future v2; for now it may break existing client implementations.
            log.info(new NotSubscribedError_1.NotSubscribedError(NotSubscribedError_1.NotSubscribedReason.NoDeviceId));
            return;
        }
        subscription.optedOut = !newSubscription;
        await OneSignalApi_1.default.updatePlayer(appId, deviceId, {
            notification_types: MainHelper_1.default.getNotificationTypeFromOptIn(newSubscription)
        });
        await Database_1.default.setSubscription(subscription);
        EventHelper_1.default.onInternalSubscriptionSet(subscription.optedOut);
        EventHelper_1.default.checkAndTriggerSubscriptionChanged();
    }
    /**
     * @PendingPublicApi
     */
    static async isOptedOut(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('isOptedOut', callback);
        const { optedOut } = await Database_1.default.getSubscription();
        utils_1.executeCallback(callback, optedOut);
        return optedOut;
    }
    /**
     * Returns a promise that resolves once the manual subscription override has been set.
     * @private
     * @PendingPublicApi
     */
    static async optOut(doOptOut, callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('optOut', doOptOut, callback);
        if (!ValidatorUtils_1.ValidatorUtils.isValidBoolean(doOptOut))
            throw new InvalidArgumentError_1.InvalidArgumentError('doOptOut', InvalidArgumentError_1.InvalidArgumentReason.Malformed);
        await OneSignal.setSubscription(!doOptOut);
        utils_1.executeCallback(callback);
    }
    /**
     * Returns a promise that resolves to the stored OneSignal user ID if one is set; otherwise null.
     * @param callback A function accepting one parameter for the OneSignal user ID.
     * @PublicApi
     */
    static async getUserId(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('getUserId', callback);
        const subscription = await Database_1.default.getSubscription();
        const deviceId = subscription.deviceId;
        utils_1.executeCallback(callback, deviceId);
        return deviceId;
    }
    /**
     * Returns a promise that resolves to the stored push token if one is set; otherwise null.
     * @PublicApi
     */
    static async getRegistrationId(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('getRegistrationId', callback);
        const subscription = await Database_1.default.getSubscription();
        const pushToken = subscription.pushToken;
        utils_1.executeCallback(callback, pushToken);
        return pushToken;
    }
    /**
     * Returns a promise that resolves to false if setSubscription(false) is "in effect". Otherwise returns true.
     * This means a return value of true does not mean the user is subscribed, only that the user did not call
     * setSubcription(false).
     * @private
     * @PublicApi (given to customers)
     */
    static async getSubscription(callback) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('getSubscription', callback);
        const subscription = await Database_1.default.getSubscription();
        const subscriptionStatus = !subscription.optedOut;
        utils_1.executeCallback(callback, subscriptionStatus);
        return subscriptionStatus;
    }
    /**
     * @PublicApi
     */
    static async sendSelfNotification(title = 'OneSignal Test Message', message = 'This is an example notification.', url = new URL(location.href).origin + '?_osp=do_not_open', icon, data, buttons) {
        await utils_1.awaitOneSignalInitAndSupported();
        utils_1.logMethodCall('sendSelfNotification', title, message, url, icon, data, buttons);
        const appConfig = await Database_1.default.getAppConfig();
        const subscription = await Database_1.default.getSubscription();
        if (!appConfig.appId)
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.MissingAppId);
        if (!subscription.deviceId)
            throw new NotSubscribedError_1.NotSubscribedError(NotSubscribedError_1.NotSubscribedReason.NoDeviceId);
        if (!ValidatorUtils_1.ValidatorUtils.isValidUrl(url))
            throw new InvalidArgumentError_1.InvalidArgumentError('url', InvalidArgumentError_1.InvalidArgumentReason.Malformed);
        if (!ValidatorUtils_1.ValidatorUtils.isValidUrl(icon, { allowEmpty: true, requireHttps: true }))
            throw new InvalidArgumentError_1.InvalidArgumentError('icon', InvalidArgumentError_1.InvalidArgumentReason.Malformed);
        return await OneSignalApi_1.default.sendNotification(appConfig.appId, [subscription.deviceId], { 'en': title }, { 'en': message }, url, icon, data, buttons);
    }
    /**
     * Used to load OneSignal asynchronously from a webpage.
     * @InternalApi
     */
    static push(item) {
        if (typeof (item) == "function")
            item();
        else {
            var functionName = item.shift();
            OneSignal[functionName].apply(null, item);
        }
    }
    /** To appease TypeScript, EventEmitter later overrides this */
    static on(...args) { }
    static off(...args) { }
    static once(...args) { }
}
OneSignal.VERSION = Environment_1.default.version();
OneSignal._VERSION = Environment_1.default.version();
OneSignal.sdkEnvironment = SdkEnvironment_1.default;
OneSignal._notificationOpenedCallbacks = [];
OneSignal._idsAvailable_callback = [];
OneSignal._defaultLaunchURL = null;
OneSignal.config = null;
OneSignal.__isPopoverShowing = false;
OneSignal._sessionInitAlreadyRunning = false;
OneSignal._isNotificationEnabledCallback = [];
OneSignal._subscriptionSet = true;
OneSignal.modalUrl = null;
OneSignal._windowWidth = 650;
OneSignal._windowHeight = 568;
OneSignal._isNewVisitor = false;
OneSignal._channel = null;
OneSignal.cookie = Cookie;
OneSignal.initialized = false;
OneSignal.notifyButton = null;
OneSignal.store = LimitStore_1.default;
OneSignal.environment = Environment_1.default;
OneSignal.database = Database_1.default;
OneSignal.event = Event_1.default;
OneSignal.browser = Browser;
OneSignal.popover = null;
OneSignal.log = log;
OneSignal.swivel = swivel;
OneSignal.api = OneSignalApi_1.default;
OneSignal.indexedDb = IndexedDb_1.default;
OneSignal.mainHelper = MainHelper_1.default;
OneSignal.subscriptionHelper = SubscriptionHelper_1.default;
OneSignal.workerHelper = ServiceWorkerHelper_1.default;
OneSignal.httpHelper = HttpHelper_1.default;
OneSignal.eventHelper = EventHelper_1.default;
OneSignal.initHelper = InitHelper_1.default;
OneSignal.testHelper = TestHelper_1.default;
OneSignal.objectAssign = objectAssign;
OneSignal.appConfig = null;
/**
 * The additional path to the worker file.
 *
 * Usually just the filename (in case the file is named differently), but also supports cases where the folder
 * is different.
 *
 * However, the init options 'path' should be used to specify the folder path instead since service workers will not
 * auto-update correctly on HTTPS site load if the config init options 'path' is not set.
 */
OneSignal.SERVICE_WORKER_UPDATER_PATH = 'OneSignalSDKUpdaterWorker.js';
OneSignal.SERVICE_WORKER_PATH = 'OneSignalSDKWorker.js';
/**
 * By default, the service worker is expected to be accessible at the root scope. If the service worker is only
 * available with in a sub-directory, SERVICE_WORKER_PARAM must be changed to the sub-directory (with a trailing
 * slash). This would allow pages to function correctly as not to block the service worker ready call, which would
 * hang indefinitely if we requested root scope registration but the service was only available in a child scope.
 */
OneSignal.SERVICE_WORKER_PARAM = { scope: '/' };
OneSignal._LOGGING = false;
OneSignal.LOGGING = false;
OneSignal._usingNativePermissionHook = false;
OneSignal._initCalled = false;
OneSignal.__initAlreadyCalled = false;
OneSignal.closeNotifications = ServiceWorkerHelper_1.default.closeNotifications;
OneSignal.isServiceWorkerActive = ServiceWorkerHelper_1.default.isServiceWorkerActive;
OneSignal._showingHttpPermissionRequest = false;
OneSignal.checkAndWipeUserSubscription = function () { };
OneSignal.crypto = Crypto_1.default;
/**
 * Used by Rails-side HTTP popup. Must keep the same name.
 * @InternalApi
 */
OneSignal._initHttp = HttpHelper_1.default.initHttp;
/**
 * Used by Rails-side HTTP popup. Must keep the same name.
 * @InternalApi
 */
OneSignal._initPopup = () => OneSignal.subscriptionPopup.subscribe();
OneSignal.POSTMAM_COMMANDS = {
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
    IFRAME_POPUP_INITIALIZE: 'postmam.iframePopupInitialize',
    UNSUBSCRIBE_FROM_PUSH: 'postmam.unsubscribeFromPush',
    BEGIN_BROWSING_SESSION: 'postmam.beginBrowsingSession',
    REQUEST_HOST_URL: 'postmam.requestHostUrl',
    SHOW_HTTP_PERMISSION_REQUEST: 'postmam.showHttpPermissionRequest',
    IS_SHOWING_HTTP_PERMISSION_REQUEST: 'postmam.isShowingHttpPermissionRequest',
    WINDOW_TIMEOUT: 'postmam.windowTimeout',
    FINISH_REMOTE_REGISTRATION: 'postmam.finishRemoteRegistration',
    FINISH_REMOTE_REGISTRATION_IN_PROGRESS: 'postmam.finishRemoteRegistrationInProgress',
    POPUP_BEGIN_MESSAGEPORT_COMMS: 'postmam.beginMessagePortComms',
    SERVICEWORKER_COMMAND_REDIRECT: 'postmam.command.redirect',
    HTTP_PERMISSION_REQUEST_RESUBSCRIBE: 'postmam.httpPermissionRequestResubscribe',
    MARK_PROMPT_DISMISSED: 'postmam.markPromptDismissed',
    IS_SUBSCRIBED: 'postmam.isSubscribed',
    UNSUBSCRIBE_PROXY_FRAME: 'postman.unsubscribeProxyFrame'
};
OneSignal.EVENTS = {
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
     * New event replacing legacy addNotificationOpenedHandler(). Used when the notification was clicked.
     */
    NOTIFICATION_CLICKED: 'notificationClick',
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
     */
    PERMISSION_PROMPT_DISPLAYED: 'permissionPromptDisplay',
    /**
     * For internal testing only. Used for all sorts of things.
     */
    TEST_INIT_OPTION_DISABLED: 'testInitOptionDisabled',
    TEST_WOULD_DISPLAY: 'testWouldDisplay',
    POPUP_WINDOW_TIMEOUT: 'popupWindowTimeout',
};
OneSignal.NOTIFICATION_TYPES = {
    SUBSCRIBED: 1,
    UNSUBSCRIBED: -2
};
exports.default = OneSignal;
Object.defineProperty(OneSignal, 'LOGGING', {
    get: function () {
        return OneSignal._LOGGING;
    },
    set: function (logLevel) {
        if (logLevel) {
            log.setDefaultLevel(log.levels.TRACE);
            OneSignal._LOGGING = true;
        }
        else {
            log.setDefaultLevel(log.levels.WARN);
            OneSignal._LOGGING = false;
        }
    },
    enumerable: true,
    configurable: true
});
OneSignal.context = new Context_1.default();
heir.merge(OneSignal, new EventEmitter());
if (OneSignal.LOGGING)
    log.setDefaultLevel(log.levels.TRACE);
else {
    log.setDefaultLevel(log.levels.WARN);
}
LegacyManager_1.default.ensureBackwardsCompatibility(OneSignal);
log.info(`%cOneSignal Web SDK loaded (version ${OneSignal._VERSION}, ${SdkEnvironment_1.default.getWindowEnv().toString()} environment).`, utils_1.getConsoleStyle('bold'));
log.debug(`Current Page URL: ${typeof location === "undefined" ? "NodeJS" : location.href}`);
log.debug(`Browser Environment: ${Browser.name} ${Browser.version}`);
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/OneSignal.js.map

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class OneSignalStub {
    static promiseStub() {
        return {
            then: OneSignalStub.promiseStub,
            catch: OneSignalStub.promiseStub
        };
    }
    static get log() {
        return {
            setLevel: function () { }
        };
    }
    static isPushNotificationsSupported() {
        return false;
    }
    static push(item) {
        if (typeof (item) == "function")
            item();
        else {
            var functionName = item.shift();
            OneSignal[functionName].apply(null, item);
        }
    }
}
exports.default = OneSignalStub;
var untypedOneSignalStub = OneSignalStub;
untypedOneSignalStub.init = untypedOneSignalStub.showHttpPrompt
    = untypedOneSignalStub.registerForPushNotifications
        = untypedOneSignalStub.showHttpPermissionRequest
            = untypedOneSignalStub.getNotificationPermission
                = untypedOneSignalStub.on
                    = untypedOneSignalStub.off
                        = untypedOneSignalStub.once
                            = untypedOneSignalStub.config
                                = untypedOneSignalStub.SERVICE_WORKER_PATH
                                    = untypedOneSignalStub.SERVICE_WORKER_UPDATER_PATH
                                        = untypedOneSignalStub.checkAndWipeUserSubscription
                                            = untypedOneSignalStub.subscriptionBell
                                                = untypedOneSignalStub.notifyButton
                                                    = function () { };
untypedOneSignalStub.setDefaultNotificationUrl = untypedOneSignalStub.setDefaultTitle
    = untypedOneSignalStub.syncHashedEmail
        = untypedOneSignalStub.getTags
            = untypedOneSignalStub.sendTag
                = untypedOneSignalStub.sendTags
                    = untypedOneSignalStub.deleteTag
                        = untypedOneSignalStub.deleteTags
                            = untypedOneSignalStub.addListenerForNotificationOpened
                                = untypedOneSignalStub.getIdsAvailable
                                    = untypedOneSignalStub.isPushNotificationsEnabled
                                        = untypedOneSignalStub.setSubscription
                                            = untypedOneSignalStub.getUserId
                                                = untypedOneSignalStub.getRegistrationId
                                                    = untypedOneSignalStub.getSubscription
                                                        = untypedOneSignalStub.sendSelfNotification
                                                            = untypedOneSignalStub.promiseStub;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/OneSignalStub.js.map

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {
Object.defineProperty(exports, "__esModule", { value: true });
///<reference path="../../typings/globals/service_worker_api/index.d.ts"/>
const Environment_1 = __webpack_require__(8);
const OneSignalApi_1 = __webpack_require__(16);
const log = __webpack_require__(0);
const utils_1 = __webpack_require__(1);
const objectAssign = __webpack_require__(4);
const swivel = __webpack_require__(27);
const Browser = __webpack_require__(11);
const Database_1 = __webpack_require__(7);
const SdkEnvironment_1 = __webpack_require__(2);
const BuildEnvironmentKind_1 = __webpack_require__(23);
/**
 * The main service worker script fetching and displaying notifications to users in the background even when the client
 * site is not running. The worker is registered via the navigator.serviceWorker.register() call after the user first
 * allows notification permissions, and is a pre-requisite to subscribing for push notifications.
 *
 * For HTTPS sites, the service worker is registered site-wide at the top-level scope. For HTTP sites, the service
 * worker is registered to the iFrame pointing to subdomain.onesignal.com.
 */
class ServiceWorker {
    /**
     * An incrementing integer defined in package.json. Value doesn't matter as long as it's different from the
     * previous version.
     */
    static get VERSION() {
        return Environment_1.default.version();
    }
    /**
     * Describes what context the JavaScript code is running in and whether we're running in local development mode.
     */
    static get environment() {
        return Environment_1.default;
    }
    static get log() {
        return log;
    }
    /**
     * Allows message passing between this service worker and its controlled clients, or webpages. Controlled
     * clients include any HTTPS site page, or the nested iFrame pointing to OneSignal on any HTTP site. This allows
     * events like notification dismissed, clicked, and displayed to be fired on the clients. It also allows the
     * clients to communicate with the service worker to close all active notifications.
     */
    static get swivel() {
        return swivel;
    }
    /**
     * An interface to the browser's IndexedDB.
     */
    static get database() {
        return Database_1.default;
    }
    static get sdkEnvironment() {
        return SdkEnvironment_1.default;
    }
    /**
     * Describes the current browser name and version.
     */
    static get browser() {
        return Browser;
    }
    /**
     * Service worker entry point.
     */
    static run() {
        self.addEventListener('push', ServiceWorker.onPushReceived);
        self.addEventListener('notificationclose', ServiceWorker.onNotificationClosed);
        self.addEventListener('notificationclick', event => event.waitUntil(ServiceWorker.onNotificationClicked(event)));
        self.addEventListener('install', ServiceWorker.onServiceWorkerInstalled);
        self.addEventListener('activate', ServiceWorker.onServiceWorkerActivated);
        self.addEventListener('pushsubscriptionchange', ServiceWorker.onPushSubscriptionChange);
        // Install messaging event handlers for page <-> service worker communication
        swivel.on('data', ServiceWorker.onMessageReceived);
        // 3/2/16: Firefox does not send the Origin header when making CORS request through service workers, which breaks some sites that depend on the Origin header being present (https://bugzilla.mozilla.org/show_bug.cgi?id=1248463)
        // Fix: If the browser is Firefox and is v44, use the following workaround:
        if (Browser.firefox && Browser.version && utils_1.contains(Browser.version, '44')) {
            Database_1.default.get('Options', 'serviceWorkerRefetchRequests')
                .then(refetchRequests => {
                if (refetchRequests == true) {
                    log.info('Detected Firefox v44; installing fetch handler to refetch all requests.');
                    ServiceWorker.REFETCH_REQUESTS = true;
                    self.addEventListener('fetch', ServiceWorker.onFetch);
                }
                else {
                    ServiceWorker.SKIP_REFETCH_REQUESTS = true;
                    log.info('Detected Firefox v44 but not refetching requests because option is set to false.');
                }
            })
                .catch(e => {
                log.error(e);
                ServiceWorker.REFETCH_REQUESTS = true;
                self.addEventListener('fetch', ServiceWorker.onFetch);
            });
        }
    }
    /**
     * Occurs when a control message is received from the host page. Not related to the actual push message event.
     * @param context Used to reply to the host page.
     * @param data The message contents.
     */
    static onMessageReceived(context, data) {
        log.debug(`%c${utils_1.capitalize(SdkEnvironment_1.default.getWindowEnv().toString())} ⬸ Host:`, utils_1.getConsoleStyle('serviceworkermessage'), data, context);
        if (!data) {
            log.debug('Returning from empty data message.');
            return;
        }
        if (data === 'notification.closeall') {
            // Used for testing; the host page can close active notifications
            self.registration.getNotifications(null).then(notifications => {
                for (let notification of notifications) {
                    notification.close();
                }
            });
        }
        else if (data.query) {
            ServiceWorker.processQuery(data.query, data.response);
        }
    }
    static processQuery(queryType, response) {
        if (!ServiceWorker.queries) {
            log.debug(`queryClient() was not called before processQuery(). ServiceWorker.queries is empty.`);
        }
        if (!ServiceWorker.queries[queryType]) {
            log.debug(`Received query ${queryType} response ${response}. Expected ServiceWorker.queries to be preset to a hash.`);
            return;
        }
        else {
            if (!ServiceWorker.queries[queryType].promise) {
                log.debug(`Expected ServiceWorker.queries[${queryType}].promise value to be a Promise: ${ServiceWorker.queries[queryType]}`);
                return;
            }
            ServiceWorker.queries[queryType].promiseResolve(response);
        }
    }
    /**
     * Messages the service worker client the specified queryString via postMessage(), and returns a Promise that
     * resolves to the client's response.
     * @param serviceWorkerClient A service worker client.
     * @param queryType The message to send to the client.
       */
    static queryClient(serviceWorkerClient, queryType) {
        if (!ServiceWorker.queries) {
            ServiceWorker.queries = {};
        }
        if (!ServiceWorker.queries[queryType]) {
            ServiceWorker.queries[queryType] = {};
        }
        ServiceWorker.queries[queryType].promise = new Promise((resolve, reject) => {
            ServiceWorker.queries[queryType].promiseResolve = resolve;
            ServiceWorker.queries[queryType].promiseReject = reject;
            swivel.emit(serviceWorkerClient.id, queryType);
        });
        return ServiceWorker.queries[queryType].promise;
    }
    /**
     * Occurs when a push message is received.
     * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle
     * notifications.
     */
    static onPushReceived(event) {
        log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)}):`, utils_1.getConsoleStyle('code'), event);
        event.waitUntil(ServiceWorker.parseOrFetchNotifications(event)
            .then((notifications) => {
            if (!notifications || notifications.length == 0) {
                log.debug("Because no notifications were retrieved, we'll display the last known notification, so" +
                    " long as it isn't the welcome notification.");
                return ServiceWorker.displayBackupNotification();
            }
            //Display push notifications in the order we received them
            let notificationEventPromiseFns = [];
            for (let rawNotification of notifications) {
                log.debug('Raw Notification from OneSignal:', rawNotification);
                let notification = ServiceWorker.buildStructuredNotificationObject(rawNotification);
                // Never nest the following line in a callback from the point of entering from retrieveNotifications
                notificationEventPromiseFns.push((notif => {
                    return ServiceWorker.displayNotification(notif)
                        .then(() => ServiceWorker.updateBackupNotification(notif).catch(e => log.error(e)))
                        .then(() => { swivel.broadcast('notification.displayed', notif); })
                        .then(() => ServiceWorker.executeWebhooks('notification.displayed', notif).catch(e => log.error(e)));
                }).bind(null, notification));
            }
            return notificationEventPromiseFns.reduce((p, fn) => {
                return p = p.then(fn);
            }, Promise.resolve());
        })
            .catch(e => {
            log.debug('Failed to display a notification:', e);
            if (ServiceWorker.UNSUBSCRIBED_FROM_NOTIFICATIONS) {
                log.debug('Because we have just unsubscribed from notifications, we will not show anything.');
            }
            else {
                log.debug("Because a notification failed to display, we'll display the last known notification, so long as it isn't the welcome notification.");
                return ServiceWorker.displayBackupNotification();
            }
        }));
    }
    /**
     * Makes a POST call to a specified URL to forward certain events.
     * @param event The name of the webhook event. Affects the DB key pulled for settings and the final event the user
     *              consumes.
     * @param notification A JSON object containing notification details the user consumes.
     * @returns {Promise}
     */
    static async executeWebhooks(event, notification) {
        const { deviceId } = await Database_1.default.getSubscription();
        const isServerCorsEnabled = await Database_1.default.get('Options', 'webhooks.cors');
        const webhookTargetUrl = await Database_1.default.get('Options', `webhooks.${event}`);
        if (webhookTargetUrl) {
            // JSON.stringify() does not include undefined values
            // Our response will not contain those fields here which have undefined values
            let postData = {
                event: event,
                id: notification.id,
                userId: deviceId,
                action: notification.action,
                buttons: notification.buttons,
                heading: notification.heading,
                content: notification.content,
                url: notification.url,
                icon: notification.icon,
                data: notification.data
            };
            let fetchOptions = {
                method: 'post',
                mode: 'no-cors',
                body: JSON.stringify(postData),
            };
            if (isServerCorsEnabled) {
                fetchOptions.mode = 'cors';
                fetchOptions.headers = {
                    'X-OneSignal-Event': event,
                    'Content-Type': 'application/json'
                };
            }
            log.debug(`Executing ${event} webhook ${isServerCorsEnabled ? 'with' : 'without'} CORS %cPOST ${webhookTargetUrl}`, utils_1.getConsoleStyle('code'), ':', postData);
            return await fetch(webhookTargetUrl, fetchOptions);
        }
    }
    /**
     * Gets an array of active window clients along with whether each window client is the HTTP site's iFrame or an
     * HTTPS site page.
     * An active window client is a browser tab that is controlled by the service worker.
     * Technically, this list should only ever contain clients that are iFrames, or clients that are HTTPS site pages,
     * and not both. This doesn't really matter though.
     * @returns {Promise}
     */
    static async getActiveClients() {
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        let activeClients = [];
        for (let client of windowClients) {
            // Test if this window client is the HTTP subdomain iFrame pointing to subdomain.onesignal.com
            if (client.frameType && client.frameType === 'nested') {
                // Subdomain iFrames point to 'https://subdomain.onesignal.com...'
                if (!utils_1.contains(client.url, SdkEnvironment_1.default.getOneSignalApiUrl().host) &&
                    !utils_1.contains(client.url, '.os.tc')) {
                    continue;
                }
                // Indicates this window client is an HTTP subdomain iFrame
                client.isSubdomainIframe = true;
            }
            activeClients.push(client);
        }
        return activeClients;
    }
    /**
     * Constructs a structured notification object from the raw notification fetched from OneSignal's server. This
     * object is passed around from event to event, and is also returned to the host page for notification event details.
     * Constructed in onPushReceived, and passed along to other event handlers.
     * @param rawNotification The raw notification JSON returned from OneSignal's server.
     */
    static buildStructuredNotificationObject(rawNotification) {
        let notification = {
            id: rawNotification.custom.i,
            heading: rawNotification.title,
            content: rawNotification.alert,
            data: rawNotification.custom.a,
            url: rawNotification.custom.u,
            icon: rawNotification.icon,
            image: rawNotification.image,
            tag: rawNotification.tag,
            badge: rawNotification.badge,
            vibrate: rawNotification.vibrate
        };
        // Add action buttons
        if (rawNotification.o) {
            notification.buttons = [];
            for (let rawButton of rawNotification.o) {
                notification.buttons.push({
                    action: rawButton.i,
                    title: rawButton.n,
                    icon: rawButton.p,
                    url: rawButton.u
                });
            }
        }
        return utils_1.trimUndefined(notification);
    }
    /**
     * Given an image URL, returns a proxied HTTPS image using the https://images.weserv.nl service.
     * For a null image, returns null so that no icon is displayed.
     * If the image protocol is HTTPS, or origin contains localhost or starts with 192.168.*.*, we do not proxy the image.
     * @param imageUrl An HTTP or HTTPS image URL.
     */
    static ensureImageResourceHttps(imageUrl) {
        if (imageUrl) {
            try {
                let parsedImageUrl = new URL(imageUrl);
                if (parsedImageUrl.hostname === 'localhost' ||
                    parsedImageUrl.hostname.indexOf('192.168') !== -1 ||
                    parsedImageUrl.hostname === '127.0.0.1' ||
                    parsedImageUrl.protocol === 'https:') {
                    return imageUrl;
                }
                if (parsedImageUrl.hostname === 'i0.wp.com' ||
                    parsedImageUrl.hostname === 'i1.wp.com' ||
                    parsedImageUrl.hostname === 'i2.wp.com' ||
                    parsedImageUrl.hostname === 'i3.wp.com') {
                    /* Their site already uses Jetpack, just make sure Jetpack is HTTPS */
                    return `https://${parsedImageUrl.hostname}${parsedImageUrl.pathname}`;
                }
                /* HTTPS origin hosts can be used by prefixing the hostname with ssl: */
                let replacedImageUrl = parsedImageUrl.host + parsedImageUrl.pathname;
                return `https://i0.wp.com/${replacedImageUrl}`;
            }
            catch (e) { }
        }
        else
            return null;
    }
    /**
     * Given a structured notification object, HTTPS-ifies the notification icons and action button icons, if they exist.
     */
    static ensureNotificationResourcesHttps(notification) {
        if (notification) {
            if (notification.icon) {
                notification.icon = ServiceWorker.ensureImageResourceHttps(notification.icon);
            }
            if (notification.image) {
                notification.image = ServiceWorker.ensureImageResourceHttps(notification.image);
            }
            if (notification.buttons && notification.buttons.length > 0) {
                for (let button of notification.buttons) {
                    if (button.icon) {
                        button.icon = ServiceWorker.ensureImageResourceHttps(button.icon);
                    }
                }
            }
        }
    }
    /**
     * Actually displays a visible notification to the user.
     * Any event needing to display a notification calls this so that all the display options can be centralized here.
     * @param notification A structured notification object.
     */
    static displayNotification(notification, overrides) {
        log.debug(`Called %cdisplayNotification(${JSON.stringify(notification, null, 4)}):`, utils_1.getConsoleStyle('code'), notification);
        return Promise.all([
            // Use the default title if one isn't provided
            ServiceWorker._getTitle(),
            // Use the default icon if one isn't provided
            Database_1.default.get('Options', 'defaultIcon'),
            // Get option of whether we should leave notification displaying indefinitely
            Database_1.default.get('Options', 'persistNotification'),
            // Get app ID for tag value
            Database_1.default.get('Ids', 'appId')
        ])
            .then(([defaultTitle, defaultIcon, persistNotification, appId]) => {
            notification.heading = notification.heading ? notification.heading : defaultTitle;
            notification.icon = notification.icon ? notification.icon : (defaultIcon ? defaultIcon : undefined);
            var extra = {};
            extra.tag = notification.tag || appId;
            if (persistNotification === 'force') {
                extra.persistNotification = true;
            }
            else {
                extra.persistNotification = persistNotification;
            }
            // Allow overriding some values
            if (!overrides)
                overrides = {};
            notification = objectAssign(notification, overrides);
            ServiceWorker.ensureNotificationResourcesHttps(notification);
            let notificationOptions = {
                body: notification.content,
                icon: notification.icon,
                /*
                 On Chrome 56, a large image can be displayed:
                 https://bugs.chromium.org/p/chromium/issues/detail?id=614456
                 */
                image: notification.image,
                /*
                 On Chrome 44+, use this property to store extra information which
                 you can read back when the notification gets invoked from a
                 notification click or dismissed event. We serialize the
                 notification in the 'data' field and read it back in other events.
                 See:
                 https://developers.google.com/web/updates/2015/05/notifying-you-of-changes-to-notifications?hl=en
                 */
                data: notification,
                /*
                 On Chrome 48+, action buttons show below the message body of the
                 notification. Clicking either button takes the user to a link. See:
                 https://developers.google.com/web/updates/2016/01/notification-actions
                 */
                actions: notification.buttons,
                /*
                 Tags are any string value that groups notifications together. Two
                 or notifications sharing a tag replace each other.
                 */
                tag: extra.tag,
                /*
                 On Chrome 47+ (desktop), notifications will be dismissed after 20
                 seconds unless requireInteraction is set to true. See:
                 https://developers.google.com/web/updates/2015/10/notification-requireInteractiom
                 */
                requireInteraction: extra.persistNotification,
                /*
                 On Chrome 50+, by default notifications replacing
                 identically-tagged notifications no longer vibrate/signal the user
                 that a new notification has come in. This flag allows subsequent
                 notifications to re-alert the user. See:
                 https://developers.google.com/web/updates/2016/03/notifications
                 */
                renotify: true,
                /*
                 On Chrome 53+, returns the URL of the image used to represent the
                 notification when there is not enough space to display the
                 notification itself.
    
                 The URL of an image to represent the notification when there is not
                 enough space to display the notification itself such as, for
                 example, the Android Notification Bar. On Android devices, the
                 badge should accommodate devices up to 4x resolution, about 96 by
                 96 px, and the image will be automatically masked.
                 */
                badge: notification.badge,
                /*
                A vibration pattern to run with the display of the notification. A
                vibration pattern can be an array with as few as one member. The
                values are times in milliseconds where the even indices (0, 2, 4,
                etc.) indicate how long to vibrate and the odd indices indicate how
                long to pause. For example [300, 100, 400] would vibrate 300ms,
                pause 100ms, then vibrate 400ms.
                 */
                vibrate: notification.vibrate
            };
            notificationOptions = ServiceWorker.filterNotificationOptions(notificationOptions, persistNotification === 'force');
            return self.registration.showNotification(notification.heading, notificationOptions);
        });
    }
    static filterNotificationOptions(options, forcePersistNotifications) {
        /**
         * Due to Chrome 59+ notifications on Mac OS X using the native toast style
         * which limits the number of characters available to display the subdomain
         * to 14 with requireInteraction and 28 without, we force Mac OS X Chrome
         * notifications to be transient.
         */
        if (typeof options !== "object") {
            return options;
        }
        else {
            const clone = objectAssign({}, options);
            if (Browser.name === '' && Browser.version === '') {
                var browser = Browser._detect(navigator.userAgent);
            }
            else {
                var browser = Browser;
            }
            if (browser.chrome &&
                browser.mac &&
                clone) {
                clone.requireInteraction = false;
            }
            if (forcePersistNotifications) {
                clone.requireInteraction = true;
            }
            return clone;
        }
    }
    /**
     * Stores the most recent notification into IndexedDB so that it can be shown as a backup if a notification fails
     * to be displayed. This is to avoid Chrome's forced "This site has been updated in the background" message. See
     * this post for more details: http://stackoverflow.com/a/35045513/555547.
     * This is called every time is a push message is received so that the most recent message can be used as the
     * backup notification.
     * @param notification The most recent notification as a structured notification object.
     */
    static async updateBackupNotification(notification) {
        let isWelcomeNotification = notification.data && notification.data.__isOneSignalWelcomeNotification;
        // Don't save the welcome notification, that just looks broken
        if (isWelcomeNotification)
            return;
        await Database_1.default.put('Ids', { type: 'backupNotification', id: notification });
    }
    /**
     * Displays a fail-safe notification during a push event in case notification contents could not be retrieved.
     * This is to avoid Chrome's forced "This site has been updated in the background" message. See this post for
     * more details: http://stackoverflow.com/a/35045513/555547.
     */
    static displayBackupNotification() {
        return Database_1.default.get('Ids', 'backupNotification')
            .then(backupNotification => {
            let overrides = {
                // Don't persist our backup notification; users should ideally not see them
                persistNotification: false,
                data: { __isOneSignalBackupNotification: true }
            };
            if (backupNotification) {
                return ServiceWorker.displayNotification(backupNotification, overrides);
            }
            else {
                return ServiceWorker.displayNotification({
                    content: 'You have new updates.'
                }, overrides);
            }
        });
    }
    /**
     * Returns false if the given URL matches a few special URLs designed to skip opening a URL when clicking a
     * notification. Otherwise returns true and the link will be opened.
     * @param url
       */
    static shouldOpenNotificationUrl(url) {
        return (url !== 'javascript:void(0);' &&
            url !== 'do_not_open' &&
            !utils_1.contains(url, '_osp=do_not_open'));
    }
    /**
     * Occurs when a notification is dismissed by the user (clicking the 'X') or all notifications are cleared.
     * Supported on: Chrome 50+ only
     */
    static onNotificationClosed(event) {
        log.debug(`Called %conNotificationClosed(${JSON.stringify(event, null, 4)}):`, utils_1.getConsoleStyle('code'), event);
        let notification = event.notification.data;
        swivel.broadcast('notification.dismissed', notification);
        event.waitUntil(ServiceWorker.executeWebhooks('notification.dismissed', notification));
    }
    /**
     * After clicking a notification, determines the URL to open based on whether an action button was clicked or the
     * notification body was clicked.
     */
    static async getNotificationUrlToOpen(notification) {
        // Defaults to the URL the service worker was registered
        // TODO: This should be fixed for HTTP sites
        let launchUrl = self.registration.scope;
        // Use the user-provided default URL if one exists
        const { defaultNotificationUrl: dbDefaultNotificationUrl } = await Database_1.default.getAppState();
        if (dbDefaultNotificationUrl)
            launchUrl = dbDefaultNotificationUrl;
        // If the user clicked an action button, use the URL provided by the action button
        // Unless the action button URL is null
        if (notification.action) {
            // Find the URL tied to the action button that was clicked
            for (let button of notification.buttons) {
                if (button.action === notification.action &&
                    button.url &&
                    button.url !== '') {
                    launchUrl = button.url;
                }
            }
        }
        else if (notification.url &&
            notification.url !== '') {
            // The user clicked the notification body instead of an action button
            launchUrl = notification.url;
        }
        return launchUrl;
    }
    /**
     * Occurs when the notification's body or action buttons are clicked. Does not occur if the notification is
     * dismissed by clicking the 'X' icon. See the notification close event for the dismissal event.
     */
    static async onNotificationClicked(event) {
        log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, utils_1.getConsoleStyle('code'), event);
        // Close the notification first here, before we do anything that might fail
        event.notification.close();
        const notification = event.notification.data;
        // Chrome 48+: Get the action button that was clicked
        if (event.action)
            notification.action = event.action;
        let notificationClickHandlerMatch = 'exact';
        let notificationClickHandlerAction = 'navigate';
        const matchPreference = await Database_1.default.get('Options', 'notificationClickHandlerMatch');
        if (matchPreference)
            notificationClickHandlerMatch = matchPreference;
        const actionPreference = await this.database.get('Options', 'notificationClickHandlerAction');
        if (actionPreference)
            notificationClickHandlerAction = actionPreference;
        const activeClients = await ServiceWorker.getActiveClients();
        let launchUrl = await ServiceWorker.getNotificationUrlToOpen(notification);
        let notificationOpensLink = ServiceWorker.shouldOpenNotificationUrl(launchUrl);
        /*
         Check if we can focus on an existing tab instead of opening a new url.
         If an existing tab with exactly the same URL already exists, then this existing tab is focused instead of
         an identical new tab being created. With a special setting, any existing tab matching the origin will
         be focused instead of an identical new tab being created.
         */
        let doNotOpenLink = false;
        for (let client of activeClients) {
            let clientUrl = client.url;
            if (client.isSubdomainIframe) {
                const lastKnownHostUrl = await Database_1.default.get('Options', 'lastKnownHostUrl');
                clientUrl = lastKnownHostUrl;
                if (!lastKnownHostUrl) {
                    clientUrl = await Database_1.default.get('Options', 'defaultUrl');
                }
            }
            let clientOrigin = '';
            try {
                clientOrigin = new URL(clientUrl).origin;
            }
            catch (e) {
                log.error(`Failed to get the HTTP site's actual origin:`, e);
            }
            let launchOrigin = null;
            try {
                // Check if the launchUrl is valid; it can be null
                launchOrigin = new URL(launchUrl).origin;
            }
            catch (e) {
            }
            if ((notificationClickHandlerMatch === 'exact' && clientUrl === launchUrl) ||
                (notificationClickHandlerMatch === 'origin' && clientOrigin === launchOrigin)) {
                if ((client.isSubdomainIframe && clientUrl === launchUrl) ||
                    (!client.isSubdomainIframe && client.url === launchUrl) ||
                    (notificationClickHandlerAction === 'focus' && clientOrigin === launchOrigin)) {
                    swivel.emit(client.id, 'notification.clicked', notification);
                    try {
                        await client.focus();
                    }
                    catch (e) {
                        log.error("Failed to focus:", client, e);
                    }
                }
                else {
                    /*
                    We must focus first; once the client navigates away, it may not be to a service worker-controlled page, and
                    the client ID may change, making it unable to focus.
          
                    client.navigate() is available on Chrome 49+ and Firefox 50+.
                     */
                    if (client.isSubdomainIframe) {
                        try {
                            log.debug('Client is subdomain iFrame. Attempting to focus() client.');
                            await client.focus();
                        }
                        catch (e) {
                            log.error("Failed to focus:", client, e);
                        }
                        if (notificationOpensLink) {
                            log.debug(`Redirecting HTTP site to ${launchUrl}.`);
                            await Database_1.default.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                            swivel.emit(client.id, 'command.redirect', launchUrl);
                        }
                        else {
                            log.debug('Not navigating because link is special.');
                        }
                    }
                    else if (client.navigate) {
                        try {
                            log.debug('Client is standard HTTPS site. Attempting to focus() client.');
                            await client.focus();
                        }
                        catch (e) {
                            log.error("Failed to focus:", client, e);
                        }
                        try {
                            if (notificationOpensLink) {
                                log.debug(`Redirecting HTTPS site to (${launchUrl}).`);
                                await Database_1.default.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                                await client.navigate(launchUrl);
                            }
                            else {
                                log.debug('Not navigating because link is special.');
                            }
                        }
                        catch (e) {
                            log.error("Failed to navigate:", client, launchUrl, e);
                        }
                    }
                    else {
                        /*
                        If client.navigate() isn't available, we have no other option but to open a new tab to the URL.
                         */
                        await Database_1.default.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                        await ServiceWorker.openUrl(launchUrl);
                    }
                }
                doNotOpenLink = true;
                break;
            }
        }
        if (notificationOpensLink && !doNotOpenLink) {
            await Database_1.default.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
            await ServiceWorker.openUrl(launchUrl);
        }
        const { appId } = await Database_1.default.getAppConfig();
        const { deviceId } = await Database_1.default.getSubscription();
        if (appId && deviceId) {
            await OneSignalApi_1.default.put('notifications/' + notification.id, {
                app_id: appId,
                player_id: deviceId,
                opened: true
            });
        }
        return await ServiceWorker.executeWebhooks('notification.clicked', notification);
    }
    /**
     * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
     * @param url May not be well-formed.
     */
    static async openUrl(url) {
        log.debug('Opening notification URL:', url);
        try {
            return await self.clients.openWindow(url);
        }
        catch (e) {
            log.warn(`Failed to open the URL '${url}':`, e);
        }
    }
    static onServiceWorkerInstalled(event) {
        // At this point, the old service worker is still in control
        log.debug(`Called %conServiceWorkerInstalled(${JSON.stringify(event, null, 4)}):`, utils_1.getConsoleStyle('code'), event);
        log.info(`Installing service worker: %c${self.location.pathname}`, utils_1.getConsoleStyle('code'), `(version ${Environment_1.default.version()})`);
        if (utils_1.contains(self.location.pathname, "OneSignalSDKWorker"))
            var serviceWorkerVersionType = 'WORKER1_ONE_SIGNAL_SW_VERSION';
        else
            var serviceWorkerVersionType = 'WORKER2_ONE_SIGNAL_SW_VERSION';
        event.waitUntil(Database_1.default.put("Ids", { type: serviceWorkerVersionType, id: Environment_1.default.version() })
            .then(() => self.skipWaiting()));
    }
    /*
     1/11/16: Enable the waiting service worker to immediately become the active service worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
     */
    static onServiceWorkerActivated(event) {
        // The old service worker is gone now
        log.debug(`Called %conServiceWorkerActivated(${JSON.stringify(event, null, 4)}):`, utils_1.getConsoleStyle('code'), event);
        var activationPromise = self.clients.claim()
            .then(() => Database_1.default.get('Ids', 'userId'))
            .then(userId => {
            if (self.registration && userId) {
                return ServiceWorker._subscribeForPush(self.registration).catch(e => log.error(e));
            }
        });
        event.waitUntil(activationPromise);
    }
    static onFetch(event) {
        event.respondWith(fetch(event.request));
    }
    static onPushSubscriptionChange(event) {
        // Subscription expired
        log.debug(`Called %conPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`, utils_1.getConsoleStyle('code'), event);
        event.waitUntil(ServiceWorker._subscribeForPush(self.registration));
    }
    /**
     * Simulates a service worker event.
     * @param eventName An event name like 'pushsubscriptionchange'.
     */
    static simulateEvent(eventName) {
        self.dispatchEvent(new ExtendableEvent(eventName));
    }
    static _subscribeForPush(serviceWorkerRegistration) {
        log.debug(`Called %c_subscribeForPush()`, utils_1.getConsoleStyle('code'));
        let oldSubscription = null;
        let newSubscription = null;
        var appId = null;
        return Database_1.default.get('Ids', 'appId')
            .then(retrievedAppId => {
            appId = retrievedAppId;
            return serviceWorkerRegistration.pushManager.getSubscription();
        }).then(oldSubscription => {
            log.debug(`Resubscribing old subscription`, oldSubscription, `within the service worker ...`);
            // Only re-subscribe if there was an existing subscription and we are on Chrome 54+ wth PushSubscriptionOptions
            // Otherwise there's really no way to resubscribe since we don't have the manifest.json sender ID
            if (oldSubscription && oldSubscription.options) {
                oldSubscription = oldSubscription;
                return serviceWorkerRegistration.pushManager.subscribe(oldSubscription.options);
            }
            else {
                return Promise.resolve();
            }
        }).then(subscription => {
            newSubscription = subscription;
            var subscriptionInfo = null;
            if (subscription) {
                subscriptionInfo = {};
                log.debug(`Finished resubscribing for push:`, subscription);
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
                    }
                    catch (e) {
                        // User is most likely running < Chrome < 50
                    }
                    let auth = null;
                    try {
                        auth = subscription.getKey('auth');
                    }
                    catch (e) {
                        // User is most likely running < Firefox 45
                    }
                    if (p256dh) {
                        // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
                        let p256dh_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh)));
                        subscriptionInfo.p256dh = p256dh_base64encoded;
                    }
                    if (auth) {
                        // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
                        let auth_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(auth)));
                        subscriptionInfo.auth = auth_base64encoded;
                    }
                }
            }
            else {
                log.info('Could not subscribe your browser for push notifications.');
            }
            if (oldSubscription && newSubscription && oldSubscription.endpoint !== newSubscription.endpoint) {
                log.debug(`Registering resubscription with OneSignal because endpoints are different:`);
                return ServiceWorker.registerWithOneSignal(appId, subscriptionInfo);
            }
            else {
                log.debug(`Not registering resubscription with OneSignal because endpoints are identical.`);
            }
        });
    }
    /**
     * Creates a new or updates an existing OneSignal user (player) on the server.
     *
     * @param appId The app ID passed to init.
     *        subscriptionInfo A hash containing 'endpointOrToken', 'auth', and 'p256dh'.
     *
     * @remarks Called from both the host page and HTTP popup.
     *          If a user already exists and is subscribed, updates the session count by calling /players/:id/on_session; otherwise, a new player is registered via the /players endpoint.
     *          Saves the user ID and registration ID to the local web database after the response from OneSignal.
     */
    static registerWithOneSignal(appId, subscriptionInfo) {
        let deviceType = utils_1.getDeviceTypeForBrowser();
        return Promise.all([
            Database_1.default.get('Ids', 'userId'),
        ])
            .then(([userId, subscription]) => {
            if (!userId) {
                return Promise.reject('No user ID found; cannot update existing player info');
            }
            let requestUrl = `players/${userId}`;
            let requestData = {
                app_id: appId,
                device_type: deviceType,
                language: Environment_1.default.getLanguage(),
                timezone: new Date().getTimezoneOffset() * -60,
                device_model: navigator.platform + " " + Browser.name,
                device_os: Browser.version,
                sdk: ServiceWorker.VERSION,
            };
            if (subscriptionInfo) {
                requestData.identifier = subscriptionInfo.endpointOrToken;
                // Although we're passing the full endpoint to OneSignal, we still need to store only the registration ID for our SDK API getRegistrationId()
                // Parse out the registration ID from the full endpoint URL and save it to our database
                let registrationId = subscriptionInfo.endpointOrToken.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
                Database_1.default.put("Ids", { type: "registrationId", id: registrationId });
                // New web push standard in Firefox 46+ and Chrome 50+ includes 'auth' and 'p256dh' in PushSubscription
                if (subscriptionInfo.auth) {
                    requestData.web_auth = subscriptionInfo.auth;
                }
                if (subscriptionInfo.p256dh) {
                    requestData.web_p256 = subscriptionInfo.p256dh;
                }
            }
            return OneSignalApi_1.default.put(requestUrl, requestData);
        })
            .then((response) => {
            if (response) {
                if (!response.success) {
                    log.error('Resubscription registration with OneSignal failed:', response);
                }
                let { id: userId } = response;
                if (userId) {
                    Database_1.default.put("Ids", { type: "userId", id: userId });
                }
            }
            else {
                // No user ID found, this returns undefined
                log.debug('Resubscription registration failed because no user ID found.');
            }
        });
    }
    /**
     * Returns a promise that is fulfilled with either the default title from the database (first priority) or the page title from the database (alternate result).
     */
    static _getTitle() {
        return new Promise((resolve, reject) => {
            Promise.all([Database_1.default.get('Options', 'defaultTitle'), Database_1.default.get('Options', 'pageTitle')])
                .then(([defaultTitle, pageTitle]) => {
                if (defaultTitle !== null) {
                    resolve(defaultTitle);
                }
                else if (pageTitle != null) {
                    resolve(pageTitle);
                }
                else {
                    resolve('');
                }
            });
        });
    }
    /**
     * Returns an array of raw notification objects, either fetched from the server (as from legacy GCM push), or read
     * from the event.data.payload property (as from the new web push protocol).
     * @param event
     * @returns An array of notifications. The new web push protocol will only ever contain one notification, however
     * an array is returned for backwards compatibility with the rest of the service worker plumbing.
       */
    static parseOrFetchNotifications(event) {
        if (event.data) {
            const isValidPayload = ServiceWorker.isValidPushPayload(event.data);
            if (isValidPayload) {
                log.debug('Received a valid encrypted push payload.');
                return Promise.resolve([event.data.json()]);
            }
            else {
                return Promise.reject('Unexpected push message payload received: ' + event.data.text());
                /*
                 We received a push message payload from another service provider or a malformed
                 payload. The last received notification will be displayed.
                 */
            }
        }
        else
            return ServiceWorker.retrieveNotifications();
    }
    /**
     * Returns true if the raw data payload is a OneSignal push message in the format of the new web push protocol.
     * Otherwise returns false.
     * @param rawData The raw PushMessageData from the push event's event.data, not already parsed to JSON.
     */
    static isValidPushPayload(rawData) {
        try {
            const payload = rawData.json();
            if (payload &&
                payload.custom &&
                payload.custom.i &&
                utils_1.isValidUuid(payload.custom.i)) {
                return true;
            }
            else {
                log.debug('isValidPushPayload: Valid JSON but missing notification UUID:', payload);
                return false;
            }
        }
        catch (e) {
            log.debug('isValidPushPayload: Parsing to JSON failed with:', e);
            return false;
        }
    }
    /**
     * Retrieves unread notifications from OneSignal's servers. For Chrome and Firefox's legacy web push protocol,
     * a push signal is sent to the service worker without any message contents, and the service worker must retrieve
     * the contents from OneSignal's servers. In Chrome and Firefox's new web push protocols involving payloads, the
     * notification contents will arrive with the push signal. The legacy format must be supported for a while.
     */
    static retrieveNotifications() {
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
            Database_1.default.get('Ids', 'userId')
                .then(userId => {
                if (userId) {
                    log.debug(`Legacy push signal received, retrieving contents from players/${userId}/chromeweb_notification`);
                    return OneSignalApi_1.default.get(`players/${userId}/chromeweb_notification`);
                }
                else {
                    log.debug('Tried to get notification contents, but IndexedDB is missing user ID info.');
                    return Promise.all([
                        Database_1.default.get('Ids', 'appId'),
                        self.registration.pushManager.getSubscription().then(subscription => subscription.endpoint)
                    ])
                        .then(([appId, identifier]) => {
                        let deviceType = utils_1.getDeviceTypeForBrowser();
                        // Get the user ID from OneSignal
                        return OneSignalApi_1.default.getUserIdFromSubscriptionIdentifier(appId, deviceType, identifier).then(recoveredUserId => {
                            if (recoveredUserId) {
                                log.debug('Recovered OneSignal user ID:', recoveredUserId);
                                // We now have our OneSignal user ID again
                                return Promise.all([
                                    Database_1.default.put('Ids', { type: 'userId', id: recoveredUserId }),
                                    Database_1.default.put('Ids', {
                                        type: 'registrationId',
                                        id: identifier.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "")
                                    }),
                                ]).then(() => {
                                    // Try getting the notification again
                                    log.debug('Attempting to retrieve the notification again now with a recovered user ID.');
                                    return OneSignalApi_1.default.get(`players/${recoveredUserId}/chromeweb_notification`);
                                });
                            }
                            else {
                                return Promise.reject('Recovered user ID was null. Unsubscribing from push notifications.');
                            }
                        });
                    })
                        .catch(error => {
                        log.debug('Unsuccessfully attempted to recover OneSignal user ID:', error);
                        // Actually unsubscribe from push so this user doesn't get bothered again
                        return self.registration.pushManager.getSubscription()
                            .then(subscription => {
                            return subscription.unsubscribe();
                        })
                            .then(unsubscriptionResult => {
                            log.debug('Unsubscribed from push notifications result:', unsubscriptionResult);
                            ServiceWorker.UNSUBSCRIBED_FROM_NOTIFICATIONS = true;
                        });
                    });
                }
            })
                .then((response) => {
                // The response is an array literal -- response.json() has been called by apiCall()
                // The result looks like this:
                // OneSignalApi.get('players/7442a553-5f61-4b3e-aedd-bb574ef6946f/chromeweb_notification').then(function(response) { log.debug(response); });
                // ["{"custom":{"i":"6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"},"icon":"https://onesignal.com/images/notification_logo.png","alert":"asd","title":"ss"}"]
                // ^ Notice this is an array literal with JSON data inside
                for (var i = 0; i < response.length; i++) {
                    notifications.push(JSON.parse(response[i]));
                }
                if (notifications.length == 0) {
                    log.warn('OneSignal Worker: Received a GCM push signal, but there were no messages to retrieve. Are you' +
                        ' using the wrong API URL?', SdkEnvironment_1.default.getOneSignalApiUrl().toString());
                }
                resolve(notifications);
            });
        });
    }
}
exports.ServiceWorker = ServiceWorker;
// Expose this class to the global scope
if (typeof self === "undefined" &&
    typeof global !== "undefined") {
    global.OneSignalWorker = ServiceWorker;
}
else {
    self.OneSignalWorker = ServiceWorker;
}
// Set logging to the appropriate level
log.setDefaultLevel(SdkEnvironment_1.default.getBuildEnv() === BuildEnvironmentKind_1.BuildEnvironmentKind.Development ? log.levels.TRACE : log.levels.ERROR);
// Print it's happy time!
log.info(`%cOneSignal Service Worker loaded (version ${Environment_1.default.version()}, ${SdkEnvironment_1.default.getWindowEnv().toString()} environment).`, utils_1.getConsoleStyle('bold'));
// Run our main file
if (typeof self !== "undefined") {
    ServiceWorker.run();
}
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/service-worker/ServiceWorker.js.map
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(28)))

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ActiveAnimatedElement_1 = __webpack_require__(20);
class Badge extends ActiveAnimatedElement_1.default {
    constructor() {
        super('.onesignal-bell-launcher-badge', 'onesignal-bell-launcher-badge-opened', null, 'onesignal-bell-launcher-badge-active', null, 'hidden');
    }
    increment() {
        // If it IS a number (is not not a number)
        if (!isNaN(this.content)) {
            let badgeNumber = +this.content; // Coerce to int
            badgeNumber += 1;
            this.content = badgeNumber.toString();
            return badgeNumber;
        }
    }
    decrement() {
        // If it IS a number (is not not a number)
        if (!isNaN(this.content)) {
            let badgeNumber = +this.content; // Coerce to int
            badgeNumber -= 1;
            if (badgeNumber > 0)
                this.content = badgeNumber.toString();
            else
                this.content = '';
            return badgeNumber;
        }
    }
}
exports.default = Badge;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/Badge.js.map

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const Event_1 = __webpack_require__(3);
const ActiveAnimatedElement_1 = __webpack_require__(20);
const Bell_1 = __webpack_require__(17);
const LimitStore_1 = __webpack_require__(15);
const Message_1 = __webpack_require__(29);
const SubscriptionHelper_1 = __webpack_require__(6);
class Button extends ActiveAnimatedElement_1.default {
    constructor(bell) {
        super('.onesignal-bell-launcher-button', null, null, 'onesignal-bell-launcher-button-active', null, 'shown', '');
        this.bell = bell;
        this.events = {
            mouse: 'bell.launcher.button.mouse'
        };
        this.element.addEventListener('touchstart', (e) => {
            this.onHovering(e);
            this.onTap(e);
        });
        this.element.addEventListener('mouseenter', (e) => {
            this.onHovering(e);
        });
        this.element.addEventListener('mouseleave', (e) => {
            this.onHovered(e);
        });
        this.element.addEventListener('touchmove', (e) => {
            this.onHovered(e);
        });
        this.element.addEventListener('mousedown', (e) => {
            this.onTap(e);
        });
        this.element.addEventListener('mouseup', (e) => {
            this.onEndTap(e);
        });
        this.element.addEventListener('click', (e) => {
            this.onHovered(e);
            this.onClick(e);
        });
    }
    onHovering(e) {
        if (LimitStore_1.default.isEmpty(this.events.mouse) || LimitStore_1.default.getLast(this.events.mouse) === 'out') {
            Event_1.default.trigger(Bell_1.default.EVENTS.HOVERING);
        }
        LimitStore_1.default.put(this.events.mouse, 'over');
    }
    onHovered(e) {
        LimitStore_1.default.put(this.events.mouse, 'out');
        Event_1.default.trigger(Bell_1.default.EVENTS.HOVERED);
    }
    onTap(e) {
        this.pulse();
        this.activate();
        this.bell.badge.activate();
    }
    onEndTap(e) {
        this.inactivate();
        this.bell.badge.inactivate();
    }
    onClick(e) {
        Event_1.default.trigger(Bell_1.default.EVENTS.BELL_CLICK);
        Event_1.default.trigger(Bell_1.default.EVENTS.LAUNCHER_CLICK);
        if (this.bell.message.shown && this.bell.message.contentType == Message_1.default.TYPES.MESSAGE) {
            // A message is being shown, it'll disappear soon
            return;
        }
        var optedOut = LimitStore_1.default.getLast('subscription.optedOut');
        if (this.bell.unsubscribed) {
            if (optedOut) {
                // The user is manually opted out, but still "really" subscribed
                this.bell.launcher.activateIfInactive().then(() => {
                    this.bell.showDialogProcedure();
                });
            }
            else {
                // The user is actually subscribed, register him for notifications
                OneSignal.registerForPushNotifications();
                //// Show the 'Click Allow to receive notifications' tip, if they haven't already enabled permissions
                //if (OneSignal.getNotificationPermission() === 'default') {
                //  this.bell.message.display(Message.TYPES.MESSAGE, this.bell.text['message.action.subscribing'], Message.TIMEOUT)
                //}
                this.bell._ignoreSubscriptionState = true;
                OneSignal.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, isSubscribed => {
                    this.bell.message.display(Message_1.default.TYPES.MESSAGE, this.bell.text['message.action.subscribed'], Message_1.default.TIMEOUT)
                        .then(() => {
                        this.bell._ignoreSubscriptionState = false;
                        this.bell.launcher.inactivate();
                    });
                });
            }
        }
        else if (this.bell.subscribed) {
            this.bell.launcher.activateIfInactive().then(() => {
                this.bell.showDialogProcedure();
            });
        }
        else if (this.bell.blocked) {
            if (SubscriptionHelper_1.default.isUsingSubscriptionWorkaround()) {
                // Show the HTTP popup so users can re-allow notifications
                OneSignal.registerForPushNotifications();
            }
            else {
                this.bell.launcher.activateIfInactive().then(() => {
                    this.bell.showDialogProcedure();
                });
            }
        }
        return this.bell.message.hide();
    }
    pulse() {
        utils_1.removeDomElement('.pulse-ring');
        utils_1.addDomElement(this.element, 'beforeend', '<div class="pulse-ring"></div>');
        this.bell.setCustomColorsIfSpecified();
    }
}
exports.default = Button;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/Button.js.map

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const Event_1 = __webpack_require__(3);
const AnimatedElement_1 = __webpack_require__(21);
const Browser = __webpack_require__(11);
const Bell_1 = __webpack_require__(17);
const SdkEnvironment_1 = __webpack_require__(2);
class Dialog extends AnimatedElement_1.default {
    constructor(bell) {
        super('.onesignal-bell-launcher-dialog', 'onesignal-bell-launcher-dialog-opened', null, 'hidden', ['opacity', 'transform'], '.onesignal-bell-launcher-dialog-body');
        this.bell = bell;
        this.subscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #subscribe-button';
        this.unsubscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #unsubscribe-button';
        this.notificationIcons = null;
    }
    getPlatformNotificationIcon() {
        if (this.notificationIcons) {
            if (Browser.chrome || Browser.firefox) {
                return this.notificationIcons.chrome || this.notificationIcons.safari;
            }
            else if (Browser.safari) {
                return this.notificationIcons.safari || this.notificationIcons.chrome;
            }
        }
        else
            return null;
    }
    show() {
        return this.updateBellLauncherDialogBody()
            .then(() => super.show());
    }
    get subscribeButtonSelectorId() {
        return 'subscribe-button';
    }
    get unsubscribeButtonSelectorId() {
        return 'unsubscribe-button';
    }
    get subscribeButton() {
        return this.element.querySelector('#' + this.subscribeButtonSelectorId);
    }
    get unsubscribeButton() {
        return this.element.querySelector('#' + this.unsubscribeButtonSelectorId);
    }
    updateBellLauncherDialogBody() {
        return OneSignal.getSubscription().then((currentSetSubscription) => {
            utils_1.clearDomElementChildren(document.querySelector(this.nestedContentSelector));
            let contents = 'Nothing to show.';
            var footer = '';
            if (this.bell.options.showCredit) {
                footer = `<div class="divider"></div><div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>`;
            }
            if (this.bell.state === Bell_1.default.STATES.SUBSCRIBED && currentSetSubscription === true ||
                this.bell.state === Bell_1.default.STATES.UNSUBSCRIBED && currentSetSubscription === false) {
                let notificationIconHtml = '';
                let imageUrl = this.getPlatformNotificationIcon();
                if (imageUrl) {
                    notificationIconHtml = `<div class="push-notification-icon"><img src="${imageUrl}"></div>`;
                }
                else {
                    notificationIconHtml = `<div class="push-notification-icon push-notification-icon-default"></div>`;
                }
                let buttonHtml = '';
                if (this.bell.state !== Bell_1.default.STATES.SUBSCRIBED)
                    buttonHtml = `<button type="button" class="action" id="${this.subscribeButtonSelectorId}">${this.bell.text['dialog.main.button.subscribe']}</button>`;
                else
                    buttonHtml = `<button type="button" class="action" id="${this.unsubscribeButtonSelectorId}">${this.bell.text['dialog.main.button.unsubscribe']}</button>`;
                contents = `<h1>${this.bell.text['dialog.main.title']}</h1><div class="divider"></div><div class="push-notification">${notificationIconHtml}<div class="push-notification-text-container"><div class="push-notification-text push-notification-text-short"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div></div></div><div class="action-container">${buttonHtml}</div>${footer}`;
            }
            else if (this.bell.state === Bell_1.default.STATES.BLOCKED) {
                let imageUrl = null;
                if (Browser.chrome) {
                    if (!Browser.mobile && !Browser.tablet) {
                        imageUrl = SdkEnvironment_1.default.getOneSignalApiUrl().origin + '/bell/chrome-unblock.jpg';
                    }
                }
                else if (Browser.firefox)
                    imageUrl = SdkEnvironment_1.default.getOneSignalApiUrl().origin + '/bell/firefox-unblock.jpg';
                else if (Browser.safari)
                    imageUrl = SdkEnvironment_1.default.getOneSignalApiUrl().origin + '/bell/safari-unblock.jpg';
                let instructionsHtml = '';
                if (imageUrl) {
                    instructionsHtml = `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a></div>`;
                }
                if ((Browser.mobile || Browser.tablet) && Browser.chrome) {
                    instructionsHtml = `<ol><li>Access <strong>Settings</strong> by tapping the three menu dots <strong>⋮</strong></li><li>Click <strong>Site settings</strong> under Advanced.</li><li>Click <strong>Notifications</strong>.</li><li>Find and click this entry for this website.</li><li>Click <strong>Notifications</strong> and set it to <strong>Allow</strong>.</li></ol>`;
                }
                contents = `<h1>${this.bell.text['dialog.blocked.title']}</h1><div class="divider"></div><div class="instructions"><p>${this.bell.text['dialog.blocked.message']}</p>${instructionsHtml}</div>${footer}`;
            }
            utils_1.addDomElement(document.querySelector(this.nestedContentSelector), 'beforeend', contents);
            if (this.subscribeButton) {
                this.subscribeButton.addEventListener('click', () => {
                    /*
                      The welcome notification should only be shown if the user is
                      subscribing for the first time and resubscribing via the notify
                      button.
          
                      If permission is already granted, __doNotShowWelcomeNotification is
                      set to true to prevent showing a notification, but we actually want
                      a notification shown in this resubscription case.
                     */
                    OneSignal.__doNotShowWelcomeNotification = false;
                    Event_1.default.trigger(Bell_1.default.EVENTS.SUBSCRIBE_CLICK);
                });
            }
            if (this.unsubscribeButton) {
                this.unsubscribeButton.addEventListener('click', () => Event_1.default.trigger(Bell_1.default.EVENTS.UNSUBSCRIBE_CLICK));
            }
            this.bell.setCustomColorsIfSpecified();
        });
    }
}
exports.default = Dialog;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/Dialog.js.map

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const ActiveAnimatedElement_1 = __webpack_require__(20);
const InvalidStateError_1 = __webpack_require__(14);
class Launcher extends ActiveAnimatedElement_1.default {
    constructor(bell) {
        super('.onesignal-bell-launcher', 'onesignal-bell-launcher-active', null, null, 'onesignal-bell-launcher-inactive', 'hidden', 'active');
        this.bell = bell;
        this.wasInactive = false;
    }
    async resize(size) {
        if (!this.element) {
            // Notify button doesn't exist
            throw new InvalidStateError_1.InvalidStateError(InvalidStateError_1.InvalidStateReason.MissingDomElement);
        }
        // If the size is the same, do nothing and resolve an empty promise
        if ((size === 'small' && utils_1.hasCssClass(this.element, 'onesignal-bell-launcher-sm')) ||
            (size === 'medium' && utils_1.hasCssClass(this.element, 'onesignal-bell-launcher-md')) ||
            (size === 'large' && utils_1.hasCssClass(this.element, 'onesignal-bell-launcher-lg'))) {
            return Promise.resolve(this);
        }
        utils_1.removeCssClass(this.element, 'onesignal-bell-launcher-sm');
        utils_1.removeCssClass(this.element, 'onesignal-bell-launcher-md');
        utils_1.removeCssClass(this.element, 'onesignal-bell-launcher-lg');
        if (size === 'small') {
            utils_1.addCssClass(this.element, 'onesignal-bell-launcher-sm');
        }
        else if (size === 'medium') {
            utils_1.addCssClass(this.element, 'onesignal-bell-launcher-md');
        }
        else if (size === 'large') {
            utils_1.addCssClass(this.element, 'onesignal-bell-launcher-lg');
        }
        else {
            throw new Error('Invalid OneSignal bell size ' + size);
        }
        if (!this.shown) {
            return this;
        }
        else {
            return await new Promise((resolve) => {
                // Once the launcher has finished shrinking down
                if (this.targetTransitionEvents.length == 0) {
                    return resolve(this);
                }
                else {
                    var timerId = setTimeout(() => {
                        log.debug(`Launcher did not completely resize (state: ${this.state}, activeState: ${this.activeState}).`);
                    }, this.transitionCheckTimeout);
                    utils_1.once(this.element, 'transitionend', (event, destroyListenerFn) => {
                        if (event.target === this.element &&
                            utils_1.contains(this.targetTransitionEvents, event.propertyName)) {
                            clearTimeout(timerId);
                            // Uninstall the event listener for transitionend
                            destroyListenerFn();
                            return resolve(this);
                        }
                    }, true);
                }
            });
        }
    }
    activateIfInactive() {
        if (this.inactive) {
            this.wasInactive = true;
            return this.activate();
        }
        else
            return utils_1.nothing();
    }
    inactivateIfWasInactive() {
        if (this.wasInactive) {
            this.wasInactive = false;
            return this.inactivate();
        }
        else
            return utils_1.nothing();
    }
    clearIfWasInactive() {
        this.wasInactive = false;
    }
    inactivate() {
        return this.bell.message.hide()
            .then(() => {
            if (this.bell.badge.content.length > 0) {
                return this.bell.badge.hide()
                    .then(() => Promise.all([super.inactivate(), this.resize('small')]))
                    .then(() => this.bell.badge.show());
            }
            else {
                return Promise.all([super.inactivate(), this.resize('small')]);
            }
        });
    }
    activate() {
        if (this.bell.badge.content.length > 0) {
            return this.bell.badge.hide()
                .then(() => Promise.all([super.activate(), this.resize(this.bell.options.size)]));
        }
        else {
            return Promise.all([super.activate(), this.resize(this.bell.options.size)]);
        }
    }
}
exports.default = Launcher;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/bell/Launcher.js.map

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Environment_1 = __webpack_require__(8);
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const SdkEnvironment_1 = __webpack_require__(2);
const WindowEnvironmentKind_1 = __webpack_require__(5);
if (Environment_1.default.isBrowser()) {
    utils_1.incrementSdkLoadCount();
    if (utils_1.getSdkLoadCount() > 1) {
        log.warn(`OneSignal: The web push SDK is included more than once. For optimal performance, please include our ` +
            `SDK only once on your page.`);
        log.debug(`OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
            `Occurred ${utils_1.getSdkLoadCount()} times.`);
    }
    else {
        // We're running in the host page, iFrame of the host page, or popup window
        // Load OneSignal's web SDK
        if (typeof OneSignal !== "undefined")
            var predefinedOneSignalPushes = OneSignal;
        if (utils_1.isPushNotificationsSupported()) {
            window.OneSignal = __webpack_require__(47).default;
        }
        else {
            log.debug('OneSignal: Push notifications are not supported. A stubbed version of the SDK will be initialized.');
            window.OneSignal = __webpack_require__(48).default;
        }
        if (predefinedOneSignalPushes)
            for (var i = 0; i < predefinedOneSignalPushes.length; i++)
                OneSignal.push(predefinedOneSignalPushes[i]);
    }
}
else if (SdkEnvironment_1.default.getWindowEnv() === WindowEnvironmentKind_1.WindowEnvironmentKind.ServiceWorker) {
    // We're running as the service worker
    self.OneSignal = __webpack_require__(49).default;
}
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/entry.js.map

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
var InvalidArgumentReason;
(function (InvalidArgumentReason) {
    InvalidArgumentReason[InvalidArgumentReason["Empty"] = 0] = "Empty";
    InvalidArgumentReason[InvalidArgumentReason["Malformed"] = 1] = "Malformed";
})(InvalidArgumentReason = exports.InvalidArgumentReason || (exports.InvalidArgumentReason = {}));
class InvalidArgumentError extends OneSignalError_1.default {
    constructor(argName, reason) {
        switch (reason) {
            case InvalidArgumentReason.Empty:
                super(`Supply a non-empty value to '${argName}'.`);
                break;
            case InvalidArgumentReason.Malformed:
                super(`The value for '${argName}' was malformed.`);
                break;
        }
        this.argument = argName;
        this.reason = InvalidArgumentReason[reason];
    }
}
exports.InvalidArgumentError = InvalidArgumentError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/InvalidArgumentError.js.map

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
class PushNotSupportedError extends OneSignalError_1.default {
    constructor(uuid) {
        super(`'${uuid}' is not a valid UUID`);
    }
}
exports.default = PushNotSupportedError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/InvalidUuidError.js.map

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
var NotSubscribedReason;
(function (NotSubscribedReason) {
    NotSubscribedReason[NotSubscribedReason["Unknown"] = 0] = "Unknown";
    NotSubscribedReason[NotSubscribedReason["NoDeviceId"] = 1] = "NoDeviceId";
    NotSubscribedReason[NotSubscribedReason["OptedOut"] = 2] = "OptedOut";
})(NotSubscribedReason = exports.NotSubscribedReason || (exports.NotSubscribedReason = {}));
class NotSubscribedError extends OneSignalError_1.default {
    constructor(reason) {
        switch (reason) {
            case NotSubscribedReason.Unknown || NotSubscribedReason.NoDeviceId:
                super('This operation can only be performed after the user is subscribed.');
                break;
            case NotSubscribedReason.OptedOut:
                super('The user has manually opted out of receiving of notifications. This operation can only be performed after the user is fully resubscribed.');
                break;
        }
        this.reason = NotSubscribedReason[reason];
    }
}
exports.NotSubscribedError = NotSubscribedError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/NotSubscribedError.js.map

/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const OneSignalError_1 = __webpack_require__(9);
var SdkInitErrorKind;
(function (SdkInitErrorKind) {
    SdkInitErrorKind[SdkInitErrorKind["InvalidAppId"] = 0] = "InvalidAppId";
    SdkInitErrorKind[SdkInitErrorKind["AppNotConfiguredForWebPush"] = 1] = "AppNotConfiguredForWebPush";
    SdkInitErrorKind[SdkInitErrorKind["MissingSubdomain"] = 2] = "MissingSubdomain";
    SdkInitErrorKind[SdkInitErrorKind["MultipleInitialization"] = 3] = "MultipleInitialization";
    SdkInitErrorKind[SdkInitErrorKind["MissingSafariWebId"] = 4] = "MissingSafariWebId";
    SdkInitErrorKind[SdkInitErrorKind["Unknown"] = 5] = "Unknown";
})(SdkInitErrorKind = exports.SdkInitErrorKind || (exports.SdkInitErrorKind = {}));
class SdkInitError extends OneSignalError_1.default {
    constructor(reason) {
        switch (reason) {
            case SdkInitErrorKind.InvalidAppId:
                super('OneSignal: This app ID does match any existing app. Double check your app ID.');
                break;
            case SdkInitErrorKind.AppNotConfiguredForWebPush:
                super('OneSignal: This app ID does not have any web platforms enabled. Double check your app ID, or see step 1 on our setup guide (https://goo.gl/01h7fZ).');
                break;
            case SdkInitErrorKind.MissingSubdomain:
                super('OneSignal: Non-HTTPS pages require a subdomain of OneSignal to be chosen on your dashboard. See step 1.4 on our setup guide (https://goo.gl/xip6JB).');
                break;
            case SdkInitErrorKind.MultipleInitialization:
                super('OneSignal: The OneSignal web SDK can only be initialized once. Extra initializations are ignored. Please remove calls initializing the SDK more than once.');
                break;
            case SdkInitErrorKind.MissingSafariWebId:
                super('OneSignal: Safari browser support on Mac OS X requires the Safari web platform to be enabled. Please see the Safari Support steps in our web setup guide.');
                break;
            case SdkInitErrorKind.Unknown:
                super('OneSignal: An unknown initialization error occurred.');
                break;
        }
        this.reason = SdkInitErrorKind[reason];
    }
}
exports.SdkInitError = SdkInitError;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/errors/SdkInitError.js.map

/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const Event_1 = __webpack_require__(3);
const objectAssign = __webpack_require__(4);
class HttpModal {
    static get EVENTS() {
        return {
            FINISH_CLICK: 'httpModalFinishClick',
            SHOWN: 'httpModalShown',
            CLOSED: 'httpModalClosed',
        };
    }
    constructor(options) {
        if (!options) {
            this.options = {};
        }
        else {
            this.options = objectAssign({}, options);
        }
        if (!this.options['modalTitle'] || typeof this.options['modalTitle'] !== "string")
            this.options['modalTitle'] = "Thanks for subscribing";
        if (!this.options['modalMessage'] || typeof this.options['modalMessage'] !== "string")
            this.options['modalMessage'] = "You're now subscribed to notifications. You can unsubscribe at any time.";
        if (!this.options['modalButtonText'] || typeof this.options['modalButtonText'] !== "string")
            this.options['modalButtonText'] = "Close";
        this.options['modalTitle'] = this.options['modalTitle'].substring(0, 50);
        this.options['modalMessage'] = this.options['modalMessage'].substring(0, 90);
        this.options['modalButtonText'] = this.options['modalButtonText'].substring(0, 35);
    }
    create() {
        try {
            // Remove any existing container
            if (this.container) {
                utils_1.removeDomElement('#onesignal-modal-container');
            }
            let dialogHtml = `<div id="onesignal-modal-dialog"><div class="modal-exit">&times;</div><div class="modal-body"><div class="modal-body-title">${this.options['modalTitle']}</div><div class="modal-body-message">${this.options['modalMessage']}</div><div class="clearfix"></div></div><div class="modal-footer"><button id="onesignal-modal-finish-button" class="primary modal-button">${this.options['modalButtonText']}</button><div class="clearfix"></div></div></div>`;
            // Insert the container
            utils_1.addDomElement('body', 'beforeend', '<div id="onesignal-modal-container" class="onesignal-modal-container onesignal-reset"></div>');
            // Insert the dialog
            utils_1.addDomElement(this.container, 'beforeend', dialogHtml);
            // Add click event handlers
            this.container.addEventListener('click', this.onHttpModalFinished.bind(this));
            Event_1.default.trigger(HttpModal.EVENTS.SHOWN);
        }
        catch (e) {
            log.error(e);
        }
    }
    onHttpModalFinished(e) {
        OneSignal.registerForPushNotifications({ httpPermissionRequest: true });
        Event_1.default.trigger(HttpModal.EVENTS.FINISH_CLICK);
        this.close();
    }
    close() {
        utils_1.addCssClass(this.container, 'close-modal');
        utils_1.removeDomElement('#onesignal-modal-container');
        Event_1.default.trigger(HttpModal.EVENTS.CLOSED);
    }
    get container() {
        return document.querySelector('#onesignal-modal-container');
    }
    get dialog() {
        return document.querySelector('#onesignal-modal-dialog');
    }
    get finishButton() {
        return document.querySelector('#onesignal-modal-finish-button');
    }
}
exports.default = HttpModal;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/http-modal/HttpModal.js.map

/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const SdkEnvironment_1 = __webpack_require__(2);
const BuildEnvironmentKind_1 = __webpack_require__(23);
const ProxyFrameHost_1 = __webpack_require__(68);
const utils_1 = __webpack_require__(1);
class AltOriginManager {
    constructor() {
    }
    static async discoverAltOrigin(appConfig) {
        const iframeUrls = AltOriginManager.getOneSignalProxyIframeUrls(appConfig);
        const allProxyFrameHosts = [];
        let targetProxyFrameHost;
        for (const iframeUrl of iframeUrls) {
            const proxyFrameHost = new ProxyFrameHost_1.default(iframeUrl);
            // A TimeoutError could happen here; it gets rejected out of this entire loop
            await proxyFrameHost.load();
            allProxyFrameHosts.push(proxyFrameHost);
        }
        const nonDuplicatedAltOriginSubscriptions = await AltOriginManager.removeDuplicatedAltOriginSubscription(allProxyFrameHosts);
        if (nonDuplicatedAltOriginSubscriptions) {
            targetProxyFrameHost = nonDuplicatedAltOriginSubscriptions[0];
        }
        else {
            for (const proxyFrameHost of allProxyFrameHosts) {
                if (await proxyFrameHost.isSubscribed()) {
                    // If we're subscribed, we're done searching for the iframe
                    targetProxyFrameHost = proxyFrameHost;
                }
                else {
                    if (utils_1.contains(proxyFrameHost.url.host, '.os.tc')) {
                        if (!targetProxyFrameHost) {
                            // We've already loaded .onesignal.com and they're not subscribed
                            // There's no other frames to check; the user is completely not subscribed
                            targetProxyFrameHost = proxyFrameHost;
                        }
                        else {
                            // Already subscribed to .onesignal.com; remove os.tc frame
                            proxyFrameHost.dispose();
                        }
                    }
                    else {
                        // We've just loaded .onesignal.com and they're not subscribed
                        // Load the .os.tc frame next to check
                        // Remove the .onesignal.com frame; there's no need to keep it around anymore
                        // Actually don't dispose it, so we can check for duplicate subscriptions
                        proxyFrameHost.dispose();
                        continue;
                    }
                }
            }
        }
        return targetProxyFrameHost;
    }
    static async removeDuplicatedAltOriginSubscription(proxyFrameHosts) {
        const subscribedProxyFrameHosts = [];
        for (const proxyFrameHost of proxyFrameHosts) {
            if (await proxyFrameHost.isSubscribed()) {
                subscribedProxyFrameHosts.push(proxyFrameHost);
            }
        }
        if (subscribedProxyFrameHosts.length < 2) {
            // If the user is only subscribed on one host, or not subscribed at all,
            // they don't have duplicate subscriptions
            return null;
        }
        if (SdkEnvironment_1.default.getBuildEnv() == BuildEnvironmentKind_1.BuildEnvironmentKind.Development) {
            var hostToCheck = '.localhost:3001';
        }
        else if (SdkEnvironment_1.default.getBuildEnv() == BuildEnvironmentKind_1.BuildEnvironmentKind.Production) {
            var hostToCheck = '.onesignal.com';
        }
        var oneSignalComProxyFrameHost = subscribedProxyFrameHosts.find(proxyFrameHost => utils_1.contains(proxyFrameHost.url.host, hostToCheck));
        if (!oneSignalComProxyFrameHost) {
            // They aren't subscribed to the .onesignal.com frame; shouldn't happen
            // unless we have 2 other frames in the future they can subscribe to
            return null;
        }
        else {
            await oneSignalComProxyFrameHost.unsubscribeFromPush();
            oneSignalComProxyFrameHost.dispose();
            const indexToRemove = proxyFrameHosts.indexOf(oneSignalComProxyFrameHost);
            proxyFrameHosts.splice(indexToRemove, 1);
            return proxyFrameHosts;
        }
    }
    /**
     * Returns the array of possible URL in which the push subscription and
     * IndexedDb site data will be stored.
     *
     * For native HTTPS sites not using a subdomain of our service, this is the
     * top-level URL.
     *
     * For sites using a subdomain of our service, this URL was typically
     * subdomain.onesignal.com, until we switched to subdomain.os.tc for a shorter
     * origin to fit into Mac's native notifications on Chrome 59+.
     *
     * Because a user may be subscribed to subdomain.onesignal.com or
     * subdomain.os.tc, we have to load both in certain scenarios to determine
     * which the user is subscribed to; hence, this method returns an array of
     * possible URLs.
     */
    static getCanonicalSubscriptionUrls(config, buildEnv = SdkEnvironment_1.default.getBuildEnv()) {
        let urls = [];
        if (config.httpUseOneSignalCom) {
            let legacyDomainUrl = SdkEnvironment_1.default.getOneSignalApiUrl(buildEnv);
            // Add subdomain.onesignal.com
            legacyDomainUrl.host = [config.subdomain, legacyDomainUrl.host].join('.');
            urls.push(legacyDomainUrl);
        }
        let osTcDomainUrl = SdkEnvironment_1.default.getOneSignalApiUrl(buildEnv);
        // Always add subdomain.os.tc
        osTcDomainUrl.host = [config.subdomain, 'os.tc'].join('.');
        urls.push(osTcDomainUrl);
        for (const url of urls) {
            url.pathname = '';
        }
        return urls;
    }
    /**
     * Returns the URL of the OneSignal proxy iFrame helper.
     */
    static getOneSignalProxyIframeUrls(config) {
        const urls = AltOriginManager.getCanonicalSubscriptionUrls(config);
        for (const url of urls) {
            url.pathname = 'webPushIframe';
        }
        return urls;
    }
    /**
     * Returns the URL of the OneSignal subscription popup.
     */
    static getOneSignalSubscriptionPopupUrls(config) {
        const urls = AltOriginManager.getCanonicalSubscriptionUrls(config);
        for (const url of urls) {
            url.pathname = 'subscribe';
        }
        return urls;
    }
}
exports.default = AltOriginManager;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/managers/AltOriginManager.js.map

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class AppState {
}
exports.AppState = AppState;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/AppState.js.map

/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const DynamicResourceLoader_1 = __webpack_require__(75);
class Context {
    constructor() {
        this.dynamicResourceLoader = new DynamicResourceLoader_1.DynamicResourceLoader();
    }
}
exports.default = Context;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/Context.js.map

/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Contains the SDK initialization options that configure future installations of our service worker.
 */
class ServiceWorkerConfig {
}
exports.ServiceWorkerConfig = ServiceWorkerConfig;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/ServiceWorkerConfig.js.map

/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class ServiceWorkerState {
}
exports.ServiceWorkerState = ServiceWorkerState;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/ServiceWorkerState.js.map

/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class Subscription {
}
exports.Subscription = Subscription;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/models/Subscription.js.map

/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log = __webpack_require__(0);
class CookieSyncer {
    constructor(isFeatureEnabled) {
        this.isFeatureEnabled = isFeatureEnabled;
    }
    static get SYNC_URL() {
        return 'https://rc.rlcdn.com/463096.gif?n=5';
    }
    static get DOM_ID() {
        return 'onesignal-cookie-sync';
    }
    getElement() {
        return document.getElementById(CookieSyncer.DOM_ID);
    }
    uninstall() {
        if (this.getElement()) {
            this.getElement().remove();
        }
    }
    install() {
        if (!this.isFeatureEnabled) {
            log.debug('Cookie sync feature is disabled.');
            return;
        }
        this.uninstall();
        const domElement = document.createElement('img');
        domElement.setAttribute('id', CookieSyncer.DOM_ID);
        domElement.setAttribute('border', '0');
        domElement.setAttribute('hspace', '0');
        domElement.setAttribute('vspace', '0');
        domElement.setAttribute('width', '1');
        domElement.setAttribute('height', '1');
        domElement.setAttribute('src', CookieSyncer.SYNC_URL);
        document.querySelector('body').appendChild(domElement);
        log.debug('Enabled cookie sync feature.');
    }
}
exports.default = CookieSyncer;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/CookieSyncer.js.map

/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Postmam_1 = __webpack_require__(12);
const Database_1 = __webpack_require__(7);
const Event_1 = __webpack_require__(3);
const utils_1 = __webpack_require__(1);
const objectAssign = __webpack_require__(4);
const SdkEnvironment_1 = __webpack_require__(2);
const InvalidStateError_1 = __webpack_require__(14);
const HttpHelper_1 = __webpack_require__(34);
const TestHelper_1 = __webpack_require__(18);
const InitHelper_1 = __webpack_require__(35);
const MainHelper_1 = __webpack_require__(10);
const RemoteFrame_1 = __webpack_require__(24);
const log = __webpack_require__(0);
/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
class ProxyFrame extends RemoteFrame_1.default {
    /**
     * Loads the messenger on the iFrame to communicate with the host page and
     * assigns init options to an iFrame-only initialization of OneSignal.
     *
     * Our main host page will wait for all iFrame scripts to complete since the
     * host page uses the iFrame onload event to begin sending handshake messages
     * to the iFrame.
     *
     * There is no load timeout here; the iFrame initializes it scripts and waits
     * forever for the first handshake message.
     */
    initialize() {
        const promise = super.initialize();
        Event_1.default.trigger('httpInitialize');
        return promise;
    }
    establishCrossOriginMessaging() {
        if (this.messenger) {
            this.messenger.destroy();
        }
        this.messenger = new Postmam_1.default(window, this.options.origin, this.options.origin);
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.CONNECTED, this.onMessengerConnect.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, this.onProxyFrameInitializing.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION, this.onRemoteNotificationPermission.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, this.onRemoteDatabaseGet.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, this.onRemoteDatabasePut.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, this.onRemoteDatabaseRemove.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, this.onUnsubscribeFromPush.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.SHOW_HTTP_PERMISSION_REQUEST, this.onShowHttpPermissionRequest.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.IS_SHOWING_HTTP_PERMISSION_REQUEST, this.onIsShowingHttpPermissionRequest.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.MARK_PROMPT_DISMISSED, this.onMarkPromptDismissed.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.IS_SUBSCRIBED, this.onIsSubscribed.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_PROXY_FRAME, this.onUnsubscribeProxyFrame.bind(this));
        this.messenger.listen();
    }
    retriggerRemoteEvent(eventName, eventData) {
        this.messenger.message(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, { eventName, eventData });
    }
    async onMessengerConnect(message) {
        log.debug(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) Successfully established cross-origin communication.`);
        this.finishInitialization();
        return false;
    }
    async onProxyFrameInitializing(message) {
        log.info(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) The iFrame has just received initOptions from the host page!`);
        OneSignal.config = objectAssign(message.data.hostInitOptions, OneSignal.config, {
            pageUrl: message.data.pageUrl,
            pageTitle: message.data.pageTitle
        });
        InitHelper_1.default.installNativePromptPermissionChangedHook();
        // 3/30/16: For HTTP sites, put the host page URL as default URL if one doesn't exist already
        const defaultUrl = await Database_1.default.get('Options', 'defaultUrl');
        if (!defaultUrl) {
            await Database_1.default.put('Options', { key: 'defaultUrl', value: new URL(OneSignal.config.pageUrl).origin });
        }
        /**
         * When a user is on http://example.com and receives a notification, we want to open a new window only if the
         * notification's URL is different from http://example.com. The service worker, which only controls
         * subdomain.onesignal.com, doesn't know that the host URL is http://example.com. Although defaultUrl above
         * sets the HTTP's origin, this can be modified if users call setDefaultTitle(). lastKnownHostUrl therefore
         * stores the last visited full page URL.
         */
        await Database_1.default.put('Options', { key: 'lastKnownHostUrl', value: OneSignal.config.pageUrl });
        await InitHelper_1.default.initSaveState(OneSignal.config.pageTitle);
        await InitHelper_1.default.storeInitialValues();
        await InitHelper_1.default.saveInitOptions();
        if (navigator.serviceWorker && window.location.protocol === 'https:') {
            try {
                MainHelper_1.default.establishServiceWorkerChannel();
            }
            catch (e) {
                log.error(`Error interacting with Service Worker inside an HTTP-hosted iFrame:`, e);
            }
        }
        message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    }
    async onRemoteNotificationPermission(message) {
        const permission = await OneSignal.getNotificationPermission();
        message.reply(permission);
        return false;
    }
    async onRemoteDatabaseGet(message) {
        // retrievals is an array of key-value pairs e.g. [{table: 'Ids', keys:
        // 'userId'}, {table: 'Ids', keys: 'registrationId'}]
        const retrievals = message.data;
        const retrievalOpPromises = [];
        for (let retrieval of retrievals) {
            const { table, key } = retrieval;
            retrievalOpPromises.push(Database_1.default.get(table, key));
        }
        const results = await Promise.all(retrievalOpPromises);
        message.reply(results);
        return false;
    }
    async onRemoteDatabasePut(message) {
        // insertions is an array of key-value pairs e.g. [table: {'Options': keypath: {key: persistNotification, value: '...'}}, {table: 'Ids', keypath: {type: 'userId', id: '...'}]
        // It's formatted that way because our IndexedDB database is formatted that way
        const insertions = message.data;
        let insertionOpPromises = [];
        for (let insertion of insertions) {
            let { table, keypath } = insertion;
            insertionOpPromises.push(Database_1.default.put(table, keypath));
        }
        const results = await Promise.all(insertionOpPromises);
        message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
        return false;
    }
    async onRemoteDatabaseRemove(message) {
        // removals is an array of key-value pairs e.g. [table: {'Options': keypath: {key: persistNotification, value: '...'}}, {table: 'Ids', keypath: {type: 'userId', id: '...'}]
        // It's formatted that way because our IndexedDB database is formatted that way
        const removals = message.data;
        let removalOpPromises = [];
        for (let removal of removals) {
            let { table, keypath } = removal;
            removalOpPromises.push(Database_1.default.remove(table, keypath));
        }
        const results = await Promise.all(removalOpPromises);
        message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
        return false;
    }
    async onUnsubscribeFromPush(message) {
        log.debug('(Reposted from iFrame -> Host) User unsubscribed but permission granted. Re-prompting the user for push.');
        try {
            await utils_1.unsubscribeFromPush();
            message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
        }
        catch (e) {
            log.debug('Failed to unsubscribe from push remotely:', e);
        }
    }
    async onShowHttpPermissionRequest(message) {
        log.debug(SdkEnvironment_1.default.getWindowEnv().toString() + " Calling showHttpPermissionRequest() inside the iFrame, proxied from host.");
        let options = {};
        if (message.data) {
            options = message.data;
        }
        log.debug(`${SdkEnvironment_1.default.getWindowEnv().toString()} HTTP permission request showing, message data:`, message);
        try {
            const result = await OneSignal.showHttpPermissionRequest(options);
            message.reply({ status: 'resolve', result: result });
        }
        catch (e) {
            if (e && e.reason === InvalidStateError_1.InvalidStateReason[InvalidStateError_1.InvalidStateReason.PushPermissionAlreadyGranted]) {
                // Don't do anything for this error, too common
            }
            else {
                message.reply({ status: 'reject', result: e });
            }
        }
    }
    async onIsShowingHttpPermissionRequest(message) {
        const isShowingHttpPermReq = await HttpHelper_1.default.isShowingHttpPermissionRequest();
        message.reply(isShowingHttpPermReq);
        return false;
    }
    async onMarkPromptDismissed(message) {
        log.debug('(Reposted from iFrame -> Host) Marking prompt as dismissed.');
        TestHelper_1.default.markHttpsNativePromptDismissed();
        message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
        return false;
    }
    async onIsSubscribed(message) {
        const isSubscribed = await OneSignal.isPushNotificationsEnabled();
        message.reply(isSubscribed);
        return false;
    }
    async onUnsubscribeProxyFrame(message) {
        const isSubscribed = await OneSignal.isPushNotificationsEnabled();
        if (isSubscribed) {
            /*
              Set a flag to prevent a notification from being sent from OneSignal's
              side. The subscription stored locally on the browser is live and
              messageable, but we can't query it or unsubscribe from it since we're on
              an insecure origin. The most we can do is have our SDK delete the stored
              information to pretend we're not subscribed on both the client SDK side
              and the server side.
            */
            // Set a flag remotely to prevent notifications from being sent
            await OneSignal.setSubscription(false);
            // Orphan the subscription by removing data stored about it
            // This causes our SDK to think we're no longer subscribed on this frame
            await OneSignal.database.rebuild();
        }
        message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
        return false;
    }
}
exports.default = ProxyFrame;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/frames/ProxyFrame.js.map

/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Postmam_1 = __webpack_require__(12);
const Event_1 = __webpack_require__(3);
const EventHelper_1 = __webpack_require__(13);
const utils_1 = __webpack_require__(1);
const log = __webpack_require__(0);
const Environment_1 = __webpack_require__(8);
/**
 * Manager for an instance of the OneSignal proxy frame, for use from the main
 * page (not the iFrame itself).
 *
 * This is loaded as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
class ProxyFrameHost {
    /**
     * How long to wait to load the proxy frame before timing out.
     */
    static get LOAD_TIMEOUT_MS() {
        return 15000;
    }
    /**
     *
     * @param origin The URL object describing the origin to load.
     */
    constructor(origin) {
        this.url = origin;
        this.url.pathname = 'webPushIframe';
    }
    /**
     * Creates and loads an iFrame on the DOM, replacing any existing iFrame of
     * the same URL.
     *
     * Rejects with a TimeoutError if the frame doesn't load within a specified time.
     */
    async load() {
        /*
          This class removes existing iFrames with the same URL. This prevents
          multiple iFrames to the same origin, which can cause issues with
          cross-origin messaging.
        */
        log.debug('Opening an iFrame to', this.url.toString());
        this.removeFrame();
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = this.url.toString();
        iframe.sandbox = 'allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation';
        this.loadPromise = {};
        this.loadPromise.promise = new Promise((resolve, reject) => {
            this.loadPromise.resolver = resolve;
            this.loadPromise.rejector = reject;
        });
        document.body.appendChild(iframe);
        iframe.onload = this.onFrameLoad.bind(this);
        this.element = iframe;
        // Display a timeout warning if frame doesn't load in time, but don't prevent it from loading if the network is just slow
        utils_1.timeoutPromise(this.loadPromise.promise, ProxyFrameHost.LOAD_TIMEOUT_MS).catch(e => {
            if (window === window.top) {
                log.warn(`OneSignal: Loading the required iFrame ${this.url.toString()} timed out. Check that the Site URL onesignal.com dashboard web config is ${location.origin}. Only the Site URL specified there is allowed to use load the iFrame.`);
            }
        });
        return this.loadPromise.promise;
    }
    removeFrame() {
        // Unit tests may not have access to document
        if (Environment_1.default.isBrowser()) {
            const existingInstance = document.querySelector(`iFrame[src='${this.url.toString()}'`);
            if (existingInstance) {
                existingInstance.remove();
            }
        }
    }
    onFrameLoad(e) {
        this.establishCrossOriginMessaging();
    }
    establishCrossOriginMessaging() {
        if (this.messenger) {
            // Remove all previous events; window message events should not go to any previous listeners
            this.messenger.destroy();
        }
        this.messenger = new Postmam_1.default(this.element.contentWindow, this.url.toString(), this.url.toString());
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.CONNECTED, this.onMessengerConnect.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, this.onRemoteRetriggerEvent.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, this.onRemoteNotificationPermissionChanged.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.REQUEST_HOST_URL, this.onRequestHostUrl.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.SERVICEWORKER_COMMAND_REDIRECT, this.onServiceWorkerCommandRedirect.bind(this));
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.HTTP_PERMISSION_REQUEST_RESUBSCRIBE, this.onHttpPermissionRequestResubscribe.bind(this));
        this.messenger.connect();
    }
    dispose() {
        // Removes all events
        if (this.messenger) {
            this.messenger.destroy();
        }
        this.removeFrame();
    }
    async isShowingHttpPermissionRequest() {
        return new Promise(resolve => {
            this.messenger.message(OneSignal.POSTMAM_COMMANDS.IS_SHOWING_HTTP_PERMISSION_REQUEST, null, reply => {
                resolve(reply.data);
            });
        });
    }
    async onMessengerConnect(e) {
        log.debug(`Successfully established cross-origin communication for iFrame at ${this.url.toString()}`);
        this.messenger.message(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, {
            hostInitOptions: JSON.parse(JSON.stringify(OneSignal.config)),
            pageUrl: window.location.href,
            pageTitle: document.title,
        }, reply => {
            if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                this.loadPromise.resolver();
                // This needs to be initialized so that isSubscribed() can be called to
                // determine whether the user is subscribed to Frame A or B
                //Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
            }
            return false;
        });
    }
    onRemoteRetriggerEvent(message) {
        // e.g. { eventName: 'subscriptionChange', eventData: true}
        let { eventName, eventData } = message.data;
        Event_1.default.trigger(eventName, eventData, message.source);
        return false;
    }
    onRemoteNotificationPermissionChanged(message) {
        let { forceUpdatePermission } = message.data;
        EventHelper_1.default.triggerNotificationPermissionChanged(forceUpdatePermission);
        return false;
    }
    onRequestHostUrl(message) {
        message.reply(location.href);
        return false;
    }
    onServiceWorkerCommandRedirect(message) {
        window.location.href = message.data;
        return false;
    }
    onHttpPermissionRequestResubscribe(message) {
        log.debug('(Reposted from iFrame -> Host) User unsubscribed but permission granted. Re-prompting the user for push.');
        OneSignal.showHttpPrompt({ __sdkCall: true, __useHttpPermissionRequestStyle: true }).catch(e => {
            log.debug('[Resubscribe Prompt Error]', e);
        });
        return false;
    }
    isSubscribed() {
        return new Promise((resolve, reject) => {
            this.messenger.message(OneSignal.POSTMAM_COMMANDS.IS_SUBSCRIBED, null, reply => {
                resolve(reply.data);
            });
        });
    }
    unsubscribeFromPush() {
        return new Promise((resolve, reject) => {
            this.messenger.message(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_PROXY_FRAME, null, reply => {
                resolve();
            });
        });
    }
    /**
     * Shortcut method to messenger.message().
     */
    message(...args) {
        this.messenger.message.apply(this.messenger, arguments);
    }
}
exports.default = ProxyFrameHost;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/frames/ProxyFrameHost.js.map

/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Postmam_1 = __webpack_require__(12);
const RemoteFrame_1 = __webpack_require__(24);
/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
class SubscriptionModal extends RemoteFrame_1.default {
    constructor(initOptions) {
        super(initOptions);
    }
    establishCrossOriginMessaging() {
        this.messenger = new Postmam_1.default(window.parent, this.options.origin, this.options.origin);
    }
}
exports.default = SubscriptionModal;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/frames/SubscriptionModal.js.map

/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Postmam_1 = __webpack_require__(12);
const Event_1 = __webpack_require__(3);
const Uuid_1 = __webpack_require__(19);
const SdkEnvironment_1 = __webpack_require__(2);
const MainHelper_1 = __webpack_require__(10);
const SubscriptionHelper_1 = __webpack_require__(6);
const log = __webpack_require__(0);
/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
class SubscriptionModalHost {
    constructor(initOptions, registrationOptions) {
        this.options = {
            appId: new Uuid_1.Uuid(initOptions.appId)
        };
        this.registrationOptions = registrationOptions;
    }
    /**
     * Loads the messenger on the iFrame to communicate with the host page and
     * assigns init options to an iFrame-only initialization of OneSignal.
     *
     * Our main host page will wait for all iFrame scripts to complete since the
     * host page uses the iFrame onload event to begin sending handshake messages
     * to the iFrame.
     *
     * There is no load timeout here; the iFrame initializes it scripts and waits
     * forever for the first handshake message.
     */
    async load() {
        const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
        const notificationPermission = await OneSignal.getNotificationPermission();
        this.url = SdkEnvironment_1.default.getOneSignalApiUrl();
        this.url.pathname = 'webPushModal';
        this.url.search = `${MainHelper_1.default.getPromptOptionsQueryString()}&id=${this.options.appId.value}&httpsPrompt=true&pushEnabled=${isPushEnabled}&permissionBlocked=${notificationPermission === 'denied'}&promptType=modal`;
        log.info(`Loading iFrame for HTTPS subscription modal at ${this.url.toString()}`);
        this.modal = this.createHiddenSubscriptionDomModal(this.url.toString());
        this.establishCrossOriginMessaging();
    }
    createHiddenSubscriptionDomModal(url) {
        let iframeContainer = document.createElement('div');
        iframeContainer.setAttribute('id', 'OneSignal-iframe-modal');
        iframeContainer.setAttribute('style', 'display:none !important');
        iframeContainer.innerHTML = '<div id="notif-permission" style="background: rgba(0, 0, 0, 0.7); position: fixed;' +
            ' top: 0; left: 0; right: 0; bottom: 0; z-index: 3000000000; display: flex;' +
            ' align-items: center; justify-content: center;"></div>';
        document.body.appendChild(iframeContainer);
        let iframeContainerStyle = document.createElement('style');
        iframeContainerStyle.innerHTML = `@media (max-width: 560px) { .OneSignal-permission-iframe { width: 100%; height: 100%;} }`;
        document.getElementsByTagName('head')[0].appendChild(iframeContainerStyle);
        let iframe = document.createElement("iframe");
        iframe.className = "OneSignal-permission-iframe";
        iframe.setAttribute('frameborder', '0');
        iframe.width = OneSignal._windowWidth.toString();
        iframe.height = OneSignal._windowHeight.toString();
        iframe.src = url;
        document.getElementById("notif-permission").appendChild(iframe);
        return iframe;
    }
    removeFrame() {
        const existingInstance = document.querySelector('#OneSignal-iframe-modal');
        if (existingInstance) {
            existingInstance.remove();
        }
    }
    showSubscriptionDomModal() {
        const iframeContainer = document.getElementById('OneSignal-iframe-modal');
        iframeContainer.setAttribute('style', '');
    }
    establishCrossOriginMessaging() {
        this.messenger = new Postmam_1.default(this.modal, this.url.origin, this.url.origin);
        this.messenger.startPostMessageReceive();
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.MODAL_LOADED, this.onModalLoaded.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_ACCEPTED, this.onModalAccepted.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_REJECTED, this.onModalRejected.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, this.onModalClosing.bind(this));
    }
    onModalLoaded(message) {
        this.showSubscriptionDomModal();
        Event_1.default.trigger('modalLoaded');
    }
    async onModalAccepted(message) {
        log.debug('User accepted the HTTPS modal prompt.');
        OneSignal._sessionInitAlreadyRunning = false;
        this.dispose();
        MainHelper_1.default.triggerCustomPromptClicked('granted');
        log.debug('Calling setSubscription(true)');
        await OneSignal.setSubscription(true);
        SubscriptionHelper_1.default.registerForW3CPush(this.registrationOptions);
    }
    onModalRejected(message) {
        log.debug('User rejected the HTTPS modal prompt.');
        OneSignal._sessionInitAlreadyRunning = false;
        this.dispose();
        MainHelper_1.default.triggerCustomPromptClicked('denied');
    }
    onModalClosing(message) {
        log.info('Detected modal is closing.');
        this.dispose();
    }
    dispose() {
        if (this.messenger) {
            // Removes all events
            this.messenger.destroy();
        }
        this.removeFrame();
    }
    /**
     * Shortcut method to messenger.message().
     */
    message() {
        this.messenger.message.apply(this.messenger, arguments);
    }
}
exports.default = SubscriptionModalHost;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/frames/SubscriptionModalHost.js.map

/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Postmam_1 = __webpack_require__(12);
const SdkEnvironment_1 = __webpack_require__(2);
const RemoteFrame_1 = __webpack_require__(24);
const log = __webpack_require__(0);
/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
class SubscriptionPopup extends RemoteFrame_1.default {
    constructor(initOptions) {
        super(initOptions);
    }
    /**
     * Loads the messenger on the iFrame to communicate with the host page and
     * assigns init options to an iFrame-only initialization of OneSignal.
     *
     * Our main host page will wait for all iFrame scripts to complete since the
     * host page uses the iFrame onload event to begin sending handshake messages
     * to the iFrame.
     *
     * There is no load timeout here; the iFrame initializes it scripts and waits
     * forever for the first handshake message.
     */
    // initialize() is implemented by base RemoteFrame class
    establishCrossOriginMessaging() {
        this.messenger = new Postmam_1.default(window.opener, this.options.origin, this.options.origin);
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.CONNECTED, this.onMessengerConnected.bind(this));
        // The host page will receive this event, and then call connect()
        this.messenger.postMessage(OneSignal.POSTMAM_COMMANDS.POPUP_BEGIN_MESSAGEPORT_COMMS, null);
        this.messenger.listen();
    }
    onMessengerConnected(message) {
        log.debug(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) The host page is now ready to receive commands from the HTTP popup.`);
        this.finishInitialization();
    }
}
exports.default = SubscriptionPopup;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/frames/SubscriptionPopup.js.map

/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Postmam_1 = __webpack_require__(12);
const Event_1 = __webpack_require__(3);
const EventHelper_1 = __webpack_require__(13);
const objectAssign = __webpack_require__(4);
const MainHelper_1 = __webpack_require__(10);
const SdkEnvironment_1 = __webpack_require__(2);
const log = __webpack_require__(0);
/**
 * Manager for an instance of the OneSignal proxy frame, for use from the main
 * page (not the iFrame itself).
 *
 * This is loaded as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
class SubscriptionPopupHost {
    /**
     *
     * @param origin The URL object describing the origin to load.
     */
    constructor(origin, options) {
        this.url = origin;
        this.url.pathname = 'subscribe';
        this.options = options || {
            autoAccept: false,
            httpPermissionRequest: false
        };
    }
    /**
     * Opens a new Window to subscribe the user.
     */
    load() {
        // Instead of using URL query parameters, which are confusing and unsightly,
        // post the data invisible
        let postData = objectAssign({}, MainHelper_1.default.getPromptOptionsPostHash(), {
            promptType: 'popup',
            parentHostname: encodeURIComponent(location.hostname)
        });
        if (this.options.autoAccept) {
            postData['autoAccept'] = true;
        }
        if (this.options.httpPermissionRequest) {
            postData['httpPermissionRequest'] = true;
            var overrides = {
                childWidth: 250,
                childHeight: 150,
                left: -99999999,
                top: 9999999,
            };
        }
        log.info(`Opening a popup to ${this.url.toString()} with POST data:`, postData);
        this.popupWindow = this.openWindowViaPost(this.url.toString(), postData, overrides);
        this.establishCrossOriginMessaging();
        this.loadPromise = {};
        this.loadPromise.promise = new Promise((resolve, reject) => {
            this.loadPromise.resolver = resolve;
            this.loadPromise.rejector = reject;
        });
        // This can throw a TimeoutError, which should go up the stack
        return this.loadPromise.promise;
    }
    // Arguments :
    //  verb : 'GET'|'POST'
    //  target : an optional opening target (a name, or "_blank"), defaults to "_self"
    openWindowViaPost(url, data, overrides) {
        var form = document.createElement("form");
        form.action = url;
        form.method = 'POST';
        form.target = "onesignal-http-popup";
        var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
        var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
        var thisWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        var thisHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
        var childWidth = OneSignal._windowWidth;
        var childHeight = OneSignal._windowHeight;
        var left = ((thisWidth / 2) - (childWidth / 2)) + dualScreenLeft;
        var top = ((thisHeight / 2) - (childHeight / 2)) + dualScreenTop;
        if (overrides) {
            if (overrides.childWidth) {
                childWidth = overrides.childWidth;
            }
            if (overrides.childHeight) {
                childHeight = overrides.childHeight;
            }
            if (overrides.left) {
                left = overrides.left;
            }
            if (overrides.top) {
                top = overrides.top;
            }
        }
        const windowRef = window.open('about:blank', "onesignal-http-popup", `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`);
        if (data) {
            for (var key in data) {
                var input = document.createElement("textarea");
                input.name = key;
                input.value = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
                form.appendChild(input);
            }
        }
        form.style.display = 'none';
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        return windowRef;
    }
    establishCrossOriginMessaging() {
        this.messenger = new Postmam_1.default(this.popupWindow, this.url.toString(), this.url.toString());
        this.messenger.on(OneSignal.POSTMAM_COMMANDS.POPUP_BEGIN_MESSAGEPORT_COMMS, this.onBeginMessagePortCommunications.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_LOADED, this.onPopupLoaded.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_ACCEPTED, this.onPopupAccepted.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_REJECTED, this.onPopupRejected.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, this.onPopupClosing.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.BEGIN_BROWSING_SESSION, this.onBeginBrowsingSession.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.WINDOW_TIMEOUT, this.onWindowTimeout.bind(this));
        this.messenger.once(OneSignal.POSTMAM_COMMANDS.FINISH_REMOTE_REGISTRATION, this.onFinishingRegistrationRemotely.bind(this));
        this.messenger.startPostMessageReceive();
    }
    dispose() {
        // Removes all events
        this.messenger.destroy();
    }
    async onBeginMessagePortCommunications(message) {
        log.debug(`(${SdkEnvironment_1.default.getWindowEnv().toString()}) Successfully established cross-origin messaging with the popup window.`);
        this.messenger.connect();
        return false;
    }
    async onPopupLoaded(message) {
        this.loadPromise.resolver();
        Event_1.default.trigger('popupLoad');
    }
    async onPopupAccepted(message) {
        MainHelper_1.default.triggerCustomPromptClicked('granted');
    }
    async onPopupRejected(message) {
        MainHelper_1.default.triggerCustomPromptClicked('denied');
    }
    async onPopupClosing(message) {
        log.info('Popup window is closing, running cleanup events.');
        Event_1.default.trigger(OneSignal.EVENTS.POPUP_CLOSING);
        this.dispose();
    }
    async onBeginBrowsingSession(message) {
        log.debug(SdkEnvironment_1.default.getWindowEnv().toString() + " Marking current session as a continuing browsing session.");
        MainHelper_1.default.beginTemporaryBrowserSession();
    }
    async onWindowTimeout(message) {
        log.debug(SdkEnvironment_1.default.getWindowEnv().toString() + " Popup window timed out and was closed.");
        Event_1.default.trigger(OneSignal.EVENTS.POPUP_WINDOW_TIMEOUT);
    }
    async onFinishingRegistrationRemotely(message) {
        log.debug(SdkEnvironment_1.default.getWindowEnv().toString() + " Finishing HTTP popup registration inside the iFrame, sent from popup.");
        message.reply({ progress: true });
        const appId = await MainHelper_1.default.getAppId();
        this.messenger.stopPostMessageReceive();
        await MainHelper_1.default.registerWithOneSignal(appId, message.data.subscriptionInfo);
        EventHelper_1.default.checkAndTriggerSubscriptionChanged();
    }
    /**
     * Shortcut method to messenger.message().
     */
    message() {
        this.messenger.message.apply(this.messenger, arguments);
    }
}
exports.default = SubscriptionPopupHost;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/modules/frames/SubscriptionPopupHost.js.map

/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(1);
const Event_1 = __webpack_require__(3);
const MainHelper_1 = __webpack_require__(10);
const Browser = __webpack_require__(11);
const objectAssign = __webpack_require__(4);
class Popover {
    static get EVENTS() {
        return {
            ALLOW_CLICK: 'popoverAllowClick',
            CANCEL_CLICK: 'popoverCancelClick',
            SHOWN: 'popoverShown',
            CLOSED: 'popoverClosed',
        };
    }
    constructor(options) {
        if (!options) {
            this.options = {};
        }
        else {
            this.options = objectAssign({}, options);
        }
        if (!this.options['actionMessage'] || typeof this.options['actionMessage'] !== "string")
            this.options['actionMessage'] = "We'd like to show you notifications for the latest news and updates.";
        if (!this.options['acceptButtonText'] || typeof this.options['acceptButtonText'] !== "string")
            this.options['acceptButtonText'] = "Allow";
        if (!this.options['cancelButtonText'] || typeof this.options['cancelButtonText'] !== "string")
            this.options['cancelButtonText'] = "No Thanks";
        this.options['actionMessage'] = this.options['actionMessage'].substring(0, 90);
        this.options['acceptButtonText'] = this.options['acceptButtonText'].substring(0, 15);
        this.options['cancelButtonText'] = this.options['cancelButtonText'].substring(0, 15);
        this.notificationIcons = null;
    }
    async create() {
        if (this.notificationIcons === null) {
            const icons = await MainHelper_1.default.getNotificationIcons();
            this.notificationIcons = icons;
            // Remove any existing container
            if (this.container) {
                utils_1.removeDomElement('#onesignal-popover-container');
            }
            let icon = this.getPlatformNotificationIcon();
            let defaultIcon = `data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2239.5%22%20height%3D%2240.5%22%20viewBox%3D%220%200%2079%2081%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EOneSignal-Bell%3C%2Ftitle%3E%3Cg%20fill%3D%22%23BBB%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M39.96%2067.12H4.12s-3.2-.32-3.2-3.36%202.72-3.2%202.72-3.2%2010.72-5.12%2010.72-8.8c0-3.68-1.76-6.24-1.76-21.28%200-15.04%209.6-26.56%2021.12-26.56%200%200%201.6-3.84%206.24-3.84%204.48%200%206.08%203.84%206.08%203.84%2011.52%200%2021.12%2011.52%2021.12%2026.56s-1.6%2017.6-1.6%2021.28c0%203.68%2010.72%208.8%2010.72%208.8s2.72.16%202.72%203.2c0%202.88-3.36%203.36-3.36%203.36H39.96zM27%2070.8h24s-1.655%2010.08-11.917%2010.08S27%2070.8%2027%2070.8z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E`;
            let dialogHtml = `<div id="normal-popover"><div class="popover-body"><div class="popover-body-icon ${icon === 'default-icon' ? 'default-icon' : ''}" style="background-image: url('${icon === 'default-icon' ? defaultIcon : icon}');"></div><div class="popover-body-message">${this.options['actionMessage']}</div><div class="clearfix"></div></div><div class="popover-footer"><button id="onesignal-popover-allow-button" class="align-right primary popover-button">${this.options['acceptButtonText']}</button><button id="onesignal-popover-cancel-button" class="align-right secondary popover-button">${this.options['cancelButtonText']}</button><div class="clearfix"></div></div></div>`;
            // Insert the container
            utils_1.addDomElement('body', 'beforeend', '<div id="onesignal-popover-container" class="onesignal-popover-container onesignal-reset"></div>');
            // Insert the dialog
            utils_1.addDomElement(this.container, 'beforeend', `<div id="onesignal-popover-dialog" class="onesignal-popover-dialog">${dialogHtml}</div>`);
            // Animate it in depending on environment
            utils_1.addCssClass(this.container, Browser.mobile ? 'slide-up' : 'slide-down');
            // Add click event handlers
            this.allowButton.addEventListener('click', this.onPopoverAllowed.bind(this));
            this.cancelButton.addEventListener('click', this.onPopoverCanceled.bind(this));
            Event_1.default.trigger(Popover.EVENTS.SHOWN);
        }
    }
    onPopoverAllowed(e) {
        Event_1.default.trigger(Popover.EVENTS.ALLOW_CLICK);
    }
    onPopoverCanceled(e) {
        Event_1.default.trigger(Popover.EVENTS.CANCEL_CLICK);
        this.close();
    }
    close() {
        utils_1.addCssClass(this.container, 'close-popover');
        utils_1.once(this.dialog, 'animationend', (event, destroyListenerFn) => {
            if (event.target === this.dialog &&
                (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
                // Uninstall the event listener for animationend
                utils_1.removeDomElement('#onesignal-popover-container');
                destroyListenerFn();
                Event_1.default.trigger(Popover.EVENTS.CLOSED);
            }
        }, true);
    }
    getPlatformNotificationIcon() {
        if (this.notificationIcons) {
            if (Browser.chrome || Browser.firefox) {
                if (this.notificationIcons.chrome) {
                    return this.notificationIcons.chrome;
                }
                else if (this.notificationIcons.firefox) {
                    return this.notificationIcons.firefox;
                }
                else {
                    return 'default-icon';
                }
            }
            else if (Browser.safari) {
                if (this.notificationIcons.safari) {
                    return this.notificationIcons.safari;
                }
                else if (this.notificationIcons.chrome) {
                    return this.notificationIcons.chrome;
                }
                else {
                    return 'default-icon';
                }
            }
        }
        else
            return 'default-icon';
    }
    get container() {
        return document.querySelector('#onesignal-popover-container');
    }
    get dialog() {
        return document.querySelector('#onesignal-popover-dialog');
    }
    get allowButton() {
        return document.querySelector('#onesignal-popover-allow-button');
    }
    get cancelButton() {
        return document.querySelector('#onesignal-popover-cancel-button');
    }
}
exports.default = Popover;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/popover/Popover.js.map

/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var sjcl = null;
sjcl = {
    /**
     * Symmetric ciphers.
     * @namespace
     */
    cipher: {},
    /**
     * Hash functions.  Right now only SHA256 is implemented.
     * @namespace
     */
    hash: {},
    /**
     * Key exchange functions.  Right now only SRP is implemented.
     * @namespace
     */
    keyexchange: {},
    /**
     * Cipher modes of operation.
     * @namespace
     */
    mode: {},
    /**
     * Miscellaneous.  HMAC and PBKDF2.
     * @namespace
     */
    misc: {},
    /**
     * Bit array encoders and decoders.
     * @namespace
     *
     * @description
     * The members of this namespace are functions which translate between
     * SJCL's bitArrays and other objects (usually strings).  Because it
     * isn't always clear which direction is encoding and which is decoding,
     * the method names are "fromBits" and "toBits".
     */
    codec: {},
    /**
     * Exceptions.
     * @namespace
     */
    exception: {
        /**
         * Ciphertext is corrupt.
         * @constructor
         */
        corrupt: function (message) {
            this.toString = function () { return "CORRUPT: " + this.message; };
            this.message = message;
        },
        /**
         * Invalid parameter.
         * @constructor
         */
        invalid: function (message) {
            this.toString = function () { return "INVALID: " + this.message; };
            this.message = message;
        },
        /**
         * Bug or missing feature in SJCL.
         * @constructor
         */
        bug: function (message) {
            this.toString = function () { return "BUG: " + this.message; };
            this.message = message;
        },
        /**
         * Something isn't ready.
         * @constructor
         */
        notReady: function (message) {
            this.toString = function () { return "NOT READY: " + this.message; };
            this.message = message;
        }
    }
};
/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
/**
 * Arrays of bits, encoded as arrays of Numbers.
 * @namespace
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */
sjcl.bitArray = {
    /**
     * Array slices in units of bits.
     * @param {bitArray} a The array to slice.
     * @param {Number} bstart The offset to the start of the slice, in bits.
     * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
     * slice until the end of the array.
     * @return {bitArray} The requested slice.
     */
    bitSlice: function (a, bstart, bend) {
        a = sjcl.bitArray._shiftRight(a.slice(bstart / 32), 32 - (bstart & 31)).slice(1);
        return (bend === undefined) ? a : sjcl.bitArray.clamp(a, bend - bstart);
    },
    /**
     * Extract a number packed into a bit array.
     * @param {bitArray} a The array to slice.
     * @param {Number} bstart The offset to the start of the slice, in bits.
     * @param {Number} blength The length of the number to extract.
     * @return {Number} The requested slice.
     */
    extract: function (a, bstart, blength) {
        // FIXME: this Math.floor is not necessary at all, but for some reason
        // seems to suppress a bug in the Chromium JIT.
        var x, sh = Math.floor((-bstart - blength) & 31);
        if ((bstart + blength - 1 ^ bstart) & -32) {
            // it crosses a boundary
            x = (a[bstart / 32 | 0] << (32 - sh)) ^ (a[bstart / 32 + 1 | 0] >>> sh);
        }
        else {
            // within a single word
            x = a[bstart / 32 | 0] >>> sh;
        }
        return x & ((1 << blength) - 1);
    },
    /**
     * Concatenate two bit arrays.
     * @param {bitArray} a1 The first array.
     * @param {bitArray} a2 The second array.
     * @return {bitArray} The concatenation of a1 and a2.
     */
    concat: function (a1, a2) {
        if (a1.length === 0 || a2.length === 0) {
            return a1.concat(a2);
        }
        var last = a1[a1.length - 1], shift = sjcl.bitArray.getPartial(last);
        if (shift === 32) {
            return a1.concat(a2);
        }
        else {
            return sjcl.bitArray._shiftRight(a2, shift, last | 0, a1.slice(0, a1.length - 1));
        }
    },
    /**
     * Find the length of an array of bits.
     * @param {bitArray} a The array.
     * @return {Number} The length of a, in bits.
     */
    bitLength: function (a) {
        var l = a.length, x;
        if (l === 0) {
            return 0;
        }
        x = a[l - 1];
        return (l - 1) * 32 + sjcl.bitArray.getPartial(x);
    },
    /**
     * Truncate an array.
     * @param {bitArray} a The array.
     * @param {Number} len The length to truncate to, in bits.
     * @return {bitArray} A new array, truncated to len bits.
     */
    clamp: function (a, len) {
        if (a.length * 32 < len) {
            return a;
        }
        a = a.slice(0, Math.ceil(len / 32));
        var l = a.length;
        len = len & 31;
        if (l > 0 && len) {
            a[l - 1] = sjcl.bitArray.partial(len, a[l - 1] & 0x80000000 >> (len - 1), 1);
        }
        return a;
    },
    /**
     * Make a partial word for a bit array.
     * @param {Number} len The number of bits in the word.
     * @param {Number} x The bits.
     * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
     * @return {Number} The partial word.
     */
    partial: function (len, x, _end) {
        if (len === 32) {
            return x;
        }
        return (_end ? x | 0 : x << (32 - len)) + len * 0x10000000000;
    },
    /**
     * Get the number of bits used by a partial word.
     * @param {Number} x The partial word.
     * @return {Number} The number of bits used by the partial word.
     */
    getPartial: function (x) {
        return Math.round(x / 0x10000000000) || 32;
    },
    /**
     * Compare two arrays for equality in a predictable amount of time.
     * @param {bitArray} a The first array.
     * @param {bitArray} b The second array.
     * @return {boolean} true if a == b; false otherwise.
     */
    equal: function (a, b) {
        if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
            return false;
        }
        var x = 0, i;
        for (i = 0; i < a.length; i++) {
            x |= a[i] ^ b[i];
        }
        return (x === 0);
    },
    /** Shift an array right.
     * @param {bitArray} a The array to shift.
     * @param {Number} shift The number of bits to shift.
     * @param {Number} [carry=0] A byte to carry in
     * @param {bitArray} [out=[]] An array to prepend to the output.
     * @private
     */
    _shiftRight: function (a, shift, carry, out) {
        var i, last2 = 0, shift2;
        if (out === undefined) {
            out = [];
        }
        for (; shift >= 32; shift -= 32) {
            out.push(carry);
            carry = 0;
        }
        if (shift === 0) {
            return out.concat(a);
        }
        for (i = 0; i < a.length; i++) {
            out.push(carry | a[i] >>> shift);
            carry = a[i] << (32 - shift);
        }
        last2 = a.length ? a[a.length - 1] : 0;
        shift2 = sjcl.bitArray.getPartial(last2);
        out.push(sjcl.bitArray.partial(shift + shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(), 1));
        return out;
    },
    /** xor a block of 4 words together.
     * @private
     */
    _xor4: function (x, y) {
        return [x[0] ^ y[0], x[1] ^ y[1], x[2] ^ y[2], x[3] ^ y[3]];
    },
    /** byteswap a word array inplace.
     * (does not handle partial words)
     * @param {sjcl.bitArray} a word array
     * @return {sjcl.bitArray} byteswapped array
     */
    byteswapM: function (a) {
        var i, v, m = 0xff00;
        for (i = 0; i < a.length; ++i) {
            v = a[i];
            a[i] = (v >>> 24) | ((v >>> 8) & m) | ((v & m) << 8) | (v << 24);
        }
        return a;
    }
};
/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
/**
 * UTF-8 strings
 * @namespace
 */
sjcl.codec.utf8String = {
    /** Convert from a bitArray to a UTF-8 string. */
    fromBits: function (arr) {
        var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
        for (i = 0; i < bl / 8; i++) {
            if ((i & 3) === 0) {
                tmp = arr[i / 4];
            }
            out += String.fromCharCode(tmp >>> 24);
            tmp <<= 8;
        }
        return decodeURIComponent(window.escape(out));
    },
    /** Convert from a UTF-8 string to a bitArray. */
    toBits: function (str) {
        str = window.unescape(encodeURIComponent(str));
        var out = [], i, tmp = 0;
        for (i = 0; i < str.length; i++) {
            tmp = tmp << 8 | str.charCodeAt(i);
            if ((i & 3) === 3) {
                out.push(tmp);
                tmp = 0;
            }
        }
        if (i & 3) {
            out.push(sjcl.bitArray.partial(8 * (i & 3), tmp));
        }
        return out;
    }
};
/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
/**
 * Hexadecimal
 * @namespace
 */
sjcl.codec.hex = {
    /** Convert from a bitArray to a hex string. */
    fromBits: function (arr) {
        var out = "", i;
        for (i = 0; i < arr.length; i++) {
            out += ((arr[i] | 0) + 0xF00000000000).toString(16).substr(4);
        }
        return out.substr(0, sjcl.bitArray.bitLength(arr) / 4); //.replace(/(.{8})/g, "$1 ");
    },
    /** Convert from a hex string to a bitArray. */
    toBits: function (str) {
        var i, out = [], len;
        str = str.replace(/\s|0x/g, "");
        len = str.length;
        str = str + "00000000";
        for (i = 0; i < str.length; i += 8) {
            out.push(parseInt(str.substr(i, 8), 16) ^ 0);
        }
        return sjcl.bitArray.clamp(out, len * 4);
    }
};
/** @fileOverview Javascript MD5 implementation.
 *
 * Based on the implementation in RFC 1321, and on the SJCL
 * SHA-1 implementation.
 *
 * @author Brandon Smith
 */
/**
 * Context for a MD5 operation in progress.
 * @constructor
 * @class MD5, 128 bits.
 */
sjcl.hash.md5 = function (hash) {
    if (!this._T[0]) {
        this._precompute();
    }
    if (hash) {
        this._h = hash._h.slice(0);
        this._buffer = hash._buffer.slice(0);
        this._length = hash._length;
    }
    else {
        this.reset();
    }
};
/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 5 big-endian words.
 */
sjcl.hash.md5.hash = function (data) {
    return (new sjcl.hash.md5()).update(data).finalize();
};
sjcl.hash.md5.prototype = {
    /**
     * The hash's block size, in bits.
     * @constant
     */
    blockSize: 512,
    /**
     * Reset the hash state.
     * @return this
     */
    reset: function () {
        this._h = this._init.slice(0);
        this._buffer = [];
        this._length = 0;
        return this;
    },
    /**
     * Input several words to the hash.
     * @param {bitArray|String} data the data to hash.
     * @return this
     */
    update: function (data) {
        if (typeof data === "string") {
            data = sjcl.codec.utf8String.toBits(data);
        }
        var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data), ol = this._length, nl = this._length = ol + sjcl.bitArray.bitLength(data);
        for (i = this.blockSize + ol & -this.blockSize; i <= nl; i += this.blockSize) {
            this._block(b.splice(0, 16), true);
        }
        return this;
    },
    /**
     * Complete hashing and output the hash value.
     * @return {bitArray} The hash value, an array of 4 big-endian words.
     */
    finalize: function () {
        var i, b = this._buffer, h = this._h;
        // Round out and push the buffer
        b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1, 1)]);
        // Round out the buffer to a multiple of 16 words, less the 2 length words.
        for (i = b.length + 2; i & 15; i++) {
            b.push(0);
        }
        // append the length
        b.push(this._length | 0);
        b.push((this._length / 0x100000000) | 0);
        while (b.length) {
            // b.length is passed to avoid swapping and reswapping length bytes
            this._block(b.splice(0, 16), b.length);
        }
        this.reset();
        this._BS(h, 4);
        return h;
    },
    /**
     * The MD5 initialization vector.
     * @private
     */
    _init: [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476],
    /**
     * Byte swap
     * @private
     */
    _BS: function (w, n) {
        var i, x;
        for (i = 0; i < n; i++) {
            x = w[i];
            w[i] = (x >>> 24) | (x >> 8 & 0xff00) | ((x & 0xff00) << 8) | ((x & 0xff) << 24);
        }
    },
    /* Will be precomputed */
    _T: [],
    /*
     * 0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
     * 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
     * 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
     * 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
     * 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
     * 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
     * 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
     * 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
     * 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
     * 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
     * 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
     * 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
     * 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
     * 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
     * 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
     * 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
     * @private
     */
    _precompute: function () {
        var i;
        for (i = 0; i < 64; i++) {
            this._T[i] = ((0xffffffff + 1) * Math.abs(Math.sin(i + 1))) | 0;
        }
    },
    /**
     * Perform one cycle of MD5.
     * @param {bitArray} words one block of words.
     * @private
     */
    _block: function (words, notlast) {
        var i, a, b, c, d, w = words.slice(0), h = this._h, T = this._T;
        a = h[0];
        b = h[1];
        c = h[2];
        d = h[3];
        this._BS(w, notlast ? 16 : 14);
        for (i = 0; i < 64; i++) {
            var f, x, s, t;
            if (i < 32) {
                if (i < 16) {
                    f = (b & c) | ((~b) & d);
                    x = i;
                    s = [7, 12, 17, 22];
                }
                else {
                    f = (d & b) | ((~d) & c);
                    x = (5 * i + 1) % 16;
                    s = [5, 9, 14, 20];
                }
            }
            else {
                if (i < 48) {
                    f = b ^ c ^ d;
                    x = (3 * i + 5) % 16;
                    s = [4, 11, 16, 23];
                }
                else {
                    f = c ^ (b | (~d));
                    x = (7 * i) % 16;
                    s = [6, 10, 15, 21];
                }
            }
            t = a + f + w[x] + T[i];
            a = d;
            d = c;
            c = b;
            b = (((t << s[i % 4]) | (t >>> 32 - s[i % 4])) + b) | 0;
        }
        h[0] += a;
        h[1] += b;
        h[2] += c;
        h[3] += d;
    }
};
/** @fileOverview Javascript SHA-256 implementation.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * Special thanks to Aldo Cortesi for pointing out several bugs in
 * this code.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
/**
 * Context for a SHA-256 operation in progress.
 * @constructor
 */
sjcl.hash.sha256 = function (hash) {
    if (!this._key[0]) {
        this._precompute();
    }
    if (hash) {
        this._h = hash._h.slice(0);
        this._buffer = hash._buffer.slice(0);
        this._length = hash._length;
    }
    else {
        this.reset();
    }
};
/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 16 big-endian words.
 */
sjcl.hash.sha256.hash = function (data) {
    return (new sjcl.hash.sha256()).update(data).finalize();
};
sjcl.hash.sha256.prototype = {
    /**
     * The hash's block size, in bits.
     * @constant
     */
    blockSize: 512,
    /**
     * Reset the hash state.
     * @return this
     */
    reset: function () {
        this._h = this._init.slice(0);
        this._buffer = [];
        this._length = 0;
        return this;
    },
    /**
     * Input several words to the hash.
     * @param {bitArray|String} data the data to hash.
     * @return this
     */
    update: function (data) {
        if (typeof data === "string") {
            data = sjcl.codec.utf8String.toBits(data);
        }
        var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data), ol = this._length, nl = this._length = ol + sjcl.bitArray.bitLength(data);
        if (nl > 9007199254740991) {
            throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");
        }
        if (typeof Uint32Array !== 'undefined') {
            var c = new Uint32Array(b);
            var j = 0;
            for (i = 512 + ol - ((512 + ol) & 511); i <= nl; i += 512) {
                this._block(c.subarray(16 * j, 16 * (j + 1)));
                j += 1;
            }
            b.splice(0, 16 * j);
        }
        else {
            for (i = 512 + ol - ((512 + ol) & 511); i <= nl; i += 512) {
                this._block(b.splice(0, 16));
            }
        }
        return this;
    },
    /**
     * Complete hashing and output the hash value.
     * @return {bitArray} The hash value, an array of 8 big-endian words.
     */
    finalize: function () {
        var i, b = this._buffer, h = this._h;
        // Round out and push the buffer
        b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1, 1)]);
        // Round out the buffer to a multiple of 16 words, less the 2 length words.
        for (i = b.length + 2; i & 15; i++) {
            b.push(0);
        }
        // append the length
        b.push(Math.floor(this._length / 0x100000000));
        b.push(this._length | 0);
        while (b.length) {
            this._block(b.splice(0, 16));
        }
        this.reset();
        return h;
    },
    /**
     * The SHA-256 initialization vector, to be precomputed.
     * @private
     */
    _init: [],
    /*
    _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
    */
    /**
     * The SHA-256 hash key, to be precomputed.
     * @private
     */
    _key: [],
    /*
    _key:
      [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
       0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
       0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
       0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
       0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
       0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
       0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
       0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
    */
    /**
     * Function to precompute _init and _key.
     * @private
     */
    _precompute: function () {
        var i = 0, prime = 2, factor, isPrime;
        function frac(x) { return (x - Math.floor(x)) * 0x100000000 | 0; }
        for (; i < 64; prime++) {
            isPrime = true;
            for (factor = 2; factor * factor <= prime; factor++) {
                if (prime % factor === 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                if (i < 8) {
                    this._init[i] = frac(Math.pow(prime, 1 / 2));
                }
                this._key[i] = frac(Math.pow(prime, 1 / 3));
                i++;
            }
        }
    },
    /**
     * Perform one cycle of SHA-256.
     * @param {Uint32Array|bitArray} w one block of words.
     * @private
     */
    _block: function (w) {
        var i, tmp, a, b, h = this._h, k = this._key, h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3], h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];
        /* Rationale for placement of |0 :
         * If a value can overflow is original 32 bits by a factor of more than a few
         * million (2^23 ish), there is a possibility that it might overflow the
         * 53-bit mantissa and lose precision.
         *
         * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
         * propagates around the loop, and on the hash state h[].  I don't believe
         * that the clamps on h4 and on h0 are strictly necessary, but it's close
         * (for h4 anyway), and better safe than sorry.
         *
         * The clamps on h[] are necessary for the output to be correct even in the
         * common case and for short inputs.
         */
        for (i = 0; i < 64; i++) {
            // load up the input word for this round
            if (i < 16) {
                tmp = w[i];
            }
            else {
                a = w[(i + 1) & 15];
                b = w[(i + 14) & 15];
                tmp = w[i & 15] = ((a >>> 7 ^ a >>> 18 ^ a >>> 3 ^ a << 25 ^ a << 14) +
                    (b >>> 17 ^ b >>> 19 ^ b >>> 10 ^ b << 15 ^ b << 13) +
                    w[i & 15] + w[(i + 9) & 15]) | 0;
            }
            tmp = (tmp + h7 + (h4 >>> 6 ^ h4 >>> 11 ^ h4 >>> 25 ^ h4 << 26 ^ h4 << 21 ^ h4 << 7) + (h6 ^ h4 & (h5 ^ h6)) + k[i]); // | 0;
            // shift register
            h7 = h6;
            h6 = h5;
            h5 = h4;
            h4 = h3 + tmp | 0;
            h3 = h2;
            h2 = h1;
            h1 = h0;
            h0 = (tmp + ((h1 & h2) ^ (h3 & (h1 ^ h2))) + (h1 >>> 2 ^ h1 >>> 13 ^ h1 >>> 22 ^ h1 << 30 ^ h1 << 19 ^ h1 << 10)) | 0;
        }
        h[0] = h[0] + h0 | 0;
        h[1] = h[1] + h1 | 0;
        h[2] = h[2] + h2 | 0;
        h[3] = h[3] + h3 | 0;
        h[4] = h[4] + h4 | 0;
        h[5] = h[5] + h5 | 0;
        h[6] = h[6] + h6 | 0;
        h[7] = h[7] + h7 | 0;
    }
};
/** @fileOverview Javascript SHA-1 implementation.
 *
 * Based on the implementation in RFC 3174, method 1, and on the SJCL
 * SHA-256 implementation.
 *
 * @author Quinn Slack
 */
/**
 * Context for a SHA-1 operation in progress.
 * @constructor
 */
sjcl.hash.sha1 = function (hash) {
    if (hash) {
        this._h = hash._h.slice(0);
        this._buffer = hash._buffer.slice(0);
        this._length = hash._length;
    }
    else {
        this.reset();
    }
};
/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 5 big-endian words.
 */
sjcl.hash.sha1.hash = function (data) {
    return (new sjcl.hash.sha1()).update(data).finalize();
};
sjcl.hash.sha1.prototype = {
    /**
     * The hash's block size, in bits.
     * @constant
     */
    blockSize: 512,
    /**
     * Reset the hash state.
     * @return this
     */
    reset: function () {
        this._h = this._init.slice(0);
        this._buffer = [];
        this._length = 0;
        return this;
    },
    /**
     * Input several words to the hash.
     * @param {bitArray|String} data the data to hash.
     * @return this
     */
    update: function (data) {
        if (typeof data === "string") {
            data = sjcl.codec.utf8String.toBits(data);
        }
        var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data), ol = this._length, nl = this._length = ol + sjcl.bitArray.bitLength(data);
        if (nl > 9007199254740991) {
            throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");
        }
        if (typeof Uint32Array !== 'undefined') {
            var c = new Uint32Array(b);
            var j = 0;
            for (i = this.blockSize + ol - ((this.blockSize + ol) & (this.blockSize - 1)); i <= nl; i += this.blockSize) {
                this._block(c.subarray(16 * j, 16 * (j + 1)));
                j += 1;
            }
            b.splice(0, 16 * j);
        }
        else {
            for (i = this.blockSize + ol - ((this.blockSize + ol) & (this.blockSize - 1)); i <= nl; i += this.blockSize) {
                this._block(b.splice(0, 16));
            }
        }
        return this;
    },
    /**
     * Complete hashing and output the hash value.
     * @return {bitArray} The hash value, an array of 5 big-endian words. TODO
     */
    finalize: function () {
        var i, b = this._buffer, h = this._h;
        // Round out and push the buffer
        b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1, 1)]);
        // Round out the buffer to a multiple of 16 words, less the 2 length words.
        for (i = b.length + 2; i & 15; i++) {
            b.push(0);
        }
        // append the length
        b.push(Math.floor(this._length / 0x100000000));
        b.push(this._length | 0);
        while (b.length) {
            this._block(b.splice(0, 16));
        }
        this.reset();
        return h;
    },
    /**
     * The SHA-1 initialization vector.
     * @private
     */
    _init: [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0],
    /**
     * The SHA-1 hash key.
     * @private
     */
    _key: [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6],
    /**
     * The SHA-1 logical functions f(0), f(1), ..., f(79).
     * @private
     */
    _f: function (t, b, c, d) {
        if (t <= 19) {
            return (b & c) | (~b & d);
        }
        else if (t <= 39) {
            return b ^ c ^ d;
        }
        else if (t <= 59) {
            return (b & c) | (b & d) | (c & d);
        }
        else if (t <= 79) {
            return b ^ c ^ d;
        }
    },
    /**
     * Circular left-shift operator.
     * @private
     */
    _S: function (n, x) {
        return (x << n) | (x >>> 32 - n);
    },
    /**
     * Perform one cycle of SHA-1.
     * @param {Uint32Array|bitArray} words one block of words.
     * @private
     */
    _block: function (words) {
        var t, tmp, a, b, c, d, e, h = this._h;
        var w;
        if (typeof Uint32Array !== 'undefined') {
            // When words is passed to _block, it has 16 elements. SHA1 _block
            // function extends words with new elements (at the end there are 80 elements).
            // The problem is that if we use Uint32Array instead of Array,
            // the length of Uint32Array cannot be changed. Thus, we replace words with a
            // normal Array here.
            w = Array(80); // do not use Uint32Array here as the instantiation is slower
            for (var j = 0; j < 16; j++) {
                w[j] = words[j];
            }
        }
        else {
            w = words;
        }
        a = h[0];
        b = h[1];
        c = h[2];
        d = h[3];
        e = h[4];
        for (t = 0; t <= 79; t++) {
            if (t >= 16) {
                w[t] = this._S(1, w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]);
            }
            tmp = (this._S(5, a) + this._f(t, b, c, d) + e + w[t] +
                this._key[Math.floor(t / 20)]) | 0;
            e = d;
            d = c;
            c = this._S(30, b);
            b = a;
            a = tmp;
        }
        h[0] = (h[0] + a) | 0;
        h[1] = (h[1] + b) | 0;
        h[2] = (h[2] + c) | 0;
        h[3] = (h[3] + d) | 0;
        h[4] = (h[4] + e) | 0;
    }
};
class Crypto {
    static md5(text) {
        return sjcl.codec.hex.fromBits(sjcl.hash.md5.hash(text));
    }
    static sha1(text) {
        return sjcl.codec.hex.fromBits(sjcl.hash.sha1.hash(text));
    }
    static sha256(text) {
        return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(text));
    }
}
exports.default = Crypto;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/services/Crypto.js.map

/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const objectAssign = __webpack_require__(4);
class DynamicResourceLoader {
    constructor() {
        this.cache = {};
    }
    getCache() {
        // Cache is private; return a cloned copy just for testing
        return objectAssign({}, this.cache);
    }
    async loadSdkStylesheet() {
        return await this.loadIfNew(0 /* Stylesheet */, new URL('https://cdn.onesignal.com/sdks/OneSignalSDKStyles.css'));
    }
    async loadFetchPolyfill() {
        return await this.loadIfNew(1 /* Script */, new URL('https://cdnjs.cloudflare.com/ajax/libs/fetch/2.0.3/fetch.min.js'));
    }
    /**
     * Attempts to load a resource by adding it to the document's <head>.
     * Caches any previous load attempt's result and does not retry loading a previous resource.
     */
    async loadIfNew(type, url) {
        // Load for first time
        if (!this.cache[url.toString()]) {
            this.cache[url.toString()] = DynamicResourceLoader.load(type, url);
        }
        // Resource is loading; multiple calls can be made to this while the same resource is loading
        // Waiting on the Promise is what we want here
        return await this.cache[url.toString()];
    }
    /**
     * Attempts to load a resource by adding it to the document's <head>.
     * Each call creates a new DOM element and fetch attempt.
     */
    static async load(type, url) {
        try {
            await new Promise((resolve, reject) => {
                switch (type) {
                    case 1 /* Script */:
                        var domElement = document.createElement('script');
                        domElement.setAttribute('type', 'text/javascript');
                        domElement.setAttribute('async', 'async');
                        domElement.setAttribute('src', url.toString());
                        break;
                    case 0 /* Stylesheet */:
                        var domElement = document.createElement('link');
                        domElement.setAttribute('rel', 'stylesheet');
                        domElement.setAttribute('href', url.toString());
                        break;
                }
                domElement.onerror = reject;
                domElement.onload = resolve;
                document.querySelector('head').appendChild(domElement);
            });
            return 0 /* Loaded */;
        }
        catch (e) {
            return 1 /* Failed */;
        }
    }
}
exports.DynamicResourceLoader = DynamicResourceLoader;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/services/DynamicResourceLoader.js.map

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class ValidatorUtils {
    static isValidUrl(url, options) {
        if (options && options.allowNull && url === null)
            return true;
        else if (options && options.allowEmpty && (url === null || url === undefined))
            return true;
        else {
            try {
                const parsedUrl = new URL(url);
                if (options && options.requireHttps) {
                    return parsedUrl.protocol === 'https:';
                }
                else
                    return true;
            }
            catch (e) {
                return false;
            }
        }
    }
    static isValidBoolean(bool, options) {
        if (options && options.allowNull && bool === null)
            return true;
        else
            return bool === true || bool === false;
    }
    static isValidArray(array, options) {
        if (options && options.allowNull && array === null)
            return true;
        else if (options && options.allowEmpty && (array === null || array === undefined))
            return true;
        else
            return array instanceof Array;
    }
}
exports.ValidatorUtils = ValidatorUtils;
//# sourceMappingURL=/Users/jpang/code/OneSignal-Website-SDK/build/javascript/src/utils/ValidatorUtils.js.map

/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var ticky = __webpack_require__(88);

module.exports = function debounce (fn, args, ctx) {
  if (!fn) { return; }
  ticky(function run () {
    fn.apply(ctx || null, args || []);
  });
};


/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {


/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = __webpack_require__(79);
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}


/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = __webpack_require__(83);

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}


/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _extendableBuiltin(cls) {
  function ExtendableBuiltin() {
    cls.apply(this, arguments);
  }

  ExtendableBuiltin.prototype = Object.create(cls.prototype, {
    constructor: {
      value: cls,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(ExtendableBuiltin, cls);
  } else {
    ExtendableBuiltin.__proto__ = cls;
  }

  return ExtendableBuiltin;
}

var ExtendableError = function (_extendableBuiltin2) {
  _inherits(ExtendableError, _extendableBuiltin2);

  function ExtendableError() {
    var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    _classCallCheck(this, ExtendableError);

    // extending Error is weird and does not propagate `message`
    var _this = _possibleConstructorReturn(this, (ExtendableError.__proto__ || Object.getPrototypeOf(ExtendableError)).call(this, message));

    Object.defineProperty(_this, 'message', {
      configurable: true,
      enumerable: false,
      value: message,
      writable: true
    });

    Object.defineProperty(_this, 'name', {
      configurable: true,
      enumerable: false,
      value: _this.constructor.name,
      writable: true
    });

    if (Error.hasOwnProperty('captureStackTrace')) {
      Error.captureStackTrace(_this, _this.constructor);
      return _possibleConstructorReturn(_this);
    }

    Object.defineProperty(_this, 'stack', {
      configurable: true,
      enumerable: false,
      value: new Error(message).stack,
      writable: true
    });
    return _this;
  }

  return ExtendableError;
}(_extendableBuiltin(Error));

exports.default = ExtendableError;
module.exports = exports['default'];


/***/ }),
/* 81 */,
/* 82 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Module dependencies
 */

var debug = __webpack_require__(78)('jsonp');

/**
 * Module exports.
 */

module.exports = jsonp;

/**
 * Callback index.
 */

var count = 0;

/**
 * Noop function.
 */

function noop(){}

/**
 * JSONP handler
 *
 * Options:
 *  - param {String} qs parameter (`callback`)
 *  - prefix {String} qs parameter (`__jp`)
 *  - name {String} qs parameter (`prefix` + incr)
 *  - timeout {Number} how long after a timeout error is emitted (`60000`)
 *
 * @param {String} url
 * @param {Object|Function} optional options / callback
 * @param {Function} optional callback
 */

function jsonp(url, opts, fn){
  if ('function' == typeof opts) {
    fn = opts;
    opts = {};
  }
  if (!opts) opts = {};

  var prefix = opts.prefix || '__jp';

  // use the callback name that was passed if one was provided.
  // otherwise generate a unique name by incrementing our counter.
  var id = opts.name || (prefix + (count++));

  var param = opts.param || 'callback';
  var timeout = null != opts.timeout ? opts.timeout : 60000;
  var enc = encodeURIComponent;
  var target = document.getElementsByTagName('script')[0] || document.head;
  var script;
  var timer;


  if (timeout) {
    timer = setTimeout(function(){
      cleanup();
      if (fn) fn(new Error('Timeout'));
    }, timeout);
  }

  function cleanup(){
    if (script.parentNode) script.parentNode.removeChild(script);
    window[id] = noop;
    if (timer) clearTimeout(timer);
  }

  function cancel(){
    if (window[id]) {
      cleanup();
    }
  }

  window[id] = function(data){
    debug('jsonp got', data);
    cleanup();
    if (fn) fn(null, data);
  };

  // add qs component
  url += (~url.indexOf('?') ? '&' : '?') + param + '=' + enc(id);
  url = url.replace('?&', '?');

  debug('jsonp req "%s"', url);

  // create script
  script = document.createElement('script');
  script.src = url;
  target.parentNode.insertBefore(script, target);

  return cancel;
}


/***/ }),
/* 83 */
/***/ (function(module, exports) {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}


/***/ }),
/* 84 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(28), __webpack_require__(84)))

/***/ }),
/* 86 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var atoa = __webpack_require__(25);
var serialization = __webpack_require__(45);
var emitter = __webpack_require__(43);

module.exports = createChannel;

function createChannel () {
  var channel = at(navigator.serviceWorker.controller);
  return channel;

  function at (worker) {
    var internalEmitter = emitter();
    var api = {
      on: selfed('on'),
      once: selfed('once'),
      off: selfed('off'),
      emit: postToWorker,
      at: at
    };
    var postFromWorker = serialization.emission(internalEmitter, { broadcast: false });
    navigator.serviceWorker.addEventListener('message', broadcastHandler);
    return api;

    function selfed (method) {
      return function selfish () {
        internalEmitter[method].apply(null, arguments);
        return api;
      };
    }

    function postToWorker () {
      if (!worker) {
        return Promise.reject(new Error('ServiceWorker not found.'));
      }
      var payload = serialization.parsePayload(atoa(arguments));
      var messageChannel = new MessageChannel();
      messageChannel.port1.addEventListener('message', postFromWorker);
      return worker.postMessage(payload, [messageChannel.port2]);
    }

    function broadcastHandler (e) {
      var data = e.data;
      if (data) {
        if (data.__broadcast) {
          serialization.emission(internalEmitter, {broadcast: true})(e);
        } else {
          serialization.emission(internalEmitter, {broadcast: false})(e);
        }
      }
    }
  }
}


/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var atoa = __webpack_require__(25);
var serialization = __webpack_require__(45);
var emitter = __webpack_require__(43);

module.exports = createChannel;

function createChannel () {
  var internalEmitter = emitter();
  var api = {
    on: selfed('on'),
    once: selfed('once'),
    off: selfed('off'),
    broadcast: broadcastToPages,
    emit: replyToClient
  };

  self.addEventListener('message', postFromPage);

  return api;

  function selfed (method) {
    return function selfish () {
      internalEmitter[method].apply(null, arguments);
      return api;
    };
  }

  function postFromPage (e) {
    var context = {
      reply: replyToPage(e)
    };
    serialization.emission(internalEmitter, context)(e);
  }

  function broadcastToPages (type) {
    var payload = atoa(arguments, 1);
    return self.clients.matchAll({includeUncontrolled: true}).then(gotClients);
    function gotClients (clients) {
      return clients.map(emitToClient);
    }
    function emitToClient (client) {
      return client.postMessage({ type: type, payload: payload, __broadcast: true });
    }
  }

  function replyTo (client) {
    var payload = serialization.parsePayload(atoa(arguments, 1));
    return client.postMessage(payload);
  }

  function replyToPage (e) {
    return replyTo.bind(null, e.ports[0]);
  }

  function replyToClient (clientId) {
        var payload = serialization.parsePayload(atoa(arguments, 1));
    return self.clients.matchAll({includeUncontrolled: true}).then(function(clients) {
      var wasClientFound = false;
      clients.forEach(function(client) {
        if (client.id === clientId) {
          wasClientFound = true;
          return client.postMessage(payload);
        }
      });
      if (!wasClientFound) {
        return Promise.reject('Could not find service worker client with ID ' + clientId + ' to reply to.');
      }
    });
  }
}


/***/ }),
/* 88 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(setImmediate) {var si = typeof setImmediate === 'function', tick;
if (si) {
  tick = function (fn) { setImmediate(fn); };
} else {
  tick = function (fn) { setTimeout(fn, 0); };
}

module.exports = tick;
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(89).setImmediate))

/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

var apply = Function.prototype.apply;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) {
  if (timeout) {
    timeout.close();
  }
};

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// setimmediate attaches itself to the global object
__webpack_require__(85);
exports.setImmediate = setImmediate;
exports.clearImmediate = clearImmediate;


/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isUUID;

var _assertString = __webpack_require__(91);

var _assertString2 = _interopRequireDefault(_assertString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uuid = {
  3: /^[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
  4: /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
  5: /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
  all: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
};

function isUUID(str) {
  var version = arguments.length <= 1 || arguments[1] === undefined ? 'all' : arguments[1];

  (0, _assertString2.default)(str);
  var pattern = uuid[version];
  return pattern && pattern.test(str);
}
module.exports = exports['default'];

/***/ }),
/* 91 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = assertString;
function assertString(input) {
  if (typeof input !== 'string') {
    throw new TypeError('This library (validator.js) validates strings only');
  }
}
module.exports = exports['default'];

/***/ }),
/* 92 */
/***/ (function(module, exports) {

module.exports = function() {
	throw new Error("define cannot be used indirect");
};


/***/ })
/******/ ]);
//# sourceMappingURL=OneSignalSDK.js.map