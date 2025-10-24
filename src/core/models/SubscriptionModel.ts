import { getDeviceModel, getDeviceOS } from 'src/shared/environment/detect';
import type {
  NotificationTypeValue,
  SubscriptionTypeValue,
} from 'src/shared/subscriptions/types';
import { VERSION } from 'src/shared/utils/env';
import type { ISubscription } from '../types/api';
import { Model } from './Model';

type ISubscriptionModel = Pick<
  ISubscription,
  | 'id'
  | 'device_model'
  | 'device_os'
  | 'sdk'
  | 'token'
  | 'type'
  | 'notification_types'
  | 'enabled'
  | 'web_auth'
  | 'web_p256'
> & {
  onesignalId?: string;
};

// Implements logic similar to Android SDK's SubscriptionModel
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/subscriptions/SubscriptionModel.kt
export class SubscriptionModel extends Model<ISubscriptionModel> {
  constructor() {
    super();
    this._sdk = VERSION;
    this._device_model = getDeviceModel();
    this._device_os = getDeviceOS();
  }

  /**
   * This is a legacy property, could be removed sometime after web refactor launch
   */
  get _onesignalId(): string | undefined {
    return this._getProperty('onesignalId');
  }
  set _onesignalId(value: string | undefined) {
    this._setProperty('onesignalId', value);
  }

  /**
   * The subscription ID.
   */
  get _id(): string {
    return this._getProperty('id');
  }
  set _id(value: string) {
    this._setProperty('id', value);
  }

  get _enabled(): boolean | undefined {
    return this._getProperty('enabled');
  }
  set _enabled(value: boolean) {
    this._setProperty('enabled', value);
  }

  get _type(): SubscriptionTypeValue {
    return this._getProperty('type');
  }
  set _type(value: SubscriptionTypeValue) {
    this._setProperty('type', value);
  }

  // Android SDK refers to this as address
  get _token(): string {
    return this._getProperty('token');
  }
  set _token(value: string) {
    this._setProperty('token', value);
  }

  // Android SDK refers to this as status
  get _notification_types(): NotificationTypeValue | undefined {
    return this._getProperty('notification_types');
  }
  set _notification_types(value: NotificationTypeValue | undefined) {
    this._setProperty('notification_types', value);
  }

  get _sdk(): string | undefined {
    return this._getProperty('sdk');
  }
  set _sdk(value: string | undefined) {
    this._setProperty('sdk', value);
  }

  get _device_model(): string | undefined {
    return this._getProperty('device_model');
  }
  set _device_model(value: string | undefined) {
    this._setProperty('device_model', value);
  }

  get _device_os(): string | undefined {
    return this._getProperty('device_os');
  }
  set _device_os(value: string | undefined) {
    this._setProperty('device_os', value);
  }

  get _web_auth(): string | undefined {
    return this._getProperty('web_auth');
  }
  set _web_auth(value: string | undefined) {
    this._setProperty('web_auth', value);
  }

  get _web_p256(): string | undefined {
    return this._getProperty('web_p256');
  }
  set _web_p256(value: string | undefined) {
    this._setProperty('web_p256', value);
  }
}
