import Environment from 'src/shared/helpers/Environment';
import { ICreateUserSubscription } from '../types/api';
import {
  type NotificationTypeValue,
  type SubscriptionTypeValue,
} from '../types/subscription';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';

type SubscriptionOp = ICreateUserSubscription & {
  subscriptionId: string;
};

export type SubscriptionWithAppId = SubscriptionOp & {
  appId: string;
  onesignalId: string;
};

/**
 * Base class for subscription-related operations with full properties
 */
export abstract class BaseFullSubscriptionOperation extends BaseSubscriptionOperation<SubscriptionOp> {
  constructor(
    operationName: string,
    appId?: string,
    onesignalId?: string,
    subscription?: SubscriptionOp,
  ) {
    super(operationName, appId, onesignalId);

    if (subscription) {
      this.sdk = Environment.version();
      this.device_model = Environment.getDeviceModel();
      this.device_os = Environment.getDeviceOS();
      this.enabled = subscription.enabled;
      this.notification_types = subscription.notification_types;
      this.subscriptionId = subscription.subscriptionId;
      this.token = subscription.token;
      this.type = subscription.type;
      this.web_auth = subscription.web_auth;
      this.web_p256 = subscription.web_p256;
    }
  }

  /**
   * The type of subscription.
   */
  public get type(): SubscriptionTypeValue {
    return this.getProperty('type');
  }
  protected set type(value: SubscriptionTypeValue) {
    this.setProperty('type', value);
  }

  /**
   * The token for the subscription.
   */
  public get token(): string {
    return this.getProperty('token');
  }
  protected set token(value: string) {
    this.setProperty('token', value);
  }

  /**
   * Whether this subscription is currently enabled.
   */
  get enabled(): boolean | undefined {
    return this.getProperty('enabled');
  }
  protected set enabled(value: boolean | undefined) {
    this.setProperty('enabled', value);
  }

  /**
   * The notification types this subscription is subscribed to.
   */
  get notification_types(): NotificationTypeValue | undefined {
    return this.getProperty('notification_types');
  }
  protected set notification_types(value: NotificationTypeValue | undefined) {
    this.setProperty('notification_types', value);
  }

  /**
   * The SDK identifier
   */
  get sdk(): string | undefined {
    return this.getProperty('sdk');
  }
  protected set sdk(value: string | undefined) {
    this.setProperty('sdk', value);
  }

  /**
   * The device model
   */
  get device_model(): string | undefined {
    return this.getProperty('device_model');
  }
  protected set device_model(value: string | undefined) {
    this.setProperty('device_model', value);
  }

  /**
   * The device OS version
   */
  get device_os(): number | undefined {
    return this.getProperty('device_os');
  }
  protected set device_os(value: number | undefined) {
    this.setProperty('device_os', value);
  }

  /**
   * Web authentication value
   */
  get web_auth(): string | undefined {
    return this.getProperty('web_auth');
  }
  protected set web_auth(value: string | undefined) {
    this.setProperty('web_auth', value);
  }

  /**
   * Web P256 value
   */
  get web_p256(): string | undefined {
    return this.getProperty('web_p256');
  }
  protected set web_p256(value: string | undefined) {
    this.setProperty('web_p256', value);
  }
}
