import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID_3,
} from '__test__/constants';
import { createPushSub } from '__test__/support/environment/TestEnvironmentHelpers';
import { SomeOperation } from '__test__/support/helpers/executors';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import Database from 'src/shared/services/Database';
import {
  NotificationType,
  SubscriptionType,
} from 'src/shared/subscriptions/constants';
import type { MockInstance } from 'vitest';
import { OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult } from '../types/operation';
import { SubscriptionOperationExecutor } from './SubscriptionOperationExecutor';

let subscriptionModelStore: SubscriptionModelStore;
let newRecordsState: NewRecordsState;
let buildUserService: RebuildUserService;
let identityModelStore: IdentityModelStore;
let propertiesModelStore: PropertiesModelStore;
let subscriptionsModelStore: SubscriptionModelStore;
let getRebuildOpsSpy: MockInstance;

const DUMMY_SUBSCRIPTION_ID = 'test-subscription-id';
const BACKEND_SUBSCRIPTION_ID = 'backend-subscription-id';

vi.mock('src/shared/libraries/Log');

const pushSubscription = createPushSub();

describe('SubscriptionOperationExecutor', () => {
  beforeEach(async () => {
    subscriptionModelStore = new SubscriptionModelStore();
    newRecordsState = new NewRecordsState();

    identityModelStore = new IdentityModelStore();
    propertiesModelStore = new PropertiesModelStore();
    subscriptionsModelStore = new SubscriptionModelStore();

    identityModelStore.model.onesignalId = DUMMY_ONESIGNAL_ID;
    buildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionsModelStore,
    );
    getRebuildOpsSpy = vi.spyOn(
      buildUserService,
      'getRebuildOperationsIfCurrentUser',
    );
  });

  afterEach(async () => {
    await Database.remove('subscriptions');
  });

  const getExecutor = () => {
    return new SubscriptionOperationExecutor(
      subscriptionModelStore,
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

    const res1 = executor.execute(ops);
    await expect(() => res1).rejects.toThrow(
      `Unrecognized operation: ${ops[0]}`,
    );

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

    const res2 = executor.execute([deleteOp, updateOp]);
    await expect(() => res2).rejects.toThrow(
      'Only supports one operation! Attempted operations:',
    );

    const transferOp = new TransferSubscriptionOperation(
      APP_ID,
      DUMMY_ONESIGNAL_ID,
      DUMMY_SUBSCRIPTION_ID,
    );
    const res3 = executor.execute([transferOp, updateOp]);
    await expect(() => res3).rejects.toThrow(
      'TransferSubscriptionOperation only supports one operation! Attempted operations:',
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
      await Database.setPushId(DUMMY_SUBSCRIPTION_ID);

      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: NotificationType.Subscribed,
      });

      const result = await executor.execute([createOp]);
      expect(result).toMatchObject({
        result: ExecutionResult.SUCCESS,
        idTranslations: {
          [DUMMY_SUBSCRIPTION_ID]: BACKEND_SUBSCRIPTION_ID,
        },
      });

      // Verify models were updated
      await expect(Database.getPushId()).resolves.toBe(BACKEND_SUBSCRIPTION_ID);
      const subscriptionModel = subscriptionModelStore.getBySubscriptionId(
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
        notification_types: NotificationType.Subscribed,
      });

      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.Email,
        token: 'new-token',
        enabled: false,
        notification_types: NotificationType.UserOptedOut,
      });

      const result = await executor.execute([createOp, updateOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      expect(createSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          enabled: false,
          notification_types: NotificationType.UserOptedOut,
          token: 'new-token',
          sdk: __VERSION__,
          type: SubscriptionType.ChromePush,
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
        notification_types: NotificationType.Subscribed,
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

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: NotificationType.Subscribed,
      });

      // Retryable error
      setCreateSubscriptionError(429, 10);
      const res1 = await executor.execute([createOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // Conflict error
      setCreateSubscriptionError(400, 10);
      const res2 = await executor.execute([createOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });

      // Invalid error
      setCreateSubscriptionError(409, 10);
      const res3 = await executor.execute([createOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });

      // Unauthorized error
      setCreateSubscriptionError(401, 15);
      const res4 = await executor.execute([createOp]);
      expect(res4).toMatchObject({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
        retryAfterSeconds: 15,
      });

      // Missing error without rebuild ops
      setCreateSubscriptionError(404, 5);
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res5 = await executor.execute([createOp]);

      expect(res5).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });

      // Missing error with rebuild ops
      subscriptionsModelStore.add(pushSubscription);
      await Database.setPushId(DUMMY_SUBSCRIPTION_ID_3);

      const res6 = await executor.execute([createOp]);
      expect(res6).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 5,
        operations: [
          {
            name: 'login-user',
            appId: APP_ID,
            onesignalId: DUMMY_ONESIGNAL_ID,
          },
          {
            name: 'create-subscription',
            appId: APP_ID,
            onesignalId: DUMMY_ONESIGNAL_ID,
            type: SubscriptionType.ChromePush,
            token: 'push-token',
            enabled: true,
            subscriptionId: DUMMY_SUBSCRIPTION_ID_3,
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
      setCreateSubscriptionError(404, 20);
      const res7 = await executor.execute([createOp]);
      expect(res7).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 20,
      });

      // Other errors
      setCreateSubscriptionError(400);
      const res8 = await executor.execute([createOp]);
      expect(res8).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });
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
        notification_types: NotificationType.UserOptedOut,
        web_auth: 'some-web-auth',
        web_p256: 'some-web-p256',
      });

      const result = await executor.execute([updateOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      expect(updateSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          type: SubscriptionType.ChromePush,
          enabled: false,
          token: 'updated-token',
          notification_types: NotificationType.UserOptedOut,
          web_auth: 'some-web-auth',
          web_p256: 'some-web-p256',
        },
      });
    });

    test('should handle multiple update operations by using the last one', async () => {
      const executor = getExecutor();
      const updateOp1 = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.Email,
        token: 'first-update',
        enabled: true,
        notification_types: NotificationType.Subscribed,
        web_auth: 'some-web-auth',
        web_p256: 'some-web-p256',
      });

      const updateOp2 = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'second-update',
        enabled: false,
        notification_types: NotificationType.UserOptedOut,
        web_auth: 'some-web-auth-2',
        web_p256: 'some-web-p256-2',
      });

      const result = await executor.execute([updateOp1, updateOp2]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      // Verify only the last update was used
      expect(updateSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          type: SubscriptionType.ChromePush,
          enabled: false,
          token: 'second-update',
          notification_types: NotificationType.UserOptedOut,
          web_auth: 'some-web-auth-2',
          web_p256: 'some-web-p256-2',
        },
      });
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        type: SubscriptionType.ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: NotificationType.Subscribed,
      });

      // Retryable error
      setUpdateSubscriptionError(429, 15);
      const res1 = await executor.execute([updateOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 15,
      });

      // Missing error
      setUpdateSubscriptionError(404, 10);
      const res2 = await executor.execute([updateOp]);
      const subOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        enabled: true,
        notification_types: NotificationType.Subscribed,
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptionId: DUMMY_SUBSCRIPTION_ID,
        token: 'test-token',
        type: SubscriptionType.ChromePush,
      });
      subOp.modelId = res2.operations![0].modelId;
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
        operations: [subOp],
      });

      // Missing error with record in retry window
      newRecordsState.add(DUMMY_SUBSCRIPTION_ID);
      const res3 = await executor.execute([updateOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // Other errors
      setUpdateSubscriptionError(400);
      const res4 = await executor.execute([updateOp]);
      expect(res4).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });
    });
  });

  describe('DeleteSubscriptionOperation', () => {
    beforeEach(() => {
      setDeleteSubscriptionResponse();
    });

    test('should delete subscription successfully', async () => {
      // Set up a subscription model to be deleted
      const model = new SubscriptionModel();
      model.setProperty('id', DUMMY_SUBSCRIPTION_ID, ModelChangeTags.HYDRATE);
      subscriptionModelStore.add(model);

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

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      // Missing error
      setDeleteSubscriptionError(404);
      const result = await executor.execute([deleteOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      // Missing error with record in retry window
      newRecordsState.add(DUMMY_SUBSCRIPTION_ID);
      setDeleteSubscriptionError(404, 5);
      const res2 = await executor.execute([deleteOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 5,
      });

      // Retryable error
      setDeleteSubscriptionError(429, 10);
      const res3 = await executor.execute([deleteOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // Other errors
      setDeleteSubscriptionError(400);
      const res4 = await executor.execute([deleteOp]);
      expect(res4).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });
    });
  });

  describe('TransferSubscriptionOperation', () => {
    beforeEach(() => {
      setTransferSubscriptionResponse();
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

      expect(transferSubscriptionFn).toHaveBeenCalledWith({
        identity: {
          onesignal_id: DUMMY_ONESIGNAL_ID,
        },
        retain_previous_owner: false,
      });
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const transferOp = new TransferSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      // Retryable error
      setTransferSubscriptionError(429, 10);
      const res2 = await executor.execute([transferOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // Other errors
      setTransferSubscriptionError(400);
      const res3 = await executor.execute([transferOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
      });
    });
  });
});

const createSubscriptionFn = vi.fn();
const updateSubscriptionFn = vi.fn();
const deleteSubscriptionFn = vi.fn();
const transferSubscriptionFn = vi.fn();

const getCreateSubscriptionUri = () =>
  `**/apps/${APP_ID}/users/by/onesignal_id/${DUMMY_ONESIGNAL_ID}/subscriptions`;
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

const getUpdateSubscriptionUri = (subscriptionId = DUMMY_SUBSCRIPTION_ID) =>
  `**/apps/${APP_ID}/subscriptions/${subscriptionId}`;
const setUpdateSubscriptionResponse = () => {
  server.use(
    http.patch(getUpdateSubscriptionUri(), async ({ request }) => {
      updateSubscriptionFn(await request?.json());
      return HttpResponse.json({ success: true });
    }),
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

const getDeleteSubscriptionUri = (subscriptionId = DUMMY_SUBSCRIPTION_ID) =>
  `**/apps/${APP_ID}/subscriptions/${subscriptionId}`;
const setDeleteSubscriptionResponse = () => {
  server.use(
    http.delete(getDeleteSubscriptionUri(), () => {
      deleteSubscriptionFn();
      return HttpResponse.json({ success: true });
    }),
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

const getTransferSubscriptionUri = () =>
  `**/apps/${APP_ID}/subscriptions/${DUMMY_SUBSCRIPTION_ID}/owner`;
const setTransferSubscriptionResponse = () => {
  server.use(
    http.patch(getTransferSubscriptionUri(), async ({ request }) => {
      transferSubscriptionFn(await request?.json());
      return HttpResponse.json({ success: true });
    }),
  );
};
const setTransferSubscriptionError = (status: number, retryAfter?: number) => {
  server.use(
    http.patch(getTransferSubscriptionUri(), () =>
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
