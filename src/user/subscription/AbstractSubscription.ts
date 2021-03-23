import bowser from "bowser";
import Environment from "src/Environment";
import { DeliveryPlatformKind } from "src/models/DeliveryPlatformKind";
import { SubscriptionStateKind } from "src/models/SubscriptionStateKind";

export interface FlattenedDeviceRecord {
  device_type: DeliveryPlatformKind;
  language: string;
  timezone: number;
  timezone_id: string;
  device_os: number;
  sdk: string;
  notification_types: SubscriptionStateKind | undefined;
  device_model: string;
  // TODO: Make it a required parameter
  app_id?: string;
}

export abstract class AbstractSubscription {
  public deliveryPlatform: DeliveryPlatformKind;
  public language: string;
  public timezone: number;
  public timezoneId: string;
  public browserVersion: number;
  public deviceModel: string;
  public sdkVersion: string;
  public appId: string | undefined;
  public subscriptionState: SubscriptionStateKind | undefined;

  constructor() {
    // TODO: The generation of these values should be outside of this class

    // TODO: Possible implementation for appId initialization
    this.appId = OneSignal.context.appConfig.appId;
    this.language = Environment.getLanguage();
    this.timezone = new Date().getTimezoneOffset() * -60;
    this.timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserVersion = parseInt(String(bowser.version), 10);
    this.browserVersion = isNaN(browserVersion) ? -1 : browserVersion;
    this.deviceModel = navigator.platform;
    this.sdkVersion = Environment.version().toString();
    this.deliveryPlatform = this.getDeliveryPlatform();
    // Unimplemented properties are appId, subscriptionState, and subscription
  }

  protected abstract getDeliveryPlatform(): DeliveryPlatformKind;

  serialize(): FlattenedDeviceRecord {
    const serializedBundle: FlattenedDeviceRecord = {
      device_type: this.deliveryPlatform,
      language: this.language,
      timezone: this.timezone,
      timezone_id: this.timezoneId,
      device_os: this.browserVersion,
      device_model: this.deviceModel,
      sdk: this.sdkVersion,
      notification_types: this.subscriptionState,
    };

    if (this.appId) {
      serializedBundle.app_id = this.appId;
    }

    return serializedBundle;
  }
}
