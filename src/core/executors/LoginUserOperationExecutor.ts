import { ModelChangeTags } from 'src/core/types/models';
import { ExecutionResult, IOperationExecutor } from 'src/core/types/operation';
import User from 'src/onesignal/User';
import Environment from 'src/shared/helpers/Environment';
import EventHelper from 'src/shared/helpers/EventHelper';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import Database from 'src/shared/services/Database';
import { getTimeZoneId } from 'src/shared/utils/utils';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { IPropertiesModelKeys } from '../models/PropertiesModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { type SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { type Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { RequestService } from '../requestService/RequestService';
import {
  ICreateUserIdentity,
  ICreateUserSubscription,
  IUserProperties,
} from '../types/api';
import { type IdentityOperationExecutor } from './IdentityOperationExecutor';

type SubscriptionMap = Record<
  string,
  ICreateUserSubscription & { id?: string }
>;

// Implements logic similar to Android's SDK's LoginUserOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/LoginUserOperationExecutor.kt
export class LoginUserOperationExecutor implements IOperationExecutor {
  constructor(
    private _identityOperationExecutor: IdentityOperationExecutor,
    private _identityModelStore: IdentityModelStore,
    private _propertiesModelStore: PropertiesModelStore,
    private _subscriptionsModelStore: SubscriptionModelStore,
  ) {}

  get operations(): string[] {
    return [OPERATION_NAME.LOGIN_USER];
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(
      `LoginUserOperationExecutor(operation: ${JSON.stringify(operations)})`,
    );
    const startingOp = operations[0];

    if (startingOp instanceof LoginUserOperation)
      return this.loginUser(startingOp, operations.slice(1));

    throw new Error(`Unrecognized operation: ${startingOp.name}`);
  }

  private async loginUser(
    loginUserOp: LoginUserOperation,
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    // When there is no existing user to attempt to associate with the externalId provided, we go right to
    // createUser.  If there is no externalId provided this is an insert, if there is this will be an
    // "upsert with retrieval" as the user may already exist.
    if (!loginUserOp.existingOnesignalId || !loginUserOp.externalId)
      return this.createUser(loginUserOp, operations);

    const result = await this._identityOperationExecutor.execute([
      new SetAliasOperation(
        loginUserOp.appId,
        loginUserOp.existingOnesignalId,
        IdentityConstants.EXTERNAL_ID,
        loginUserOp.externalId,
      ),
    ]);

    switch (result.result) {
      case ExecutionResult.SUCCESS: {
        const backendOneSignalId = loginUserOp.existingOnesignalId;
        const opOneSignalId = loginUserOp.onesignalId;

        if (this._identityModelStore.model.onesignalId === opOneSignalId) {
          this._identityModelStore.model.setProperty(
            IdentityConstants.ONESIGNAL_ID,
            backendOneSignalId,
            ModelChangeTags.HYDRATE,
          );
        }

        if (this._propertiesModelStore.model.onesignalId === opOneSignalId) {
          this._propertiesModelStore.model.setProperty(
            'onesignalId',
            backendOneSignalId,
            ModelChangeTags.HYDRATE,
          );
        }
        return new ExecutionResponse(
          ExecutionResult.SUCCESS_STARTING_ONLY,
          undefined,
          undefined,
          {
            [loginUserOp.onesignalId]: backendOneSignalId,
          },
        );
      }

      case ExecutionResult.FAIL_CONFLICT:
        Log.debug(`Handling 409 for externalId: ${loginUserOp.externalId}`);
        return this.createUser(loginUserOp, operations);

      case ExecutionResult.FAIL_NORETRY:
        Log.error(
          `Recovering from SetAlias failure for externalId: ${loginUserOp.externalId}`,
        );
        return this.createUser(loginUserOp, operations);

      default:
        return new ExecutionResponse(result.result);
    }
  }

