// Enums
export enum GroupComparisonType {
  Create,
  Alter,
  None,
}

export enum ExecutionResult {
  /**
   * The operation was executed successfully.
   */
  Success,

  /**
   * The operation group failed but the starting op should be retried split from the group.
   */
  SuccessStartingOnly,

  /**
   * The operation failed but should be retried.
   */
  FailRetry,

  /**
   * The operation failed and should not be tried again.
   */
  FailNoRetry,

  /**
   * The operation failed because the request was not authorized.  The operation can be
   * retried if authorization can be achieved.
   */
  FailUnauthorized,

  /**
   * Used in special login case.
   * The operation failed due to a conflict and can be handled.
   */
  FailConflict,

  /**
   * Used in special create user case.
   * The operation failed due to a non-retryable error. Pause the operation repo
   * and retry on a new session, giving the SDK a chance to recover from the failed user create.
   */
  FailPauseOpRepo,
}

// Interfaces
export interface Operation {
  id: string;
  name: string;
  canStartExecute: boolean;
  applyToRecordId?: string;
  groupComparisonType: GroupComparisonType;
  createComparisonKey: string;
  modifyComparisonKey: string;
  translateIds(idTranslations: Record<string, string>): void;
}

export interface IOperationExecutor {
  operations: string[];
  execute(operations: Operation[]): Promise<ExecutionResponse>;
}

export interface ExecutionResponse {
  result: ExecutionResult;
  operations?: Operation[];
  idTranslations?: Record<string, string>;
  retryAfterSeconds?: number;
}

export interface ITime {
  getCurrentTimeMillis(): number;
}

export interface ConfigModel {
  opRepoExecutionInterval: number;
  opRepoPostWakeDelay: number;
  opRepoPostCreateDelay: number;
  opRepoDefaultFailRetryBackoff: number;
}

export interface ConfigModelStore {
  model: ConfigModel;
}

export interface OperationModelStore {
  add(operation: Operation): void;
  add(index: number, operation: Operation): void;
  remove(operationId: string): void;
  list(): Operation[];
  loadOperations(): void;
}

export interface IOperationRepo {
  enqueue(operation: Operation, flush: boolean): void;
  enqueueAndWait(operation: Operation, flush: boolean): Promise<boolean>;
  forceExecuteOperations(): void;
  containsInstanceOf<T extends Operation>(
    type: new (...args: any[]) => T,
  ): boolean;
  awaitInitialized(): Promise<void>;
}

export interface IStartableService {
  start(): void;
}
