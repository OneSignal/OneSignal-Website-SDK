import { SubscriptionStateKind } from 'src/shared/models/SubscriptionStateKind';
import { OPERATION_NAME } from '../executors/constants';
import { SubscriptionType } from '../models/SubscriptionModels';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';
import { Subscription } from './types';

/**
 * An Operation to create a new subscription in the OneSignal backend. The subscription will
 * be associated to the user with the appId and onesignalId provided.
 */
export class CreateSubscriptionOperation extends BaseSubscriptionOperation {
  constructor(subscription?: Subscription) {
    super(
      OPERATION_NAME.CREATE_SUBSCRIPTION,
      subscription?.appId,
      subscription?.onesignalId,
      subscription?.subscriptionId,
    );
    if (subscription) {
      this.type = subscription.type;
      this.enabled = subscription.enabled;
      this.notification_types = subscription.notification_types;
      this.sdk = subscription.sdk;
      this.device_model = subscription.device_model;
      this.device_os = subscription.device_os;
      this.web_auth = subscription.web_auth;
      this.web_p256 = subscription.web_p256;
    }
  }

  /**
   * The type of subscription.
   */
  get type(): SubscriptionType {
    return this.getProperty<SubscriptionType>('type');
  }
  private set type(value: SubscriptionType) {
    this.setProperty<SubscriptionType>('type', value);
  }

  /**
   * Whether this subscription is currently enabled.
   */
  get enabled(): boolean {
    return this.getProperty<boolean>('enabled');
  }
  private set enabled(value: boolean) {
    this.setProperty<boolean>('enabled', value);
  }

  /**
   * The notification types this subscription is subscribed to.
   */
  get notification_types(): SubscriptionStateKind {
    return this.getProperty<SubscriptionStateKind>('notification_types');
  }
  private set notification_types(value: SubscriptionStateKind) {
    this.setProperty<SubscriptionStateKind>('notification_types', value);
  }

  get sdk(): string | undefined {
    return this.getProperty<string | undefined>('sdk');
  }
  private set sdk(value: string | undefined) {
    this.setProperty<string | undefined>('sdk', value);
  }

  get device_model(): string | undefined {
    return this.getProperty<string | undefined>('device_model');
  }
  private set device_model(value: string | undefined) {
    this.setProperty<string | undefined>('device_model', value);
  }

  get device_os(): number | undefined {
    return this.getProperty<number | undefined>('device_os');
  }
  private set device_os(value: number | undefined) {
    this.setProperty<number | undefined>('device_os', value);
  }

  get web_auth(): string | undefined {
    return this.getProperty<string | undefined>('web_auth');
  }
  private set web_auth(value: string | undefined) {
    this.setProperty<string | undefined>('web_auth', value);
  }

  get web_p256(): string | undefined {
    return this.getProperty<string | undefined>('web_p256');
  }
  private set web_p256(value: string | undefined) {
    this.setProperty<string | undefined>('web_p256', value);
  }
}
