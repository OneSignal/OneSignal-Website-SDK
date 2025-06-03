import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import OneSignal from '../../onesignal/OneSignal';
import UserDirector from '../../onesignal/UserDirector';
import OneSignalError from '../../shared/errors/OneSignalError';
import MainHelper from '../../shared/helpers/MainHelper';
import Log from '../../shared/libraries/Log';
import Database from '../../shared/services/Database';
import LocalStorage from '../../shared/utils/LocalStorage';

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
    const consentRequired = LocalStorage.getConsentRequired();
    const consentGiven = await Database.getConsentGiven();

    if (consentRequired && !consentGiven) {
      throw new OneSignalError(
        'Login: Consent required but not given, skipping login',
      );
    }

    try {
      if (token) {
        await Database.setJWTToken(token);
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

      identityModel.externalId = externalId;
      const newIdentityOneSignalId = identityModel.onesignalId;

      const appId = await MainHelper.getAppId();
      await OneSignal.coreDirector.operationRepo.enqueueAndWait(
        new LoginUserOperation(
          appId,
          newIdentityOneSignalId,
          externalId,
          !currentExternalId ? currentOneSignalId : undefined,
        ),
      );
    } catch (e) {
      Log.error(e);
    }
  }

  static async logout(): Promise<void> {
    await (this.switchingUsersPromise = LoginManager._logout());
  }

  private static async _logout(): Promise<void> {
    // check if user is already logged out
    const identityModel = OneSignal.coreDirector.getIdentityModel();

    if (!identityModel.externalId)
      return Log.debug('Logout: User is not logged in, skipping logout');

    UserDirector.resetUserMetaProperties();
    UserDirector.resetUserModels();

    // create a new anonymous user
    UserDirector.createUserOnServer();
  }
}
