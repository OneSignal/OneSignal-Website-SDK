import {
  getDeviceModel,
  getDeviceOS,
  getSubscriptionType,
} from 'src/shared/environment/detect';
import type { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { VERSION } from 'src/shared/utils/env';

export function serializePushSubscriptionRecord(raw: RawPushSubscription) {
  return {
    type: getSubscriptionType(),
    token: raw.w3cEndpoint ?? raw.safariDeviceToken,
    enabled: true,
    notification_types: NotificationType._Subscribed,
    sdk: VERSION,
    device_model: getDeviceModel(),
    device_os: getDeviceOS(),
    web_auth: raw.w3cAuth,
    web_p256: raw.w3cP256dh,
  };
}
