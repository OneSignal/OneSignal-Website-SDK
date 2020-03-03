export interface OutcomesConfig {
  direct: {
    enabled: boolean;
  }
  indirect: {
    enabled: boolean;
    influencedTimePeriodMin: number;
    influencedNotificationsLimit: number;
  }
  unattributed: {
    enabled: boolean;
  }
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
