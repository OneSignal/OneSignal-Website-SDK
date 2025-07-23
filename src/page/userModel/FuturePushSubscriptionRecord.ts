import type {
  NotificationTypeValue,
  SubscriptionTypeValue,
} from 'src/core/types/subscription';
import {
  NotificationType,
  NotificationTypeValue,
  SubscriptionTypeValue,
} from 'src/core/types/subscription';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import Environment from '../../shared/helpers/Environment';
import { Serializable } from '../models/Serializable';

export default class FuturePushSubscriptionRecord implements Serializable {
  readonly type: SubscriptionTypeValue;
  readonly token?: string; // maps to legacy player.identifier
  readonly enabled?: boolean;
  readonly notificationTypes?: NotificationTypeValue;
  readonly sdk: string;
  readonly deviceModel: string;
  readonly deviceOs: number;
  readonly webAuth?: string;
  readonly webp256?: string;

  constructor(rawPushSubscription: RawPushSubscription) {
    this.token = this._getToken(rawPushSubscription);
    this.type = Environment.getSubscriptionType();
    this.enabled = true;
    this.notificationTypes = NotificationType.Subscribed;
    this.sdk = Environment.version();
    this.deviceModel = Environment.getDeviceModel();
    this.deviceOs = Environment.getDeviceOS();
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
}
