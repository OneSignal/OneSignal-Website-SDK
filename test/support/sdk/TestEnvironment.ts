import "../../support/polyfills/polyfills";
import OneSignal from "../../../src/OneSignal";
import Random from "../tester/Random";
import Database from "../../../src/services/Database";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import jsdom from 'jsdom';
// @ts-ignore
import DOMStorage from "dom-storage";
// @ts-ignore
import fetch from "node-fetch";

import SdkEnvironment from '../../../src/managers/SdkEnvironment';
import { TestEnvironmentKind } from '../../../src/models/TestEnvironmentKind';
import { AppConfig, ServerAppConfig, NotificationClickMatchBehavior,
  NotificationClickActionBehavior, AppUserConfig, ConfigIntegrationKind }
  from '../../../src/models/AppConfig';
import Context from "../../../src/models/Context";
import CustomLink from "../../../src/CustomLink";
import Emitter from '../../../src/libraries/Emitter';
import ConfigManager from '../../../src/managers/ConfigManager';
import { RawPushSubscription } from '../../../src/models/RawPushSubscription';
import { MockServiceWorkerGlobalScope } from "../mocks/service-workers/models/MockServiceWorkerGlobalScope";
import { MockServiceWorker } from "../mocks/service-workers/models/MockServiceWorker";
import { MockPushManager } from "../mocks/service-workers/models/MockPushManager";
import { MockServiceWorkerContainer } from "../mocks/service-workers/models/MockServiceWorkerContainer";
import { addServiceWorkerGlobalScopeToGlobal } from "../polyfills/polyfills";
import deepmerge = require("deepmerge");
import { RecursivePartial } from '../../../src/context/shared/utils/Utils';
import { EnvironmentInfo } from  '../../../src/context/browser/models/EnvironmentInfo';

// NodeJS.Global
declare var global: any;

const APP_ID = "34fcbe85-278d-4fd2-a4ec-0f80e95072c5";

export interface ServiceWorkerTestEnvironment extends ServiceWorkerGlobalScope {
  OneSignal: ServiceWorker;
}

export enum HttpHttpsEnvironment {
  Http = "Http",
  Https = "Https"
}

