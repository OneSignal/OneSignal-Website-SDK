import { IdentityModel } from '../models/IdentityModel';
import { PropertiesModel } from '../models/PropertiesModel';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import type { IRebuildUserService } from '../types/user';

// Implements logic similar to Android SDK's RebuildUserService
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/builduser/impl/RebuildUserService.kt
export class RebuildUserService implements IRebuildUserService {
  private _identityModelStore: IdentityModelStore;
  private _propertiesModelStore: PropertiesModelStore;
  private _subscriptionsModelStore: SubscriptionModelStore;

  constructor(
    _identityModelStore: IdentityModelStore,
    _propertiesModelStore: PropertiesModelStore,
    _subscriptionsModelStore: SubscriptionModelStore,
  ) {
    this._identityModelStore = _identityModelStore;
    this._propertiesModelStore = _propertiesModelStore;
    this._subscriptionsModelStore = _subscriptionsModelStore;
  }

  async getRebuildOperationsIfCurrentUser(
    appId: string,
    onesignalId: string,
  ): Promise<Operation[] | null> {
    const identityModel = new IdentityModel();
    identityModel._initializeFromModel(null, this._identityModelStore.model);

    const propertiesModel = new PropertiesModel();
    propertiesModel._initializeFromModel(
      null,
      this._propertiesModelStore.model,
    );

    const subscriptionModels: SubscriptionModel[] = [];
    for (const activeSubscription of this._subscriptionsModelStore.list()) {
      const subscriptionModel = new SubscriptionModel();
      subscriptionModel._initializeFromModel(null, activeSubscription);
      subscriptionModels.push(subscriptionModel);
    }

    if (identityModel.onesignalId !== onesignalId) {
      return null;
    }

    const operations: Operation[] = [];
    operations.push(
      new LoginUserOperation(appId, onesignalId, identityModel.externalId),
    );

    const pushSubscription =
      await OneSignal._coreDirector.getPushSubscriptionModel();
    if (pushSubscription) {
      operations.push(
        new CreateSubscriptionOperation({
          appId,
          onesignalId,
          subscriptionId: pushSubscription.id,
          type: pushSubscription.type,
          enabled: pushSubscription.enabled,
          token: pushSubscription.token,
          notification_types: pushSubscription.notification_types,
        }),
      );
    }

    operations.push(new RefreshUserOperation(appId, onesignalId));
    return operations;
  }
}
