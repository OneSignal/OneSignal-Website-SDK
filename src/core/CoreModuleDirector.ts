import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import SubscriptionHelper from '../../src/shared/helpers/SubscriptionHelper';
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
import UserData from './models/UserData';
import { NewRecordsState } from './operationRepo/NewRecordsState';

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  constructor(private core: CoreModule) {}

  public async generatePushSubscriptionModel(
    rawPushSubscription: RawPushSubscription,
  ): Promise<void> {
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
      EventHelper.checkAndTriggerUserChanged();
    } catch (e) {
      Log.error(`Error hydrating user: ${e}`);
    }
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
