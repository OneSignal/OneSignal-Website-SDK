import { OP_REPO_EXECUTION_INTERVAL } from 'src/core/operationRepo/constants';
import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { IDManager } from 'src/shared/managers/IDManager';
import MainHelper from '../shared/helpers/MainHelper';
import Log from '../shared/libraries/Log';
import { delay, logMethodCall } from '../shared/utils/utils';
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

    // in case OneSignal.init and OneSignal.login are both called in a short time period
    // we need this create operation to finish before attempting to execute the login (with external id) operation
    // otherwise the login operation executor will error since there will be two login operations
    await delay(OP_REPO_EXECUTION_INTERVAL * 2);
  }

  static createAndHydrateUser(): Promise<void> {
    return UserDirector.createUserOnServer();
  }

  static resetUserMetaProperties() {
    const user = User.createOrGetInstance();
    user.isCreatingUser = false;
  }
}
