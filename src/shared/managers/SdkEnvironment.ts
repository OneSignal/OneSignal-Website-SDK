import { EnvironmentKind } from '../models/EnvironmentKind';
import { TestEnvironmentKind } from '../models/TestEnvironmentKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../errors/InvalidArgumentError';
import Environment from '../helpers/Environment';

const RESOURCE_HTTP_PORT = 4000;
const RESOURCE_HTTPS_PORT = 4001;
const API_URL_PORT = 3001;
const TURBINE_API_URL_PORT = 18080;
const TURBINE_ENDPOINTS = ['outcomes', 'on_focus'];

declare let self: ServiceWorkerGlobalScope | undefined;

export default class SdkEnvironment {
  /**
   * Returns development, staging, or production.
   *
   * The magic constants used to detect the environment is set or unset when
   * building the SDK.
   */
  public static getBuildEnv(): EnvironmentKind {
    if (typeof __BUILD_TYPE__ === 'undefined') {
      return EnvironmentKind.Production;
    }
    switch (__BUILD_TYPE__) {
      case 'development':
        return EnvironmentKind.Development;
      case 'staging':
        return EnvironmentKind.Staging;
      case 'production':
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
    if (typeof __API_TYPE__ === 'undefined') {
      return EnvironmentKind.Production;
    }
    switch (__API_TYPE__) {
      case 'development':
        return EnvironmentKind.Development;
      case 'staging':
        return EnvironmentKind.Staging;
      case 'production':
        return EnvironmentKind.Production;
      default:
        return EnvironmentKind.Production;
    }
  }

  public static isInsecureOrigin() {
    return !window.isSecureContext;
  }

  static getOrigin(): string {
    if (Environment.isBrowser()) {
      return window.location.origin;
    } else if (
      typeof self !== 'undefined' &&
      typeof ServiceWorkerGlobalScope !== 'undefined'
    ) {
      return self.location.origin;
    }
    return 'Unknown';
  }

  /**
   * Describes the current frame context.
   */
  public static getWindowEnv(): WindowEnvironmentKind {
    if (typeof window === 'undefined') {
      if (
        typeof self !== 'undefined' &&
        typeof ServiceWorkerGlobalScope !== 'undefined'
      ) {
        return WindowEnvironmentKind.ServiceWorker;
      } else {
        throw Error('OneSignalSDK: Unsupported JS runtime!');
      }
    }
    return WindowEnvironmentKind.Host;
  }

  /**
   * Describes whether the SDK is built in tests mode or not.
   *
   * This method is overriden when tests are run.
   */
  public static getTestEnv(): TestEnvironmentKind {
    return typeof __TEST__ === 'undefined'
      ? TestEnvironmentKind.UnitTesting
      : TestEnvironmentKind.None;
  }

  /**
   * Returns build-specific prefixes used for operations like registering the
   * service worker.
   *
   * For example, in staging the registered service worker filename is
   * Staging-OneSignalSDKWorker.js.
   */
  public static getBuildEnvPrefix(
    buildEnv: EnvironmentKind = SdkEnvironment.getBuildEnv(),
  ): string {
    switch (buildEnv) {
      case EnvironmentKind.Development:
        return 'Dev-';
      case EnvironmentKind.Staging:
        return 'Staging-';
      case EnvironmentKind.Production:
        return '';
      default:
        throw new InvalidArgumentError(
          'buildEnv',
          InvalidArgumentReason.EnumOutOfRange,
        );
    }
  }

  /**
   * Returns the URL object representing the components of OneSignal's API
   * endpoint.
   */
  public static getOneSignalApiUrl(
    buildEnv: EnvironmentKind = SdkEnvironment.getApiEnv(),
    action?: string,
  ): URL {
    const apiOrigin =
      typeof __API_ORIGIN__ !== 'undefined'
        ? __API_ORIGIN__ || 'localhost'
        : 'localhost';

    switch (buildEnv) {
      case EnvironmentKind.Development:
        if (SdkEnvironment.isTurbineEndpoint(action)) {
          return new URL(`https://${apiOrigin}:${TURBINE_API_URL_PORT}/api/v1`);
        }
        return new URL(`https://${apiOrigin}:${API_URL_PORT}/api/v1`);
      case EnvironmentKind.Staging:
        return new URL(`https://${apiOrigin}/api/v1`);
      case EnvironmentKind.Production:
        return new URL('https://onesignal.com/api/v1');
      default:
        throw new InvalidArgumentError(
          'buildEnv',
          InvalidArgumentReason.EnumOutOfRange,
        );
    }
  }

  /**
   * Returns the URL object pointing to our static resources location
   */
  public static getOneSignalStaticResourcesUrl(): URL {
    return new URL('https://media.onesignal.com/web-sdk');
  }

  public static getOneSignalResourceUrlPath(
    buildEnv: EnvironmentKind = SdkEnvironment.getBuildEnv(),
  ): URL {
    const buildOrigin =
      typeof __BUILD_ORIGIN__ !== 'undefined'
        ? __BUILD_ORIGIN__ || 'localhost'
        : 'localhost';
    const isHttps = typeof __IS_HTTPS__ !== 'undefined' ? __IS_HTTPS__ : true;
    let origin: string;
    const protocol = isHttps ? 'https' : 'http';
    const port = isHttps ? RESOURCE_HTTPS_PORT : RESOURCE_HTTP_PORT;

    switch (buildEnv) {
      case EnvironmentKind.Development:
        origin = __NO_DEV_PORT__
          ? `${protocol}://${buildOrigin}`
          : `${protocol}://${buildOrigin}:${port}`;
        break;
      case EnvironmentKind.Staging:
        origin = `https://${buildOrigin}`;
        break;
      case EnvironmentKind.Production:
        origin = 'https://onesignal.com';
        break;
      default:
        throw new InvalidArgumentError(
          'buildEnv',
          InvalidArgumentReason.EnumOutOfRange,
        );
    }

    return new URL(`${origin}/sdks/web/v16`);
  }

  public static getOneSignalCssFileName(
    buildEnv: EnvironmentKind = SdkEnvironment.getBuildEnv(),
  ): string {
    const baseFileName = 'OneSignalSDK.page.styles.css';

    switch (buildEnv) {
      case EnvironmentKind.Development:
        return `Dev-${baseFileName}`;
      case EnvironmentKind.Staging:
        return `Staging-${baseFileName}`;
      case EnvironmentKind.Production:
        return baseFileName;
      default:
        throw new InvalidArgumentError(
          'buildEnv',
          InvalidArgumentReason.EnumOutOfRange,
        );
    }
  }

  static isTurbineEndpoint(action?: string): boolean {
    if (!action) {
      return false;
    }

    return TURBINE_ENDPOINTS.some(
      (turbine_endpoint) => action.indexOf(turbine_endpoint) > -1,
    );
  }
}
