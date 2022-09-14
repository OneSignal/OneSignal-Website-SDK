export interface UserPropertiesModel {
  tags?: {[key: string]: string};
  language?: string;
  timezone_id?: string;
  lat?: number;
  long?: number;
  country?: string;
  first_active?: number;
  last_active?: number;
  ip?: string;
}
