import log from 'loglevel';
import * as Browser from 'bowser';
import Environment from './environment.js';
import IndexedDb from './indexedDb';
import Database from './database';

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

export function isPushNotificationsSupported () {
  if (Browser.ios || Browser.ipod || Browser.iphone || Browser.ipad)
    return false;

  if (Browser.msedge || Browser.msie)
    return false;

  /* Firefox on Android push notifications not supported until at least 48: https://bugzilla.mozilla.org/show_bug.cgi?id=1206207#c6 */
  if (Browser.firefox && Number(Browser.version) < 48 && (Browser.mobile || Browser.tablet)) {
    return false;
  }

  if (Browser.firefox && Number(Browser.version) >= 44)
    return true;

  if (Browser.safari && Number(Browser.version) >= 7.1)
    return true;

  // Android Chrome WebView
  if (navigator.appVersion.match(/ wv/))
    return false;

  if (Browser.chrome && Number(Browser.version) >= 42)
    return true;

  if (Browser.yandexbrowser && Number(Browser.version) >= 15.12)
    return true;

  // https://www.chromestatus.com/feature/5416033485586432
  if (Browser.opera && Browser.mobile && Number(Browser.version) >= 37)
    return true;

  return false;
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
  return new Promise((resolve, reject) => {
    if (!isPushNotificationsSupported()) {
      reject('Push notifications are not supported.');
    }

    if (!OneSignal.initialized) {
      OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, resolve);
    } else {
      resolve();
    }
  });
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

export function on(targetSelectorOrElement, event, task) {
  if (!event) {
    log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    log.error('Cannot call on() with no task: ', task)
  }
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(selector);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        on(els[i], task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < targetSelectorOrElement.length; i++)
      on(targetSelectorOrElement[i], task);
  }
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.addEventListener(event, task);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

var DEVICE_TYPES = {
  CHROME: 5,
      SAFARI: 7,
      FIREFOX: 8,
};

export function getDeviceTypeForBrowser() {
  if (Browser.chrome || Browser.yandexbrowser || Browser.opera) {
    return DEVICE_TYPES.CHROME;
  } else if (Browser.firefox) {
    return DEVICE_TYPES.FIREFOX;
  } else if (Browser.safari) {
    return DEVICE_TYPES.SAFARI;
  }
}

