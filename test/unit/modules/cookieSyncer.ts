import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';

import Context from '../../../src/models/Context';
import Random from "../../support/tester/Random";

test("should load https://onesignal.com/webPushAnalytics as HTTPS", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);

  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  const iframe = document.querySelector("iframe");
  t.is(iframe.getAttribute('src'), 'https://onesignal.com/webPushAnalytics');
  t.truthy(iframe);
});

test("should load https://subdomain.os.tc/webPushAnalytics as HTTP", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  const element = document.querySelector("script[src='http://cdn.tynt.com/afx.js']")
  t.is(element.tagName.toLowerCase(), 'script');
  t.is(element.getAttribute('src'), 'http://cdn.tynt.com/afx.js');
});

test("should not add anything if feature is disabled", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  const cookieSyncer = new CookieSyncer(OneSignal.context, false);
  cookieSyncer.install();
  const element = document.querySelector("script[src='https://cdn.tynt.com/afx.js']")
  t.is(element, null);
});

test("should not run if we are not the top window", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http,
    initializeAsIframe: true,
  });
  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  t.is((window as any).Tynt, undefined);
});

test("should set global tynt variable with publisher ID", async t => {
  const context: Context = OneSignal.context;
  const appId = context.appConfig.appId;

  const truncatedAppId = appId.replace(/-/g, '').substr(0, 15).toLowerCase();

  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  const iframe = document.querySelector("iframe");
  t.is(iframe.getAttribute('src'), 'https://my-subdomain.os.tc/webPushAnalytics');
  t.truthy(iframe);
});
