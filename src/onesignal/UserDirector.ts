import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { IDManager } from 'src/shared/managers/IDManager';
import MainHelper from '../shared/helpers/MainHelper';
import Log from '../shared/libraries/Log';
import { logMethodCall } from '../shared/utils/utils';
import User from './User';

export default class UserDirector {
  static async initializeUser(): Promise<void> {
    logMethodCall('initializeUser');

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    if (identityModel.onesignalId) {
      Log.debug('User already exists, skipping initialization.');
      return;
    }

    UserDirector.createUserOnServer();
  }

  static async createUserOnServer(): Promise<void> {
    const user = User.createOrGetInstance();
    if (user.isCreatingUser) return;

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    const appId = await MainHelper.getAppId();
    user.isCreatingUser = true;

    const pushOp = await OneSignal.coreDirector.getPushSubscriptionModel();
    if (!pushOp) return Log.info('No push subscription found');

    pushOp.id = pushOp.id ?? IDManager.createLocalId();
    const { id, ...rest } = pushOp.toJSON();
    OneSignal.coreDirector.operationRepo.enqueue(
      new LoginUserOperation(
        appId,
        identityModel.onesignalId,
        identityModel.externalId,
      ),
    );
    OneSignal.coreDirector.operationRepo.enqueue(
      new CreateSubscriptionOperation({
        appId,
        onesignalId: identityModel.onesignalId,
        subscriptionId: id,
        ...rest,
      }),
    );
  }

  static createAndHydrateUser(): Promise<void> {
    return UserDirector.createUserOnServer();
  }

  static resetUserMetaProperties() {
    const user = User.createOrGetInstance();
    user.isCreatingUser = false;
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
