import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { IDManager } from 'src/shared/managers/IDManager';
import log from '../shared/helpers/log';
import { LogMessage } from '../shared/helpers/log/constants';
import MainHelper from '../shared/helpers/MainHelper';
import OneSignal from './OneSignal';

export default class UserDirector {
  static async createUserOnServer(): Promise<void> {
    const identityModel = OneSignal.coreDirector.getIdentityModel();
    const appId = MainHelper.getAppId();

    const allSubscriptions =
      await OneSignal.coreDirector.getAllSubscriptionsModels();
    const hasAnySubscription = allSubscriptions.length > 0;
    const hasExternalId = !!identityModel.externalId;

    if (!hasAnySubscription && !hasExternalId) {
      log(LogMessage.UserDirectorNoSubscriptionOrId);
      return;
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
    // replace models
    const newIdentityModel = new IdentityModel();
    const newPropertiesModel = new PropertiesModel();

    const sdkId = IDManager.createLocalId();
    newIdentityModel.onesignalId = sdkId;
    newPropertiesModel.onesignalId = sdkId;

    OneSignal.coreDirector.identityModelStore.replace(newIdentityModel);
    OneSignal.coreDirector.propertiesModelStore.replace(newPropertiesModel);
  }
}
