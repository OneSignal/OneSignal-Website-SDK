import { ModelChangeTags } from 'src/core/types/models';
import {
  ExecutionResult,
  type IOperationExecutor,
} from 'src/core/types/operation';
import { UnknownOpError } from 'src/shared/errors/common';
import { getTimeZoneId } from 'src/shared/helpers/general';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/network';
import { debug, error } from 'src/shared/libraries/log';
import { checkAndTriggerUserChanged } from 'src/shared/listeners';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { type IPropertiesModelKeys } from '../models/PropertiesModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { type SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { type Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { createNewUser } from '../requests/api';
import type {
  ICreateUserIdentity,
  ICreateUserSubscription,
  IUserProperties,
} from '../types/api';
import type { ExecutionResponse } from '../types/operation';
import { type IdentityOperationExecutor } from './IdentityOperationExecutor';

type SubscriptionMap = Record<
  string,
  ICreateUserSubscription & { id?: string }
>;

// Implements logic similar to Android's SDK's LoginUserOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/LoginUserOperationExecutor.kt
export class LoginUserOperationExecutor implements IOperationExecutor {
  private _identityOperationExecutor: IdentityOperationExecutor;
  private _identityModelStore: IdentityModelStore;
  private _propertiesModelStore: PropertiesModelStore;
  private _subscriptionsModelStore: SubscriptionModelStore;

  constructor(
    _identityOperationExecutor: IdentityOperationExecutor,
    _identityModelStore: IdentityModelStore,
    _propertiesModelStore: PropertiesModelStore,
    _subscriptionsModelStore: SubscriptionModelStore,
  ) {
    this._identityOperationExecutor = _identityOperationExecutor;
    this._identityModelStore = _identityModelStore;
    this._propertiesModelStore = _propertiesModelStore;
    this._subscriptionsModelStore = _subscriptionsModelStore;
  }

  get _operations(): string[] {
    return [OPERATION_NAME._LoginUser];
  }

  async _execute(operations: Operation[]): Promise<ExecutionResponse> {
    debug(`LoginUserOperationExecutor`);
    const startingOp = operations[0];

    if (startingOp instanceof LoginUserOperation)
      return this._loginUser(startingOp, operations.slice(1));

    throw UnknownOpError(startingOp);
  }

  private async _loginUser(
    loginUserOp: LoginUserOperation,
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    // When there is no existing user to attempt to associate with the externalId provided, we go right to
    // createUser.  If there is no externalId provided this is an insert, if there is this will be an
    // "upsert with retrieval" as the user may already exist.
    if (!loginUserOp._existingOnesignalId || !loginUserOp._externalId) {
      return this._createUser(loginUserOp, operations);
    }

    const result = await this._identityOperationExecutor._execute([
      new SetAliasOperation(
        loginUserOp._appId,
        loginUserOp._existingOnesignalId,
        IdentityConstants._ExternalID,
        loginUserOp._externalId,
      ),
    ]);

    switch (result._result) {
      case ExecutionResult._Success: {
        const backendOneSignalId = loginUserOp._existingOnesignalId;
        const opOneSignalId = loginUserOp._onesignalId;

        if (this._identityModelStore._model._onesignalId === opOneSignalId) {
          this._identityModelStore._model._setProperty(
            IdentityConstants._OneSignalID,
            backendOneSignalId,
            ModelChangeTags._Hydrate,
          );
        }

        if (this._propertiesModelStore._model._onesignalId === opOneSignalId) {
          this._propertiesModelStore._model._setProperty(
            'onesignalId',
            backendOneSignalId,
            ModelChangeTags._Hydrate,
          );
        }
        return {
          _result: ExecutionResult._SuccessStartingOnly,
          _idTranslations: {
            [loginUserOp._onesignalId]: backendOneSignalId,
          },
        };
      }

      case ExecutionResult._FailConflict:
        debug(`Handling 409 for externalId: ${loginUserOp._externalId}`);
        return this._createUser(loginUserOp, operations);

      case ExecutionResult._FailNoretry:
        error(
          `Recovering from SetAlias failure for externalId: ${loginUserOp._externalId}`,
        );
        return this._createUser(loginUserOp, operations);

      default:
        return { _result: result._result };
    }
  }

