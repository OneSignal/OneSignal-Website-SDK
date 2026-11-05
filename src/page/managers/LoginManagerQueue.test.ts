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
import { OP_REPO_EXECUTION_INTERVAL } from 'src/core/operationRepo/constants';
import { ModelChangeTags } from 'src/core/types/models';
import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import { clearAll, db } from 'src/shared/database/client';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import { setFeatureFlags, setJwtRequirement } from 'src/shared/helpers/localStorage';
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test';

import LoginManager from './LoginManager';

/*
 * These tests use the real operation queue and answer each request with msw,
 * so the order of the requests is the order that the queue sends them in.
 */

type RecordedRequest = { method: string; path: string; body: Record<string, any> };
const recorded: RecordedRequest[] = [];

const recordRequest = async ({ request }: { request: Request }) => {
  const text = await request.clone().text();
  recorded.push({
    method: request.method,
    path: new URL(request.url).pathname.split(/\/apps\/[^/]+/)[1],
    body: text ? JSON.parse(text) : {},
  });
};

const onesignalIdOf = (externalId: string) => `os-${externalId}`;

// The server gives each user a onesignal_id from its external_id, and each new subscription an id.
const handlers = [
  http.post('**/apps/:appId/users', async ({ request }) => {
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
  http.get('**/apps/:appId/users/by/external_id/:externalId', ({ params }) =>
    HttpResponse.json({
      identity: {
        onesignal_id: onesignalIdOf(params.externalId as string),
        external_id: params.externalId,
      },
      subscriptions: [],
      properties: {},
    }),
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
    if (method !== 'POST' || path !== '/users') continue;
    if (body.subscriptions?.some((s: { id?: string }) => s.id === SUB_ID)) {
      owner = body.identity.external_id;
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
    server.events.on('request:start', recordRequest);

    TestEnvironment.initialize({ permission: 'granted' });
    setFeatureFlags([FeatureFlag._IdentityVerification]);
    setJwtRequirement(JwtRequirement._Required);
    server.use(...handlers);

    // User A is logged in and owns the push subscription, which is enabled.
    setupIdentityModel(ONESIGNAL_ID);
    updateIdentityModel('external_id', 'A');
    await setupPropertiesModel(ONESIGNAL_ID);
    await setupSubModelStore({ id: SUB_ID, token: 'abc123', onesignalId: ONESIGNAL_ID });
    OneSignal._coreDirector._jwtTokenStore._putJwt('A', 'jwt-a');
  });

  afterEach(() => {
    server.events.removeListener('request:start', recordRequest);
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
});
