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
      this._sdk = VERSION;
      this._device_model = getDeviceModel();
      this._device_os = getDeviceOS();
      this._enabled = subscription.enabled;
      this._notification_types = subscription.notification_types;
      this._subscriptionId = subscription.subscriptionId;
      this._token = subscription.token;
      this._type = subscription.type;
      this._web_auth = subscription.web_auth;
      this._web_p256 = subscription.web_p256;
    }
  }

  /**
   * The type of subscription.
   */
  public get _type(): SubscriptionTypeValue {
    return this._getProperty('type');
  }
  protected set _type(value: SubscriptionTypeValue) {
    this._setProperty('type', value);
  }

  /**
   * The token for the subscription.
   */
  public get _token(): string {
    return this._getProperty('token');
  }
  protected set _token(value: string) {
    this._setProperty('token', value);
  }

  /**
   * Whether this subscription is currently enabled.
   */
  get _enabled(): boolean | undefined {
    return this._getProperty('enabled');
  }
  protected set _enabled(value: boolean | undefined) {
    this._setProperty('enabled', value);
  }

  /**
   * The notification types this subscription is subscribed to.
   */
  get _notification_types(): NotificationTypeValue | undefined {
    return this._getProperty('notification_types');
  }
  protected set _notification_types(value: NotificationTypeValue | undefined) {
    this._setProperty('notification_types', value);
  }

  /**
   * The SDK identifier
   */
  get _sdk(): string | undefined {
    return this._getProperty('sdk');
  }
  protected set _sdk(value: string | undefined) {
    this._setProperty('sdk', value);
  }

  /**
   * The device model
   */
  get _device_model(): string | undefined {
    return this._getProperty('device_model');
  }
  protected set _device_model(value: string | undefined) {
    this._setProperty('device_model', value);
  }

  /**
   * The device OS version
   */
  get _device_os(): string | undefined {
    return this._getProperty('device_os');
  }
  protected set _device_os(value: string | undefined) {
    this._setProperty('device_os', value);
  }

  /**
   * Web authentication value
   */
  get _web_auth(): string | undefined {
    return this._getProperty('web_auth');
  }
  protected set _web_auth(value: string | undefined) {
    this._setProperty('web_auth', value);
  }

  /**
   * Web P256 value
   */
  get _web_p256(): string | undefined {
    return this._getProperty('web_p256');
  }
  protected set _web_p256(value: string | undefined) {
    this._setProperty('web_p256', value);
  }
}
