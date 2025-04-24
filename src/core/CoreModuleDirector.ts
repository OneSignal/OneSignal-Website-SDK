import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import SubscriptionHelper from '../../src/shared/helpers/SubscriptionHelper';
import OneSignal from '../onesignal/OneSignal';
import User from '../onesignal/User';
import OneSignalError from '../shared/errors/OneSignalError';
import EventHelper from '../shared/helpers/EventHelper';
import MainHelper from '../shared/helpers/MainHelper';
import Log from '../shared/libraries/Log';
import { RawPushSubscription } from '../shared/models/RawPushSubscription';
import Database from '../shared/services/Database';
import { logMethodCall } from '../shared/utils/utils';
import CoreModule from './CoreModule';
import { IdentityModel } from './models/IdentityModel';
import { PropertiesModel } from './models/PropertiesModel';
import { SubscriptionModel } from './models/SubscriptionModel';
import {
  SubscriptionChannel,
  SubscriptionType,
} from './models/SubscriptionModels';
import { ModelName, SupportedModel } from './models/SupportedModels';
import UserData from './models/UserData';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { CreateSubscriptionOperation } from './operations/CreateSubscriptionOperation';
import { Operation } from './operations/Operation';

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  constructor(private core: CoreModule) {}

  public async generatePushSubscriptionModel(
    rawPushSubscription: RawPushSubscription,
  ): Promise<void> {
    logMethodCall('CoreModuleDirector.generatePushSubscriptionModel', {
      rawPushSubscription,
    });
    const appId = await MainHelper.getAppId();
    const user = User.createOrGetInstance();

    // new subscription
    const subOp = new CreateSubscriptionOperation({
      appId,
      onesignalId: user.onesignalId,
      ...new FuturePushSubscriptionRecord(rawPushSubscription).serialize(),
    });

    // don't propagate since we will be including the subscription in the user create call
    OneSignal.coreDirector.add(subOp);
  }

  public hydrateUser(user: UserData, externalId?: string): void {
    logMethodCall('CoreModuleDirector.hydrateUser', { user, externalId });
    try {
      const identity = this.getIdentityModel();
      const properties = this.getPropertiesModel();

      const { onesignal_id: onesignalId } = user.identity;
      if (!onesignalId) {
        throw new OneSignalError('OneSignal ID is missing from user data');
      }

      // set OneSignal ID *before* hydrating models so that the onesignalId is also updated in model cache
      identity.onesignalId = onesignalId;
      properties.onesignalId = onesignalId;

      if (externalId) {
        identity.externalId = externalId;
        user.identity.external_id = externalId;
      }

      // subscriptions are duplicable, so we hydrate them separately
      // when hydrating, we should have the full subscription object (i.e. include ID from server)
      this._hydrateSubscriptions(
        user.subscriptions as SubscriptionModel[] | undefined,
        onesignalId,
        externalId,
      );
      EventHelper.checkAndTriggerUserChanged();
    } catch (e) {
      Log.error(`Error hydrating user: ${e}`);
    }
  }

  private _hydrateSubscriptions(
    subscriptions: SubscriptionModel[] | undefined,
    onesignalId: string,
    externalId?: string,
  ): void {
    logMethodCall('CoreModuleDirector._hydrateSubscriptions', {
      subscriptions,
      onesignalId,
      externalId,
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
            SubscriptionHelper.toSubscriptionChannel(subscription.type),
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

  /* O P E R A T I O N S */

  public add(operation: Operation): void {
    logMethodCall('CoreModuleDirector.add', { name: operation.name });
    this.core.operationModelStore.add(operation);
  }

  public remove(operation: Operation): void {
    logMethodCall('CoreModuleDirector.remove', { name: operation.name });
    this.core.operationModelStore.remove(operation.modelId);
  }

  /* G E T T E R S */
  public getNewRecordsState(): NewRecordsState | undefined {
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
    type: SubscriptionChannel | undefined,
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
