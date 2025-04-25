import { IdentityModel } from '../models/IdentityModel';
import { SimpleModelStore } from '../models/SimpleModelStore';
import { SingletonModelStore } from '../models/SingletonModelStore';
import { ModelName } from '../types/models';

// Implements logic similar to Android SDK's IdentityModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/identity/IdentityModelStore.kt
export class IdentityModelStore extends SingletonModelStore<IdentityModel> {
  constructor() {
    super(new SimpleModelStore(() => new IdentityModel(), ModelName.Identity));
  }
}
