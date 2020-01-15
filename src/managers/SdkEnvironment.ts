import { EnvironmentKind } from '../models/EnvironmentKind';
import { TestEnvironmentKind } from '../models/TestEnvironmentKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';
import { IntegrationKind } from "../models/IntegrationKind";
import ServiceWorkerHelper from "../helpers/ServiceWorkerHelper";
import Environment from "../Environment";
import OneSignalUtils from "../utils/OneSignalUtils";
import OneSignal from "../OneSignal";

const RESOURCE_HTTP_PORT = 4000;
const RESOURCE_HTTPS_PORT = 4001;
const API_URL_PORT = 3001;

export default class SdkEnvironment {
  /**
   * Returns development, staging, or production.
   *
   * The magic constants used to detect the environment is set or unset when
   * building the SDK.
   */
  public static getBuildEnv(): EnvironmentKind {
    if (typeof __BUILD_TYPE__ === "undefined") {
      return EnvironmentKind.Production;
    }
    switch(__BUILD_TYPE__){
      case "development":
        return EnvironmentKind.Development;
      case "staging":
        return EnvironmentKind.Staging;
      case "production":
        return EnvironmentKind.Production;
      default:
        return EnvironmentKind.Production;
    }
  }

  /**
   * Returns development staging, or production.
   * 
   * Refers to which API environment should be used. These constants are set when building the SDK
   */
  public static getApiEnv(): EnvironmentKind {
    if (typeof __API_TYPE__ === "undefined") {
      return EnvironmentKind.Production;
    }
    switch(__API_TYPE__){
      case "development":
        return EnvironmentKind.Development;
      case "staging":
        return EnvironmentKind.Staging;
      case "production":
        return EnvironmentKind.Production;
      default:
        return EnvironmentKind.Production;
    }
  }

