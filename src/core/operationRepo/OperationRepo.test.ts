import { APP_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { clearAll, db } from 'src/shared/database/client';
import type { IndexedDBSchema } from 'src/shared/database/types';
import { delay as delaySpy } from 'src/shared/helpers/general';
import { setConsentRequired } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vite-plus/test';

import { OperationModelStore } from '../modelRepo/OperationModelStore';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import {
  GroupComparisonType,
  type GroupComparisonValue,
  Operation as OperationBase,
} from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';
import { OP_REPO_POST_CREATE_DELAY } from './constants';
import { NewRecordsState } from './NewRecordsState';
import { OperationRepo } from './OperationRepo';

vi.mock('src/shared/helpers/general', async (importOriginal) => {
  const mod = await importOriginal<typeof import('src/shared/helpers/general')>();
  return { ...mod, delay: vi.fn(() => Promise.resolve()) };
});

vi.spyOn(Log, '_error').mockImplementation((msg) => {
  if (typeof msg === 'string' && msg.includes('Operation execution failed')) return '';
  return msg;
});

// for the sake of testing, we want to use a simple mock operation and execturo
vi.spyOn(OperationModelStore.prototype, '_create').mockImplementation(() => {
  return null;
});

let mockOperationModelStore: OperationModelStore;

const executeOps = async (opRepo: OperationRepo) => {
  await opRepo._loadSavedOperations();
  const ops = opRepo._getNextOps(0);
  if (ops) await opRepo._executeOperations(ops);
};

const isConsentRequired = vi.hoisted(() => vi.fn(() => false));

vi.mock('src/shared/database/config', () => ({
  isConsentRequired: isConsentRequired,
}));

describe('OperationRepo', () => {
  let opRepo: OperationRepo;

  const getGroupedOp = () => [
    new Operation('1', GroupComparisonType._Create, 'abc'),
    new Operation('2', GroupComparisonType._Create, 'abc'),
  ];

  beforeEach(() => {
    setConsentRequired(false);

    mockOperationModelStore = new OperationModelStore();
    opRepo = new OperationRepo([mockExecutor], mockOperationModelStore, new NewRecordsState());
  });

  afterEach(async () => {
    opRepo._pause();
    await clearAll();
  });

  describe('Enqueue/Load Operations', () => {
    test('can enqueue and load cached operations', async () => {
      const cachedOperations = [new Operation('2'), new Operation('3')];
      mockOperationModelStore._add(cachedOperations[0]);
      mockOperationModelStore._add(cachedOperations[1]);

      opRepo._enqueue(mockOperation);
      expect(opRepo._queue).toEqual([
        {
          operation: mockOperation,
          bucket: 0,
          retries: 0,
        },
      ]);

      // cached operations are added to the front of the queue and should maintain order
      await opRepo._loadSavedOperations();
      expect(opRepo._queue).toEqual([
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
      await opRepo._loadSavedOperations();

      const op1 = new SetAliasOperation(APP_ID, ONESIGNAL_ID, 'some-label', 'some-value');
      opRepo._enqueue(op1);

      const op2 = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        token: 'some-token',
        type: SubscriptionType._ChromePush,
        subscriptionId: SUB_ID,
      });
      opRepo._enqueue(op2);
      expect(mockOperationModelStore._list()).toEqual([op1, op2]);

      // persist happens in the background, so we need to wait for it to complete
      let ops: IndexedDBSchema['operations']['value'][] = [];
      await vi.waitUntil(async () => {
        ops = await db.getAll('operations');
        return ops.length === 2;
      });

      // IndexedDB returns operations in a random order
      ops = ops.sort((a, b) => a.name.localeCompare(b.name));

      expect(ops).toEqual([
        {
          ...op2.toJSON(),
          modelId: op2._modelId,
          modelName: 'operations',
        },
        {
          ...op1.toJSON(),
          modelId: op1._modelId,
          modelName: 'operations',
        },
      ]);
    });

    test('operations can be loaded from IndexedDb on start', async () => {
      const op = new SetAliasOperation();
      const op2 = new CreateSubscriptionOperation();
      await db.put('operations', {
        ...op.toJSON(),
        modelId: '1',
        modelName: 'operations',
      });
      await db.put('operations', {
        ...op2.toJSON(),
        modelId: '2',
        modelName: 'operations',
      });

      await opRepo._loadSavedOperations();

      const list = await db.getAll('operations');
      expect(list).toEqual([
        {
          ...op.toJSON(),
          modelId: '1',
          modelName: 'operations',
        },
        {
          ...op2.toJSON(),
          modelId: '2',
          modelName: 'operations',
        },
      ]);
    });
  });

  test('containsInstanceOf', () => {
    class MyOperation extends Operation {
      constructor() {
        super('id1');
      }
    }

    class MyOperation2 extends MyOperation {}

    opRepo._enqueue(new MyOperation());

    expect(opRepo._containsInstanceOf(MyOperation)).toBe(true);
    expect(opRepo._containsInstanceOf(MyOperation2)).toBe(false);
  });

  test('operations should be processed after start call', async () => {
    await opRepo._start();
    opRepo._enqueue(mockOperation);

    expect(opRepo._queue.length).toBe(1);

    await vi.waitUntil(() => opRepo._queue.length === 0, { timeout: 3000 });
    expect(opRepo._queue.length).toBe(0);
  });

  test('can get grouped operations', () => {
    const singleOp = new Operation('1', GroupComparisonType._None);
    const groupedOps = getGroupedOp();

    let op = {
      operation: singleOp,
      bucket: 0,
      retries: 0,
    };

    // single operation should be returned as is
    expect(opRepo._getGroupableOperations(op)).toEqual([op]);

    // can group operations by same create comparison key
    op = {
      operation: groupedOps[0],
      bucket: 0,
      retries: 0,
    };
    let op2 = {
      operation: groupedOps[1],
      bucket: 0,
      retries: 0,
    };
    opRepo._enqueue(op2.operation);
    expect(opRepo._getGroupableOperations(op)).toEqual([op, op2]);

    // can group operations by same modify comparison key
    op = {
      operation: new Operation('1', GroupComparisonType._Alter, '', 'abc'),
      bucket: 0,
      retries: 0,
    };
    op2 = {
      operation: new Operation('2', GroupComparisonType._Alter, '', 'abc'),
      bucket: 0,
      retries: 0,
    };
    opRepo._enqueue(op2.operation);
    expect(opRepo._getGroupableOperations(op)).toEqual([op, op2]);

    // throws for no comparison keys
    op = {
      operation: new Operation('1', GroupComparisonType._Create),
      bucket: 0,
      retries: 0,
    };
    opRepo._enqueue(op2.operation);
    expect(() => opRepo._getGroupableOperations(op)).toThrow(
      'Both comparison keys cannot be blank!',
    );

    // returns the starting operation if other operations cant access record
    const blockedId = '456';
    const records = opRepo._records;
    records.set(blockedId, Date.now());

    op = {
      operation: new Operation('1', GroupComparisonType._Create, 'def'),
      bucket: 0,
      retries: 0,
    };
    op2.operation._setProperty('onesignalId', blockedId);

    opRepo._enqueue(op2.operation);
    expect(opRepo._getGroupableOperations(op)).toEqual([op]);
  });

  describe('Executor Operations', () => {
    test('can handle success operation and process additional operations', async () => {
      const additionalOps = [
        new Operation('3', GroupComparisonType._None),
        new Operation('4', GroupComparisonType._None),
      ];

      executeFn.mockResolvedValueOnce({
        _result: ExecutionResult._Success,
        _operations: additionalOps,
      });

      opRepo._enqueue(mockOperation);
      expect(mockOperationModelStore._list()).toEqual([mockOperation]);

      // execute the operation
      await executeOps(opRepo);

      // operation should be removed from the model store
      // additional operations should be added to the model store
      expect(mockOperationModelStore._list()).toEqual([additionalOps[0], additionalOps[1]]);
      expect(opRepo._queue).toEqual([
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
      ['FailUnauthorized', ExecutionResult._FailUnauthorized],
      ['FailNoRetry', ExecutionResult._FailNoretry],
      ['FailConflict', ExecutionResult._FailConflict],
    ])('can handle failed operation: %s', async (_, failResult) => {
      executeFn.mockResolvedValueOnce({
        _result: failResult,
      });

      opRepo._enqueue(mockOperation);
      expect(mockOperationModelStore._list()).toEqual([mockOperation]);

      // execute the operation
      await executeOps(opRepo);

      // operation should be removed from the model store
      expect(mockOperationModelStore._list()).toEqual([]);
    });

    test('can handle success starting only operation', async () => {
      executeFn.mockResolvedValueOnce({
        _result: ExecutionResult._SuccessStartingOnly,
      });

      const executeOperationsSpy = vi.spyOn(opRepo, '_executeOperations');

      const groupedOps = getGroupedOp();
      opRepo._enqueue(groupedOps[0]);
      opRepo._enqueue(groupedOps[1]);

      expect(mockOperationModelStore._list()).toEqual([groupedOps[0], groupedOps[1]]);

      await executeOps(opRepo);
      expect(executeOperationsSpy).toHaveBeenCalledOnce();

      // operation should be removed from the model store
      expect(mockOperationModelStore._list()).toEqual([groupedOps[1]]);

      // group operations will be added to the queue except for the first/starting item
      expect(opRepo._queue).toEqual([
        {
          operation: groupedOps[1],
          bucket: 0,
          retries: 0,
        },
      ]);
    });

    test('can handle fail retry operation and delay next execution', async () => {
      executeFn.mockResolvedValueOnce({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 30,
      });

      const groupedOps = getGroupedOp();
      opRepo._enqueue(groupedOps[0]);
      opRepo._enqueue(groupedOps[1]);
      await executeOps(opRepo);

      // operations will be added back to the front of the queue
      expect(opRepo._queue).toEqual([
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

      // should delay for retryAfterSeconds (30s = 30000ms)
      expect(delaySpy).toHaveBeenCalledWith(30000);
    });

    test('can handle fail pause op repo operation', async () => {
      executeFn.mockResolvedValueOnce({
        _result: ExecutionResult._FailPauseOpRepo,
      });

      const groupedOps = getGroupedOp();
      opRepo._enqueue(groupedOps[0]);
      opRepo._enqueue(groupedOps[1]);

      // simulate a started op repo so we can verify _pause clears the timer
      opRepo._timerID = setInterval(() => {}, 100_000);
      expect(opRepo._timerID).not.toBe(undefined);

      await executeOps(opRepo);

      // operations will be added back to the front of the queue
      expect(opRepo._queue).toEqual([
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
      expect(opRepo._timerID).toBe(undefined);
    });

    test('can process delay for translations', async () => {
      const idTranslations = {
        '1': '2',
      };
      executeFn.mockResolvedValueOnce({
        _result: ExecutionResult._Success,
        _idTranslations: idTranslations,
      });

      const newOp = new Operation('2', GroupComparisonType._None);
      const opTranslateIdsSpy = vi.spyOn(newOp, '_translateIds');

      opRepo._enqueue(mockOperation);
      opRepo._enqueue(newOp);
      await executeOps(opRepo);

      expect(opTranslateIdsSpy).toHaveBeenCalledWith(idTranslations);
      expect(opRepo._records.has('2')).toBe(true);

      // should delay by OP_REPO_POST_CREATE_DELAY after id translations
      expect(delaySpy).toHaveBeenCalledWith(OP_REPO_POST_CREATE_DELAY);
    });

    test('should process non-groupable operations separately', async () => {
      const executeOperationsSpy = vi.spyOn(opRepo, '_executeOperations');

      const newOp = new Operation('2', GroupComparisonType._None);
      opRepo._enqueue(mockOperation);
      opRepo._enqueue(newOp);
      await executeOps(opRepo);

      // first operation should be processed
      expect(executeOperationsSpy).toHaveBeenCalledExactlyOnceWith([
        {
          operation: mockOperation,
          bucket: 0,
          retries: 0,
        },
      ]);
      expect(opRepo._queue).toEqual([{ operation: newOp, bucket: 0, retries: 0 }]);

      // next operation should be processed
      const ops = opRepo._getNextOps(0);
      if (ops) await opRepo._executeOperations(ops);

      expect(executeOperationsSpy).toHaveBeenNthCalledWith(2, [
        {
          operation: newOp,
          bucket: 0,
          retries: 0,
        },
      ]);
      expect(opRepo._queue).toEqual([]);

      // queue is clear so no more operations to process
      expect(opRepo._getNextOps(0)).toBeNull();
    });
  });
});

const translateIdsFn = vi.fn();
class Operation extends OperationBase<{ value: string }> {
  private __groupComparisonTypeValue: GroupComparisonValue;
  private __createComparisonKey: string;
  private __modifyComparisonKey: string;
  private __applyToRecordId: string;
  private __canStartExecute: boolean;

  constructor(
    value: string,
    groupComparisonTypeValue: GroupComparisonValue = GroupComparisonType._None,
    createComparisonKey = '',
    modifyComparisonKey = '',
    applyToRecordId = '',
    canStartExecute = true,
  ) {
    super('mock-op', APP_ID, ONESIGNAL_ID);
    this.value = value;
    this.__groupComparisonTypeValue = groupComparisonTypeValue;
    this.__createComparisonKey = createComparisonKey;
    this.__modifyComparisonKey = modifyComparisonKey;
    this.__applyToRecordId = applyToRecordId;
    this.__canStartExecute = canStartExecute;
  }

  get value(): string {
    return this._getProperty('value');
  }
  set value(value: string) {
    this._setProperty('value', value);
  }

  get _groupComparisonType(): GroupComparisonValue {
    return this.__groupComparisonTypeValue;
  }

  get _createComparisonKey(): string {
    return this.__createComparisonKey;
  }

  get _modifyComparisonKey(): string {
    return this.__modifyComparisonKey;
  }

  get _applyToRecordId(): string {
    return this.__applyToRecordId;
  }

  set _applyToRecordId(value: string) {
    this.__applyToRecordId = value;
  }

  get _canStartExecute(): boolean {
    return this.__canStartExecute;
  }

  _translateIds() {
    translateIdsFn();
  }
}

const mockOperation = new Operation('1', GroupComparisonType._Create, 'abc', '', '123');
const executeFn: Mock<IOperationExecutor['_execute']> = vi.fn(() =>
  Promise.resolve({
    _result: ExecutionResult._Success,
  }),
);

const mockExecutor: IOperationExecutor = {
  _operations: [mockOperation._name],
  _execute: executeFn,
};
