import { APP_ID, EXTERNAL_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  getHandler,
  requestHeadersFn,
  setTransferSubscriptionResponse,
  transferSubscriptionFn,
} from '__test__/support/helpers/requests';
import { JwtRequirement, type JwtRequirementValue } from 'src/shared/config/jwtRequirement';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import { setFeatureFlags, setJwtRequirement } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { JwtTokenStore } from '../JwtTokenStore';
import { RebuildUserService } from '../modelRepo/RebuildUserService';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { TrackCustomEventOperation } from '../operations/TrackCustomEventOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { ExecutionResult, type ExecutionResponse } from '../types/operation';
import { CustomEventsOperationExecutor } from './CustomEventOperationExecutor';
import { IdentityOperationExecutor } from './IdentityOperationExecutor';
import { LoginUserOperationExecutor } from './LoginUserOperationExecutor';
import { RefreshUserOperationExecutor } from './RefreshUserOperationExecutor';
import { SubscriptionOperationExecutor } from './SubscriptionOperationExecutor';
import { UpdateUserOperationExecutor } from './UpdateUserOperationExecutor';

vi.mock('src/shared/libraries/Log');

const JWT = 'header.payload.signature';
const owner = { appId: APP_ID, onesignalId: ONESIGNAL_ID, externalId: EXTERNAL_ID };
const sub = { subscriptionId: SUB_ID, token: 'token', type: SubscriptionType._ChromePush };
const users = `/apps/${APP_ID}/users`;

const setGates = (flagOn: boolean, requirement: JwtRequirementValue) => {
  setFeatureFlags(flagOn ? [FeatureFlag._IdentityVerification] : []);
  setJwtRequirement(requirement);
};

const lastRequest = () => {
  const [headers, url] = requestHeadersFn.mock.calls.at(-1)!;
  return { headers, url };
};

let identity: IdentityOperationExecutor;
let login: LoginUserOperationExecutor;
let refresh: RefreshUserOperationExecutor;
let subscription: SubscriptionOperationExecutor;
let updateUser: UpdateUserOperationExecutor;
let customEvent: CustomEventsOperationExecutor;
let tokens: JwtTokenStore;

// One entry per request path that resolves the alias, the token, or both.
// `path` is the URL tail for the given alias; `null` means the path has no alias.
const paths: {
  name: string;
  run: () => Promise<ExecutionResponse>;
  path: ((alias: string) => string) | null;
}[] = [
  {
    name: 'set alias',
    run: () => identity._execute([new SetAliasOperation({ ...owner, label: 'l', value: 'v' })]),
    path: (alias) => `${users}/by/${alias}/identity`,
  },
  {
    name: 'delete alias',
    run: () => identity._execute([new DeleteAliasOperation({ ...owner, label: 'l' })]),
    path: (alias) => `${users}/by/${alias}/identity/l`,
  },
  {
    name: 'refresh user',
    run: () => refresh._execute([new RefreshUserOperation(APP_ID, ONESIGNAL_ID, EXTERNAL_ID)]),
    path: (alias) => `${users}/by/${alias}`,
  },
  {
    name: 'update user',
    run: () =>
      updateUser._execute([
        new SetPropertyOperation({ ...owner, property: 'language', value: 'fr' }),
      ]),
    path: (alias) => `${users}/by/${alias}`,
  },
  {
    name: 'create subscription',
    run: () => subscription._execute([new CreateSubscriptionOperation({ ...owner, ...sub })]),
    path: (alias) => `${users}/by/${alias}/subscriptions`,
  },
  {
    name: 'transfer subscription',
    run: () =>
      subscription._execute([
        new TransferSubscriptionOperation({ ...owner, subscriptionId: SUB_ID }),
      ]),
    path: () => `/apps/${APP_ID}/subscriptions/${SUB_ID}/owner`,
  },
  {
    name: 'create user',
    run: () => login._execute([new LoginUserOperation(owner)]),
    path: null,
  },
  {
    name: 'custom event',
    run: () =>
      customEvent._execute([
        new TrackCustomEventOperation({
          ...owner,
          timestamp: '2026-01-01T00:00:00.000Z',
          event: { name: 'purchase' },
        }),
      ]),
    path: null,
  },
];

