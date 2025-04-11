import { IIdentityBackendService } from 'src/types/backend';
import { IOperationExecutor } from 'src/types/operation';

export class IdentityOperationExecutor implements IOperationExecutor {
  private readonly _identityBackend: IIdentityBackendService;
  private readonly _identityModelStore: IdentityModelStore;
  private readonly _buildUserService: IRebuildUserService;
  private readonly _newRecordState: NewRecordsState;

  static readonly SET_ALIAS = 'set-alias';
  static readonly DELETE_ALIAS = 'delete-alias';

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
    return [
      IdentityOperationExecutor.SET_ALIAS,
      IdentityOperationExecutor.DELETE_ALIAS,
    ];
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Logging.debug(
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
          this._identityModelStore.model.setStringProperty(
            lastOperation.label,
            lastOperation.value,
            ModelChangeTags.HYDRATE,
          );
        }
      } catch (ex) {
        if (ex instanceof BackendException) {
          const responseType = NetworkUtils.getResponseStatusType(
            ex.statusCode,
          );

          switch (responseType) {
            case NetworkUtils.ResponseStatusType.RETRYABLE:
              return new ExecutionResponse(
                ExecutionResult.FAIL_RETRY,
                ex.retryAfterSeconds,
              );
            case NetworkUtils.ResponseStatusType.INVALID:
              return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
            case NetworkUtils.ResponseStatusType.CONFLICT:
              return new ExecutionResponse(
                ExecutionResult.FAIL_CONFLICT,
                ex.retryAfterSeconds,
              );
            case NetworkUtils.ResponseStatusType.UNAUTHORIZED:
              return new ExecutionResponse(
                ExecutionResult.FAIL_UNAUTHORIZED,
                ex.retryAfterSeconds,
              );
            case NetworkUtils.ResponseStatusType.MISSING:
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
              } else {
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
          this._identityModelStore.model.setOptStringProperty(
            lastOperation.label,
            null,
            ModelChangeTags.HYDRATE,
          );
        }
      } catch (ex) {
        if (ex instanceof BackendException) {
          const responseType = NetworkUtils.getResponseStatusType(
            ex.statusCode,
          );

          switch (responseType) {
            case NetworkUtils.ResponseStatusType.RETRYABLE:
              return new ExecutionResponse(
                ExecutionResult.FAIL_RETRY,
                ex.retryAfterSeconds,
              );
            case NetworkUtils.ResponseStatusType.CONFLICT:
              return new ExecutionResponse(ExecutionResult.SUCCESS); // alias doesn’t exist = good
            case NetworkUtils.ResponseStatusType.INVALID:
              return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
            case NetworkUtils.ResponseStatusType.UNAUTHORIZED:
              return new ExecutionResponse(
                ExecutionResult.FAIL_UNAUTHORIZED,
                ex.retryAfterSeconds,
              );
            case NetworkUtils.ResponseStatusType.MISSING:
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
                return new ExecutionResponse(ExecutionResult.SUCCESS); // already deleted
              }
          }
        }
      }
    }

    return new ExecutionResponse(ExecutionResult.SUCCESS);
  }
}