  private async _createUser(
    createUserOperation: LoginUserOperation,
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    const identity: ICreateUserIdentity = {};
    let subscriptions: SubscriptionMap = {};
    const properties: IUserProperties = {
      timezone_id: getTimeZoneId(),
      language: getLanguage(),
    };

    if (createUserOperation._externalId) {
      identity[IdentityConstants._ExternalID] = createUserOperation._externalId;
    }

    for (const operation of operations) {
      if (
        operation instanceof CreateSubscriptionOperation ||
        operation instanceof TransferSubscriptionOperation ||
        operation instanceof UpdateSubscriptionOperation ||
        operation instanceof DeleteSubscriptionOperation
      ) {
        subscriptions = this._createSubscriptionsFromOperation(
          operation,
          subscriptions,
        );
      } else {
        throw UnknownOpError(operation);
      }
    }

    const subscriptionList = Object.entries(subscriptions);
    const response = await createNewUser(
      { appId: createUserOperation._appId },
      {
        identity,
        subscriptions: subscriptionList.map(([, sub]) => sub),
        properties,
      },
    );

    if (response.ok) {
      const backendOneSignalId = response.result.identity.onesignal_id;
      const opOneSignalId = createUserOperation._onesignalId;

      const idTranslations: Record<string, string> = {
        [createUserOperation._onesignalId]: backendOneSignalId,
      };

      if (this._identityModelStore._model._onesignalId === opOneSignalId) {
        this._identityModelStore._model._setProperty(
          IdentityConstants._OneSignalID,
          backendOneSignalId,
          ModelChangeTags._Hydrate,
        );
      }

      if (this._propertiesModelStore._model._onesignalId === opOneSignalId) {
        this._propertiesModelStore._model._setProperty(
          'onesignalId',
          backendOneSignalId,
          ModelChangeTags._Hydrate,
        );
      }

      // update other properties
      const resultProperties = response.result.properties;
      if (resultProperties) {
        for (const [key, value] of Object.entries(resultProperties)) {
          this._propertiesModelStore._model._setProperty(
            key as IPropertiesModelKeys,
            value,
            ModelChangeTags._Hydrate,
          );
        }
      }

      for (let i = 0; i < subscriptionList.length; i++) {
        const [localId] = subscriptionList[i];
        const backendSub = response.result.subscriptions?.[i];

        if (!backendSub || !('id' in backendSub)) continue;
        idTranslations[localId] = backendSub.id;

        const model =
          this._subscriptionsModelStore._getBySubscriptionId(localId);
        model?._setProperty('id', backendSub.id, ModelChangeTags._Hydrate);
        model?._setProperty(
          'onesignalId',
          backendOneSignalId,
          ModelChangeTags._Hydrate,
        );
      }

      checkAndTriggerUserChanged();

      const followUp =
        Object.keys(identity).length > 0
          ? [
              new RefreshUserOperation(
                createUserOperation._appId,
                backendOneSignalId,
              ),
            ]
          : undefined;

      return {
        _result: ExecutionResult._Success,
        _operations: followUp,
        _idTranslations: idTranslations,
      };
    }

    const { status, retryAfterSeconds } = response;
    const responseType = getResponseStatusType(status);

    switch (responseType) {
      case ResponseStatusType._Retryable:
        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
        };
      case ResponseStatusType._Unauthorized:
        return {
          _result: ExecutionResult._FailUnauthorized,
          _retryAfterSeconds: retryAfterSeconds,
        };
      default:
        return { _result: ExecutionResult._FailPauseOpRepo };
    }
  }

  private _createSubscriptionsFromOperation(
    operation:
      | CreateSubscriptionOperation
      | DeleteSubscriptionOperation
      | TransferSubscriptionOperation
      | UpdateSubscriptionOperation,
    currentSubs: SubscriptionMap,
  ): SubscriptionMap {
    switch (true) {
      case operation instanceof CreateSubscriptionOperation: {
        const subscriptionId = operation._subscriptionId;
        return {
          ...currentSubs,
          [subscriptionId]: {
            enabled: operation._enabled,
            device_model: operation._device_model,
            device_os: operation._device_os,
            notification_types: operation._notification_types,
            sdk: operation._sdk,
            token: operation._token,
            type: operation._type,
            web_auth: operation._web_auth,
            web_p256: operation._web_p256,
          },
        };
      }

      case operation instanceof UpdateSubscriptionOperation: {
        const subscriptionId = operation._subscriptionId;

        if (currentSubs[subscriptionId]) {
          return {
            ...currentSubs,
            [subscriptionId]: {
              ...currentSubs[subscriptionId],
              enabled: operation._enabled,
              notification_types: operation._notification_types,
              token: operation._token,
            },
          };
        }
        return currentSubs;
      }

      case operation instanceof TransferSubscriptionOperation: {
        const subscriptionId = operation._subscriptionId;

        return {
          ...currentSubs,
          [subscriptionId]: {
            ...currentSubs[subscriptionId],
            id: subscriptionId,
          },
        };
      }

      case operation instanceof DeleteSubscriptionOperation: {
        const subs = { ...currentSubs };
        delete subs[operation._subscriptionId];
        return subs;
      }

      default:
        return currentSubs;
    }
  }
}

const TRADITIONAL_CHINESE_LANGUAGE_TAG = ['tw', 'hant'];
const SIMPLIFIED_CHINESE_LANGUAGE_TAG = ['cn', 'hans'];

const getLanguage = () => {
  let languageTag = navigator.language;
  if (languageTag) {
    languageTag = languageTag.toLowerCase();
    const languageSubtags = languageTag.split('-');
    if (languageSubtags[0] == 'zh') {
      // The language is zh-?
      // We must categorize the language as either zh-Hans (simplified) or zh-Hant (traditional);
      // OneSignal only supports these two Chinese variants
      for (const traditionalSubtag of TRADITIONAL_CHINESE_LANGUAGE_TAG) {
        if (languageSubtags.indexOf(traditionalSubtag) !== -1) {
          return 'zh-Hant';
        }
      }
      for (const simpleSubtag of SIMPLIFIED_CHINESE_LANGUAGE_TAG) {
        if (languageSubtags.indexOf(simpleSubtag) !== -1) {
          return 'zh-Hans';
        }
      }
      return 'zh-Hant'; // Return Chinese traditional by default
    } else {
      // Return the language subtag (it can be three characters, so truncate it down to 2 just to be sure)
      return languageSubtags[0].substring(0, 2);
    }
  } else {
    return 'en';
  }
};
