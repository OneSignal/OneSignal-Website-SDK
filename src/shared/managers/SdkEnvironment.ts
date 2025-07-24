import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../errors/InvalidArgumentError';
import Environment from '../helpers/EnvironmentHelper';
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

// TODO: remove this file
export default class SdkEnvironment {
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
  public static getOneSignalApiUrl({
    action,
    legacy = false,
  }: {
    action?: string;
    legacy?: boolean;
  } = {}): URL {
    // using if statements to have better dead code elimination
    if (API_TYPE === EnvironmentKind.Development) {
      return SdkEnvironment.isTurbineEndpoint(action)
        ? new URL(`http://${API_ORIGIN}:${TURBINE_API_URL_PORT}/api/v1/`)
        : new URL(`http://${API_ORIGIN}:${API_URL_PORT}/api/v1/`);
    }

    if (API_TYPE === EnvironmentKind.Staging)
      return new URL(`https://${API_ORIGIN}/api/v1/`);

    if (API_TYPE === EnvironmentKind.Production)
      return new URL(
        legacy ? 'https://onesignal.com/api/v1/' : 'https://api.onesignal.com/',
      );

    throw new InvalidArgumentError(
      'buildEnv',
      InvalidArgumentReason.EnumOutOfRange,
    );
  }

  /**
   * Returns the URL object pointing to our static resources location
   */
  public static getOneSignalStaticResourcesUrl(): URL {
    return new URL('https://media.onesignal.com/web-sdk');
  }

  public static getOneSignalResourceUrlPath(): URL {
    const protocol = IS_HTTPS ? 'https' : 'http';
    const port = IS_HTTPS ? RESOURCE_HTTPS_PORT : RESOURCE_HTTP_PORT;
    let origin: string;

    // using if statements to have better dead code elimination
    if (BUILD_TYPE === EnvironmentKind.Development) {
      origin = NO_DEV_PORT
        ? `${protocol}://${BUILD_ORIGIN}`
        : `${protocol}://${BUILD_ORIGIN}:${port}`;
    } else if (BUILD_TYPE === EnvironmentKind.Staging) {
      origin = `https://${BUILD_ORIGIN}`;
    } else if (BUILD_TYPE === EnvironmentKind.Production) {
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

    // using if statements to have better dead code elimination
    if (BUILD_TYPE === EnvironmentKind.Development)
      return `Dev-${baseFileName}`;

    if (BUILD_TYPE === EnvironmentKind.Staging)
      return `Staging-${baseFileName}`;

    if (BUILD_TYPE === EnvironmentKind.Production) return baseFileName;

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
