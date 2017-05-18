import Environment from "../../../src/Environment";
import OneSignal from "../../../src/OneSignal";
import Random from "../tester/Random";
import Database from "../../../src/services/Database";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import { Test } from "ava";
import * as jsdom from 'jsdom';
import * as DOMStorage from 'dom-storage';
import Launcher from "../../../src/bell/Launcher";
import fetch from 'node-fetch';
import ServiceWorkerGlobalScope from '../mocks/service-workers/ServiceWorkerGlobalScope';
import ServiceWorker from '../../../src/service-worker/ServiceWorker';
import { ServiceWorkerContainer } from '../mocks/service-workers/ServiceWorkerContainer';
import * as objectAssign from 'object-assign';


var global = new Function('return this')();


export interface ServiceWorkerTestEnvironment extends ServiceWorkerGlobalScope {
  OneSignal: ServiceWorker;
}

export enum HttpHttpsEnvironment {
  Http,
  Https
}

export enum BrowserUserAgent {
  Default = <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
  iPad = <any>"Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10",
  iPhone = <any>"Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25",
  iPod = <any>"Mozilla/5.0 (iPod touch; CPU iPhone OS 7_0_3 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11B511 Safari/9537.53",
  Edge = <any>"Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10136",
  IE11 = <any>"Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko",
  FirefoxMobileUnsupported = <any>"Mozilla/5.0 (Android 4.4; Mobile; rv:47.0) Gecko/47.0 Firefox/47.0",
  FirefoxTabletUnsupported = <any>"Mozilla/5.0 (Android 4.4; Mobile ; rv:47.0) Gecko/47.0 Firefox/47.0",
  FirefoxMobileSupported = <any>"Mozilla/5.0 (Android 4.4; Mobile; rv:44.0) Gecko/48.0 Firefox/48.0",
  FirefoxTabletSupported = <any>"Mozilla/5.0 (Android 4.4; Mobile ; rv:44.0) Gecko/48.0 Firefox/48.0",
  FirefoxWindowsSupported = <any>"Mozilla/5.0 (Windows NT x.y; WOW64; rv:44.0) Gecko/20100101 Firefox/44.0",
  FirefoxMacSupported = <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:44.0) Gecko/20100101 Firefox/44.0",
  FirefoxLinuxSupported = <any>"Mozilla/5.0 (X11; Linux i686 on x86_64; rv:44.0) Gecko/20100101 Firefox/44.0",
  SafariUnsupportedMac= <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/538.32 (KHTML, like Gecko) Version/7.0 Safari/538.4",
  SafariSupportedMac= <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/538.32 (KHTML, like Gecko) Version/7.1 Safari/538.4",
  FacebookBrowseriOS = <any>"Mozilla/5.0 (iPhone; CPU iPhone OS 8_2 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12D508 [FBAN/FBIOS;FBAV/27.0.0.10.12;FBBV/8291884;FBDV/iPhone7,1;FBMD/iPhone;FBSN/iPhone OS;FBSV/8.2;FBSS/3;]",
  FacebookBrowserAndroid = <any>"Mozilla/5.0 (Linux; Android 5.1; Archos Diamond S Build/LMY47D; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/51.0.2704.81 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/87.0.0.17.79;]",
  ChromeAndroidSupported = <any>"Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/42 Mobile Safari/535.19",
  ChromeWindowsSupported = <any>"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2228.0 Safari/537.36",
  ChromeMacSupported = <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.1636.0 Safari/537.36",
  ChromeLinuxSupported = <any>"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.1636.0 Safari/537.36",
  ChromeTabletSupported = <any>"Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JWR66Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.1547.72 Safari/537.36",
  ChromeAndroidUnsupported = <any>"Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/41 Mobile Safari/535.19",
  ChromeWindowsUnsupported = <any>"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
  ChromeMacUnsupported = <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.1636.0 Safari/537.36",
  ChromeLinuxUnsupported = <any>"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.1636.0 Safari/537.36",
  ChromeTabletUnsupported = <any>"Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JWR66Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.1547.72 Safari/537.36",
  YandexDesktopSupportedHigh = <any>"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.12785 YaBrowser/17.1.0.2036 Safari/537.36",
  YandexDesktopSupportedLow = <any>"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.12785 YaBrowser/15.12.1.6475 Safari/537.36",
  YandexMobileSupported = <any>"Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6P Build/N4F26T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 YaBrowser/17.1.2.339.00 Mobile Safari/537.36",
  OperaDesktopSupported = <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36 OPR/42.0.2442.806",
  OperaAndroidSupported = <any>"Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6P Build/N4F26T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.91 Mobile Safari/537.36 OPR/37.5.2246.114172",
  OperaTabletSupported = <any>"Mozilla/5.0 (Linux; Android 4.1.2; GT-N8000 Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.166 Safari/537.36 OPR/37.0.1396.73172",
  OperaMiniUnsupported = <any>"Mozilla/5.0 (Linux; U; Android 7.1.2; Nexus 6P Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 Mobile Safari/537.36 OPR/24.0.2254.115784",
  VivaldiWindowsSupported = <any>"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.89 Vivaldi/1.0.94.2 Safari/537.36",
  VivaldiLinuxSupported = <any>"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.105 Safari/537.36 Vivaldi/1.0.162.2",
  VivaldiMacSupported = <any>"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.99 Safari/537.36 Vivaldi/1.0.303.52",
  SamsungBrowserSupported = <any>"Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-N910F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile Safari/537.36",
  SamsungBrowserUnsupported = <any>"Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-N910F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.0 Chrome/44.0.2403.133 Mobile Safari/537.36",
}

