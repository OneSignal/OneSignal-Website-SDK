import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { ModelChangeTags } from 'src/core/types/models';
import MainHelper from 'src/shared/helpers/MainHelper';
import OneSignal from '../../onesignal/OneSignal';
import UserDirector from '../../onesignal/UserDirector';
import Log from '../../shared/libraries/Log';
import Database from '../../shared/services/Database';

export default class LoginManager {
  // Other internal classes should await on this if they access users
  static switchingUsersPromise: Promise<void> = Promise.resolve();

  static async login(externalId: string, token?: string): Promise<void> {
    await (this.switchingUsersPromise = LoginManager._login(externalId, token));
  }

  private static async _login(
    externalId: string,
    token?: string,
  ): Promise<void> {
    if (token) {
      Database.setJWTToken(token);
    }

    let identityModel = OneSignal.coreDirector.getIdentityModel();
    const currentOneSignalId = identityModel.onesignalId;
    const currentExternalId = identityModel.externalId;

    // if the current externalId is the same as the one we're trying to set, do nothing
    if (currentExternalId === externalId) {
      Log.debug('Login: External ID already set, skipping login');
      return;
    }

    UserDirector.resetUserModels();
    identityModel = OneSignal.coreDirector.getIdentityModel();

    // avoid duplicate identity requests, this is needed if dev calls init and login in quick succession e.g.
    // e.g. OneSignalDeferred.push(OneSignal) => OneSignal.init({...})); OneSignalDeferred.push(OneSignal) => OneSignal.login('some-external-id'));
    identityModel.setProperty(
      'external_id',
      externalId,
      ModelChangeTags.HYDRATE,
    );
    const newIdentityOneSignalId = identityModel.onesignalId;

    const appId = MainHelper.getAppId();

    const pushOp = await OneSignal.coreDirector.getPushSubscriptionModel();
    if (pushOp) {
      OneSignal.coreDirector.operationRepo.enqueue(
        new TransferSubscriptionOperation(
          appId,
          newIdentityOneSignalId,
          pushOp.id,
        ),
      );
    }

    await OneSignal.coreDirector.operationRepo.enqueueAndWait(
      new LoginUserOperation(
        appId,
        newIdentityOneSignalId,
        externalId,
        !currentExternalId ? currentOneSignalId : undefined,
      ),
    );
  }

  static async logout(): Promise<void> {
    await (this.switchingUsersPromise = LoginManager._logout());
  }

  private static async _logout(): Promise<void> {
    // check if user is already logged out
    const identityModel = OneSignal.coreDirector.getIdentityModel();

    if (!identityModel.externalId)
      return Log.debug('Logout: User is not logged in, skipping logout');

    UserDirector.resetUserModels();

    // create a new anonymous user
    return UserDirector.createUserOnServer();
  }
}
