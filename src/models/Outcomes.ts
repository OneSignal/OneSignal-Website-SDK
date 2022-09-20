export interface OutcomesServerConfig {
  direct: {
    enabled: boolean;
  };
  indirect: {
    enabled: boolean;
    notification_attribution: {
      minutes_since_displayed: number;
      limit: number;
    }
  };
  unattributed: {
    enabled: boolean;
  };
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

export enum OutcomeAttributionType {
  Direct = 1,
  Indirect = 2,
  Unattributed = 3,
  NotSupported = 4,
}

export interface OutcomeAttribution {
  type: OutcomeAttributionType;
  notificationIds: string[];
}

export interface SentUniqueOutcome {
  outcomeName: string;
  notificationIds: string[];
  sentDuringSession: number | null; // used for unattributed
}
