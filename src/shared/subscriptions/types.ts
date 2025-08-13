import type {
  NotificationType,
  SubscriptionChannel,
  SubscriptionStrategyKind,
  SubscriptionType,
  UnsubscriptionStrategy,
} from './constants';

export type SubscriptionChannelValue =
  (typeof SubscriptionChannel)[keyof typeof SubscriptionChannel];

export type SubscriptionTypeValue =
  (typeof SubscriptionType)[keyof typeof SubscriptionType];

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export type StoredSubscription = {
  deviceId?: string | null;
  subscriptionToken?: string | null;
  optedOut?: boolean;
  createdAt?: number | null;
  expirationTime?: number | null;
};

export interface PushSubscriptionState {
  subscribed: boolean;
  optedOut: boolean;
}

export type SubscriptionStrategyKindValue =
  (typeof SubscriptionStrategyKind)[keyof typeof SubscriptionStrategyKind];

export type UnsubscriptionStrategyValue =
  (typeof UnsubscriptionStrategy)[keyof typeof UnsubscriptionStrategy];
