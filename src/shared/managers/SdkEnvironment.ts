import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../errors/InvalidArgumentError';
import Environment from '../helpers/Environment';
import { EnvironmentKind } from '../models/EnvironmentKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { EnvVariables } from '../utils/EnvVariables';

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
    const buildType = EnvVariables.BUILD_TYPE();
    switch (buildType) {
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
    const apiType = EnvVariables.API_TYPE();
    switch (apiType) {
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
    const apiOrigin = EnvVariables.API_ORIGIN();

    switch (buildEnv) {
      case EnvironmentKind.Development:
        if (SdkEnvironment.isTurbineEndpoint(action)) {
          return new URL(`http://${apiOrigin}:${TURBINE_API_URL_PORT}/api/v1`);
        }
        return new URL(`http://${apiOrigin}:${API_URL_PORT}/api/v1`);
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
    const buildOrigin = EnvVariables.BUILD_ORIGIN();
    const isHttps = EnvVariables.IS_HTTPS();

    const protocol = isHttps ? 'https' : 'http';
    const port = isHttps ? RESOURCE_HTTPS_PORT : RESOURCE_HTTP_PORT;
    let origin: string;

    switch (buildEnv) {
      case EnvironmentKind.Development:
        origin = EnvVariables.NO_DEV_PORT()
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
