import type {
  NotificationType,
  SubscriptionChannel,
  SubscriptionType,
} from './constants';

export type SubscriptionChannelValue =
  (typeof SubscriptionChannel)[keyof typeof SubscriptionChannel];

export type SubscriptionTypeValue =
  (typeof SubscriptionType)[keyof typeof SubscriptionType];

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export interface UserSubscription {
  /**
   * The OneSignal subscription id.
   */
  deviceId?: string | null;
  /**
   * The GCM/FCM registration token, as a stringified URL, or the Safari device token.
   */
  subscriptionToken?: string | null;
  /**
   * Whether the user is opted out of notifications, set by setSubscription().
   */
  optedOut?: boolean;
  /**
   * A UTC timestamp of when this subscription was created. This value is not modified when a
   * subscription is merely refreshed, only when a subscription is created anew.
   */
  createdAt?: number | null;
  /**
   * This property is stored on the native PushSubscription object.
   */
  expirationTime?: number | null;
}
