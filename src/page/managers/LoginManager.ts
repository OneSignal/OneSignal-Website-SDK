import { IdentityConstants } from 'src/core/constants';
import { isIvBehaviorActive } from 'src/core/identityVerification';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from 'src/core/operations/UpdateSubscriptionOperation';
import { ModelChangeTags } from 'src/core/types/models';
import { getSubscriptionType } from 'src/shared/environment/detect';
import { getAppId } from 'src/shared/helpers/main';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import { NotificationType } from 'src/shared/subscriptions/constants';

export default class LoginManager {
  // Other internal classes should await on this if they access users
  static _switchingUsersPromise: Promise<void> = Promise.resolve();

  // public api
  static async login(externalId: string, token?: string): Promise<void> {
    await (this._switchingUsersPromise = LoginManager._login(externalId, token));
  }

  private static async _login(externalId: string, token?: string): Promise<void> {
    // Stored before any early return and before the login operation is enqueued,
    // so the dispatch gate finds the token on its first pass. No token is a no-op.
    OneSignal._coreDirector._jwtTokenStore._putJwt(externalId, token);

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const currentOneSignalId = !IDManager._isLocalId(identityModel._onesignalId)
      ? identityModel._onesignalId
      : undefined;
    const currentExternalId = identityModel._externalId;

    if (currentExternalId === externalId) {
      // Same user, no switch. With a token this is the refresh path after a 401,
      // symmetric with updateUserJwt: the queue picks the token up on its next pass.
      Log._debug(
        token ? 'Login: externalId already set, JWT updated' : 'Login: externalId already set',
      );
      return;
    }

    // avoid duplicate identity requests when dev calls init and login in quick succession
    const newIdentityModel = LoginManager._resetAndGetIdentityModel();
    newIdentityModel._setProperty(
      IdentityConstants._ExternalID,
      externalId,
      ModelChangeTags._Hydrate,
    );

    // Under IV the anonymous user was never created on the server, so a
    // reference to it would only send the identify step to a user that does
    // not exist. Go straight to create-user instead.
    const existingOneSignalId =
      !currentExternalId && !isIvBehaviorActive() ? currentOneSignalId : undefined;

    await LoginManager._switchUser(
      newIdentityModel._onesignalId,
      externalId,
      existingOneSignalId,
      true,
    );
  }

  // public api
  static async logout(): Promise<void> {
    await (this._switchingUsersPromise = LoginManager._logout());
  }

  private static async _logout(): Promise<void> {
    const identityModel = OneSignal._coreDirector._getIdentityModel();

    if (!identityModel._externalId) return Log._debug('Logout: not logged in');

    if (isIvBehaviorActive()) return LoginManager._logoutUnderIv(identityModel);

    const newIdentityModel = LoginManager._resetAndGetIdentityModel();
    await LoginManager._switchUser(newIdentityModel._onesignalId);
  }

  /**
   * Under IV the anonymous user that follows a logout has no JWT, so the server
   * would reject a transfer of the subscription to it. Instead, disable push on
   * the user that logs out while the identity is still theirs, then switch to a
   * local anonymous user with no server operation. The next login moves the
   * subscription to that user.
   */
  private static async _logoutUnderIv(identityModel: IdentityModel): Promise<void> {
    const pushModel = await OneSignal._coreDirector._getPushSubscriptionModel();
    if (pushModel) {
      OneSignal._coreDirector._operationRepo._enqueue(
        new UpdateSubscriptionOperation({
          appId: getAppId(),
          onesignalId: identityModel._onesignalId,
          externalId: identityModel._externalId,
          subscriptionId: pushModel.id,
          type: pushModel.type,
          token: pushModel.token,
          enabled: false,
          notification_types: NotificationType._UserOptedOut,
          web_auth: pushModel.web_auth,
          web_p256: pushModel.web_p256,
        }),
      );
    }
    LoginManager._resetAndGetIdentityModel();
  }

  private static _resetAndGetIdentityModel() {
    const newIdentityModel = new IdentityModel();
    const newPropertiesModel = new PropertiesModel();

    const sdkId = IDManager._createLocalId();
    newIdentityModel._onesignalId = sdkId;
    newPropertiesModel._onesignalId = sdkId;

    OneSignal._coreDirector._identityModelStore._replace(newIdentityModel);
    OneSignal._coreDirector._propertiesModelStore._replace(newPropertiesModel);

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
            new TransferSubscriptionOperation({
              appId,
              onesignalId: newOneSignalId,
              subscriptionId: pushOp.id,
              externalId,
            }),
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
        new LoginUserOperation({
          appId,
          onesignalId: newOneSignalId,
          externalId,
          existingOnesignalId: existingOneSignalId,
        }),
      ),
    ]);
  }
}
