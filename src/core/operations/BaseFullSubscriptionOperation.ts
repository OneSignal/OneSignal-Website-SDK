import { getDeviceModel, getDeviceOS } from 'src/shared/environment/detect';
import type {
  NotificationTypeValue,
  SubscriptionTypeValue,
} from 'src/shared/subscriptions/types';
import { VERSION } from 'src/shared/utils/env';
import type { ICreateUserSubscription } from '../types/api';
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
      this.sdk = VERSION;
      this.device_model = getDeviceModel();
      this.device_os = getDeviceOS();
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
    return this._getProperty('type');
  }
  protected set type(value: SubscriptionTypeValue) {
    this._setProperty('type', value);
  }

  /**
   * The token for the subscription.
   */
  public get token(): string {
    return this._getProperty('token');
  }
  protected set token(value: string) {
    this._setProperty('token', value);
  }

  /**
   * Whether this subscription is currently enabled.
   */
  get enabled(): boolean | undefined {
    return this._getProperty('enabled');
  }
  protected set enabled(value: boolean | undefined) {
    this._setProperty('enabled', value);
  }

  /**
   * The notification types this subscription is subscribed to.
   */
  get notification_types(): NotificationTypeValue | undefined {
    return this._getProperty('notification_types');
  }
  protected set notification_types(value: NotificationTypeValue | undefined) {
    this._setProperty('notification_types', value);
  }

  /**
   * The SDK identifier
   */
  get sdk(): string | undefined {
    return this._getProperty('sdk');
  }
  protected set sdk(value: string | undefined) {
    this._setProperty('sdk', value);
  }

  /**
   * The device model
   */
  get device_model(): string | undefined {
    return this._getProperty('device_model');
  }
  protected set device_model(value: string | undefined) {
    this._setProperty('device_model', value);
  }

  /**
   * The device OS version
   */
  get device_os(): string | undefined {
    return this._getProperty('device_os');
  }
  protected set device_os(value: string | undefined) {
    this._setProperty('device_os', value);
  }

  /**
   * Web authentication value
   */
  get web_auth(): string | undefined {
    return this._getProperty('web_auth');
  }
  protected set web_auth(value: string | undefined) {
    this._setProperty('web_auth', value);
  }

  /**
   * Web P256 value
   */
  get web_p256(): string | undefined {
    return this._getProperty('web_p256');
  }
  protected set web_p256(value: string | undefined) {
    this._setProperty('web_p256', value);
  }
}
