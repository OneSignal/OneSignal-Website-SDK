import { APP_ID, ONESIGNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SomeOperation } from '__test__/support/helpers/executors';
import {
  setUpdateUserError,
  setUpdateUserResponse,
} from '__test__/support/helpers/requests';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { type MockInstance } from 'vitest';
import { OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { ExecutionResult } from '../types/operation';
import { UpdateUserOperationExecutor } from './UpdateUserOperationExecutor';

let identityModelStore: IdentityModelStore;
let propertiesModelStore: PropertiesModelStore;
let newRecordsState: NewRecordsState;
let buildUserService: RebuildUserService;
let subscriptionsModelStore: SubscriptionModelStore;
let getRebuildOpsSpy: MockInstance;

vi.mock('src/shared/libraries/Log');

describe('UpdateUserOperationExecutor', () => {
  beforeAll(() => {
    TestEnvironment.initialize();
  });

  beforeEach(() => {
    identityModelStore = OneSignal.coreDirector.identityModelStore;
    propertiesModelStore = OneSignal.coreDirector.propertiesModelStore;
    newRecordsState = OneSignal.coreDirector.newRecordsState;
    subscriptionsModelStore = OneSignal.coreDirector.subscriptionModelStore;
    buildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionsModelStore,
    );
    getRebuildOpsSpy = vi.spyOn(
      buildUserService,
      'getRebuildOperationsIfCurrentUser',
    );

    // Set up initial model state
    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
  });

  const getExecutor = () => {
    return new UpdateUserOperationExecutor(
      identityModelStore,
      propertiesModelStore,
      buildUserService,
      newRecordsState,
    );
  };

  test('should return correct operations (names)', () => {
    const executor = getExecutor();
    expect(executor.operations).toEqual([OPERATION_NAME.SET_PROPERTY]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();
    const someOp = new SomeOperation();
    const ops = [someOp];

    const result = executor.execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation: ${ops[0]}`,
    );
  });

  describe('SetPropertyOperation', () => {
    beforeEach(() => {
      setUpdateUserResponse();
    });

    test('should update property in properties model on success', async () => {
      const executor = getExecutor();
      const setPropertyOp = new SetPropertyOperation(
        APP_ID,
        ONESIGNAL_ID,
        'language',
        'fr',
      );

      const result = await executor.execute([setPropertyOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.language).toBe('fr');
    });

    test('can set tags', async () => {
      const executor = getExecutor();
      const setPropertyOp = new SetPropertyOperation(
        APP_ID,
        ONESIGNAL_ID,
        'tags',
        { tagA: 'valueA', tagB: 'valueB' },
      );

      const result = await executor.execute([setPropertyOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.tags).toEqual({
        tagA: 'valueA',
        tagB: 'valueB',
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const executor = getExecutor();
      const setTagOp = new SetPropertyOperation(APP_ID, ONESIGNAL_ID, 'tags', {
        test_tag: 'test_value',
      });

      // Retryable error
      setUpdateUserError({ status: 429, retryAfter: 10 });
      const res1 = await executor.execute([setTagOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // Unauthorized error
      setUpdateUserError({ status: 401, retryAfter: 15 });
      const res2 = await executor.execute([setTagOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
        retryAfterSeconds: 15,
      });

      // Missing error without rebuild ops
      setUpdateUserError({ status: 404, retryAfter: 5 });
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res3 = await executor.execute([setTagOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });

      // Missing error with rebuild ops
      const res4 = await executor.execute([setTagOp]);
      expect(res4).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 5,
        operations: [
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
        ],
      });

      // Missing error in retry window
      newRecordsState.add(ONESIGNAL_ID);
      setUpdateUserError({ status: 404, retryAfter: 20 });
      const res5 = await executor.execute([setTagOp]);
      expect(res5).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 20,
      });

      // Other errors
      setUpdateUserError({ status: 400 });
      const res6 = await executor.execute([setTagOp]);
      expect(res6).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });
    });
  });
});