export enum BrowserUserAgent {
  Default = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
  iPad = "Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10",
  iPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25",
  iPod = "Mozilla/5.0 (iPod touch; CPU iPhone OS 7_0_3 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11B511 Safari/9537.53",
  EdgeUnsupported = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10136",
  EdgeUnsupported2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/17.17062",
  EdgeSupported = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/17.17074",
  IE11 = "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko",
  FirefoxMobileUnsupported = "Mozilla/5.0 (Android 4.4; Mobile; rv:47.0) Gecko/47.0 Firefox/47.0",
  FirefoxTabletUnsupported = "Mozilla/5.0 (Android 4.4; Mobile ; rv:47.0) Gecko/47.0 Firefox/47.0",
  FirefoxMobileSupported = "Mozilla/5.0 (Android 4.4; Mobile; rv:44.0) Gecko/48.0 Firefox/48.0",
  FirefoxTabletSupported = "Mozilla/5.0 (Android 4.4; Mobile ; rv:44.0) Gecko/48.0 Firefox/48.0",
  FirefoxWindowsUnSupported = "Mozilla/5.0 (Windows NT x.y; WOW64; rv:44.0) Gecko/20100101 Firefox/44.0",
  FirefoxWindowsSupported = "Mozilla/5.0 (Windows NT x.y; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0",
  FirefoxMacSupported = "Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:47.0) Gecko/20100101 Firefox/47.0",
  FirefoxLinuxSupported = "Mozilla/5.0 (X11; Linux i686 on x86_64; rv:47.0) Gecko/20100101 Firefox/47.0",
  SafariUnsupportedMac= "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/538.32 (KHTML, like Gecko) Version/7.0 Safari/538.4",
  SafariSupportedMac= "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/538.32 (KHTML, like Gecko) Version/7.1 Safari/538.4",
  SafariSupportedMac121= "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15",
  FacebookBrowseriOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 8_2 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12D508 [FBAN/FBIOS;FBAV/27.0.0.10.12;FBBV/8291884;FBDV/iPhone7,1;FBMD/iPhone;FBSN/iPhone OS;FBSV/8.2;FBSS/3;]",
  FacebookBrowserAndroid = "Mozilla/5.0 (Linux; Android 5.1; Archos Diamond S Build/LMY47D; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/51.0.2704.81 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/87.0.0.17.79;]",
  ChromeAndroidSupported = "Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/54 Mobile Safari/535.19",
  ChromeWindowsSupported = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2228.0 Safari/537.36",
  ChromeMacSupported = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.1636.0 Safari/537.36",
  ChromeMac10_15 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36",
  ChromeMacSupported69 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.81 Safari/537.36",
  ChromeLinuxSupported = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.1636.0 Safari/537.36",
  ChromeTabletSupported = "Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JWR66Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.1547.72 Safari/537.36",
  ChromeAndroidUnsupported = "Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/41 Mobile Safari/535.19",
  ChromeWindowsUnsupported = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2228.0 Safari/537.36",
  ChromeMacUnsupported = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.1636.0 Safari/537.36",
  ChromeLinuxUnsupported = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.1636.0 Safari/537.36",
  ChromeTabletUnsupported = "Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JWR66Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.1547.72 Safari/537.36",
  YandexDesktopSupportedHigh = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.12785 YaBrowser/17.1.0.2036 Safari/537.36",
  YandexDesktopSupportedLow = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.12785 YaBrowser/15.12.1.6475 Safari/537.36",
  YandexMobileSupported = "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6P Build/N4F26T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 YaBrowser/17.1.2.339.00 Mobile Safari/537.36",
  OperaDesktopSupported = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36 OPR/42.0.2442.806",
  OperaMac10_14 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36 OPR/42.0.2442.806",
  OperaAndroidSupported = "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6P Build/N4F26T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.91 Mobile Safari/537.36 OPR/37.5.2246.114172",
  OperaTabletSupported = "Mozilla/5.0 (Linux; Android 4.1.2; GT-N8000 Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.166 Safari/537.36 OPR/37.0.1396.73172",
  OperaMiniUnsupported = "Mozilla/5.0 (Linux; U; Android 7.1.2; Nexus 6P Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 Mobile Safari/537.36 OPR/24.0.2254.115784",
  VivaldiWindowsSupported = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.89 Vivaldi/1.0.94.2 Safari/537.36",
  VivaldiLinuxSupported = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.105 Safari/537.36 Vivaldi/1.0.162.2",
  VivaldiMacSupported = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.99 Safari/537.36 Vivaldi/1.0.303.52",
  SamsungBrowserSupported = "Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-N910F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile Safari/537.36",
  SamsungBrowserUnsupported = "Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-N910F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.0 Chrome/44.0.2403.133 Mobile Safari/537.36",
  UcBrowserSupported = "Mozilla/5.0 (Linux; U; Android 9; en-US; LM-G710 Build/PKQ1.181105.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.9.10.1159 Mobile Safari/537.36",
  UcBrowserUnsupported = "Mozilla/5.0 (Linux; U; Android 6.0.1; zh-CN; F5121 Build/34.0.A.1.247) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/40.0.2214.89 UCBrowser/11.5.1.944 Mobile Safari/537.36"
}

export interface TestEnvironmentConfig {
  environment?: string;
  initOptions?: any;
  httpOrHttps?: HttpHttpsEnvironment;
  permission?: NotificationPermission;
  pushIdentifier?: string;
  userAgent?: BrowserUserAgent;
  url?: URL;
  initializeAsIframe?: boolean;
  addPrompts?: boolean;
  integration?: ConfigIntegrationKind;
  userConfig?: AppUserConfig;
  overrideServerConfig?: RecursivePartial<ServerAppConfig>;
}

/**
 *
 */
export class TestEnvironment {

