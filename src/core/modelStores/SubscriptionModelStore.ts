import { ModelChangeTags } from 'src/core/types/models';
import { IPreferencesService } from 'src/core/types/preferences';
import { SimpleModelStore } from 'src/shared/models/SimpleModelStore';
import {
  SubscriptionModel,
  isSubscriptionPush,
} from '../models/SubscriptionModels';

export class SubscriptionModelStore extends SimpleModelStore<SubscriptionModel> {
  constructor(prefs: IPreferencesService) {
    super(() => new SubscriptionModel(), 'subscriptions', prefs);
  }

  override replaceAll(models: SubscriptionModel[], tag: string): void {
    if (tag !== ModelChangeTags.HYDRATE) {
      return super.replaceAll(models, tag);
    }

    // When hydrating, preserve properties from existing PUSH subscription
    for (const model of models) {
      if (isSubscriptionPush(model)) {
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
