import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import Environment from "../../../src/Environment";
import SubscriptionHelper from "../../../src/helpers/SubscriptionHelper";
import * as sinon from 'sinon';
import Bell from "../../../src/bell/Bell";
import InitHelper from "../../../src/helpers/InitHelper";
import MainHelper from "../../../src/helpers/MainHelper";
import { InvalidStateError, InvalidStateReason } from "../../../src/errors/InvalidStateError";
import Launcher from "../../../src/bell/Launcher";
import MockDummy from "../../support/mocks/MockDummy";
import ActiveAnimatedElement from "../../../src/bell/ActiveAnimatedElement";
import AnimatedElement from "../../../src/bell/AnimatedElement";
import MockLauncher from "../../support/mocks/MockLauncher";
import { DynamicResourceLoader, ResourceType, ResourceLoadState } from '../../../src/services/DynamicResourceLoader';
import { contains } from '../../../src/utils';

test.beforeEach(t => {
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
  const notifyButton = new Bell({
    enable: true,
    launcher: new MockLauncher(null)
  });
  notifyButton.launcher.bell = notifyButton;
  await notifyButton.create();
  t.is(t.context.loadSdkStylesheet.called, true);
});

test("should call loadSdkStylesheet if HTTP permission request is used", async t => {
  await TestEnvironment.initialize({
    initOptions: {
      httpPermissionRequest: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Http
  });
  await MainHelper.showHttpPermissionRequestPostModal();
  t.is(t.context.loadSdkStylesheet.called, true);
});

test("should call loadSdkStylesheet if slidedown permission message is used", async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  try {
    await OneSignal.showHttpPrompt();
  } catch (e) {
    if (e instanceof InvalidStateError && e.reason === InvalidStateReason.MissingAppId) {
    } else throw e;
  }
  t.is(t.context.loadSdkStylesheet.called, true);
});

test("loadIfNew called twice should not load the same stylesheet or script more than once", async t => {
  t.context.load = sinon.stub(DynamicResourceLoader.prototype, 'load').resolves(ResourceLoadState.Loaded);

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
