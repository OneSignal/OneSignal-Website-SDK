import {
  APP_ID,
  DEVICE_OS,
  DUMMY_ONESIGNAL_ID,
  DUMMY_ONESIGNAL_ID_2,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
  DUMMY_SUBSCRIPTION_ID_2,
} from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SomeOperation } from '__test__/support/helpers/executors';
import {
  setGetUserError,
  setGetUserResponse,
  setUpdateSubscriptionResponse,
} from '__test__/support/helpers/requests';
import { clearAll } from 'src/shared/database/client';
import { setPushToken } from 'src/shared/database/subscription';
import {
  NotificationType,
  SubscriptionType,
} from 'src/shared/subscriptions/constants';
import type { MockInstance } from 'vitest';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import type { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult } from '../types/operation';
import { RefreshUserOperationExecutor } from './RefreshUserOperationExecutor';

let identityModelStore: IdentityModelStore;
let propertiesModelStore: PropertiesModelStore;
let subscriptionModelStore: SubscriptionModelStore;
let newRecordsState: NewRecordsState;
let buildUserService: RebuildUserService;
let getRebuildOpsSpy: MockInstance;

vi.mock('src/shared/libraries/Log');

describe('RefreshUserOperationExecutor', () => {
  beforeAll(async () => {
    await TestEnvironment.initialize();
  });

  beforeEach(async () => {
    await clearAll(); // in case subscription model (from previous tests) are loaded from db
    identityModelStore = OneSignal.coreDirector.identityModelStore;
    propertiesModelStore = OneSignal.coreDirector.propertiesModelStore;
    subscriptionModelStore = OneSignal.coreDirector.subscriptionModelStore;
    newRecordsState = OneSignal.coreDirector.newRecordsState;
    buildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionModelStore,
    );
    getRebuildOpsSpy = vi.spyOn(
      buildUserService,
      'getRebuildOperationsIfCurrentUser',
    );

    setUpdateSubscriptionResponse({
      subscriptionId: '*',
      response: {},
    });
  });

  const getExecutor = () => {
    return new RefreshUserOperationExecutor(
      identityModelStore,
      propertiesModelStore,
      subscriptionModelStore,
      buildUserService,
      newRecordsState,
    );
  };

  test('should return correct operations (names)', async () => {
    const executor = getExecutor();
    expect(executor.operations).toEqual([OPERATION_NAME.REFRESH_USER]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();
    const someOp = new SomeOperation();
    const ops = [someOp];

    const result = executor.execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation(s)! Attempted operations:\n${JSON.stringify(
        ops,
      )}`,
    );
  });

  describe('getUser', () => {
    beforeEach(async () => {
      // Set up initial model state
      identityModelStore.model.setProperty(
        IdentityConstants.ONESIGNAL_ID,
        DUMMY_ONESIGNAL_ID,
        ModelChangeTags.HYDRATE,
      );
    });

    test('should ignore refresh if id is different in identity model store', async () => {
      setGetUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID_2,
        properties: {
          language: 'fr',
        },
      });
      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, DUMMY_ONESIGNAL_ID_2);

      const result = await executor.execute([refreshOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);
      expect(propertiesModelStore.model.language).not.toBe('fr');
    });

    test('should handle successful user retrieval and update models', async () => {
      setGetUserResponse({
        externalId: 'test_user',
        properties: {
          country: 'US',
          language: 'en',
          tags: {
            test_tag: 'test_value',
            test_tag_2: 'test_value_2',
          },
          timezone_id: 'America/New_York',
        },
        subscriptions: [
          {
            app_id: APP_ID,
            id: DUMMY_SUBSCRIPTION_ID,
            type: SubscriptionType.Email,
            token: 'test@example.com',
            notification_types: NotificationType.UserOptedOut,
            device_os: DEVICE_OS,
            device_model: '',
            sdk: __VERSION__,
          },
        ],
      });

      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);

      const result = await executor.execute([refreshOp]);
      expect(result.result).toBe(ExecutionResult.SUCCESS);

      // Check identity model updates
      expect(identityModelStore.model.getProperty('onesignal_id')).toBe(
        DUMMY_ONESIGNAL_ID,
      );
      expect(identityModelStore.model.getProperty('external_id')).toBe(
        'test_user',
      );

      // Check properties model updates
      expect(propertiesModelStore.model.country).toBe('US');
      expect(propertiesModelStore.model.language).toBe('en');
      expect(propertiesModelStore.model.tags).toEqual({
        test_tag: 'test_value',
        test_tag_2: 'test_value_2',
      });
      expect(propertiesModelStore.model.timezone_id).toBe('America/New_York');

      // Check subscription model updates
      const subscriptions = subscriptionModelStore.list();
      expect(subscriptions.length).toBe(1);
      expect(subscriptions[0]).toMatchObject({
        id: DUMMY_SUBSCRIPTION_ID,
        notification_types: NotificationType.UserOptedOut,
        enabled: false,
        token: 'test@example.com',
        type: SubscriptionType.Email,
        device_os: DEVICE_OS,
        device_model: '',
        sdk: __VERSION__,
      });
    });

    test('should preserve cached push subscription when updating models', async () => {
      // Set up a push subscription in the store
      const pushSubModel = new SubscriptionModel();
      pushSubModel.id = DUMMY_SUBSCRIPTION_ID_2;
      pushSubModel.type = SubscriptionType.ChromePush;
      pushSubModel.token = DUMMY_PUSH_TOKEN;
      pushSubModel.notification_types = NotificationType.Subscribed;

      subscriptionModelStore.add(pushSubModel, ModelChangeTags.HYDRATE);
      await setPushToken(DUMMY_PUSH_TOKEN);

      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);

      // Mock response without push subscription
      setGetUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptions: [
          {
            id: 'email-sub-id',
            type: SubscriptionType.Email,
            token: 'test@example.com',
          },
        ],
      });

      await executor.execute([refreshOp]);

      // Check that both subscriptions exist (push is preserved)
      const subscriptions = subscriptionModelStore.list();
      expect(subscriptions.length).toBe(2);

      // Find the push subscription
      const pushSub = subscriptions.find(
        (sub: SubscriptionModel) => sub.type === SubscriptionType.ChromePush,
      );
      expect(pushSub).toBeDefined();
      expect(pushSub?.id).toBe(DUMMY_SUBSCRIPTION_ID_2);
      expect(pushSub?.token).toBe(DUMMY_PUSH_TOKEN);
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);

      // retryable error
      setGetUserError({
        status: 429,
        retryAfter: 10,
      });
      const res1 = await executor.execute([refreshOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // unauthorized error
      setGetUserError({
        status: 401,
        retryAfter: 15,
      });
      const res2 = await executor.execute([refreshOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
        retryAfterSeconds: 15,
      });

      // missing error
      // -- no rebuild ops
      setGetUserError({
        status: 404,
        retryAfter: 5,
      });
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res3 = await executor.execute([refreshOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
        retryAfterSeconds: undefined,
      });

      // -- with rebuild ops
      const res4 = await executor.execute([refreshOp]);
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

      // -- in missing retry window
      newRecordsState.add(DUMMY_ONESIGNAL_ID);
      setGetUserError({
        status: 404,
        retryAfter: 20,
      });
      const res6 = await executor.execute([refreshOp]);
      expect(res6).toMatchObject({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 20,
      });

      // other errors
      setGetUserError({
        status: 400,
      });
      const res7 = await executor.execute([refreshOp]);
      expect(res7).toMatchObject({
        result: ExecutionResult.FAIL_NORETRY,
        retryAfterSeconds: undefined,
      });
    });
  });
});
