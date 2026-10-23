import { ONESIGNAL_ID, SUB_ID, SUB_ID_2 } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  setAddAliasResponse,
  setCreateSubscriptionResponse,
  setCreateUserResponse,
  setTransferSubscriptionResponse,
  setUpdateSubscriptionResponse,
  setUpdateUserResponse,
} from '__test__/support/helpers/requests';
import {
  getRawPushSubscription,
  setupIdentityModel,
  setupPropertiesModel,
} from '__test__/support/helpers/setup';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import { server } from '__test__/support/mocks/server';
import { isIvBehaviorActive, isIvCodePathEnabled } from 'src/core/identityVerification';
import { OP_REPO_EXECUTION_INTERVAL } from 'src/core/operationRepo/constants';
import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import { clearAll } from 'src/shared/database/client';
import { setPushToken } from 'src/shared/database/subscription';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import { setFeatureFlags, setJwtRequirement } from 'src/shared/helpers/localStorage';
import { IDManager } from 'src/shared/managers/IDManager';
import { SubscriptionManagerPage } from 'src/shared/managers/subscription/page';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

/*
 * Phase 3 of the rollout is: feature flag on, requirement not required. Every
 * customer without Identity Verification runs in this state, so the new code
 * paths must send exactly the requests the legacy path sends.
 *
 * The recorder reads MSW's life-cycle events, so it sees every request the SDK
 * sends, not only the ones a handler answers.
 */

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});

vi.spyOn(SubscriptionManagerPage.prototype, '_subscribeFcmFromPage').mockImplementation(() =>
  Promise.resolve(getRawPushSubscription()),
);

type RecordedRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
};

const recorded: RecordedRequest[] = [];
const recordRequest = async ({ request }: { request: Request }) => {
  recorded.push({
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers),
    body: await request.clone().text(),
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The queue is empty while a group is in flight, and a response can enqueue a
// follow-up. Wait for an empty queue that stays empty for 5 passes with no new request.
async function drainQueue(): Promise<void> {
  const repo = OneSignal._coreDirector._operationRepo;
  for (;;) {
    const before = recorded.length;
    await expect.poll(() => repo._queue.length, { interval: 5 }).toBe(0);
    await delay(OP_REPO_EXECUTION_INTERVAL * 5);
    if (repo._queue.length === 0 && recorded.length === before) return;
  }
}

// A fresh install: anonymous local user, permission granted, no push subscription yet.
async function setupSession({ flagOn }: { flagOn: boolean }): Promise<void> {
  await clearAll();
  localStorage.clear();
  recorded.length = 0;

  TestEnvironment.initialize({ initUserAndPushSubscription: true, permission: 'granted' });
  await setupPropertiesModel();
  setupIdentityModel(IDManager._createLocalId());
  await setPushToken('');
  setFeatureFlags(flagOn ? [FeatureFlag._IdentityVerification] : []);
  setJwtRequirement(JwtRequirement._NotRequired);

  setCreateUserResponse({ onesignalId: ONESIGNAL_ID, subscriptions: [{ id: SUB_ID }] });
  setUpdateSubscriptionResponse({ subscriptionId: SUB_ID });
  setAddAliasResponse();
  setTransferSubscriptionResponse();
  setUpdateUserResponse();
  setCreateSubscriptionResponse({ response: { id: SUB_ID_2 } });
}

// The push subscribe runs outside the operation queue until the token arrives,
// so the step waits for the public change event before the queue drain.
async function subscribeToPush(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  OneSignal.User.PushSubscription.addEventListener('change', () => resolve());
  void registerForPushNotifications();
  await promise;
}

const sessionSteps: (() => void | Promise<unknown>)[] = [
  () => subscribeToPush(),
  () => OneSignal.login('jd-1'),
  () => OneSignal.User.addTag('plan', 'pro'),
  () => OneSignal.User.addEmail('jd-1@example.com'),
  () => OneSignal.logout(),
];

async function runSession(): Promise<RecordedRequest[]> {
  for (const step of sessionSteps) {
    await step();
    await drainQueue();
  }
  return [...recorded];
}

const EXPECTED_REQUESTS = [
  ['POST', 'users'],
  ['PATCH', `users/by/onesignal_id/${ONESIGNAL_ID}/identity`],
  ['PATCH', `subscriptions/${SUB_ID}/owner`],
  ['PATCH', `users/by/onesignal_id/${ONESIGNAL_ID}`],
  ['POST', `users/by/onesignal_id/${ONESIGNAL_ID}/subscriptions`],
  ['POST', 'users'],
];

const methodAndPath = (requests: RecordedRequest[]) =>
  requests.map((r) => [r.method, r.url.split('/api/v1/apps/')[1].split('/').slice(1).join('/')]);

describe('Identity Verification phase 3 parity', () => {
  beforeEach(() => {
    server.events.on('request:start', recordRequest);
  });

  afterEach(() => {
    server.events.removeListener('request:start', recordRequest);
  });

  test('flag on with the requirement off sends the same requests as the flag off', async () => {
    await setupSession({ flagOn: false });
    expect(isIvCodePathEnabled()).toBe(false);
    const legacy = await runSession();
    expect(methodAndPath(legacy)).toEqual(EXPECTED_REQUESTS);

    await setupSession({ flagOn: true });
    expect(isIvCodePathEnabled()).toBe(true);
    expect(isIvBehaviorActive()).toBe(false);
    const phase3 = await runSession();

    expect(phase3).toEqual(legacy);
  });

  test('requirement unknown holds every request until the config resolves', async () => {
    await setupSession({ flagOn: true });
    // A returning subscriber whose page calls the SDK before the config resolves.
    setupIdentityModel();
    await setupSubModelStore({ id: SUB_ID, token: 'abc123' });
    setJwtRequirement(JwtRequirement._Unknown);

    const login = OneSignal.login('jd-1');
    OneSignal.User.addTag('plan', 'pro');
    OneSignal.User.addEmail('jd-1@example.com');
    // 5 queue passes go by with the requirement unknown; every operation stays held.
    await delay(OP_REPO_EXECUTION_INTERVAL * 5);
    expect(recorded).toEqual([]);
    expect(OneSignal._coreDirector._operationRepo._queue.length).toBeGreaterThan(0);

    // A stored token must not reach a request while the requirement is not required.
    OneSignal._coreDirector._jwtTokenStore._putJwt('jd-1', 'stored-token');
    setJwtRequirement(JwtRequirement._NotRequired);
    await login;
    await drainQueue();
    // Order-free: the queue schedule is not under test here, only that every
    // held operation goes out unsigned once the requirement is known.
    const sent = methodAndPath(recorded);
    expect(sent).toHaveLength(4);
    expect(sent).toEqual(
      expect.arrayContaining([
        ['PATCH', `users/by/onesignal_id/${ONESIGNAL_ID}/identity`],
        ['PATCH', `users/by/onesignal_id/${ONESIGNAL_ID}`],
        ['POST', `users/by/onesignal_id/${ONESIGNAL_ID}/subscriptions`],
        ['PATCH', `subscriptions/${SUB_ID}/owner`],
      ]),
    );
    recorded.forEach((request) => expect(request.headers.authorization).toBeUndefined());
    expect(OneSignal._coreDirector._jwtTokenStore._getJwt('jd-1')).toBe('stored-token');
  });
});
