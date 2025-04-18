import { ModelChangeTags } from 'src/core/types/models';
import { ExecutionResult, IOperationExecutor } from 'src/core/types/operation';
import Environment from 'src/shared/helpers/Environment';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import { getTimeZoneId } from 'src/shared/utils/utils';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { ConfigModelStore } from '../modelStores/ConfigModelStore';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
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

type SubscriptionWithId = ICreateUserSubscription & { id?: string };

// Implements logic similar to Android's SDK's LoginUserOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/LoginUserOperationExecutor.kt
export class LoginUserOperationExecutor implements IOperationExecutor {
  constructor(
    private identityOperationExecutor: IdentityOperationExecutor,
    private identityModelStore: IdentityModelStore,
    private propertiesModelStore: PropertiesModelStore,
    private subscriptionsModelStore: any, // TODO: implement SubscriptionModelStore
    private configModelStore: ConfigModelStore,
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

    throw new Error(`Unrecognized operation: ${startingOp}`);
  }

  private async loginUser(
    loginUserOp: LoginUserOperation,
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    const containsSubOp = operations.some(
      (op) =>
        op instanceof CreateSubscriptionOperation ||
        op instanceof TransferSubscriptionOperation,
    );

    if (!containsSubOp && !loginUserOp.externalId)
      return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);

    if (!loginUserOp.existingOnesignalId || !loginUserOp.externalId)
      return this.createUser(loginUserOp, operations);

    const result = await this.identityOperationExecutor.execute([
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

        if (this.identityModelStore.model.onesignalId === opOneSignalId) {
          this.identityModelStore.model.setProperty(
            IdentityConstants.ONESIGNAL_ID,
            backendOneSignalId,
            ModelChangeTags.HYDRATE,
          );
        }

        if (this.propertiesModelStore.model.onesignalId === opOneSignalId) {
          this.propertiesModelStore.model.setProperty(
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
    const subscriptions: Record<string, ICreateUserSubscription> = {};
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
        Object.assign(
          subscriptions,
          this.createSubscriptionsFromOperation(operation, subscriptions),
        );
      } else {
        throw new Error(`Unrecognized operation: ${operation}`);
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
      if (!backendOneSignalId) throw new Error('No onesignal_id returned');

      const idTranslations: Record<string, string> = {
        [createUserOperation.onesignalId]: backendOneSignalId,
      };

      if (this.identityModelStore.model.onesignalId === opOneSignalId) {
        this.identityModelStore.model.setProperty(
          IdentityConstants.ONESIGNAL_ID,
          backendOneSignalId,
          ModelChangeTags.HYDRATE,
        );
      }

      if (this.propertiesModelStore.model.onesignalId === opOneSignalId) {
        this.propertiesModelStore.model.setProperty(
          'onesignalId',
          backendOneSignalId,
          ModelChangeTags.HYDRATE,
        );
      }

      for (let i = 0; i < subscriptionList.length; i++) {
        const [localId] = subscriptionList[i];
        const backendSub = response.result.subscriptions?.[i];

        if (!backendSub || !('id' in backendSub)) continue;
        idTranslations[localId] = backendSub.id;

        if (this.configModelStore.model.pushSubscriptionId === localId) {
          this.configModelStore.model.pushSubscriptionId = backendSub.id;
        }

        const model = this.subscriptionsModelStore.get(localId);
        model?.setStringProperty('id', backendSub.id, ModelChangeTags.HYDRATE);
      }

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
    currentSubs: Record<string, SubscriptionWithId>,
  ): Record<string, SubscriptionWithId> {
    switch (true) {
      case operation instanceof CreateSubscriptionOperation: {
        const { subscriptionId, ...rest } = operation.toJSON();
        return {
          ...currentSubs,
          [subscriptionId]: {
            ...rest,
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
            },
          };
        }
        return currentSubs;
      }

      case operation instanceof TransferSubscriptionOperation: {
        const subscriptionId = operation.subscriptionId;
        const subs = { ...currentSubs };

        if (subs[subscriptionId]) {
          subs[subscriptionId] = {
            ...subs[subscriptionId],
            id: subscriptionId,
          };
        } else {
          subs[subscriptionId] = {
            id: subscriptionId,
            type: operation.type,
            token: operation.token,
          };
        }
        return subs;
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
