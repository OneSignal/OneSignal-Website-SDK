import { Serializable } from "../models/Serializable";
import { FutureSubscriptionModel, SubscriptionType } from "../../core/models/SubscriptionModels";
import { EnvironmentInfoHelper } from "../helpers/EnvironmentInfoHelper";
import { RawPushSubscription } from "src/shared/models/RawPushSubscription";
import OneSignalUtils from "../../shared/utils/OneSignalUtils";
import { SubscriptionStateKind } from "../../shared/models/SubscriptionStateKind";

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
    this.sdk = __VERSION__;
    this.deviceModel = navigator.platform;
    this.deviceOs = isNaN(environment.browserVersion) ? -1 : environment.browserVersion;
    this.webAuth = rawPushSubscription.w3cAuth;
    this.webp256 = rawPushSubscription.w3cP256dh;
  }

  private _getToken(subscription: RawPushSubscription): string | undefined {
    const browser = OneSignalUtils.redetectBrowserUserAgent();
    const isLegacySafari = browser.safari && browser.version < 16;
    return isLegacySafari ? subscription.safariDeviceToken : subscription.w3cEndpoint ?
      subscription.w3cEndpoint.toString() : undefined;
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

  static getSubscriptionType(): SubscriptionType {
    const browser = OneSignalUtils.redetectBrowserUserAgent();
    if (browser.firefox) {
      return SubscriptionType.FirefoxPush;
    }
    // TO DO: update to use feature detection
    if (browser.safari && browser.version >= 16) {
      return SubscriptionType.SafariPush;
    }
    if (browser.safari && browser.version < 16) {
      return SubscriptionType.SafariLegacyPush;
    }
    if (browser.msedge) {
      return SubscriptionType.WindowPush;
    }
    return SubscriptionType.ChromePush;
  }
}
