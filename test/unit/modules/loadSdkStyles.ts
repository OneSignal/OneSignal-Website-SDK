import '../../support/polyfills/polyfills';
import anyTest, { TestInterface } from 'ava';
import {
  TestEnvironment,
  TestEnvironmentConfig,
} from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/onesignal/OneSignal';
import sinon, { SinonStub } from 'sinon';
import Bell from '../../../src/page/bell/Bell';
import MockLauncher from '../../support/mocks/MockLauncher';
import {
  DynamicResourceLoader,
  ResourceType,
  ResourceLoadState,
} from '../../../src/page/services/DynamicResourceLoader';
import {
  InvalidStateError,
  InvalidStateReason,
} from '../../../src/shared/errors/InvalidStateError';
import { AppConfig } from '../../../src/shared/models/AppConfig';

interface LoadSdkContext {
  appConfig: AppConfig;
  loadSdkStylesheet: SinonStub;
  load: Function;
}

const test = anyTest as TestInterface<LoadSdkContext>;

test.beforeEach((t) => {
  const appConfig = TestEnvironment.getFakeAppConfig();
  t.context.appConfig = appConfig;

  t.context.loadSdkStylesheet = sinon.stub(
    DynamicResourceLoader.prototype,
    'loadSdkStylesheet',
  );
});

test.afterEach.always((t) => {
  t.context.loadSdkStylesheet.restore();
});

test('should call loadSdkStylesheet if notify button is used', async (t) => {
  const testConfig: TestEnvironmentConfig = {
    userConfig: {
      notifyButton: {
        enable: true,
      },
    },
  };
  await TestEnvironment.initialize(testConfig);
  TestEnvironment.mockInternalOneSignal(testConfig);
  const bellConfig = OneSignal.context.appConfig.userConfig.notifyButton;

  const notifyButton = new Bell(bellConfig!, new MockLauncher(null));
  notifyButton.launcher.bell = notifyButton;
  await notifyButton.create();
  t.is(t.context.loadSdkStylesheet.called, true);
});

test('should call loadSdkStylesheet if slidedown permission message is used', async (t) => {
  await TestEnvironment.initialize({
    initOptions: {},
  });
  TestEnvironment.mockInternalOneSignal();
  try {
    await OneSignal.showHttpPrompt();
  } catch (e) {
    if (
      e instanceof InvalidStateError &&
      e.reason === InvalidStateReason.MissingAppId
    ) {
    } else throw e;
  }
  t.is(t.context.loadSdkStylesheet.called, true);
});

test('loadIfNew called twice should not load the same stylesheet or script more than once', async (t) => {
  t.context.load = sinon
    .stub(DynamicResourceLoader.prototype as any, 'load')
    .resolves(ResourceLoadState.Loaded);

  await TestEnvironment.initialize({
    initOptions: {},
  });
  const dynamicResourceLoader = new DynamicResourceLoader();
  const resourceLoadAttempts = [];
  for (let i = 0; i < 5; i++) {
    resourceLoadAttempts.push(
      dynamicResourceLoader.loadIfNew(
        ResourceType.Stylesheet,
        new URL(
          'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css',
        ),
      ),
    );
  }
  await Promise.all(resourceLoadAttempts);
  const cache = dynamicResourceLoader.getCache();

  t.not(Object.keys(cache).length, 5);
  t.is(Object.keys(cache).length, 1);
  t.is(
    Object.keys(cache)[0],
    'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css',
  );
});

test('load successfully fetches and installs stylesheet', async (t) => {
  await TestEnvironment.initialize({
    initOptions: {},
  });
  await DynamicResourceLoader.load(
    ResourceType.Stylesheet,
    new URL('https://test.node/styles/test.css'),
  );
  // Check that the stylesheet is actually loaded into <head>
  const element = document.querySelector('head > link');
  t.is(element!.getAttribute('rel'), 'stylesheet');
  t.is(element!.getAttribute('href'), 'https://test.node/styles/test.css');
});

test('load successfully fetches and executes script', async (t) => {
  await TestEnvironment.initialize({
    initOptions: {},
  });
  await DynamicResourceLoader.load(
    ResourceType.Script,
    new URL('https://test.node/scripts/test.js'),
  );
  // Check that the script is actually loaded
  const element = document.querySelector('head > script');
  t.is(element!.getAttribute('type'), 'text/javascript');
  t.is(element!.getAttribute('src'), 'https://test.node/scripts/test.js');
});
