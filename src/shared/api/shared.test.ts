import { APP_ID } from '__test__/constants';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { describe, expect, test, vi } from 'vite-plus/test';

import Log from '../libraries/Log';
import * as OneSignalApiShared from './shared';

const LogErrorSpy = vi.spyOn(Log, '_error').mockImplementation(() => '');

describe('OneSignalApiShared', () => {
  test('can send outcome  ', async () => {
    server.use(http.post('**/outcomes/measure', () => HttpResponse.json({})));
    await OneSignalApiShared.sendOutcome({
      app_id: APP_ID,
      id: 'test',
    });
    expect(LogErrorSpy).not.toHaveBeenCalled();
  });

  test.each([
    ['an error status', () => HttpResponse.text('<html>Bad Request</html>', { status: 400 })],
    ['no response', () => HttpResponse.error()],
  ])('logs a send outcome error on %s', async (_, response) => {
    LogErrorSpy.mockClear();
    server.use(http.post('**/outcomes/measure', response));

    await OneSignalApiShared.sendOutcome({
      app_id: APP_ID,
      id: 'test',
    });

    expect(LogErrorSpy).toHaveBeenCalled();
  });
});
