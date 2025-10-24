import { APP_ID, ONESIGNAL_ID, PUSH_TOKEN, SUB_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { createPushSub } from '__test__/support/environment/TestEnvironmentHelpers';
import { SomeOperation } from '__test__/support/helpers/executors';
import {
  createSubscriptionFn,
  setCreateSubscriptionError,
  setCreateSubscriptionResponse,
  setDeleteSubscriptionError,
  setDeleteSubscriptionResponse,
  setTransferSubscriptionError,
  setTransferSubscriptionResponse,
  setUpdateSubscriptionError,
  setUpdateSubscriptionResponse,
  transferSubscriptionFn,
  updateSubscriptionFn,
} from '__test__/support/helpers/requests';
import { setupSubscriptionModel } from '__test__/support/helpers/setup';
import { setPushToken } from 'src/shared/database/subscription';
import { UnknownOpError } from 'src/shared/errors/common';
import {
  NotificationType,
  SubscriptionType,
} from 'src/shared/subscriptions/constants';
import type { MockInstance } from 'vitest';
import { OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
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

const pushSubscription = createPushSub();
const BACKEND_SUBSCRIPTION_ID = 'backend-subscription-id';

vi.mock('src/shared/libraries/Log');

describe('SubscriptionOperationExecutor', () => {
  beforeAll(() => {
    TestEnvironment.initialize();
  });

  beforeEach(() => {
    subscriptionModelStore = OneSignal._coreDirector._subscriptionModelStore;
    newRecordsState = OneSignal._coreDirector._newRecordsState;
    newRecordsState._records.clear();

    identityModelStore = OneSignal._coreDirector._identityModelStore;
    propertiesModelStore = OneSignal._coreDirector._propertiesModelStore;
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
    expect(executor._operations).toEqual([
      OPERATION_NAME._CreateSubscription,
      OPERATION_NAME._UpdateSubscription,
      OPERATION_NAME._DeleteSubscription,
      OPERATION_NAME._TransferSubscription,
    ]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();
    const someOp = new SomeOperation();
    const ops = [someOp];

    const res1 = executor._execute(ops);
    await expect(() => res1).rejects.toThrow(UnknownOpError(ops));

    const deleteOp = new DeleteSubscriptionOperation(
      APP_ID,
      ONESIGNAL_ID,
      SUB_ID,
    );
    const updateOp = new UpdateSubscriptionOperation({
      appId: APP_ID,
      onesignalId: ONESIGNAL_ID,
      subscriptionId: SUB_ID,
      token: 'test',
      type: SubscriptionType._ChromePush,
    });

    const res2 = executor._execute([deleteOp, updateOp]);
    await expect(() => res2).rejects.toThrow(
      'Only supports one operation! Attempted operations:',
    );

    const transferOp = new TransferSubscriptionOperation(
      APP_ID,
      ONESIGNAL_ID,
      SUB_ID,
    );
    const res3 = executor._execute([transferOp, updateOp]);
    await expect(() => res3).rejects.toThrow(
      'TransferSubscriptionOperation only supports one operation! Attempted operations:',
    );
  });

  describe('CreateSubscriptionOperation', () => {
    beforeEach(() => {
      setCreateSubscriptionResponse();
    });

    test('should create subscription successfully', async () => {
      setupSubscriptionModel(SUB_ID, PUSH_TOKEN);

      setCreateSubscriptionResponse({
        response: {
          id: BACKEND_SUBSCRIPTION_ID,
        },
      });
      await setPushToken(PUSH_TOKEN);

      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: NotificationType._Subscribed,
      });

      const result = await executor._execute([createOp]);
      expect(result).toMatchObject({
        _result: ExecutionResult._Success,
        _idTranslations: {
          [SUB_ID]: BACKEND_SUBSCRIPTION_ID,
        },
      });

      // Verify models were updated
      const subscriptionModel = subscriptionModelStore._getBySubscriptionId(
        BACKEND_SUBSCRIPTION_ID,
      );
      expect(subscriptionModel).toBeDefined();
    });

    test('should handle create with update operations', async () => {
      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._ChromePush,
        token: 'old-token',
        enabled: true,
        notification_types: NotificationType._Subscribed,
      });

      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._Email,
        token: 'new-token',
        enabled: false,
        notification_types: NotificationType._UserOptedOut,
      });

      const result = await executor._execute([createOp, updateOp]);
      expect(result._result).toBe(ExecutionResult._Success);

      expect(createSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          enabled: false,
          notification_types: NotificationType._UserOptedOut,
          token: 'new-token',
          sdk: __VERSION__,
          type: SubscriptionType._ChromePush,
        },
      });
    });

    test('should handle create and delete operations by succeeding immediately', async () => {
      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: NotificationType._Subscribed,
      });

      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        ONESIGNAL_ID,
        SUB_ID,
      );

      const result = await executor._execute([createOp, deleteOp]);
      expect(result._result).toBe(ExecutionResult._Success);

      // API should not have been called
      expect(createSubscriptionFn).not.toHaveBeenCalled();
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const createOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: NotificationType._Subscribed,
      });

      // Retryable error
      setCreateSubscriptionError({ status: 429, retryAfter: 10 });
      const res1 = await executor._execute([createOp]);
      expect(res1).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 10,
      });

      // Conflict error
      setCreateSubscriptionError({ status: 400, retryAfter: 10 });
      const res2 = await executor._execute([createOp]);
      expect(res2).toMatchObject({
        _result: ExecutionResult._FailNoretry,
      });

      // Invalid error
      setCreateSubscriptionError({ status: 409, retryAfter: 10 });
      const res3 = await executor._execute([createOp]);
      expect(res3).toMatchObject({
        _result: ExecutionResult._FailNoretry,
      });

      // Unauthorized error
      setCreateSubscriptionError({ status: 401, retryAfter: 15 });
      const res4 = await executor._execute([createOp]);
      expect(res4).toMatchObject({
        _result: ExecutionResult._FailUnauthorized,
        _retryAfterSeconds: 15,
      });

      // Missing error without rebuild ops
      setCreateSubscriptionError({ status: 404, retryAfter: 5 });
      getRebuildOpsSpy.mockReturnValueOnce(null);
      const res5 = await executor._execute([createOp]);

      expect(res5).toMatchObject({
        _result: ExecutionResult._FailNoretry,
      });

      // Missing error with rebuild ops
      subscriptionsModelStore._add(pushSubscription, ModelChangeTags._Hydrate);
      await setPushToken(pushSubscription._token);

      const res6 = await executor._execute([createOp]);

      const _operations = [
        new LoginUserOperation(APP_ID, ONESIGNAL_ID),
        new CreateSubscriptionOperation({
          appId: APP_ID,
          onesignalId: ONESIGNAL_ID,
          enabled: true,
          notification_types: NotificationType._Subscribed,
          subscriptionId: pushSubscription._id,
          token: pushSubscription._token,
          type: SubscriptionType._ChromePush,
        }),
        new RefreshUserOperation(APP_ID, ONESIGNAL_ID),
      ];
      _operations.forEach((op, i) => {
        op._modelId = res6._operations![i]._modelId;
      });

      expect(res6).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 5,
        _operations: _operations,
      });

      // Missing error in retry window
      newRecordsState._add(ONESIGNAL_ID);
      setCreateSubscriptionError({ status: 404, retryAfter: 20 });
      const res7 = await executor._execute([createOp]);
      expect(res7).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 20,
      });

      // Other errors
      setCreateSubscriptionError({ status: 400 });
      const res8 = await executor._execute([createOp]);
      expect(res8).toMatchObject({
        _result: ExecutionResult._FailNoretry,
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
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._ChromePush,
        token: 'updated-token',
        enabled: false,
        notification_types: NotificationType._UserOptedOut,
        web_auth: 'some-web-auth',
        web_p256: 'some-web-p256',
      });

      const result = await executor._execute([updateOp]);
      expect(result._result).toBe(ExecutionResult._Success);

      expect(updateSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          type: SubscriptionType._ChromePush,
          enabled: false,
          token: 'updated-token',
          notification_types: NotificationType._UserOptedOut,
          web_auth: 'some-web-auth',
          web_p256: 'some-web-p256',
        },
      });
    });

    test('should handle multiple update operations by using the last one', async () => {
      const executor = getExecutor();
      const updateOp1 = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._Email,
        token: 'first-update',
        enabled: true,
        notification_types: NotificationType._Subscribed,
        web_auth: 'some-web-auth',
        web_p256: 'some-web-p256',
      });

      const updateOp2 = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._ChromePush,
        token: 'second-update',
        enabled: false,
        notification_types: NotificationType._UserOptedOut,
        web_auth: 'some-web-auth-2',
        web_p256: 'some-web-p256-2',
      });

      const result = await executor._execute([updateOp1, updateOp2]);
      expect(result._result).toBe(ExecutionResult._Success);

      // Verify only the last update was used
      expect(updateSubscriptionFn).toHaveBeenCalledWith({
        subscription: {
          type: SubscriptionType._ChromePush,
          enabled: false,
          token: 'second-update',
          notification_types: NotificationType._UserOptedOut,
          web_auth: 'some-web-auth-2',
          web_p256: 'some-web-p256-2',
        },
      });
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const updateOp = new UpdateSubscriptionOperation({
        appId: APP_ID,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        type: SubscriptionType._ChromePush,
        token: 'test-token',
        enabled: true,
        notification_types: NotificationType._Subscribed,
      });

      // Retryable error
      setUpdateSubscriptionError({ status: 429, retryAfter: 15 });
      const res1 = await executor._execute([updateOp]);
      expect(res1).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 15,
      });

      // Missing error
      setUpdateSubscriptionError({ status: 404, retryAfter: 10 });
      const res2 = await executor._execute([updateOp]);
      const subOp = new CreateSubscriptionOperation({
        appId: APP_ID,
        enabled: true,
        notification_types: NotificationType._Subscribed,
        onesignalId: ONESIGNAL_ID,
        subscriptionId: SUB_ID,
        token: 'test-token',
        type: SubscriptionType._ChromePush,
      });
      subOp._modelId = res2._operations![0]._modelId;
      expect(res2).toMatchObject({
        _result: ExecutionResult._FailNoretry,
        _operations: [subOp],
      });

      // Missing error with record in retry window
      newRecordsState._add(SUB_ID);
      const res3 = await executor._execute([updateOp]);
      expect(res3).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 10,
      });

      // Other errors
      setUpdateSubscriptionError({ status: 400 });
      const res4 = await executor._execute([updateOp]);
      expect(res4).toMatchObject({
        _result: ExecutionResult._FailNoretry,
      });
    });
  });

  describe('DeleteSubscriptionOperation', () => {
    beforeEach(() => {
      setDeleteSubscriptionResponse();
    });

    test('should delete subscription successfully', async () => {
      // Set up a subscription model to be deleted
      setupSubscriptionModel(SUB_ID, PUSH_TOKEN);

      const executor = getExecutor();
      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        ONESIGNAL_ID,
        SUB_ID,
      );

      const result = await executor._execute([deleteOp]);
      expect(result._result).toBe(ExecutionResult._Success);

      // Verify model was removed
      expect(subscriptionModelStore._get(SUB_ID)).toBeUndefined();
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const deleteOp = new DeleteSubscriptionOperation(
        APP_ID,
        ONESIGNAL_ID,
        SUB_ID,
      );

      // Missing error
      setDeleteSubscriptionError({ status: 404 });
      const result = await executor._execute([deleteOp]);
      expect(result._result).toBe(ExecutionResult._Success);

      // Missing error with record in retry window
      newRecordsState._add(SUB_ID);
      setDeleteSubscriptionError({ status: 404, retryAfter: 5 });
      const res2 = await executor._execute([deleteOp]);
      expect(res2).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 5,
      });

      // Retryable error
      setDeleteSubscriptionError({
        status: 429,
        retryAfter: 10,
        subscriptionId: SUB_ID,
      });
      const res3 = await executor._execute([deleteOp]);
      expect(res3).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 10,
      });

      // Other errors
      setDeleteSubscriptionError({
        status: 400,
        subscriptionId: SUB_ID,
      });
      const res4 = await executor._execute([deleteOp]);
      expect(res4).toMatchObject({
        _result: ExecutionResult._FailNoretry,
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
        ONESIGNAL_ID,
        SUB_ID,
      );

      const result = await executor._execute([transferOp]);
      expect(result._result).toBe(ExecutionResult._Success);

      expect(transferSubscriptionFn).toHaveBeenCalledWith({
        identity: {
          onesignal_id: ONESIGNAL_ID,
        },
        retain_previous_owner: false,
      });
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const transferOp = new TransferSubscriptionOperation(
        APP_ID,
        ONESIGNAL_ID,
        SUB_ID,
      );

      // Retryable error
      setTransferSubscriptionError({ status: 429, retryAfter: 10 });
      const res2 = await executor._execute([transferOp]);
      expect(res2).toMatchObject({
        _result: ExecutionResult._FailRetry,
        _retryAfterSeconds: 10,
      });

      // Other errors
      setTransferSubscriptionError({ status: 400 });
      const res3 = await executor._execute([transferOp]);
      expect(res3).toMatchObject({
        _result: ExecutionResult._FailNoretry,
      });
    });
  });
});
