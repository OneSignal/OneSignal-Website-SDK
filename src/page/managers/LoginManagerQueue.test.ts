import { ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  setupIdentityModel,
  setupPropertiesModel,
  updateIdentityModel,
} from '__test__/support/helpers/setup';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { LoginUserOperationExecutor } from 'src/core/executors/LoginUserOperationExecutor';
import { OP_REPO_EXECUTION_INTERVAL } from 'src/core/operationRepo/constants';
import { ModelChangeTags } from 'src/core/types/models';
import User from 'src/onesignal/User';
import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import { clearAll, db } from 'src/shared/database/client';
import { RetryLimitError } from 'src/shared/errors/common';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import { setFeatureFlags, setJwtRequirement } from 'src/shared/helpers/localStorage';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import LoginManager from './LoginManager';

/*
 * These tests use the real operation queue and answer each request with msw,
 * so the order of the requests is the order that the queue sends them in.
 */

type RecordedRequest = {
  method: string;
  path: string;
  auth: string | null;
  body: Record<string, any>;
};
const recorded: RecordedRequest[] = [];

const recordRequest = async ({ request }: { request: Request }) => {
  const text = await request.clone().text();
  recorded.push({
    method: request.method,
    path: new URL(request.url).pathname.split(/\/apps\/[^/]+/)[1],
    auth: request.headers.get('authorization'),
    body: text ? JSON.parse(text) : {},
  });
};

const onesignalIdOf = (externalId: string) => `os-${externalId}`;

// A request signed with a token that starts with "expired" gets a 401.
const unauthorized = (request: Request) =>
  request.headers.get('authorization')?.startsWith('Bearer expired')
    ? HttpResponse.json({ errors: ['token expired'] }, { status: 401 })
    : undefined;

// The server gives each user a onesignal_id from its external_id, and each new subscription an id.
const handlers = [
  http.post('**/apps/:appId/users', async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const body = (await request.json()) as {
      identity: { external_id: string };
      subscriptions?: { id?: string }[];
    };
    return HttpResponse.json({
      identity: {
        onesignal_id: onesignalIdOf(body.identity.external_id),
        external_id: body.identity.external_id,
      },
      subscriptions: (body.subscriptions ?? []).map((sub, i) => ({
        ...sub,
        id: sub.id ?? `new-sub-${i}`,
      })),
      properties: {},
    });
  }),
  http.get(
    '**/apps/:appId/users/by/external_id/:externalId',
    ({ request, params }) =>
      unauthorized(request) ??
      HttpResponse.json({
        identity: {
          onesignal_id: onesignalIdOf(params.externalId as string),
          external_id: params.externalId,
        },
        subscriptions: [],
        properties: {},
      }),
  ),
  http.patch(
    '**/apps/:appId/users/by/external_id/:externalId',
    ({ request }) => unauthorized(request) ?? HttpResponse.json({}),
  ),
  http.post(
    '**/apps/:appId/users/by/external_id/:externalId/subscriptions',
    ({ request }) =>
      unauthorized(request) ?? HttpResponse.json({ subscription: { id: 'email-sub' } }),
  ),
  http.patch('**/apps/:appId/subscriptions/:id', () => HttpResponse.json({})),
  http.patch('**/apps/:appId/subscriptions/:id/owner', () => HttpResponse.json({})),
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function drainQueue(): Promise<void> {
  const repo = OneSignal._coreDirector._operationRepo;
  await expect.poll(() => repo._queue.length, { interval: 5, timeout: 3000 }).toBe(0);
  await delay(OP_REPO_EXECUTION_INTERVAL * 3);
  expect(repo._queue.length).toBe(0);
}

/** Waits until no new request goes out for 10 queue passes, for 3 seconds at most. */
async function settle(): Promise<void> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const before = recorded.length;
    await delay(OP_REPO_EXECUTION_INTERVAL * 10);
    if (recorded.length === before) return;
  }
  throw new Error('Requests did not stop in 3 seconds');
}

const summary = () =>
  recorded.map(({ method, path, auth }) => `${method} ${path} ${auth?.slice(7) ?? '-'}`);

const tagRequestsFor = (externalId: string) =>
  recorded.filter(
    ({ method, path, body }) =>
      method === 'PATCH' && path === `/users/by/external_id/${externalId}` && body.properties?.tags,
  );

const invalidated: string[] = [];

/** The enabled state of SUB_ID on the server after every recorded request. */
function serverPushEnabled(): boolean | undefined {
  let enabled: boolean | undefined;
  for (const { method, path, body } of recorded) {
    if (method === 'POST' && path === '/users') {
      const sub = body.subscriptions?.find((s: { id?: string }) => s.id === SUB_ID);
      if (sub && 'enabled' in sub) enabled = sub.enabled;
    } else if (method === 'PATCH' && path === `/subscriptions/${SUB_ID}`) {
      enabled = body.subscription.enabled;
    }
  }
  return enabled;
}

