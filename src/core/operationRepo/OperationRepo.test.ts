import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID,
} from '__test__/support/constants';
import { mockUserAgent } from '__test__/support/environment/TestEnvironmentHelpers';
import { fakeWaitForOperations } from '__test__/support/helpers/executors';
import Log from 'src/shared/libraries/Log';
import Database, { type OperationItem } from 'src/shared/services/Database';
import { describe, expect, type Mock, vi } from 'vitest';
import { OperationModelStore } from '../modelRepo/OperationModelStore';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import {
  GroupComparisonType,
  type GroupComparisonValue,
  Operation as OperationBase,
} from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { ModelName } from '../types/models';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';
import { SubscriptionType } from '../types/subscription';
import {
  OP_REPO_EXECUTION_INTERVAL,
  OP_REPO_POST_CREATE_DELAY,
} from './constants';
import { NewRecordsState } from './NewRecordsState';
import { OperationQueueItem, OperationRepo } from './OperationRepo';

vi.spyOn(Log, 'error').mockImplementation((msg) => {
  if (typeof msg === 'string' && msg.includes('Operation execution failed'))
    return '';
  return msg;
});
vi.useFakeTimers();

// for the sake of testing, we want to use a simple mock operation and execturo
vi.spyOn(OperationModelStore.prototype, 'create').mockImplementation(() => {
  return null;
});

let mockOperationModelStore: OperationModelStore;
mockUserAgent();

