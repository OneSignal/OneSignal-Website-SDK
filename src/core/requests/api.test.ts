import { APP_ID, EXTERNAL_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { getHandler, requestHeadersFn } from '__test__/support/helpers/requests';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { beforeEach, describe, expect, test } from 'vite-plus/test';

import { IdentityConstants } from '../constants';
import type { AliasPair, RequestMetadata } from '../types/api';
import {
  addAlias,
  createNewUser,
  createSubscriptionByAlias,
  deleteAlias,
  deleteUserByAlias,
  getUserByAlias,
  getUserIdentity,
  sendCustomEvent,
  transferSubscriptionById,
  updateUserByAlias,
} from './api';

const JWT = 'header.payload.signature';
const alias = { label: IdentityConstants._ExternalID, id: EXTERNAL_ID };
const subscription = { token: 'token', type: SubscriptionType._ChromePush };
const event = { name: 'purchase', timestamp: '2026-01-01T00:00:00.000Z', payload: {} };

// [name, call] for every user-scoped endpoint that forwards the token.
const endpoints: [string, (metadata: RequestMetadata) => Promise<unknown>][] = [
  ['createNewUser', (m) => createNewUser(m, { identity: {} })],
  ['getUserByAlias', (m) => getUserByAlias(m, alias)],
  ['updateUserByAlias', (m) => updateUserByAlias(m, alias, {})],
  ['deleteUserByAlias', (m) => deleteUserByAlias(m, alias)],
  ['addAlias', (m) => addAlias(m, alias, { external_id: EXTERNAL_ID })],
  ['getUserIdentity', (m) => getUserIdentity(m, alias)],
  ['deleteAlias', (m) => deleteAlias(m, alias, IdentityConstants._ExternalID)],
  ['createSubscriptionByAlias', (m) => createSubscriptionByAlias(m, alias, { subscription })],
  [
    'transferSubscriptionById',
    (m) => transferSubscriptionById(m, SUB_ID, { onesignal_id: ONESIGNAL_ID }),
  ],
  ['sendCustomEvent', (m) => sendCustomEvent(m, event)],
];

const sentHeaders = () => requestHeadersFn.mock.calls[0][0];
const sentUrl = () => requestHeadersFn.mock.calls[0][1];

const mockAllMethods = () => {
  for (const method of ['get', 'post', 'patch', 'delete'] as const) {
    getHandler({ uri: '*', method, status: 200 });
  }
};

// [name, call, path after the alias id] for every endpoint that addresses the user by alias.
const aliasEndpoints: [string, (alias: AliasPair) => Promise<unknown>, string][] = [
  ['getUserByAlias', (a) => getUserByAlias({ appId: APP_ID }, a), ''],
  ['updateUserByAlias', (a) => updateUserByAlias({ appId: APP_ID }, a, {}), ''],
  ['deleteUserByAlias', (a) => deleteUserByAlias({ appId: APP_ID }, a), ''],
  ['addAlias', (a) => addAlias({ appId: APP_ID }, a, { external_id: EXTERNAL_ID }), '/identity'],
  ['getUserIdentity', (a) => getUserIdentity({ appId: APP_ID }, a), '/identity'],
  ['deleteAlias', (a) => deleteAlias({ appId: APP_ID }, a, 'label'), '/identity/label'],
  [
    'createSubscriptionByAlias',
    (a) => createSubscriptionByAlias({ appId: APP_ID }, a, { subscription }),
    '/subscriptions',
  ],
];

describe('alias id as one path segment', () => {
  beforeEach(mockAllMethods);

  describe.each(aliasEndpoints)('%s', (_, call, suffix) => {
    test.each([
      ['org/123', 'org%2F123'],
      ['a?b', 'a%3Fb'],
      ['a#b', 'a%23b'],
    ])('an externalId of %s addresses external_id/%s', async (externalId, encoded) => {
      await call({ label: IdentityConstants._ExternalID, id: externalId });

      expect(requestHeadersFn).toHaveBeenCalledTimes(1);
      expect(sentUrl().endsWith(`/apps/${APP_ID}/users/by/external_id/${encoded}${suffix}`)).toBe(
        true,
      );
    });
  });

  // The public removeAlias rejects a / before this layer; this checks the request layer alone.
  test('deleteAlias encodes a label with / as one segment', async () => {
    await deleteAlias({ appId: APP_ID }, alias, 'a/b');

    expect(sentUrl().endsWith(`/users/by/external_id/${EXTERNAL_ID}/identity/a%2Fb`)).toBe(true);
  });
});

describe('request metadata to headers', () => {
  beforeEach(mockAllMethods);

  describe.each(endpoints)('%s', (_, call) => {
    test('sets Authorization: Bearer when a jwt is given', async () => {
      const response = await call({ appId: APP_ID, jwt: JWT });

      expect(response).toMatchObject({ ok: true, status: 200 });
      expect(requestHeadersFn).toHaveBeenCalledTimes(1);
      expect(sentHeaders()).toMatchObject({ authorization: `Bearer ${JWT}` });
    });

    test('sends no Authorization header when there is no jwt', async () => {
      await call({ appId: APP_ID });

      expect(requestHeadersFn).toHaveBeenCalledTimes(1);
      expect(sentHeaders()).not.toHaveProperty('authorization');
    });
  });

  test('the subscription id header and the bearer travel together', async () => {
    await createNewUser({ appId: APP_ID, subscriptionId: SUB_ID, jwt: JWT }, { identity: {} });

    expect(sentHeaders()).toMatchObject({
      'onesignal-subscription-id': SUB_ID,
      authorization: `Bearer ${JWT}`,
    });
  });

  test('a GET with a jwt sends no body', async () => {
    let body: string | null = 'unread';
    getHandler({
      uri: '*',
      method: 'get',
      status: 200,
      callback: (data) => {
        body = data == null ? null : JSON.stringify(data);
      },
    });

    await getUserByAlias({ appId: APP_ID, jwt: JWT }, alias);

    expect(body).toBeNull();
    expect(sentHeaders()).toMatchObject({ authorization: `Bearer ${JWT}` });
  });
});
