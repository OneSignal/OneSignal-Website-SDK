import Log from 'src/shared/libraries/Log';
import { describe, expect, Mock, vi } from 'vitest';
import {
  ExecutionResult,
  IOperationExecutor,
  type OperationModelStore,
} from '../../types/operation';
import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation as OperationBase,
} from '../operations/Operation';
import {
  OP_REPO_EXECUTION_INTERVAL,
  OP_REPO_POST_CREATE_DELAY,
} from './constants';
import { NewRecordsState } from './NewRecordsState';
import { OperationQueueItem, OperationRepo } from './OperationRepo';

vi.spyOn(Log, 'error').mockImplementation(() => '');
vi.useFakeTimers();

describe('OperationRepo', () => {
  const getNewOpRepo = () =>
    new OperationRepo(
      [mockExecutor],
      mockOperationModelStore,
      new NewRecordsState(),
    );

  const getGroupedOp = () => [
    new Operation('1', 'Op1', GroupComparisonType.CREATE, 'abc'),
    new Operation('2', 'Op2', GroupComparisonType.CREATE, 'abc'),
  ];

  beforeEach(() => {
    vi.clearAllTimers();
  });

  test('can enqueue and load cached operations', async () => {
    const cachedOperations = [
      new Operation('2', 'Op2'),
      new Operation('3', 'Op3'),
    ];
    mockOperationModelStore.list.mockReturnValueOnce(cachedOperations);

    const opRepo = getNewOpRepo();

    opRepo.enqueue(mockOperation);
    expect(opRepo.queue).toEqual([
      {
        operation: mockOperation,
        bucket: 0,
        retries: 0,
      },
    ]);

    // cached operations are added to the front of the queue and should maintain order
    opRepo.start();
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

  test('containsInstanceOf', async () => {
    const opRepo = getNewOpRepo();

    class MyOperation extends Operation {
      constructor() {
        super('id1', 'MyOp');
      }
    }

    class MyOperation2 extends MyOperation {}

    opRepo.enqueue(new MyOperation());

    expect(opRepo.containsInstanceOf(MyOperation)).toBe(true);
    expect(opRepo.containsInstanceOf(MyOperation2)).toBe(false);
  });

  test('operations should be processed after start call', async () => {
    const opRepo = getNewOpRepo();

    const getNextOpsSpy = vi.spyOn(opRepo, 'getNextOps');
    opRepo.start();
    opRepo.enqueue(mockOperation);

    expect(opRepo.queue.length).toBe(1);

    // index will be 1 if enqueue is after start
    await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);

    expect(getNextOpsSpy).toHaveBeenCalledWith(0);
    expect(opRepo.queue.length).toBe(0);
  });

  test('can get grouped operations', () => {
    const opRepo = getNewOpRepo();

    const singleOp = new Operation('1', 'Op1', GroupComparisonType.NONE);
    const groupedOps = getGroupedOp();

    let op = new OperationQueueItem(singleOp, 0);

    // single operation should be returned as is
    expect(opRepo.getGroupableOperations(op)).toEqual([op]);

    // can group operations by same create comparison key
    op = new OperationQueueItem(groupedOps[0], 0);
    let op2 = new OperationQueueItem(groupedOps[1], 0);
    opRepo.enqueue(op2.operation);
    expect(opRepo.getGroupableOperations(op)).toEqual([op, op2]);

    // can group operations by same modify comparison key
    op = new OperationQueueItem(
      new Operation('1', 'Op1', GroupComparisonType.ALTER, '', 'abc'),
      0,
    );
    op2 = new OperationQueueItem(
      new Operation('2', 'Op2', GroupComparisonType.ALTER, '', 'abc'),
      0,
    );
    opRepo.enqueue(op2.operation);
    expect(opRepo.getGroupableOperations(op)).toEqual([op, op2]);

    // throws for no comparison keys
    op = new OperationQueueItem(
      new Operation('1', 'Op1', GroupComparisonType.CREATE),
      0,
    );
    opRepo.enqueue(op2.operation);
    expect(() => opRepo.getGroupableOperations(op)).toThrow(
      'Both comparison keys cannot be blank!',
    );

    // returns the starting operation if other operations cant access record
    const blockedId = '456';
    const records = opRepo.records;
    records.set(blockedId, Date.now());

    op = new OperationQueueItem(
      new Operation('1', 'Op1', GroupComparisonType.CREATE, 'def'),
      0,
    );
    op2.operation.applyToRecordId = blockedId;

    opRepo.enqueue(op2.operation);
    expect(opRepo.getGroupableOperations(op)).toEqual([op]);
  });

  describe('Executor Operations', () => {
    const executeOps = async (opRepo: OperationRepo) => {
      opRepo.start();
      await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL);
    };

    test('can handle success operation and process additional operations', async () => {
      const additionalOps = [
        new Operation('3', 'Op3', GroupComparisonType.NONE),
        new Operation('4', 'Op4', GroupComparisonType.NONE),
      ];

      executeFn.mockResolvedValueOnce({
        result: ExecutionResult.SUCCESS,
        operations: additionalOps,
      });

      const opRepo = getNewOpRepo();
      const modelAddSpy = vi.spyOn(mockOperationModelStore, 'add');
      const modelRemoveSpy = vi.spyOn(mockOperationModelStore, 'remove');

      opRepo.enqueue(mockOperation);
      expect(modelAddSpy).toHaveBeenCalledWith(mockOperation);
      modelAddSpy.mockClear();

      // execute the operation
      await executeOps(opRepo);

      // operation should be removed from the model store
      expect(modelRemoveSpy).toHaveBeenCalledWith(mockOperation.id);

      // additional operations should be added to the model store
      expect(modelAddSpy).toHaveBeenCalledWith(0, additionalOps[0]);
      expect(modelAddSpy).toHaveBeenCalledWith(0, additionalOps[1]);
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
      const opRepo = getNewOpRepo();
      const modelRemoveSpy = vi.spyOn(mockOperationModelStore, 'remove');
      executeFn.mockResolvedValueOnce({
        result: failResult,
      });

      opRepo.enqueue(mockOperation);

      // execute the operation
      await executeOps(opRepo);

      // operation should be removed from the model store
      expect(modelRemoveSpy).toHaveBeenCalledWith(mockOperation.id);
    });

    test('can handle success starting only operation', async () => {
      executeFn.mockResolvedValueOnce({
        result: ExecutionResult.SUCCESS_STARTING_ONLY,
      });

      const opRepo = getNewOpRepo();
      const executeOperationsSpy = vi.spyOn(opRepo, 'executeOperations');
      const modelRemoveSpy = vi.spyOn(mockOperationModelStore, 'remove');

      // TODO: Revisit with Operation class rework & LoginOperation implementation
      const groupedOps = getGroupedOp();
      opRepo.enqueue(groupedOps[0]);
      opRepo.enqueue(groupedOps[1]);
      await executeOps(opRepo);
      expect(executeOperationsSpy).toHaveBeenCalledOnce();

      // operation should be removed from the model store
      expect(modelRemoveSpy).toHaveBeenCalledWith(groupedOps[0].id);

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

      const opRepo = getNewOpRepo();
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

      const opRepo = getNewOpRepo();

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

      const opRepo = getNewOpRepo();
      const executeOperationsSpy = vi.spyOn(opRepo, 'executeOperations');

      const newOp = new Operation('2', 'Op2', GroupComparisonType.NONE);
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
      const opRepo = getNewOpRepo();
      const executeOperationsSpy = vi.spyOn(opRepo, 'executeOperations');

      const newOp = new Operation('2', 'Op2', GroupComparisonType.NONE);
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

// TODO: Revisit with ModelStore rework
const mockOperationModelStore = {
  loadOperations: vi.fn(),
  list: vi.fn(() => [] as OperationBase[]),
  add: vi.fn(),
  remove: vi.fn(),
} satisfies OperationModelStore;

// TODO: Revisit with Operation class rework
const translateIdsFn = vi.fn();
class Operation extends OperationBase {
  private _id: string;
  private _groupComparisonTypeValue: GroupComparisonValue;
  private _createComparisonKey: string;
  private _modifyComparisonKey: string;
  private _applyToRecordId: string;
  private _canStartExecute: boolean;

  constructor(
    id: string,
    name: string,
    groupComparisonTypeValue: GroupComparisonValue = GroupComparisonType.NONE,
    createComparisonKey = '',
    modifyComparisonKey = '',
    applyToRecordId = '',
    canStartExecute = true,
  ) {
    super(name);
    this._id = id;
    this._groupComparisonTypeValue = groupComparisonTypeValue;
    this._createComparisonKey = createComparisonKey;
    this._modifyComparisonKey = modifyComparisonKey;
    this._applyToRecordId = applyToRecordId;
    this._canStartExecute = canStartExecute;
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
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
  'Op1',
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
