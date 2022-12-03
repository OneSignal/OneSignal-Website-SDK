import { SubscriptionModel } from "../../core/models/SubscriptionModels";

export interface OutcomeRequestData {
  app_id: string;
  id: string;
  direct?: boolean;
  notification_ids?: string[];
  weight?: number;
  session_time?: number;
  subscription?: SubscriptionModel;
  onesignal_id?: string;
}