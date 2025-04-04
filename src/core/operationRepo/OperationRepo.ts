import { v4 as uuidv4 } from 'uuid';

// Enums
export enum GroupComparisonType {
  NONE,
  CREATE,
  MODIFY,
}

export enum ExecutionResult {
  SUCCESS,
  SUCCESS_STARTING_ONLY,
  FAIL_UNAUTHORIZED,
  FAIL_NORETRY,
  FAIL_CONFLICT,
  FAIL_RETRY,
  FAIL_PAUSE_OPREPO,
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

// Helper class
class WaiterWithValue<T> {
  private resolver: ((value: T) => void) | null = null;
  private promise: Promise<T> | null = null;

  constructor() {
    this.createNewPromise();
  }

  private createNewPromise(): void {
    this.promise = new Promise<T>((resolve) => {
      this.resolver = resolve;
    });
  }

  public wake(value: T): void {
    if (this.resolver) {
      this.resolver(value);
      this.createNewPromise();
    }
  }

  public async waitForWake(): Promise<T> {
    const result = await this.promise!;
    return result;
  }
}

// NewRecordsState mock
class NewRecordsState {
  private records: Set<string> = new Set();

  public add(id: string): void {
    this.records.add(id);
  }

  public canAccess(id?: string): boolean {
    if (!id) return true;
    return this.records.has(id);
  }
}

// OperationRepo Class
export class OperationRepo implements IOperationRepo, IStartableService {
  private executorsMap: Map<string, IOperationExecutor>;
  private queue: OperationQueueItem[] = [];
  private waiter = new WaiterWithValue<LoopWaiterMessage>();
  private retryWaiter = new WaiterWithValue<LoopWaiterMessage>();
  private paused = false;
  private initialized: Promise<void>;
  private initializeResolver: (() => void) | null = null;
  private enqueueIntoBucket = 0;

  constructor(
    executors: IOperationExecutor[],
    private operationModelStore: OperationModelStore,
    private configModelStore: ConfigModelStore,
    private time: ITime,
    private newRecordState: NewRecordsState,
  ) {
    this.executorsMap = new Map();
    for (const executor of executors) {
      for (const operation of executor.operations) {
        this.executorsMap.set(operation, executor);
      }
    }

    this.initialized = new Promise<void>((resolve) => {
      this.initializeResolver = resolve;
    });
  }

  private get executeBucket(): number {
    return this.enqueueIntoBucket === 0 ? 0 : this.enqueueIntoBucket - 1;
  }

  public containsInstanceOf<T extends Operation>(
    type: new (...args: any[]) => T,
  ): boolean {
    return this.queue.some((item) => item.operation instanceof type);
  }

  public async awaitInitialized(): Promise<void> {
    return this.initialized;
  }

  public start(): void {
    this.paused = false;
    // In TypeScript, we'll need to use setTimeout or similar instead of coroutines
    this.loadSavedOperations();
    this.processQueueForever();
  }

  public enqueue(operation: Operation, flush: boolean): void {
    console.debug(
      `OperationRepo.enqueue(operation: ${operation}, flush: ${flush})`,
    );

    operation.id = uuidv4();
    this.internalEnqueue(
      new OperationQueueItem(operation, null, this.enqueueIntoBucket),
      flush,
      true,
    );
  }

  public async enqueueAndWait(
    operation: Operation,
    flush: boolean,
  ): Promise<boolean> {
    console.debug(
      `OperationRepo.enqueueAndWait(operation: ${operation}, force: ${flush})`,
    );

    operation.id = uuidv4();
    const waiter = new WaiterWithValue<boolean>();
    this.internalEnqueue(
      new OperationQueueItem(operation, waiter, this.enqueueIntoBucket),
      flush,
      true,
    );
    return waiter.waitForWake();
  }

