import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_ONESIGNAL_ID_2,
  DUMMY_SUBSCRIPTION_ID,
} from '__test__/support/constants';
import {
  MockPreferencesService,
  SomeOperation,
} from '__test__/support/helpers/executors';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { LoginUserFromSubscriptionOperation } from '../operations/LoginUserFromSubscriptionOperation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { ExecutionResult } from '../types/operation';
import { LoginUserFromSubscriptionOperationExecutor } from './LoginUserFromSubscriptionOperationExecutor';

let identityPrefs: MockPreferencesService;
let identityModelStore: IdentityModelStore;
let propertiesModelStore: PropertiesModelStore;

vi.mock('src/shared/libraries/Log');

describe('LoginUserFromSubscriptionOperationExecutor', () => {
  beforeEach(() => {
    identityPrefs = new MockPreferencesService();
    identityModelStore = new IdentityModelStore(identityPrefs);
    propertiesModelStore = new PropertiesModelStore(identityPrefs);
  });

  const getExecutor = () => {
    return new LoginUserFromSubscriptionOperationExecutor(
      identityModelStore,
      propertiesModelStore,
    );
  };

  test('should return correct operations (names)', () => {
    const executor = getExecutor();
    expect(executor.operations).toEqual([
      OPERATION_NAME.LOGIN_USER_FROM_SUBSCRIPTION_USER,
    ]);
  });

  test('should validate operations', async () => {
    const executor = getExecutor();
    const someOp = new SomeOperation();

    // with invalid ops
    const ops = [someOp];
    const result = executor.execute(ops);
    await expect(() => result).rejects.toThrow(
      `Unrecognized operation: ${someOp}`,
    );
  });

  test('should throw if more than one operation is provided', async () => {
    const executor = getExecutor();
    const loginOp1 = new LoginUserFromSubscriptionOperation(
      APP_ID,
      DUMMY_ONESIGNAL_ID,
      DUMMY_SUBSCRIPTION_ID,
    );
    const loginOp2 = new LoginUserFromSubscriptionOperation(
      APP_ID,
      DUMMY_ONESIGNAL_ID,
      DUMMY_SUBSCRIPTION_ID,
    );

    const ops = [loginOp1, loginOp2];
    const result = executor.execute(ops);
    await expect(() => result).rejects.toThrow(/Only supports one operation/);
  });

  describe('loginUser', () => {
    const getSubscriptionIdentityUrl = (subscriptionId: string) =>
      `**/api/v1/apps/${APP_ID}/subscriptions/${subscriptionId}/user/identity`;

    const setFetchAliasesResult = (onesignalId?: string) => {
      server.use(
        http.get(getSubscriptionIdentityUrl(DUMMY_SUBSCRIPTION_ID), () =>
          HttpResponse.json({
            identity: onesignalId
              ? {
                  [IdentityConstants.ONESIGNAL_ID]: onesignalId,
                }
              : {},
          }),
        ),
      );
    };

    const setFetchAliasesError = (status: number, retryAfter?: number) => {
      server.use(
        http.get(getSubscriptionIdentityUrl(DUMMY_SUBSCRIPTION_ID), () =>
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

    test('should successfully login from subscription and update models', async () => {
      // Set up identity to be returned from the API
      setFetchAliasesResult(DUMMY_ONESIGNAL_ID_2);

      // Setup existing identity and properties
      identityModelStore.model.setProperty(
        IdentityConstants.ONESIGNAL_ID,
        DUMMY_ONESIGNAL_ID,
      );
      propertiesModelStore.model.setProperty('onesignalId', DUMMY_ONESIGNAL_ID);

      const executor = getExecutor();
      const loginOp = new LoginUserFromSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      const result = await executor.execute([loginOp]);

      // Should update models with new onesignalId
      expect(
        identityModelStore.model.getProperty(IdentityConstants.ONESIGNAL_ID),
      ).toEqual(DUMMY_ONESIGNAL_ID_2);

      expect(propertiesModelStore.model.getProperty('onesignalId')).toEqual(
        DUMMY_ONESIGNAL_ID_2,
      );

      // Should return success with id translations and refresh operation
      expect(result).toEqual({
        result: ExecutionResult.SUCCESS,
        retryAfterSeconds: undefined,
        operations: [new RefreshUserOperation(APP_ID, DUMMY_ONESIGNAL_ID_2)],
        idTranslations: {
          [DUMMY_ONESIGNAL_ID]: DUMMY_ONESIGNAL_ID_2,
        },
      });
    });

    test('should fail if subscription has no onesignalId', async () => {
      setFetchAliasesResult(); // No onesignalId in response

      const executor = getExecutor();
      const loginOp = new LoginUserFromSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      const result = await executor.execute([loginOp]);

      expect(result.result).toBe(ExecutionResult.FAIL_NORETRY);
    });

    test('should handle network errors', async () => {
      const executor = getExecutor();
      const loginOp = new LoginUserFromSubscriptionOperation(
        APP_ID,
        DUMMY_ONESIGNAL_ID,
        DUMMY_SUBSCRIPTION_ID,
      );

      // Retryable error
      setFetchAliasesError(429, 10);
      const res = await executor.execute([loginOp]);
      expect(res.result).toBe(ExecutionResult.FAIL_RETRY);

      // Unauthorized error
      setFetchAliasesError(401);
      const res2 = await executor.execute([loginOp]);
      expect(res2.result).toBe(ExecutionResult.FAIL_UNAUTHORIZED);

      // Other errors - no retry
      setFetchAliasesError(400);
      const res3 = await executor.execute([loginOp]);
      expect(res3.result).toBe(ExecutionResult.FAIL_NORETRY);
    });
  });
});
