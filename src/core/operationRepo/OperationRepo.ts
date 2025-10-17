import {
  ExecutionResult,
  type IOperationExecutor,
  type IOperationRepo,
  type IStartableService,
} from 'src/core/types/operation';
import { db } from 'src/shared/database/client';
import { delay } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import { type OperationModelStore } from '../modelRepo/OperationModelStore';
import { GroupComparisonType, type Operation } from '../operations/Operation';
import {
  OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF,
  OP_REPO_EXECUTION_INTERVAL,
  OP_REPO_POST_CREATE_DELAY,
} from './constants';
import { type NewRecordsState } from './NewRecordsState';

const removeOpFromDB = (op: Operation) => {
  db.delete('operations', op._modelId);
};

// Implements logic similar to Android SDK's OperationRepo & OperationQueueItem
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/impl/OperationRepo.kt
export interface OperationQueueItem {
  operation: Operation;
  bucket: number;
  retries: number;
  resolver?: (value: boolean) => void;
}

// OperationRepo Class
export class OperationRepo implements IOperationRepo, IStartableService {
  private _executorsMap: Map<string, IOperationExecutor>;
  public _queue: OperationQueueItem[] = [];
  public _timerID: NodeJS.Timeout | undefined = undefined;
  private _enqueueIntoBucket = 0;
  private _operationModelStore: OperationModelStore;
  private _newRecordState: NewRecordsState;

  constructor(
    executors: IOperationExecutor[],
    operationModelStore: OperationModelStore,
    newRecordState: NewRecordsState,
  ) {
    this._operationModelStore = operationModelStore;
    this._newRecordState = newRecordState;

    this._executorsMap = new Map<string, IOperationExecutor>();
    for (const executor of executors) {
      for (const operation of executor._operations) {
        this._executorsMap.set(operation, executor);
      }
    }
  }

  public _clear(): void {
    this._queue = [];
  }

  public get _records(): Map<string, number> {
    return this._newRecordState._records;
  }

  private get _executeBucket(): number {
    return this._enqueueIntoBucket === 0 ? 0 : this._enqueueIntoBucket - 1;
  }

  public _containsInstanceOf<T extends Operation>(
    type: new (...args: any[]) => T,
  ): boolean {
    return this._queue.some((item) => item.operation instanceof type);
  }

  public async _start(): Promise<void> {
    await this._loadSavedOperations();
    this._processQueueForever();
  }

  public _pause(): void {
    clearInterval(this._timerID);
    this._timerID = undefined;
    Log._debug('OperationRepo: Paused');
  }

  public _enqueue(operation: Operation): void {
    Log._debug(`OperationRepo.enqueue(operation: ${operation})`);

    this._internalEnqueue(
      {
        operation,
        bucket: this._enqueueIntoBucket,
        retries: 0,
      },
      true,
    );
  }

  public async _enqueueAndWait(operation: Operation): Promise<void> {
    Log._debug(`OperationRepo.enqueueAndWaitoperation: ${operation})`);

    await new Promise<void>((resolve, reject) => {
      this._internalEnqueue(
        {
          operation,
          bucket: this._enqueueIntoBucket,
          retries: 0,
          resolver: (value) => (value ? resolve() : reject()),
        },
        true,
      );
    });
  }

  private _internalEnqueue(
    queueItem: OperationQueueItem,
    addToStore: boolean,
    index?: number,
  ): void {
    const hasExisting = this._queue.some(
      (item) => item.operation._modelId === queueItem.operation._modelId,
    );
    if (hasExisting) {
      Log._debug(
        `OperationRepo: internalEnqueue - operation.modelId: ${queueItem.operation._modelId} already exists in the queue.`,
      );
      return;
    }

    if (index !== undefined) {
      this._queue.splice(index, 0, queueItem);
    } else {
      this._queue.push(queueItem);
    }

    if (addToStore) {
      this._operationModelStore._add(queueItem.operation);
    }
  }

  private async _processQueueForever(): Promise<void> {
    this._enqueueIntoBucket++;
    let runningOps = false;

    this._timerID = setInterval(async () => {
      if (runningOps) return Log._debug('Operations in progress');

      const ops = this._getNextOps(this._executeBucket);

      if (ops) {
        runningOps = true;
        await this._executeOperations(ops);
        runningOps = false;
      } else {
        this._enqueueIntoBucket++;
      }
    }, OP_REPO_EXECUTION_INTERVAL);
  }

