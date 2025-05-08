import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import OneSignalError from 'src/shared/errors/OneSignalError';
import EventHelper from 'src/shared/helpers/EventHelper';
import Log from 'src/shared/libraries/Log';
import SubscriptionHelper from '../../src/shared/helpers/SubscriptionHelper';
import MainHelper from '../shared/helpers/MainHelper';
import { RawPushSubscription } from '../shared/models/RawPushSubscription';
import Database from '../shared/services/Database';
import { logMethodCall } from '../shared/utils/utils';
import CoreModule from './CoreModule';
import { ConfigModel } from './models/ConfigModel';
import { IdentityModel } from './models/IdentityModel';
import { PropertiesModel } from './models/PropertiesModel';
import { SubscriptionModel } from './models/SubscriptionModel';
import { IdentityModelStore } from './modelStores/IdentityModelStore';
import { PropertiesModelStore } from './modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from './modelStores/SubscriptionModelStore';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { type OperationRepo } from './operationRepo/OperationRepo';
import { ISubscription, UserData } from './types/api';
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

    this.core.subscriptionModelStore.add(model);
  }

  public hydrateUser(user: UserData, externalId?: string): void {
    logMethodCall('CoreModuleDirector.hydrateUser', { user, externalId });
    try {
      const identityModel = this.getIdentityModel();
      const propertiesModel = this.getPropertiesModel();

      const { onesignal_id: onesignalId } = user.identity;
      if (!onesignalId) {
        throw new OneSignalError('OneSignal ID is missing from user data');
      }

      // set OneSignal ID *before* hydrating models so that the onesignalId is also updated in model cache
      identityModel.onesignalId = onesignalId;
      propertiesModel.onesignalId = onesignalId;

      if (externalId) {
        identityModel.externalId = externalId;
        user.identity.external_id = externalId;
      }

      // identity and properties models are always single, so we hydrate immediately (i.e. replace existing data)
      identityModel.initializeFromJson(user.identity);
      if (user.properties) propertiesModel.initializeFromJson(user.properties);
      this.hydrateSubscriptions(user.subscriptions);

      EventHelper.checkAndTriggerUserChanged();
    } catch (e) {
      Log.error(`Error hydrating user: ${e}`);
    }
  }

  private hydrateSubscriptions(subscriptions?: ISubscription[]): void {
    if (!subscriptions) return;
    subscriptions.forEach((subscription) => {
      /* We use the token to identify the model because the subscription ID is not set until the server responds.
       * So when we initially hydrate after init, we may already have a push model with a token, but no ID.
       * We don't want to create a new model in this case, so we use the token to identify the model.
       */
      const existingSubscription = !!subscription.token
        ? this.getSubscriptionOfTypeWithToken(
            SubscriptionHelper.toSubscriptionChannel(subscription.type),
            subscription.token,
          )
        : undefined;

      if (existingSubscription) {
        existingSubscription.initializeFromJson(subscription);
      } else {
        const model = new SubscriptionModel();
        model.initializeFromJson(subscription);
        this.core.subscriptionModelStore.add(model);
      }
    });
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
    const { lastKnownPushToken } = await Database.getAppState();
    if (lastKnownPushToken) {
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

  public getConfigModel(): ConfigModel {
    logMethodCall('CoreModuleDirector.getConfigModel');
    return this.core.configModelStore.model;
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