  /**
   * Intercepts requests to our virtual DOM to return fake responses.
   */
  static onVirtualDomResourceRequested(resource: any, callback: Function) {
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

  static onVirtualDomDelayedResourceRequested(resource: any, callback: Function) {
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

  static stubServiceWorkerEnvironment(config?: TestEnvironmentConfig): Promise<ServiceWorkerGlobalScope> {
    if (!config)
      config = {};
    // Service workers have a ServiceWorkerGlobalScope set to the 'self' variable, not window
    const serviceWorkerScope = new MockServiceWorkerGlobalScope();

    // Install a fake service worker
    const workerInstance = new MockServiceWorker();
    workerInstance.scriptURL = "https://site.com";
    workerInstance.state = "activated";
    serviceWorkerScope.mockRegistration.active = workerInstance;

    config.environment = "serviceWorker";
    TestEnvironment.stubNotification(config);

    global.ServiceWorkerGlobalScope = MockServiceWorkerGlobalScope;
    addServiceWorkerGlobalScopeToGlobal(serviceWorkerScope);

    global.location = config.url ? config.url : new URL('https://localhost:3001/webpush/sandbox?https=1');
    global.fetch = fetch;
    global.self = global;
    return global;
  }

  static async stubDomEnvironment(config?: TestEnvironmentConfig) {
    if (!config)
      config = {};
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
    }

    let html = '<!doctype html><html><head></head><body></body></html>';
    if (config.addPrompts) {
      html = `<!doctype html><html><head>\
      <div class="${CustomLink.containerClass}"></div>\
      <div class="${CustomLink.containerClass}"></div>\
      <button class="${CustomLink.subscribeClass}"></button>\
      </head><body></body></html>`;
    }

    var windowDef = await new Promise<Window>((resolve, reject) => {
      (jsdom as any).env({
        html: html,
        url: url,
        userAgent: config && config.userAgent ? config.userAgent : BrowserUserAgent.Default,
        features: {
          FetchExternalResources: ["script", "frame", "iframe", "link", "img"],
          ProcessExternalResources: ['script']
        },
        resourceLoader: TestEnvironment.onVirtualDomResourceRequested,
        done: (err: any, window: Window) => {
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
    (windowDef as any).navigator.serviceWorker = new MockServiceWorkerContainer();
    (windowDef as any).localStorage = new DOMStorage(null);
    (windowDef as any).sessionStorage = new DOMStorage(null);
    const { TextEncoder, TextDecoder } = require('text-encoding');
    (windowDef as any).TextEncoder = TextEncoder;
    (windowDef as any).TextDecoder = TextDecoder;
    (windowDef as any).isSecureContext = isSecureContext;
    TestEnvironment.addCustomEventPolyfill(windowDef);

    let topWindow = config.initializeAsIframe ? {
      location: {
        get origin() {
          throw new Error("SecurityError: Permission denied to access property 'origin' on cross-origin object");
        }
      }
    } as any : windowDef;
    jsdom.reconfigureWindow(windowDef, { top: topWindow });
    Object.assign(global, windowDef);
    return jsdom;
  }

  static addCustomEventPolyfill(windowDef: any) {
    function CustomEvent(event: any, params: any) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      const evt = document.createEvent( 'CustomEvent' );
      evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
      return evt;
    }
    CustomEvent.prototype = windowDef.Event.prototype;
    global.CustomEvent = CustomEvent;
  }

  static stubNotification(config: TestEnvironmentConfig) {
    // TODO: Move in MockNotification into class file when updating to TS 3
    global.Notification = {
      permission: config.permission ? config.permission: NotificationPermission.Default,
      maxActions: 2,
      requestPermission: function(callback?: Function) {
        if (callback)
          callback(config.pushIdentifier);
      }
    };

    // window is only defined in DOM environment (not in SW)
    if (config.environment === "dom") {
      global.window.Notification = global.Notification;
    }
  }

  static stubNotifyButtonTransitionEvents() {
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
  }

  static async initializeForServiceWorker(config: TestEnvironmentConfig = {}) {
    // Erase and reset IndexedDb database name to something random
    Database.resetInstance();
    Database.databaseInstanceName = Random.getRandomString(10);

    return TestEnvironment.stubServiceWorkerEnvironment(config);
  }

  static async initialize(config: TestEnvironmentConfig = {}): Promise<OneSignal> {
    // Erase and reset IndexedDb database name to something random
    Database.resetInstance();
    Database.databaseInstanceName = Random.getRandomString(10);

    global.OneSignal = OneSignal;
    global.OneSignal.config = config.initOptions ? config.initOptions : {};
    global.OneSignal.initialized = true;
    global.OneSignal.emitter = new Emitter();
    SdkEnvironment.getTestEnv = () => TestEnvironmentKind.UnitTesting;
    await TestEnvironment.stubDomEnvironment(config);
    TestEnvironment.stubNotifyButtonTransitionEvents();
    config.environment = "dom";
    TestEnvironment.stubNotification(config);
    return global.OneSignal;
  }

  static overrideEnvironmentInfo(envInfo: Partial<EnvironmentInfo> = {}) {
    global.OneSignal.environmentInfo = { ...global.OneSignal.environmentInfo, ...envInfo };
  }

  // This allows detailed error printing of test that fails due to missing network mock or other reasons.
  static addUnhandledRejectionHandler() {
    process.on('unhandledRejection', (error: object) => {
      console.log("error", error);
    });

    process.on('uncaughtException', (error: object) => {
      console.log("error", error);
    });
  }

  static async getFakePushSubscription(): Promise<PushSubscription> {
    return await new MockPushManager().subscribe({
      userVisibleOnly: true,
      applicationServerKey: Random.getRandomUint8Array(65).buffer
    });
  }

  static getFakeMergedConfig(config: TestEnvironmentConfig): AppConfig {
    const fakeUserConfig = config.userConfig || TestEnvironment.getFakeAppUserConfig();
    const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(
      config.integration || ConfigIntegrationKind.Custom,
      config.httpOrHttps ? config.httpOrHttps === HttpHttpsEnvironment.Https : undefined,
      config.overrideServerConfig
    );
    const configManager = new ConfigManager();
    const fakeMergedConfig = configManager.getMergedConfig(
      fakeUserConfig,
      fakeServerConfig
    );
    return fakeMergedConfig;
  }

  static mockInternalOneSignal(config?: TestEnvironmentConfig) {
    config = config || { 
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,
    };

    const fakeMergedConfig: AppConfig = TestEnvironment.getFakeMergedConfig(config);
    OneSignal.context = new Context(fakeMergedConfig);
    OneSignal.config = fakeMergedConfig;
  }

  static getFakeAppConfig(appId: string = APP_ID): AppConfig {
    return {
      appId,
      subdomain: undefined,
      httpUseOneSignalCom: false,
      cookieSyncEnabled: true,
      restrictedOriginEnabled: true,
      origin: 'https://example.com',
      metrics: {
        enable: true,
        mixpanelReportingToken: 'mixpanel-token'
      },
      enableOnSession: true,
      safariWebId: undefined,
      vapidPublicKey: 'ImZRmh5eOX2onbZDIrSuC6ym6nyMRQ03OwxYQWYgejhN30Zs9VKKuKydxdppZiDlGLvuN3dGuFb66tD2wO1pm9e',
      onesignalVapidPublicKey: '3y84Zfh6QXKVidhc0RvBciX5DUEznaaiJY5aoB05TWvfvKn2duHcrm1mMyIboDLGc5jC8I5YncqDz2ERRn6QnZ5',
      userConfig: {},
    };
  }

  // TODO: make sure new appId param does not conflict with app_id in overrideServerConfig section
  static getFakeServerAppConfig(
    configIntegrationKind: ConfigIntegrationKind,
    isHttps: boolean = true,
    overrideServerConfig: RecursivePartial<ServerAppConfig> | null = null,
    appId: string = APP_ID
  ): ServerAppConfig {
    if (configIntegrationKind === ConfigIntegrationKind.Custom) {
      const customConfigHttps: ServerAppConfig = {
        success: true,
        app_id: appId,
        features: {
          restrict_origin: {
            enable: true
          },
          cookie_sync: {
            enable: false
          },
          metrics: {
            enable: true,
            mixpanel_reporting_token: "7c2582e45a6ecf1501aa3ca7887f3673"
          },
          web_on_focus_enabled: true,
          session_threshold: 30
        },
        config: {
          autoResubscribe: true,
          siteInfo: {
            name: "localhost https",
            origin: "https://localhost:3001",
            proxyOrigin: undefined,
            defaultIconUrl: null,
            proxyOriginEnabled: true
          },
          integration: {
            kind: ConfigIntegrationKind.Custom
          },
          staticPrompts: {
            native: {
              enabled: false,
              autoPrompt: false,
            },
            bell: {
              enabled: false,
              size: "large",
              color: {
                main: "red",
                accent: "white"
              },
              dialog: {
                main: {
                  title: "Manage Notifications",
                  subscribeButton: "Subscribe",
                  unsubscribeButton: "Unsubscribe"
                },
                blocked: {
                  title: "Unblock Notifications",
                  message: "Click here to learn how to unblock notifications."
                }
              },
                offset: {
                  left: 0,
                    right: 0,
                    bottom: 0
                },
                message: {
                    subscribing: "Thanks for subscribing!",
                    unsubscribing: "You won't receive notifications again"
                },
                tooltip: {
                    blocked: "You've blocked notifications",
                    subscribed: "You're subscribed to notifications",
                    unsubscribed: "Subscribe to notifications"
                },
                location: "bottom-right",
                hideWhenSubscribed: false,
                customizeTextEnabled: true
            },
            slidedown: {
                enabled: false,
                autoPrompt: false,
                acceptButton: "Allow",
                cancelButton: "No Thanks",
                actionMessage: "We'd like to send you notifications for the latest news and updates.",
                customizeTextEnabled: true
            },
            fullscreen: {
                enabled: false,
                title: "example.com",
                caption: "You can unsubscribe anytime",
                message: "This is an example notification message.",
                acceptButton: "Continue",
                cancelButton: "No Thanks",
                actionMessage: "We'd like to send you notifications for the latest news and updates.",
                autoAcceptTitle: "Click Allow",
                customizeTextEnabled: true
            },
            customlink: {
              enabled: false,
              style: "button",
              size: "medium",
              color: {
                button: "#e54b4d",
                text: "#ffffff"
              },
              text: {
                subscribe: "Subscribe to push notifications",
                unsubscribe: "Unsubscribe from push notifications",
                explanation: ""
              },
              unsubscribeEnabled: true
            },
          },
          webhooks: {
            enable: false
          },
          serviceWorker: {
            customizationEnabled: false,
            path: "/",
            workerName: "OneSignalSDKWorker.js",
            registrationScope: "/",
            updaterWorkerName: "OneSignalSDKUpdaterWorker.js"
          },
          welcomeNotification: {
            enable: true,
            url: "https://localhost:3001/?_osp=do_not_open",
            title: "localhost https",
            message: "Thanks for subscribing!",
            urlEnabled: false
          },
          vapid_public_key: "BDPplk0FjgsEPIG7Gi2-zbjpBGgM_RJ4c99tWbNvxv7VSKIUV1KA7UUaRsTuBpcTEuaPMjvz_kd8rZuQcgMepng",
          onesignal_vapid_public_key: "BMzCIzYqtgz2Bx7S6aPVK6lDWets7kGm-pgo2H4RixFikUaNIoPqjPBBOEWMAfeFjuT9mAvbe-lckGi6vvNEiW0",
          origin: "https://localhost:3001",
          subdomain: undefined,
          outcomes: {
            direct: {
              enabled: true,
            },
            indirect: {
              enabled: true,
              notification_attribution: {
                limit: 5,
                minutes_since_displayed: 60
              }
            },
            unattributed: {
              enabled: true,
            }
          }
        },
        "generated_at": 1531177265
      };
      if (isHttps) {
        return customConfigHttps;
      }
      return {
        ...customConfigHttps,
        config: {
          ...customConfigHttps.config,
          subdomain: "helloworld123",
          origin: "http://localhost:3000",
          siteInfo: {
            name: "localhost http",
            origin: "http://localhost:3000",
            proxyOrigin: "helloworld123",
            defaultIconUrl: null,
            proxyOriginEnabled: true
          },
          welcomeNotification: {
            enable: true,
            url: "http://localhost:3000/?_osp=do_not_open",
            title: "localhost http",
            message: "Thanks for subscribing!",
            urlEnabled: false
          },
        }
      }
    }

    const remoteConfigMockDefaults: ServerAppConfig = {
      success: true,
      app_id: appId,
      features: {
        restrict_origin: {
          enable: false,
        },
        cookie_sync: {
          enable: false
        },
        metrics: {
          enable: true,
          mixpanel_reporting_token: '7c2582e45a6ecf1501aa3ca7887f3673'
        },
        email: {
          require_auth: true,
        },
        web_on_focus_enabled: true,
        session_threshold: 30
      },
      config: {
        origin: "https://example.com",
        subdomain: undefined,
        http_use_onesignal_com: false,
        autoResubscribe: false,
        staticPrompts: {
          native: {
            enabled: false,
            autoPrompt: false,
          },
          bell: {
            size: 'large',
            color: {
              main: 'red',
              accent: 'white',
            },
            dialog: {
              main: {
                title: 'Manage Notifications',
                subscribeButton: 'Subscribe',
                unsubscribeButton: 'Unsubscribe',
              },
              blocked: {
                title: 'Unblock Notifications',
                message: 'Click here to learn how to unblock notifications.',
              },
            },
            offset: {
              left: 0,
              right: 0,
              bottom: 0,
            },
            enabled: true,
            message: {
              subscribing: 'Thanks for subscribing!',
              unsubscribing: "You won't receive notifications again",
            },
            tooltip: {
              blocked: "You've blocked notifications",
              subscribed: "You're subscribed to notifications",
              unsubscribed: "Subscribe to notifications",
            },
            location: 'bottom-right',
            hideWhenSubscribed: false,
            customizeTextEnabled: true,
          },
          slidedown: {
            enabled: true,
            autoPrompt: true,
            acceptButton: 'Allow',
            cancelButton: 'No Thanks',
            actionMessage: "We'd like to send you notifications for the latest news and updates.",
            customizeTextEnabled: true,
          },
          fullscreen: {
            title: "example.com",
            caption: "You can unsubscribe anytime",
            enabled: true,
            message: "This is an example notification message.",
            acceptButton: "Continue",
            cancelButton: "No Thanks",
            actionMessage: "We'd like to send you notifications for the latest news and updates.",
            autoAcceptTitle: "Click Allow",
            customizeTextEnabled: true,
          },
          customlink: {
            enabled: true,
            style: "button",
            size: "medium",
            color: {
              button: "#e54b4d",
              text: "#ffffff",
            },
            text: {
              subscribe: "Subscribe to push notifications",
              unsubscribe: "Unsubscribe from push notifications",
              explanation: "Get updates from all sorts of things that matter to you",
            },
            unsubscribeEnabled: true,
          }
        },
        siteInfo: {
          name: 'My Website',
          origin: 'https://www.site.com',
          proxyOrigin: undefined,
          defaultIconUrl: 'https://onesignal.com/images/notification_logo.png',
          proxyOriginEnabled: false
        },
        webhooks: {
          enable: false,
          corsEnable: false,
          notificationClickedHook: undefined,
          notificationDismissedHook: undefined,
          notificationDisplayedHook: undefined,
        },
        integration: {
          kind: configIntegrationKind
        },
        serviceWorker: {
          path: undefined,
          workerName: undefined,
          registrationScope: undefined,
          updaterWorkerName: undefined,
          customizationEnabled: true
        },
        setupBehavior: {
          allowLocalhostAsSecureOrigin: false
        },
        welcomeNotification: {
          url: undefined,
          title: undefined,
          enable: false,
          message: undefined,
          urlEnabled: undefined
        },
        notificationBehavior: {
          click: {
            match: NotificationClickMatchBehavior.Exact,
            action: NotificationClickActionBehavior.Navigate
          },
          display: {
            persist: false
          }
        },
        vapid_public_key: 'BLJozaErc0QXdS7ykMyqniAcvfmdoziwfoSN-Mde_OckAbN_XrOC9Zt2Sfz4pD0UnYT5w3frWjF2iTTtjqEBgbE',
        onesignal_vapid_public_key:
          'BMzCIzYqtgz2Bx7S6aPVK6lDWets7kGm-pgo2H4RixFikUaNIoPqjPBBOEWMAfeFjuT9mAvbe-lckGi6vvNEiW0',
        safari_web_id: 'web.onesignal.auto.017d7a1b-f1ef-4fce-a00c-21a546b5491d',
        outcomes: {
          direct: {
            enabled: true,
          },
          indirect: {
            enabled: true,
            notification_attribution: {
              minutes_since_displayed: 60,
              limit: 5
            }
          },
          unattributed: {
            enabled: true,
          }
        }
      },
      generated_at: 1511912065
    };

    return deepmerge(
      <ServerAppConfig>remoteConfigMockDefaults as Partial<ServerAppConfig>,
      overrideServerConfig || {}
      );
  }

  static getFakeAppUserConfig(appId: string = APP_ID): AppUserConfig {
    return {
      appId,
      autoRegister: true,
      autoResubscribe: true,
      path: '/fake-page',
      serviceWorkerPath: 'fakeWorkerName.js',
      serviceWorkerUpdaterPath: 'fakeUpdaterWorkerName.js',
      serviceWorkerParam: { scope: '/fake-page' },
      subdomainName: 'fake-subdomain',
      promptOptions: {
        native: {
          enabled: false,
          autoPrompt: false,
        },
        slidedown: {
          enabled: true,
          autoPrompt: true,
          actionMessage: "slidedown action message",
          acceptButtonText: 'slidedown accept button',
          cancelButtonText: 'slidedown cancel button',
        },
        fullscreen: {
          enabled: true,
          actionMessage: 'fullscreen action message',
          acceptButton: 'fullscreenaccept button',
          cancelButton: 'fullscreencancel button',
          title: 'fullscreen notification title',
          message: 'fullscreen notification message',
          caption: 'fullscreen notification caption'
        }, 
        customlink: {
          enabled: false,
          style: "link",
          size: "small",
          color: {
            button: "#000000",
            text: "#ffffff",
          },
          text: {
            subscribe: "Let's do it",
            unsubscribe: "I don't want it anymore",
            explanation: "Wanna stay in touch?",
          },
          unsubscribeEnabled: true,
        },
      },
      welcomeNotification: {
        disable: false,
        title: 'Welcome notification title',
        message: 'Welcome notification message',
        url: 'https://fake-config.com/welcome'
      },
      notifyButton: {
        enable: true,
        displayPredicate: undefined,
        size: 'medium',
        position: 'bottom-left',
        offset: {
          bottom: '1px',
          left: '1px',
          right: '1px'
        },
        colors: {
          'circle.background': '1',
          'circle.foreground': '1',
          'badge.background': '1',
          'badge.foreground': '1',
          'badge.bordercolor': 'black',
          'pulse.color': '1',
          'dialog.button.background.hovering': '1',
          'dialog.button.background.active': '1',
          'dialog.button.background': '1',
          'dialog.button.foreground': '1',
        },
        text: {
          'tip.state.unsubscribed': '1',
          'tip.state.subscribed': '1',
          'tip.state.blocked': '1',
          'message.prenotify': "Click to subscribe to notifications",
          'message.action.subscribing': '1',
          'message.action.subscribed': '1',
          'message.action.resubscribed': '1',
          'message.action.unsubscribed': '1',
          'dialog.main.title': '1',
          'dialog.main.button.subscribe': '1',
          'dialog.main.button.unsubscribe': '1',
          'dialog.blocked.title': '1',
          'dialog.blocked.message': '1',
        },
      },
      persistNotification: false,
      webhooks: {
        cors: true,
        'notification.displayed': 'https://fake-config.com/notification-displayed',
        'notification.clicked': 'https://fake-config.com/notification-clicked',
        'notification.dismissed': 'https://fake-config.com/notification-dismissed',
      },
      notificationClickHandlerMatch: NotificationClickMatchBehavior.Origin,
      notificationClickHandlerAction: NotificationClickActionBehavior.Focus,
      allowLocalhostAsSecureOrigin: true,
    };
  }

  static getFakeRawPushSubscription(): RawPushSubscription {
    const pushSubscription: RawPushSubscription = new RawPushSubscription();
    pushSubscription.w3cAuth = "7QdgQYTjZIeiCuLgopqeww";
    pushSubscription.w3cP256dh = "BBGhFwQ146CSOWhuz-r4ItRK2cQuZ4FZNkiW7uTEpf2JsPfxqbWtQvfGf4FvnaZ35hqjkwbtUUIn8wxwhhc3O_0";
    pushSubscription.w3cEndpoint = new URL("https://fcm.googleapis.com/fcm/send/c8rEdO3xSaQ:APA91bH51jGBPBVSxoZVLq-xwen6oHYmGVpyjR8qG_869A-skv1a5G9PQ5g2S5O8ujJ2y8suHaPF0psX5590qrZj_WnWbVfx2q4u2Vm6_Ofq-QGBDcomRziLzTn6uWU9wbrrmL6L5YBh");
    return pushSubscription;
  }
}
