import { IDManager } from 'src/shared/managers/IDManager';
import {
  ICreateUserSubscription,
  NotificationTypeValue,
  SubscriptionTypeValue,
} from '../types/api';
import { Operation } from './Operation';

type SubscriptionOp = ICreateUserSubscription & {
  subscriptionId: string;
};

export type SubscriptionWithAppId = SubscriptionOp & {
  appId: string;
  onesignalId: string;
};

/**
 * Base class for subscription-related operations
 */
export abstract class BaseSubscriptionOperation extends Operation<SubscriptionOp> {
  constructor(
    operationName: string,
    appId?: string,
    onesignalId?: string,
    subscription?: SubscriptionOp,
  ) {
    super(operationName, appId, onesignalId);

    if (subscription) {
      this.device_model = subscription.device_model;
      this.device_os = subscription.device_os;
      this.enabled = subscription.enabled;
      this.notification_types = subscription.notification_types;
      this.sdk = subscription.sdk;
      this.subscriptionId = subscription.subscriptionId;
      this.token = subscription.token;
      this.type = subscription.type;
      this.web_auth = subscription.web_auth;
      this.web_p256 = subscription.web_p256;
    }
  }

  /**
   * The subscription ID for the operation. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get subscriptionId(): string {
    return this.getProperty('subscriptionId');
  }
  protected set subscriptionId(value: string) {
    this.setProperty('subscriptionId', value);
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
  get device_os(): string | undefined {
    return this.getProperty('device_os');
  }
  protected set device_os(value: string | undefined) {
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

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Subscription.${this.subscriptionId}`;
  }

  override get canStartExecute(): boolean {
    return (
      !IDManager.isLocalId(this.onesignalId) &&
      !IDManager.isLocalId(this.subscriptionId)
    );
  }

  override get applyToRecordId(): string {
    return this.subscriptionId;
  }

  override translateIds(map: Record<string, string>): void {
    super.translateIds(map);
    if (map[this.subscriptionId]) {
      this.subscriptionId = map[this.subscriptionId];
    }
  }
}
