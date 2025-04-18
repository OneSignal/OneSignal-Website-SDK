// TODO: Remove this interface and use the IUserProperties in types folder
export interface UserPropertiesModel {
  tags?: { [key: string]: string };
  language?: string;
  timezone_id?: string;
  session_time?: number;
  session_count?: number;
}
