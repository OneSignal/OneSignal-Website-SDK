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
