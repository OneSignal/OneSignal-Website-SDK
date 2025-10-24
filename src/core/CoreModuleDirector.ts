import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import { getPushToken } from 'src/shared/database/subscription';
import { isPushSubscriptionType } from 'src/shared/helpers/subscription';
import { IDManager } from 'src/shared/managers/IDManager';
import {
  SubscriptionChannel,
  SubscriptionType,
} from 'src/shared/subscriptions/constants';
import type { SubscriptionChannelValue } from 'src/shared/subscriptions/types';
import { logMethodCall } from 'src/shared/utils/utils';
import { getCurrentPushToken } from '../shared/helpers/main';
import { RawPushSubscription } from '../shared/models/RawPushSubscription';
import CoreModule from './CoreModule';
import { IdentityModel } from './models/IdentityModel';
import { PropertiesModel } from './models/PropertiesModel';
import { SubscriptionModel } from './models/SubscriptionModel';
import { IdentityModelStore } from './modelStores/IdentityModelStore';
import { PropertiesModelStore } from './modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from './modelStores/SubscriptionModelStore';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { type OperationRepo } from './operationRepo/OperationRepo';
import { type ICustomEventController } from './types/customEvents';
import { ModelChangeTags } from './types/models';

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  private _core: CoreModule;
  constructor(core: CoreModule) {
    this._core = core;
  }

  get _operationRepo(): OperationRepo {
    return this._core._operationRepo;
  }

  get _identityModelStore(): IdentityModelStore {
    return this._core._identityModelStore;
  }

  get _propertiesModelStore(): PropertiesModelStore {
    return this._core._propertiesModelStore;
  }

  get _subscriptionModelStore(): SubscriptionModelStore {
    return this._core._subscriptionModelStore;
  }

  get _newRecordsState(): NewRecordsState {
    return this._core._newRecordsState;
  }

  get _customEventController(): ICustomEventController {
    return this._core._customEventController;
  }

  public _generatePushSubscriptionModel(
    rawPushSubscription: RawPushSubscription,
  ): SubscriptionModel {
    logMethodCall('CoreModuleDirector.generatePushSubscriptionModel', {
      rawPushSubscription,
    });
    const model = new SubscriptionModel();
    model._initializeFromJson(
      new FuturePushSubscriptionRecord(rawPushSubscription)._serialize(),
    );
    model.id = IDManager._createLocalId();

    // we enqueue a login operation w/ a create subscription operation the first time we generate/save a push subscription model
    this._core._subscriptionModelStore._add(model, ModelChangeTags._Hydrate);
    return model;
  }

  public _addSubscriptionModel(model: SubscriptionModel): void {
    this._core._subscriptionModelStore._add(model);
  }

  public _removeSubscriptionModel(modelId: string): void {
    this._core._subscriptionModelStore._remove(modelId);
  }

  /* G E T T E R S */
  public _getEmailSubscriptionModels(): SubscriptionModel[] {
    logMethodCall('CoreModuleDirector.getEmailSubscriptionModels');
    const subscriptions = this._core._subscriptionModelStore._list();
    return subscriptions.filter((s) => s.type === SubscriptionType._Email);
  }

  public async _hasEmail(): Promise<boolean> {
    const emails = this._getEmailSubscriptionModels();
    return Object.keys(emails).length > 0;
  }

  public _getSmsSubscriptionModels(): SubscriptionModel[] {
    logMethodCall('CoreModuleDirector.getSmsSubscriptionModels');
    const subscriptions = this._core._subscriptionModelStore._list();
    return subscriptions.filter((s) => s.type === SubscriptionType._SMS);
  }

  public async _hasSms(): Promise<boolean> {
    const smsModels = this._getSmsSubscriptionModels();
    return Object.keys(smsModels).length > 0;
  }

  /**
   * Returns all push subscription models, including push subscriptions from other browsers.
   */
  public _getAllPushSubscriptionModels(): SubscriptionModel[] {
    logMethodCall('CoreModuleDirector.getAllPushSubscriptionModels');
    const subscriptions = this._core._subscriptionModelStore._list();
    return subscriptions.filter((s) => isPushSubscriptionType(s.type));
  }

  async _getPushSubscriptionModelByCurrentToken(): Promise<
    SubscriptionModel | undefined
  > {
    logMethodCall('CoreModuleDirector.getPushSubscriptionModelByCurrentToken');
    const pushToken = await getCurrentPushToken();
    if (pushToken) {
      return this._getSubscriptionOfTypeWithToken(
        SubscriptionChannel._Push,
        pushToken,
      );
    }
    return undefined;
  }

  // Browser may return a different PushToken value, use the last-known value as a fallback.
  //   - This happens if you disable notification permissions then re-enable them.
  async _getPushSubscriptionModelByLastKnownToken(): Promise<
    SubscriptionModel | undefined
  > {
    logMethodCall(
      'CoreModuleDirector.getPushSubscriptionModelByLastKnownToken',
    );
    const lastKnownPushToken = await getPushToken();
    if (lastKnownPushToken) {
      return this._getSubscriptionOfTypeWithToken(
        SubscriptionChannel._Push,
        lastKnownPushToken,
      );
    }
    return undefined;
  }

  /**
   * Gets the current push subscription model for the current browser.
   * @returns The push subscription model for the current browser, or undefined if no push subscription exists.
   */
  public async _getPushSubscriptionModel(): Promise<
    SubscriptionModel | undefined
  > {
    logMethodCall('CoreModuleDirector.getPushSubscriptionModel');
    return (
      (await this._getPushSubscriptionModelByCurrentToken()) ||
      (await this._getPushSubscriptionModelByLastKnownToken())
    );
  }

  public _getIdentityModel(): IdentityModel {
    logMethodCall('CoreModuleDirector.getIdentityModel');
    return this._core._identityModelStore._model;
  }

  public _getPropertiesModel(): PropertiesModel {
    logMethodCall('CoreModuleDirector.getPropertiesModel');
    return this._core._propertiesModelStore._model;
  }

  public async _getAllSubscriptionsModels(): Promise<SubscriptionModel[]> {
    logMethodCall('CoreModuleDirector.getAllSubscriptionsModels');
    const emailSubscriptions = this._getEmailSubscriptionModels();
    const smsSubscriptions = this._getSmsSubscriptionModels();
    const pushSubscription = await this._getPushSubscriptionModel();

    return [
      ...emailSubscriptions,
      ...smsSubscriptions,
      ...(pushSubscription ? [pushSubscription] : []),
    ];
  }

  public _getSubscriptionOfTypeWithToken(
    type: SubscriptionChannelValue | undefined,
    token: string,
  ): SubscriptionModel | undefined {
    logMethodCall('CoreModuleDirector.getSubscriptionOfTypeWithToken', {
      type,
      token,
    });

    let subscriptions: SubscriptionModel[];

    switch (type) {
      case SubscriptionChannel._Email:
        subscriptions = this._getEmailSubscriptionModels();
        break;
      case SubscriptionChannel._SMS:
        subscriptions = this._getSmsSubscriptionModels();
        break;
      case SubscriptionChannel._Push:
        subscriptions = this._getAllPushSubscriptionModels();
        break;
      default:
        return undefined;
    }

    return subscriptions.find((subscription) => subscription.token === token);
  }
}
