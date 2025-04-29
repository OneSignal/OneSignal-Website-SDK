import MainHelper from 'src/shared/helpers/MainHelper';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { type Operation } from '../operations/Operation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { IOperationRepo } from '../types/operation';
import { NotificationType, NotificationTypeValue } from '../types/subscription';
import { ModelStoreListener } from './ModelStoreListener';

// Implements logic similar to Android SDK's SubscriptionModelStoreListener
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/listeners/SubscriptionModelStoreListener.kt
export class SubscriptionModelStoreListener extends ModelStoreListener<SubscriptionModel> {
  private _identityModelStore: IdentityModelStore;

  constructor(
    store: SubscriptionModelStore,
    opRepo: IOperationRepo,
    identityModelStore: IdentityModelStore,
  ) {
    super(store, opRepo);
    this._identityModelStore = identityModelStore;
  }

  async getAddOperation(model: SubscriptionModel): Promise<Operation> {
    const { enabled, notification_types } =
      SubscriptionModelStoreListener.getSubscriptionEnabledAndStatus(model);

    const appId = await MainHelper.getAppId();
    return new CreateSubscriptionOperation({
      appId,
      onesignalId: this._identityModelStore.model.onesignalId,
      subscriptionId: model.id,
      type: model.type,
      enabled,
      token: model.token,
      notification_types,
    });
  }

  async getRemoveOperation(model: SubscriptionModel): Promise<Operation> {
    const appId = await MainHelper.getAppId();
    return new DeleteSubscriptionOperation(
      appId,
      this._identityModelStore.model.onesignalId,
      model.id,
    );
  }

  async getUpdateOperation(model: SubscriptionModel): Promise<Operation> {
    const { enabled, notification_types } =
      SubscriptionModelStoreListener.getSubscriptionEnabledAndStatus(model);
    const appId = await MainHelper.getAppId();

    return new UpdateSubscriptionOperation({
      appId,
      onesignalId: this._identityModelStore.model.onesignalId,
      subscriptionId: model.id,
      type: model.type,
      enabled,
      token: model.token,
      notification_types,
    });
  }

  private static getSubscriptionEnabledAndStatus(model: SubscriptionModel): {
    enabled: boolean;
    notification_types: NotificationTypeValue | undefined;
  } {
    let enabled: boolean;
    let notification_types: NotificationTypeValue | undefined;

    if (
      model.enabled &&
      model.notification_types === NotificationType.Subscribed &&
      model.token
    ) {
      enabled = true;
      notification_types = NotificationType.Subscribed;
    } else {
      enabled = false;
      notification_types = !model.enabled
        ? NotificationType.UserOptedOut
        : model.notification_types;
    }

    return { enabled, notification_types };
  }
}
