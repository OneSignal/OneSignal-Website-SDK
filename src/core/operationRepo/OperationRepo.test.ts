import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExecutionResult,
  GroupComparisonType,
  Operation,
  OperationModelStore,
} from '../../types/operation';
import { NewRecordsState, OperationRepo } from './OperationRepo';

const mockExecutor = {
  operations: ['DUMMY_OPERATION'],
  execute: vi.fn(async () => ({ result: ExecutionResult.Success })),
};
// TODO: Revisit with ModelStore rework
const mockOperationModelStore = {
  loadOperations: vi.fn(),
  list: vi.fn(() => [] as Operation[]),
  add: vi.fn(),
  remove: vi.fn(),
} satisfies OperationModelStore;
const recordsState = new NewRecordsState();
const mockOperation: Operation = {
  id: '1',
  name: 'Op1',
  canStartExecute: true,
  groupComparisonType: GroupComparisonType.None,
  createComparisonKey: '',
  modifyComparisonKey: '',
  translateIds: vi.fn(),
};

describe('OperationRepo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.only('ensures containsInstanceOf works correctly', async () => {
    const cachedOperations = [
      { ...mockOperation, id: '2', name: 'Op2' },
      { ...mockOperation, id: '3', name: 'Op3' },
    ];
    mockOperationModelStore.list.mockReturnValue(cachedOperations);

    const opRepo = new OperationRepo(
      [mockExecutor],
      mockOperationModelStore,
      recordsState,
    );

    opRepo.enqueue(mockOperation);
    expect(opRepo.queue).toEqual([
      {
        operation: mockOperation,
        bucket: 0,
        retries: 0,
      },
    ]);

    // cached operations are added to the front of the queue
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

  it('enqueues operation, executes it, and removes it when executed', async () => {
    // Given
    const mocks = new Mocks();
    const operation = createMockOperation();
    const opId = operation.id;

    // When
    mocks.operationRepo.start();
    const response = await mocks.operationRepo.enqueueAndWait(operation);

    // Then
    expect(response).toBe(true);
    expect(mocks.operationModelStore.add).toHaveBeenCalledWith(operation);
    expect(mocks.executor.execute).toHaveBeenCalledWith([operation]);
    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(opId);
  });

  it('retries operation execution when it fails with FAIL_RETRY', async () => {
    // Given
    const mocks = new Mocks();
    const opRepo = mocks.operationRepo;

    // Override executeOperations with a spy
    vi.spyOn(opRepo as any, 'delayBeforeNextExecution').mockResolvedValue(
      undefined,
    );

    // First call to execute fails with retry, second succeeds
    mocks.executor.execute = vi
      .fn()
      .mockResolvedValueOnce({ result: ExecutionResult.FailRetry })
      .mockResolvedValueOnce({ result: ExecutionResult.Success });

    const operation = createMockOperation();
    const opId = operation.id;

    // When
    opRepo.start();
    const response = await opRepo.enqueueAndWait(operation);

    // Then
    expect(response).toBe(true);
    expect(mocks.operationModelStore.add).toHaveBeenCalledWith(operation);
    expect(mocks.executor.execute).toHaveBeenCalledTimes(2);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(1, [operation]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(2, [operation]);
    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(opId);
  });

  it('delays processing queue by retryAfterSeconds from the last executor results', async () => {
    // Given
    const mocks = new Mocks();
    const opRepo = mocks.operationRepo;

    // Mock execution to fail with retry and a 1 second delay
    mocks.executor.execute = vi
      .fn()
      .mockResolvedValueOnce({
        result: ExecutionResult.FailRetry,
        retryAfterSeconds: 1,
      })
      .mockResolvedValue({ result: ExecutionResult.Success });

    // When
    opRepo.start();
    opRepo.enqueue(createMockOperation());

    // This should time out because of the retry delay
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, 999);
    });
    const response1 = await Promise.race([
      opRepo.enqueueAndWait(createMockOperation()),
      timeoutPromise,
    ]);

    // After waiting more than 1 second, the next operation should succeed
    vi.advanceTimersByTime(1100);

    const response2 = await opRepo.enqueueAndWait(createMockOperation());

    // Then
    expect(response1).toBe(false); // Timed out
    expect(response2).toBe(true);
  });

  it('processes two operations that cannot be grouped separately', async () => {
    // Given
    const mocks = new Mocks();
    const waiter = new Waiter();

    // Mock remove to call waiter.wake() after the second removal
    let removeCallCount = 0;
    vi.spyOn(mocks.operationModelStore, 'remove').mockImplementation(
      (id: string) => {
        removeCallCount++;
        if (removeCallCount === 2) {
          waiter.wake();
        }
      },
    );

    const operation1 = createMockOperation({
      id: 'operationId1',
      groupComparisonType: GroupComparisonType.Create,
    });

    const operation2 = createMockOperation({
      id: 'operationId2',
      createComparisonKey: 'create-key2',
    });

    // When
    mocks.operationRepo.enqueue(operation1);
    mocks.operationRepo.enqueue(operation2);
    mocks.operationRepo.start();

    await waiter.waitForWake();

    // Then
    expect(mocks.operationModelStore.add).toHaveBeenCalledTimes(2);
    expect(mocks.operationModelStore.add).toHaveBeenNthCalledWith(
      1,
      operation1,
    );
    expect(mocks.operationModelStore.add).toHaveBeenNthCalledWith(
      2,
      operation2,
    );

    expect(mocks.executor.execute).toHaveBeenCalledTimes(2);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(1, [operation1]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(2, [operation2]);

    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(
      'operationId1',
    );
    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(
      'operationId2',
    );
  });

  it('groups two operations that can be grouped via create', async () => {
    // Given
    const mocks = new Mocks();
    const waiter = new Waiter();

    // Mock remove to call waiter.wake() after the second removal
    let removeCallCount = 0;
    vi.spyOn(mocks.operationModelStore, 'remove').mockImplementation(
      (id: string) => {
        removeCallCount++;
        if (removeCallCount === 2) {
          waiter.wake();
        }
      },
    );

    const operation1 = createMockOperation({
      id: 'operationId1',
      groupComparisonType: GroupComparisonType.Create,
    });

    const operation2 = createMockOperation({
      id: 'operationId2',
    });

    // When
    mocks.operationRepo.enqueue(operation1);
    mocks.operationRepo.enqueue(operation2);
    mocks.operationRepo.start();

    await waiter.waitForWake();

    // Then
    expect(mocks.operationModelStore.add).toHaveBeenCalledTimes(2);
    expect(mocks.operationModelStore.add).toHaveBeenNthCalledWith(
      1,
      operation1,
    );
    expect(mocks.operationModelStore.add).toHaveBeenNthCalledWith(
      2,
      operation2,
    );

    expect(mocks.executor.execute).toHaveBeenCalledTimes(1);
    expect(mocks.executor.execute).toHaveBeenCalledWith([
      operation1,
      operation2,
    ]);

    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(
      'operationId1',
    );
    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(
      'operationId2',
    );
  });

  it('executes operations with ID translations that updates subsequent operations', async () => {
    // Given
    const mocks = new Mocks();
    const waiter = new Waiter();

    // Mock remove to call waiter.wake() after the second removal
    let removeCallCount = 0;
    vi.spyOn(mocks.operationModelStore, 'remove').mockImplementation(
      (id: string) => {
        removeCallCount++;
        if (removeCallCount === 2) {
          waiter.wake();
        }
      },
    );

    // First execution returns ID translations
    mocks.executor.execute = vi
      .fn()
      .mockResolvedValueOnce({
        result: ExecutionResult.Success,
        idTranslations: { id1: 'id2' },
      })
      .mockResolvedValue({ result: ExecutionResult.Success });

    const operation1 = createMockOperation({ id: 'operationId1' });
    const operation2 = createMockOperation({ id: 'operationId2' });

    // Spy on translateIds
    const translateIdsSpy1 = vi.spyOn(operation1, 'translateIds');
    const translateIdsSpy2 = vi.spyOn(operation2, 'translateIds');

    // When
    mocks.operationRepo.enqueue(operation1);
    mocks.operationRepo.enqueue(operation2);
    mocks.operationRepo.start();

    await waiter.waitForWake();

    // Then
    expect(mocks.executor.execute).toHaveBeenCalledTimes(2);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(1, [operation1]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(2, [operation2]);

    expect(translateIdsSpy1).toHaveBeenCalledWith({ id1: 'id2' });
    expect(translateIdsSpy2).toHaveBeenCalledWith({ id1: 'id2' });

    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(
      'operationId1',
    );
    expect(mocks.operationModelStore.remove).toHaveBeenCalledWith(
      'operationId2',
    );
  });

  it('ensures operations returned by executeOperations are added to beginning of queue', async () => {
    // Given
    const mocks = new Mocks();
    const opWithResult = createMockOperationNonGroupable();
    const opFromResult = createMockOperationNonGroupable();
    const firstOp = createMockOperationNonGroupable();
    const secondOp = createMockOperationNonGroupable();

    mocks.executor.execute = vi
      .fn()
      .mockImplementation(async (operations: Operation[]) => {
        // If opWithResult is in the operations, return opFromResult
        if (operations.includes(opWithResult)) {
          return {
            result: ExecutionResult.Success,
            operations: [opFromResult],
          };
        }
        return { result: ExecutionResult.Success };
      });

    // When
    mocks.operationRepo.start();
    mocks.operationRepo.enqueue(firstOp);

    // Directly call executeOperations with opWithResult
    await (mocks.operationRepo as any).executeOperations([
      { operation: opWithResult, bucket: 0 },
    ]);

    await mocks.operationRepo.enqueueAndWait(secondOp);

    // Then
    expect(mocks.executor.execute).toHaveBeenCalledTimes(4);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(1, [opWithResult]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(2, [opFromResult]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(3, [firstOp]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(4, [secondOp]);
  });

  it('delays operations with applyToRecordId if ID translations occur', async () => {
    // Given
    const mocks = new Mocks();
    // Set a short delay for testing
    mocks.configModelStore.model.opRepoPostCreateDelay = 100;

    const operation1 = createMockOperation({
      groupComparisonType: GroupComparisonType.None,
    });

    const operation2 = createMockOperation({
      groupComparisonType: GroupComparisonType.None,
      applyToRecordId: 'id2',
    });

    const operation3 = createMockOperation({
      groupComparisonType: GroupComparisonType.None,
    });

    // First execution returns ID translations
    mocks.executor.execute = vi
      .fn()
      .mockImplementationOnce(async () => ({
        result: ExecutionResult.Success,
        idTranslations: { 'local-id1': 'id2' },
      }))
      .mockResolvedValue({ result: ExecutionResult.Success });

    // When
    mocks.operationRepo.start();
    mocks.operationRepo.enqueue(operation1);

    const op2Promise = mocks.operationRepo.enqueueAndWait(operation2);
    await vi.advanceTimersByTimeAsync(50); // Not enough time to process next operation

    const op3Promise = mocks.operationRepo.enqueueAndWait(operation3);

    // Complete the post-create delay
    await vi.advanceTimersByTimeAsync(100);

    // Wait for all operations to complete
    await Promise.all([op2Promise, op3Promise]);

    // Then
    expect(mocks.executor.execute).toHaveBeenCalledTimes(3);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(1, [operation1]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(2, [operation2]);
    expect(mocks.executor.execute).toHaveBeenNthCalledWith(3, [operation3]);
  });

  it('removes operations from queue before post-create delay', async () => {
    // Given
    const mocks = new Mocks();
    mocks.configModelStore.model.opRepoPostCreateDelay = 100;

    const operation = createMockOperation({
      groupComparisonType: GroupComparisonType.None,
    });

    const opId = operation.id;
    const idTranslation = { 'local-id1': 'id1' };

    mocks.executor.execute = vi.fn().mockResolvedValue({
      result: ExecutionResult.Success,
      idTranslations: idTranslation,
    });

    // Spy on the necessary methods
    const translateIdsSpy = vi.spyOn(operation, 'translateIds');
    const removeSpy = vi.spyOn(mocks.operationModelStore, 'remove');
    const delaySpy = vi.spyOn(
      mocks.operationRepo as any,
      'delayBeforeNextExecution',
    );

    // When
    mocks.operationRepo.start();
    await mocks.operationRepo.enqueueAndWait(operation);

    // Then
    // Verify correct order: IDs are translated, operation removed, then delay
    expect(translateIdsSpy).toHaveBeenCalledWith(idTranslation);

    // Check order of calls
    const removeCalled = removeSpy.mock.invocationCallOrder[0];
    const delayCalled = delaySpy.mock.invocationCallOrder[0];

    expect(removeCalled).toBeLessThan(delayCalled);
    expect(removeSpy).toHaveBeenCalledWith(opId);
  });

  it('forces execution of operations even with retry delays', async () => {
    // Given
    const mocks = new Mocks();
    const opRepo = mocks.operationRepo;

    // Mock execution to fail with retry and a 5 second delay
    mocks.executor.execute = vi
      .fn()
      .mockResolvedValueOnce({
        result: ExecutionResult.FailRetry,
        retryAfterSeconds: 5,
      })
      .mockResolvedValue({ result: ExecutionResult.Success });

    // When
    opRepo.start();
    opRepo.enqueue(createMockOperation());

    // First attempt should not complete due to retry delay
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, 100);
    });

    const response1 = await Promise.race([
      opRepo.enqueueAndWait(createMockOperation()),
      timeoutPromise,
    ]);

    // Force execution to bypass retry period
    (opRepo as any).forceExecuteOperations();

    // This should now complete
    const response2 = await opRepo.enqueueAndWait(createMockOperation());

    // Then
    expect(response1).toBe(false); // Timed out due to retry delay
    expect(response2).toBe(true); // Completed after force execution
  });
});
