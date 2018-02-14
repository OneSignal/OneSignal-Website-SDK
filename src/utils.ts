import * as Browser from 'bowser';
import * as log from 'loglevel';

import Environment from './Environment';
import TimeoutError from './errors/TimeoutError';
import SubscriptionHelper from './helpers/SubscriptionHelper';
import SdkEnvironment from './managers/SdkEnvironment';
import { WindowEnvironmentKind } from './models/WindowEnvironmentKind';
import Database from './services/Database';


export function isArray(variable) {
  return Object.prototype.toString.call( variable ) === '[object Array]';
}

var decodeTextArea = null;
export function decodeHtmlEntities(text) {
  if (Environment.isBrowser()) {
    if (!decodeTextArea) {
      decodeTextArea = document.createElement("textarea");
    }
  }
  if (decodeTextArea) {
    decodeTextArea.innerHTML = text;
    return decodeTextArea.value;
  } else {
    // Not running in a browser environment, text cannot be decoded
    return text;
  }
}

export function redetectBrowserUserAgent(): Browser.IBowser  {
    /*
   TODO: Make this a little neater
   During testing, the browser object may be initialized before the userAgent is injected
  */
  if (Browser.name === '' && Browser.version === '') {
    var browser = Browser._detect(navigator.userAgent);
  } else {
    var browser = Browser;
  }
  return browser;
}

export function isPushNotificationsSupported() {
  /**
   * It's possible a browser's user agent is modified, so we do some basic feature detection to make sure initializing
   * the SDK won't fail. Promises are required to initialize the SDK.
   */
  if (typeof (window as any).Promise === "undefined") {
    return false;
  }

  const browser = redetectBrowserUserAgent();
  let userAgent = navigator.userAgent || '';

  if (!browser.safari && typeof navigator.serviceWorker === "undefined") {
    /**
     * Browsers like Firefox Extended Support Release don't support service workers
     */
    return false;
  }

  if (browser.ios || (<any>browser).ipod || (<any>browser).iphone || (<any>browser).ipad)
    return false;

  if (browser.msie)
    return false;

    // Microsoft Edge
  if (browser.msedge && Number(browser.version) >= 17.17063)
    return true;

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
  if ((browser as any).samsungBrowser && Number(browser.version) >= 4) {
    return true;
  }

  if ((browser.chrome || (<any>browser).chromium) && Number(browser.version) >= 42)
    return true;

  if ((<any>browser).yandexbrowser && Number(browser.version) >= 15.12)
    // 17.3.1.838 supports VAPID on Mac OS X
    return true;

  // https://www.chromestatus.com/feature/5416033485586432
  if (browser.opera && (browser.mobile || browser.tablet) && Number(browser.version) >= 37 ||
    browser.opera && Number(browser.version) >= 42)
    return true;

  // The earliest version of Vivaldi uses around Chrome 50
  if ((browser as any).vivaldi)
    return true;

  return false;
}

export function isChromeLikeBrowser() {
  return Browser.chrome ||
         (Browser as any).chromium ||
         (Browser as any).opera ||
         (Browser as any).yandexbrowser;
}

export function removeDomElement(selector) {
  var els = document.querySelectorAll(selector);
  if (els.length > 0) {
    for (let i = 0; i < els.length; i++)
      els[i].parentNode.removeChild(els[i]);
  }
}

/**
 * Helper method for public APIs that waits until OneSignal is initialized, rejects if push notifications are
 * not supported, and wraps these tasks in a Promise.
 */
export function awaitOneSignalInitAndSupported() {
  return new Promise(resolve => {
    if (!OneSignal.initialized) {
      OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, resolve);
    } else {
      resolve();
    }
  });
}

/**
 * JSON.stringify() but converts functions to "[Function]" so they aren't lost.
 * Helps when logging method calls.
 */
export function stringify(obj) {
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === 'function') {
      return "[Function]";
    }
    else {
      return value;
    }
  }, 4);
}

export function executeCallback<T>(callback: Action<T>, ...args: any[]) {
  if (callback) {
    return callback.apply(null, args);
  }
}

