import { IDManager } from 'src/shared/managers/IDManager';
import { SubscriptionStateKind } from 'src/shared/models/SubscriptionStateKind';
import { OPERATION_NAME } from '../executors/constants';
import { SubscriptionType } from '../models/SubscriptionModels';
import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';
import { Subscription } from './types';

/**
 * An Operation to create a new subscription in the OneSignal backend. The subscription will
 * be associated to the user with the appId and onesignalId provided.
 */
export class CreateSubscriptionOperation extends Operation {
  constructor(subscription?: Subscription) {
    super(OPERATION_NAME.CREATE_SUBSCRIPTION);
    if (subscription) {
      this.appId = subscription.appId;
      this.onesignalId = subscription.onesignalId;
      this.subscriptionId = subscription.subscriptionId;
      this.type = subscription.type;
      this.enabled = subscription.enabled;
      this.notification_types = subscription.notification_types;
    }
  }

  /**
   * The application ID this subscription will be created under.
   */
  get appId(): string {
    return this.getProperty<string>('appId');
  }
  private set appId(value: string) {
    this.setProperty<string>('appId', value);
  }

  /**
   * The user ID this subscription will be associated with. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get onesignalId(): string {
    return this.getProperty<string>('onesignalId');
  }
  private set onesignalId(value: string) {
    this.setProperty<string>('onesignalId', value);
  }

  /**
   * The local ID of the subscription being created. The subscription model with this ID will have its
   * ID updated with the backend-generated ID post-create.
   */
  get subscriptionId(): string {
    return this.getProperty<string>('subscriptionId');
  }
  private set subscriptionId(value: string) {
    this.setProperty<string>('subscriptionId', value);
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

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Subscription.${this.subscriptionId}`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.ALTER;
  }

  override get canStartExecute(): boolean {
    return !IDManager.isLocalId(this.onesignalId);
  }

  override get applyToRecordId(): string {
    return this.onesignalId;
  }

  override translateIds(map: Record<string, string>): void {
    if (map[this.onesignalId]) {
      this.onesignalId = map[this.onesignalId];
    }
  }
}