describe('executors under Identity Verification', () => {
  beforeAll(() => {
    TestEnvironment.initialize();
  });

  beforeEach(() => {
    localStorage.clear();
    const director = OneSignal._coreDirector;
    const rebuild = new RebuildUserService(
      director._identityModelStore,
      director._propertiesModelStore,
      director._subscriptionModelStore,
    );
    const newRecords = new NewRecordsState();
    // A new store per test: the store caches tokens in memory, so
    // localStorage.clear() alone would leak a token into the next test.
    tokens = new JwtTokenStore();

    identity = new IdentityOperationExecutor(
      director._identityModelStore,
      rebuild,
      newRecords,
      tokens,
    );
    login = new LoginUserOperationExecutor(
      identity,
      director._identityModelStore,
      director._propertiesModelStore,
      director._subscriptionModelStore,
      tokens,
    );
    refresh = new RefreshUserOperationExecutor(
      director._identityModelStore,
      director._propertiesModelStore,
      director._subscriptionModelStore,
      rebuild,
      newRecords,
      tokens,
    );
    subscription = new SubscriptionOperationExecutor(
      director._subscriptionModelStore,
      rebuild,
      newRecords,
      tokens,
    );
    updateUser = new UpdateUserOperationExecutor(
      director._identityModelStore,
      director._propertiesModelStore,
      rebuild,
      newRecords,
      tokens,
    );
    customEvent = new CustomEventsOperationExecutor(tokens);

    getHandler({
      uri: '*',
      method: 'get',
      status: 200,
      response: { identity: { onesignal_id: ONESIGNAL_ID }, properties: {}, subscriptions: [] },
    });
    getHandler({
      uri: '*',
      method: 'post',
      status: 200,
      response: { identity: { onesignal_id: ONESIGNAL_ID }, subscription: { id: SUB_ID } },
    });
    getHandler({ uri: '*', method: 'patch', status: 200 });
    getHandler({ uri: '*', method: 'delete', status: 200 });
  });

  describe.each(paths)('$name', ({ run, path }) => {
    test('IV active: external_id alias and Authorization: Bearer', async () => {
      setGates(true, JwtRequirement._Required);
      tokens._putJwt(EXTERNAL_ID, JWT);

      const response = await run();

      expect(response._result).toBe(ExecutionResult._Success);
      const { headers, url } = lastRequest();
      expect(headers.authorization).toBe(`Bearer ${JWT}`);
      if (path) expect(url.endsWith(path(`external_id/${EXTERNAL_ID}`))).toBe(true);
    });

    test('IV active with no stored token: external_id alias and no Authorization header', async () => {
      setGates(true, JwtRequirement._Required);

      await run();

      const { headers, url } = lastRequest();
      expect(headers).not.toHaveProperty('authorization');
      if (path) expect(url.endsWith(path(`external_id/${EXTERNAL_ID}`))).toBe(true);
    });

    test('IV inactive: onesignal_id alias and no Authorization header', async () => {
      setGates(false, JwtRequirement._NotRequired);
      tokens._putJwt(EXTERNAL_ID, JWT);

      const response = await run();

      expect(response._result).toBe(ExecutionResult._Success);
      const { headers, url } = lastRequest();
      expect(headers).not.toHaveProperty('authorization');
      if (path) expect(url.endsWith(path(`onesignal_id/${ONESIGNAL_ID}`))).toBe(true);
    });

    test('flag on, requirement off: request identical to legacy', async () => {
      setGates(true, JwtRequirement._NotRequired);
      tokens._putJwt(EXTERNAL_ID, JWT);

      await run();

      const { headers, url } = lastRequest();
      expect(headers).not.toHaveProperty('authorization');
      if (path) expect(url.endsWith(path(`onesignal_id/${ONESIGNAL_ID}`))).toBe(true);
    });
  });

  test('transfer subscription names the new owner by the resolved alias', async () => {
    setTransferSubscriptionResponse();
    const op = new TransferSubscriptionOperation({ ...owner, subscriptionId: SUB_ID });

    setGates(false, JwtRequirement._NotRequired);
    await subscription._execute([op]);
    expect(transferSubscriptionFn).toHaveBeenLastCalledWith({
      identity: { onesignal_id: ONESIGNAL_ID },
    });

    setGates(true, JwtRequirement._Required);
    await subscription._execute([op]);
    expect(transferSubscriptionFn).toHaveBeenLastCalledWith({
      identity: { external_id: EXTERNAL_ID },
    });
  });

  test('IV active with an anonymous op: onesignal_id alias, no header, and an error log', async () => {
    setGates(true, JwtRequirement._Required);
    tokens._putJwt(EXTERNAL_ID, JWT);

    await identity._execute([
      new SetAliasOperation({ appId: APP_ID, onesignalId: ONESIGNAL_ID, label: 'l', value: 'v' }),
    ]);

    const { headers, url } = lastRequest();
    expect(headers).not.toHaveProperty('authorization');
    expect(url.endsWith(`${users}/by/onesignal_id/${ONESIGNAL_ID}/identity`)).toBe(true);
    expect(Log._error).toHaveBeenCalledWith(expect.stringContaining('no externalId'));
  });

  describe('routes the server does not sign', () => {
    // PATCH subscriptions/{id} rejects a bearer; DELETE subscriptions/{id} ignores it.
    beforeEach(() => {
      setGates(true, JwtRequirement._Required);
      tokens._putJwt(EXTERNAL_ID, JWT);
    });

    test('update subscription sends no Authorization header', async () => {
      const response = await subscription._execute([
        new UpdateSubscriptionOperation({ ...owner, ...sub }),
      ]);

      expect(response._result).toBe(ExecutionResult._Success);
      const { headers, url } = lastRequest();
      expect(headers).not.toHaveProperty('authorization');
      expect(url.endsWith(`/apps/${APP_ID}/subscriptions/${SUB_ID}`)).toBe(true);
    });

    test('delete subscription sends no Authorization header', async () => {
      const response = await subscription._execute([
        new DeleteSubscriptionOperation({ ...owner, subscriptionId: SUB_ID }),
      ]);

      expect(response._result).toBe(ExecutionResult._Success);
      const { headers, url } = lastRequest();
      expect(headers).not.toHaveProperty('authorization');
      expect(url.endsWith(`/apps/${APP_ID}/subscriptions/${SUB_ID}`)).toBe(true);
    });
  });

  describe('401 under IV', () => {
    const unauthorized = (method: 'post' | 'patch' | 'delete') =>
      getHandler({ uri: '*', method, status: 401, retryAfter: 15 });

    beforeEach(() => {
      setGates(true, JwtRequirement._Required);
      tokens._putJwt(EXTERNAL_ID, JWT);
    });

    test('signed transfer subscription maps to _FailUnauthorized', async () => {
      unauthorized('patch');
      const response = await subscription._execute([
        new TransferSubscriptionOperation({ ...owner, subscriptionId: SUB_ID }),
      ]);
      expect(lastRequest().headers.authorization).toBe(`Bearer ${JWT}`);
      expect(response).toEqual({
        _result: ExecutionResult._FailUnauthorized,
        _retryAfterSeconds: 15,
      });
    });

    test('signed custom event maps to _FailUnauthorized', async () => {
      unauthorized('post');
      const response = await customEvent._execute([
        new TrackCustomEventOperation({
          ...owner,
          timestamp: '2026-01-01T00:00:00.000Z',
          event: { name: 'purchase' },
        }),
      ]);
      expect(lastRequest().headers.authorization).toBe(`Bearer ${JWT}`);
      expect(response).toEqual({
        _result: ExecutionResult._FailUnauthorized,
        _retryAfterSeconds: 15,
      });
    });

    // These routes carry no token, so a 401 says nothing about the stored JWT
    // and must not reach the unauthorized handler that invalidates it.
    test('unsigned update subscription stays _FailNoretry', async () => {
      unauthorized('patch');
      const response = await subscription._execute([
        new UpdateSubscriptionOperation({ ...owner, ...sub }),
      ]);
      expect(lastRequest().headers).not.toHaveProperty('authorization');
      expect(response).toEqual({ _result: ExecutionResult._FailNoretry });
    });

    test('unsigned delete subscription stays _FailNoretry', async () => {
      unauthorized('delete');
      const response = await subscription._execute([
        new DeleteSubscriptionOperation({ ...owner, subscriptionId: SUB_ID }),
      ]);
      expect(lastRequest().headers).not.toHaveProperty('authorization');
      expect(response).toEqual({ _result: ExecutionResult._FailNoretry });
    });
  });
});
