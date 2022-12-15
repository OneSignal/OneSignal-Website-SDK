import '../../support/polyfills/polyfills';
import anyTest, { TestInterface } from 'ava';
import { ConfigIntegrationKind, ServerAppConfig } from '../../../src/shared/models/AppConfig';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import ConfigManager from '../../../src/page/managers/ConfigManager';

interface ConfigContext {
  overrideServerConfig: ServerAppConfig;
}

const test = anyTest as TestInterface<ConfigContext>;

test.beforeEach(t => {
  t.context.overrideServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
});

test('should assign the default service worker file path if not provided', async t => {
  const result = new ConfigManager().getMergedConfig(
    {},
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.is(result.userConfig.path, '/');
});

test('should not overwrite a provided service worker parameters', async t => {
  const result = new ConfigManager().getMergedConfig(
    {
      path: '/existing-path',
      serviceWorkerParam: { scope: '/existing-path' },
      serviceWorkerPath: '/existing-path/OneSignalSDK.sw.js',
    },
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.is(result.userConfig.path, '/existing-path');
  t.deepEqual(result.userConfig.serviceWorkerParam, { scope: '/existing-path' });
  t.is(result.userConfig.serviceWorkerPath, '/existing-path/OneSignalSDK.sw.js');
});

test('should assign the default service worker registration params if not provided', async t => {
  const result = new ConfigManager().getMergedConfig(
    {},
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.deepEqual(result.userConfig.serviceWorkerParam, { scope: '/' });
});

test('should not overwrite a provided service worker registration params', async t => {
  await TestEnvironment.initialize({
    initOptions: {
      httpPermissionRequest: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  OneSignal.SERVICE_WORKER_PARAM = { scope: 'customValue' };
  const result = new ConfigManager().getMergedConfig(
    {},
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.deepEqual(result.userConfig.serviceWorkerParam, { scope: 'customValue' });
});

test('should assign the default service worker A filename if not provided', async t => {

  const result = new ConfigManager().getMergedConfig(
    {},
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.is(result.userConfig.serviceWorkerPath, 'OneSignalSDK.sw.js');
});

test("should not use server's subdomain if subdomain not specified in user config on HTTPS site", async t => {
  await TestEnvironment.initialize({
    initOptions: {
      httpPermissionRequest: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const serverConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverConfig.config.subdomain = 'test-subdomain';
  const result = new ConfigManager().getMergedConfig(
    {},
    serverConfig
  );
  t.is(result.subdomain, undefined);
});

test("should use server's subdomain if subdomain not specified in user config but on HTTP site", async t => {
  await TestEnvironment.initialize({
    initOptions: {
      httpPermissionRequest: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  const serverConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverConfig.config.subdomain = 'test-subdomain';
  const result = new ConfigManager().getMergedConfig({}, serverConfig);
  t.is(result.subdomain, 'test-subdomain');
});

test('should not overwrite provided subdomain', async t => {
  const serverConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverConfig.config.subdomain = 'test-subdomain';
  const result = new ConfigManager().getMergedConfig(
    {
      subdomainName: 'test-subdomain'
    },
    serverConfig
  );
  t.is(result.subdomain, 'test-subdomain');
});

test('should assign downloaded safari web ID if not provided', async t => {
  const serverConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverConfig.config.safari_web_id = 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827';
  const result = new ConfigManager().getMergedConfig({}, serverConfig);
  t.is(result.safariWebId, serverConfig.config.safari_web_id);
});

test('should overwrite provided safari web ID', async t => {
  const serverConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverConfig.config.safari_web_id = 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827';
  const result = new ConfigManager().getMergedConfig(
    {
      safari_web_id: 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752551111'
    } as any,
    serverConfig
  );
  t.is(result.safariWebId, 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827');
});
