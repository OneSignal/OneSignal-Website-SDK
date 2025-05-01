import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import {
  BuildUserService,
  getRebuildOpsFn,
  SomeOperation,
} from '__test__/support/helpers/executors';
import {
  setAddAliasError,
  setAddAliasResponse,
  setDeleteAliasError,
  setDeleteAliasResponse,
} from '__test__/support/helpers/requests';
import { ExecutionResult } from 'src/core/types/operation';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { IdentityOperationExecutor } from './IdentityOperationExecutor';

const label = 'test-label';
const value = 'test-value';
const setAliasOp = new SetAliasOperation(
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  label,
  value,
);
const deleteAliasOp = new DeleteAliasOperation(
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  label,
);

let identityModelStore: IdentityModelStore;
let newRecordsState: NewRecordsState;

describe('IdentityOperationExecutor', () => {
  const getExecutor = () => {
    return new IdentityOperationExecutor(
      identityModelStore,
      new BuildUserService(),
      newRecordsState,
    );
  };

  beforeEach(() => {
    setAddAliasResponse();
    setDeleteAliasResponse();
    identityModelStore = new IdentityModelStore();
    newRecordsState = new NewRecordsState();
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
    identityModelStore.model.setProperty(
      IdentityConstants.ONESIGNAL_ID,
      DUMMY_ONESIGNAL_ID,
    );
    const executor = getExecutor();
    const ops = [setAliasOp];
    await executor.execute(ops);

    // should set property for matching onesignalId
    expect(identityModelStore.model.getProperty(label)).toBe(value);
  });

  test('can execute delete alias op', async () => {
    identityModelStore.model.setProperty(
      IdentityConstants.ONESIGNAL_ID,
      DUMMY_ONESIGNAL_ID,
    );
    identityModelStore.model.setProperty(label, value);

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
      const res5 = await executor.execute(ops);

      // no rebuild ops
      expect(res5.result).toBe(ExecutionResult.FAIL_NORETRY);
      expect(res5.retryAfterSeconds).toBeUndefined();

      // with rebuild ops
      const op = new SomeOperation();
      getRebuildOpsFn.mockReturnValue([op]);
      const res7 = await executor.execute(ops);
      expect(res7.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res7.retryAfterSeconds).toBeUndefined();
      expect(res7.operations).toEqual([op]);

      // in missing retry window
      newRecordsState.add(DUMMY_ONESIGNAL_ID);
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
      newRecordsState.add(DUMMY_ONESIGNAL_ID);
      setDeleteAliasError({ status: 404, retryAfter: 20 });
      const res6 = await executor.execute(ops);
      expect(res6.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res6.retryAfterSeconds).toBe(20);
    });
  });
});
