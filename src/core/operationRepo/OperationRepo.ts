import Log from 'src/shared/libraries/Log';
import { delay } from 'src/shared/utils/utils';
import {
  ExecutionResult,
  GroupComparisonType,
  IOperationExecutor,
  IOperationRepo,
  IStartableService,
  Operation,
  OperationModelStore,
} from 'src/types/operation';
import { v4 as uuid } from 'uuid';

// Reference: OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/config/ConfigModel.kt
export const OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF = 15000;
export const OP_REPO_POST_CREATE_DELAY = 5000;
export const OP_REPO_EXECUTION_INTERVAL = 5000;
export const OP_REPO_POST_CREATE_RETRY_UP_TO = 60_000;

// Implements logic similar to Android SDK's NewRecordsState
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/main/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/states/NewRecordsState.kt
export class NewRecordsState {
  private _records: Map<string, number> = new Map();

  public get records(): Map<string, number> {
    return this._records;
  }

  public add(id: string): void {
    this._records.set(id, Date.now());
  }

  public canAccess(key: string | undefined): boolean {
    if (!key) return true;

    const timeLastMovedOrCreated = this._records.get(key);
    if (!timeLastMovedOrCreated) return true;

    return Date.now() - timeLastMovedOrCreated >= OP_REPO_POST_CREATE_DELAY;
  }

  public isInMissingRetryWindow(key: string): boolean {
    const timeLastMovedOrCreated = this._records.get(key);
    if (!timeLastMovedOrCreated) return false;

    return (
      Date.now() - timeLastMovedOrCreated <= OP_REPO_POST_CREATE_RETRY_UP_TO
    );
  }
}

// Implements logic similar to Android SDK's OperationRepo & OperationQueueItem
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/impl/OperationRepo.kt
export class OperationQueueItem {
  constructor(
    public operation: Operation,
    public bucket: number,
    public retries: number = 0,
  ) {}

  toString(): string {
    return `bucket:${this.bucket}, retries:${this.retries}, operation:${this.operation}\n`;
  }
}

// OperationRepo Class
export class OperationRepo implements IOperationRepo, IStartableService {
  private executorsMap: Map<string, IOperationExecutor>;
  public queue: OperationQueueItem[] = [];
  private paused = false;
  private enqueueIntoBucket = 0;

  constructor(
    executors: IOperationExecutor[],
    private operationModelStore: OperationModelStore,
    private newRecordState: NewRecordsState,
  ) {
    this.executorsMap = new Map<string, IOperationExecutor>();
    for (const executor of executors) {
      for (const operation of executor.operations) {
        this.executorsMap.set(operation, executor);
      }
    }
  }

  public get isPaused(): boolean {
    return this.paused;
  }

  public get records(): Map<string, number> {
    return this.newRecordState.records;
  }

  private get executeBucket(): number {
    return this.enqueueIntoBucket === 0 ? 0 : this.enqueueIntoBucket - 1;
  }

  public containsInstanceOf<T extends Operation>(
    type: new (...args: any[]) => T,
  ): boolean {
    return this.queue.some((item) => item.operation instanceof type);
  }

  public start(): void {
    this.paused = false;
    this.loadSavedOperations();
    this.processQueueForever();
  }

  public enqueue(operation: Operation): void {
    Log.debug(`OperationRepo.enqueue(operation: ${operation})`);

    operation.id = uuid();
    this.internalEnqueue(
      new OperationQueueItem(operation, this.enqueueIntoBucket),
      true,
    );
  }

  private internalEnqueue(
    queueItem: OperationQueueItem,
    addToStore: boolean,
    index?: number,
  ): void {
    const hasExisting = this.queue.some(
      (item) => item.operation.id === queueItem.operation.id,
    );
    if (hasExisting) {
      Log.debug(
        `OperationRepo: internalEnqueue - operation.id: ${queueItem.operation.id} already exists in the queue.`,
      );
      return;
    }

    if (index !== undefined) {
      this.queue.splice(index, 0, queueItem);
    } else {
      this.queue.push(queueItem);
    }

    if (addToStore) {
      this.operationModelStore.add(queueItem.operation);
    }
  }

  private async processQueueForever(): Promise<void> {
    this.enqueueIntoBucket++;
    let runningOps = false;

    setInterval(async () => {
      if (this.paused) return Log.debug('OpRepo is paused');
      if (runningOps) return Log.debug('Operations in progress');

      const ops = this.getNextOps(this.executeBucket);
      Log.debug(`processQueueForever:ops:\n${ops}`);

      if (ops) {
        runningOps = true;
        await this.executeOperations(ops);
        runningOps = false;
      } else {
        this.enqueueIntoBucket++;
      }
    }, OP_REPO_EXECUTION_INTERVAL);
  }