describe('OperationRepo', () => {
  let opRepo: OperationRepo;

  const getGroupedOp = () => [
    new Operation('1', GroupComparisonType.CREATE, 'abc'),
    new Operation('2', GroupComparisonType.CREATE, 'abc'),
  ];

  beforeEach(async () => {
    await Database.remove(ModelName.Operations);

    mockOperationModelStore = new OperationModelStore();
    opRepo = new OperationRepo(
      [mockExecutor],
      mockOperationModelStore,
      new NewRecordsState(),
    );
  });

  afterEach(async () => {
    // since the perist call in model store is not awaited, we need to flush the queue
    // for tests that call start on the op repo
    if (!opRepo.isPaused) {
      await vi.waitUntil(async () => {
        const dbOps = await Database.getAll<OperationItem>(
          ModelName.Operations,
        );
        return dbOps.length === 0;
      });
    }
  });

  describe('Enqueue/Load Operations', () => {
    test('can enqueue and load cached operations', async () => {
      const cachedOperations = [new Operation('2'), new Operation('3')];
      mockOperationModelStore.add(cachedOperations[0]);
      mockOperationModelStore.add(cachedOperations[1]);

      opRepo.enqueue(mockOperation);
      expect(opRepo.queue).toEqual([
        {
          operation: mockOperation,
          bucket: 0,
          retries: 0,
        },
      ]);

      // cached operations are added to the front of the queue and should maintain order
      await opRepo.start();
      expect(opRepo.queue).toEqual([
        {
          operation: cachedOperations[0],
          bucket: 0,
          retries: 0,
        },
        {
          operation: cachedOperations[1],
          bucket: 0,
          retries: 0,
        },
        {
          operation: mockOperation,
          bucket: 0,
          retries: 0,
        },
      ]);
    });

    test('enqueue should persist operations in IndexedDb', async () => {
      await opRepo.loadSavedOperations();

      const op1 = new SetAliasOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        'some-label',
        'some-value',
      );
      opRepo.enqueue(op1);

      const op2 = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        token: 'some-token',
        type: SubscriptionType.ChromePush,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
      });
      opRepo.enqueue(op2);
      expect(mockOperationModelStore.list()).toEqual([op1, op2]);

      // persist happens in the background, so we need to wait for it to complete
      let ops: OperationItem[] = [];
      await vi.waitUntil(async () => {
        ops = await Database.getAll<OperationItem>(ModelName.Operations);
        return ops.length === 2;
      });

      // IndexedDB returns operations in a random order
      ops = ops.sort((a, b) => a.name.localeCompare(b.name));

      expect(ops).toEqual([
        {
          ...op2.toJSON(),
          modelId: op2.modelId,
          modelName: ModelName.Operations,
        },
        {
          ...op1.toJSON(),
          modelId: op1.modelId,
          modelName: ModelName.Operations,
        },
      ]);
    });

    test('operations can be loaded from IndexedDb on start', async () => {
      const op = new SetAliasOperation();
      const op2 = new CreateSubscriptionOperation();
      await Database.put(ModelName.Operations, {
        ...op.toJSON(),
        modelId: '1',
        modelName: ModelName.Operations,
      });
      await Database.put(ModelName.Operations, {
        ...op2.toJSON(),
        modelId: '2',
        modelName: ModelName.Operations,
      });

      await opRepo.loadSavedOperations();

      const list = await Database.getAll<OperationItem>(ModelName.Operations);
      expect(list).toEqual([
        {
          ...op.toJSON(),
          modelId: '1',
          modelName: ModelName.Operations,
        },
        {
          ...op2.toJSON(),
          modelId: '2',
          modelName: ModelName.Operations,
        },
      ]);
    });
  });

  test('containsInstanceOf', async () => {
    class MyOperation extends Operation {
      constructor() {
        super('id1');
      }
    }

    class MyOperation2 extends MyOperation {}

    opRepo.enqueue(new MyOperation());

    expect(opRepo.containsInstanceOf(MyOperation)).toBe(true);
    expect(opRepo.containsInstanceOf(MyOperation2)).toBe(false);
  });

  test('operations should be processed after start call', async () => {
    const getNextOpsSpy = vi.spyOn(opRepo, 'getNextOps');
    await opRepo.start();
    opRepo.enqueue(mockOperation);

    expect(opRepo.queue.length).toBe(1);

    // index will be 1 if enqueue is after start
    await fakeWaitForOperations();

    expect(getNextOpsSpy).toHaveBeenCalledWith(0);
    expect(opRepo.queue.length).toBe(0);
  });

  test('can get grouped operations', () => {
    const singleOp = new Operation('1', GroupComparisonType.NONE);
    const groupedOps = getGroupedOp();

    let op = new OperationQueueItem({
      operation: singleOp,
      bucket: 0,
    });

    // single operation should be returned as is
    expect(opRepo.getGroupableOperations(op)).toEqual([op]);

    // can group operations by same create comparison key
    op = new OperationQueueItem({
      operation: groupedOps[0],
      bucket: 0,
    });
    let op2 = new OperationQueueItem({
      operation: groupedOps[1],
      bucket: 0,
    });
    opRepo.enqueue(op2.operation);
    expect(opRepo.getGroupableOperations(op)).toEqual([op, op2]);

    // can group operations by same modify comparison key
    op = new OperationQueueItem({
      operation: new Operation('1', GroupComparisonType.ALTER, '', 'abc'),
      bucket: 0,
    });
    op2 = new OperationQueueItem({
      operation: new Operation('2', GroupComparisonType.ALTER, '', 'abc'),
      bucket: 0,
    });
    opRepo.enqueue(op2.operation);
    expect(opRepo.getGroupableOperations(op)).toEqual([op, op2]);

    // throws for no comparison keys
    op = new OperationQueueItem({
      operation: new Operation('1', GroupComparisonType.CREATE),
      bucket: 0,
    });
    opRepo.enqueue(op2.operation);
    expect(() => opRepo.getGroupableOperations(op)).toThrow(
      'Both comparison keys cannot be blank!',
    );

    // returns the starting operation if other operations cant access record
    const blockedId = '456';
    const records = opRepo.records;
    records.set(blockedId, Date.now());

    op = new OperationQueueItem({
      operation: new Operation('1', GroupComparisonType.CREATE, 'def'),
      bucket: 0,
    });
    op2.operation.setProperty('onesignalId', blockedId);

    opRepo.enqueue(op2.operation);
    expect(opRepo.getGroupableOperations(op)).toEqual([op]);
  });

  describe('Executor Operations', () => {
    const executeOps = async (opRepo: OperationRepo) => {
      await opRepo.start();
      await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL);
    };

    test('can handle success operation and process additional operations', async () => {
      const additionalOps = [
        new Operation('3', GroupComparisonType.NONE),
        new Operation('4', GroupComparisonType.NONE),
      ];

      executeFn.mockResolvedValueOnce({
        result: ExecutionResult.SUCCESS,
        operations: additionalOps,
      });

      opRepo.enqueue(mockOperation);
      expect(mockOperationModelStore.list()).toEqual([mockOperation]);

      // execute the operation
      await executeOps(opRepo);

      // operation should be removed from the model store
      // additional operations should be added to the model store
      expect(mockOperationModelStore.list()).toEqual([
        additionalOps[0],
        additionalOps[1],
      ]);
      expect(opRepo.queue).toEqual([
        {
          operation: additionalOps[0],
          bucket: 0,
          retries: 0,
        },
        {
          operation: additionalOps[1],
          bucket: 0,
          retries: 0,
        },
      ]);
    });

    test.each([
      ['FailUnauthorized', ExecutionResult.FAIL_UNAUTHORIZED],
      ['FailNoRetry', ExecutionResult.FAIL_NORETRY],
      ['FailConflict', ExecutionResult.FAIL_CONFLICT],
    ])('can handle failed operation: %s', async (_, failResult) => {
      executeFn.mockResolvedValueOnce({
        result: failResult,
      });

      opRepo.enqueue(mockOperation);
      expect(mockOperationModelStore.list()).toEqual([mockOperation]);

      // execute the operation
      await executeOps(opRepo);

      // operation should be removed from the model store
      expect(mockOperationModelStore.list()).toEqual([]);
    });

    test('can handle success starting only operation', async () => {
      executeFn.mockResolvedValueOnce({
        result: ExecutionResult.SUCCESS_STARTING_ONLY,
      });

      const executeOperationsSpy = vi.spyOn(opRepo, 'executeOperations');

      const groupedOps = getGroupedOp();
      opRepo.enqueue(groupedOps[0]);
      opRepo.enqueue(groupedOps[1]);

      expect(mockOperationModelStore.list()).toEqual([
        groupedOps[0],
        groupedOps[1],
      ]);

      await executeOps(opRepo);
      expect(executeOperationsSpy).toHaveBeenCalledOnce();

      // operation should be removed from the model store
      expect(mockOperationModelStore.list()).toEqual([groupedOps[1]]);

      // group operations will be added to the queue except for the first/starting item
      expect(opRepo.queue).toEqual([
        {
          operation: groupedOps[1],
          bucket: 0,
          retries: 0,
        },
      ]);
    });

    test('can handle fail retry operation and delay next execution', async () => {
      executeFn.mockResolvedValueOnce({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 30,
      });

      const executeOperationsSpy = vi.spyOn(opRepo, 'executeOperations');

      const groupedOps = getGroupedOp();
      opRepo.enqueue(groupedOps[0]);
      opRepo.enqueue(groupedOps[1]);
      await executeOps(opRepo);

      // operations will be added back to the front of the queue
      expect(executeOperationsSpy).toHaveBeenCalledOnce();
      expect(opRepo.queue).toEqual([
        {
          operation: groupedOps[0],
          bucket: 0,
          retries: 1,
        },
        {
          operation: groupedOps[1],
          bucket: 0,
          retries: 1,
        },
      ]);

      // should wait 30 seconds before executing again
      await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL);
      expect(executeOperationsSpy).toHaveBeenCalledOnce(); // 30 seconds has not passed yet

      await vi.advanceTimersByTimeAsync(30000);
      expect(executeOperationsSpy).toHaveBeenCalledTimes(2); // 30 seconds has passed
    });

    test('can handle fail pause op repo operation', async () => {
      executeFn.mockResolvedValueOnce({
        result: ExecutionResult.FAIL_PAUSE_OPREPO,
      });

      const groupedOps = getGroupedOp();
      opRepo.enqueue(groupedOps[0]);
      opRepo.enqueue(groupedOps[1]);
      await executeOps(opRepo);

      // operations will be added back to the front of the queue
      expect(opRepo.queue).toEqual([
        {
          operation: groupedOps[0],
          bucket: 0,
          retries: 0,
        },
        {
          operation: groupedOps[1],
          bucket: 0,
          retries: 0,
        },
      ]);

      // op repo should be paused
      expect(opRepo.isPaused).toBe(true);
    });

    test('can process delay for translations', async () => {
      const idTranslations = {
        '1': '2',
      };
      executeFn.mockResolvedValueOnce({
        result: ExecutionResult.SUCCESS,
        idTranslations,
      });

      const executeOperationsSpy = vi.spyOn(opRepo, 'executeOperations');

      const newOp = new Operation('2', GroupComparisonType.NONE);
      const opTranslateIdsSpy = vi.spyOn(newOp, 'translateIds');

      opRepo.enqueue(mockOperation);
      opRepo.enqueue(newOp);
      await executeOps(opRepo);

      expect(opTranslateIdsSpy).toHaveBeenCalledWith(idTranslations);
      expect(opRepo.records).toEqual(new Map([['2', Date.now()]]));

      // should wait 5 seconds before processing the queue again
      await vi.advanceTimersByTimeAsync(OP_REPO_POST_CREATE_DELAY);
      expect(executeOperationsSpy).toHaveBeenCalledOnce();

      // can now process operations again
      await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL);
      expect(executeOperationsSpy).toHaveBeenCalledTimes(2);
    });

    test('should process non-groupable operations separately', async () => {
      const executeOperationsSpy = vi.spyOn(opRepo, 'executeOperations');

      const newOp = new Operation('2', GroupComparisonType.NONE);
      opRepo.enqueue(mockOperation);
      opRepo.enqueue(newOp);
      await executeOps(opRepo);

      // first operation should be processed
      expect(executeOperationsSpy).toHaveBeenCalledExactlyOnceWith([
        {
          operation: mockOperation,
          bucket: 0,
          retries: 0,
        },
      ]);
      expect(opRepo.queue).toEqual([
        { operation: newOp, bucket: 0, retries: 0 },
      ]);

      // next operation should be processed
      await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL);
      expect(executeOperationsSpy).toHaveBeenNthCalledWith(2, [
        {
          operation: newOp,
          bucket: 0,
          retries: 0,
        },
      ]);
      expect(opRepo.queue).toEqual([]);

      // queue is clear so no more operations should be processed
      await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL);
      expect(executeOperationsSpy).toHaveBeenCalledTimes(2);
    });
  });
});

