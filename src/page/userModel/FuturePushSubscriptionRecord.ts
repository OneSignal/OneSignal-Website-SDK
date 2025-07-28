import type {
  NotificationTypeValue,
  SubscriptionTypeValue,
} from 'src/core/types/subscription';
import { NotificationType } from 'src/core/types/subscription';
import {
  getDeviceModel,
  getDeviceOS,
  getSubscriptionType,
} from 'src/shared/environment';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import {
  Browser,
  getBrowserName,
  getBrowserVersion,
} from 'src/shared/useragent';
import { VERSION } from 'src/shared/utils/EnvVariables';
import {
  DeliveryPlatformKind,
  type DeliveryPlatformKindValue,
} from '../../shared/models/DeliveryPlatformKind';
import type { Serializable } from '../models/Serializable';

export default class FuturePushSubscriptionRecord implements Serializable {
  readonly type: SubscriptionTypeValue;
  readonly token?: string; // maps to legacy player.identifier
  readonly enabled?: boolean;
  readonly notificationTypes?: NotificationTypeValue;
  readonly sdk: string;
  readonly deviceModel: string;
  readonly deviceOs: string;
  readonly webAuth?: string;
  readonly webp256?: string;

  constructor(rawPushSubscription: RawPushSubscription) {
    this.token = this._getToken(rawPushSubscription);
    this.type = getSubscriptionType();
    this.enabled = true;
    this.notificationTypes = NotificationType.Subscribed;
    this.sdk = VERSION;
    this.deviceModel = getDeviceModel();
    this.deviceOs = getDeviceOS();
    this.webAuth = rawPushSubscription.w3cAuth;
    this.webp256 = rawPushSubscription.w3cP256dh;
  }

  private _getToken(subscription: RawPushSubscription): string | undefined {
    if (subscription.w3cEndpoint) {
      return subscription.w3cEndpoint.toString();
    }
    return subscription.safariDeviceToken;
  }

  serialize() {
    return {
      type: this.type,
      token: this.token,
      enabled: this.enabled,
      notification_types: this.notificationTypes,
      sdk: this.sdk,
      device_model: this.deviceModel,
      device_os: this.deviceOs,
      web_auth: this.webAuth,
      web_p256: this.webp256,
    };
  }

  /* S T A T I C */

  /**
   * Get the User Model Subscription type based on browser detection.
   */
  public static getSubscriptionType(): SubscriptionTypeValue {
    const browserName = getBrowserName();
    if (browserName === Browser.Firefox) {
      return SubscriptionType.FirefoxPush;
    }
    if (useSafariVapidPush()) {
      return SubscriptionType.SafariPush;
    }
    if (useSafariLegacyPush) {
      return SubscriptionType.SafariLegacyPush;
    }
    // Other browsers, like Edge, are Chromium based so we consider them "Chrome".
    return SubscriptionType.ChromePush;
  }

  /**
   * Get the legacy player.device_type
   * NOTE: Use getSubscriptionType() instead when possible.
   */
  public static getDeviceType(): DeliveryPlatformKindValue {
    switch (this.getSubscriptionType()) {
      case SubscriptionType.FirefoxPush:
        return DeliveryPlatformKind.Firefox;
      case SubscriptionType.SafariLegacyPush:
        return DeliveryPlatformKind.SafariLegacy;
      case SubscriptionType.SafariPush:
        return DeliveryPlatformKind.SafariVapid;
    }
    return DeliveryPlatformKind.ChromeLike;
  }

  public static getDeviceOS(): string | number {
    const browserVersion = getBrowserVersion();
    return isNaN(browserVersion) ? -1 : browserVersion;
  }

  public static getDeviceModel(): string {
    return navigator.platform;
  }

  public static getSdk(): string {
    return String(VERSION);
  }
}
