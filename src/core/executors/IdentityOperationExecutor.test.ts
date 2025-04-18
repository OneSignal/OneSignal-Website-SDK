import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { IdentityConstants } from 'src/types/backend';
import { ExecutionResult } from 'src/types/operation';
import { IPreferencesService } from 'src/types/preferences';
import { IRebuildUserService } from 'src/types/user';
import { IdentityModelStore } from '../models/IdentityModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { GroupComparisonType, Operation } from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { IdentityOperationExecutor } from './IdentityOperationExecutor';
import { OPERATION_NAME } from './constants';

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

const identityUri = `**/api/v1/apps/*/users/by/onesignal_id/*/identity`;
const deleteAliasUri = `${identityUri}/*`;

describe('IdentityOperationExecutor', () => {
  const getExecutor = () => {
    return new IdentityOperationExecutor(
      identityModelStore,
      new BuildUserService(),
      newRecordsState,
    );
  };

  beforeEach(() => {
    server.use(
      // set alias api
      http.patch(identityUri, () => HttpResponse.json({})),
      // delete alias api
      http.delete(deleteAliasUri, () => HttpResponse.json({})),
    );

    identityModelStore = new IdentityModelStore(new MockPreferencesService());
    newRecordsState = new NewRecordsState();
    getValueFn.mockReturnValue('{}');
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
    const setAliasError = (
      uri: string,
      method: 'patch' | 'delete',
      status: number,
      retryAfter?: number,
    ) => {
      server.use(
        http[method](uri, () =>
          HttpResponse.json(
            {},
            {
              status,
              headers: retryAfter
                ? { 'Retry-After': retryAfter?.toString() }
                : undefined,
            },
          ),
        ),
      );
    };

    const setAddAliasError = (status: number, retryAfter?: number) =>
      setAliasError(identityUri, 'patch', status, retryAfter);

    const setDeleteAliasError = (status: number, retryAfter?: number) =>
      setAliasError(deleteAliasUri, 'delete', status, retryAfter);

    test('should handle setAlias errors', async () => {
      const executor = getExecutor();
      const ops = [setAliasOp];

      // Retryable
      setAddAliasError(429, 10);
      const res = await executor.execute(ops);
      expect(res.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res.retryAfterSeconds).toBe(10);

      // Invalid
      setAddAliasError(400);
      const res2 = await executor.execute(ops);
      expect(res2.result).toBe(ExecutionResult.FAIL_NORETRY);

      // Conflict
      setAddAliasError(409, 5);
      const res3 = await executor.execute(ops);
      expect(res3.result).toBe(ExecutionResult.FAIL_CONFLICT);
      expect(res3.retryAfterSeconds).toBe(5);

      // Unauthorized
      setAddAliasError(401, 15);
      const res4 = await executor.execute(ops);
      expect(res4.result).toBe(ExecutionResult.FAIL_UNAUTHORIZED);
      expect(res4.retryAfterSeconds).toBe(15);

      // Missing
      setAddAliasError(410);
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
      setAddAliasError(404, 20);
      const res6 = await executor.execute(ops);
      expect(res6.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res6.retryAfterSeconds).toBe(20);
    });

    test('should handle deleteAlias errors', async () => {
      const executor = getExecutor();
      const ops = [deleteAliasOp];

      // Retryable
      setDeleteAliasError(429, 10);
      const res = await executor.execute(ops);
      expect(res.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res.retryAfterSeconds).toBe(10);

      // Invalid
      setDeleteAliasError(400);
      const res2 = await executor.execute(ops);
      expect(res2.result).toBe(ExecutionResult.FAIL_NORETRY);

      // Conflict
      setDeleteAliasError(409, 5);
      const res3 = await executor.execute(ops);
      expect(res3.result).toBe(ExecutionResult.SUCCESS);

      // Unauthorized
      setDeleteAliasError(401, 15);
      const res4 = await executor.execute(ops);
      expect(res4.result).toBe(ExecutionResult.FAIL_UNAUTHORIZED);
      expect(res4.retryAfterSeconds).toBe(15);

      // Missing
      setDeleteAliasError(410);
      const res5 = await executor.execute(ops);
      expect(res5.result).toBe(ExecutionResult.SUCCESS);

      // in missing retry window
      newRecordsState.add(DUMMY_ONESIGNAL_ID);
      setDeleteAliasError(404, 20);
      const res6 = await executor.execute(ops);
      expect(res6.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(res6.retryAfterSeconds).toBe(20);
    });
  });
});

// TODO: Revisit after implementing IdentityBackendService
const getValueFn = vi.fn().mockReturnValue('{}');
const setValueFn = vi.fn();
class MockPreferencesService implements IPreferencesService {
  getValue(...args: any[]) {
    return getValueFn(...args);
  }
  setValue(...args: any[]) {
    return setValueFn(...args);
  }
}
// TODO: Revisit after implementing BuildUserService
const getRebuildOpsFn = vi.fn();
class BuildUserService implements IRebuildUserService {
  getRebuildOperationsIfCurrentUser(...args: any[]) {
    return getRebuildOpsFn(...args);
  }
}

class SomeOperation extends Operation {
  constructor() {
    super('some-operation');
  }

  get applyToRecordId() {
    return '';
  }

  get createComparisonKey() {
    return '';
  }

  get modifyComparisonKey() {
    return '';
  }

  get groupComparisonType() {
    return GroupComparisonType.CREATE;
  }

  get canStartExecute() {
    return true;
  }
}
