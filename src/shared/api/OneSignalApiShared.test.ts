import { APP_ID } from '__test__/constants';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import Log from '../libraries/Log';
import OneSignalApiShared from './OneSignalApiShared';

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

  test('can handle send outcome error', async () => {
    server.use(http.post('**/outcomes/measure', () => HttpResponse.text('')));

    await OneSignalApiShared.sendOutcome({
      app_id: APP_ID,
      id: 'test',
    });

    expect(LogErrorSpy).toHaveBeenCalled();
  });
});
