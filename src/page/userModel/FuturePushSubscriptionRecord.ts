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
import { VERSION } from 'src/shared/utils/EnvVariables';

export default class FuturePushSubscriptionRecord {
  readonly type: SubscriptionTypeValue;
  readonly token?: string; // maps to legacy player.identifier
  readonly enabled?: boolean;
  readonly notification_types?: NotificationTypeValue;
  readonly sdk: string;
  readonly device_model: string;
  readonly device_os: string;
  readonly web_auth?: string;
  readonly web_p256?: string;

  constructor(rawPushSubscription: RawPushSubscription) {
    this.token = this._getToken(rawPushSubscription);
    this.type = getSubscriptionType();
    this.enabled = true;
    this.notification_types = NotificationType.Subscribed;
    this.sdk = VERSION;
    this.device_model = getDeviceModel();
    this.device_os = getDeviceOS();
    this.web_auth = rawPushSubscription.w3cAuth;
    this.web_p256 = rawPushSubscription.w3cP256dh;
  }

  private _getToken(subscription: RawPushSubscription): string | undefined {
    if (subscription.w3cEndpoint) {
      return subscription.w3cEndpoint.toString();
    }
    return subscription.safariDeviceToken;
  }
}
