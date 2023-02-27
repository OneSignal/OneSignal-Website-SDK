import Database from "../../../src/shared/services/Database";
import Random from "../utils/Random";
import Emitter from "../../../src/shared/libraries/Emitter";
import { TestEnvironmentConfig } from "./TestEnvironment";
import MockNotification from "../mocks/MockNotification";
import { DOMWindow, JSDOM, ResourceLoader } from "jsdom";
import OneSignal from "../../../src/onesignal/OneSignal";
import { CUSTOM_LINK_CSS_CLASSES } from "../../../src/shared/slidedown/constants";
import { getSlidedownElement } from "../../../src/page/slidedown/SlidedownElement";
import DOMStorage from "dom-storage";
import { MockServiceWorkerContainerWithAPIBan } from "../mocks/models/MockServiceWorkerContainerWithAPIBan";
import { HttpHttpsEnvironment } from "../models/HttpHttpsEnvironment";
import BrowserUserAgent from "../models/BrowserUserAgent";
import TestContext from "./TestContext";

declare var global: any;

export function resetDatabase() {
  // Erase and reset IndexedDb database name to something random
  Database.resetInstance();
  Database.databaseInstanceName = Random.getRandomString(10);
}

export function initOSGlobals(config: TestEnvironmentConfig = {}) {
  global.OneSignal = OneSignal;
  global.OneSignal.config = TestContext.getFakeMergedConfig(config);
  global.OneSignal.initialized = true;
  global.OneSignal.coreDirector = config.coreDirector;
  global.OneSignal.emitter = new Emitter();

  return global.OneSignal;
}

export function stubNotification(config: TestEnvironmentConfig) {
  global.Notification = MockNotification;
  global.Notification.permission = config.permission ? config.permission : global.Notification.permission;

  // window is only defined in dom environment, not in SW
  if (config.environment === "dom") {
    global.window.Notification = global.Notification;
  }
}

export async function stubDomEnvironment(config: TestEnvironmentConfig) {
  if (!config) {
    config = {};
  }

  let url: string | undefined = undefined;
  let isSecureContext: boolean | undefined = undefined;
  if (config.httpOrHttps == HttpHttpsEnvironment.Http) {
    url = 'http://localhost:3000/webpush/sandbox?http=1';
    isSecureContext = false;
  } else {
    url = 'https://localhost:3001/webpush/sandbox?https=1';
    isSecureContext = true;
  }

  if (config.url) {
    url = config.url.toString();
    global.location = url;
  }

  let html = '<!doctype html><html><head></head><body></body></html>';

  if (config.addPrompts) {
    html = `<!doctype html><html><head>\
    <div class="${CUSTOM_LINK_CSS_CLASSES.containerClass}"></div>\
    <div class="${CUSTOM_LINK_CSS_CLASSES.containerClass}"></div>\
    </head><body>\
      ${getSlidedownElement({}).outerHTML}</div></body></html>`;
  }

  const resourceLoader = new ResourceLoader({
    userAgent: config.userAgent ? config.userAgent : BrowserUserAgent.Default,
  });

  // global document object must be defined for `getSlidedownElement` to work correctly.
  // this line initializes the document object
  const dom = new JSDOM(html, {
    resources: resourceLoader,
    url: url,
    contentType: 'text/html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  const windowDef = dom.window;
  // Node has its own console; overwriting it will cause issues
  delete (windowDef as any)['console'];
  (windowDef as any).navigator.serviceWorker = new MockServiceWorkerContainerWithAPIBan();
  (windowDef as any).localStorage = new DOMStorage(null);
  (windowDef as any).sessionStorage = new DOMStorage(null);
  // (windowDef as any).TextEncoder = TextEncoder;
  // (windowDef as any).TextDecoder = TextDecoder;
  (windowDef as any).isSecureContext = isSecureContext;
  (windowDef as any).location = url;

  addCustomEventPolyfill(windowDef);

  const windowTop: DOMWindow = config.initializeAsIframe ? {
    location: {
      get origin() {
        throw new Error("SecurityError: Permission denied to access property 'origin' on cross-origin object");
      }
    }
  } as any : windowDef;
  dom.reconfigure({ url, windowTop });
  global.window = windowDef;
  global.document = windowDef.document;
  return dom;
}

function addCustomEventPolyfill(windowDef) {
  function CustomEvent(event: any, params: any) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    const evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
  }
  CustomEvent.prototype = windowDef.Event.prototype;
  global.CustomEvent = CustomEvent;
}


/**
 * Intercepts requests to our virtual DOM to return fake responses.
 */
function onVirtualDomResourceRequested(resource: any, callback: (arg1: any, arg2?: string) => any) {
  const pathname = resource.url.pathname;
  if (pathname.startsWith('https://test.node/scripts/')) {
    if (pathname.startsWith('https://test.node/scripts/delayed')) {
      onVirtualDomDelayedResourceRequested(
        resource,
        callback.bind(null, null, `window.__NODE_TEST_SCRIPT = true; window.__DELAYED = true;`)
      );
    } else {
      callback(null, `window.__NODE_TEST_SCRIPT = true;`);
    }
  } else if (pathname.startsWith('https://test.node/styles/')) {
    if (pathname.startsWith('https://test.node/scripts/delayed')) {
      onVirtualDomDelayedResourceRequested(
        resource,
        callback.bind(null, null, `html { margin: 0; padding: 0; font-size: 16px; }`)
      );
    } else {
      callback(null, `html { margin: 0; padding: 0; font-size: 16px; }`);
    }
  } else if (pathname.startsWith('https://test.node/codes/')) {
    if (pathname.startsWith('https://test.node/codes/500')) {
      callback(new Error("Virtual DOM error response."));
    } else {
      callback(null, `html { margin: 0; padding: 0; font-size: 16px; }`);
    }
  } else {
    return resource.defaultFetch(callback);
  }
}

function onVirtualDomDelayedResourceRequested(resource: any, callback: () => any) {
  const pathname = resource.url.pathname;
  const delay = pathname.match(/\d+/) || 1000;
  // Simulate a delayed request
  const timeout = setTimeout(function () {
    callback();
  }, delay);
  return {
    abort: function () {
      clearTimeout(timeout);
    }
  };
}
