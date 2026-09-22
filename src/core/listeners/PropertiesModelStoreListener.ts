import { getAppId } from 'src/shared/helpers/main';

import { PropertiesModel } from '../models/PropertiesModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { type PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { type Operation } from '../operations/Operation';
import { SetPropertyOperation, type PropertyValue } from '../operations/SetPropertyOperation';
import { type IOperationRepo } from '../types/operation';
import { SingletonModelStoreListener } from './SingletonModelStoreListener';

// Implements logic similar to Android SDK's PropertiesModelStoreListener
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/listeners/PropertiesModelStoreListener.kt
export class PropertiesModelStoreListener extends SingletonModelStoreListener<PropertiesModel> {
  private _identityModelStore: IdentityModelStore;

  constructor(
    store: PropertiesModelStore,
    opRepo: IOperationRepo,
    identityModelStore: IdentityModelStore,
  ) {
    super(store, opRepo);
    this._identityModelStore = identityModelStore;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _getReplaceOperation(_model: PropertiesModel): Operation | null {
    // when the property model is replaced, nothing to do on the backend. Already handled via login process.
    return null;
  }

  _getUpdateOperation(
    model: PropertiesModel,
    property: string,
    _oldValue: unknown,
    newValue: unknown,
  ): Operation | null {
    const appId = getAppId();

    return new SetPropertyOperation({
      appId,
      onesignalId: model._onesignalId,
      property,
      value: newValue as PropertyValue[string],
      externalId: this._identityModelStore._model._externalId,
    });
  }
}
