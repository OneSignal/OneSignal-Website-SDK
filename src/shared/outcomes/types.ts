import type { SubscriptionTypeValue } from '../subscriptions/types';

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
