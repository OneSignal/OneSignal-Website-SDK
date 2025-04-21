import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import {
  FutureSubscriptionModel,
  SubscriptionType,
} from '../../core/models/SubscriptionModels';
import Environment from '../../shared/helpers/Environment';
import { DeliveryPlatformKind } from '../../shared/models/DeliveryPlatformKind';
import { SubscriptionStateKind } from '../../shared/models/SubscriptionStateKind';
import OneSignalUtils from '../../shared/utils/OneSignalUtils';
import { EnvironmentInfoHelper } from '../helpers/EnvironmentInfoHelper';
import { Serializable } from '../models/Serializable';

export default class FuturePushSubscriptionRecord implements Serializable {
  readonly type: SubscriptionType;
  readonly token?: string; // maps to legacy player.identifier
  readonly enabled?: boolean;
  readonly notificationTypes?: SubscriptionStateKind;
  readonly sdk: string;
  readonly deviceModel: string;
  readonly deviceOs: number;
  readonly webAuth?: string;
  readonly webp256?: string;

  constructor(rawPushSubscription: RawPushSubscription) {
    const environment = EnvironmentInfoHelper.getEnvironmentInfo();

    this.token = this._getToken(rawPushSubscription);
    this.type = FuturePushSubscriptionRecord.getSubscriptionType();
    // TO DO: enabled
    // this.enabled = true;
    this.notificationTypes = SubscriptionStateKind.Subscribed;
    // TO DO: fix VERSION type discrepancies throughout codebase
    this.sdk = String(__VERSION__);
    this.deviceModel = navigator.platform;
    this.deviceOs = isNaN(environment.browserVersion)
      ? -1
      : environment.browserVersion;
    this.webAuth = rawPushSubscription.w3cAuth;
    this.webp256 = rawPushSubscription.w3cP256dh;
  }

  private _getToken(subscription: RawPushSubscription): string | undefined {
    if (subscription.w3cEndpoint) {
      return subscription.w3cEndpoint.toString();
    }
    return subscription.safariDeviceToken;
  }

  serialize(): FutureSubscriptionModel {
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
  public static getSubscriptionType(): SubscriptionType {
    const browser = OneSignalUtils.redetectBrowserUserAgent();
    if (browser.firefox) {
      return SubscriptionType.FirefoxPush;
    }
    if (Environment.useSafariVapidPush()) {
      return SubscriptionType.SafariPush;
    }
    if (Environment.useSafariLegacyPush()) {
      return SubscriptionType.SafariLegacyPush;
    }
    // Other browsers, like Edge, are Chromium based so we consider them "Chrome".
    return SubscriptionType.ChromePush;
  }

  /**
   * Get the legacy player.device_type
   * NOTE: Use getSubscriptionType() instead when possible.
   */
  public static getDeviceType(): DeliveryPlatformKind {
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
}
