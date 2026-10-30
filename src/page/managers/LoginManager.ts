import { IdentityConstants } from 'src/core/constants';
import { isIvBehaviorActive } from 'src/core/identityVerification';
import { SubscriptionModelStoreListener } from 'src/core/listeners/SubscriptionModelStoreListener';
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

/** The part of a user switch that runs after the switch before it ends. */
type SwitchTail = () => Promise<void>;

export default class LoginManager {
  // Other internal classes should await on this if they access users. It never
  // rejects: a failed switch rejects only the promise that login or logout returns.
  static _switchingUsersPromise: Promise<void> = Promise.resolve();

  // public api
  static login(externalId: string, token?: string): Promise<void> {
    return LoginManager._runSwitch(() => LoginManager._beginLogin(externalId, token));
  }

  /**
   * Runs login and logout in call order. `begin` runs at once: it replaces the
   * identity and properties models and enqueues the login operation, so a user
   * data call that follows without an await goes to the new user. The tail that
   * `begin` returns reads the push model, so it waits for the tail before it, and
   * the push operations of each switch keep their order in the queue.
   */
  private static _runSwitch(begin: () => SwitchTail | undefined): Promise<void> {
    let tail: SwitchTail | undefined;
    try {
      tail = begin();
    } catch (e) {
      return Promise.reject(e);
    }
    if (!tail) return LoginManager._switchingUsersPromise;

    const tracked = LoginManager._switchingUsersPromise.then(tail);
    LoginManager._switchingUsersPromise = tracked.catch(() => undefined);
    return tracked;
  }

  private static _beginLogin(externalId: string, token?: string): SwitchTail | undefined {
    // Stored before any early return and before the login operation is enqueued,
    // so the dispatch gate finds the token on its first pass. No token is a no-op.
    const jwtUpdated = OneSignal._coreDirector._jwtTokenStore._putJwt(externalId, token);

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const currentOneSignalId = !IDManager._isLocalId(identityModel._onesignalId)
      ? identityModel._onesignalId
      : undefined;
    const currentExternalId = identityModel._externalId;

    if (currentExternalId === externalId) {
      // Same user, no switch. With a new token this is the refresh path after a 401,
      // symmetric with updateUserJwt: the queue picks the token up on its next pass.
      Log._debug(`Login: externalId already set${jwtUpdated ? ', JWT updated' : ''}`);
      return undefined;
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

    return LoginManager._beginSwitchUser(
      newIdentityModel._onesignalId,
      externalId,
      existingOneSignalId,
      true,
    );
  }

  // public api
  static logout(): Promise<void> {
    return LoginManager._runSwitch(() => LoginManager._beginLogout());
  }

  private static _beginLogout(): SwitchTail | undefined {
    const identityModel = OneSignal._coreDirector._getIdentityModel();

    if (!identityModel._externalId) {
      Log._debug('Logout: not logged in');
      return undefined;
    }

    if (isIvBehaviorActive()) return LoginManager._beginLogoutUnderIv(identityModel);

    const newIdentityModel = LoginManager._resetAndGetIdentityModel();
    return LoginManager._beginSwitchUser(newIdentityModel._onesignalId);
  }

  /**
   * Under IV the anonymous user that follows a logout has no JWT, so the server
   * would reject a transfer of the subscription to it. Instead, disable push on
   * the user that logs out while the identity is still theirs, then switch to a
   * local anonymous user with no server operation. The next login moves the
   * subscription to that user and sends the local push state again.
   *
   * The ids are copied before the reset: the store replaces the identity model
   * in place, so the model object would show the anonymous user.
   */
  private static _beginLogoutUnderIv(identityModel: IdentityModel): SwitchTail {
    const { _onesignalId: onesignalId, _externalId: externalId } = identityModel;
    LoginManager._resetAndGetIdentityModel();

    return async () => {
      const pushModel = await OneSignal._coreDirector._getPushSubscriptionModel();
      // A subscription with a local id never reached the server, so there is nothing to disable.
      if (pushModel && !IDManager._isLocalId(pushModel.id)) {
        OneSignal._coreDirector._operationRepo._enqueue(
          new UpdateSubscriptionOperation({
            appId: getAppId(),
            onesignalId,
            externalId,
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
    };
  }

  /**
   * A logout under IV disabled push on the server, and a transfer does not
   * change that. Send the local push state after the transfer, so the user
   * that logs in gets push again when the device still opts in.
   */
  private static _enqueuePushStateSync(
    appId: string,
    onesignalId: string,
    externalId: string,
    pushModel: SubscriptionModel,
  ): void {
    const { enabled, notification_types } =
      SubscriptionModelStoreListener._getSubscriptionEnabledAndStatus(pushModel);
    OneSignal._coreDirector._operationRepo._enqueue(
      new UpdateSubscriptionOperation({
        appId,
        onesignalId,
        externalId,
        subscriptionId: pushModel.id,
        type: pushModel.type,
        token: pushModel.token,
        enabled,
        notification_types,
        web_auth: pushModel.web_auth,
        web_p256: pushModel.web_p256,
      }),
    );
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

  private static _beginSwitchUser(
    newOneSignalId: string,
    externalId?: string,
    existingOneSignalId?: string,
    createSubIfMissing = false,
  ): SwitchTail {
    const appId = getAppId();

    const loginDone = OneSignal._coreDirector._operationRepo._enqueueAndWait(
      new LoginUserOperation({
        appId,
        onesignalId: newOneSignalId,
        externalId,
        existingOnesignalId: existingOneSignalId,
      }),
    );
    // The tail awaits this later. The handler stops an unhandled rejection until then.
    loginDone.catch(() => undefined);

    return async () => {
      const pushOp = await OneSignal._coreDirector._getPushSubscriptionModel();
      if (pushOp) {
        OneSignal._coreDirector._operationRepo._enqueue(
          new TransferSubscriptionOperation({
            appId,
            onesignalId: newOneSignalId,
            subscriptionId: pushOp.id,
            externalId,
          }),
        );
        if (externalId && isIvBehaviorActive()) {
          LoginManager._enqueuePushStateSync(appId, newOneSignalId, externalId, pushOp);
        }
      } else if (
        createSubIfMissing &&
        // The store listener gives the new model to the current user. After a later
        // switch began, that is the later user, and its own tail adds the model.
        OneSignal._coreDirector._getIdentityModel()._onesignalId === newOneSignalId
      ) {
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
      await loginDone;
    };
  }
}
