import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
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
    const currentExternalId = identityModel.externalId;
    const currentOneSignalId = identityModel.onesignalId;

    // if the current externalId is the same as the one we're trying to set, do nothing
    if (currentExternalId === externalId) {
      Log.debug('Login: External ID already set, skipping login');
      return;
    }

    await UserDirector.createAndSwitchToNewUser((newIdentityModel) => {
      newIdentityModel.externalId = externalId;
    });
    const newIdentityOneSignalId =
      OneSignal.coreDirector.identityModelStore.model.onesignalId;

    const appId = MainHelper.getAppId();
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
    if (!OneSignal.coreDirector.getIdentityModel().externalId)
      return Log.debug('Logout: User is not logged in, skipping logout');

    // create a new anonymous user
    await UserDirector.createAndSwitchToNewUser();

    const appId = MainHelper.getAppId();
    const newIdentityModel = OneSignal.coreDirector.getIdentityModel();
    await OneSignal.coreDirector.operationRepo.enqueueAndWait(
      new LoginUserOperation(
        appId,
        newIdentityModel.onesignalId,
        newIdentityModel.externalId,
      ),
    );
  }
}
