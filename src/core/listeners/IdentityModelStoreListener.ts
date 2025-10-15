import MainHelper from 'src/shared/helpers/MainHelper';
import { type IdentityModel } from '../models/IdentityModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { type Operation } from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { type IOperationRepo } from '../types/operation';
import { SingletonModelStoreListener } from './SingletonModelStoreListener';

// Implements logic similar to Android SDK's IdentityModelStoreListener
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/listeners/IdentityModelStoreListener.kt
export class IdentityModelStoreListener extends SingletonModelStoreListener<IdentityModel> {
  constructor(store: IdentityModelStore, opRepo: IOperationRepo) {
    super(store, opRepo);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _getReplaceOperation(_model: IdentityModel): Operation | null {
    // when the identity model is replaced, nothing to do on the backend. Already handled via login process.
    return null;
  }

  _getUpdateOperation(
    model: IdentityModel,
    property: string,
    _oldValue: unknown,
    newValue: unknown,
  ): Operation {
    const appId = MainHelper._getAppId();
    if (newValue != null && typeof newValue === 'string') {
      return new SetAliasOperation(
        appId,
        model.onesignalId,
        property,
        newValue,
      );
    } else {
      return new DeleteAliasOperation(appId, model.onesignalId, property);
    }
  }
}
