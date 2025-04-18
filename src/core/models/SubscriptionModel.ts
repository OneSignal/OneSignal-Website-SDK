import { ICreateUserSubscription, SubscriptionTypeValue } from '../types/api';
import { Model } from './Model';

type ISubscriptionModel = Pick<
  ICreateUserSubscription,
  'device_model' | 'device_os' | 'sdk' | 'token' | 'type'
> & {
  optedIn: boolean;
};

// Implements logic similar to Android SDK's SubscriptionModel
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/subscriptions/SubscriptionModel.kt
export class SubscriptionModel extends Model<ISubscriptionModel> {
  get optedIn(): boolean {
    return this.getProperty('optedIn');
  }
  set optedIn(value: boolean) {
    this.setProperty('optedIn', value);
  }

  get type(): SubscriptionTypeValue {
    return this.getProperty('type');
  }
  set type(value: SubscriptionTypeValue) {
    this.setProperty('type', value);
  }

  get token(): string {
    return this.getProperty('token');
  }
  set token(value: string) {
    this.setProperty('token', value);
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
