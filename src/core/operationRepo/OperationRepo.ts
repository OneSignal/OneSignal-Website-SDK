import {
  ExecutionResult,
  type IOperationExecutor,
  type IOperationRepo,
  type IStartableService,
} from 'src/core/types/operation';
import { db } from 'src/shared/database/client';
import { isConsentRequired } from 'src/shared/database/config';
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
  db.delete('operations', op.modelId);
};

// Implements logic similar to Android SDK's OperationRepo & OperationQueueItem
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/impl/OperationRepo.kt
export class OperationQueueItem {
  public operation: Operation;
  public bucket: number;
  public retries: number;
  public resolver?: (value: boolean) => void;

  constructor(props: {
    operation: Operation;
    bucket: number;
    retries?: number;
    resolver?: (value: boolean) => void;
  }) {
    this.operation = props.operation;
    this.bucket = props.bucket;
    this.retries = props.retries ?? 0;
    this.resolver = props.resolver;
  }

  toString(): string {
    return `bucket:${this.bucket}, retries:${this.retries}, operation:${this.operation}\n`;
  }
}

// OperationRepo Class
export class OperationRepo implements IOperationRepo, IStartableService {
  private _executorsMap: Map<string, IOperationExecutor>;
  public queue: OperationQueueItem[] = [];
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
      for (const operation of executor.operations) {
        this._executorsMap.set(operation, executor);
      }
    }
  }

  public _clear(): void {
    this.queue = [];
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
    return this.queue.some((item) => item.operation instanceof type);
  }

  public async _start(): Promise<void> {
    await this._loadSavedOperations();
    this._processQueueForever();
  }

  public _pause(): void {
    clearInterval(this._timerID);
    this._timerID = undefined;
    Log.debug('OperationRepo: Paused');
  }

  public enqueue(operation: Operation): void {
    Log.debug(`OperationRepo.enqueue(operation: ${operation})`);

    this._internalEnqueue(
      new OperationQueueItem({
        operation,
        bucket: this._enqueueIntoBucket,
      }),
      true,
    );
  }

  public async enqueueAndWait(operation: Operation): Promise<void> {
    Log.debug(`OperationRepo.enqueueAndWaitoperation: ${operation})`);

    await new Promise((resolve) => {
      this._internalEnqueue(
        new OperationQueueItem({
          operation,
          bucket: this._enqueueIntoBucket,
          resolver: resolve,
        }),
        true,
      );
    });
  }

  private _internalEnqueue(
    queueItem: OperationQueueItem,
    addToStore: boolean,
    index?: number,
  ): void {
    const hasExisting = this.queue.some(
      (item) => item.operation.modelId === queueItem.operation.modelId,
    );
    if (hasExisting) {
      Log.debug(
        `OperationRepo: internalEnqueue - operation.modelId: ${queueItem.operation.modelId} already exists in the queue.`,
      );
      return;
    }

    if (index !== undefined) {
      this.queue.splice(index, 0, queueItem);
    } else {
      this.queue.push(queueItem);
    }

    if (addToStore) {
      this._operationModelStore.add(queueItem.operation);
    }
  }

  private async _processQueueForever(): Promise<void> {
    this._enqueueIntoBucket++;
    let runningOps = false;

    if (isConsentRequired()) {
      this._pause();
      Log.debug('Consent not given; not executing operations');
      return;
    }

    this._timerID = setInterval(async () => {
      if (runningOps) return Log.debug('Operations in progress');

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
      const executor = this._executorsMap.get(startingOp.operation.name);

      if (!executor) {
        throw new Error(
          `Could not find executor for operation ${startingOp.operation.name}`,
        );
      }

      const operations = ops.map((op) => op.operation);
      const response = await executor.execute(operations);
      const idTranslations = response.idTranslations;

      Log.debug(`OperationRepo: execute response = ${response.result}`);

      // Handle ID translations
      if (idTranslations) {
        ops.forEach((op) => op.operation.translateIds(idTranslations));
        this.queue.forEach((item) =>
          item.operation.translateIds(idTranslations),
        );

        Object.values(idTranslations).forEach((id) =>
          this._newRecordState._add(id),
        );
      }

      let highestRetries = 0;
      switch (response.result) {
        case ExecutionResult.SUCCESS:
          // Remove operations from store
          ops.forEach((op) => {
            this._operationModelStore.remove(op.operation.modelId);
          });
          ops.forEach((op) => op.resolver?.(true));
          break;

        case ExecutionResult.FAIL_UNAUTHORIZED:
        case ExecutionResult.FAIL_NORETRY:
        case ExecutionResult.FAIL_CONFLICT:
          Log.error(`Operation execution failed without retry: ${operations}`);
          ops.forEach((op) => {
            this._operationModelStore.remove(op.operation.modelId);
          });
          ops.forEach((op) => op.resolver?.(false));
          break;

        case ExecutionResult.SUCCESS_STARTING_ONLY:
          // Remove starting operation and re-add others to the queue
          this._operationModelStore.remove(startingOp.operation.modelId);

          startingOp.resolver?.(true);
          ops
            .filter((op) => op !== startingOp)
            .reverse()
            .forEach((op) => this.queue.unshift(op));
          break;

        case ExecutionResult.FAIL_RETRY:
          Log.error(`Operation execution failed, retrying: ${operations}`);
          // Add back all operations to front of queue
          ops.toReversed().forEach((op) => {
            removeOpFromDB(op.operation);
            op.retries++;
            if (op.retries > highestRetries) {
              highestRetries = op.retries;
            }
            this.queue.unshift(op);
          });
          break;

        case ExecutionResult.FAIL_PAUSE_OPREPO:
          Log.error(
            `Operation execution failed with eventual retry, pausing the operation repo: ${operations}`,
          );
          this._pause();
          ops.toReversed().forEach((op) => {
            removeOpFromDB(op.operation);
            this.queue.unshift(op);
          });
          break;
      }

      // Handle additional operations from the response
      if (response.operations) {
        for (const op of response.operations.toReversed()) {
          const queueItem = new OperationQueueItem({
            operation: op,
            bucket: 0,
          });
          this.queue.unshift(queueItem);
          this._operationModelStore.addAt(0, queueItem.operation);
        }
      }

      // Wait before next execution
      await this._delayBeforeNextExecution(
        highestRetries,
        response.retryAfterSeconds,
      );
      if (response.idTranslations) {
        await delay(OP_REPO_POST_CREATE_DELAY);
      }
    } catch (e) {
      Log.error(`Error attempting to execute operation: ${ops}`, e);

      // On failure remove operations from store
      ops.forEach((op) => {
        this._operationModelStore.remove(op.operation.modelId);
      });
      ops.forEach((op) => op.resolver?.(false));
    }
  }

  public async _delayBeforeNextExecution(
    retries: number,
    retryAfterSeconds?: number,
  ): Promise<void> {
    Log.debug(`retryAfterSeconds: ${retryAfterSeconds}`);
    const retryAfterSecondsMs = (retryAfterSeconds || 0) * 1000;
    const delayForOnRetries = retries * OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF;
    const delayFor = Math.max(delayForOnRetries, retryAfterSecondsMs);

    if (delayFor < 1) return;

    Log.error(`Operations being delay for: ${delayFor} ms`);
    await delay(delayFor);
  }

  public _getNextOps(bucketFilter: number): OperationQueueItem[] | null {
    const startingOpIndex = this.queue.findIndex(
      (item) =>
        item.operation.canStartExecute &&
        this._newRecordState._canAccess(item.operation.applyToRecordId) &&
        item.bucket <= bucketFilter,
    );

    if (startingOpIndex !== -1) {
      const startingOp = this.queue[startingOpIndex];
      this.queue.splice(startingOpIndex, 1);
      return this._getGroupableOperations(startingOp);
    }

    return null;
  }

  public _getGroupableOperations(
    startingOp: OperationQueueItem,
  ): OperationQueueItem[] {
    const ops = [startingOp];

    if (startingOp.operation.groupComparisonType === GroupComparisonType.NONE)
      return ops;

    const startingKey =
      startingOp.operation.groupComparisonType === GroupComparisonType.CREATE
        ? startingOp.operation.createComparisonKey
        : startingOp.operation.modifyComparisonKey;

    // Create a copy of queue to avoid modification during iteration
    const queueCopy = [...this.queue];

    for (const item of queueCopy) {
      const itemKey =
        startingOp.operation.groupComparisonType === GroupComparisonType.CREATE
          ? item.operation.createComparisonKey
          : item.operation.modifyComparisonKey;

      if (itemKey === '' && startingKey === '')
        throw new Error('Both comparison keys cannot be blank!');

      if (!this._newRecordState._canAccess(item.operation.applyToRecordId))
        continue;

      if (itemKey === startingKey) {
        const index = this.queue.indexOf(item);
        if (index !== -1) {
          this.queue.splice(index, 1);
          ops.push(item);
        }
      }
    }

    return ops;
  }

  public async _loadSavedOperations(): Promise<void> {
    await this._operationModelStore.loadOperations();
    const operations = this._operationModelStore.list().toReversed();

    for (const operation of operations) {
      this._internalEnqueue(
        new OperationQueueItem({
          operation,
          bucket: this._enqueueIntoBucket,
        }),
        false,
        0,
      );
    }
  }
}
