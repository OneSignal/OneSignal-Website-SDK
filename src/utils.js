import log from 'loglevel';
import StackTrace from 'stacktrace-js';
import * as Browser from 'bowser';
import Environment from './environment.js';

export function isArray(variable) {
  return Object.prototype.toString.call( variable ) === '[object Array]';
}

export function isPushNotificationsSupportedAndWarn() {
  let isSupported = isPushNotificationsSupported();
  if (!isSupported) {
    log.warn("Your browser does not support push notifications.");
  }
  return isSupported;
}

export function logError(e) {
  StackTrace.fromError(e).then(s => {
    if (s && s.length > 0) {
      let stackInfo = s[0];
      let filename = stackInfo.fileName.replace('webpack:///', 'webpack:///./');
      log.error(e, `@ ${filename}:${stackInfo.lineNumber}:${stackInfo.columnNumber}`);
    } else {
      log.error(e);
    }
  }).catch(x => log.error(e));
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

  /* Firefox on Android push notifications not supported until at least 47/48: https://bugzilla.mozilla.org/show_bug.cgi?id=1206207#c6 */
  if (Browser.firefox && Number(Browser.version) < 47 && (Browser.mobile || Browser.tablet)) {
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

  return false;
}

export function removeDomElement(selector) {
  var els = document.querySelectorAll(selector);
  if (els.length > 0) {
    for (let i = 0; i < els.length; i++)
      els[i].parentNode.removeChild(els[i]);
  }
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
      log.error(displayError || `Promise ${promise} timed out after ${milliseconds} ms.`);
      return Promise.reject(displayError || `Promise ${promise} timed out after ${milliseconds} ms.`);
    }
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
    var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
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