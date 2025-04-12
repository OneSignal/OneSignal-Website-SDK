import { SimpleModelStore } from '../../shared/models/SimpleModelStore';
import { SingletonModelStore } from '../../shared/models/SingletonModelStore';
import { IPreferencesService } from '../../types/preferences';
import { IdentityModel } from './IdentityModel';

// Implements logic similar to Android SDK's IdentityModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/identity/IdentityModelStore.kt
export class IdentityModelStore extends SingletonModelStore<IdentityModel> {
  constructor(prefs: IPreferencesService) {
    super(new SimpleModelStore(() => new IdentityModel(), 'identity', prefs));
  }
}
