import { BackendError } from 'src/shared/errors/BackendError';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import { IdentityConstants, IIdentityBackendService } from 'src/types/backend';
import { ModelChangeTags } from 'src/types/models';
import { ExecutionResult, IOperationExecutor } from 'src/types/operation';
import { IRebuildUserService } from 'src/types/user';
import { type IdentityModelStore } from '../models/IdentityModelStore';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { type Operation } from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { OPERATION_NAME } from './constants';

// Implements logic similar to Android SDK's IdentityOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/IdentityOperationExecutor.kt
export class IdentityOperationExecutor implements IOperationExecutor {
  private readonly _identityBackend: IIdentityBackendService;
  private readonly _identityModelStore: IdentityModelStore;
  private readonly _buildUserService: IRebuildUserService;
  private readonly _newRecordState: NewRecordsState;

  constructor(
    identityBackend: IIdentityBackendService,
    identityModelStore: IdentityModelStore,
    buildUserService: IRebuildUserService,
    newRecordState: NewRecordsState,
  ) {
    this._identityBackend = identityBackend;
    this._identityModelStore = identityModelStore;
    this._buildUserService = buildUserService;
    this._newRecordState = newRecordState;
  }

  get operations(): string[] {
    return [OPERATION_NAME.SET_ALIAS, OPERATION_NAME.DELETE_ALIAS];
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(
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

    const lastOperation = operations[operations.length - 1];

    if (lastOperation instanceof SetAliasOperation) {
      try {
        await this._identityBackend.setAlias(
          lastOperation.appId,
          IdentityConstants.ONESIGNAL_ID,
          lastOperation.onesignalId,
          { [lastOperation.label]: lastOperation.value },
        );

        if (
          this._identityModelStore.model.onesignalId ===
          lastOperation.onesignalId
        ) {
          this._identityModelStore.model.setProperty<string>(
            lastOperation.label,
            lastOperation.value,
            ModelChangeTags.HYDRATE,
          );
        }
      } catch (ex) {
        if (ex instanceof BackendError) {
          const responseType = getResponseStatusType(ex.statusCode);

          switch (responseType) {
            case ResponseStatusType.RETRYABLE:
              return new ExecutionResponse(
                ExecutionResult.FAIL_RETRY,
                ex.retryAfterSeconds,
              );

            case ResponseStatusType.INVALID:
              return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);

            case ResponseStatusType.CONFLICT:
              return new ExecutionResponse(
                ExecutionResult.FAIL_CONFLICT,
                ex.retryAfterSeconds,
              );

            case ResponseStatusType.MISSING: {
              if (
                ex.statusCode === 404 &&
                this._newRecordState.isInMissingRetryWindow(
                  lastOperation.onesignalId,
                )
              ) {
                return new ExecutionResponse(
                  ExecutionResult.FAIL_RETRY,
                  ex.retryAfterSeconds,
                );
              }

              const rebuildOps =
                this._buildUserService.getRebuildOperationsIfCurrentUser(
                  lastOperation.appId,
                  lastOperation.onesignalId,
                );
              if (!rebuildOps) {
                return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
              }
              return new ExecutionResponse(
                ExecutionResult.FAIL_RETRY,
                ex.retryAfterSeconds,
                rebuildOps,
              );
            }
          }
        }
      }
    } else if (lastOperation instanceof DeleteAliasOperation) {
      try {
        await this._identityBackend.deleteAlias(
          lastOperation.appId,
          IdentityConstants.ONESIGNAL_ID,
          lastOperation.onesignalId,
          lastOperation.label,
        );

        if (
          this._identityModelStore.model.onesignalId ===
          lastOperation.onesignalId
        ) {
          this._identityModelStore.model.setProperty<string | null>(
            lastOperation.label,
            null,
            ModelChangeTags.HYDRATE,
          );
        }
      } catch (ex) {
        if (ex instanceof BackendError) {
          const responseType = getResponseStatusType(ex.statusCode);

          switch (responseType) {
            case ResponseStatusType.RETRYABLE:
              return new ExecutionResponse(
                ExecutionResult.FAIL_RETRY,
                ex.retryAfterSeconds,
              );
            case ResponseStatusType.CONFLICT:
              return new ExecutionResponse(ExecutionResult.SUCCESS); // alias doesn’t exist = good

            case ResponseStatusType.INVALID:
              return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);

            case ResponseStatusType.UNAUTHORIZED:
              return new ExecutionResponse(
                ExecutionResult.FAIL_UNAUTHORIZED,
                ex.retryAfterSeconds,
              );

            case ResponseStatusType.MISSING:
              if (
                ex.statusCode === 404 &&
                this._newRecordState.isInMissingRetryWindow(
                  lastOperation.onesignalId,
                )
              ) {
                return new ExecutionResponse(
                  ExecutionResult.FAIL_RETRY,
                  ex.retryAfterSeconds,
                );
              } else {
                // This means either the User or the Alias was already
                // deleted, either way the end state is the same, the
                // alias no longer exists on that User.
                return new ExecutionResponse(ExecutionResult.SUCCESS);
              }
          }
        }
      }
    }

    return new ExecutionResponse(ExecutionResult.SUCCESS);
  }
}
