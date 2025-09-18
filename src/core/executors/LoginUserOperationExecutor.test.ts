import {
  APP_ID,
  BASE_IDENTITY,
  DEVICE_OS,
  EXTERNAL_ID,
  ONESIGNAL_ID,
  ONESIGNAL_ID_2,
  PUSH_TOKEN,
  PUSH_TOKEN_2,
  SUB_ID,
  SUB_ID_2,
} from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SomeOperation } from '__test__/support/helpers/executors';
import {
  createUserFn,
  setAddAliasError,
  setAddAliasResponse,
  setCreateUserError,
  setCreateUserResponse,
} from '__test__/support/helpers/requests';
import {
  updateIdentityModel,
  updatePropertiesModel,
} from '__test__/support/helpers/setup';
import { getPushToken, setPushToken } from 'src/shared/database/subscription';
import {
  NotificationType,
  SubscriptionType,
} from 'src/shared/subscriptions/constants';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import type { SubscriptionWithAppId } from '../operations/BaseFullSubscriptionOperation';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult } from '../types/operation';
import { IdentityOperationExecutor } from './IdentityOperationExecutor';
import { LoginUserOperationExecutor } from './LoginUserOperationExecutor';

let identityModelStore: IdentityModelStore;
let propertiesModelStore: PropertiesModelStore;
let subscriptionModelStore: SubscriptionModelStore;
let rebuildUserService: RebuildUserService;

vi.mock('src/shared/libraries/Log');

