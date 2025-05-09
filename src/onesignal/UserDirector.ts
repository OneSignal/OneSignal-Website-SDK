import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { ICreateUser } from 'src/core/types/api';
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

  static createAndHydrateUser(): void {
    UserDirector.createUserOnServer();
  }

  static resetUserMetaProperties() {
    const user = User.createOrGetInstance();
    user.hasOneSignalId = false;
    user.isCreatingUser = false;
  }

  static async getAllUserData(): Promise<ICreateUser> {
    logMethodCall('LoginManager.getAllUserData');

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    const subscriptionModels =
      await OneSignal.coreDirector.getAllSubscriptionsModels();

    const userData: ICreateUser = {
      identity: identityModel.toJSON(),
      properties: propertiesModel.toJSON(),
      subscriptions: subscriptionModels?.map((subscription) =>
        subscription.toJSON(),
      ),
    };

    return userData;
  }
}
