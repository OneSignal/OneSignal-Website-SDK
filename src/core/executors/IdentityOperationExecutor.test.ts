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
import type { IdentitySchema } from 'src/shared/database/types';
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

  beforeAll(async () => {
    await TestEnvironment.initialize();
  });

  beforeEach(() => {
    setAddAliasResponse();
    setDeleteAliasResponse();

    identityModelStore = OneSignal.coreDirector.identityModelStore;
    newRecordsState = OneSignal.coreDirector.newRecordsState;
    propertiesModelStore = OneSignal.coreDirector.propertiesModelStore;
    subscriptionModelStore = OneSignal.coreDirector.subscriptionModelStore;

    rebuildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionModelStore,
    );
    getRebuildOpsSpy = vi.spyOn(
      rebuildUserService,
      'getRebuildOperationsIfCurrentUser',
    );
  });

  test('should return correct operations (names)', async () => {
    const executor = getExecutor();

    expect(executor.operations).toEqual([
      OPERATION_NAME.SET_ALIAS,
      OPERATION_NAME.DELETE_ALIAS,
    ]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();

    const someOp = new SomeOperation();

    // with invalid ops
    const ops = [setAliasOp, deleteAliasOp, someOp];
    const result = executor.execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation(s)! Attempted operations:\n${JSON.stringify(
        ops,
      )}`,
    );

    // with both set and delete alias ops
    const ops2 = [setAliasOp, deleteAliasOp];
    const result2 = executor.execute(ops2);
    await expect(() => result2).rejects.toThrow(
      `Can't process SetAliasOperation and DeleteAliasOperation at the same time.`,
    );
  });

  test('can execute set alias op', async () => {
    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    const executor = getExecutor();
    const ops = [setAliasOp];
    await executor.execute(ops);

    // should set property for matching onesignalId
    expect(identityModelStore.model.getProperty(label)).toBe(value);
  });

  test('can execute delete alias op', async () => {
    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    updateIdentityModel(label as keyof IdentitySchema, value);

    const executor = getExecutor();

    const ops = [deleteAliasOp];
    await executor.execute(ops);

    // should delete property for matching onesignalId
    expect(identityModelStore.model.getProperty(label)).toBeUndefined();
  });

  describe('Errors', () => {
    test('should handle setAlias errors', async () => {
      const executor = getExecutor();
      const ops = [setAliasOp];

      // Retryable
      setAddAliasError({ status: 429, retryAfter: 10 });
      const res = await executor.execute(ops);
      expect(res.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res.retryAfterSeconds).toBe(10);

      // Invalid
      setAddAliasError({ status: 400 });
      const res2 = await executor.execute(ops);
      expect(res2.result).toBe(ExecutionResult.FAIL_NORETRY);

      // Conflict
      setAddAliasError({ status: 409, retryAfter: 5 });
      const res3 = await executor.execute(ops);
      expect(res3.result).toBe(ExecutionResult.FAIL_CONFLICT);
      expect(res3.retryAfterSeconds).toBe(5);

      // Unauthorized
      setAddAliasError({ status: 401, retryAfter: 15 });
      const res4 = await executor.execute(ops);
      expect(res4.result).toBe(ExecutionResult.FAIL_UNAUTHORIZED);
      expect(res4.retryAfterSeconds).toBe(15);

      // Missing
      setAddAliasError({ status: 410 });
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res5 = await executor.execute(ops);

      // no rebuild ops
      updateIdentityModel('onesignal_id', undefined);
      expect(res5.result).toBe(ExecutionResult.FAIL_NORETRY);
      expect(res5.retryAfterSeconds).toBeUndefined();

      // with rebuild ops
      identityModelStore.model.onesignalId = ONESIGNAL_ID;
      const res7 = await executor.execute(ops);
      expect(res7.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res7.retryAfterSeconds).toBeUndefined();
      expect(res7.operations).toMatchObject([
        {
          name: 'login-user',
          appId: APP_ID,
          onesignalId: ONESIGNAL_ID,
        },
        {
          name: 'refresh-user',
          appId: APP_ID,
          onesignalId: ONESIGNAL_ID,
        },
      ]);

      // in missing retry window
      newRecordsState.add(ONESIGNAL_ID);
      setAddAliasError({ status: 404, retryAfter: 20 });
      const res6 = await executor.execute(ops);
      expect(res6.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res6.retryAfterSeconds).toBe(20);
    });

    test('should handle deleteAlias errors', async () => {
      const executor = getExecutor();
      const ops = [deleteAliasOp];

      // Retryable
      setDeleteAliasError({ status: 429, retryAfter: 10 });
      const res = await executor.execute(ops);
      expect(res.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res.retryAfterSeconds).toBe(10);

      // Invalid
      setDeleteAliasError({ status: 400 });
      const res2 = await executor.execute(ops);
      expect(res2.result).toBe(ExecutionResult.FAIL_NORETRY);

      // Conflict
      setDeleteAliasError({ status: 409, retryAfter: 5 });
      const res3 = await executor.execute(ops);
      expect(res3.result).toBe(ExecutionResult.SUCCESS);

      // Unauthorized
      setDeleteAliasError({ status: 401, retryAfter: 15 });
      const res4 = await executor.execute(ops);
      expect(res4.result).toBe(ExecutionResult.FAIL_UNAUTHORIZED);
      expect(res4.retryAfterSeconds).toBe(15);

      // Missing
      setDeleteAliasError({ status: 410 });
      const res5 = await executor.execute(ops);
      expect(res5.result).toBe(ExecutionResult.SUCCESS);

      // in missing retry window
      newRecordsState.add(ONESIGNAL_ID);
      setDeleteAliasError({ status: 404, retryAfter: 20 });
      const res6 = await executor.execute(ops);
      expect(res6.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res6.retryAfterSeconds).toBe(20);
    });
  });
});
