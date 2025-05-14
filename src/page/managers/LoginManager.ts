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

      const identityModel = OneSignal.coreDirector.getIdentityModel();
      const currentOneSignalId = identityModel.onesignalId;
      const currentExternalId = identityModel.externalId;
      console.log('1', { currentOneSignalId, currentExternalId });

      // if the current externalId is the same as the one we're trying to set, do nothing
      if (currentExternalId === externalId) {
        Log.debug('Login: External ID already set, skipping login');
        return;
      }

      const appId = await MainHelper.getAppId();
      await OneSignal.coreDirector.operationRepo.enqueueAndWait(
        new LoginUserOperation(
          appId,
          currentOneSignalId,
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

    if (!identityModel.externalId) {
      Log.debug('Logout: User is not logged in, skipping logout');
      return;
    }

    // before, logging out, process anything waiting in the delta queue so it's not lost
    UserDirector.resetUserMetaProperties();
    const pushSubModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    // Initialize as a local User, as we don't have a push subscription to create a remote anonymous user.
    if (pushSubModel === undefined) {
      await UserDirector.initializeUser();
      return;
    }

    // add the push subscription model back to the repo since we need at least 1 sub to create a new user
    OneSignal.coreDirector.addSubscriptionModel(pushSubModel);

    // Initialize as non-local, make a request to OneSignal to create a new anonymous user
    await UserDirector.initializeUser();
  }
}
