import {
  APP_ID,
  DUMMY_EXTERNAL_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_ONESIGNAL_ID_2,
  DUMMY_PUSH_TOKEN,
  DUMMY_PUSH_TOKEN_2,
  DUMMY_SUBSCRIPTION_ID,
  DUMMY_SUBSCRIPTION_ID_2,
} from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { mockUserAgent } from '__test__/support/environment/TestEnvironmentHelpers';
import { SomeOperation } from '__test__/support/helpers/executors';
import {
  createUserFn,
  setAddAliasError,
  setAddAliasResponse,
  setCreateUserError,
  setCreateUserResponse,
} from '__test__/support/helpers/requests';
import Database from 'src/shared/services/Database';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { SubscriptionWithAppId } from '../operations/BaseFullSubscriptionOperation';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult } from '../types/operation';
import { NotificationType, SubscriptionType } from '../types/subscription';
import { IdentityOperationExecutor } from './IdentityOperationExecutor';
import { LoginUserOperationExecutor } from './LoginUserOperationExecutor';

let identityModelStore: IdentityModelStore;
let propertiesModelStore: PropertiesModelStore;
let subscriptionModelStore: SubscriptionModelStore;
let rebuildUserService: RebuildUserService;

vi.mock('src/shared/libraries/Log');

