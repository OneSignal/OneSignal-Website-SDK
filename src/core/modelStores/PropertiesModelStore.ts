import { SimpleModelStore } from 'src/core/models/SimpleModelStore';
import { SingletonModelStore } from 'src/core/models/SingletonModelStore';
import { PropertiesModel } from '../models/PropertiesModel';
import { ModelName } from '../types/models';

// Implements logic similar to Android's SDK's PropertiesModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/properties/PropertiesModelStore.kt
export class PropertiesModelStore extends SingletonModelStore<PropertiesModel> {
  constructor() {
    super(
      new SimpleModelStore(() => new PropertiesModel(), ModelName.Properties),
    );
  }
}
