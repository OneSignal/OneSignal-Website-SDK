import { SimpleModelStore } from 'src/core/modelStores/SimpleModelStore';
import {
  ModelChangeTags,
  type ModelChangeTagValue,
} from 'src/core/types/models';
import type { IDBStoreName } from 'src/shared/database/types';
import { isPushSubscriptionType } from 'src/shared/helpers/subscription';
import { SubscriptionModel } from '../models/SubscriptionModel';

// Implements logic similar to Android SDK's SubscriptionModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/subscriptions/SubscriptionModelStore.kt
export class SubscriptionModelStore extends SimpleModelStore<SubscriptionModel> {
  constructor() {
    super(
      () => new SubscriptionModel(),
      'subscriptions' satisfies IDBStoreName,
    );
  }

  _getBySubscriptionId(subscriptionId: string): SubscriptionModel | undefined {
    return super._list().find((m) => m._id === subscriptionId);
  }

  override _replaceAll(
    models: SubscriptionModel[],
    tag?: ModelChangeTagValue,
  ): void {
    if (tag !== ModelChangeTags._Hydrate) {
      return super._replaceAll(models, tag);
    }

    // When hydrating, preserve properties from existing PUSH subscription
    for (const model of models) {
      if (isPushSubscriptionType(model._type)) {
        const existingPushModel = this._get(model._modelId);
        if (existingPushModel) {
          model._sdk = existingPushModel._sdk;
          model._device_os = existingPushModel._device_os;
        }
        break; // Only modify the first PUSH subscription model
      }
    }

    super._replaceAll(models, tag);
  }
}
