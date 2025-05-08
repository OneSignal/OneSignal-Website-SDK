import {
  ModelChangeTags,
  ModelChangeTagValue,
  ModelName,
} from 'src/core/types/models';
import SubscriptionHelper from 'src/shared/helpers/SubscriptionHelper';
import { ModelStore } from '../modelRepo/ModelStore';
import { SubscriptionModel } from '../models/SubscriptionModel';

// Implements logic similar to Android SDK's SubscriptionModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/subscriptions/SubscriptionModelStore.kt
export class SubscriptionModelStore extends ModelStore<SubscriptionModel> {
  constructor() {
    super(ModelName.Subscriptions);
    this.load();
  }

  override create(): null {
    return null;
  }

  getBySubscriptionId(subscriptionId: string): SubscriptionModel | undefined {
    return super.list().find((m) => m.id === subscriptionId);
  }

  override replaceAll(
    models: SubscriptionModel[],
    tag?: ModelChangeTagValue,
  ): void {
    if (tag !== ModelChangeTags.HYDRATE) {
      return super.replaceAll(models, tag);
    }

    // When hydrating, preserve properties from existing PUSH subscription
    for (const model of models) {
      if (SubscriptionHelper.isPushSubscriptionType(model.type)) {
        const existingPushModel = this.get(model.modelId);
        if (existingPushModel) {
          model.sdk = existingPushModel.sdk;
          model.device_os = existingPushModel.device_os;
        }
        break; // Only modify the first PUSH subscription model
      }
    }

    super.replaceAll(models, tag);
  }
}