  public async executeOperations(ops: OperationQueueItem[]): Promise<void> {
    try {
      const startingOp = ops[0];
      const executor = this.executorsMap.get(startingOp.operation.name);

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
          this.newRecordState.add(id),
        );
      }

      let highestRetries = 0;
      switch (response.result) {
        case ExecutionResult.Success:
          // Remove operations from store
          ops.forEach((op) => this.operationModelStore.remove(op.operation.id));
          break;

        case ExecutionResult.FailUnauthorized:
        case ExecutionResult.FailNoRetry:
        case ExecutionResult.FailConflict:
          Log.error(`Operation execution failed without retry: ${operations}`);
          ops.forEach((op) => this.operationModelStore.remove(op.operation.id));
          break;

        case ExecutionResult.SuccessStartingOnly:
          // Remove starting operation and re-add others to the queue
          this.operationModelStore.remove(startingOp.operation.id);

          ops
            .filter((op) => op !== startingOp)
            .reverse()
            .forEach((op) => this.queue.unshift(op));
          break;

        case ExecutionResult.FailRetry:
          Log.error(`Operation execution failed, retrying: ${operations}`);
          // Add back all operations to front of queue
          ops.toReversed().forEach((op) => {
            op.retries++;
            if (op.retries > highestRetries) {
              highestRetries = op.retries;
            }
            this.queue.unshift(op);
          });
          break;

        case ExecutionResult.FailPauseOpRepo:
          Log.error(
            `Operation execution failed with eventual retry, pausing the operation repo: ${operations}`,
          );
          this.paused = true;
          ops.toReversed().forEach((op) => this.queue.unshift(op));
          break;
      }

      // Handle additional operations from the response
      if (response.operations) {
        for (const op of response.operations.toReversed()) {
          op.id = uuid();
          const queueItem = new OperationQueueItem(op, 0);
          this.queue.unshift(queueItem);
          this.operationModelStore.add(0, queueItem.operation);
        }
      }

      // Wait before next execution
      await this.delayBeforeNextExecution(
        highestRetries,
        response.retryAfterSeconds,
      );
      if (response.idTranslations) {
        await delay(OP_REPO_POST_CREATE_DELAY);
      }
    } catch (e) {
      Log.error(`Error attempting to execute operation: ${ops}`, e);

      // On failure remove operations from store
      ops.forEach((op) => this.operationModelStore.remove(op.operation.id));
    }
  }

  public async delayBeforeNextExecution(
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

  public getNextOps(bucketFilter: number): OperationQueueItem[] | null {
    const startingOpIndex = this.queue.findIndex(
      (item) =>
        item.operation.canStartExecute &&
        this.newRecordState.canAccess(item.operation.applyToRecordId) &&
        item.bucket <= bucketFilter,
    );

    if (startingOpIndex !== -1) {
      const startingOp = this.queue[startingOpIndex];
      this.queue.splice(startingOpIndex, 1);
      return this.getGroupableOperations(startingOp);
    }

    return null;
  }

  public getGroupableOperations(
    startingOp: OperationQueueItem,
  ): OperationQueueItem[] {
    const ops = [startingOp];

    if (startingOp.operation.groupComparisonType === GroupComparisonType.None)
      return ops;

    const startingKey =
      startingOp.operation.groupComparisonType === GroupComparisonType.Create
        ? startingOp.operation.createComparisonKey
        : startingOp.operation.modifyComparisonKey;

    // Create a copy of queue to avoid modification during iteration
    const queueCopy = [...this.queue];

    for (const item of queueCopy) {
      const itemKey =
        startingOp.operation.groupComparisonType === GroupComparisonType.Create
          ? item.operation.createComparisonKey
          : item.operation.modifyComparisonKey;

      if (itemKey === '' && startingKey === '')
        throw new Error('Both comparison keys cannot be blank!');

      if (!this.newRecordState.canAccess(item.operation.applyToRecordId))
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

  public loadSavedOperations(): void {
    this.operationModelStore.loadOperations();
    const operations = this.operationModelStore.list().toReversed();

    for (const operation of operations) {
      this.internalEnqueue(
        new OperationQueueItem(operation, this.enqueueIntoBucket),
        false,
        0,
      );
    }
  }
}
