import { APP_ID } from '__test__/constants';
import { nock } from '__test__/support/helpers/general';
import { describe, expect, test } from 'vite-plus/test';

import { downloadServerAppConfig } from './page';

describe('downloadServerAppConfig', () => {
  test('resolves with the config on success', async () => {
    const fetchSpy = nock({ success: true, app_id: APP_ID });

    await expect(downloadServerAppConfig(APP_ID)).resolves.toEqual({
      success: true,
      app_id: APP_ID,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`sync/${APP_ID}/web`),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('rejects with the response body when success is false', async () => {
    nock({ success: false, code: 2 });

    await expect(downloadServerAppConfig(APP_ID)).rejects.toEqual({ success: false, code: 2 });
  });
});
