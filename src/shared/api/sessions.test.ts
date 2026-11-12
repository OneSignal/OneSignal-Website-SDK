import { APP_ID } from '__test__/constants';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { createSession, updateSession } from './sessions';
import type { CreateSessionRequest, UpdateSessionRequest } from './sessions';

vi.mock('../libraries/Log');
vi.mock('../helpers/general', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../helpers/general')>()),
  delay: () => Promise.resolve(),
}));

const SESSION_ID = '0190a5b6-6c3e-7a1b-8c2d-3e4f5a6b7c8d';

const createRequest: CreateSessionRequest = {
  onesignalId: 'onesignal-id',
  subscriptionId: 'subscription-id',
  subscriptionType: 'ChromePush',
  startTime: 1_700_000_000_000,
  idempotencyKey: 'create-key',
};

const updateRequest: UpdateSessionRequest = {
  onesignalId: 'onesignal-id',
  subscriptionId: 'subscription-id',
  durationSeconds: 42,
  idempotencyKey: 'update-key',
};

let requestBody: unknown;

function mockCreate(response: () => Response) {
  server.use(
    http.post('**/apps/:appId/sessions', async ({ request }) => {
      requestBody = await request.json();
      return response();
    }),
  );
}

function mockUpdate(response: () => Response) {
  server.use(
    http.patch('**/apps/:appId/sessions/:sessionId', async ({ request }) => {
      requestBody = await request.json();
      return response();
    }),
  );
}

function mockBoth(response: () => Response) {
  mockCreate(response);
  mockUpdate(response);
}

const accepted = () => HttpResponse.json({ data: { session_id: SESSION_ID } }, { status: 202 });

describe('Sessions API', () => {
  beforeEach(() => {
    requestBody = undefined;
  });

  describe('createSession', () => {
    test('posts the request body', async () => {
      let url = '';
      server.use(
        http.post('**/apps/:appId/sessions', async ({ request }) => {
          url = request.url;
          requestBody = await request.json();
          return accepted();
        }),
      );

      await createSession(APP_ID, createRequest);

      expect(url).toMatch(new RegExp(`/apps/${APP_ID}/sessions$`));
      expect(requestBody).toEqual({
        onesignal_id: 'onesignal-id',
        subscription_id: 'subscription-id',
        subscription_type: 'ChromePush',
        start_time: '2023-11-14T22:13:20.000Z',
        idempotency_key: 'create-key',
      });
    });

    test('includes direct attribution when set', async () => {
      mockCreate(accepted);

      await createSession(APP_ID, { ...createRequest, directAttributionId: 'notification-id' });

      expect(requestBody).toMatchObject({ direct_attribution_id: 'notification-id' });
    });

    test('returns the session id from a 202', async () => {
      mockCreate(accepted);

      expect(await createSession(APP_ID, createRequest)).toEqual({
        kind: 'success',
        value: SESSION_ID,
      });
    });

    test.each([
      {},
      { data: {} },
      { data: { session_id: '' } },
      { data: { session_id: null } },
      { data: { session_id: 123 } },
      { data: SESSION_ID },
    ])('retries a 202 without a session id: %j', async (body) => {
      mockCreate(() => HttpResponse.json(body, { status: 202 }));

      expect(await createSession(APP_ID, createRequest)).toEqual({ kind: 'retry', status: 202 });
    });
  });

  describe('updateSession', () => {
    test('patches the request body', async () => {
      let url = '';
      server.use(
        http.patch('**/apps/:appId/sessions/:sessionId', async ({ request }) => {
          url = request.url;
          requestBody = await request.json();
          return HttpResponse.json({}, { status: 202 });
        }),
      );

      const result = await updateSession(APP_ID, SESSION_ID, updateRequest);

      expect(result).toEqual({ kind: 'success', value: undefined });
      expect(url).toMatch(new RegExp(`/apps/${APP_ID}/sessions/${SESSION_ID}$`));
      expect(requestBody).toEqual({
        onesignal_id: 'onesignal-id',
        subscription_id: 'subscription-id',
        duration_seconds: 42,
        idempotency_key: 'update-key',
      });
    });

    test('includes end time when set', async () => {
      mockUpdate(() => HttpResponse.json({}, { status: 202 }));

      await updateSession(APP_ID, SESSION_ID, { ...updateRequest, endTime: 1_700_000_042_500 });

      expect(requestBody).toMatchObject({ end_time: '2023-11-14T22:14:02.500Z' });
    });
  });

  describe('failures', () => {
    const create = () => createSession(APP_ID, createRequest);
    const update = () => updateSession(APP_ID, SESSION_ID, updateRequest);

    test.each([408, 429, 500, 502, 503])('retries a %i', async (status) => {
      mockBoth(() => HttpResponse.json({ errors: [] }, { status }));

      expect(await create()).toEqual({ kind: 'retry', status });
      expect(await update()).toEqual({ kind: 'retry', status });
    });

    test.each([400, 401, 403, 404, 409, 422])('drops a %i', async (status) => {
      mockBoth(() =>
        HttpResponse.json({ errors: [] }, { status, headers: { 'Retry-After': '10' } }),
      );

      expect(await create()).toEqual({ kind: 'drop', status });
      expect(await update()).toEqual({ kind: 'drop', status });
    });

    test('passes Retry-After through on a retry', async () => {
      mockBoth(() =>
        HttpResponse.json({ errors: [] }, { status: 503, headers: { 'Retry-After': '75' } }),
      );

      const expected = { kind: 'retry', status: 503, retryAfterSeconds: 75 };
      expect(await create()).toEqual(expected);
      expect(await update()).toEqual(expected);
    });

    test('ignores a Retry-After that is not a number of seconds', async () => {
      mockBoth(() =>
        HttpResponse.json(
          { errors: [] },
          { status: 503, headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } },
        ),
      );

      expect(await create()).toEqual({ kind: 'retry', status: 503 });
      expect(await update()).toEqual({ kind: 'retry', status: 503 });
    });

    test('retries a network failure', async () => {
      mockBoth(() => HttpResponse.error());

      expect(await create()).toEqual({ kind: 'retry' });
      expect(await update()).toEqual({ kind: 'retry' });
    });

    test('retries a response that is not JSON', async () => {
      mockBoth(() => new HttpResponse('<html>Bad Gateway</html>', { status: 502 }));

      expect(await create()).toEqual({ kind: 'retry' });
      expect(await update()).toEqual({ kind: 'retry' });
    });

    test('drops a request without a valid app id', async () => {
      expect(await createSession('not-an-app-id', createRequest)).toEqual({ kind: 'drop' });
      expect(await updateSession('not-an-app-id', SESSION_ID, updateRequest)).toEqual({
        kind: 'drop',
      });
    });
  });
});
