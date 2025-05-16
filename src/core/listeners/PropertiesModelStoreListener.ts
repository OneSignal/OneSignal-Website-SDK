import MainHelper from 'src/shared/helpers/MainHelper';
import { PropertiesModel } from '../models/PropertiesModel';
import { type PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { DeleteTagOperation } from '../operations/DeleteTagOperation';
import { type Operation } from '../operations/Operation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { SetTagOperation } from '../operations/SetTagOperation';
import { type IOperationRepo } from '../types/operation';
import { SingletonModelStoreListener } from './SingletonModelStoreListener';

// Implements logic similar to Android SDK's PropertiesModelStoreListener
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/listeners/PropertiesModelStoreListener.kt
export class PropertiesModelStoreListener extends SingletonModelStoreListener<PropertiesModel> {
  constructor(store: PropertiesModelStore, opRepo: IOperationRepo) {
    super(store, opRepo);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getReplaceOperation(_model: PropertiesModel): Operation | null {
    // when the property model is replaced, nothing to do on the backend. Already handled via login process.
    return null;
  }

  async getUpdateOperation(
    model: PropertiesModel,
    property: string,
    _oldValue: unknown,
    newValue: unknown,
  ): Promise<Operation | null> {
    const appId = await MainHelper.getAppId();
    if (property === 'tags') {
      if (newValue != null && typeof newValue === 'string') {
        return new SetTagOperation(
          appId,
          model.onesignalId,
          property,
          newValue,
        );
      }
      return new DeleteTagOperation(appId, model.onesignalId, property);
    }

    return new SetPropertyOperation(
      appId,
      model.onesignalId,
      property,
      newValue,
    );
  }
}
