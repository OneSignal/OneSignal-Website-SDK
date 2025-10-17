import type { IUserProperties } from '../types/api';
import { Model } from './Model';

type IPropertiesModel = {
  ip: string;
  country: IUserProperties['country'];
  language: IUserProperties['language'];
  onesignalId: string;
  tags: Record<string, string>;
  timezone_id: IUserProperties['timezone_id'];
};

export type IPropertiesModelKeys = keyof IPropertiesModel;
export type IPropertiesModelValues = IPropertiesModel[keyof IPropertiesModel];

// Implements logic similar to Android's SDK's PropertiesModel
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/properties/PropertiesModel.kt
export class PropertiesModel extends Model<IPropertiesModel> {
  constructor() {
    super();
  }

  get _onesignalId(): string {
    return this._getProperty('onesignalId');
  }
  set _onesignalId(value: string) {
    this._setProperty('onesignalId', value);
  }

  get _ip(): string | undefined {
    return this._getProperty('ip');
  }
  set _ip(value: string | undefined) {
    this._setProperty('ip', value);
  }

  get _country(): string | undefined {
    return this._getProperty('country');
  }
  set _country(value: string | undefined) {
    this._setProperty('country', value);
  }

  get _language(): string | undefined {
    return this._getProperty('language');
  }
  set _language(value: string | undefined) {
    this._setProperty('language', value);
  }

  get _timezone_id(): string | undefined {
    return this._getProperty('timezone_id');
  }
  set _timezone_id(value: string | undefined) {
    this._setProperty('timezone_id', value);
  }

  get _tags(): Record<string, string> {
    return this._getProperty('tags') ?? {};
  }
  set _tags(value: Record<string, string>) {
    this._setProperty('tags', value);
  }
}
