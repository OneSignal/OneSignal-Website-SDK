import '../../support/polyfills/polyfills';
import test from 'ava';
import { ServiceWorker } from '../../../src/service-worker/ServiceWorker';
import { setUserAgent } from '../../support/tester/browser';
import { BrowserUserAgent, TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { Uuid } from '../../../src/models/Uuid';
import Database from '../../../src/services/Database';
import { AppConfig } from '../../../src/models/AppConfig';


test(`getAppId should retrieve app ID from service worker registration URL`, async t => {
  const uuid = Uuid.generate();
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js?appId=${uuid}`)
  });
  const appId = await ServiceWorker.getAppId();
  t.is(appId.toString(), uuid.toString());
});

test(`getAppId should retrieve app ID from a multi-query param service worker registration URL`, async t => {
  const uuid = Uuid.generate();
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js?a=1&b=2&appId=${uuid}&c=3`)
  });
  const appId = await ServiceWorker.getAppId();
  t.is(appId.toString(), uuid.toString());
});

test(`getAppId should retrieve app ID from database if registration URL does not contain app ID query param`, async t => {
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js`)
  });

  const uuid = Uuid.generate();
  const appConfig = new AppConfig();
  appConfig.appId = uuid;
  await Database.setAppConfig(appConfig);

  const appId = await ServiceWorker.getAppId();
  t.is(appId.toString(), uuid.toString());
});

test(`getAppId should return null if no app ID stored in database or registration URL query param`, async t => {
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js`)
  });
  const appId = await ServiceWorker.getAppId();
  t.is(appId.toString(), null);
});


