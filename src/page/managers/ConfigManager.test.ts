import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import OneSignalApi from 'src/shared/api/OneSignalApi';
import { ConfigIntegrationKind } from 'src/shared/models/AppConfig';
import ConfigManager from './ConfigManager';
vi.useFakeTimers();

const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind.Custom,
);
server.use(http.get('**/sync/*/web', () => HttpResponse.json(serverConfig)));
vi.spyOn(OneSignalApi, 'jsonpLib').mockImplementation((url, fn) => {
  fetch(url).then((res) => {
    res.json().then((data) => {
      fn(null, data);
    });
  });
});

delete (window as any).location;
(window as any).location = {
  ...window.location,
  origin: 'https://localhost:3001',
};

describe('ConfigManager', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  test('can get app config', async () => {
    const configManager = new ConfigManager();

    const userConfig = {
      ...TestContext.getFakeAppUserConfig(),
      subdomainName: '',
    };
    const config = await configManager.getAppConfig(userConfig);
    const mergedConfig = configManager.getMergedConfig(
      userConfig,
      serverConfig,
    );

    expect(config).toEqual(mergedConfig);
  });
});
