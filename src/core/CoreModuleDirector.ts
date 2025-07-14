import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import SubscriptionHelper from '../../src/shared/helpers/SubscriptionHelper';
import MainHelper from '../shared/helpers/MainHelper';
import { RawPushSubscription } from '../shared/models/RawPushSubscription';
import Database from '../shared/services/Database';
import { logMethodCall } from '../shared/utils/utils';
import CoreModule from './CoreModule';
import { IdentityModel } from './models/IdentityModel';
import { PropertiesModel } from './models/PropertiesModel';
import { SubscriptionModel } from './models/SubscriptionModel';
import { IdentityModelStore } from './modelStores/IdentityModelStore';
import { PropertiesModelStore } from './modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from './modelStores/SubscriptionModelStore';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { type OperationRepo } from './operationRepo/OperationRepo';
import { ModelChangeTags } from './types/models';
import {
  SubscriptionChannel,
  SubscriptionChannelValue,
  SubscriptionType,
} from './types/subscription';

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  constructor(private core: CoreModule) {}

  get operationRepo(): OperationRepo {
    return this.core.operationRepo;
  }

  get identityModelStore(): IdentityModelStore {
    return this.core.identityModelStore;
  }

  get propertiesModelStore(): PropertiesModelStore {
    return this.core.propertiesModelStore;
  }

  get subscriptionModelStore(): SubscriptionModelStore {
    return this.core.subscriptionModelStore;
  }

  public generatePushSubscriptionModel(
    rawPushSubscription: RawPushSubscription,
  ): void {
    logMethodCall('CoreModuleDirector.generatePushSubscriptionModel', {
      rawPushSubscription,
    });
    const model = new SubscriptionModel();
    model.initializeFromJson(
      new FuturePushSubscriptionRecord(rawPushSubscription).serialize(),
    );

    // we enqueue a login operation w/ a create subscription operation the first time we generate/save a push subscription model
    this.core.subscriptionModelStore.add(model, ModelChangeTags.NO_PROPOGATE);
  }

  public addSubscriptionModel(model: SubscriptionModel): void {
    this.core.subscriptionModelStore.add(model);
  }

  public removeSubscriptionModel(modelId: string): void {
    this.core.subscriptionModelStore.remove(modelId);
  }

  /* G E T T E R S */
  public getNewRecordsState(): NewRecordsState {
    return this.core.newRecordsState;
  }

  public getEmailSubscriptionModels(): SubscriptionModel[] {
    logMethodCall('CoreModuleDirector.getEmailSubscriptionModels');
    const subscriptions = this.core.subscriptionModelStore.list();
    return subscriptions.filter((s) => s.type === SubscriptionType.Email);
  }

  public async hasEmail(): Promise<boolean> {
    const emails = this.getEmailSubscriptionModels();
    return Object.keys(emails).length > 0;
  }

  public getSmsSubscriptionModels(): SubscriptionModel[] {
    logMethodCall('CoreModuleDirector.getSmsSubscriptionModels');
    const subscriptions = this.core.subscriptionModelStore.list();
    return subscriptions.filter((s) => s.type === SubscriptionType.SMS);
  }

  public async hasSms(): Promise<boolean> {
    const smsModels = this.getSmsSubscriptionModels();
    return Object.keys(smsModels).length > 0;
  }

  /**
   * Returns all push subscription models, including push subscriptions from other browsers.
   */
  public getAllPushSubscriptionModels(): SubscriptionModel[] {
    logMethodCall('CoreModuleDirector.getAllPushSubscriptionModels');
    const subscriptions = this.core.subscriptionModelStore.list();
    return subscriptions.filter((s) =>
      SubscriptionHelper.isPushSubscriptionType(s.type),
    );
  }

  private async getPushSubscriptionModelByCurrentToken(): Promise<
    SubscriptionModel | undefined
  > {
    logMethodCall('CoreModuleDirector.getPushSubscriptionModelByCurrentToken');
    const pushToken = await MainHelper.getCurrentPushToken();
    if (pushToken) {
      return this.getSubscriptionOfTypeWithToken(
        SubscriptionChannel.Push,
        pushToken,
      );
    }
    return undefined;
  }

  // Browser may return a different PushToken value, use the last-known value as a fallback.
  //   - This happens if you disable notification permissions then re-enable them.
  private async getPushSubscriptionModelByLastKnownToken(): Promise<
    SubscriptionModel | undefined
  > {
    logMethodCall(
      'CoreModuleDirector.getPushSubscriptionModelByLastKnownToken',
    );
    const lastKnownPushToken = await Database.getPushToken();
    if (lastKnownPushToken !== undefined) {
      return this.getSubscriptionOfTypeWithToken(
        SubscriptionChannel.Push,
        lastKnownPushToken,
      );
    }
    return undefined;
  }

  /**
   * Gets the current push subscription model for the current browser.
   * @returns The push subscription model for the current browser, or undefined if no push subscription exists.
   */
  public async getPushSubscriptionModel(): Promise<
    SubscriptionModel | undefined
  > {
    logMethodCall('CoreModuleDirector.getPushSubscriptionModel');
    return (
      (await this.getPushSubscriptionModelByCurrentToken()) ||
      (await this.getPushSubscriptionModelByLastKnownToken())
    );
  }

  public getIdentityModel(): IdentityModel {
    logMethodCall('CoreModuleDirector.getIdentityModel');
    return this.core.identityModelStore.model;
  }

  public getPropertiesModel(): PropertiesModel {
    logMethodCall('CoreModuleDirector.getPropertiesModel');
    return this.core.propertiesModelStore.model;
  }

  public async getAllSubscriptionsModels(): Promise<SubscriptionModel[]> {
    logMethodCall('CoreModuleDirector.getAllSubscriptionsModels');
    const emailSubscriptions = this.getEmailSubscriptionModels();
    const smsSubscriptions = this.getSmsSubscriptionModels();
    const pushSubscription = await this.getPushSubscriptionModel();

    return [
      ...emailSubscriptions,
      ...smsSubscriptions,
      ...(pushSubscription ? [pushSubscription] : []),
    ];
  }

  public getSubscriptionOfTypeWithToken(
    type: SubscriptionChannelValue | undefined,
    token: string,
  ): SubscriptionModel | undefined {
    logMethodCall('CoreModuleDirector.getSubscriptionOfTypeWithToken', {
      type,
      token,
    });

    let subscriptions: SubscriptionModel[];

    switch (type) {
      case SubscriptionChannel.Email:
        subscriptions = this.getEmailSubscriptionModels();
        break;
      case SubscriptionChannel.SMS:
        subscriptions = this.getSmsSubscriptionModels();
        break;
      case SubscriptionChannel.Push:
        subscriptions = this.getAllPushSubscriptionModels();
        break;
      default:
        return undefined;
    }

    return subscriptions.find((subscription) => subscription.token === token);
  }
}
