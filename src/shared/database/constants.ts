export const DATABASE_NAME = 'ONE_SIGNAL_SDK_DB';

export const VERSION = 7;

export const LegacyModelName = {
  PushSubscriptions: 'pushSubscriptions',
  EmailSubscriptions: 'emailSubscriptions',
  SmsSubscriptions: 'smsSubscriptions',
} as const;

export const ModelName = {
  Operations: 'operations',
  Identity: 'identity',
  Properties: 'properties',
  Subscriptions: 'subscriptions',
} as const;