export interface TestEnvironmentConfig {
  environment?: string,
  initOptions?: any,
  httpOrHttps?: HttpHttpsEnvironment,
  permission?: NotificationPermission,
  userAgent?: BrowserUserAgent,
  url?: URL
}

export class TestEnvironment {

  /**
   * Intercepts requests to our virtual DOM to return fake responses.
   */
  static onVirtualDomResourceRequested(resource, callback) {
    const pathname = resource.url.pathname;
    if (pathname.startsWith('https://test.node/scripts/')) {
      if (pathname.startsWith('https://test.node/scripts/delayed')) {
        TestEnvironment.onVirtualDomDelayedResourceRequested(
          resource,
          callback.bind(null, null, `window.__NODE_TEST_SCRIPT = true; window.__DELAYED = true;`)
        );
      } else {
        callback(null, `window.__NODE_TEST_SCRIPT = true;`);
      }
    } else if (pathname.startsWith('https://test.node/styles/')) {
      if (pathname.startsWith('https://test.node/scripts/delayed')) {
        TestEnvironment.onVirtualDomDelayedResourceRequested(
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

  static onVirtualDomDelayedResourceRequested(resource, callback) {
    const pathname = resource.url.pathname;
    var delay = pathname.match(/\d+/) || 1000;
    // Simulate a delayed request
    var timeout = setTimeout(function () {
      callback();
    }, delay);
    return {
      abort: function () {
        clearTimeout(timeout);
      }
    };
  }

  static async stubServiceWorkerEnvironment(config?: TestEnvironmentConfig): Promise<ServiceWorkerTestEnvironment> {
    if (!config)
      config = {};
    // Service workers have a ServiceWorkerGlobalScope set to the 'self' variable, not window
    var serviceWorkerScope = new ServiceWorkerGlobalScope();
    objectAssign(global, serviceWorkerScope);
    global.skipWaiting = serviceWorkerScope.skipWaiting;
    global.addEventListener = serviceWorkerScope.addEventListener;
    global.trigger = serviceWorkerScope.trigger;
    global.self = global;
    global.fetch = fetch;
    global.location = {
      origin: 'https://localhost:3001',
      href: 'https://localhost:3001/webpush/sandbox?https=1',
    };
    // global.OneSignal = new ServiceWorker({
    //   databaseName: Random.getRandomString(6)
    // });
    // global.OneSignal.config = config.initOptions ? config.initOptions : {};
    // global.OneSignal.initialized = true;
    // global.OneSignal.getNotifications = () => global.self.registration.notifications;
    return global;
  }

  static async stubDomEnvironment(config?: TestEnvironmentConfig) {
    if (!config)
      config = {};
    if (config.httpOrHttps == HttpHttpsEnvironment.Http) {
      var url = 'http://localhost:3000/webpush/sandbox?http=1';
    } else {
      var url = 'https://localhost:3001/webpush/sandbox?https=1';
    }
    if (config.url) {
      var url = config.url.toString();
    }
    global.window = global;
    global.localStorage = new DOMStorage(null);
    global.sessionStorage = new DOMStorage(null);
    var windowDef = await new Promise<Window>((resolve, reject) => {
      (jsdom as any).env({
        html: '<!doctype html><html><head></head><body></body></html>',
        url: url,
        userAgent: config.userAgent ? config.userAgent : BrowserUserAgent.Default,
        features: {
          FetchExternalResources: ["script", "frame", "iframe", "link", "img"],
          ProcessExternalResources: ['script']
        },
        resourceLoader: TestEnvironment.onVirtualDomResourceRequested,
        done: (err, window) => {
          if (err) {
            console.log(err);
            reject('Failed to create a JsDom mock browser environment:' + err);
          } else {
            resolve(window);
          }
        }
      });
    });
    // Node has its own console; overwriting it will cause issues
    delete (windowDef as any)['console'];
    (windowDef as any).navigator.serviceWorker = new ServiceWorkerContainer();
    jsdom.reconfigureWindow(windowDef, { top: windowDef });
    objectAssign(global, windowDef);
    return jsdom;
  }

  static stubNotification(config: TestEnvironmentConfig) {
    global.window.Notification = global.Notification = {
      permission: config.permission ? config.permission: NotificationPermission.Default,
      maxActions: 2,
      requestPermission: function() { }
    };
  }

  static stubNotifyButtonTransitionEvents() {
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
  }

  static async initialize(config: TestEnvironmentConfig = {}) {
    Database.databaseInstanceName = Random.getRandomString(10);
    global.OneSignal = OneSignal;
    global.OneSignal.config = config.initOptions ? config.initOptions : {};
    global.OneSignal.initialized = true;
    await TestEnvironment.stubDomEnvironment(config);
    TestEnvironment.stubNotifyButtonTransitionEvents();
    TestEnvironment.stubNotification(config);
    return global.OneSignal;
  }
}
