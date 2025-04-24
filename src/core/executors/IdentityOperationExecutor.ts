import { ModelChangeTags } from 'src/core/types/models';
import { ExecutionResult, IOperationExecutor } from 'src/core/types/operation';
import { IRebuildUserService } from 'src/core/types/user';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import { OPERATION_NAME } from '../constants';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { type Operation } from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import AliasPair from '../requestService/AliasPair';
import { RequestService } from '../requestService/RequestService';

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

    const lastOperation = operations[operations.length - 1] as
      | SetAliasOperation
      | DeleteAliasOperation;

    const isSetAlias = lastOperation instanceof SetAliasOperation;
    const request = isSetAlias
      ? RequestService.addAlias(
          { appId: lastOperation.appId },
          new AliasPair(AliasPair.ONESIGNAL_ID, lastOperation.onesignalId),
          { [lastOperation.label]: lastOperation.value },
        )
      : RequestService.deleteAlias(
          { appId: lastOperation.appId },
          new AliasPair(AliasPair.ONESIGNAL_ID, lastOperation.onesignalId),
          lastOperation.label,
        );

    const { ok, status, retryAfterSeconds } = await request;
    if (ok) {
      if (
        this._identityModelStore.model.onesignalId === lastOperation.onesignalId
      ) {
        this._identityModelStore.model.setProperty(
          lastOperation.label,
          isSetAlias ? lastOperation.value : undefined,
          ModelChangeTags.HYDRATE,
        );
      }
      return new ExecutionResponse(ExecutionResult.SUCCESS);
    }

    const responseType = getResponseStatusType(status);
    switch (responseType) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
        );
      case ResponseStatusType.INVALID:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);

      case ResponseStatusType.CONFLICT: {
        if (isSetAlias)
          return new ExecutionResponse(
            ExecutionResult.FAIL_CONFLICT,
            retryAfterSeconds,
          );
        return new ExecutionResponse(ExecutionResult.SUCCESS); // alias doesn't exist = good
      }

      case ResponseStatusType.UNAUTHORIZED:
        return new ExecutionResponse(
          ExecutionResult.FAIL_UNAUTHORIZED,
          retryAfterSeconds,
        );

      case ResponseStatusType.MISSING: {
        if (
          status === 404 &&
          this._newRecordState.isInMissingRetryWindow(lastOperation.onesignalId)
        )
          return new ExecutionResponse(
            ExecutionResult.FAIL_RETRY,
            retryAfterSeconds,
          );

        if (isSetAlias) {
          const rebuildOps =
            this._buildUserService.getRebuildOperationsIfCurrentUser(
              lastOperation.appId,
              lastOperation.onesignalId,
            );

          if (rebuildOps == null)
            return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);

          return new ExecutionResponse(
            ExecutionResult.FAIL_RETRY,
            retryAfterSeconds,
            rebuildOps,
          );
        }

        // This means either the User or the Alias was already
        // deleted, either way the end state is the same, the
        // alias no longer exists on that User.
        return new ExecutionResponse(ExecutionResult.SUCCESS);
      }
    }
  }
}
