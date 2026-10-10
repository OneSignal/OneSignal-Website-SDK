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

  const userPath = (id: string) => ['apps', APP_ID, 'users', 'by', 'onesignal_id', id];
  const userUrl = (encodedId: string) =>
    `${API_BASE}apps/${APP_ID}/users/by/onesignal_id/${encodedId}`;

  test('encodes RFC 3986 reserved characters within a single segment', async () => {
    await OneSignalApiBase.get(userPath('foo bar'));
    expect(lastFetchUrl()).toBe(userUrl('foo%20bar'));
  });

  test('encodes ? and # so segments cannot become a query or fragment', async () => {
    await OneSignalApiBase.get(userPath('a?b#c'));
    expect(lastFetchUrl()).toBe(userUrl('a%3Fb%23c'));
  });

  test('encodes RFC 3986 sub-delims that encodeURIComponent leaves alone', async () => {
    await OneSignalApiBase.get(userPath("x!'()*y"));
    expect(lastFetchUrl()).toBe(userUrl('x%21%27%28%29%2Ay'));
  });

  test('encodes ASCII control characters', async () => {
    await OneSignalApiBase.get(userPath('null\x00here'));
    expect(lastFetchUrl()).toBe(userUrl('null%00here'));
  });

  test('joins segments with / and leaves URL-safe segments unchanged', async () => {
    await OneSignalApiBase.get(userPath('01234abcd-EFGH_56.78~'));
    expect(lastFetchUrl()).toBe(userUrl('01234abcd-EFGH_56.78~'));
  });

  test('encodes / inside a segment so the value stays one segment', async () => {
    await OneSignalApiBase.get(userPath('org/123'));
    expect(lastFetchUrl()).toBe(userUrl('org%2F123'));
  });

  test('a /../ inside a segment cannot climb out of the segment', async () => {
    await OneSignalApiBase.get([...userPath('a/../b'), 'identity']);
    expect(lastFetchUrl()).toBe(`${userUrl('a%2F..%2Fb')}/identity`);
  });

  test('encodes percent signs so callers cannot smuggle in pre-encoded sequences', async () => {
    await OneSignalApiBase.get(userPath('already%20encoded'));
    expect(lastFetchUrl()).toBe(userUrl('already%2520encoded'));
  });
});