  private internalEnqueue(
    queueItem: OperationQueueItem,
    flush: boolean,
    addToStore: boolean,
    index?: number,
  ): void {
    const hasExisting = this.queue.some(
      (item) => item.operation.id === queueItem.operation.id,
    );
    if (hasExisting) {
      console.debug(
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

    this.waiter.wake(new LoopWaiterMessage(flush, 0));
  }

  private async processQueueForever(): Promise<void> {
    await this.waitForNewOperationAndExecutionInterval();
    this.enqueueIntoBucket++;

    let running = true;
    while (running) {
      if (this.paused) {
        console.debug('OperationRepo is paused');
        running = false;
        return;
      }

      const ops = this.getNextOps(this.executeBucket);
      console.debug(`processQueueForever:ops:\n${ops}`);

      if (ops) {
        await this.executeOperations(ops);
        // Allow for subsequent operations to be enqueued
        await this.delay(this.configModelStore.model.opRepoPostWakeDelay);
      } else {
        await this.waitForNewOperationAndExecutionInterval();
        this.enqueueIntoBucket++;
      }
    }
  }

  public forceExecuteOperations(): void {
    this.retryWaiter.wake(new LoopWaiterMessage(true));
    this.waiter.wake(new LoopWaiterMessage(false));
  }

  private async waitForNewOperationAndExecutionInterval(): Promise<void> {
    // Wait for an operation to be enqueued
    let wakeMessage = await this.waiter.waitForWake();

    // Wait opRepoExecutionInterval, restart the wait time if something new is enqueued
    let remainingTime =
      this.configModelStore.model.opRepoExecutionInterval -
      wakeMessage.previousWaitedTime;
    while (!wakeMessage.force) {
      const waitResult = await Promise.race([
        this.delay(remainingTime).then(() => 'timeout'),
        this.waiter.waitForWake().then((msg) => {
          wakeMessage = msg;
          return 'wake';
        }),
      ]);

      if (waitResult === 'timeout') break;
      remainingTime = this.configModelStore.model.opRepoExecutionInterval;
    }
  }

  private async executeOperations(ops: OperationQueueItem[]): Promise<void> {
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

      console.debug(`OperationRepo: execute response = ${response.result}`);

      // Handle ID translations
      if (response.idTranslations) {
        ops.forEach((op) =>
          op.operation.translateIds(response.idTranslations!),
        );
        this.queue.forEach((item) =>
          item.operation.translateIds(response.idTranslations!),
        );

        Object.values(response.idTranslations).forEach((id) =>
          this.newRecordState.add(id),
        );
      }

      let highestRetries = 0;
      switch (response.result) {
        case ExecutionResult.SUCCESS:
          // Remove operations from store and wake waiters
          ops.forEach((op) => this.operationModelStore.remove(op.operation.id));
          ops.forEach((op) => op.waiter?.wake(true));
          break;

        case ExecutionResult.FAIL_UNAUTHORIZED:
        case ExecutionResult.FAIL_NORETRY:
        case ExecutionResult.FAIL_CONFLICT:
          console.error(
            `Operation execution failed without retry: ${operations}`,
          );
          ops.forEach((op) => this.operationModelStore.remove(op.operation.id));
          ops.forEach((op) => op.waiter?.wake(false));
          break;

        case ExecutionResult.SUCCESS_STARTING_ONLY:
          // Remove starting operation and re-add others to the queue
          this.operationModelStore.remove(startingOp.operation.id);
          startingOp.waiter?.wake(true);

          ops
            .filter((op) => op !== startingOp)
            .reverse()
            .forEach((op) => this.queue.unshift(op));
          break;

        case ExecutionResult.FAIL_RETRY:
          console.error(`Operation execution failed, retrying: ${operations}`);
          // Add back all operations to front of queue
          ops.reverse().forEach((op) => {
            op.retries++;
            if (op.retries > highestRetries) {
              highestRetries = op.retries;
            }
            this.queue.unshift(op);
          });
          break;

        case ExecutionResult.FAIL_PAUSE_OPREPO:
          console.error(
            `Operation execution failed with eventual retry, pausing the operation repo: ${operations}`,
          );
          this.paused = true;
          ops.reverse().forEach((op) => this.queue.unshift(op));
          break;
      }

      // Handle additional operations from the response
      if (response.operations) {
        for (const op of response.operations.reverse()) {
          op.id = uuidv4();
          const queueItem = new OperationQueueItem(op, null, 0);
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
        await this.delayForPostCreate(
          this.configModelStore.model.opRepoPostCreateDelay,
        );
      }
    } catch (e) {
      console.error(`Error attempting to execute operation: ${ops}`, e);

      // On failure remove operations from store and wake waiters
      ops.forEach((op) => this.operationModelStore.remove(op.operation.id));
      ops.forEach((op) => op.waiter?.wake(false));
    }
  }

  public async delayBeforeNextExecution(
    retries: number,
    retryAfterSeconds?: number,
  ): Promise<void> {
    console.debug(`retryAfterSeconds: ${retryAfterSeconds}`);
    const retryAfterSecondsMs = (retryAfterSeconds || 0) * 1000;
    const delayForOnRetries =
      retries * this.configModelStore.model.opRepoDefaultFailRetryBackoff;
    const delayFor = Math.max(delayForOnRetries, retryAfterSecondsMs);

    if (delayFor < 1) return;

    console.error(`Operations being delay for: ${delayFor} ms`);

    const waitResult = await Promise.race([
      this.delay(delayFor).then(() => 'timeout'),
      this.retryWaiter.waitForWake().then(() => 'wake'),
    ]);
  }

  public async delayForPostCreate(postCreateDelay: number): Promise<void> {
    await this.delay(postCreateDelay);
    if (this.queue.length > 0) {
      this.waiter.wake(new LoopWaiterMessage(false, postCreateDelay));
    }
  }

  protected getNextOps(bucketFilter: number): OperationQueueItem[] | null {
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

  private getGroupableOperations(
    startingOp: OperationQueueItem,
  ): OperationQueueItem[] {
    const ops = [startingOp];

    if (startingOp.operation.groupComparisonType === GroupComparisonType.NONE) {
      return ops;
    }

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

      if (itemKey === '' && startingKey === '') {
        throw new Error('Both comparison keys cannot be blank!');
      }

      if (!this.newRecordState.canAccess(item.operation.applyToRecordId)) {
        continue;
      }

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

  protected loadSavedOperations(): void {
    this.operationModelStore.loadOperations();
    const operations = this.operationModelStore.list().reverse();

    for (const operation of operations) {
      this.internalEnqueue(
        new OperationQueueItem(operation, null, this.enqueueIntoBucket),
        false,
        false,
        0,
      );
    }

    if (this.initializeResolver) {
      this.initializeResolver();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Helper classes
class OperationQueueItem {
  constructor(
    public operation: Operation,
    public waiter: WaiterWithValue<boolean> | null,
    public bucket: number,
    public retries: number = 0,
  ) {}

  toString(): string {
    return `bucket:${this.bucket}, retries:${this.retries}, operation:${this.operation}\n`;
  }
}

class LoopWaiterMessage {
  constructor(
    public force: boolean,
    public previousWaitedTime: number = 0,
  ) {}
}
