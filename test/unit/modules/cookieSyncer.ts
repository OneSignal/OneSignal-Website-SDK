import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';
import Context from '../../../src/models/Context';
import Random from "../../support/tester/Random";

test("should load https://onesignal.com/webPushAnalytics as HTTPS if cookie sync not enabled", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);

  const cookieSyncer = new CookieSyncer(OneSignal.context, false);
  cookieSyncer.install();
  const iframe = document.querySelector("iframe");
  t.is(iframe.getAttribute('src'), 'https://onesignal.com/webPushAnalytics');
  t.truthy(iframe);
});

test("should load https://subdomain.os.tc/webPushAnalytics as HTTP if cookie sync not enabled", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.subdomain = "my-subdomain";
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);

  const cookieSyncer = new CookieSyncer(OneSignal.context, false);
  cookieSyncer.install();
  const iframe = document.querySelector("iframe");
  t.is(iframe.getAttribute('src'), 'https://my-subdomain.os.tc/webPushAnalytics');
  t.truthy(iframe);
});

test("should load https://onesignal.com/webPushAnalytics?sync=true&appId=uuid as HTTPS if cookie sync enabled",
async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);

  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  const iframe = document.querySelector("iframe");
  const sanitizedAppId = appConfig.appId.replace(/-/g, '').substr(0, 15);
  t.is(iframe.getAttribute('src'), `https://onesignal.com/webPushAnalytics?sync=true&appId=os!${sanitizedAppId}`);
  t.truthy(iframe);
});

test("should load https://subdomain.os.tc/webPushAnalytics?sync=true&appId=uuid as HTTP if cookie sync enabled",
async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.subdomain = "my-subdomain";
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);

  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  const iframe = document.querySelector("iframe");
  const sanitizedAppId = appConfig.appId.replace(/-/g, '').substr(0, 15);
  t.is(iframe.getAttribute('src'), `https://my-subdomain.os.tc/webPushAnalytics?sync=true&appId=os!${sanitizedAppId}`);
  t.truthy(iframe);
});
