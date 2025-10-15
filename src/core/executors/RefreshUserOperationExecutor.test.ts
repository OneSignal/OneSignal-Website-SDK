import {
  APP_ID,
  DEVICE_OS,
  ONESIGNAL_ID,
  ONESIGNAL_ID_2,
  PUSH_TOKEN,
  SUB_ID,
  SUB_ID_2,
} from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SomeOperation } from '__test__/support/helpers/executors';
import {
  setGetUserError,
  setGetUserResponse,
} from '__test__/support/helpers/requests';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { setPushToken } from 'src/shared/database/subscription';
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
  beforeAll(() => {
    TestEnvironment.initialize();
  });

  beforeEach(() => {
    identityModelStore = OneSignal._coreDirector._identityModelStore;
    propertiesModelStore = OneSignal._coreDirector._propertiesModelStore;
    subscriptionModelStore = OneSignal._coreDirector._subscriptionModelStore;
    newRecordsState = OneSignal._coreDirector._newRecordsState;
    buildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionModelStore,
    );
    getRebuildOpsSpy = vi.spyOn(
      buildUserService,
      '_getRebuildOperationsIfCurrentUser',
    );
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
    expect(executor._operations).toEqual([OPERATION_NAME._RefreshUser]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();
    const someOp = new SomeOperation();
    const ops = [someOp];

    const result = executor._execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation(s)! Attempted operations:\n${JSON.stringify(
        ops,
      )}`,
    );
  });

  describe('getUser', () => {
    beforeEach(async () => {
      // Set up initial model state
      updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    });

    test('should ignore refresh if id is different in identity model store', async () => {
      setGetUserResponse({
        onesignalId: ONESIGNAL_ID_2,
        properties: {
          language: 'fr',
        },
      });
      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, ONESIGNAL_ID_2);

      const result = await executor._execute([refreshOp]);
      expect(result._result).toBe(ExecutionResult._Success);
      expect(propertiesModelStore._model._language).not.toBe('fr');
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
            id: SUB_ID,
            type: SubscriptionType._Email,
            token: 'test@example.com',
            notification_types: NotificationType._UserOptedOut,
            device_os: DEVICE_OS,
            device_model: '',
            sdk: __VERSION__,
          },
        ],
      });

      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, ONESIGNAL_ID);

      const result = await executor._execute([refreshOp]);
      expect(result._result).toBe(ExecutionResult._Success);

      // Check identity model updates
      expect(identityModelStore._model._getProperty('onesignal_id')).toBe(
        ONESIGNAL_ID,
      );
      expect(identityModelStore._model._getProperty('external_id')).toBe(
        'test_user',
      );

      // Check properties model updates
      expect(propertiesModelStore._model._country).toBe('US');
      expect(propertiesModelStore._model._language).toBe('en');
      expect(propertiesModelStore._model._tags).toEqual({
        test_tag: 'test_value',
        test_tag_2: 'test_value_2',
      });
      expect(propertiesModelStore._model._timezone_id).toBe('America/New_York');

      // Check subscription model updates
      const subscriptions = subscriptionModelStore._list();
      expect(subscriptions.length).toBe(1);
      expect(subscriptions[0].toJSON()).toMatchObject({
        id: SUB_ID,
        notification_types: NotificationType._UserOptedOut,
        enabled: false,
        token: 'test@example.com',
        type: SubscriptionType._Email,
        device_os: DEVICE_OS,
        device_model: '',
        sdk: __VERSION__,
      });
    });

    test('should preserve cached push subscription when updating models', async () => {
      // Set up a push subscription in the store
      const pushSubModel = new SubscriptionModel();
      pushSubModel.id = SUB_ID_2;
      pushSubModel.type = SubscriptionType._ChromePush;
      pushSubModel.token = PUSH_TOKEN;
      pushSubModel._notification_types = NotificationType._Subscribed;

      subscriptionModelStore._add(pushSubModel, ModelChangeTags._NoPropogate);
      await setPushToken(PUSH_TOKEN);

      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, ONESIGNAL_ID);

      // Mock response without push subscription
      setGetUserResponse({
        onesignalId: ONESIGNAL_ID,
        subscriptions: [
          {
            id: 'email-sub-id',
            type: SubscriptionType._Email,
            token: 'test@example.com',
          },
        ],
      });

      await executor._execute([refreshOp]);

      // Check that both subscriptions exist (push is preserved)
      const subscriptions = subscriptionModelStore._list();
      expect(subscriptions.length).toBe(2);

      // Find the push subscription
      const pushSub = subscriptions.find(
        (sub: SubscriptionModel) => sub.type === SubscriptionType._ChromePush,
      );
      expect(pushSub).toBeDefined();
      expect(pushSub?.id).toBe(SUB_ID_2);
      expect(pushSub?.token).toBe(PUSH_TOKEN);
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const refreshOp = new RefreshUserOperation(APP_ID, ONESIGNAL_ID);

      // retryable error
      setGetUserError({
        status: 429,
        retryAfter: 10,
      });
      const res1 = await executor._execute([refreshOp]);
      expect(res1).toMatchObject({
        result: ExecutionResult._FailRetry,
        retryAfterSeconds: 10,
      });

      // unauthorized error
      setGetUserError({
        status: 401,
        retryAfter: 15,
      });
      const res2 = await executor._execute([refreshOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult._FailUnauthorized,
        retryAfterSeconds: 15,
      });

      // missing error
      // -- no rebuild ops
      setGetUserError({
        status: 404,
        retryAfter: 5,
      });
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res3 = await executor._execute([refreshOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult._FailNoretry,
        retryAfterSeconds: undefined,
      });

      // -- with rebuild ops
      const res4 = await executor._execute([refreshOp]);
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

      // -- in missing retry window
      newRecordsState._add(ONESIGNAL_ID);
      setGetUserError({
        status: 404,
        retryAfter: 20,
      });
      const res6 = await executor._execute([refreshOp]);
      expect(res6).toMatchObject({
        result: ExecutionResult._FailRetry,
        retryAfterSeconds: 20,
      });

      // other errors
      setGetUserError({
        status: 400,
      });
      const res7 = await executor._execute([refreshOp]);
      expect(res7).toMatchObject({
        result: ExecutionResult._FailNoretry,
        retryAfterSeconds: undefined,
      });
    });
  });
});
