import { describe, expect, vi } from 'vitest';
import {
  ExecutionResult,
  GroupComparisonType,
  IOperationExecutor,
  OperationModelStore,
} from '../../types/operation';
import {
  NewRecordsState,
  OP_REPO_EXECUTION_INTERVAL,
  OperationRepo,
} from './OperationRepo';

// TODO: Revisit with ModelStore rework
const mockOperationModelStore = {
  loadOperations: vi.fn(),
  list: vi.fn(() => [] as Operation[]),
  add: vi.fn(),
  remove: vi.fn(),
} satisfies OperationModelStore;

// TODO: Revisit with Operation class rework
const translateIdsFn = vi.fn();
class Operation {
  constructor(
    public id: string,
    public name: string,
    public canStartExecute: boolean = true,
    public applyToRecordId: string = '',
    public groupComparisonType: GroupComparisonType = GroupComparisonType.None,
    public createComparisonKey: string = '',
    public modifyComparisonKey: string = '',
  ) {}

  translateIds() {
    translateIdsFn();
  }
}

const mockOperation = new Operation('1', 'Op1', true, '123');
const executeFn = vi.fn(async () => ({ result: ExecutionResult.Success }));

const mockExecutor: IOperationExecutor = {
  operations: [mockOperation.name],
  execute: executeFn,
};

vi.useFakeTimers();

describe('OperationRepo', () => {
  const getNewOpRepo = () =>
    new OperationRepo(
      [mockExecutor],
      mockOperationModelStore,
      new NewRecordsState(),
    );

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

      createComparisonKey = '';
      modifyComparisonKey = '';
      groupComparisonType = GroupComparisonType.None;
      canStartExecute = false;
      applyToRecordId = '';
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

  describe('Executor Operations', () => {
    const executeOps = async (opRepo: OperationRepo) => {
      opRepo.start();
      await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL);
    };

    test('can handle success operation', async () => {
      const opRepo = getNewOpRepo();
      const modelAddSpy = vi.spyOn(mockOperationModelStore, 'add');
      const modelRemoveSpy = vi.spyOn(mockOperationModelStore, 'remove');

      opRepo.enqueue(mockOperation);
      expect(modelAddSpy).toHaveBeenCalledWith(mockOperation);

      // execute the operation
      await executeOps(opRepo);

      // operation should be removed from the model store
      expect(modelRemoveSpy).toHaveBeenCalledWith(mockOperation.id);
    });

    test.each([
      ['FailUnauthorized', ExecutionResult.FailUnauthorized],
      ['FailNoRetry', ExecutionResult.FailNoRetry],
      ['FailConflict', ExecutionResult.FailConflict],
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
  });
});
