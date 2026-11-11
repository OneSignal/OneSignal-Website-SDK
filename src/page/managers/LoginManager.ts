import { IdentityConstants } from 'src/core/constants';
import { isIvBehaviorActive } from 'src/core/identityVerification';
import { SubscriptionModelStoreListener } from 'src/core/listeners/SubscriptionModelStoreListener';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import type { Operation } from 'src/core/operations/Operation';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from 'src/core/operations/UpdateSubscriptionOperation';
import { ModelChangeTags } from 'src/core/types/models';
import { getSubscriptionType } from 'src/shared/environment/detect';
import { getAppId } from 'src/shared/helpers/main';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import { NotificationType } from 'src/shared/subscriptions/constants';

type EnqueuePushOp = (operation: Operation) => void;

type SwitchStart = {
  /** Reads the push model, which is async, and enqueues the push operations of the switch. */
  pushStep: (enqueue: EnqueuePushOp) => Promise<void>;
  loginOp?: LoginUserOperation;
  loginDone?: Promise<void>;
};

export default class LoginManager {
  // Other internal classes should await on this if they access users. It never
  // rejects: a failed switch rejects only the promise that login or logout returns.
  static _switchingUsersPromise: Promise<void> = Promise.resolve();

  private static _pushStepsDone: Promise<void> = Promise.resolve();
  private static _pendingPushSteps = 0;
  private static _heldLogins: LoginUserOperation[] = [];
  private static _pushOps = new WeakSet<Operation>();

  // public api
  static login(externalId: string, token?: string): Promise<void> {
    return LoginManager._runSwitch(() => LoginManager._beginLogin(externalId, token));
  }

  /**
   * Runs login and logout in call order. `begin` runs at once: it replaces the
   * identity and properties models and enqueues the login operation, so a user
   * data call that follows without an await goes to the new user.
   *
   * The push step of each switch waits only for the push step before it, never
   * for a login operation, so a login that waits for a JWT does not block a
   * later switch. Each push step puts its operations ahead of the login
   * operation of every later switch, and the queue holds those login operations
   * until no push step is pending. Thus the server gets the push operations in
   * call order, and each one keeps the ids of its own user.
   */
  private static _runSwitch(begin: () => SwitchStart | undefined): Promise<void> {
    let start: SwitchStart | undefined;
    try {
      start = begin();
    } catch (e) {
      return Promise.reject(e);
    }
    if (!start) return LoginManager._switchingUsersPromise;

    const { pushStep, loginOp, loginDone } = start;
    if (loginOp) LoginManager._heldLogins.push(loginOp);
    const laterLoginIndex = LoginManager._heldLogins.length;
    const enqueue: EnqueuePushOp = (operation) => {
      LoginManager._pushOps.add(operation);
      const repo = OneSignal._coreDirector._operationRepo;
      const laterLogin = LoginManager._heldLogins[laterLoginIndex];
      if (laterLogin) repo._enqueueBefore(operation, laterLogin);
      else repo._enqueue(operation);
    };

    LoginManager._pendingPushSteps++;
    const pushDone = LoginManager._pushStepsDone
      .then(() => pushStep(enqueue))
      .finally(() => LoginManager._onPushStepDone());
    LoginManager._pushStepsDone = pushDone.catch(() => undefined);

    const done = loginDone ? pushDone.then(() => loginDone) : pushDone;
    LoginManager._switchingUsersPromise = done.catch(() => undefined);
    return done;
  }

  /**
   * A push operation of an earlier switch that still has a local user id waits
   * for a login that did not run, maybe because it waits for a JWT. It would run
   * after a new transfer and move the subscription back to the earlier user.
   * Returns true if a removed operation was the create of the subscription: the
   * subscription then has no server id, so the later switch must create it.
   */
  private static _removeStalePushOps(subscriptionId: string): boolean {
    const repo = OneSignal._coreDirector._operationRepo;
    const isStale = (op: Operation) =>
      LoginManager._pushOps.has(op) &&
      (op instanceof CreateSubscriptionOperation ||
        op instanceof TransferSubscriptionOperation ||
        op instanceof UpdateSubscriptionOperation) &&
      op._subscriptionId === subscriptionId &&
      IDManager._isLocalId(op._onesignalId);
    const removesCreate = repo._queue.some(
      ({ operation }) => operation instanceof CreateSubscriptionOperation && isStale(operation),
    );
    repo._removeQueued(isStale);
    return removesCreate;
  }

