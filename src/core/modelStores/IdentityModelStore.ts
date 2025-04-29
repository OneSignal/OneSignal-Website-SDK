import { IdentityModel } from '../models/IdentityModel';
import { ModelName } from '../types/models';
import { SimpleModelStore } from './SimpleModelStore';
import { SingletonModelStore } from './SingletonModelStore';

// Implements logic similar to Android SDK's IdentityModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/identity/IdentityModelStore.kt
export class IdentityModelStore extends SingletonModelStore<IdentityModel> {
  constructor() {
    super(new SimpleModelStore(() => new IdentityModel(), ModelName.Identity));
  }
}
