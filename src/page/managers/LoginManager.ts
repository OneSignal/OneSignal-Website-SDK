import { IdentityConstants } from 'src/core/constants';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { ModelChangeTags } from 'src/core/types/models';
import { db } from 'src/shared/database/client';
import { getAppId } from 'src/shared/helpers/main';
import { debug } from 'src/shared/libraries/log';
import { IDManager } from 'src/shared/managers/IDManager';
import {
  createUserOnServer,
  resetUserModels,
} from '../../onesignal/userDirector';

export default class LoginManager {
  // Other internal classes should await on this if they access users
  static _switchingUsersPromise: Promise<void> = Promise.resolve();

  // public api
  static async login(externalId: string, token?: string): Promise<void> {
    await (this._switchingUsersPromise = LoginManager._login(
      externalId,
      token,
    ));
  }

  private static async _login(
    externalId: string,
    token?: string,
  ): Promise<void> {
    if (token) {
      db.put('Ids', { id: token, type: 'jwtToken' });
    }

    let identityModel = OneSignal._coreDirector._getIdentityModel();
    const currentOneSignalId = !IDManager._isLocalId(identityModel._onesignalId)
      ? identityModel._onesignalId
      : undefined;
    const currentExternalId = identityModel._externalId;

    // if the current externalId is the same as the one we're trying to set, do nothing
    if (currentExternalId === externalId) {
      debug('Login: External ID already set, skipping login');
      return;
    }

    resetUserModels();
    identityModel = OneSignal._coreDirector._getIdentityModel();

    // avoid duplicate identity requests, this is needed if dev calls init and login in quick succession e.g.
    // e.g. OneSignalDeferred.push(OneSignal) => OneSignal.init({...})); OneSignalDeferred.push(OneSignal) => OneSignal.login('some-external-id'));
    identityModel._setProperty(
      IdentityConstants._ExternalID,
      externalId,
      ModelChangeTags._Hydrate,
    );
    const newIdentityOneSignalId = identityModel._onesignalId;
    const appId = getAppId();

    const promises: Promise<void>[] = [
      OneSignal._coreDirector._getPushSubscriptionModel().then((pushOp) => {
        if (pushOp) {
          OneSignal._coreDirector._operationRepo._enqueue(
            new TransferSubscriptionOperation(
              appId,
              newIdentityOneSignalId,
              pushOp.id,
            ),
          );
        }
      }),
      OneSignal._coreDirector._operationRepo._enqueueAndWait(
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

  // public api
  static async logout(): Promise<void> {
    await (this._switchingUsersPromise = LoginManager._logout());
  }

  private static async _logout(): Promise<void> {
    // check if user is already logged out
    const identityModel = OneSignal._coreDirector._getIdentityModel();

    if (!identityModel._externalId)
      return debug('Logout: User is not logged in, skipping logout');

    resetUserModels();

    // create a new anonymous user
    return createUserOnServer();
  }
}