  private async createUser(
    createUserOperation: LoginUserOperation,
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    const identity: ICreateUserIdentity = {};
    let subscriptions: SubscriptionMap = {};
    const properties: IUserProperties = {
      timezone_id: getTimeZoneId(),
      language: Environment.getLanguage(),
    };

    if (createUserOperation.externalId) {
      identity[IdentityConstants.EXTERNAL_ID] = createUserOperation.externalId;
    }

    for (const operation of operations) {
      if (
        operation instanceof CreateSubscriptionOperation ||
        operation instanceof TransferSubscriptionOperation ||
        operation instanceof UpdateSubscriptionOperation ||
        operation instanceof DeleteSubscriptionOperation
      ) {
        subscriptions = this.createSubscriptionsFromOperation(
          operation,
          subscriptions,
        );
      } else {
        throw new Error(`Unrecognized operation: ${operation.name}`);
      }
    }

    const subscriptionList = Object.entries(subscriptions);
    const response = await RequestService.createUser(
      { appId: createUserOperation.appId },
      {
        identity,
        subscriptions: subscriptionList.map(([, sub]) => sub),
        properties,
      },
    );

    if (response.ok) {
      const backendOneSignalId = response.result.identity.onesignal_id;
      const opOneSignalId = createUserOperation.onesignalId;

      const user = User.createOrGetInstance();
      user.isCreatingUser = false;
      user.hasOneSignalId = true;

      const idTranslations: Record<string, string> = {
        [createUserOperation.onesignalId]: backendOneSignalId,
      };

      if (this._identityModelStore.model.onesignalId === opOneSignalId) {
        this._identityModelStore.model.setProperty(
          IdentityConstants.ONESIGNAL_ID,
          backendOneSignalId,
          ModelChangeTags.HYDRATE,
        );
      }

      if (this._propertiesModelStore.model.onesignalId === opOneSignalId) {
        this._propertiesModelStore.model.setProperty(
          'onesignalId',
          backendOneSignalId,
          ModelChangeTags.HYDRATE,
        );

        // update other properties
        const resultProperties = response.result.properties;
        if (resultProperties) {
          for (const [key, value] of Object.entries(resultProperties)) {
            this._propertiesModelStore.model.setProperty(
              key as IPropertiesModelKeys,
              value,
              ModelChangeTags.HYDRATE,
            );
          }
        }
      }

      for (let i = 0; i < subscriptionList.length; i++) {
        const [localId] = subscriptionList[i];
        const backendSub = response.result.subscriptions?.[i];

        if (!backendSub || !('id' in backendSub)) continue;
        idTranslations[localId] = backendSub.id;

        const pushSubscriptionId = await Database.getPushId();
        if (pushSubscriptionId === localId) {
          await Database.setPushId(backendSub.id);
        }

        const model =
          this._subscriptionsModelStore.getBySubscriptionId(localId);
        model?.setProperty('id', backendSub.id, ModelChangeTags.HYDRATE);
      }

      EventHelper.checkAndTriggerUserChanged();

      const followUp =
        Object.keys(identity).length > 0
          ? [
              new RefreshUserOperation(
                createUserOperation.appId,
                backendOneSignalId,
              ),
            ]
          : undefined;

      return new ExecutionResponse(
        ExecutionResult.SUCCESS,
        undefined,
        followUp,
        idTranslations,
      );
    }

    const { status, retryAfterSeconds } = response;
    const responseType = getResponseStatusType(status);

    switch (responseType) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
        );
      case ResponseStatusType.UNAUTHORIZED:
        return new ExecutionResponse(
          ExecutionResult.FAIL_UNAUTHORIZED,
          retryAfterSeconds,
        );
      default:
        return new ExecutionResponse(ExecutionResult.FAIL_PAUSE_OPREPO);
    }
  }

  private createSubscriptionsFromOperation(
    operation:
      | CreateSubscriptionOperation
      | DeleteSubscriptionOperation
      | TransferSubscriptionOperation
      | UpdateSubscriptionOperation,
    currentSubs: SubscriptionMap,
  ): SubscriptionMap {
    switch (true) {
      case operation instanceof CreateSubscriptionOperation: {
        const subscriptionId = operation.subscriptionId;
        return {
          ...currentSubs,
          [subscriptionId]: {
            enabled: operation.enabled,
            device_model: operation.device_model,
            device_os: operation.device_os,
            notification_types: operation.notification_types,
            sdk: operation.sdk,
            token: operation.token,
            type: operation.type,
            web_auth: operation.web_auth,
            web_p256: operation.web_p256,
          },
        };
      }

      case operation instanceof UpdateSubscriptionOperation: {
        const subscriptionId = operation.subscriptionId;

        if (currentSubs[subscriptionId]) {
          return {
            ...currentSubs,
            [subscriptionId]: {
              ...currentSubs[subscriptionId],
              enabled: operation.enabled,
              notification_types: operation.notification_types,
              token: operation.token,
            },
          };
        }
        return currentSubs;
      }

      case operation instanceof TransferSubscriptionOperation: {
        const subscriptionId = operation.subscriptionId;

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
        delete subs[operation.subscriptionId];
        return subs;
      }

      default:
        return currentSubs;
    }
  }
}
