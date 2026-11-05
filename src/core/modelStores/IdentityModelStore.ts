import type { IDBStoreName } from 'src/shared/database/types';

import { IdentityModel } from '../models/IdentityModel';
import { SimpleModelStore } from './SimpleModelStore';
import { SingletonModelStore } from './SingletonModelStore';

// Implements logic similar to Android SDK's IdentityModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/identity/IdentityModelStore.kt
export class IdentityModelStore extends SingletonModelStore<IdentityModel> {
  readonly _loaded: Promise<void>;

  constructor() {
    const store = new SimpleModelStore(
      () => new IdentityModel(),
      'identity' satisfies IDBStoreName,
    );
    super(store);
    this._loaded = store._loaded;
  }
}
