import { BuildEnvironmentKind } from '../models/BuildEnvironmentKind';
import { TestEnvironmentKind } from '../models/TestEnvironmentKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';

export default class SdkEnvironment {
  /**
   * Returns development, staging, or production.
   *
   * The magic constants used to detect the environment is set or unset when
   * building the SDK.
   */
  static getBuildEnv(): BuildEnvironmentKind {
    if (typeof __DEV__ !== undefined && __DEV__) {
      return BuildEnvironmentKind.Development;
    } else if (typeof __STAGING__ !== undefined && __STAGING__) {
      return BuildEnvironmentKind.Staging;
    } else {
      return BuildEnvironmentKind.Production;
    }
  }

  static getWindowEnv(): WindowEnvironmentKind {
    if (typeof window === "undefined") {
      if (typeof self !== "undefined" && typeof self.registration !== "undefined") {
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
            (location.hostname.indexOf('.localhost') !== -1 && SdkEnvironment.getBuildEnv() === BuildEnvironmentKind.Development)
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
  static getTestEnv(): TestEnvironmentKind {
    return TestEnvironmentKind.None;
  }

  /**
   * Returns build-specific prefixes used for operations like registering the
   * service worker.
   *
   * For example, in staging the registered service worker filename is
   * Staging-OneSignalSDKWorker.js.
   */
  static getBuildEnvPrefix(buildEnv: BuildEnvironmentKind = SdkEnvironment.getBuildEnv()) : string {
    switch (buildEnv) {
      case BuildEnvironmentKind.Development:
        return 'Dev-';
      case BuildEnvironmentKind.Staging:
        return 'Staging-';
      case BuildEnvironmentKind.Production:
        return '';
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }
  }

  /**
   * Returns the URL object representing the components of OneSignal's API
   * endpoint.
   */
  static getOneSignalApiUrl(buildEnv: BuildEnvironmentKind = SdkEnvironment.getBuildEnv()): URL {
    switch (buildEnv) {
      case BuildEnvironmentKind.Development:
        return new URL('https://localhost:3001/api/v1');
      case BuildEnvironmentKind.Staging:
        return new URL('https://onesignal-staging.pw/api/v1');
      case BuildEnvironmentKind.Production:
        return new URL('https://onesignal.com/api/v1');
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }
  }
}