  private static _onPushStepDone(): void {
    if (--LoginManager._pendingPushSteps > 0) return;
    LoginManager._heldLogins.forEach((op) => (op._heldBySwitch = false));
    LoginManager._heldLogins = [];
  }

  private static _beginLogin(externalId: string, token?: string): SwitchStart | undefined {
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

  private static _beginLogout(): SwitchStart | undefined {
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
  private static _beginLogoutUnderIv(identityModel: IdentityModel): SwitchStart {
    const { _onesignalId: onesignalId, _externalId: externalId } = identityModel;
    LoginManager._resetAndGetIdentityModel();

    const pushStep = async (enqueue: EnqueuePushOp) => {
      const pushModel = await OneSignal._coreDirector._getPushSubscriptionModel();
      // A subscription with a local id never reached the server, so there is nothing to disable.
      if (pushModel && !IDManager._isLocalId(pushModel.id)) {
        enqueue(
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
    return { pushStep };
  }

  /**
   * A logout under IV disabled push on the server, and a transfer does not
   * change that. Send the local push state after the transfer, so the user
   * that logs in gets push again when the device still opts in.
   */
  private static _getPushStateSyncOp(
    appId: string,
    onesignalId: string,
    externalId: string,
    pushModel: SubscriptionModel,
  ): UpdateSubscriptionOperation {
    const { enabled, notification_types } =
      SubscriptionModelStoreListener._getSubscriptionEnabledAndStatus(pushModel);
    return new UpdateSubscriptionOperation({
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
    });
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
  ): SwitchStart {
    const appId = getAppId();

    const loginOp = new LoginUserOperation({
      appId,
      onesignalId: newOneSignalId,
      externalId,
      existingOnesignalId: existingOneSignalId,
    });
    loginOp._heldBySwitch = true;
    const loginDone = OneSignal._coreDirector._operationRepo._enqueueAndWait(loginOp);
    // _runSwitch awaits this after the push step. The handler stops an unhandled rejection until then.
    loginDone.catch(() => undefined);

    const pushStep = async (enqueue: EnqueuePushOp) => {
      const pushOp = await OneSignal._coreDirector._getPushSubscriptionModel();
      if (pushOp) {
        enqueue(
          LoginManager._removeStalePushOps(pushOp.id)
            ? LoginManager._getCreatePushOp(appId, newOneSignalId, externalId, pushOp)
            : new TransferSubscriptionOperation({
                appId,
                onesignalId: newOneSignalId,
                subscriptionId: pushOp.id,
                externalId,
              }),
        );
        if (externalId && isIvBehaviorActive()) {
          enqueue(LoginManager._getPushStateSyncOp(appId, newOneSignalId, externalId, pushOp));
        }
      } else if (createSubIfMissing) {
        const newSub = new SubscriptionModel();
        newSub._mergeData({
          enabled: true,
          id: IDManager._createLocalId(),
          onesignalId: newOneSignalId,
          type: getSubscriptionType(),
          token: '',
        });
        // The store listener would give the model to the current user, which is a
        // later user if a later switch began. Enqueue the create for this user instead.
        OneSignal._coreDirector._subscriptionModelStore._add(newSub, ModelChangeTags._Hydrate);
        enqueue(LoginManager._getCreatePushOp(appId, newOneSignalId, externalId, newSub));
      }
    };
    return { pushStep, loginOp, loginDone };
  }

  private static _getCreatePushOp(
    appId: string,
    onesignalId: string,
    externalId: string | undefined,
    pushModel: SubscriptionModel,
  ): CreateSubscriptionOperation {
    const { enabled, notification_types } =
      SubscriptionModelStoreListener._getSubscriptionEnabledAndStatus(pushModel);
    return new CreateSubscriptionOperation({
      appId,
      onesignalId,
      externalId,
      subscriptionId: pushModel.id,
      type: pushModel.type,
      enabled,
      token: pushModel.token,
      notification_types,
    });
  }
}
