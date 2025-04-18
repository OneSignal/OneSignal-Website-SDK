import { ModelChangeTags, ModelChangeTagValue } from 'src/core/types/models';
import { IPreferencesService } from 'src/core/types/preferences';
import { SimpleModelStore } from 'src/shared/models/SimpleModelStore';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { SubscriptionType, SubscriptionTypeValue } from '../types/api';

// Implements logic similar to Android SDK's SubscriptionModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/subscriptions/SubscriptionModelStore.kt
export class SubscriptionModelStore extends SimpleModelStore<SubscriptionModel> {
  constructor(prefs: IPreferencesService) {
    super(() => new SubscriptionModel(), 'subscriptions', prefs);
  }

  override replaceAll(
    models: SubscriptionModel[],
    tag: ModelChangeTagValue,
  ): void {
    if (tag !== ModelChangeTags.HYDRATE) {
      return super.replaceAll(models, tag);
    }

    // When hydrating, preserve properties from existing PUSH subscription
    for (const model of models) {
      if (isSubscriptionPush(model.type)) {
        const existingPushModel = this.get(model.id);
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

const isSubscriptionPush = (
  type: SubscriptionTypeValue,
): type is Exclude<SubscriptionTypeValue, 'Email' | 'SMS'> =>
  type === SubscriptionType.ChromePush ||
  type === SubscriptionType.SafariPush ||
  type === SubscriptionType.SafariLegacyPush ||
  type === SubscriptionType.FirefoxPush;
