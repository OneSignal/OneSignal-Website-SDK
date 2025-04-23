import { SimpleModelStore } from 'src/shared/models/SimpleModelStore';
import { SingletonModelStore } from 'src/shared/models/SingletonModelStore';
import { PropertiesModel } from '../models/PropertiesModel';

// Implements logic similar to Android's SDK's PropertiesModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/properties/PropertiesModelStore.kt
export class PropertiesModelStore extends SingletonModelStore<PropertiesModel> {
  constructor() {
    super(new SimpleModelStore(() => new PropertiesModel(), 'properties'));
  }
}
