import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import {
  BuildUserService,
  getRebuildOpsFn,
  MockPreferencesService,
  SomeOperation,
} from '__test__/support/helpers/executors';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { SubscriptionStateKind } from 'src/shared/models/SubscriptionStateKind';
import { OPERATION_NAME } from '../constants';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { ConfigModelStore } from '../modelStores/ConfigModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { RequestService } from '../requestService/RequestService';
import { SubscriptionType } from '../types/api';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult } from '../types/operation';
import { SubscriptionOperationExecutor } from './SubscriptionOperationExecutor';

let preferencesService: MockPreferencesService;
let subscriptionModelStore: SubscriptionModelStore;
let configModelStore: ConfigModelStore;
let newRecordsState: NewRecordsState;
let buildUserService: BuildUserService;

const DUMMY_SUBSCRIPTION_ID = 'test-subscription-id';
const BACKEND_SUBSCRIPTION_ID = 'backend-subscription-id';

vi.mock('src/shared/libraries/Log');

describe('SubscriptionOperationExecutor', () => {
  beforeEach(() => {
    preferencesService = new MockPreferencesService();
    subscriptionModelStore = new SubscriptionModelStore(preferencesService);
    configModelStore = new ConfigModelStore(preferencesService);
    newRecordsState = new NewRecordsState();
    buildUserService = new BuildUserService();
  });

  const getExecutor = () => {
    return new SubscriptionOperationExecutor(
      subscriptionModelStore,
      configModelStore,
      buildUserService,
      newRecordsState,
    );
  };

  test('should return correct operations (names)', () => {
    const executor = getExecutor();
    expect(executor.operations).toEqual([
      OPERATION_NAME.CREATE_SUBSCRIPTION,
      OPERATION_NAME.UPDATE_SUBSCRIPTION,
      OPERATION_NAME.DELETE_SUBSCRIPTION,
      OPERATION_NAME.TRANSFER_SUBSCRIPTION,
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

  describe('CreateSubscriptionOperation', () => {
    beforeEach(() => {
      setCreateSubscriptionResponse();
    });

    test('should create subscription successfully', async () => {
      const model = new SubscriptionModel();
      model.setProperty('id', DUMMY_SUBSCRIPTION_ID, ModelChangeTags.HYDRATE);
      subscriptionModelStore.add(model);

      setCreateSubscriptionResponse(BACKEND_SUBSCRIPTION_ID);
      configModelStore.model.pushSubscriptionId = DUMMY_SUBSCRIPTION_ID;

      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: SubscriptionStateKind.Subscribed,
      });

      const result = await executor.execute([createOp]);
      expect(result).toMatchObject({
        result: ExecutionResult.SUCCESS,
        idTranslations: {
          [DUMMY_SUBSCRIPTION_ID]: BACKEND_SUBSCRIPTION_ID,
        },
      });

      // Verify models were updated
      expect(configModelStore.model.pushSubscriptionId).toBe(
        BACKEND_SUBSCRIPTION_ID,
      );
      const subscriptionModel = subscriptionModelStore.get(
        BACKEND_SUBSCRIPTION_ID,
      );
      expect(subscriptionModel).toBeDefined();
    });

    test('should handle create with update operations', async () => {
      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'old-token',
        enabled: true,
        notification_types: SubscriptionStateKind.Subscribed,
      });

      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.Email,
        token: 'new-token',
        enabled: false,
        notification_types: SubscriptionStateKind.UserOptedOut,
      });

      const result = await executor.execute([createOp, updateOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      expect(createSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          type: SubscriptionType.ChromePush,
          enabled: false,
          token: 'new-token',
          notification_types: SubscriptionStateKind.UserOptedOut,
        },
      });
    });

    test('should handle create and delete operations by succeeding immediately', async () => {
      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: SubscriptionStateKind.Subscribed,
      });

      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      const result = await executor.execute([createOp, deleteOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      // API should not have been called
      expect(createSubscriptionFn).not.toHaveBeenCalled();
    });
  });

  describe('UpdateSubscriptionOperation', () => {
    beforeEach(() => {
      setUpdateSubscriptionResponse();
    });

    test('should update subscription successfully', async () => {
      const executor = getExecutor();
      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'updated-token',
        enabled: false,
        notification_types: SubscriptionStateKind.UserOptedOut,
      });

      const result = await executor.execute([updateOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      expect(updateSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          type: SubscriptionType.ChromePush,
          enabled: false,
          token: 'updated-token',
          notification_types: SubscriptionStateKind.UserOptedOut,
        },
      });
    });

    test('should handle multiple update operations by using the last one', async () => {
      const executor = getExecutor();
      const updateOp1 = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'first-update',
        enabled: true,
        notification_types: SubscriptionStateKind.Subscribed,
      });

      const updateOp2 = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'second-update',
        enabled: false,
        notification_types: SubscriptionStateKind.UserOptedOut,
      });

      const result = await executor.execute([updateOp1, updateOp2]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      // Verify only the last update was used
      expect(updateSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          type: SubscriptionType.ChromePush,
          enabled: false,
          token: 'second-update',
          notification_types: SubscriptionStateKind.UserOptedOut,
        },
      });
    });

    test('should handle 404 with record in retry window', async () => {
      newRecordsState.add(DUMMY_SUBSCRIPTION_ID);
      setUpdateSubscriptionError(404, 10);

      const executor = getExecutor();
      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: SubscriptionStateKind.Subscribed,
      });

      const result = await executor.execute([updateOp]);
      expect(result.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(result.retryAfterSeconds).toBe(10);
    });

    test('should convert to create operation on 404', async () => {
      setUpdateSubscriptionError(404);

      const executor = getExecutor();
      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: SubscriptionStateKind.Subscribed,
      });

      const result = await executor.execute([updateOp]);
      expect(result.result).toBe(ExecutionResult.FAIL_NORETRY);
      expect(result.operations?.length).toBe(1);
      expect(result.operations?.[0]).toBeInstanceOf(
        CreateSubscriptionOperation,
      );
    });
  });

  describe('DeleteSubscriptionOperation', () => {
    beforeEach(() => {
      setDeleteSubscriptionResponse();

      // Set up a subscription model to be deleted
      const model = subscriptionModelStore.create(DUMMY_SUBSCRIPTION_ID);
      model.setProperty('id', DUMMY_SUBSCRIPTION_ID, ModelChangeTags.HYDRATE);
    });

    test('should delete subscription successfully', async () => {
      const executor = getExecutor();
      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      const result = await executor.execute([deleteOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      // Verify model was removed
      expect(subscriptionModelStore.get(DUMMY_SUBSCRIPTION_ID)).toBeUndefined();
    });

    test('should handle 404 as success', async () => {
      setDeleteSubscriptionError(404);

      const executor = getExecutor();
      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      const result = await executor.execute([deleteOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
    });

    test('should handle 404 with record in retry window', async () => {
      newRecordsState.add(DUMMY_SUBSCRIPTION_ID);
      setDeleteSubscriptionError(404, 5);

      const executor = getExecutor();
      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      const result = await executor.execute([deleteOp]);
      expect(result.result).toBe(ExecutionResult.FAIL_RETRY);
      expect(result.retryAfterSeconds).toBe(5);
    });

    test('should not allow multiple operations with delete', async () => {
      const executor = getExecutor();
      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );
      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        token: 'test',
        type: SubscriptionType.ChromePush,
      });

      const result = executor.execute([deleteOp, updateOp]);
      await expect(() => result).rejects.toThrow(
        'Only supports one operation! Attempted operations:',
      );
    });
  });

  describe('TransferSubscriptionOperation', () => {
    const transferSubscriptionSpy = vi.spyOn(
      RequestService,
      'transferSubscription',
    );

    beforeEach(() => {
      // Mock the RequestService.transferSubscription method
      transferSubscriptionSpy.mockReset();
      transferSubscriptionSpy.mockResolvedValue({
        ok: true,
        status: 200,
        result: {},
      });
    });

    test('should transfer subscription successfully', async () => {
      const executor = getExecutor();
      const transferOp = new TransferSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      const result = await executor.execute([transferOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      // Verify the function was called
      expect(transferSubscriptionSpy).toHaveBeenCalledWith(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        { onesignal_id: DUMMY_ONESIGNAL_ID },
        false,
      );
    });

    test('should not allow multiple operations with transfer', async () => {
      const executor = getExecutor();
      const transferOp = new TransferSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );
      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        token: 'test',
        type: SubscriptionType.ChromePush,
      });

      const result = executor.execute([transferOp, updateOp]);
      await expect(() => result).rejects.toThrow(
        'TransferSubscriptionOperation only supports one operation! Attempted operations:',
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: SubscriptionStateKind.Subscribed,
      });

      // Retryable error
      setCreateSubscriptionError(429, 10);
      const res1 = await executor.execute([createOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // Unauthorized error
      setCreateSubscriptionError(401, 15);
      const res2 = await executor.execute([createOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
        retryAfterSeconds: 15,
      });

      // Missing error without rebuild ops
      setCreateSubscriptionError(404, 5);
      const res3 = await executor.execute([createOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });

      // Missing error with rebuild ops
      const op = new SomeOperation();
      getRebuildOpsFn.mockReturnValue([op]);
      const res4 = await executor.execute([createOp]);
      expect(res4).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 5,
        operations: [op],
      });

      // Missing error in retry window
      newRecordsState.add(DUMMY_ONESIGNAL_ID);
      setCreateSubscriptionError(404, 20);
      const res5 = await executor.execute([createOp]);
      expect(res5).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 20,
      });

      // Other errors
      setCreateSubscriptionError(400);
      const res6 = await executor.execute([createOp]);
      expect(res6).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });
    });
  });
});

