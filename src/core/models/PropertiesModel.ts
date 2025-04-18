import { IUserProperties } from 'src/types/user';
import { Model } from './Model';

type IPropertiesModel = {
  onesignalId: string;
  language: IUserProperties['language'];
  timezone: IUserProperties['timezone_id'];
  tags: IUserProperties['tags'];
};

// Implements logic similar to Android's SDK's PropertiesModel
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/properties/PropertiesModel.kt
export class PropertiesModel extends Model<IPropertiesModel> {
  get onesignalId(): string {
    return this.getProperty('onesignalId');
  }
  set onesignalId(value: string) {
    this.setProperty('onesignalId', value);
  }

  get language(): string | undefined {
    return this.getProperty('language');
  }
  set language(value: string | undefined) {
    this.setProperty('language', value);
  }

  get timezone(): string | undefined {
    return this.getProperty('timezone');
  }
  set timezone(value: string | undefined) {
    this.setProperty('timezone', value);
  }

  get tags(): Record<string, string> | undefined {
    return this.getProperty('tags');
  }
  set tags(value: Record<string, string> | undefined) {
    this.setProperty('tags', value);
  }
}
