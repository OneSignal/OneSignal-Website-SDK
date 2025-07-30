import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { ModelChangeTags } from 'src/core/types/models';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import MainHelper from '../shared/helpers/MainHelper';

export default class UserDirector {
  static async createUserOnServer(): Promise<void> {
    const identityModel = OneSignal.coreDirector.getIdentityModel();
    const appId = MainHelper.getAppId();

    const allSubscriptions =
      await OneSignal.coreDirector.getAllSubscriptionsModels();
    const hasAnySubscription = allSubscriptions.length > 0;
    const hasExternalId = !!identityModel.externalId;

    if (!hasAnySubscription && !hasExternalId) {
      return Log.info(
        'No subscriptions or external ID found, skipping user creation',
      );
    }

    const pushOp = await OneSignal.coreDirector.getPushSubscriptionModel();
    if (pushOp) {
      const subData = pushOp.toJSON();

      OneSignal.coreDirector.operationRepo.enqueue(
        new LoginUserOperation(
          appId,
          identityModel.onesignalId,
          identityModel.externalId,
        ),
      );
      await OneSignal.coreDirector.operationRepo.enqueueAndWait(
        new CreateSubscriptionOperation({
          ...subData,
          appId,
          onesignalId: identityModel.onesignalId,
          subscriptionId: pushOp.id!,
        }),
      );
    } else {
      OneSignal.coreDirector.operationRepo.enqueue(
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
    const prevOnesignalId =
      OneSignal.coreDirector.getIdentityModel().onesignalId;

    // replace models
    const newIdentityModel = new IdentityModel();
    const newPropertiesModel = new PropertiesModel();

    const sdkId = IDManager.createLocalId();
    newIdentityModel.onesignalId = sdkId;
    newPropertiesModel.onesignalId = sdkId;

    // update onesignalId for all operations in the queue
    const opList = OneSignal.coreDirector.operationRepo.queue;
    opList.forEach((op) => {
      if (
        IDManager.isLocalId(op.operation.onesignalId) &&
        op.operation.onesignalId === prevOnesignalId
      ) {
        op.operation.setProperty('onesignalId', sdkId, ModelChangeTags.HYDRATE);
      }
    });

    OneSignal.coreDirector.identityModelStore.replace(newIdentityModel);
    OneSignal.coreDirector.propertiesModelStore.replace(newPropertiesModel);
  }
}