const createSubscriptionFn = vi.fn();
const updateSubscriptionFn = vi.fn();
const deleteSubscriptionFn = vi.fn();

const getCreateSubscriptionUri = () =>
  `**/api/v1/apps/${APP_ID}/users/by/onesignal_id/${DUMMY_ONESIGNAL_ID}/subscriptions`;

const getUpdateSubscriptionUri = (subscriptionId = DUMMY_SUBSCRIPTION_ID) =>
  `**/api/v1/apps/${APP_ID}/subscriptions/${subscriptionId}`;

const getDeleteSubscriptionUri = (subscriptionId = DUMMY_SUBSCRIPTION_ID) =>
  `**/api/v1/apps/${APP_ID}/subscriptions/${subscriptionId}`;

const setCreateSubscriptionResponse = (
  subscriptionId = DUMMY_SUBSCRIPTION_ID,
) => {
  server.use(
    http.post(getCreateSubscriptionUri(), async ({ request }) => {
      createSubscriptionFn(await request?.json());
      return HttpResponse.json({
        subscription: {
          id: subscriptionId,
        },
      });
    }),
  );
};

const setUpdateSubscriptionResponse = () => {
  server.use(
    http.patch(getUpdateSubscriptionUri(), async ({ request }) => {
      updateSubscriptionFn(await request?.json());
      return HttpResponse.json({ success: true });
    }),
  );
};

const setDeleteSubscriptionResponse = () => {
  server.use(
    http.delete(getDeleteSubscriptionUri(), () => {
      deleteSubscriptionFn();
      return HttpResponse.json({ success: true });
    }),
  );
};

const setCreateSubscriptionError = (status: number, retryAfter?: number) => {
  server.use(
    http.post(getCreateSubscriptionUri(), () =>
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

const setUpdateSubscriptionError = (status: number, retryAfter?: number) => {
  server.use(
    http.patch(getUpdateSubscriptionUri(), () =>
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

const setDeleteSubscriptionError = (status: number, retryAfter?: number) => {
  server.use(
    http.delete(getDeleteSubscriptionUri(), () =>
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
