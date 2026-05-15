import { APP_ID } from '__test__/constants';
import { nock } from '__test__/support/helpers/general';
import * as OneSignalApiBase from 'src/shared/api/base';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

const API_BASE = 'https://onesignal.com/api/v1/';

const lastFetchUrl = (): string => {
  const calls = vi.mocked(window.fetch).mock.calls;
  const input = calls[calls.length - 1][0];
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

describe('OneSignalApiBase URL encoding', () => {
  beforeEach(() => {
    nock({});
  });

  test('encodes RFC 3986 reserved characters within a single segment', async () => {
    await OneSignalApiBase.get(`apps/${APP_ID}/users/by/onesignal_id/foo bar`);
    expect(lastFetchUrl()).toBe(`${API_BASE}apps/${APP_ID}/users/by/onesignal_id/foo%20bar`);
  });

  test('encodes ? and # so segments cannot become a query or fragment', async () => {
    await OneSignalApiBase.get(`apps/${APP_ID}/users/by/onesignal_id/a?b#c`);
    expect(lastFetchUrl()).toBe(`${API_BASE}apps/${APP_ID}/users/by/onesignal_id/a%3Fb%23c`);
  });

  test('encodes RFC 3986 sub-delims that encodeURIComponent leaves alone', async () => {
    await OneSignalApiBase.get(`apps/${APP_ID}/users/by/onesignal_id/x!'()*y`);
    expect(lastFetchUrl()).toBe(
      `${API_BASE}apps/${APP_ID}/users/by/onesignal_id/x%21%27%28%29%2Ay`,
    );
  });

  test('encodes ASCII control characters', async () => {
    await OneSignalApiBase.get(`apps/${APP_ID}/users/by/onesignal_id/null\x00here`);
    expect(lastFetchUrl()).toBe(`${API_BASE}apps/${APP_ID}/users/by/onesignal_id/null%00here`);
  });

  test('preserves / as the path separator and leaves URL-safe segments byte-identical', async () => {
    const action = `apps/${APP_ID}/users/by/onesignal_id/01234abcd-EFGH_56.78~`;
    await OneSignalApiBase.get(action);
    expect(lastFetchUrl()).toBe(`${API_BASE}${action}`);
  });

  test('encodes percent signs so callers cannot smuggle in pre-encoded sequences', async () => {
    await OneSignalApiBase.get(`apps/${APP_ID}/users/by/onesignal_id/already%20encoded`);
    expect(lastFetchUrl()).toBe(
      `${API_BASE}apps/${APP_ID}/users/by/onesignal_id/already%2520encoded`,
    );
  });
});
