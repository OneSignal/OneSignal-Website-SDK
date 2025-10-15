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
    identityModelStore = OneSignal._coreDirector._identityModelStore;
    propertiesModelStore = OneSignal._coreDirector._propertiesModelStore;
    newRecordsState = OneSignal._coreDirector._newRecordsState;
    subscriptionsModelStore = OneSignal._coreDirector._subscriptionModelStore;
    buildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionsModelStore,
    );
    getRebuildOpsSpy = vi.spyOn(
      buildUserService,
      '_getRebuildOperationsIfCurrentUser',
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
    expect(executor._operations).toEqual([OPERATION_NAME._SetProperty]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();
    const someOp = new SomeOperation();
    const ops = [someOp];

    const result = executor._execute(ops);
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

      const result = await executor._execute([setPropertyOp]);
      expect(result._result).toBe(ExecutionResult._Success);
      expect(propertiesModelStore._model._language).toBe('fr');
    });

    test('can set tags', async () => {
      const executor = getExecutor();
      const setPropertyOp = new SetPropertyOperation(
        APP_ID,
        ONESIGNAL_ID,
        'tags',
        { tagA: 'valueA', tagB: 'valueB' },
      );

      const result = await executor._execute([setPropertyOp]);
      expect(result._result).toBe(ExecutionResult._Success);
      expect(propertiesModelStore._model._tags).toEqual({
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
      const res1 = await executor._execute([setTagOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult._FailRetry,
        retryAfterSeconds: 10,
      });

      // Unauthorized error
      setUpdateUserError({ status: 401, retryAfter: 15 });
      const res2 = await executor._execute([setTagOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult._FailUnauthorized,
        retryAfterSeconds: 15,
      });

      // Missing error without rebuild ops
      setUpdateUserError({ status: 404, retryAfter: 5 });
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res3 = await executor._execute([setTagOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult._FailNoretry,
      });

      // Missing error with rebuild ops
      const res4 = await executor._execute([setTagOp]);
      expect(res4).toMatchObject({
        result: ExecutionResult._FailRetry,
        retryAfterSeconds: 5,
        operations: [
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
        ],
      });

      // Missing error in retry window
      newRecordsState._add(ONESIGNAL_ID);
      setUpdateUserError({ status: 404, retryAfter: 20 });
      const res5 = await executor._execute([setTagOp]);
      expect(res5).toMatchObject({
        result: ExecutionResult._FailRetry,
        retryAfterSeconds: 20,
      });

      // Other errors
      setUpdateUserError({ status: 400 });
      const res6 = await executor._execute([setTagOp]);
      expect(res6).toMatchObject({
        result: ExecutionResult._FailNoretry,
      });
    });
  });
});
