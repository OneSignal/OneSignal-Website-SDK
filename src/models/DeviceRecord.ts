import bowser from 'bowser';

import Environment from '../Environment';
import NotImplementedError from '../errors/NotImplementedError';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { Serializable } from './Serializable';
import { SubscriptionStateKind } from './SubscriptionStateKind';
import { OneSignalUtils } from "../utils/OneSignalUtils";

export interface FlattenedDeviceRecord {
  device_type: DeliveryPlatformKind;
  language: string;
  timezone: number;
  device_os: number;
  sdk: string;
  notification_types: SubscriptionStateKind | undefined;
  device_model: string;
  // TODO: Make it a required parameter
  app_id?: string;
}

/**
 * Describes the fields of a OneSignal "player" device record.
 *
 * This is used when creating or modifying push and email records.
 */
export abstract class DeviceRecord implements Serializable {
  public deliveryPlatform: DeliveryPlatformKind;
  public language: string;
  public timezone: number;
  public browserVersion: number;
  public deviceModel: string;
  public sdkVersion: string;
  public appId: string | undefined;
  public subscriptionState: SubscriptionStateKind | undefined;

  constructor() {
    // TODO: Possible implementation for appId initialization
    // this.appId = OneSignal.context.appConfig.appId;
    this.language = Environment.getLanguage();
    this.timezone = new Date().getTimezoneOffset() * -60;
    const browserVersion = parseInt(String(bowser.version), 10);
    this.browserVersion = isNaN(browserVersion) ? -1 : browserVersion;
    this.deviceModel = navigator.platform;
    this.sdkVersion = Environment.version().toString();
    this.deliveryPlatform = this.getDeliveryPlatform();
    // Unimplemented properties are appId, subscriptionState, and subscription
  }

  isSafari(): boolean {
    return bowser.safari && window.safari !== undefined && window.safari.pushNotification !== undefined;
  }

  getDeliveryPlatform(): DeliveryPlatformKind {
    // For testing purposes, allows changing the browser user agent
    const browser = OneSignalUtils.redetectBrowserUserAgent();

    if (this.isSafari()) {
      return DeliveryPlatformKind.Safari;
    } else if (browser.firefox) {
      return DeliveryPlatformKind.Firefox;
    } else if (browser.msedge) {
      return DeliveryPlatformKind.Edge;
    } else {
      return DeliveryPlatformKind.ChromeLike;
    }
  }

  serialize(): FlattenedDeviceRecord {
    const serializedBundle: FlattenedDeviceRecord = {
      device_type: this.deliveryPlatform,
      language: this.language,
      timezone: this.timezone,
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

  deserialize(_: object): DeviceRecord { throw new NotImplementedError(); }
}
