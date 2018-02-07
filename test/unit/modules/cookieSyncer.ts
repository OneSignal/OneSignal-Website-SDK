import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';
import { Uuid } from '../../../src/models/Uuid';
import Context from '../../../src/models/Context';
import * as createKeccakHash from 'keccak';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Uuid.generate();
  OneSignal.context = new Context(appConfig);
});

test("should load Tynt SDK script as HTTPS", async t => {
  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  const element = document.querySelector("script[src='https://cdn.tynt.com/afx.js']")
  t.is(element.tagName.toLowerCase(), 'script');
  t.is(element.getAttribute('src'), 'https://cdn.tynt.com/afx.js');
});

test("should load Tynt SDK script as HTTP", async t => {
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

  // The digest is the portion of the publisher ID after the os! prefix
  // It's limited to 15 characters, so we're this variable hash to obtain a 1-1 mapping from app ID to publisher ID
  const digest = createKeccakHash('shake256').update(appId.value).squeeze(60 / 8, 'hex');

  const cookieSyncer = new CookieSyncer(OneSignal.context, true);
  cookieSyncer.install();
  t.not((window as any).Tynt, undefined);
  t.deepEqual((window as any).Tynt, [`os!${digest}`]);
});
