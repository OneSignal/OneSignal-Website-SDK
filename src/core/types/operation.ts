import { type ExecutionResponse } from 'src/core/operations/ExecutionResponse';
import { type Operation } from 'src/core/operations/Operation';

// Enums
export const ExecutionResult = {
  /**
   * The operation was executed successfully.
   */
  SUCCESS: 0,

  /**
   * The operation group failed but the starting op should be retried split from the group.
   */
  SUCCESS_STARTING_ONLY: 1,

  /**
   * The operation failed but should be retried.
   */
  FAIL_RETRY: 2,

  /**
   * The operation failed and should not be tried again.
   */
  FAIL_NORETRY: 3,

  /**
   * The operation failed because the request was not authorized.  The operation can be
   * retried if authorization can be achieved.
   */
  FAIL_UNAUTHORIZED: 4,

  /**
   * Used in special login case.
   * The operation failed due to a conflict and can be handled.
   */
  FAIL_CONFLICT: 5,

  /**
   * Used in special create user case.
   * The operation failed due to a non-retryable error. Pause the operation repo
   * and retry on a new session, giving the SDK a chance to recover from the failed user create.
   */
  FAIL_PAUSE_OPREPO: 6,
} as const;

export type ExecutionResultValue =
  (typeof ExecutionResult)[keyof typeof ExecutionResult];

// Interfaces
export interface IOperationExecutor {
  operations: string[];
  execute(operations: Operation[]): Promise<ExecutionResponse>;
}

export interface IOperationRepo {
  enqueue(operation: Operation, flush?: boolean): void;
  containsInstanceOf<T extends Operation>(
    type: new (...args: any[]) => T,
  ): boolean;
}

export interface IStartableService {
  start(): void;
}
