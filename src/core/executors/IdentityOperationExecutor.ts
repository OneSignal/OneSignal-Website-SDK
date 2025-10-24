import { ModelChangeTags } from 'src/core/types/models';
import {
  ExecutionResult,
  type IOperationExecutor,
} from 'src/core/types/operation';
import type { IRebuildUserService } from 'src/core/types/user';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/network';
import Log from 'src/shared/libraries/Log';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { type Operation } from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { addAlias, deleteAlias } from '../requests/api';
import type { ExecutionResponse } from '../types/operation';

// Implements logic similar to Android SDK's IdentityOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/IdentityOperationExecutor.kt
export class IdentityOperationExecutor implements IOperationExecutor {
  private readonly _identityModelStore: IdentityModelStore;
  private readonly _buildUserService: IRebuildUserService;
  private readonly _newRecordState: NewRecordsState;

  constructor(
    identityModelStore: IdentityModelStore,
    buildUserService: IRebuildUserService,
    newRecordState: NewRecordsState,
  ) {
    this._identityModelStore = identityModelStore;
    this._buildUserService = buildUserService;
    this._newRecordState = newRecordState;
  }

  get _operations(): string[] {
    return [OPERATION_NAME._SetAlias, OPERATION_NAME._DeleteAlias];
  }

  async _execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log._debug(
      `IdentityOperationExecutor(operations: ${JSON.stringify(operations)})`,
    );

    const invalidOps = operations.filter(
      (op) =>
        !(
          op instanceof SetAliasOperation || op instanceof DeleteAliasOperation
        ),
    );
    if (invalidOps.length > 0) {
      throw new Error(
        `Unrecognized operation(s)! Attempted operations:\n${JSON.stringify(
          operations,
        )}`,
      );
    }

    const hasSetAlias = operations.some(
      (op) => op instanceof SetAliasOperation,
    );
    const hasDeleteAlias = operations.some(
      (op) => op instanceof DeleteAliasOperation,
    );
    if (hasSetAlias && hasDeleteAlias) {
      throw new Error(
        `Can't process SetAliasOperation and DeleteAliasOperation at the same time.`,
      );
    }

    const lastOperation = operations[operations.length - 1] as
      | SetAliasOperation
      | DeleteAliasOperation;

    const isSetAlias = lastOperation instanceof SetAliasOperation;
    const request = isSetAlias
      ? addAlias(
          { appId: lastOperation._appId },
          {
            label: IdentityConstants._OneSignalID,
            id: lastOperation._onesignalId,
          },
          { [lastOperation.label]: lastOperation.value },
        )
      : deleteAlias(
          { appId: lastOperation._appId },
          {
            label: IdentityConstants._OneSignalID,
            id: lastOperation._onesignalId,
          },
          lastOperation.label,
        );

    const { ok, status, retryAfterSeconds } = await request;
    if (ok) {
      if (
        this._identityModelStore._model._onesignalId ===
        lastOperation._onesignalId
      ) {
        this._identityModelStore._model._setProperty(
          lastOperation.label,
          isSetAlias ? lastOperation.value : undefined,
          ModelChangeTags._Hydrate,
        );
      }
      return { _result: ExecutionResult._Success };
    }

    const responseType = getResponseStatusType(status);
    switch (responseType) {
      case ResponseStatusType._Retryable:
        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
        };
      case ResponseStatusType._Invalid:
        return { _result: ExecutionResult._FailNoretry };

      case ResponseStatusType._Conflict: {
        if (isSetAlias)
          return {
            _result: ExecutionResult._FailConflict,
            _retryAfterSeconds: retryAfterSeconds,
          };
        return { _result: ExecutionResult._Success }; // alias doesn't exist = good
      }

      case ResponseStatusType._Unauthorized:
        return {
          _result: ExecutionResult._FailUnauthorized,
          _retryAfterSeconds: retryAfterSeconds,
        };

      case ResponseStatusType._Missing: {
        if (
          status === 404 &&
          this._newRecordState._isInMissingRetryWindow(
            lastOperation._onesignalId,
          )
        )
          return {
            _result: ExecutionResult._FailRetry,
            _retryAfterSeconds: retryAfterSeconds,
          };

        if (isSetAlias) {
          const rebuildOps =
            await this._buildUserService._getRebuildOperationsIfCurrentUser(
              lastOperation._appId,
              lastOperation._onesignalId,
            );

          if (rebuildOps == null)
            return { _result: ExecutionResult._FailNoretry };

          return {
            _result: ExecutionResult._FailRetry,
            _retryAfterSeconds: retryAfterSeconds,
            _operations: rebuildOps,
          };
        }

        // This means either the User or the Alias was already
        // deleted, either way the end state is the same, the
        // alias no longer exists on that User.
        return { _result: ExecutionResult._Success };
      }
    }
  }
}
