import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import { ISubscription } from '../types/api';
import {
  NotificationTypeValue,
  SubscriptionTypeValue,
} from '../types/subscription';
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
>;

// Implements logic similar to Android SDK's SubscriptionModel
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/subscriptions/SubscriptionModel.kt
export class SubscriptionModel extends Model<ISubscriptionModel> {
  constructor() {
    super();
    this.sdk = FuturePushSubscriptionRecord.getSdk();
    this.device_model = FuturePushSubscriptionRecord.getDeviceModel();
    this.device_os = FuturePushSubscriptionRecord.getDeviceOS();
  }

  /**
   * The subscription ID.
   */
  get id(): string {
    return this.getProperty('id');
  }
  set id(value: string) {
    this.setProperty('id', value);
  }

  get enabled(): boolean | undefined {
    return this.getProperty('enabled');
  }
  set enabled(value: boolean) {
    this.setProperty('enabled', value);
  }

  get type(): SubscriptionTypeValue {
    return this.getProperty('type');
  }
  set type(value: SubscriptionTypeValue) {
    this.setProperty('type', value);
  }

  // Android SDK refers to this as address
  get token(): string {
    return this.getProperty('token');
  }
  set token(value: string) {
    this.setProperty('token', value);
  }

  // Android SDK refers to this as status
  get notification_types(): NotificationTypeValue | undefined {
    return this.getProperty('notification_types');
  }
  set notification_types(value: NotificationTypeValue | undefined) {
    this.setProperty('notification_types', value);
  }

  get sdk(): string | undefined {
    return this.getProperty('sdk');
  }
  set sdk(value: string | undefined) {
    this.setProperty('sdk', value);
  }

  get device_model(): string | undefined {
    return this.getProperty('device_model');
  }
  set device_model(value: string | undefined) {
    this.setProperty('device_model', value);
  }

  get device_os(): string | number | undefined {
    return this.getProperty('device_os');
  }
  set device_os(value: string | number | undefined) {
    this.setProperty('device_os', value);
  }

  get web_auth(): string | undefined {
    return this.getProperty('web_auth');
  }
  set web_auth(value: string | undefined) {
    this.setProperty('web_auth', value);
  }

  get web_p256(): string | undefined {
    return this.getProperty('web_p256');
  }
  set web_p256(value: string | undefined) {
    this.setProperty('web_p256', value);
  }
}
