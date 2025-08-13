import type { SubscriptionTypeValue } from '../subscriptions/types';
import type { OutcomeAttributionType } from './constants';

export type OutcomeAttributionTypeValue =
  (typeof OutcomeAttributionType)[keyof typeof OutcomeAttributionType];

export interface OutcomeProps {
  type: OutcomeAttributionTypeValue;
  notificationIds: string[];
  weight?: number | undefined;
}

export interface OutcomeAttribution {
  type: OutcomeAttributionTypeValue;
  notificationIds: string[];
}

export interface OutcomeRequestData {
  app_id: string;
  id: string;
  direct?: boolean;
  notification_ids?: string[];
  weight?: number;
  session_time?: number;
  subscription?: {
    id: string;
    type: SubscriptionTypeValue;
  };
  onesignal_id?: string;
}

export interface OutcomesConfig {
  direct: {
    enabled: boolean;
  };
  indirect: {
    enabled: boolean;
    influencedTimePeriodMin: number;
    influencedNotificationsLimit: number;
  };
  unattributed: {
    enabled: boolean;
  };
}

export interface OutcomesServerConfig {
  direct: {
    enabled: boolean;
  };
  indirect: {
    enabled: boolean;
    notification_attribution: {
      minutes_since_displayed: number;
      limit: number;
    };
  };
  unattributed: {
    enabled: boolean;
  };
}

export interface SentUniqueOutcome {
  outcomeName: string;
  notificationIds: string[];
  sentDuringSession: number | null; // used for unattributed
}

export interface OutcomesNotificationReceived {
  readonly appId: string;
  readonly notificationId: string;
  readonly timestamp: number;
}

export interface OutcomesNotificationClicked {
  readonly appId: string;
  readonly notificationId: string;
  readonly timestamp: number;
}
