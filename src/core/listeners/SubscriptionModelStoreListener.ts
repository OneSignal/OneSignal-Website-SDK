import { getAppId } from 'src/shared/helpers/main';
import { NotificationType } from 'src/shared/subscriptions/constants';
import type { NotificationTypeValue } from 'src/shared/subscriptions/types';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { type Operation } from '../operations/Operation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import type { IOperationRepo } from '../types/operation';
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

  _getAddOperation(model: SubscriptionModel): Operation {
    const { enabled, notification_types } =
      SubscriptionModelStoreListener._getSubscriptionEnabledAndStatus(model);

    const appId = getAppId();
    return new CreateSubscriptionOperation({
      appId,
      onesignalId: this._identityModelStore._model._onesignalId,
      subscriptionId: model.id,
      type: model.type,
      enabled,
      token: model.token,
      notification_types,
    });
  }

  _getRemoveOperation(model: SubscriptionModel): Operation {
    const appId = getAppId();
    return new DeleteSubscriptionOperation(
      appId,
      this._identityModelStore._model._onesignalId,
      model.id,
    );
  }

  _getUpdateOperation(model: SubscriptionModel): Operation {
    const { enabled, notification_types } =
      SubscriptionModelStoreListener._getSubscriptionEnabledAndStatus(model);
    const appId = getAppId();

    return new UpdateSubscriptionOperation({
      appId,
      onesignalId: this._identityModelStore._model._onesignalId,
      subscriptionId: model.id,
      type: model.type,
      enabled,
      token: model.token,
      notification_types,
      web_auth: model.web_auth,
      web_p256: model.web_p256,
    });
  }

  private static _getSubscriptionEnabledAndStatus(model: SubscriptionModel): {
    enabled: boolean;
    notification_types: NotificationTypeValue | undefined;
  } {
    let enabled: boolean;
    let notification_types: NotificationTypeValue | undefined;

    if (
      model.enabled &&
      model._notification_types === NotificationType._Subscribed &&
      model.token
    ) {
      enabled = true;
      notification_types = NotificationType._Subscribed;
    } else {
      enabled = false;
      notification_types = !model.enabled
        ? NotificationType._UserOptedOut
        : model._notification_types;
    }

    return { enabled, notification_types };
  }
}
