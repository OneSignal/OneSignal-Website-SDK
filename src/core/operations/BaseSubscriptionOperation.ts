import { IDManager } from 'src/shared/managers/IDManager';
import { SubscriptionStateKind } from 'src/shared/models/SubscriptionStateKind';
import { SubscriptionType } from '../models/SubscriptionModels';
import { Operation } from './Operation';
import { Subscription } from './types';

/**
 * Base class for subscription-related operations
 */
export abstract class BaseSubscriptionOperation extends Operation {
  constructor(
    operationName: string,
    appId?: string,
    onesignalId?: string,
    subscription?: Subscription,
  ) {
    super(operationName, appId, onesignalId);

    if (subscription) {
      this.subscriptionId = subscription.subscriptionId;
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
   * The subscription ID for the operation. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get subscriptionId(): string {
    return this.getProperty<string>('subscriptionId');
  }
  protected set subscriptionId(value: string) {
    this.setProperty<string>('subscriptionId', value);
  }

  /**
   * The type of subscription.
   */
  get type(): SubscriptionType {
    return this.getProperty<SubscriptionType>('type');
  }
  protected set type(value: SubscriptionType) {
    this.setProperty<SubscriptionType>('type', value);
  }

  /**
   * Whether this subscription is currently enabled.
   */
  get enabled(): boolean {
    return this.getProperty<boolean>('enabled');
  }
  protected set enabled(value: boolean) {
    this.setProperty<boolean>('enabled', value);
  }

  /**
   * The notification types this subscription is subscribed to.
   */
  get notification_types(): SubscriptionStateKind {
    return this.getProperty<SubscriptionStateKind>('notification_types');
  }
  protected set notification_types(value: SubscriptionStateKind) {
    this.setProperty<SubscriptionStateKind>('notification_types', value);
  }

  /**
   * The SDK identifier
   */
  get sdk(): string | undefined {
    return this.getProperty<string | undefined>('sdk');
  }
  protected set sdk(value: string | undefined) {
    this.setProperty<string | undefined>('sdk', value);
  }

  /**
   * The device model
   */
  get device_model(): string | undefined {
    return this.getProperty<string | undefined>('device_model');
  }
  protected set device_model(value: string | undefined) {
    this.setProperty<string | undefined>('device_model', value);
  }

  /**
   * The device OS version
   */
  get device_os(): number | undefined {
    return this.getProperty<number | undefined>('device_os');
  }
  protected set device_os(value: number | undefined) {
    this.setProperty<number | undefined>('device_os', value);
  }

  /**
   * Web authentication value
   */
  get web_auth(): string | undefined {
    return this.getProperty<string | undefined>('web_auth');
  }
  protected set web_auth(value: string | undefined) {
    this.setProperty<string | undefined>('web_auth', value);
  }

  /**
   * Web P256 value
   */
  get web_p256(): string | undefined {
    return this.getProperty<string | undefined>('web_p256');
  }
  protected set web_p256(value: string | undefined) {
    this.setProperty<string | undefined>('web_p256', value);
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
