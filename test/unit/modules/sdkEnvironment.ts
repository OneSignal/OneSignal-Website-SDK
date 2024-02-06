import '../../support/polyfills/polyfills';
import test from 'ava';
import sinon from 'sinon';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import SdkEnvironment from '../../../src/shared/managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../../../src/shared/models/WindowEnvironmentKind';
import { EnvironmentKind } from '../../../src/shared/models/EnvironmentKind';

test('should get service worker window environment', async (t) => {
  await TestEnvironment.stubServiceWorkerEnvironment();
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.ServiceWorker);
});

test('getWindowEnv should get host window environment', async (t) => {
  const browser = await TestEnvironment.stubDomEnvironment();

  browser.changeURL(window, 'https://site.com');
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);

  browser.changeURL(window, 'https://subdomain.site.com');
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);

  browser.changeURL(window, 'http://subdomain.site.com.br:4334');
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);
});

test('API URL should be valid for development environment', async (t) => {
  t.is(
    SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Development).toString(),
    'https://localhost:3000/api/v1',
  );
});

test('API URL should be valid for staging environment', async (t) => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.changeURL(window, 'https://localhost');
  const expectedUrl = `https://${window.location.host}/api/v1`;
  t.is(
    SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Staging).toString(),
    expectedUrl,
  );
});

test('API URL should be valid for production environment', async (t) => {
  t.is(
    SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Production).toString(),
    'https://onesignal.com/api/v1',
  );
});
