import type { SubscriptionTypeValue } from 'src/core/types/subscription';

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
