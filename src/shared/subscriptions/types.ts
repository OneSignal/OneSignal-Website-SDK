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
