import { IUserProperties } from '../types/api';
import { Model } from './Model';

export type IPropertiesModel = {
  country: IUserProperties['country'];
  language: IUserProperties['language'];
  onesignalId: string;
  tags: Record<string, string>;
  timezone_id: IUserProperties['timezone_id'];
};

// Implements logic similar to Android's SDK's PropertiesModel
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/properties/PropertiesModel.kt
export class PropertiesModel extends Model<IPropertiesModel> {
  constructor() {
    super();
    this.setProperty('tags', {});
  }

  get onesignalId(): string {
    return this.getProperty('onesignalId');
  }
  set onesignalId(value: string) {
    this.setProperty('onesignalId', value);
  }

  get country(): string | undefined {
    return this.getProperty('country');
  }
  set country(value: string | undefined) {
    this.setProperty('country', value);
  }

  get language(): string | undefined {
    return this.getProperty('language');
  }
  set language(value: string | undefined) {
    this.setProperty('language', value);
  }

  get timezone_id(): string | undefined {
    return this.getProperty('timezone_id');
  }
  set timezone_id(value: string | undefined) {
    this.setProperty('timezone_id', value);
  }

  get tags(): Record<string, string> {
    return this.getProperty('tags');
  }
  set tags(value: Record<string, string>) {
    this.setProperty('tags', value);
  }
}