describe('LoginUserOperationExecutor', () => {
  beforeAll(async () => {
    await TestEnvironment.initialize();
  });

  beforeEach(async () => {
    await Database.clear();
    mockUserAgent();
    identityModelStore = new IdentityModelStore();
    propertiesModelStore = new PropertiesModelStore();
    subscriptionModelStore = new SubscriptionModelStore();
    rebuildUserService = new RebuildUserService(
      identityModelStore,
      propertiesModelStore,
      subscriptionModelStore,
    );
  });

  const getExecutor = () => {
    return new LoginUserOperationExecutor(
      new IdentityOperationExecutor(
        identityModelStore,
        rebuildUserService,
        new NewRecordsState(),
      ),
      identityModelStore,
      propertiesModelStore,
      subscriptionModelStore,
    );
  };

  test('should return correct operations (names)', async () => {
    const executor = getExecutor();

    expect(executor.operations).toEqual([OPERATION_NAME.LOGIN_USER]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();

    const someOp = new SomeOperation();

    // with invalid ops
    const ops = [someOp];
    const result = executor.execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation: ${someOp.name}`,
    );
  });

  describe('create user', () => {
    beforeEach(() => {
      setCreateUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID,
      });
    });

    test('should fail if there are invalid operations', async () => {
      const executor = getExecutor();

      // login op with create subscription op and no externalId
      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);

      // login op with subscription op and random operation
      const transferSubOp = new TransferSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        mockSubscriptionOpInfo.subscriptionId,
      );
      const someOp = new SomeOperation();
      const ops2 = [loginOp, transferSubOp, someOp];
      const res2 = executor.execute(ops2);
      await expect(res2).rejects.toThrow(
        `Unrecognized operation: ${someOp.name}`,
      );
    });

    test('can create user if there is no onesignal id or externalId', async () => {
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID_2);
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];
      const res = await executor.execute(ops);

      expect(res).toEqual({
        result: ExecutionResult.SUCCESS,
        retryAfterSeconds: undefined,
        operations: undefined,
        idTranslations: {
          [DUMMY_ONESIGNAL_ID_2]: DUMMY_ONESIGNAL_ID,
        },
      });
    });

    test('can create user with existing subscription and follow up operations', async () => {
      const someSubscription = {
        app_id: APP_ID,
        id: DUMMY_SUBSCRIPTION_ID_2,
        type: SubscriptionType.ChromePush,
        token: DUMMY_PUSH_TOKEN,
      };
      setCreateUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID_2,
        subscriptions: [someSubscription],
      });

      // have identity model, config, properties model have the same onesignalId to check
      // that their properties are updated
      identityModelStore.model.setProperty(
        IdentityConstants.ONESIGNAL_ID,
        DUMMY_ONESIGNAL_ID,
      );
      propertiesModelStore.model.setProperty('onesignalId', DUMMY_ONESIGNAL_ID);
      await Database.setPushId(DUMMY_SUBSCRIPTION_ID);

      const subscriptionModel = new SubscriptionModel();
      subscriptionModel.setProperty('id', DUMMY_SUBSCRIPTION_ID);
      subscriptionModelStore.add(subscriptionModel, ModelChangeTags.HYDRATE);

      // perform operations with old onesignal id
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      loginOp.setProperty('externalId', DUMMY_EXTERNAL_ID);

      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];
      const res = await executor.execute(ops);

      // should update model properties
      expect(
        identityModelStore.model.getProperty(IdentityConstants.ONESIGNAL_ID),
      ).toEqual(DUMMY_ONESIGNAL_ID_2);
      expect(propertiesModelStore.model.getProperty('onesignalId')).toEqual(
        DUMMY_ONESIGNAL_ID_2,
      );
      expect(await Database.getPushId()).toEqual(DUMMY_SUBSCRIPTION_ID_2);
      expect(subscriptionModel.getProperty('id')).toEqual(
        DUMMY_SUBSCRIPTION_ID_2,
      );

      // should have a refresh user operation
      const refreshOp = new RefreshUserOperation(APP_ID, DUMMY_ONESIGNAL_ID_2);
      refreshOp.modelId = res.operations![0].modelId;
      expect(res).toEqual({
        result: ExecutionResult.SUCCESS,
        retryAfterSeconds: undefined,
        operations: [refreshOp],
        idTranslations: {
          [DUMMY_ONESIGNAL_ID]: DUMMY_ONESIGNAL_ID_2,
          [DUMMY_SUBSCRIPTION_ID]: DUMMY_SUBSCRIPTION_ID_2,
        },
      });
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];

      // retryable error
      setCreateUserError({ status: 429, retryAfter: 10 });
      const res = await executor.execute(ops);
      expect(res).toEqual({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // unauthorized error
      setCreateUserError({ status: 401, retryAfter: 15 });
      const res2 = await executor.execute(ops);
      expect(res2).toEqual({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
        retryAfterSeconds: 15,
      });

      // others errors - pause repo
      setCreateUserError({ status: 400, retryAfter: 20 });
      const res3 = await executor.execute(ops);
      expect(res3).toEqual({
        result: ExecutionResult.FAIL_PAUSE_OPREPO,
        retryAfterSeconds: undefined,
      });
    });
  });

  describe('login user', () => {
    test('can add/set alias when logging in a user with existing onesignal id', async () => {
      identityModelStore.model.setProperty(
        IdentityConstants.ONESIGNAL_ID,
        DUMMY_ONESIGNAL_ID,
      );
      propertiesModelStore.model.setProperty('onesignalId', DUMMY_ONESIGNAL_ID);

      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      loginOp.setProperty('externalId', DUMMY_EXTERNAL_ID);

      // different id for testing id translations
      loginOp.setProperty('existingOnesignalId', DUMMY_ONESIGNAL_ID_2);
      setAddAliasResponse({ onesignalId: DUMMY_ONESIGNAL_ID_2 });

      const ops = [loginOp];
      const res = await executor.execute(ops);

      // should update model properties
      expect(
        identityModelStore.model.getProperty(IdentityConstants.ONESIGNAL_ID),
      ).toEqual(DUMMY_ONESIGNAL_ID_2);
      expect(propertiesModelStore.model.getProperty('onesignalId')).toEqual(
        DUMMY_ONESIGNAL_ID_2,
      );

      expect(res).toEqual({
        result: ExecutionResult.SUCCESS_STARTING_ONLY,
        idTranslations: {
          [DUMMY_ONESIGNAL_ID]: DUMMY_ONESIGNAL_ID_2,
        },
      });
    });

    test('can handle network errors', async () => {
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      loginOp.setProperty('externalId', DUMMY_EXTERNAL_ID);
      loginOp.setProperty('existingOnesignalId', DUMMY_ONESIGNAL_ID);

      // Conflict error - should create user
      setAddAliasError({ status: 409 });
      setCreateUserResponse({
        onesignalId: '123',
      });

      const res = await executor.execute([loginOp]);
      expect(res).toMatchObject({
        result: ExecutionResult.SUCCESS,
        idTranslations: {
          [DUMMY_ONESIGNAL_ID]: '123',
        },
      });

      // Fail no retry - should create user
      setAddAliasError({ status: 400 });
      setCreateUserResponse({
        onesignalId: '456',
      });

      const res2 = await executor.execute([loginOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.SUCCESS,
        idTranslations: {
          [DUMMY_ONESIGNAL_ID]: '456',
        },
      });

      // Some other error
      setAddAliasError({ status: 401 });

      const res3 = await executor.execute([loginOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
      });
    });
  });

  describe('create subscriptions', () => {
    test('can create a subscriptions', async () => {
      setCreateUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID,
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      loginOp.setProperty('externalId', DUMMY_EXTERNAL_ID);

      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];
      await executor.execute(ops);

      expect(createUserFn).toHaveBeenCalledWith({
        identity: {
          external_id: DUMMY_EXTERNAL_ID,
        },
        properties: {
          language: 'en',
          timezone_id: 'America/Los_Angeles',
        },
        refresh_device_metadata: true,
        subscriptions: [
          {
            device_model: '',
            device_os: 56,
            sdk: '1',
            token: mockSubscriptionOpInfo.token,
            type: mockSubscriptionOpInfo.type,
          },
        ],
      });
    });

    test('can update a subscription', async () => {
      setCreateUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID,
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      loginOp.setProperty('externalId', DUMMY_EXTERNAL_ID);

      // needs to be created first for update to do anything
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );
      const updates = {
        enabled: false,
        notification_types: NotificationType.NotSubscribed,
        token: DUMMY_PUSH_TOKEN_2,
      };
      const updateSubOp = new UpdateSubscriptionOperation({
        ...mockSubscriptionOpInfo,
        ...updates,
      });

      // with create sub op
      const ops = [loginOp, createSubOp, updateSubOp];
      await executor.execute(ops);

      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptions: [
            {
              device_model: '',
              device_os: 56,
              sdk: '1',
              type: mockSubscriptionOpInfo.type,
              ...updates,
            },
          ],
        }),
      );

      // with no create sub op
      createUserFn.mockClear();
      await executor.execute([loginOp, updateSubOp]);
      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptions: [],
        }),
      );
    });

    test('can transfer a subscription', async () => {
      setCreateUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID,
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      loginOp.setProperty('externalId', DUMMY_EXTERNAL_ID);

      // need to create subscription first to test transfer
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );
      const transferSubOp = new TransferSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        createSubOp.subscriptionId,
      );

      const ops = [loginOp, createSubOp, transferSubOp];
      await executor.execute(ops);

      // should have id in the subscription
      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptions: [
            {
              device_model: '',
              device_os: 56,
              id: DUMMY_SUBSCRIPTION_ID,
              sdk: '1',
              type: mockSubscriptionOpInfo.type,
              token: mockSubscriptionOpInfo.token,
            },
          ],
        }),
      );
    });

    test('can delete a subscription', async () => {
      setCreateUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID,
        subscriptions: [mockSubscriptionOpInfo],
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, DUMMY_ONESIGNAL_ID);
      loginOp.setProperty('externalId', DUMMY_EXTERNAL_ID);

      // need to create subscription first to test delete
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );
      const deleteSubOp = new DeleteSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        createSubOp.subscriptionId,
      );

      const ops = [loginOp, createSubOp, deleteSubOp];
      await executor.execute(ops);

      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptions: [] }),
      );
    });
  });
});

const mockSubscriptionOpInfo = {
  appId: APP_ID,
  onesignalId: DUMMY_ONESIGNAL_ID,
  subscriptionId: DUMMY_SUBSCRIPTION_ID,
  token: DUMMY_PUSH_TOKEN,
  type: SubscriptionType.ChromePush,
} satisfies SubscriptionWithAppId;
