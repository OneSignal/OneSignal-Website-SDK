import {
  ExecutionResult,
  type IOperationExecutor,
} from 'src/core/types/operation';
import type { IRebuildUserService } from 'src/core/types/user';
import { UnknownOpError } from 'src/shared/errors/common';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/network';
import { debug } from 'src/shared/libraries/log';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { type SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
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
import type { ExecutionResponse } from '../types/operation';

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

  get _operations(): string[] {
    return [
      OPERATION_NAME._CreateSubscription,
      OPERATION_NAME._UpdateSubscription,
      OPERATION_NAME._DeleteSubscription,
      OPERATION_NAME._TransferSubscription,
    ];
  }

  async _execute(operations: Operation[]): Promise<ExecutionResponse> {
    debug(`SubscriptionOperationExecutor(operations: ${operations})`);

    const startingOp = operations[0];
    if (startingOp instanceof CreateSubscriptionOperation)
      return this._createSubscription(startingOp, operations);

    if (operations.some((op) => op instanceof DeleteSubscriptionOperation)) {
      if (operations.length > 1)
        throw new Error(
          `Only supports one operation! Attempted operations:\n${operations}`,
        );
      return this._deleteSubscription(
        operations[0] as DeleteSubscriptionOperation,
      );
    }

    if (startingOp instanceof UpdateSubscriptionOperation)
      return this._updateSubscription(operations);

    if (startingOp instanceof TransferSubscriptionOperation) {
      if (operations.length > 1)
        throw new Error(
          `TransferSubscriptionOperation only supports one operation! Attempted operations:\n${operations}`,
        );
      return this._transferSubscription(startingOp);
    }
    throw UnknownOpError(startingOp);
  }

  private async _createSubscription(
    createOperation: CreateSubscriptionOperation,
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    if (operations.some((op) => op instanceof DeleteSubscriptionOperation))
      return { _result: ExecutionResult._Success };

    const lastUpdateOperation = [...operations]
      .reverse()
      .find((op) => op instanceof UpdateSubscriptionOperation);
    const enabled = lastUpdateOperation?._enabled ?? createOperation._enabled;
    const token = lastUpdateOperation?._token ?? createOperation._token;
    const notification_types =
      lastUpdateOperation?._notification_types ??
      createOperation._notification_types;

    const subscription = {
      sdk: createOperation._sdk,
      type: createOperation._type,
      enabled,
      token,
      notification_types,
    };

    const response = await createSubscriptionByAlias(
      { appId: createOperation._appId },
      {
        label: IdentityConstants._OneSignalID,
        id: createOperation._onesignalId,
      },
      { subscription },
    );

    if (response.ok) {
      const { subscription } = response.result;
      const subscriptionModel =
        this._subscriptionModelStore._getBySubscriptionId(
          createOperation._subscriptionId,
        );

      const backendSubscriptionId = subscription?.id;
      if (backendSubscriptionId) {
        subscriptionModel?._setProperty(
          'id',
          backendSubscriptionId,
          ModelChangeTags._Hydrate,
        );
        subscriptionModel?._setProperty(
          'onesignalId',
          createOperation._onesignalId,
          ModelChangeTags._Hydrate,
        );
      }

      return {
        _result: ExecutionResult._Success,
        _operations: !backendSubscriptionId
          ? [
              new RefreshUserOperation(
                createOperation._appId,
                createOperation._onesignalId,
              ),
            ]
          : undefined,
        _idTranslations: backendSubscriptionId
          ? {
              [createOperation._subscriptionId]: backendSubscriptionId,
            }
          : undefined,
      };
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);
    switch (type) {
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

      case ResponseStatusType._Conflict:
      case ResponseStatusType._Invalid:
        return { _result: ExecutionResult._FailNoretry };

      case ResponseStatusType._Missing: {
        if (
          status === 404 &&
          this._newRecordState._isInMissingRetryWindow(
            createOperation._onesignalId,
          )
        ) {
          return {
            _result: ExecutionResult._FailRetry,
            _retryAfterSeconds: retryAfterSeconds,
          };
        }

        const rebuildOps =
          await this._buildUserService._getRebuildOperationsIfCurrentUser(
            createOperation._appId,
            createOperation._onesignalId,
          );
        if (!rebuildOps) return { _result: ExecutionResult._FailNoretry };
        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
          _operations: rebuildOps,
        };
      }
    }
  }

  private async _updateSubscription(
    operations: Operation[],
  ): Promise<ExecutionResponse> {
    const lastOp = operations[
      operations.length - 1
    ] as UpdateSubscriptionOperation;

    const subscription = {
      type: lastOp._type,
      enabled: lastOp._enabled,
      token: lastOp._token,
      notification_types: lastOp._notification_types,
      web_auth: lastOp._web_auth,
      web_p256: lastOp._web_p256,
    };

    const response = await updateSubscriptionById(
      { appId: lastOp._appId },
      lastOp._subscriptionId,
      subscription,
    );

    if (response.ok) {
      return { _result: ExecutionResult._Success };
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);

    switch (type) {
      case ResponseStatusType._Retryable:
        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
        };
      case ResponseStatusType._Missing:
        if (
          status === 404 &&
          [lastOp._onesignalId, lastOp._subscriptionId].some((id) =>
            this._newRecordState._isInMissingRetryWindow(id),
          )
        ) {
          return {
            _result: ExecutionResult._FailRetry,
            _retryAfterSeconds: retryAfterSeconds,
          };
        }

        return {
          _result: ExecutionResult._FailNoretry,
          _operations: [
            new CreateSubscriptionOperation({
              appId: lastOp._appId,
              enabled: lastOp._enabled,
              notification_types: lastOp._notification_types,
              onesignalId: lastOp._onesignalId,
              subscriptionId: lastOp._subscriptionId,
              token: lastOp._token,
              type: lastOp._type,
            }),
          ],
        };
      default:
        return { _result: ExecutionResult._FailNoretry };
    }
  }

  private async _transferSubscription(
    op: TransferSubscriptionOperation,
  ): Promise<ExecutionResponse> {
    const response = await transferSubscriptionById(
      { appId: op._appId },
      op._subscriptionId,
      { onesignal_id: op._onesignalId },
      false,
    );

    if (response.ok) {
      return { _result: ExecutionResult._Success };
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);

    switch (type) {
      case ResponseStatusType._Retryable:
        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
        };

      default:
        return { _result: ExecutionResult._FailNoretry };
    }
  }

  private async _deleteSubscription(
    op: DeleteSubscriptionOperation,
  ): Promise<ExecutionResponse> {
    const response = await deleteSubscriptionById(
      { appId: op._appId },
      op._subscriptionId,
    );

    if (response.ok) {
      this._subscriptionModelStore._remove(
        op._subscriptionId,
        ModelChangeTags._Hydrate,
      );
      return { _result: ExecutionResult._Success };
    }

    const { retryAfterSeconds, status } = response;
    const type = getResponseStatusType(status);

    switch (type) {
      case ResponseStatusType._Missing:
        if (
          [op._onesignalId, op._subscriptionId].some((id) =>
            this._newRecordState._isInMissingRetryWindow(id),
          )
        ) {
          return {
            _result: ExecutionResult._FailRetry,
            _retryAfterSeconds: retryAfterSeconds,
          };
        }
        return { _result: ExecutionResult._Success };

      case ResponseStatusType._Retryable:
        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
        };

      default:
        return { _result: ExecutionResult._FailNoretry };
    }
  }
}
