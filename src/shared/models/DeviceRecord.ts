import bowser from 'bowser';
import { Serializable } from '../../page/models/Serializable';

import NotImplementedError from '../errors/NotImplementedError';
import Environment from '../helpers/Environment';
import { bowserCastle } from '../utils/bowserCastle';
import OneSignalUtils from '../utils/OneSignalUtils';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { SubscriptionStateKind } from './SubscriptionStateKind';

// TO DO: deprecate after user-model if possible
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
  external_user_id?: string;
  external_user_id_auth_hash?: string;
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
  public timezoneId: string;
  public browserVersion: number;
  public deviceModel: string;
  public sdkVersion: string;
  public appId: string | undefined;
  public subscriptionState: SubscriptionStateKind | undefined;
  public externalUserId?: string;
  public externalUserIdAuthHash?: string;

  constructor() {
    // TODO: Possible implementation for appId initialization
    // this.appId = OneSignal.context.appConfig.appId;
    this.language = Environment.getLanguage();
    this.timezone = new Date().getTimezoneOffset() * -60;
    this.timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserVersion = parseInt(String(bowserCastle().version), 10);
    this.browserVersion = isNaN(browserVersion) ? -1 : browserVersion;
    this.deviceModel = navigator.platform;
    this.sdkVersion = Environment.version().toString();
    this.deliveryPlatform = this.getDeliveryPlatform();
    // Unimplemented properties are appId, subscriptionState, and subscription
  }

  getDeliveryPlatform(): DeliveryPlatformKind {
    // For testing purposes, allows changing the browser user agent
    const browser = OneSignalUtils.redetectBrowserUserAgent();
  
    if (Environment.useSafariLegacyPush()) {
      return DeliveryPlatformKind.SafariLegacy;
    } else if (Environment.useSafariVapidPush()) {
      return DeliveryPlatformKind.SafariVapid;
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
      timezone_id: this.timezoneId,
      device_os: this.browserVersion,
      device_model: this.deviceModel,
      sdk: this.sdkVersion,
      notification_types: this.subscriptionState,
    };

    if (this.appId) {
      serializedBundle.app_id = this.appId;
    }

    if (this.externalUserId) {
      serializedBundle.external_user_id = this.externalUserId;
    }

    if (this.externalUserIdAuthHash) {
      serializedBundle.external_user_id_auth_hash = this.externalUserIdAuthHash;
    }

    return serializedBundle;
  }

  deserialize(_: object): DeviceRecord { throw new NotImplementedError(); }
}
