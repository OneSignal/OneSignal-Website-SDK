import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../errors/InvalidArgumentError';
import Environment from '../helpers/Environment';
import { EnvironmentKind } from '../models/EnvironmentKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import {
  API_ORIGIN,
  API_TYPE,
  BUILD_ORIGIN,
  BUILD_TYPE,
  IS_HTTPS,
  NO_DEV_PORT,
} from '../utils/EnvVariables';

const RESOURCE_HTTP_PORT = 4000;
const RESOURCE_HTTPS_PORT = 4001;
const API_URL_PORT = 3000;
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
    const buildType = BUILD_TYPE();

    // using if statements to have better dead code elimination
    if (buildType === 'development') return EnvironmentKind.Development;
    if (buildType === 'staging') return EnvironmentKind.Staging;
    return EnvironmentKind.Production;
  }

  /**
   * Returns development staging, or production.
   *
   * Refers to which API environment should be used. These constants are set when building the SDK
   */
  public static getApiEnv(): EnvironmentKind {
    const apiType = API_TYPE();

    // using if statements to have better dead code elimination
    if (apiType === 'development') return EnvironmentKind.Development;
    if (apiType === 'staging') return EnvironmentKind.Staging;
    return EnvironmentKind.Production;
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
    if (
      typeof self !== 'undefined' &&
      typeof ServiceWorkerGlobalScope !== 'undefined'
    ) {
      return WindowEnvironmentKind.ServiceWorker;
    }
    if (typeof window === 'undefined') {
      throw Error('OneSignalSDK: Unsupported JS runtime!');
    }
    return WindowEnvironmentKind.Host;
  }

  /**
   * Returns the URL object representing the components of OneSignal's API
   * endpoint.
   */
  public static getOneSignalApiUrl(
    buildEnv: EnvironmentKind = SdkEnvironment.getApiEnv(),
    action?: string,
  ): URL {
    const apiOrigin = API_ORIGIN();
    switch (buildEnv) {
      case EnvironmentKind.Development:
        if (SdkEnvironment.isTurbineEndpoint(action)) {
          return new URL(`http://${apiOrigin}:${TURBINE_API_URL_PORT}/api/v1/`);
        }
        return new URL(`http://${apiOrigin}:${API_URL_PORT}/api/v1/`);
      case EnvironmentKind.Staging:
        return new URL(`https://${apiOrigin}/api/v1/`);
      case EnvironmentKind.Production:
        return new URL('https://api.onesignal.com/');
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

  public static getOneSignalResourceUrlPath(): URL {
    const buildEnv = SdkEnvironment.getBuildEnv();
    const buildOrigin = BUILD_ORIGIN();
    const isHttps = IS_HTTPS();

    const protocol = isHttps ? 'https' : 'http';
    const port = isHttps ? RESOURCE_HTTPS_PORT : RESOURCE_HTTP_PORT;
    let origin: string;

    // using if statements to have better dead code elimination
    if (buildEnv === EnvironmentKind.Development) {
      origin = NO_DEV_PORT()
        ? `${protocol}://${buildOrigin}`
        : `${protocol}://${buildOrigin}:${port}`;
    } else if (buildEnv === EnvironmentKind.Staging) {
      origin = `https://${buildOrigin}`;
    } else if (buildEnv === EnvironmentKind.Production) {
      origin = 'https://onesignal.com';
    } else {
      throw new InvalidArgumentError(
        'buildEnv',
        InvalidArgumentReason.EnumOutOfRange,
      );
    }
    return new URL(`${origin}/sdks/web/v16`);
  }

  public static getOneSignalCssFileName(): string {
    const baseFileName = 'OneSignalSDK.page.styles.css';
    const buildEnv = SdkEnvironment.getBuildEnv();

    // using if statements to have better dead code elimination
    if (buildEnv === EnvironmentKind.Development) return `Dev-${baseFileName}`;
    if (buildEnv === EnvironmentKind.Staging) return `Staging-${baseFileName}`;
    if (buildEnv === EnvironmentKind.Production) return baseFileName;
    throw new InvalidArgumentError(
      'buildEnv',
      InvalidArgumentReason.EnumOutOfRange,
    );
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