/** The external id of the user that owns SUB_ID on the server after every recorded request. */
function serverPushOwner(): string | undefined {
  let owner: string | undefined = 'A';
  for (const { method, path, body } of recorded) {
    if (method === 'POST' && path === '/users') {
      if (body.subscriptions?.some((s: { id?: string }) => s.id === SUB_ID)) {
        owner = body.identity.external_id;
      }
    } else if (method === 'PATCH' && path === `/subscriptions/${SUB_ID}/owner`) {
      owner = body.identity.external_id ?? body.identity.onesignal_id?.replace(/^os-/, '');
    }
  }
  return owner;
}

const requestsFor = (externalId: string) =>
  recorded.filter(
    ({ method, path, body }) =>
      method === 'POST' && path === '/users' && body.identity.external_id === externalId,
  );

describe('LoginManager with the real operation queue under Identity Verification', () => {
  beforeEach(async () => {
    await clearAll();
    localStorage.clear();
    recorded.length = 0;
    invalidated.length = 0;
    server.events.on('request:start', recordRequest);

    TestEnvironment.initialize({ permission: 'granted' });
    setFeatureFlags([FeatureFlag._IdentityVerification]);
    setJwtRequirement(JwtRequirement._Required);
    server.use(...handlers);
    OneSignal._coreDirector._jwtTokenStore._addUserJwtInvalidatedListener(({ externalId }) =>
      invalidated.push(externalId),
    );

    // User A is logged in and owns the push subscription, which is enabled.
    setupIdentityModel(ONESIGNAL_ID);
    updateIdentityModel('external_id', 'A');
    await setupPropertiesModel(ONESIGNAL_ID);
    await setupSubModelStore({ id: SUB_ID, token: 'abc123', onesignalId: ONESIGNAL_ID });
    OneSignal._coreDirector._jwtTokenStore._putJwt('A', 'jwt-a');
  });

  afterEach(() => {
    server.events.removeListener('request:start', recordRequest);
    vi.restoreAllMocks();
  });

  test('login then logout without an await: push ends disabled on the user that logged in', async () => {
    const login = LoginManager.login('B', 'jwt-b');
    const logout = LoginManager.logout();
    await Promise.all([login, logout]);
    await drainQueue();

    expect(requestsFor('B')).toHaveLength(1);
    expect(serverPushOwner()).toBe('B');
    expect(serverPushEnabled()).toBe(false);
  });

  test('logout then login without an await: push ends enabled on the user that logged in', async () => {
    const logout = LoginManager.logout();
    const login = LoginManager.login('C', 'jwt-c');
    await Promise.all([logout, login]);
    await drainQueue();

    expect(requestsFor('C')).toHaveLength(1);
    expect(serverPushOwner()).toBe('C');
    expect(serverPushEnabled()).toBe(true);
  });

  test('a login that waits for a JWT does not block a later login', async () => {
    void LoginManager.login('alice');
    const bob = LoginManager.login('bob', 'jwt-b');

    await expect(Promise.race([bob.then(() => 'done'), delay(5000)])).resolves.toBe('done');
    await expect(
      Promise.race([LoginManager._switchingUsersPromise.then(() => 'done'), delay(1000)]),
    ).resolves.toBe('done');

    expect(requestsFor('alice')).toHaveLength(0);
    expect(requestsFor('bob')).toHaveLength(1);
    expect(serverPushOwner()).toBe('bob');
    expect(serverPushEnabled()).toBe(true);

    // A later token for alice creates her, but the subscription stays with bob.
    OneSignal._coreDirector._jwtTokenStore._putJwt('alice', 'jwt-alice');
    await drainQueue();
    expect(requestsFor('alice')).toHaveLength(1);
    expect(serverPushOwner()).toBe('bob');
  });

  test('a later login creates the new push subscription of a login that waits for a JWT', async () => {
    // A device with no push token: the first login adds a placeholder push model.
    OneSignal._coreDirector._subscriptionModelStore._replaceAll([], ModelChangeTags._Hydrate);
    await db.delete('Options', 'lastPushToken');
    void LoginManager.login('alice');
    await LoginManager.login('bob', 'jwt-b');

    await expect.poll(() => requestsFor('bob').length).toBe(1);
    expect(requestsFor('bob')[0].body.subscriptions).toEqual([
      expect.objectContaining({ type: 'ChromePush' }),
    ]);

    OneSignal._coreDirector._jwtTokenStore._putJwt('alice', 'jwt-alice');
    await drainQueue();
    expect(requestsFor('alice')).toHaveLength(1);
    expect(requestsFor('alice')[0].body.subscriptions ?? []).toEqual([]);
  });

  test('a 401 for one user does not block a later user, and the event names the first user', async () => {
    const user = User._createOrGetInstance();
    void LoginManager.login('alice', 'expired-alice').catch(() => undefined);
    user.addTag('a', '1');
    const bob = LoginManager.login('bob', 'jwt-bob');
    user.addTag('b', '1');
    await bob;
    await settle();

    expect(summary()).toContain('POST /users jwt-bob');
    expect(tagRequestsFor('bob')).toEqual([
      expect.objectContaining({
        auth: 'Bearer jwt-bob',
        body: expect.objectContaining({ properties: { tags: { b: '1' } } }),
      }),
    ]);
    expect(tagRequestsFor('alice')).toHaveLength(0);
    expect(invalidated).toEqual(['alice']);
    expect(OneSignal._coreDirector._getIdentityModel()._externalId).toBe('bob');
  });

  test('updateUserJwt for a user that is not current sends its held operations', async () => {
    const user = User._createOrGetInstance();
    void LoginManager.login('alice', 'expired-alice').catch(() => undefined);
    user.addTag('a', '1');
    await LoginManager.login('bob', 'jwt-bob');
    await settle();
    const signedForAlice = (jwt: string) =>
      requestsFor('alice').filter((r) => r.auth === `Bearer ${jwt}`);
    expect(signedForAlice('expired-alice')).toHaveLength(1);

    await OneSignal.updateUserJwt('alice', 'jwt-alice');
    await drainQueue();

    expect(signedForAlice('expired-alice')).toHaveLength(1);
    expect(signedForAlice('jwt-alice')).toHaveLength(1);
    expect(signedForAlice('jwt-alice')[0].body.subscriptions ?? []).toEqual([]);
    expect(tagRequestsFor('alice')).toEqual([
      expect.objectContaining({
        auth: 'Bearer jwt-alice',
        body: expect.objectContaining({ properties: { tags: { a: '1' } } }),
      }),
    ]);
    expect(serverPushOwner()).toBe('bob');
    expect(OneSignal._coreDirector._getIdentityModel()._externalId).toBe('bob');
  });

  test('logout disables push on the user that logs out, with no anonymous create', async () => {
    await LoginManager.logout();
    await drainQueue();

    // The server rejects a bearer on PATCH subscriptions/{id}, so the SDK does not sign it.
    expect(recorded).toEqual([
      expect.objectContaining({
        method: 'PATCH',
        path: `/subscriptions/${SUB_ID}`,
        auth: null,
        body: { subscription: expect.objectContaining({ enabled: false, notification_types: -2 }) },
      }),
    ]);
  });

  test('user data after a logout sends no request and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await LoginManager.logout();
    await drainQueue();
    recorded.length = 0;

    const user = User._createOrGetInstance();
    user.addTag('k', 'v');
    user.addEmail('anon@example.com');
    await settle();

    expect(recorded).toEqual([]);
    expect(OneSignal._coreDirector._operationRepo._queue).toEqual([]);
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      expect.stringContaining('set-property was dropped'),
      expect.stringContaining('create-subscription was dropped'),
    ]);
  });

  test('logout then login: the user that logs in gets push, and no data from the logout', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await LoginManager.logout();
    const user = User._createOrGetInstance();
    user.addTag('k', 'v');
    user.addEmail('anon@example.com');
    await drainQueue();
    recorded.length = 0;

    await LoginManager.login('bob', 'jwt-bob');
    await drainQueue();

    // The create batch has the transfer and the push state sync, so no separate request goes out.
    expect(summary()).toEqual(['POST /users jwt-bob', 'GET /users/by/external_id/bob jwt-bob']);
    expect(requestsFor('bob')[0].body.subscriptions).toEqual([
      expect.objectContaining({ id: SUB_ID, enabled: true }),
    ]);
    expect(tagRequestsFor('bob')).toHaveLength(0);
  });

  test('addEmail while the login request is in flight: the retry sends the email with the user create', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(
        '**/apps/:appId/users',
        async () => {
          await held;
          return HttpResponse.json({}, { status: 500 });
        },
        { once: true },
      ),
    );

    void LoginManager.login('bob', 'jwt-bob');
    await expect.poll(() => requestsFor('bob').length, { interval: 5 }).toBe(1);
    User._createOrGetInstance().addEmail('bob@example.com');
    expect(OneSignal._coreDirector._operationRepo._queue.map((op) => op.operation._name)).toEqual([
      'create-subscription',
    ]);
    release();
    await settle();

    expect(requestsFor('bob')).toHaveLength(2);
    expect(requestsFor('bob')[1].body.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'Email', token: 'bob@example.com' }),
      ]),
    );
    expect(OneSignal._coreDirector._operationRepo._queue).toEqual([]);
  });

  test('addEmail after the login request gets no answer: the retry sends 1 user create with the email', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(LoginUserOperationExecutor.prototype, '_execute').mockRejectedValueOnce(
      RetryLimitError,
    );

    await expect(LoginManager.login('bob', 'jwt-bob')).rejects.toThrow();
    const repo = OneSignal._coreDirector._operationRepo;
    expect(repo._queue[0].operation._name).toBe('login-user');
    User._createOrGetInstance().addEmail('bob@example.com');
    expect(repo._queue.filter((op) => op.operation._name === 'login-user')).toHaveLength(1);
    await settle();

    expect(requestsFor('bob')).toHaveLength(1);
    expect(requestsFor('bob')[0].body.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'Email', token: 'bob@example.com' }),
      ]),
    );
    expect(repo._queue).toEqual([]);
    expect(await db.getAll('operations')).toEqual([]);
  });
});
