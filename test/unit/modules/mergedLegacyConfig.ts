import '../../support/polyfills/polyfills';
import test from 'ava';
import InitHelper from '../../../src/helpers/InitHelper';
import { AppConfig } from '../../../src/models/AppConfig';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/OneSignal';

test.beforeEach(t => {
  t.context.serverConfig = new AppConfig();
});

test('should assign the default service worker file path if not provided', async t => {
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
  t.is(result.userConfig.path, '/');
});

test('should not overwrite a provided service worker file path', async t => {
  const result = InitHelper.getMergedUserServerAppConfig(
    {
      path: '/existing-path'
    },
    t.context.serverConfig
  );
  t.is(result.userConfig.path, '/existing-path');
});

test('should assign the default service worker registration params if not provided', async t => {
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
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
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
  t.deepEqual(result.userConfig.serviceWorkerParam, { scope: 'customValue' });
});

test('should assign the default service worker A filename if not provided', async t => {
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
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
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
  t.is(result.userConfig.serviceWorkerPath, 'CustomWorkerA.js');
});

test('should assign the default service worker B filename if not provided', async t => {
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
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
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
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
  t.context.serverConfig.subdomain = 'test-subdomain';
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
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
  t.context.serverConfig.subdomain = 'test-subdomain';
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
  t.is(result.subdomain, 'test-subdomain');
});

test('should not overwrite provided subdomain', async t => {
  t.context.serverConfig.subdomain = 'test-subdomain';
  const result = InitHelper.getMergedUserServerAppConfig(
    {
      subdomainName: 'test-subdomain'
    },
    t.context.serverConfig
  );
  t.is(result.subdomain, 'test-subdomain');
});

test('should assign downloaded safari web ID if not provided', async t => {
  t.context.serverConfig.safariWebId = 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827';
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
  t.is(result.safariWebId, t.context.serverConfig.safariWebId);
});

test('should overwrite provided safari web ID', async t => {
  t.context.serverConfig.safariWebId = 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827';
  const result = InitHelper.getMergedUserServerAppConfig(
    {
      safari_web_id: 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752551111'
    } as any,
    t.context.serverConfig
  );
  t.is(result.safariWebId, 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827');
});

test('should assign downloaded safari web ID if not provided', async t => {
  t.context.serverConfig.safariWebId = 'web.onesignal.auto.01ea4289-b460-45e4-8d90-838752554827';
  const result = InitHelper.getMergedUserServerAppConfig({}, t.context.serverConfig);
  t.is(result.safariWebId, t.context.serverConfig.safariWebId);
});
