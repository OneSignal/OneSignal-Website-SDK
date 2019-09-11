export interface OutcomeRequestData {
  app_id: string;
  outcome_id: string;
  device_type: number;
  direct?: boolean;
  notification_id?: string;
  value?: number;
}