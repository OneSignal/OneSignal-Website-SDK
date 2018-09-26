import { BuildEnvironmentKind } from '../models/BuildEnvironmentKind';
import { TestEnvironmentKind } from '../models/TestEnvironmentKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';
import { IntegrationKind } from "../models/IntegrationKind";
import SdkEnvironmentHelper from "../helpers/SdkEnvironmentHelper";

export default class SdkEnvironment {
  /**
   * Returns development, staging, or production.
   *
   * The magic constants used to detect the environment is set or unset when
   * building the SDK.
   */
  static getBuildEnv(): BuildEnvironmentKind {
    return SdkEnvironmentHelper.getBuildEnv();
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
  static async getIntegration(usingProxyOrigin?: boolean): Promise<IntegrationKind> {
    return await SdkEnvironmentHelper.getIntegration(usingProxyOrigin);
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
  static async isFrameContextInsecure() {
    return await SdkEnvironmentHelper.isFrameContextInsecure();
  }

  static isInsecureOrigin() {
    return SdkEnvironmentHelper.isInsecureOrigin();
  }

  /**
   * Describes the current frame context.
   */
  static getWindowEnv(): WindowEnvironmentKind {
    return SdkEnvironmentHelper.getWindowEnv();
  }

  /**
   * Describes whether the SDK is built in tests mode or not.
   *
   * This method is overriden when tests are run.
   */
  static getTestEnv(): TestEnvironmentKind {
    return SdkEnvironmentHelper.getTestEnv();
  }

  /**
   * Returns build-specific prefixes used for operations like registering the
   * service worker.
   *
   * For example, in staging the registered service worker filename is
   * Staging-OneSignalSDKWorker.js.
   */
  static getBuildEnvPrefix(buildEnv: BuildEnvironmentKind = SdkEnvironment.getBuildEnv()) : string {
    return SdkEnvironmentHelper.getBuildEnvPrefix(buildEnv);
  }

  /**
   * Returns the URL object representing the components of OneSignal's API
   * endpoint.
   */
  static getOneSignalApiUrl(buildEnv: BuildEnvironmentKind = SdkEnvironment.getBuildEnv()): URL {
    return SdkEnvironmentHelper.getOneSignalApiUrl(buildEnv);
  }

  static getOneSignalResourceUrlPath(buildEnv: BuildEnvironmentKind = SdkEnvironment.getBuildEnv()): URL {
    const origin = SdkEnvironment.getOneSignalApiUrl(buildEnv).origin;
    let path: string;

    switch (buildEnv) {
      case BuildEnvironmentKind.Development:
      case BuildEnvironmentKind.Staging:
      case BuildEnvironmentKind.Production:
        path = '/sdks';
        break;
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }

    return new URL(origin + path)
  }

  static getOneSignalCssFileName(buildEnv: BuildEnvironmentKind = SdkEnvironment.getBuildEnv()): string {
    const baseFileName = "OneSignalSDKStyles.css";

    switch (buildEnv) {
      case BuildEnvironmentKind.Development:
        return `Dev-${baseFileName}`;
      case BuildEnvironmentKind.Staging:
        return `Staging-${baseFileName}`;
      case BuildEnvironmentKind.Production:
        return baseFileName;
      default:
        throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
    }
  }
}
