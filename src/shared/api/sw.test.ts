import { APP_ID } from '__test__/constants';
import { nock } from '__test__/support/helpers/general';
import { describe, expect, test } from 'vite-plus/test';

import * as OneSignalApiSW from './sw';

// Temporary, can remove when adding new tests to ServiceWorker.test.ts
describe('OneSignalApiSW', () => {
  test('downloadServerAppConfig', async () => {
    nock({});
    const appConfig = await OneSignalApiSW.downloadSWServerAppConfig(APP_ID);
    expect(appConfig).toBeDefined();
  });

  test('downloadServerAppConfig rejects a response without a JSON body', async () => {
    nock(undefined);
    await expect(OneSignalApiSW.downloadSWServerAppConfig(APP_ID)).rejects.toThrow();
  });
});
