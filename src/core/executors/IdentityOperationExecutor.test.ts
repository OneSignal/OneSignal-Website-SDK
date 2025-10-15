import { APP_ID, ONESIGNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SomeOperation } from '__test__/support/helpers/executors';
import {
  setAddAliasError,
  setAddAliasResponse,
  setDeleteAliasError,
  setDeleteAliasResponse,
} from '__test__/support/helpers/requests';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { ExecutionResult } from 'src/core/types/operation';
import type { MockInstance } from 'vitest';
import { OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { IdentityOperationExecutor } from './IdentityOperationExecutor';

const label = 'test-label';
const value = 'test-value';
const setAliasOp = new SetAliasOperation(APP_ID, ONESIGNAL_ID, label, value);
const deleteAliasOp = new DeleteAliasOperation(APP_ID, ONESIGNAL_ID, label);

let identityModelStore: IdentityModelStore;
let newRecordsState: NewRecordsState;
let propertiesModelStore: PropertiesModelStore;
let subscriptionModelStore: SubscriptionModelStore;
let rebuildUserService: RebuildUserService;
let getRebuildOpsSpy: MockInstance;

describe('IdentityOperationExecutor', () => {
  const getExecutor = () => {
    return new IdentityOperationExecutor(
      identityModelStore,
      rebuildUserService,
      newRecordsState,
    );
  };

  beforeAll(() => {
    TestEnvironment.initialize();
  });

  beforeEach(() => {
    setAddAliasResponse();
    setDeleteAliasResponse();

    identityModelStore = OneSignal._coreDirector._identityModelStore;
    newRecordsState = OneSignal._coreDirector._newRecordsState;
    propertiesModelStore = OneSignal._coreDirector._propertiesModelStore;
    subscriptionModelStore = OneSignal._coreDirector._subscriptionModelStore;

    rebuildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionModelStore,
    );
    getRebuildOpsSpy = vi.spyOn(
      rebuildUserService,
      '_getRebuildOperationsIfCurrentUser',
    );
  });

  test('should return correct operations (names)', async () => {
    const executor = getExecutor();

    expect(executor._operations).toEqual([
      OPERATION_NAME._SetAlias,
      OPERATION_NAME._DeleteAlias,
    ]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();

    const someOp = new SomeOperation();

    // with invalid ops
    const ops = [setAliasOp, deleteAliasOp, someOp];
    const result = executor._execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation(s)! Attempted operations:\n${JSON.stringify(
        ops,
      )}`,
    );

    // with both set and delete alias ops
    const ops2 = [setAliasOp, deleteAliasOp];
    const result2 = executor._execute(ops2);
    await expect(() => result2).rejects.toThrow(
      `Can't process SetAliasOperation and DeleteAliasOperation at the same time.`,
    );
  });

  test('can execute set alias op', async () => {
    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    const executor = getExecutor();
    const ops = [setAliasOp];
    await executor._execute(ops);

    // should set property for matching onesignalId
    expect(identityModelStore._model._getProperty(label)).toBe(value);
  });

  test('can execute delete alias op', async () => {
    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    updateIdentityModel(label, value);

    const executor = getExecutor();

    const ops = [deleteAliasOp];
    await executor._execute(ops);

    // should delete property for matching onesignalId
    expect(identityModelStore._model._getProperty(label)).toBeUndefined();
  });

  describe('Errors', () => {
    test('should handle setAlias errors', async () => {
      const executor = getExecutor();
      const ops = [setAliasOp];

      // Retryable
      setAddAliasError({ status: 429, retryAfter: 10 });
      const res = await executor._execute(ops);
      expect(res.result).toBe(ExecutionResult._FailRetry);
      expect(res.retryAfterSeconds).toBe(10);

      // Invalid
      setAddAliasError({ status: 400 });
      const res2 = await executor._execute(ops);
      expect(res2.result).toBe(ExecutionResult._FailNoretry);

      // Conflict
      setAddAliasError({ status: 409, retryAfter: 5 });
      const res3 = await executor._execute(ops);
      expect(res3.result).toBe(ExecutionResult._FailConflict);
      expect(res3.retryAfterSeconds).toBe(5);

      // Unauthorized
      setAddAliasError({ status: 401, retryAfter: 15 });
      const res4 = await executor._execute(ops);
      expect(res4.result).toBe(ExecutionResult._FailUnauthorized);
      expect(res4.retryAfterSeconds).toBe(15);

      // Missing
      setAddAliasError({ status: 410 });
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res5 = await executor._execute(ops);

      // no rebuild ops
      updateIdentityModel('onesignal_id', undefined);
      expect(res5.result).toBe(ExecutionResult._FailNoretry);
      expect(res5.retryAfterSeconds).toBeUndefined();

      // with rebuild ops
      identityModelStore._model._onesignalId = ONESIGNAL_ID;
      const res7 = await executor._execute(ops);
      expect(res7.result).toBe(ExecutionResult._FailRetry);
      expect(res7.retryAfterSeconds).toBeUndefined();
      expect(res7.operations).toMatchObject([
        {
          _name: 'login-user',
          _appId: APP_ID,
          _onesignalId: ONESIGNAL_ID,
        },
        {
          _name: 'refresh-user',
          _appId: APP_ID,
          _onesignalId: ONESIGNAL_ID,
        },
      ]);

      // in missing retry window
      newRecordsState._add(ONESIGNAL_ID);
      setAddAliasError({ status: 404, retryAfter: 20 });
      const res6 = await executor._execute(ops);
      expect(res6.result).toBe(ExecutionResult._FailRetry);
      expect(res6.retryAfterSeconds).toBe(20);
    });

    test('should handle deleteAlias errors', async () => {
      const executor = getExecutor();
      const ops = [deleteAliasOp];

      // Retryable
      setDeleteAliasError({ status: 429, retryAfter: 10 });
      const res = await executor._execute(ops);
      expect(res.result).toBe(ExecutionResult._FailRetry);
      expect(res.retryAfterSeconds).toBe(10);

      // Invalid
      setDeleteAliasError({ status: 400 });
      const res2 = await executor._execute(ops);
      expect(res2.result).toBe(ExecutionResult._FailNoretry);

      // Conflict
      setDeleteAliasError({ status: 409, retryAfter: 5 });
      const res3 = await executor._execute(ops);
      expect(res3.result).toBe(ExecutionResult._Success);

      // Unauthorized
      setDeleteAliasError({ status: 401, retryAfter: 15 });
      const res4 = await executor._execute(ops);
      expect(res4.result).toBe(ExecutionResult._FailUnauthorized);
      expect(res4.retryAfterSeconds).toBe(15);

      // Missing
      setDeleteAliasError({ status: 410 });
      const res5 = await executor._execute(ops);
      expect(res5.result).toBe(ExecutionResult._Success);

      // in missing retry window
      newRecordsState._add(ONESIGNAL_ID);
      setDeleteAliasError({ status: 404, retryAfter: 20 });
      const res6 = await executor._execute(ops);
      expect(res6.result).toBe(ExecutionResult._FailRetry);
      expect(res6.retryAfterSeconds).toBe(20);
    });
  });
});
