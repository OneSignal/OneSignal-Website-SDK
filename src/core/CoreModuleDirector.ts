import { logMethodCall } from '../shared/utils/utils';
import Log from '../shared/libraries/Log';
import CoreModule from './CoreModule';
import { OSModel } from './modelRepo/OSModel';
import { SupportedIdentity } from './models/IdentityModel';
import { ModelStoresMap } from './models/ModelStoresMap';
import {
  SubscriptionChannel,
  SubscriptionModel,
  SubscriptionType,
  SupportedSubscription,
} from './models/SubscriptionModels';
import { ModelName, SupportedModel } from './models/SupportedModels';
import { UserPropertiesModel } from './models/UserPropertiesModel';
import UserData from './models/UserData';
import OneSignalError from '../shared/errors/OneSignalError';
import MainHelper from '../shared/helpers/MainHelper';
import { RawPushSubscription } from '../shared/models/RawPushSubscription';
import FuturePushSubscriptionRecord from '../page/userModel/FuturePushSubscriptionRecord';
import User from '../onesignal/User';
import OneSignal from '../onesignal/OneSignal';
import Database from '../shared/services/Database';
import EventHelper from '../shared/helpers/EventHelper';

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  constructor(private core: CoreModule) {}

  public generatePushSubscriptionModel(
    rawPushSubscription: RawPushSubscription,
  ): void {
    logMethodCall('CoreModuleDirector.generatePushSubscriptionModel', {
      rawPushSubscription,
    });
    // new subscription
    const pushModel = new OSModel<SupportedSubscription>(
      ModelName.Subscriptions,
      new FuturePushSubscriptionRecord(rawPushSubscription).serialize(),
    );

    const user = User.createOrGetInstance();
    if (user.hasOneSignalId) {
      pushModel.setOneSignalId(user.onesignalId);
    }

    const identity = this.getIdentityModel();
    const externalId = identity?.data.external_id;
    if (externalId) {
      pushModel.setExternalId(externalId);
    }

    // don't propagate since we will be including the subscription in the user create call
    OneSignal.coreDirector.add(
      ModelName.Subscriptions,
      pushModel as OSModel<SupportedModel>,
      false,
    );
  }

  public async resetModelRepoAndCache(): Promise<void> {
    await this.core.resetModelRepoAndCache();
  }

  public hydrateUser(user: UserData): void {
    logMethodCall('CoreModuleDirector.hydrateUser', { user });
    try {
      const identity = this.getIdentityModel();
      const properties = this.getPropertiesModel();

      const { onesignal_id: onesignalId, external_id: externalId } =
        user.identity;

      if (!onesignalId) {
        throw new OneSignalError('OneSignal ID is missing from user data');
      }

      // set OneSignal ID *before* hydrating models so that the onesignalId is also updated in model cache
      identity?.setOneSignalId(onesignalId);
      properties?.setOneSignalId(onesignalId);

      if (externalId) {
        identity?.setExternalId(externalId);
        properties?.setExternalId(externalId);
      }

      // identity and properties models are always single, so we hydrate immediately (i.e. replace existing data)
      identity?.hydrate(user.identity);
      properties?.hydrate(user.properties);

      // subscriptions are duplicable, so we hydrate them separately
      // when hydrating, we should have the full subscription object (i.e. include ID from server)
      this._hydrateSubscriptions(
        user.subscriptions as SubscriptionModel[],
        onesignalId,
        externalId,
      );
      EventHelper.checkAndTriggerUserChanged();
    } catch (e) {
      Log.error(`Error hydrating user: ${e}`);
    }
  }

  private _hydrateSubscriptions(
    subscriptions: SubscriptionModel[],
    onesignalId: string,
    externalId?: string,
  ): void {
    logMethodCall('CoreModuleDirector._hydrateSubscriptions', {
      subscriptions,
    });

    if (!subscriptions) {
      return;
    }

    const modelStores = this.getModelStores();

    subscriptions.forEach(async (subscription) => {
      /* We use the token to identify the model because the subscription ID is not set until the server responds.
       * So when we initially hydrate after init, we may already have a push model with a token, but no ID.
       * We don't want to create a new model in this case, so we use the token to identify the model.
       */
      const existingSubscription = !!subscription.token
        ? this.getSubscriptionOfTypeWithToken(
            this.toSubscriptionChannel(subscription.type),
            subscription.token,
          )
        : undefined;

      if (existingSubscription) {
        // set onesignalId on existing subscription *before* hydrating so that the onesignalId is updated in model cache
        existingSubscription.setOneSignalId(onesignalId);
        if (externalId) {
          existingSubscription?.setExternalId(externalId);
        }
        existingSubscription.hydrate(subscription);
      } else {
        const model = new OSModel<SupportedModel>(
          ModelName.Subscriptions,
          subscription,
        );
        model.setOneSignalId(onesignalId);
        if (externalId) {
          model?.setExternalId(externalId);
        }
        modelStores[ModelName.Subscriptions].add(model, false); // don't propagate to server
      }
    });
  }

  // call processDeltaQueue on all executors immediately
  public forceDeltaQueueProcessingOnAllExecutors(): void {
    logMethodCall('CoreModuleDirector.forceDeltaQueueProcessingOnAllExecutors');
    this.core.forceDeltaQueueProcessingOnAllExecutors();
  }

  /* O P E R A T I O N S */

  public add(
    modelName: ModelName,
    model: OSModel<SupportedModel>,
    propagate = true,
  ): void {
    logMethodCall('CoreModuleDirector.add', { modelName, model });
    const modelStores = this.getModelStores();
    modelStores[modelName].add(model, propagate);
  }

  public remove(modelName: ModelName, modelId: string): void {
    logMethodCall('CoreModuleDirector.remove', { modelName, modelId });
    const modelStores = this.getModelStores();
    modelStores[modelName].remove(modelId);
  }

  /* G E T T E R S */

  public getModelByTypeAndId(
    modelName: ModelName,
    modelId: string,
  ): OSModel<SupportedModel> | undefined {
    logMethodCall('CoreModuleDirector.getModelByTypeAndId', {
      modelName,
      modelId,
    });
    const modelStores = this.getModelStores();
    return modelStores[modelName].models[modelId];
  }

  public getEmailSubscriptionModels(): {
    [key: string]: OSModel<SupportedSubscription>;
  } {
    logMethodCall('CoreModuleDirector.getEmailSubscriptionModels');
    const modelStores = this.getModelStores();
    const subscriptionModels = modelStores.subscriptions.models as {
      [key: string]: OSModel<SupportedSubscription>;
    };

    const emailSubscriptions = Object.fromEntries(
      Object.entries(subscriptionModels).filter(
        ([, model]) => model.data?.type === SubscriptionType.Email,
      ),
    );

    return emailSubscriptions;
  }

  public async hasEmail(): Promise<boolean> {
    const emails = this.getEmailSubscriptionModels();
    return Object.keys(emails).length > 0;
  }

  public getSmsSubscriptionModels(): {
    [key: string]: OSModel<SupportedSubscription>;
  } {
    logMethodCall('CoreModuleDirector.getSmsSubscriptionModels');
    const modelStores = this.getModelStores();
    const subscriptionModels = modelStores.subscriptions.models as {
      [key: string]: OSModel<SupportedSubscription>;
    };

    const smsSubscriptions = Object.fromEntries(
      Object.entries(subscriptionModels).filter(
        ([, model]) => model.data?.type === SubscriptionType.SMS,
      ),
    );

    return smsSubscriptions;
  }

  public async hasSms(): Promise<boolean> {
    const smsModels = this.getSmsSubscriptionModels();
    return Object.keys(smsModels).length > 0;
  }

  /**
   * Returns all push subscription models, including push subscriptions from other browsers.
   */
  public getAllPushSubscriptionModels(): {
    [key: string]: OSModel<SupportedSubscription>;
  } {
    logMethodCall('CoreModuleDirector.getAllPushSubscriptionModels');
    const modelStores = this.getModelStores();
    const subscriptionModels = modelStores.subscriptions.models as {
      [key: string]: OSModel<SupportedSubscription>;
    };

    const pushSubscriptions = Object.fromEntries(
      Object.entries(subscriptionModels).filter(([, model]) =>
        this.isPushSubscriptionType(model.data?.type),
      ),
    );

    return pushSubscriptions;
  }

  private async getPushSubscriptionModelByCurrentToken(): Promise<
    OSModel<SupportedSubscription> | undefined
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
    OSModel<SupportedSubscription> | undefined
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
    OSModel<SupportedSubscription> | undefined
  > {
    logMethodCall('CoreModuleDirector.getPushSubscriptionModel');
    return (
      (await this.getPushSubscriptionModelByCurrentToken()) ||
      (await this.getPushSubscriptionModelByLastKnownToken())
    );
  }

  public getIdentityModel(): OSModel<SupportedIdentity> | undefined {
    logMethodCall('CoreModuleDirector.getIdentityModel');
    const modelStores = this.getModelStores();
    const modelKeys = Object.keys(modelStores.identity.models);
    return modelStores.identity.models[
      modelKeys[0]
    ] as OSModel<SupportedIdentity>;
  }

  public getPropertiesModel(): OSModel<UserPropertiesModel> | undefined {
    logMethodCall('CoreModuleDirector.getPropertiesModel');
    const modelStores = this.getModelStores();
    const modelKeys = Object.keys(modelStores.properties.models);
    return modelStores.properties.models[
      modelKeys[0]
    ] as OSModel<UserPropertiesModel>;
  }

  public async getAllSubscriptionsModels(): Promise<
    OSModel<SupportedSubscription>[]
  > {
    logMethodCall('CoreModuleDirector.getAllSubscriptionsModels');
    const emailSubscriptions = this.getEmailSubscriptionModels();
    const smsSubscriptions = this.getSmsSubscriptionModels();
    const pushSubscription = await this.getPushSubscriptionModel();

    const subscriptions = Object.values(emailSubscriptions)
      .concat(Object.values(smsSubscriptions))
      .concat(pushSubscription ? [pushSubscription] : []);
    return subscriptions;
  }

  public getSubscriptionOfTypeWithToken(
    type: SubscriptionChannel | undefined,
    token: string,
  ): OSModel<SupportedSubscription> | undefined {
    logMethodCall('CoreModuleDirector.getSubscriptionOfTypeWithToken', {
      type,
      token,
    });

    let subscriptions: Record<string, OSModel<SupportedSubscription>>;

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

    return Object.values(subscriptions).find(
      (subscription) => subscription.data.token === token,
    );
  }

  /* P R I V A T E */

  private getModelStores(): ModelStoresMap<SupportedModel> {
    return this.core.modelRepo?.modelStores as ModelStoresMap<SupportedModel>;
  }

  /**
   * Helper that checks if a given SubscriptionType is a push subscription.
   */
  public isPushSubscriptionType(type: SubscriptionType): boolean {
    switch (type) {
      case SubscriptionType.ChromePush:
      case SubscriptionType.SafariPush:
      case SubscriptionType.SafariLegacyPush:
      case SubscriptionType.FirefoxPush:
        return true;
      default:
        return false;
    }
  }

  public toSubscriptionChannel(type: SubscriptionType) {
    switch (type) {
      case SubscriptionType.Email:
        return SubscriptionChannel.Email;
      case SubscriptionType.SMS:
        return SubscriptionChannel.SMS;
      default:
        if (this.isPushSubscriptionType(type)) {
          return SubscriptionChannel.Push;
        }

        return undefined;
    }
  }
}
