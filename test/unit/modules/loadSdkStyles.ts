import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import sinon from 'sinon';
import Bell from "../../../src/bell/Bell";
import { InvalidStateError, InvalidStateReason } from "../../../src/errors/InvalidStateError";
import MockLauncher from "../../support/mocks/MockLauncher";
import { DynamicResourceLoader, ResourceType, ResourceLoadState } from '../../../src/services/DynamicResourceLoader';
import Context from '../../../src/models/Context';

test.beforeEach(t => {
  const appConfig = TestEnvironment.getFakeAppConfig();
  t.context.appConfig = appConfig;

  t.context.loadSdkStylesheet = sinon.stub(DynamicResourceLoader.prototype, 'loadSdkStylesheet');
});

test.afterEach.always(t => {
  t.context.loadSdkStylesheet.restore();
});

test("should call loadSdkStylesheet if notify button is used", async t => {
  await TestEnvironment.initialize({
    initOptions: {
      notifyButton: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  OneSignal.context = new Context(t.context.appConfig);
  const bellConfig = OneSignal.context.appConfig.userConfig.notifyButton;
  if (!bellConfig) {
    t.fail();
    return;
  }
  const notifyButton = new Bell(bellConfig, new MockLauncher(null));
  notifyButton.launcher.bell = notifyButton;
  await notifyButton.create();
  t.is(t.context.loadSdkStylesheet.called, true);
});

test("should call loadSdkStylesheet if slidedown permission message is used", async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  OneSignal.context = new Context(t.context.appConfig);
  OneSignal.config = t.context.appConfig;
  try {
    await OneSignal.showHttpPrompt();
  } catch (e) {
    if (e instanceof InvalidStateError && e.reason === InvalidStateReason.MissingAppId) {
    } else throw e;
  }
  t.is(t.context.loadSdkStylesheet.called, true);
});

test("loadIfNew called twice should not load the same stylesheet or script more than once", async t => {
  t.context.load = sinon.stub(DynamicResourceLoader.prototype as any, 'load').resolves(ResourceLoadState.Loaded);

  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  const dynamicResourceLoader = new DynamicResourceLoader();
  const resourceLoadAttempts = [];
  for (let i = 0; i < 5; i++) {
    resourceLoadAttempts.push(
      dynamicResourceLoader.loadIfNew(ResourceType.Stylesheet, new URL('https://cdn.onesignal.com/sdks/OneSignalSDKStyles.css'))
    );
  }
  await Promise.all(resourceLoadAttempts);
  const cache = dynamicResourceLoader.getCache();

  t.not(Object.keys(cache).length, 5);
  t.is(Object.keys(cache).length, 1);
  t.is(Object.keys(cache)[0], 'https://cdn.onesignal.com/sdks/OneSignalSDKStyles.css');
});

test("load successfully fetches and installs stylesheet", async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  await DynamicResourceLoader.load(ResourceType.Stylesheet, new URL('https://test.node/styles/test.css'));
  // Check that the stylesheet is actually loaded into <head>
  t.is(document.querySelector('head > link').getAttribute('rel'), 'stylesheet');
  t.is(document.querySelector('head > link').getAttribute('href'), 'https://test.node/styles/test.css');
});

test("load successfully fetches and executes script", async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  await DynamicResourceLoader.load(ResourceType.Script, new URL('https://test.node/scripts/test.js'));
  // Check that the script is actually loaded
  t.is(document.querySelector('head > script').getAttribute('type'), 'text/javascript');
  t.is(document.querySelector('head > script').getAttribute('src'), 'https://test.node/scripts/test.js');
});