export function logMethodCall(methodName: string, ...args) {
  return log.debug(`Called %c${methodName}(${args.map(stringify).join(', ')})`, getConsoleStyle('code'), '.');
}

export function isValidEmail(email) {
  return !!email &&
         !!email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/)
}

export function addDomElement(targetSelectorOrElement, addOrder, elementHtml) {
  if (typeof targetSelectorOrElement === 'string')
    document.querySelector(targetSelectorOrElement).insertAdjacentHTML(addOrder, elementHtml);
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.insertAdjacentHTML(addOrder, elementHtml);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function clearDomElementChildren(targetSelectorOrElement) {
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

export function addCssClass(targetSelectorOrElement, cssClass) {
  if (typeof targetSelectorOrElement === 'string')
    document.querySelector(targetSelectorOrElement).classList.add(cssClass);
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.classList.add(cssClass);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function removeCssClass(targetSelectorOrElement, cssClass) {
  if (typeof targetSelectorOrElement === 'string')
    document.querySelector(targetSelectorOrElement).classList.remove(cssClass);
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.classList.remove(cssClass);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function hasCssClass(targetSelectorOrElement, cssClass) {
  if (typeof targetSelectorOrElement === 'string')
    return document.querySelector(targetSelectorOrElement).classList.contains(cssClass);
  else if (typeof targetSelectorOrElement === 'object')
    return targetSelectorOrElement.classList.contains(cssClass);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

var DEVICE_TYPES = {
  CHROME: 5,
      SAFARI: 7,
      FIREFOX: 8,
      UNKNOWN: -99
};

export function getDeviceTypeForBrowser() {
  if (Browser.chrome ||
    (<any>Browser).yandexbrowser ||
    Browser.opera ||
    (Browser as any).vivaldi ||
    (Browser as any).samsungBrowser ||
    (<any>Browser).chromium) {
    return DEVICE_TYPES.CHROME;
  } else if (Browser.firefox) {
    return DEVICE_TYPES.FIREFOX;
  } else if (Browser.safari) {
    return DEVICE_TYPES.SAFARI;
  } else {
    log.error(`OneSignal: Unable to associate device type for browser ${Browser.name} ${Browser.version}`);
    return DEVICE_TYPES.UNKNOWN;
  }
}
export function getConsoleStyle(style) {
  if (style == 'code') {
    return `padding: 0 1px 1px 5px;border: 1px solid #ddd;border-radius: 3px;font-family: Monaco,"DejaVu Sans Mono","Courier New",monospace;color: #444;`;
  } else if (style == 'bold') {
    return `font-weight: 600;color: rgb(51, 51, 51);`;
  } else if (style == 'alert') {
    return `font-weight: 600;color: red;`;
  } else if (style == 'event') {
    return `color: green;`;
  } else if (style == 'postmessage') {
    return `color: orange;`;
  } else if (style == 'serviceworkermessage') {
    return `color: purple;`;
  } else {
    return '';
  }
}

/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  });
}

export function nothing(): Promise<any> {
  return Promise.resolve();
}

export function timeoutPromise(promise: Promise<any>, milliseconds: number): Promise<TimeoutError | any> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError())
    }, milliseconds);
  });
  return Promise.race([promise, timeoutPromise]);
}

export function when(condition, promiseIfTrue, promiseIfFalse) {
  if (promiseIfTrue === undefined)
    promiseIfTrue = nothing();
  if (promiseIfFalse === undefined)
    promiseIfFalse = nothing();
  return (condition ? promiseIfTrue : promiseIfFalse);
}

/**
 * Returns true if match is in string; otherwise, returns false.
 */
export function contains(indexOfAble, match) {
  if (!indexOfAble)
    return false;
  return indexOfAble.indexOf(match) !== -1;
}

/**
 * Returns the current object without keys that have undefined values.
 * Regardless of whether the return result is used, the passed-in object is destructively modified.
 * Only affects keys that the object directly contains (i.e. not those inherited via the object's prototype).
 * @param object
 */
export function trimUndefined(object) {
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      if (object[property] === undefined) {
        delete object[property];
      }
    }
  }
  return object;
}

/**
 * Returns true if the UUID is a string of 36 characters;
 * @param uuid
 * @returns {*|boolean}
 */
