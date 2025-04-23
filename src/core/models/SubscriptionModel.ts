import { SubscriptionStateKind } from 'src/shared/models/SubscriptionStateKind';
import { ICreateUserSubscription, SubscriptionTypeValue } from '../types/api';
import { Model } from './Model';

type ISubscriptionModel = Pick<
  ICreateUserSubscription,
  | 'device_model'
  | 'device_os'
  | 'sdk'
  | 'token'
  | 'type'
  | 'notification_types'
  | 'enabled'
>;

// Implements logic similar to Android SDK's SubscriptionModel
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/subscriptions/SubscriptionModel.kt
export class SubscriptionModel extends Model<ISubscriptionModel> {
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
  get notification_types(): SubscriptionStateKind | undefined {
    return this.getProperty('notification_types');
  }
  set notification_types(value: SubscriptionStateKind | undefined) {
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

  get device_os(): string | undefined {
    return this.getProperty('device_os');
  }
  set device_os(value: string | undefined) {
    this.setProperty('device_os', value);
  }
}