  public async _executeOperations(ops: OperationQueueItem[]): Promise<void> {
    try {
      const startingOp = ops[0];
      const executor = this._executorsMap.get(startingOp.operation._name);

      if (!executor) {
        throw new Error(
          `Could not find executor for operation ${startingOp.operation._name}`,
        );
      }

      const operations = ops.map((op) => op.operation);
      const response = await executor._execute(operations);
      const idTranslations = response._idTranslations;

      Log._debug(`OperationRepo: execute response = ${response._result}`);

      // Handle ID translations
      if (idTranslations) {
        ops.forEach((op) => op.operation._translateIds(idTranslations));
        this._queue.forEach((item) =>
          item.operation._translateIds(idTranslations),
        );

        Object.values(idTranslations).forEach((id) =>
          this._newRecordState._add(id),
        );
      }

      let highestRetries = 0;
      switch (response._result) {
        case ExecutionResult._Success:
          // Remove operations from store
          ops.forEach((op) => {
            this._operationModelStore._remove(op.operation._modelId);
          });
          ops.forEach((op) => op.resolver?.(true));
          break;

        case ExecutionResult._FailUnauthorized:
        case ExecutionResult._FailNoretry:
        case ExecutionResult._FailConflict:
          Log._error(`Operation execution failed without retry: ${operations}`);
          ops.forEach((op) => {
            this._operationModelStore._remove(op.operation._modelId);
          });
          ops.forEach((op) => op.resolver?.(false));
          break;

        case ExecutionResult._SuccessStartingOnly:
          // Remove starting operation and re-add others to the queue
          this._operationModelStore._remove(startingOp.operation._modelId);

          startingOp.resolver?.(true);
          ops
            .filter((op) => op !== startingOp)
            .reverse()
            .forEach((op) => this._queue.unshift(op));
          break;

        case ExecutionResult._FailRetry:
          Log._error(`Operation execution failed, retrying: ${operations}`);
          // Add back all operations to front of queue
          [...ops].reverse().forEach((op) => {
            removeOpFromDB(op.operation);
            op.retries++;
            if (op.retries > highestRetries) {
              highestRetries = op.retries;
            }
            this._queue.unshift(op);
          });
          break;

        case ExecutionResult._FailPauseOpRepo:
          Log._error(`Operation failed, pausing ops:${operations}`);
          this._pause();
          ops.forEach((op) => op.resolver?.(false));
          [...ops].reverse().forEach((op) => {
            removeOpFromDB(op.operation);
            this._queue.unshift(op);
          });
          break;
      }

      // Handle additional operations from the response
      if (response._operations) {
        for (const op of [...response._operations].reverse()) {
          const queueItem = {
            operation: op,
            bucket: 0,
            retries: 0,
          };
          this._queue.unshift(queueItem);
          this._operationModelStore._addAt(0, queueItem.operation);
        }
      }

      // Wait before next execution
      await this._delayBeforeNextExecution(
        highestRetries,
        response._retryAfterSeconds,
      );
      if (response._idTranslations) {
        await delay(OP_REPO_POST_CREATE_DELAY);
      }
    } catch (e) {
      Log._error(`Error attempting to execute operation: ${ops}`, e);

      // On failure remove operations from store
      ops.forEach((op) => {
        this._operationModelStore._remove(op.operation._modelId);
      });
      ops.forEach((op) => op.resolver?.(false));
    }
  }

  public async _delayBeforeNextExecution(
    retries: number,
    retryAfterSeconds?: number,
  ): Promise<void> {
    Log._debug(`retryAfterSeconds: ${retryAfterSeconds}`);
    const retryAfterSecondsMs = (retryAfterSeconds || 0) * 1000;
    const delayForOnRetries = retries * OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF;
    const delayFor = Math.max(delayForOnRetries, retryAfterSecondsMs);

    if (delayFor < 1) return;

    Log._error(`Operations being delay for: ${delayFor} ms`);
    await delay(delayFor);
  }

  public _getNextOps(bucketFilter: number): OperationQueueItem[] | null {
    const startingOpIndex = this._queue.findIndex(
      (item) =>
        item.operation._canStartExecute &&
        this._newRecordState._canAccess(item.operation._applyToRecordId) &&
        item.bucket <= bucketFilter,
    );

    if (startingOpIndex !== -1) {
      const startingOp = this._queue[startingOpIndex];
      this._queue.splice(startingOpIndex, 1);
      return this._getGroupableOperations(startingOp);
    }

    return null;
  }

  public _getGroupableOperations(
    startingOp: OperationQueueItem,
  ): OperationQueueItem[] {
    const ops = [startingOp];

    if (startingOp.operation._groupComparisonType === GroupComparisonType._None)
      return ops;

    const startingKey =
      startingOp.operation._groupComparisonType === GroupComparisonType._Create
        ? startingOp.operation._createComparisonKey
        : startingOp.operation._modifyComparisonKey;

    // Create a copy of queue to avoid modification during iteration
    const queueCopy = [...this._queue];

    for (const item of queueCopy) {
      const itemKey =
        startingOp.operation._groupComparisonType ===
        GroupComparisonType._Create
          ? item.operation._createComparisonKey
          : item.operation._modifyComparisonKey;

      if (itemKey === '' && startingKey === '')
        throw new Error('Both comparison keys cannot be blank!');

      if (!this._newRecordState._canAccess(item.operation._applyToRecordId))
        continue;

      if (itemKey === startingKey) {
        const index = this._queue.indexOf(item);
        if (index !== -1) {
          this._queue.splice(index, 1);
          ops.push(item);
        }
      }
    }

    return ops;
  }

  public async _loadSavedOperations(): Promise<void> {
    await this._operationModelStore._loadOperations();
    const operations = [...this._operationModelStore._list()].reverse();

    for (const operation of operations) {
      this._internalEnqueue(
        {
          operation,
          bucket: this._enqueueIntoBucket,
          retries: 0,
        },
        false,
        0,
      );
    }
  }
}
