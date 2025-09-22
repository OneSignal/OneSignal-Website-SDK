import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import MainHelper from '../shared/helpers/MainHelper';

export default class UserDirector {
  static async createUserOnServer(): Promise<void> {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const appId = MainHelper.getAppId();

    const hasAnySubscription =
      OneSignal._coreDirector._subscriptionModelStore.list().length > 0;

    const hasExternalId = !!identityModel.externalId;

    if (!hasAnySubscription && !hasExternalId) {
      Log._error(
        'No subscriptions or external ID found, skipping user creation',
      );
      return;
    }

    const pushOp = await OneSignal._coreDirector._getPushSubscriptionModel();
    if (pushOp) {
      const subData = pushOp.toJSON();

      OneSignal._coreDirector._operationRepo.enqueue(
        new LoginUserOperation(
          appId,
          identityModel.onesignalId,
          identityModel.externalId,
        ),
      );
      await OneSignal._coreDirector._operationRepo.enqueueAndWait(
        new CreateSubscriptionOperation({
          ...subData,
          appId,
          onesignalId: identityModel.onesignalId,
          subscriptionId: pushOp.id!,
        }),
      );
    } else {
      OneSignal._coreDirector._operationRepo.enqueue(
        new LoginUserOperation(
          appId,
          identityModel.onesignalId,
          identityModel.externalId,
        ),
      );
    }
  }

  // Resets models similar to Android SDK
  // https://github.com/OneSignal/OneSignal-Android-SDK/blob/ed2e87618ea3af81b75f97b0a4cbb8f658c7fc80/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/internal/OneSignalImp.kt#L448
  static resetUserModels() {
    // replace models
    const newIdentityModel = new IdentityModel();
    const newPropertiesModel = new PropertiesModel();

    const sdkId = IDManager._createLocalId();
    newIdentityModel.onesignalId = sdkId;
    newPropertiesModel.onesignalId = sdkId;

    OneSignal._coreDirector._identityModelStore.replace(newIdentityModel);
    OneSignal._coreDirector._propertiesModelStore.replace(newPropertiesModel);
  }
}
