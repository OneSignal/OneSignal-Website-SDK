import '../../support/polyfills/polyfills';
import test from 'ava';
import InitHelper from '../../../src/helpers/InitHelper';
import { AppConfig, ServerAppConfig, ConfigIntegrationKind } from '../../../src/models/AppConfig';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/OneSignal';
import ConfigManager from '../../../src/managers/ConfigManager';

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

test('should not overwrite a provided service worker file path', async t => {
  const result = new ConfigManager().getMergedConfig(
    {
      path: '/existing-path'
    },
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.is(result.userConfig.path, '/existing-path');
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
  t.is(result.userConfig.serviceWorkerPath, 'OneSignalSDKWorker.js');
});

test('should not overwrite a provided service worker A filename', async t => {
  await TestEnvironment.initialize({
    initOptions: {
      httpPermissionRequest: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  OneSignal.SERVICE_WORKER_PATH = 'CustomWorkerA.js';
  const result = new ConfigManager().getMergedConfig(
    {},
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.is(result.userConfig.serviceWorkerPath, 'CustomWorkerA.js');
});

test('should assign the default service worker B filename if not provided', async t => {

  const result = new ConfigManager().getMergedConfig(
    {},
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.is(result.userConfig.serviceWorkerUpdaterPath, 'OneSignalSDKUpdaterWorker.js');
});

test('should not overwrite a provided service worker B filename', async t => {
  await TestEnvironment.initialize({
    initOptions: {
      httpPermissionRequest: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Http
  });
  OneSignal.SERVICE_WORKER_UPDATER_PATH = 'CustomWorkerB.js';

  const result = new ConfigManager().getMergedConfig(
    {},
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom)
  );
  t.is(result.userConfig.serviceWorkerUpdaterPath, 'CustomWorkerB.js');
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

test('should assign downloaded safari web ID if not provided', async t => {
  const serverConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverConfig.config.safari_web_id = 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827';
  const result = new ConfigManager().getMergedConfig({}, serverConfig);
  t.is(result.safariWebId, serverConfig.config.safari_web_id);
});
