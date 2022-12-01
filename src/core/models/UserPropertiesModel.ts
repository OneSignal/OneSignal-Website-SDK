export interface UserPropertiesModel {
  tags?: {[key: string]: string};
  language?: string;
  timezone_id?: string;
  session_time?: number;
  session_count?: number;
}