describe('LoginUserOperationExecutor', () => {
  beforeAll(() => {
    TestEnvironment.initialize();
  });

  beforeEach(() => {
    identityModelStore = OneSignal._coreDirector.identityModelStore;
    propertiesModelStore = OneSignal._coreDirector.propertiesModelStore;
    subscriptionModelStore = OneSignal._coreDirector.subscriptionModelStore;
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

    expect(executor._operations).toEqual([OPERATION_NAME.LOGIN_USER]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();

    const someOp = new SomeOperation();

    // with invalid ops
    const ops = [someOp];
    const result = executor._execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation: ${someOp.name}`,
    );
  });

  describe('create user', () => {
    beforeEach(() => {
      setCreateUserResponse({
        onesignalId: ONESIGNAL_ID,
      });
    });

    test('should fail if there are invalid operations', async () => {
      const executor = getExecutor();

      // login op with create subscription op and no externalId
      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);

      // login op with subscription op and random operation
      const transferSubOp = new TransferSubscriptionOperation(
        APP_ID,
        ONESIGNAL_ID,
        mockSubscriptionOpInfo.subscriptionId,
      );
      const someOp = new SomeOperation();
      const ops2 = [loginOp, transferSubOp, someOp];
      const res2 = executor._execute(ops2);
      await expect(res2).rejects.toThrow(
        `Unrecognized operation: ${someOp.name}`,
      );
    });

    test('can create user if there is no onesignal id or externalId', async () => {
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID_2);
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];
      const res = await executor._execute(ops);

      expect(res).toEqual({
        result: ExecutionResult.SUCCESS,
        retryAfterSeconds: undefined,
        operations: undefined,
        idTranslations: {
          [ONESIGNAL_ID_2]: ONESIGNAL_ID,
        },
      });
    });

    test('can create user with existing subscription and follow up operations', async () => {
      const someSubscription = {
        app_id: APP_ID,
        id: SUB_ID_2,
        type: SubscriptionType.ChromePush,
        token: PUSH_TOKEN,
      };
      setCreateUserResponse({
        onesignalId: ONESIGNAL_ID_2,
        subscriptions: [someSubscription],
      });

      // have identity model, config, properties model have the same onesignalId to check
      // that their properties are updated
      updateIdentityModel('onesignal_id', ONESIGNAL_ID);
      updatePropertiesModel('onesignalId', ONESIGNAL_ID);
      await setPushToken(PUSH_TOKEN);

      const subscriptionModel = new SubscriptionModel();
      subscriptionModel._setProperty(
        'id',
        SUB_ID,
        ModelChangeTags.NO_PROPAGATE,
      );
      subscriptionModelStore.add(
        subscriptionModel,
        ModelChangeTags.NO_PROPAGATE,
      );

      // perform operations with old onesignal id
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      loginOp._setProperty('externalId', EXTERNAL_ID);

      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];
      const res = await executor._execute(ops);

      // should update model properties
      expect(
        identityModelStore.model._getProperty(IdentityConstants.ONESIGNAL_ID),
      ).toEqual(ONESIGNAL_ID_2);
      expect(propertiesModelStore.model._getProperty('onesignalId')).toEqual(
        ONESIGNAL_ID_2,
      );
      expect(await getPushToken()).toEqual(PUSH_TOKEN);
      expect(subscriptionModel._getProperty('id')).toEqual(SUB_ID_2);

      // should have a refresh user operation
      const refreshOp = new RefreshUserOperation(APP_ID, ONESIGNAL_ID_2);
      refreshOp._modelId = res.operations![0]._modelId;
      expect(res).toEqual({
        result: ExecutionResult.SUCCESS,
        retryAfterSeconds: undefined,
        operations: [refreshOp],
        idTranslations: {
          [ONESIGNAL_ID]: ONESIGNAL_ID_2,
          [SUB_ID]: SUB_ID_2,
        },
      });
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];

      // retryable error
      setCreateUserError({ status: 429, retryAfter: 10 });
      const res = await executor._execute(ops);
      expect(res).toEqual({
        result: ExecutionResult.FAIL_RETRY,
        retryAfterSeconds: 10,
      });

      // unauthorized error
      setCreateUserError({ status: 401, retryAfter: 15 });
      const res2 = await executor._execute(ops);
      expect(res2).toEqual({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
        retryAfterSeconds: 15,
      });

      // others errors - pause repo
      setCreateUserError({ status: 400, retryAfter: 20 });
      const res3 = await executor._execute(ops);
      expect(res3).toEqual({
        result: ExecutionResult.FAIL_PAUSE_OPREPO,
        retryAfterSeconds: undefined,
      });
    });
  });

  describe('login user', () => {
    test('can add/set alias when logging in a user with existing onesignal id', async () => {
      updateIdentityModel('onesignal_id', ONESIGNAL_ID);
      updatePropertiesModel('onesignalId', ONESIGNAL_ID);

      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      loginOp._setProperty('externalId', EXTERNAL_ID);

      // different id for testing id translations
      loginOp._setProperty('existingOnesignalId', ONESIGNAL_ID_2);
      setAddAliasResponse({ onesignalId: ONESIGNAL_ID_2 });

      const ops = [loginOp];
      const res = await executor._execute(ops);

      // should update model properties
      expect(
        identityModelStore.model._getProperty(IdentityConstants.ONESIGNAL_ID),
      ).toEqual(ONESIGNAL_ID_2);
      expect(propertiesModelStore.model._getProperty('onesignalId')).toEqual(
        ONESIGNAL_ID_2,
      );

      expect(res).toEqual({
        result: ExecutionResult.SUCCESS_STARTING_ONLY,
        idTranslations: {
          [ONESIGNAL_ID]: ONESIGNAL_ID_2,
        },
      });
    });

    test('can handle network errors', async () => {
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      loginOp._setProperty('externalId', EXTERNAL_ID);
      loginOp._setProperty('existingOnesignalId', ONESIGNAL_ID);

      // Conflict error - should create user
      setAddAliasError({ status: 409 });
      setCreateUserResponse({
        onesignalId: '123',
      });

      const res = await executor._execute([loginOp]);
      expect(res).toMatchObject({
        result: ExecutionResult.SUCCESS,
        idTranslations: {
          [ONESIGNAL_ID]: '123',
        },
      });

      // Fail no retry - should create user
      setAddAliasError({ status: 400 });
      setCreateUserResponse({
        onesignalId: '456',
      });

      const res2 = await executor._execute([loginOp]);
      expect(res2).toMatchObject({
        result: ExecutionResult.SUCCESS,
        idTranslations: {
          [ONESIGNAL_ID]: '456',
        },
      });

      // Some other error
      setAddAliasError({ status: 401 });

      const res3 = await executor._execute([loginOp]);
      expect(res3).toMatchObject({
        result: ExecutionResult.FAIL_UNAUTHORIZED,
      });
    });
  });

  describe('create subscriptions', () => {
    test('can create a subscriptions', async () => {
      setCreateUserResponse({
        onesignalId: ONESIGNAL_ID,
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      loginOp._setProperty('externalId', EXTERNAL_ID);

      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );

      const ops = [loginOp, createSubOp];
      await executor._execute(ops);

      expect(createUserFn).toHaveBeenCalledWith({
        identity: {
          external_id: EXTERNAL_ID,
        },
        ...BASE_IDENTITY,
        subscriptions: [
          {
            device_model: '',
            device_os: DEVICE_OS,
            sdk: __VERSION__,
            token: mockSubscriptionOpInfo.token,
            type: mockSubscriptionOpInfo.type,
          },
        ],
      });
    });

    test('can update a subscription', async () => {
      setCreateUserResponse({
        onesignalId: ONESIGNAL_ID,
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      loginOp._setProperty('externalId', EXTERNAL_ID);

      // needs to be created first for update to do anything
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );
      const updates = {
        enabled: false,
        notification_types: NotificationType.NotSubscribed,
        token: PUSH_TOKEN_2,
      };
      const updateSubOp = new UpdateSubscriptionOperation({
        ...mockSubscriptionOpInfo,
        ...updates,
      });

      // with create sub op
      const ops = [loginOp, createSubOp, updateSubOp];
      await executor._execute(ops);

      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptions: [
            {
              device_model: '',
              device_os: DEVICE_OS,
              sdk: __VERSION__,
              type: mockSubscriptionOpInfo.type,
              ...updates,
            },
          ],
        }),
      );

      // with no create sub op
      createUserFn.mockClear();
      await executor._execute([loginOp, updateSubOp]);
      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptions: [],
        }),
      );
    });

    test('can transfer a subscription', async () => {
      setCreateUserResponse({
        onesignalId: ONESIGNAL_ID,
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      loginOp._setProperty('externalId', EXTERNAL_ID);

      // need to create subscription first to test transfer
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );
      const transferSubOp = new TransferSubscriptionOperation(
        APP_ID,
        ONESIGNAL_ID,
        createSubOp.subscriptionId,
      );

      const ops = [loginOp, createSubOp, transferSubOp];
      await executor._execute(ops);

      // should have id in the subscription
      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptions: [
            {
              device_model: '',
              device_os: DEVICE_OS,
              id: SUB_ID,
              sdk: __VERSION__,
              type: mockSubscriptionOpInfo.type,
              token: mockSubscriptionOpInfo.token,
            },
          ],
        }),
      );
    });

    test('can delete a subscription', async () => {
      setCreateUserResponse({
        onesignalId: ONESIGNAL_ID,
        subscriptions: [mockSubscriptionOpInfo],
      });
      const executor = getExecutor();

      const loginOp = new LoginUserOperation(APP_ID, ONESIGNAL_ID);
      loginOp._setProperty('externalId', EXTERNAL_ID);

      // need to create subscription first to test delete
      const createSubOp = new CreateSubscriptionOperation(
        mockSubscriptionOpInfo,
      );
      const deleteSubOp = new DeleteSubscriptionOperation(
        APP_ID,
        ONESIGNAL_ID,
        createSubOp.subscriptionId,
      );

      const ops = [loginOp, createSubOp, deleteSubOp];
      await executor._execute(ops);

      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptions: [] }),
      );
    });
  });
});

const mockSubscriptionOpInfo = {
  appId: APP_ID,
  onesignalId: ONESIGNAL_ID,
  subscriptionId: SUB_ID,
  token: PUSH_TOKEN,
  type: SubscriptionType.ChromePush,
} satisfies SubscriptionWithAppId;