const translateIdsFn = vi.fn();
class Operation extends OperationBase<{ value: string }> {
  private _groupComparisonTypeValue: GroupComparisonValue;
  private _createComparisonKey: string;
  private _modifyComparisonKey: string;
  private _applyToRecordId: string;
  private _canStartExecute: boolean;

  constructor(
    value: string,
    groupComparisonTypeValue: GroupComparisonValue = GroupComparisonType.NONE,
    createComparisonKey = '',
    modifyComparisonKey = '',
    applyToRecordId = '',
    canStartExecute = true,
  ) {
    super('mock-op', APP_ID, DUMMY_ONESIGNAL_ID);
    this.value = value;
    this._groupComparisonTypeValue = groupComparisonTypeValue;
    this._createComparisonKey = createComparisonKey;
    this._modifyComparisonKey = modifyComparisonKey;
    this._applyToRecordId = applyToRecordId;
    this._canStartExecute = canStartExecute;
  }

  get value(): string {
    return this.getProperty('value');
  }
  set value(value: string) {
    this.setProperty('value', value);
  }

  get groupComparisonType(): GroupComparisonValue {
    return this._groupComparisonTypeValue;
  }

  get createComparisonKey(): string {
    return this._createComparisonKey;
  }

  get modifyComparisonKey(): string {
    return this._modifyComparisonKey;
  }

  get applyToRecordId(): string {
    return this._applyToRecordId;
  }

  set applyToRecordId(value: string) {
    this._applyToRecordId = value;
  }

  get canStartExecute(): boolean {
    return this._canStartExecute;
  }

  translateIds() {
    translateIdsFn();
  }
}

const mockOperation = new Operation(
  '1',
  GroupComparisonType.CREATE,
  'abc',
  '',
  '123',
);
const executeFn: Mock<IOperationExecutor['execute']> = vi.fn(async () => ({
  result: ExecutionResult.SUCCESS,
}));

const mockExecutor: IOperationExecutor = {
  operations: [mockOperation.name],
  execute: executeFn,
};