export function once(targetSelectorOrElement, event, task, manualDestroy=false) {
  if (!event) {
    log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    log.error('Cannot call on() with no task: ', task)
  }
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(selector);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        once(els[i], task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < targetSelectorOrElement.length; i++)
      once(targetSelectorOrElement[i], task);
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
 * Removes event handler from selector.
 * @param targetSelectorOrElement Selector to target one or multiple elements, or a single or array of DOMElement.
 * @param event The event to target (e.g. 'transitionend')
 * @param task A single function callback to unbind, or leave empty to remove all event handlers.
 */
export function off(targetSelectorOrElement, event, task) {
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(selector);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        off(els[i], task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < targetSelectorOrElement.length; i++)
      off(targetSelectorOrElement[i], task);
  }
  else if (typeof targetSelectorOrElement === 'object')
    if (task)
      targetSelectorOrElement.removeEventListener(event, task);
    else
      targetSelectorOrElement.removeEventListener(event);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function getConsoleStyle(style) {
  if (style == 'code') {
    return `
    padding: 0 5px 2px;
    border: 1px solid #ddd;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    background-clip: padding-box;
    font-family: Monaco,"DejaVu Sans Mono","Courier New",monospace;
    color: #666;
    `
  } else if (style == 'bold') {
    return `
      font-weight: 600;
    color: rgb(51, 51, 51);
    `;
  } else if (style == 'alert') {
    return `
      font-weight: 600;
    color: red;
    `;
  } else if (style == 'event') {
    return `
    color: green;
    `;
  } else if (style == 'postmessage') {
    return `
    color: orange;
    `;
  } else if (style == 'serviceworkermessage') {
    return `
    color: purple;
    `;
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

export function nothing() {
  return Promise.resolve();
}

export function executeAndTimeoutPromiseAfter(promise, milliseconds, displayError) {
  let timeoutPromise = new Promise(resolve => setTimeout(() => resolve('promise-timed-out'), milliseconds));
  return Promise.race([promise, timeoutPromise]).then(value => {
    if (value === 'promise-timed-out') {
      log.warn(displayError || `Promise ${promise} timed out after ${milliseconds} ms.`);
      return Promise.reject(displayError || `Promise ${promise} timed out after ${milliseconds} ms.`);
    }
    else return value;
  });
}

export function when(condition, promiseIfTrue, promiseIfFalse) {
  if (promiseIfTrue === undefined)
    promiseIfTrue = nothing();
  if (promiseIfFalse === undefined)
    promiseIfFalse = nothing();
  return (condition ? promiseIfTrue : promiseIfFalse);
}

export function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var crypto = window.crypto || window.msCrypto;
    if (crypto) {
      var r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    } else {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    }
  });
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

/**
 * Returns the correct subdomain if 'https://subdomain.onesignal.com' or something similar is passed.
 */
export function normalizeSubdomain(subdomain) {
  subdomain = subdomain.trim();
  let removeSubstrings = [
    'http://www.',
    'https://www.',
    'http://',
    'https://',
    '.onesignal.com/',
    '.onesignal.com'
  ];
  for (let removeSubstring of removeSubstrings) {
    subdomain = subdomain.replace(removeSubstring, '');
  }
  return subdomain.toLowerCase();
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
 * Wipe OneSignal-related IndexedDB data on the current origin. OneSignal does not have to be initialized to use this.
 */
export function wipeLocalIndexedDb() {
  log.warn('OneSignal: Wiping local IndexedDB data.');
  return Promise.all([
    IndexedDb.remove('Ids'),
    IndexedDb.remove('NotificationOpened'),
    IndexedDb.remove('Options')
  ]);
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
export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Unsubscribe from push notifications without removing the active service worker.
 */
export function unsubscribeFromPush() {
  log.warn('OneSignal: Unsubscribing from push.');
  if (Environment.isServiceWorker()) {
    return registration.pushManager.getSubscription()
                       .then(subscription => {
                         if (subscription) {
                           return subscription.unsubscribe();
                         } else throw new Error('Cannot unsubscribe because not subscribed.');
                       });
  } else {
    if (OneSignal.isUsingSubscriptionWorkaround()) {
      return new Promise((resolve, reject) => {
        log.debug("Unsubscribe from push got called, and we're going to remotely execute it in HTTPS iFrame.");
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, null, reply => {
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
                      .then(subscription => {
                        if (subscription) {
                          return subscription.unsubscribe();
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
  if (Environment.isIframe()) {
    return;
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

/**
 * Returns the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function getSdkLoadCount() {
  return window.__oneSignalSdkLoadCount || 0;
}

/**
 * Increments the counter describing the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function incrementSdkLoadCount() {
  window.__oneSignalSdkLoadCount = getSdkLoadCount() + 1;
}

/**
 * Returns the email with all whitespace removed and converted to lower case.
 */
export function prepareEmailForHashing(email) {
  return email.replace(/\s/g, '').toLowerCase();
}

/**
 * Taken from: https://github.com/jbt/js-crypto/blob/master/md5-min.js
 */
export function md5(c) {
  for (var m = [], l = 0; 64 > l;)m[l] = 0 | 4294967296 * Math.abs(Math.sin(++l));
  var e, g, f, a, h = [];
  c = unescape(encodeURI(c));
  for (var b = c.length, k = [e = 1732584193, g = -271733879, ~e, ~g], d = 0; d <= b;)h[d >> 2] |= (c.charCodeAt(d) || 128) << 8 * (d++ % 4);
  h[c = 16 * (b + 8 >> 6) + 14] = 8 * b;
  for (d = 0; d < c; d += 16) {
    b = k;
    for (a = 0; 64 > a;)b = [f = b[3], (e = b[1] | 0) + ((f = b[0] + [e & (g = b[2]) | ~e & f, f & e | ~f & g, e ^ g ^ f, g ^ (e | ~f)][b = a >> 4] + (m[a] + (h[[a, 5 * a + 1, 3 * a + 5, 7 * a][b] % 16 + d] | 0))) << (b = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][4 * b + a++ % 4]) | f >>> 32 - b), e, g];
    for (a = 4; a;)k[--a] = k[a] + b[a]
  }
  for (c = ""; 32 > a;)c += (k[a >> 3] >> 4 * (1 ^ a++ & 7) & 15).toString(16);
  return c;
}

/**
 * Taken from: https://github.com/jbt/js-crypto/blob/master/sha1-min.js
 */
export function sha1(d) {
  var l = 0, a = 0, f = [], b, c, g, h, p, e, m = [b = 1732584193, c = 4023233417, ~b, ~c, 3285377520], n = [], k = unescape(encodeURI(d));
  for (b = k.length; a <= b;)n[a >> 2] |= (k.charCodeAt(a) || 128) << 8 * (3 - a++ % 4);
  for (n[d = b + 8 >> 2 | 15] = b << 3; l <= d; l += 16) {
    b = m;
    for (a = 0; 80 > a; b = [[(e = ((k = b[0]) << 5 | k >>> 27) + b[4] + (f[a] = 16 > a ? ~~n[l + a] : e << 1 | e >>> 31) + 1518500249) + ((c = b[1]) & (g = b[2]) | ~c & (h = b[3])), p = e + (c ^ g ^ h) + 341275144, e + (c & g | c & h | g & h) + 882459459, p + 1535694389][0 | a++ / 20] | 0, k, c << 30 | c >>> 2, g, h])e = f[a - 3] ^ f[a - 8] ^ f[a - 14] ^ f[a - 16];
    for (a = 5; a;)m[--a] = m[a] + b[a] | 0
  }
  for (d = ""; 40 > a;)d += (m[a >> 3] >> 4 * (7 - a++ % 8) & 15).toString(16);
  return d;
}