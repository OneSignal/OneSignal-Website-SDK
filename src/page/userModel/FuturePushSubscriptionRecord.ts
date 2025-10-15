import {
  getDeviceModel,
  getDeviceOS,
  getSubscriptionType,
} from 'src/shared/environment/detect';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import { NotificationType } from 'src/shared/subscriptions/constants';
import type {
  NotificationTypeValue,
  SubscriptionTypeValue,
} from 'src/shared/subscriptions/types';
import { VERSION } from 'src/shared/utils/env';
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

  _serialize() {
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
