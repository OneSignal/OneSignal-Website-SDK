import { APP_ID } from '__test__/support/constants';
import { nock } from '__test__/support/helpers/general';
import { OneSignalApiSW } from './OneSignalApiSW';

// Temporary, can remove when adding new tests to ServiceWorker.test.ts
describe('OneSignalApiSW', () => {
  test('downloadServerAppConfig', async () => {
    nock({});
    const appConfig = await OneSignalApiSW.downloadServerAppConfig(APP_ID);
    expect(appConfig).toBeDefined();
  });
});
