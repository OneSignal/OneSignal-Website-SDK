import {
  ExecutionResult,
  type IOperationExecutor,
} from 'src/core/types/operation';
import type { IRebuildUserService } from 'src/core/types/user';
import {
  getPushId,
  setPushId,
  setPushToken,
} from 'src/shared/database/subscription';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { type SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import {
  createSubscriptionByAlias,
  deleteSubscriptionById,
  transferSubscriptionById,
  updateSubscriptionById,
} from '../requests/api';
import { ModelChangeTags } from '../types/models';

// Implements logic similar to Android SDK's SubscriptionOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/SubscriptionOperationExecutor.kt
export class SubscriptionOperationExecutor implements IOperationExecutor {
  private _subscriptionModelStore: SubscriptionModelStore;
  private _buildUserService: IRebuildUserService;
  private _newRecordState: NewRecordsState;

  constructor(
    _subscriptionModelStore: SubscriptionModelStore,
    _buildUserService: IRebuildUserService,
    _newRecordState: NewRecordsState,
  ) {
    this._subscriptionModelStore = _subscriptionModelStore;
    this._buildUserService = _buildUserService;
    this._newRecordState = _newRecordState;
  }

  get operations(): string[] {
    return [
      OPERATION_NAME.CREATE_SUBSCRIPTION,
      OPERATION_NAME.UPDATE_SUBSCRIPTION,
      OPERATION_NAME.DELETE_SUBSCRIPTION,
      OPERATION_NAME.TRANSFER_SUBSCRIPTION,
    ];
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(`SubscriptionOperationExecutor(operations: ${operations})`);

    const startingOp = operations[0];
    if (startingOp instanceof CreateSubscriptionOperation)
      return this.createSubscription(startingOp, operations);

    if (operations.some((op) => op instanceof DeleteSubscriptionOperation)) {
      if (operations.length > 1)
        throw new Error(
          `Only supports one operation! Attempted operations:\n${operations}`,
        );
      return this.deleteSubscription(
        operations[0] as DeleteSubscriptionOperation,
      );
    }

    if (startingOp instanceof UpdateSubscriptionOperation)
      return this.updateSubscription(operations);

    if (startingOp instanceof TransferSubscriptionOperation) {
      if (operations.length > 1)
        throw new Error(
          `TransferSubscriptionOperation only supports one operation! Attempted operations:\n${operations}`,
        );
      return this.transferSubscription(startingOp);
    }
    throw new Error(`Unrecognized operation: ${startingOp}`);
  }

  private async createSubscription(
    createOperation: CreateSubscriptionOperation,
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    if (operations.some((op) => op instanceof DeleteSubscriptionOperation))
      return new ExecutionResponse(ExecutionResult.SUCCESS);

    const lastUpdateOperation = operations
      .toReversed()
      .find((op) => op instanceof UpdateSubscriptionOperation);
    const enabled = lastUpdateOperation?.enabled ?? createOperation.enabled;
    const token = lastUpdateOperation?.token ?? createOperation.token;
    const notification_types =
      lastUpdateOperation?.notification_types ??
      createOperation.notification_types;

    const subscription = {
      sdk: createOperation.sdk,
      type: createOperation.type,
      enabled,
      token,
      notification_types,
    };

    const response = await createSubscriptionByAlias(
      { appId: createOperation.appId },
      {
        label: IdentityConstants.ONESIGNAL_ID,
        id: createOperation.onesignalId,
      },
      { subscription },
    );

    if (response.ok) {
      const { subscription } = response.result;
      const subscriptionModel =
        this._subscriptionModelStore.getBySubscriptionId(
          createOperation.subscriptionId,
        );

      const backendSubscriptionId = subscription?.id;
      if (backendSubscriptionId) {
        subscriptionModel?.setProperty(
          'id',
          backendSubscriptionId,
          ModelChangeTags.HYDRATE,
        );
        subscriptionModel?.setProperty(
          'onesignalId',
          createOperation.onesignalId,
          ModelChangeTags.HYDRATE,
        );
      }

      const pushSubscriptionId = await getPushId();
      if (pushSubscriptionId === createOperation.subscriptionId) {
        await setPushId(backendSubscriptionId);
        await setPushToken(subscription?.token);
      }

      return new ExecutionResponse(
        ExecutionResult.SUCCESS,
        undefined,
        !backendSubscriptionId
          ? [
              new RefreshUserOperation(
                createOperation.appId,
                createOperation.onesignalId,
              ),
            ]
          : undefined,
        backendSubscriptionId
          ? {
              [createOperation.subscriptionId]: backendSubscriptionId,
            }
          : undefined,
      );
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);
    switch (type) {
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

      case ResponseStatusType.CONFLICT:
      case ResponseStatusType.INVALID:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);

      case ResponseStatusType.MISSING: {
        if (
          status === 404 &&
          this._newRecordState.isInMissingRetryWindow(
            createOperation.onesignalId,
          )
        ) {
          return new ExecutionResponse(
            ExecutionResult.FAIL_RETRY,
            retryAfterSeconds,
          );
        }

        const rebuildOps =
          await this._buildUserService.getRebuildOperationsIfCurrentUser(
            createOperation.appId,
            createOperation.onesignalId,
          );
        if (!rebuildOps)
          return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
          rebuildOps,
        );
      }
    }
  }

  private async updateSubscription(
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    const lastOp = operations[
      operations.length - 1
    ] as UpdateSubscriptionOperation;

    const subscription = {
      type: lastOp.type,
      enabled: lastOp.enabled,
      token: lastOp.token,
      notification_types: lastOp.notification_types,
      web_auth: lastOp.web_auth,
      web_p256: lastOp.web_p256,
    };

    const response = await updateSubscriptionById(
      { appId: lastOp.appId },
      lastOp.subscriptionId,
      subscription,
    );

    if (response.ok) {
      return new ExecutionResponse(ExecutionResult.SUCCESS);
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);

    switch (type) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
        );
      case ResponseStatusType.MISSING:
        if (
          status === 404 &&
          [lastOp.onesignalId, lastOp.subscriptionId].some((id) =>
            this._newRecordState.isInMissingRetryWindow(id),
          )
        ) {
          return new ExecutionResponse(
            ExecutionResult.FAIL_RETRY,
            retryAfterSeconds,
          );
        }

        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY, undefined, [
          new CreateSubscriptionOperation({
            appId: lastOp.appId,
            enabled: lastOp.enabled,
            notification_types: lastOp.notification_types,
            onesignalId: lastOp.onesignalId,
            subscriptionId: lastOp.subscriptionId,
            token: lastOp.token,
            type: lastOp.type,
          }),
        ]);
      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }

  private async transferSubscription(
    op: TransferSubscriptionOperation,
  ): Promise<ExecutionResponse> {
    const response = await transferSubscriptionById(
      { appId: op.appId },
      op.subscriptionId,
      { onesignal_id: op.onesignalId },
      false,
    );

    if (response.ok) {
      return new ExecutionResponse(ExecutionResult.SUCCESS);
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);

    switch (type) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
        );

      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }

  private async deleteSubscription(
    op: DeleteSubscriptionOperation,
  ): Promise<ExecutionResponse> {
    const response = await deleteSubscriptionById(
      { appId: op.appId },
      op.subscriptionId,
    );

    if (response.ok) {
      this._subscriptionModelStore.remove(
        op.subscriptionId,
        ModelChangeTags.HYDRATE,
      );
      return new ExecutionResponse(ExecutionResult.SUCCESS);
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);

    switch (type) {
      case ResponseStatusType.MISSING:
        if (
          [op.onesignalId, op.subscriptionId].some((id) =>
            this._newRecordState.isInMissingRetryWindow(id),
          )
        ) {
          return new ExecutionResponse(
            ExecutionResult.FAIL_RETRY,
            retryAfterSeconds,
          );
        }
        return new ExecutionResponse(ExecutionResult.SUCCESS);

      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
        );

      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }
}
