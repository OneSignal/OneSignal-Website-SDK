export interface OutcomeRequestData {
  app_id: string;
  id: string;
  device_type: number;
  direct?: boolean;
  notification_ids?: string[];
  weight?: number;
}