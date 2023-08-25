import '../../support/polyfills/polyfills';
import test from 'ava';
import { ServiceWorker } from '../../../src/sw/serviceWorker/ServiceWorker';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';

import Database from '../../../src/shared/services/Database';
import Random from '../../support/tester/Random';

test(`getAppId should retrieve app ID from service worker registration URL`, async (t) => {
  const uuid = Random.getRandomUuid();
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js?appId=${uuid}`),
  });
  const appId = await ServiceWorker.getAppId();
  t.is(appId, uuid);
});

test(`getAppId should retrieve app ID from a multi-query param service worker registration URL`, async (t) => {
  const uuid = Random.getRandomUuid();
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(
      `https://site.com/service-worker.js?a=1&b=2&appId=${uuid}&c=3`,
    ),
  });
  const appId = await ServiceWorker.getAppId();
  t.is(appId, uuid);
});

test(`getAppId should retrieve app ID from database if registration URL does not contain app ID query param`, async (t) => {
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js`),
  });

  const uuid = Random.getRandomUuid();
  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = uuid;
  await Database.setAppConfig(appConfig);

  const appId = await ServiceWorker.getAppId();
  t.is(appId, uuid);
});

test(`getAppId should return null if no app ID stored in database or registration URL query param`, async (t) => {
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js`),
  });
  const appId = await ServiceWorker.getAppId();
  t.is(appId, null);
});
