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
