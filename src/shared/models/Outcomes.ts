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

export const OutcomeAttributionType = {
  Direct: 1,
  Indirect: 2,
  Unattributed: 3,
  NotSupported: 4,
} as const;

export type OutcomeAttributionTypeValue =
  (typeof OutcomeAttributionType)[keyof typeof OutcomeAttributionType];

export interface OutcomeAttribution {
  type: OutcomeAttributionTypeValue;
  notificationIds: string[];
}

export interface SentUniqueOutcome {
  outcomeName: string;
  notificationIds: string[];
  sentDuringSession: number | null; // used for unattributed
}
