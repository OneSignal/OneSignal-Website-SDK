import { IdentityConstants } from 'src/core/constants';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { ModelChangeTags } from 'src/core/types/models';
import { db } from 'src/shared/database/client';
import { getSubscriptionType } from 'src/shared/environment/detect';
import { getAppId } from 'src/shared/helpers/main';
import { IDManager } from 'src/shared/managers/IDManager';
import { resetUserModels } from '../../onesignal/userDirector';
import Log from '../../shared/libraries/Log';

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

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const currentOneSignalId = !IDManager._isLocalId(identityModel._onesignalId)
      ? identityModel._onesignalId
      : undefined;
    const currentExternalId = identityModel._externalId;

    if (currentExternalId === externalId) {
      Log._debug('Login: External ID already set, skipping login');
      return;
    }

    // avoid duplicate identity requests when dev calls init and login in quick succession
    const newIdentityModel = LoginManager._resetAndGetIdentityModel();
    newIdentityModel._setProperty(
      IdentityConstants._ExternalID,
      externalId,
      ModelChangeTags._Hydrate,
    );

    await LoginManager._switchUser(
      newIdentityModel._onesignalId,
      externalId,
      !currentExternalId ? currentOneSignalId : undefined,
      true,
    );
  }

  // public api
  static async logout(): Promise<void> {
    await (this._switchingUsersPromise = LoginManager._logout());
  }

  private static async _logout(): Promise<void> {
    const identityModel = OneSignal._coreDirector._getIdentityModel();

    if (!identityModel._externalId)
      return Log._debug('Logout: User is not logged in, skipping logout');

    const newIdentityModel = LoginManager._resetAndGetIdentityModel();
    await LoginManager._switchUser(newIdentityModel._onesignalId);
  }

  private static _resetAndGetIdentityModel() {
    resetUserModels();
    return OneSignal._coreDirector._getIdentityModel();
  }

  private static async _switchUser(
    newOneSignalId: string,
    externalId?: string,
    existingOneSignalId?: string,
    createSubIfMissing = false,
  ): Promise<void> {
    const appId = getAppId();

    await Promise.all([
      OneSignal._coreDirector._getPushSubscriptionModel().then((pushOp) => {
        if (pushOp) {
          OneSignal._coreDirector._operationRepo._enqueue(
            new TransferSubscriptionOperation(appId, newOneSignalId, pushOp.id),
          );
        } else if (createSubIfMissing) {
          const newSub = new SubscriptionModel();
          newSub._mergeData({
            enabled: true,
            id: IDManager._createLocalId(),
            onesignalId: newOneSignalId,
            type: getSubscriptionType(),
            token: '',
          });
          OneSignal._coreDirector._subscriptionModelStore._add(newSub);
        }
      }),
      OneSignal._coreDirector._operationRepo._enqueueAndWait(
        new LoginUserOperation(
          appId,
          newOneSignalId,
          externalId,
          existingOneSignalId,
        ),
      ),
    ]);
  }
}