  /**
   * Determines whether the current frame context executing this function is part of a:
   *
   *  a) HTTP site using a proxy subscription origin
   *
   *  b) or, HTTPS site using a proxy subscription origin
   *
   *  c) or, HTTPS site using its own origin for subscribing
   *
   * The determination affects permissions and subscription:
   *
   *  a) Because the parent (top frame) of the proxy origin frame is HTTP, the entire context is
   *  insecure. In the proxy origin frame, notification permissions are always "denied", access to
   *  the service worker's registration throws a security error, and no service worker controls the
   *  proxy origin frame.
   *
   *  b) The context is secure. In the proxy origin frame, notification permissions are "granted" if
   *  actually granted otherwise "denied" if either unprompted or blocked. The service worker
   *  controls the proxy origin frame and access to the service worker's registration is allowed.
   *  Requesting permissions from child frames is not allowed. Subscribing from child frames wasn't
   *  allowed but is now allowed.
   *
   *  c) All features are allowed.
   *
   * @param usingProxyOrigin Using a subdomain of os.tc or onesignal.com for subscribing to push.
   */
  public static async getIntegration(usingProxyOrigin?: boolean): Promise<IntegrationKind> {
    if (Environment.isSafari()) {
      /* HTTP doesn't apply to Safari sites */
      return IntegrationKind.Secure;
    }

    const isTopFrame = (window === window.top);
    const isHttpsProtocol = window.location.protocol === "https:";

    // For convenience, try to look up usingProxyOrigin instead of requiring it to be passed in
    if (usingProxyOrigin === undefined) {
      if (typeof OneSignal !== "undefined" && OneSignal.context && OneSignal.context.appConfig) {
          usingProxyOrigin = !!OneSignal.context.appConfig.subdomain;
      } else {
        throw new InvalidArgumentError("usingProxyOrigin", InvalidArgumentReason.Empty);
      }
    }

    /*
      Executing from the top frame, we can easily determine whether we're HTTPS or HTTP.

      Executing from a child frame of any depth, we can check the current frame's protocol. If it's
      HTTP it's definitely insecure. If it's HTTPS, we attempt to call
      ServiceWorkerContainer.getRegistration and see if the call throws an error or succeeds. If the
      call throws an error, we can assume some parent frame in the chain above us is insecure.
     */
    if (isTopFrame) {
      if (isHttpsProtocol) {
        return usingProxyOrigin ?
          IntegrationKind.SecureProxy :
          IntegrationKind.Secure;
      } else {
        // If localhost and allowLocalhostAsSecureOrigin, it's still considered secure
        if (OneSignalUtils.isLocalhostAllowedAsSecureOrigin() &&
          (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
          return IntegrationKind.Secure;
        }
        
        /* The case of HTTP and not using a proxy origin isn't possible, because the SDK will throw
        an initialization error stating a proxy origin is required for HTTP sites. */
        return IntegrationKind.InsecureProxy;
      }
    } else {
      if (isHttpsProtocol) {
        /* Check whether any parent frames are insecure */
        const isFrameContextInsecure = await SdkEnvironment.isFrameContextInsecure();
        if (isFrameContextInsecure) {
          return IntegrationKind.InsecureProxy;
        } else {
          return usingProxyOrigin ?
          IntegrationKind.SecureProxy :
          IntegrationKind.Secure;
        }
      } else {
        /*
        Because this frame is insecure, the entire chain is insecure.

        The case of HTTP and not using a proxy origin isn't possible, because the SDK will throw an
        initialization error stating a proxy origin is required for HTTP sites. */
        return IntegrationKind.InsecureProxy;
      }
    }
  }

  /**
   * From a child frame, returns true if the current frame context is insecure.
   *
   * This is used to check if isPushNotificationsEnabled() should grab the service worker
   * registration. In an HTTPS iframe of an HTTP page, getting the service worker registration would
   * throw an error.
   *
   * This method can trigger console warnings due to using ServiceWorkerContainer.getRegistration in
   * an insecure frame.
   */
  public static async isFrameContextInsecure() {
    // If we are the top frame, or service workers aren't available, don't run this check
    if (
      window === window.top ||
      !('serviceWorker' in navigator) ||
      typeof navigator.serviceWorker.getRegistration === 'undefined'
    ) {
      return false;
    }

    // Will be null if there was an issue retrieving a status
    const registrationResult = await ServiceWorkerHelper.getRegistration();
    return !registrationResult;
  }

  public static isInsecureOrigin() {
    return window.location.protocol === "http:";
  }

  /**
   * Describes the current frame context.
   */
  public static getWindowEnv(): WindowEnvironmentKind {
    if (typeof window === "undefined") {
      if (typeof self !== "undefined" && typeof ServiceWorkerGlobalScope !== "undefined") {
        return WindowEnvironmentKind.ServiceWorker;
      } else {
        return WindowEnvironmentKind.Unknown;
      }
    }
    else {
      // If the window is the root top-most level
      if (window === window.top) {
        if (location.href.indexOf("initOneSignal") !== -1 ||
          (location.pathname === '/subscribe' &&
            location.search === '') &&
          (
            location.hostname.endsWith('.onesignal.com') ||
            location.hostname.endsWith('.os.tc') ||
            (location.hostname.indexOf('.localhost') !== -1 &&
              SdkEnvironment.getBuildEnv() === EnvironmentKind.Development)
          )
        ) {
          return WindowEnvironmentKind.OneSignalSubscriptionPopup;
        }
        else {
          return WindowEnvironmentKind.Host;
        }
      }
      else if (location.pathname === '/webPushIframe') {
        return WindowEnvironmentKind.OneSignalProxyFrame;
      } else if (location.pathname === '/webPushModal') {
        return WindowEnvironmentKind.OneSignalSubscriptionModal;
      }
      else {
        return WindowEnvironmentKind.CustomIframe;
      }
    }
  }

  /**
   * Describes whether the SDK is built in tests mode or not.
   *
   * This method is overriden when tests are run.
   */
  public static getTestEnv(): TestEnvironmentKind {
    return typeof __TEST__ === "undefined" ?
      TestEnvironmentKind.UnitTesting :
      TestEnvironmentKind.None;
  }

  /**
   * Returns build-specific prefixes used for operations like registering the
   * service worker.
   *
   * For example, in staging the registered service worker filename is
   * Staging-OneSignalSDKWorker.js.
   */
  public static getBuildEnvPrefix(buildEnv: EnvironmentKind = SdkEnvironment.getBuildEnv()) : string {
    switch (buildEnv) {
      case EnvironmentKind.Development:
        return 'Dev-';
      case EnvironmentKind.Staging:
        return 'Staging-';
      case EnvironmentKind.Production:
        return '';
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }
  }

  /**
   * Returns the URL object representing the components of OneSignal's API
   * endpoint.
   */
  public static getOneSignalApiUrl(buildEnv: EnvironmentKind = SdkEnvironment.getApiEnv()): URL {
    const apiOrigin = (typeof __API_ORIGIN__ !== "undefined") ? __API_ORIGIN__ || "localhost" : "localhost";

    switch (buildEnv) {
      case EnvironmentKind.Development:
        return new URL(`https://${apiOrigin}:${API_URL_PORT}/api/v1`);
      case EnvironmentKind.Staging:
        return new URL(`https://${window.location.host}/api/v1`);
      case EnvironmentKind.Production:
        return new URL('https://onesignal.com/api/v1');
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }
  }

  public static getOneSignalResourceUrlPath(buildEnv: EnvironmentKind = SdkEnvironment.getBuildEnv()): URL {
    const buildOrigin = (typeof __BUILD_ORIGIN__ !== "undefined") ? __BUILD_ORIGIN__ || "localhost" : "localhost";
    const isHttps = (typeof __IS_HTTPS__ !== "undefined") ? __IS_HTTPS__ : true;
    let origin: string;
    const protocol = isHttps ? "https" : "http";
    const port = isHttps ? RESOURCE_HTTPS_PORT : RESOURCE_HTTP_PORT;

    switch (buildEnv) {
      case EnvironmentKind.Development:
        origin = `${protocol}://${buildOrigin}:${port}`;
        break;
      case EnvironmentKind.Staging:
        origin = `https://${window.location.host}`;
        break;
      case EnvironmentKind.Production:
        origin = "https://onesignal.com";
        break;
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }

    return new URL(`${origin}/sdks`);
  }

  public static getOneSignalCssFileName(buildEnv: EnvironmentKind = SdkEnvironment.getBuildEnv()): string {
    const baseFileName = "OneSignalSDKStyles.css";

    switch (buildEnv) {
      case EnvironmentKind.Development:
        return `Dev-${baseFileName}`;
      case EnvironmentKind.Staging:
        return `Staging-${baseFileName}`;
      case EnvironmentKind.Production:
        return baseFileName;
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }
  }
}
