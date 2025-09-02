import { IdentityConstants } from 'src/core/constants';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { ModelChangeTags } from 'src/core/types/models';
import { db } from 'src/shared/database/client';
import MainHelper from 'src/shared/helpers/MainHelper';
import { IDManager } from 'src/shared/managers/IDManager';
import UserDirector from '../../onesignal/UserDirector';
import Log from '../../shared/libraries/Log';

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
      db.put('Ids', { id: token, type: 'jwtToken' });
    }

    let identityModel = OneSignal._coreDirector._getIdentityModel();
    const currentOneSignalId = !IDManager._isLocalId(identityModel.onesignalId)
      ? identityModel.onesignalId
      : undefined;
    const currentExternalId = identityModel.externalId;

    // if the current externalId is the same as the one we're trying to set, do nothing
    if (currentExternalId === externalId) {
      Log.debug('Login: External ID already set, skipping login');
      return;
    }

    UserDirector.resetUserModels();
    identityModel = OneSignal._coreDirector._getIdentityModel();

    // avoid duplicate identity requests, this is needed if dev calls init and login in quick succession e.g.
    // e.g. OneSignalDeferred.push(OneSignal) => OneSignal.init({...})); OneSignalDeferred.push(OneSignal) => OneSignal.login('some-external-id'));
    identityModel.setProperty(
      IdentityConstants.EXTERNAL_ID,
      externalId,
      ModelChangeTags.HYDRATE,
    );
    const newIdentityOneSignalId = identityModel.onesignalId;
    const appId = MainHelper.getAppId();

    const promises: Promise<void>[] = [
      OneSignal._coreDirector.getPushSubscriptionModel().then((pushOp) => {
        if (pushOp) {
          OneSignal._coreDirector.operationRepo.enqueue(
            new TransferSubscriptionOperation(
              appId,
              newIdentityOneSignalId,
              pushOp.id,
            ),
          );
        }
      }),
      OneSignal._coreDirector.operationRepo.enqueueAndWait(
        new LoginUserOperation(
          appId,
          newIdentityOneSignalId,
          externalId,
          !currentExternalId ? currentOneSignalId : undefined,
        ),
      ),
    ];

    await Promise.all(promises);
  }

  static async logout(): Promise<void> {
    await (this.switchingUsersPromise = LoginManager._logout());
  }

  private static async _logout(): Promise<void> {
    // check if user is already logged out
    const identityModel = OneSignal._coreDirector._getIdentityModel();

    if (!identityModel.externalId)
      return Log.debug('Logout: User is not logged in, skipping logout');

    UserDirector.resetUserModels();

    // create a new anonymous user
    return UserDirector.createUserOnServer();
  }
}
