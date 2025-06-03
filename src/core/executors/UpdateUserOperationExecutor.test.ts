import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import { SomeOperation } from '__test__/support/helpers/executors';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { MockInstance } from 'vitest';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteTagOperation } from '../operations/DeleteTagOperation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { SetTagOperation } from '../operations/SetTagOperation';
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
  beforeEach(() => {
    identityModelStore = new IdentityModelStore();
    propertiesModelStore = new PropertiesModelStore();
    newRecordsState = new NewRecordsState();

    subscriptionsModelStore = new SubscriptionModelStore();
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
    identityModelStore.model.setProperty(
      IdentityConstants.ONESIGNAL_ID,
      DUMMY_ONESIGNAL_ID,
    );
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
    expect(executor.operations).toEqual([
      OPERATION_NAME.SET_TAG,
      OPERATION_NAME.DELETE_TAG,
      OPERATION_NAME.SET_PROPERTY,
    ]);
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

  describe('SetTagOperation', () => {
    beforeEach(() => {
      setUpdateUserResponse();
    });

    test('should update tags in properties model on success', async () => {
      propertiesModelStore.model.setProperty('tags', {
        some_tag: 'some_value',
      });

      const executor = getExecutor();
      const setTagOp = new SetTagOperation(APP_ID, DUMMY_ONESIGNAL_ID, 'tags', {
        some_tag: 'some_value',
        test_tag: 'test_value',
      });

      const result = await executor.execute([setTagOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.tags).toEqual({
        some_tag: 'some_value',
        test_tag: 'test_value',
      });
    });

    test('should handle multiple tag operations', async () => {
      const executor = getExecutor();
      const setTagOp1 = new SetTagOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        'tags',
        { tag1: 'value1' },
      );
      const setTagOp2 = new SetTagOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        'tags',
        { tag2: 'value2' },
      );

      const result = await executor.execute([setTagOp1, setTagOp2]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.tags).toEqual({
        tag2: 'value2',
      });
    });

    test('should not update model if onesignalId differs', async () => {
      const differentId = 'different-id';
      setUpdateUserResponse(differentId);

      const executor = getExecutor();
      const setTagOp = new SetTagOperation(
        APP_ID,
        differentId,
        'test_tag',
        'test_value',
      );

      const result = await executor.execute([setTagOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.tags).toEqual({});
    });
  });

  describe('DeleteTagOperation', () => {
    beforeEach(() => {
      propertiesModelStore.model.setProperty('tags', {
        existing_tag: 'existing_value',
      });
      setUpdateUserResponse();
    });

    test('should remove tag from properties model on success', async () => {
      const executor = getExecutor();
      const deleteTagOp = new DeleteTagOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        'existing_tag',
      );

      const result = await executor.execute([deleteTagOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.tags).toEqual({});
    });
  });

  describe('SetPropertyOperation', () => {
    beforeEach(() => {
      setUpdateUserResponse();
    });

    test('should update property in properties model on success', async () => {
      const executor = getExecutor();
      const setPropertyOp = new SetPropertyOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        'language',
        'fr',
      );

      const result = await executor.execute([setPropertyOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.language).toBe('fr');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const executor = getExecutor();
      const setTagOp = new SetTagOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        'test_tag',
        'test_value',
      );

      // Retryable error
      setUpdateUserError(429, 10);
      const res1 = await executor.execute([setTagOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // Unauthorized error
      setUpdateUserError(401, 15);
      const res2 = await executor.execute([setTagOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
        retryAfterSeconds: 15,
      });

      // Missing error without rebuild ops
      setUpdateUserError(404, 5);
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
            onesignalId: DUMMY_ONESIGNAL_ID,
          },
          {
            name: 'refresh-user',
            appId: APP_ID,
            onesignalId: DUMMY_ONESIGNAL_ID,
          },
        ],
      });

      // Missing error in retry window
      newRecordsState.add(DUMMY_ONESIGNAL_ID);
      setUpdateUserError(404, 20);
      const res5 = await executor.execute([setTagOp]);
      expect(res5).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 20,
      });

      // Other errors
      setUpdateUserError(400);
      const res6 = await executor.execute([setTagOp]);
      expect(res6).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });
    });
  });
});

const updateUserFn = vi.fn();

const getUpdateUserUri = (onesignalId = DUMMY_ONESIGNAL_ID) =>
  `**/api/v1/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}`;

const setUpdateUserResponse = (onesignalId?: string) => {
  server.use(
    http.patch(getUpdateUserUri(onesignalId), async ({ request }) => {
      updateUserFn(await request?.json());
      return HttpResponse.json({ success: true });
    }),
  );
};

const setUpdateUserError = (status: number, retryAfter?: number) => {
  server.use(
    http.patch(getUpdateUserUri(), () =>
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
