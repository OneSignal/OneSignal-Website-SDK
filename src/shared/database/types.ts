import type { DBSchema } from 'idb';
import type {
  NotificationClickedForOutcomesSchema,
  NotificationClickForOpenHandlingSchema,
  NotificationReceivedForOutcomesSchema,
} from '../helpers/serializer';
import type { AppState } from '../models/AppState';
import type { SentUniqueOutcome } from '../models/Outcomes';
import type { Session } from '../session/types';
import { ModelName } from './constants';

export type ModelNameType = (typeof ModelName)[keyof typeof ModelName];

export type IdKey = 'appId' | 'registrationId' | 'userId' | 'jwtToken';

export type OptionKey =
  | 'appState'
  | 'consentGiven'
  | 'defaultIcon'
  | 'defaultTitle'
  | 'defaultUrl'
  | 'isPushEnabled'
  | 'lastOptedIn'
  | 'lastPushId'
  | 'lastPushToken'
  | 'nonPushPromptsDismissCount'
  | 'notificationClickHandlerAction'
  | 'notificationClickHandlerMatch'
  | 'notificationPermission'
  | 'optedOut'
  | 'pageTitle'
  | 'persistNotification'
  | 'previousExternalId'
  | 'previousOneSignalId'
  | 'promptDismissCount'
  | 'subscription'
  | 'subscriptionCreatedAt'
  | 'subscriptionExpirationTime'
  | 'userConsent'
  | 'vapidPublicKey'
  | 'webhooks.cors'
  | 'webhooks.notification.clicked'
  | 'webhooks.notification.dismissed'
  | 'webhooks.notification.willDisplay';

export interface SubscriptionSchema {
  modelId: string;
  modelName: 'subscriptions';
  onesignalId?: string;
  externalId?: string;
  id?: string;
  type: string;
  token: string;
  notification_types?: string;
  enabled?: boolean;
  web_auth?: boolean;
  web_p256?: boolean;
  device_model?: string;
  device_os?: string;
  sdk?: string;
}

export interface IndexedDBSchema extends DBSchema {
  /**
   * @deprecated - should be migrated in openDB()
   */
  pushSubscriptions: {
    key: string;
    value: SubscriptionSchema;
  };

  /**
   * @deprecated - should be migrated in openDB()
   */
  smsSubscriptions: {
    key: string;
    value: SubscriptionSchema;
  };

  /**
   * @deprecated - should be migrated in openDB()
   */
  emailSubscriptions: {
    key: string;
    value: SubscriptionSchema;
  };

  /**
   * @deprecated - should be migrated in openDB()
   */
  NotificationReceived: {
    key: string;
    value: NotificationReceivedForOutcomesSchema;
  };
  /**
   * @deprecated - should be migrated in openDB()
   */
  NotificationClicked: {
    key: string;
    value: { notificationId: string; [key: string]: any };
  };

  'Outcomes.NotificationClicked': {
    key: string;
    value: NotificationClickedForOutcomesSchema;
  };

  'Outcomes.NotificationReceived': {
    key: string;
    value: NotificationReceivedForOutcomesSchema;
  };

  Ids: {
    key: IdKey;
    value: { type: IdKey; id: string | null };
  };

  NotificationOpened: {
    key: string;
    value: NotificationClickForOpenHandlingSchema;
  };

  Options: {
    key: OptionKey;
    value: {
      key: OptionKey;
      value: boolean | number | string | AppState | undefined | null;
    };
  };

  Sessions: {
    key: string;
    value: Session;
  };

  SentUniqueOutcome: {
    key: string;
    value: SentUniqueOutcome;
  };

  identity: {
    key: string;
    value: {
      modelId: string;
      modelName: 'identity';
      onesignal_id: string;
      external_id?: string;
      externalId?: string;
    };
  };

  properties: {
    key: string;
    value: {
      modelId: string;
      modelName: 'properties';
      country: string;
      first_active: number;
      ip: string;
      language: string;
      last_active: number;
      onesignalId: string;
      tags: Record<string, string>;
      timezone_id: string;
    };
  };

  subscriptions: {
    key: string;
    value: SubscriptionSchema;
  };

  operations: {
    key: string;
    value: {
      modelId: string;
      modelName: 'operations';
      name: string;
      [key: string]: unknown;
    };
  };
}