export function isValidUuid(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid);
}

export function getUrlQueryParam(name) {
  let url = window.location.href;
  url = url.toLowerCase(); // This is just to avoid case sensitiveness
  name = name.replace(/[\[\]]/g, "\\$&").toLowerCase();// This is just to avoid case sensitiveness for query parameter name
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/**
 * Wipe OneSignal-related IndexedDB data on the "correct" computed origin, but OneSignal must be initialized first to use.
 */
export function wipeIndexedDb() {
  log.warn('OneSignal: Wiping IndexedDB data.');
  return Promise.all([
    Database.remove('Ids'),
    Database.remove('NotificationOpened'),
    Database.remove('Options')
  ]);
}

/**
 * Capitalizes the first letter of the string.
 * @returns {string} The string with the first letter capitalized.
 */
export function capitalize(text): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Unsubscribe from push notifications without removing the active service worker.
 */
export function unsubscribeFromPush() {
  log.warn('OneSignal: Unsubscribing from push.');
  if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
    return (<any>self).registration.pushManager.getSubscription()
                       .then(subscription => {
                         if (subscription) {
                           return subscription.unsubscribe();
                         } else throw new Error('Cannot unsubscribe because not subscribed.');
                       });
  } else {
    if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
      return new Promise((resolve, reject) => {
        log.debug("Unsubscribe from push got called, and we're going to remotely execute it in HTTPS iFrame.");
        OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, null, reply => {
          log.debug("Unsubscribe from push succesfully remotely executed.");
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            resolve();
          } else {
            reject('Failed to remotely unsubscribe from push.');
          }
        });
      });
    } else {
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller)
        return Promise.resolve();

      return navigator.serviceWorker.ready
                      .then(registration => registration.pushManager)
                      .then(pushManager => pushManager.getSubscription())
                      .then((subscription: any) => {
                        if (subscription) {
                          return subscription.unsubscribe();
                        } else {
                          return Promise.resolve();
                        }
                      });
    }
  }
}


/**
 * Unregisters the active service worker.
 */
export function wipeServiceWorker() {
  log.warn('OneSignal: Unregistering service worker.');
  if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalProxyFrame) {
    return Promise.resolve();
  }
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller)
    return Promise.resolve();

  return navigator.serviceWorker.ready
      .then(registration => registration.unregister());
}


/**
 * Unsubscribe from push notifications and remove any active service worker.
 */
export function wipeServiceWorkerAndUnsubscribe() {
  return Promise.all([
    unsubscribeFromPush(),
    wipeServiceWorker()
  ]);
}

export function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Returns the part of the string after the first occurence of the specified search.
 * @param string The entire string.
 * @param search The text returned will be everything *after* search.
 * e.g. substringAfter('A white fox', 'white') => ' fox'
 */
export function substringAfter(string, search) {
  return string.substr(string.indexOf(search) + search.length);
}

export function once(targetSelectorOrElement, event, task, manualDestroy=false) {
  if (!event) {
    log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    log.error('Cannot call on() with no task: ', task)
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
        var destroyEventListener = function() {
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

/**
 * Returns the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function getSdkLoadCount() {
  return (<any>window).__oneSignalSdkLoadCount || 0;
}

export async function awaitSdkEvent(eventName: string, predicate?: Action<any>) {
  return await new Promise(resolve => {
    OneSignal.once(eventName, event => {
      if (predicate) {
        const predicateResult = predicate(event);
        if (predicateResult)
          resolve(event);
      } else resolve(event);
    });
  });
}

/**
 * Increments the counter describing the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function incrementSdkLoadCount() {
  (<any>window).__oneSignalSdkLoadCount = getSdkLoadCount() + 1;
}

/**
 * Returns the email with all whitespace removed and converted to lower case.
 */
export function prepareEmailForHashing(email: string): string {
  return email.replace(/\s/g, '').toLowerCase();
}

export function encodeHashAsUriComponent(hash: object): string {
  let uriComponent = '';
  const keys = Object.keys(hash);
  for (var key of keys) {
    const value = hash[key];
    uriComponent += `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }
  return uriComponent;
}
