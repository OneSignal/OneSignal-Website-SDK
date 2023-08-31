import '../../support/polyfills/polyfills';

import test from 'ava';
import sinon, { SinonSandbox, SinonStub } from 'sinon';
import nock from 'nock';
import { ServiceWorkerManager } from '../../../src/shared/managers/ServiceWorkerManager';
import { ServiceWorkerActiveState } from '../../../src/shared/helpers/ServiceWorkerHelper';
import {
  HttpHttpsEnvironment,
  TestEnvironment,
  TestEnvironmentConfig,
} from '../../support/sdk/TestEnvironment';
import Context from '../../../src/page/models/Context';
import SdkEnvironment from '../../../src/shared/managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../../../src/shared/models/WindowEnvironmentKind';

import OneSignal from '../../../src/onesignal/OneSignal';
import Random from '../../support/tester/Random';
import {
  WorkerMessenger,
  WorkerMessengerCommand,
  WorkerMessengerReplyBuffer,
} from '../../../src/shared/libraries/WorkerMessenger';
import OneSignalEvent from '../../../src/shared/services/OneSignalEvent';
import { ServiceWorkerRegistrationError } from '../../../src/shared/errors/ServiceWorkerRegistrationError';
import OneSignalUtils from '../../../src/shared/utils/OneSignalUtils';
import { MockServiceWorkerRegistration } from '../../support/mocks/service-workers/models/MockServiceWorkerRegistration';
import { MockServiceWorker } from '../../support/mocks/service-workers/models/MockServiceWorker';
import { ConfigIntegrationKind } from '../../../src/shared/models/AppConfig';
import Environment from '../../../src/shared/helpers/Environment';
import { MockServiceWorkerContainerWithAPIBan } from '../../support/mocks/service-workers/models/MockServiceWorkerContainerWithAPIBan';
import Path from '../../../src/shared/models/Path';

class LocalHelpers {
  static getServiceWorkerManager(): ServiceWorkerManager {
    return new ServiceWorkerManager(OneSignal.context, {
      workerPath: new Path('/Worker.js'),
      registrationOptions: { scope: '/' },
    });
  }
}

// manually create and restore the sandbox
let sandbox: SinonSandbox;
let getRegistrationStub: SinonStub;

test.beforeEach(async function () {
  sandbox = sinon.sandbox.create();

  await TestEnvironment.stubDomEnvironment();
  getRegistrationStub = sandbox
    .stub(navigator.serviceWorker, 'getRegistration')
    .callThrough();

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);
  (global as any).OneSignal = OneSignal;
});

test.afterEach(function () {
  sandbox.restore();
});

test('getActiveState() detects no installed worker', async (t) => {
  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
});

test('getActiveState() detects worker A, case sensitive', async (t) => {
  await navigator.serviceWorker.register('/Worker.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );
});

test('getActiveState() detects worker A, even when worker filename uses query parameters', async (t) => {
  await navigator.serviceWorker.register('/Worker.js?appId=12345');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );
});

test('getActiveState() detects a 3rd party worker, a worker that is activated but has an unrecognized script URL', async (t) => {
  await navigator.serviceWorker.register('/Worker-C.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('getActiveState() should detect Akamai akam-sw.js?othersw= when our is contain within', async (t) => {
  await navigator.serviceWorker.register(
    '/akam-sw.js?othersw=https://domain.com/Worker.js?appId=12345',
  );

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );
});

test('getActiveState() should detect Akamai akam-sw.js as 3rd party if no othersw=', async (t) => {
  await navigator.serviceWorker.register(
    '/akam-sw.js?othersw=https://domain.com/someothersw.js',
  );

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('getActiveState() should detect Akamai akam-sw.js as 3rd party if othersw= is not our worker', async (t) => {
  await navigator.serviceWorker.register('/akam-sw.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('notification clicked - While page is opened in background', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
    initOptions: {
      pageUrl: 'https://localhost:3001/',
    },
  });

  const mockInstallingWorker = new MockServiceWorker();
  mockInstallingWorker.state = 'activated';
  mockInstallingWorker.scriptURL = 'https://site.com/Worker.js';
  const mockWorkerRegistration = new MockServiceWorkerRegistration();
  mockWorkerRegistration.active = mockInstallingWorker;

  sandbox.stub(navigator.serviceWorker, 'controller').resolves(null);

  const manager = LocalHelpers.getServiceWorkerManager();

  const workerMessageReplyBuffer = new WorkerMessengerReplyBuffer();
  OneSignal.context.workerMessenger = new WorkerMessenger(
    OneSignal.context,
    workerMessageReplyBuffer,
  );

  sandbox.stub(OneSignalEvent, 'trigger').callsFake(function (event: string) {
    if (event === OneSignal.EVENTS.NOTIFICATION_CLICKED) t.pass();
  });

  // Add addListenerForNotificationOpened so service worker fires event instead of storing it
  await OneSignal.addListenerForNotificationOpened(function () {});
  manager.establishServiceWorkerChannel();

  const listeners = workerMessageReplyBuffer.findListenersForMessage(
    WorkerMessengerCommand.NotificationClicked,
  );
  for (const listenerRecord of listeners)
    listenerRecord.callback.apply(null, ['test']);
});

test('getActiveState() returns an indeterminate status for insecure HTTP pages', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http,
  });

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Indeterminate);
});

/***************************************************
 * installWorker()
 ***************************************************
 */

test('installWorker() installs worker A with the correct file name and query parameter when no service worker exists', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  sandbox.stub(Notification, <any>'permission').value('granted');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
  await manager.installWorker();
  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );

  const serviceWorker =
    MockServiceWorkerContainerWithAPIBan.getControllerForTests();
  t.true(
    serviceWorker!.scriptURL.endsWith(
      `/Worker.js?appId=${OneSignal.context.appConfig.appId}&sdkVersion=1`,
    ),
  );
});

test('installWorker() does NOT install ServiceWorker when permission has NOT been granted', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
  t.is(MockServiceWorkerContainerWithAPIBan.getControllerForTests(), null);
});

test('installWorker() installs worker A when a third party service worker exists', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  sandbox.stub(Notification, <any>'permission').value('granted');

  await navigator.serviceWorker.register('/another-service-worker.js');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
  await manager.installWorker();
  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );
});

test('installWorker() installs worker 1 -> simulate SDK upgrade -> install worker 2', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  sandbox.stub(Notification, <any>'permission').value('granted');

  const manager = new ServiceWorkerManager(OneSignal.context, {
    workerPath: new Path('/Worker.js'),
    registrationOptions: { scope: '/' },
  });

  // 1. Install ServiceWorker A and assert it was ServiceWorker A
  await manager.installWorker();
  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );

  // 2. Simulate an upgraded page SDK
  const envVerStub = sandbox.stub(Environment, 'version').returns(2);
  const spy = sandbox.spy(navigator.serviceWorker, 'register');

  // 3. Attempt to install ServiceWorker which should detect an upgrade
  await manager.installWorker();

  const appConfig = OneSignal.context.appConfig;
  const registerOptions = { scope: `${location.origin}/` };
  const serviceWorker2Path = `${location.origin}/Worker.js?appId=${appConfig.appId}&sdkVersion=2`;

  // 4. Ensure we installed ServiceWorker 2
  let spyCall = spy.getCall(0);
  t.true(spyCall.calledWithExactly(serviceWorker2Path, registerOptions));
  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );

  // 5. Ensure a 2nd upgrade is handled corretly in the same way
  envVerStub.returns(3);
  await manager.installWorker();

  const serviceWorker3Path = serviceWorker2Path.replace(/2$/, '3');
  spyCall = spy.getCall(1);
  t.true(spyCall.calledWithExactly(serviceWorker3Path, registerOptions));
  t.is(
    await manager.getActiveState(),
    ServiceWorkerActiveState.OneSignalWorker,
  );

  // 6. Ensure we did not call more than 2 times
  t.is(spy.callCount, 2);
});

test('installWorker() installs Worker new scope when it changes', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  sandbox.stub(Notification, 'permission').value('granted');
  // We don't want the version number check from "workerNeedsUpdate" interfering with this test.
  sandbox
    .stub(ServiceWorkerManager.prototype, <any>'workerNeedsUpdate')
    .resolves(false);

  const serviceWorkerConfig = {
    workerPath: new Path('/Worker.js'),
    registrationOptions: { scope: '/' },
  };
  const manager = new ServiceWorkerManager(
    OneSignal.context,
    serviceWorkerConfig,
  );

  // 1. Install ServiceWorker
  await manager.installWorker();

  // 2. Attempt to install again, but with a different scope
  serviceWorkerConfig.registrationOptions.scope = '/push/onesignal/';
  const spyRegister = sandbox.spy(navigator.serviceWorker, 'register');
  await manager.installWorker();

  // 3. Assert we did register our worker under the new scope.
  const appId = OneSignal.context.appConfig.appId;
  t.deepEqual(
    spyRegister.getCalls().map((call) => call.args),
    [
      [
        `https://localhost:3001/Worker.js?appId=${appId}&sdkVersion=1`,
        { scope: 'https://localhost:3001/push/onesignal/' },
      ],
    ],
  );

  // 4. Ensure we kept the original ServiceWorker.
  //   A. Original could contain more than just OneSignal code
  //   B. New ServiceWorker instance will have it's own pushToken, this may have not been sent onesignal.com yet.
  const orgRegistration = await navigator.serviceWorker.getRegistration(
    `${location.origin}/`,
  );
  t.is(new URL(orgRegistration!.scope).pathname, '/');
});

test('Service worker register URL correct when service worker path is an absolute URL', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  sandbox.stub(Notification, <any>'permission').value('granted');

  const manager = new ServiceWorkerManager(OneSignal.context, {
    workerPath: new Path(`${location.origin}/Worker.js`),
    registrationOptions: { scope: '/' },
  });

  const serviceWorkerStub = sandbox.spy(navigator.serviceWorker, 'register');
  await manager.installWorker();

  sandbox.assert.alwaysCalledWithExactly(
    serviceWorkerStub,
    `${location.origin}/Worker.js?appId=${OneSignal.context.appConfig.appId}&sdkVersion=1`,
    { scope: `${location.origin}/` },
  );
  t.pass();
});

test('Service worker failed to install due to 404 on host page. Send notification to OneSignal api', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  sandbox.stub(Notification, <any>'permission').value('granted');

  const context = OneSignal.context;

  const workerPath = 'Worker-does-not-exist.js';
  const manager = new ServiceWorkerManager(context, {
    workerPath: new Path(workerPath),
    registrationOptions: {
      scope: '/',
    },
  });

  const origin = 'https://onesignal.com';
  nock(origin)
    .get(function (uri) {
      return uri.indexOf(workerPath) !== -1;
    })
    .reply(404, (_uri: string, _requestBody: any) => {
      return {
        status: 404,
        statusText: '404 Not Found',
      };
    });

  const workerRegistrationError = new Error('Registration failed');

  sandbox
    .stub(navigator.serviceWorker, 'register')
    .throws(workerRegistrationError);
  sandbox.stub(OneSignalUtils, 'getBaseUrl').returns(origin);
  sandbox
    .stub(SdkEnvironment, 'getWindowEnv')
    .returns(WindowEnvironmentKind.Host);
  await t.throwsAsync(async () => manager.installWorker(), {
    instanceOf: ServiceWorkerRegistrationError,
  });
});

test('Service worker failed to install in popup. No handling.', async (t) => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  sandbox.stub(Notification, <any>'permission').value('granted');

  const context = OneSignal.context;

  const workerPath = 'Worker-does-not-exist.js';
  const manager = new ServiceWorkerManager(context, {
    workerPath: new Path(workerPath),
    registrationOptions: {
      scope: '/',
    },
  });

  const origin = 'https://onesignal.com';
  nock(origin)
    .get(function (uri) {
      return uri.indexOf(workerPath) !== -1;
    })
    .reply(404, (_uri: string, _requestBody: any) => {
      return {
        status: 404,
        statusText: '404 Not Found',
      };
    });

  const workerRegistrationError = new Error('Registration failed');

  sandbox
    .stub(navigator.serviceWorker, 'register')
    .throws(workerRegistrationError);
  sandbox.stub(location, 'origin').returns(origin);
  sandbox
    .stub(SdkEnvironment, 'getWindowEnv')
    .returns(WindowEnvironmentKind.OneSignalSubscriptionPopup);
  const error = await t.throwsAsync(async () => manager.installWorker(), {
    instanceOf: Error,
  });
  t.is(error.message, workerRegistrationError.message);
});

test('installWorker() should not install when on an HTTPS site with a subdomain set', async (t) => {
  // 1. Mock site page as HTTPS
  await TestEnvironment.initialize({ httpOrHttps: HttpHttpsEnvironment.Https });
  TestEnvironment.mockInternalOneSignal();
  // 2. Set is set to use our subdomain however
  const subdomain = 'abc';
  const testConfig: TestEnvironmentConfig = {
    integration: ConfigIntegrationKind.TypicalSite,
    overrideServerConfig: {
      config: {
        subdomain: subdomain,
        siteInfo: { proxyOriginEnabled: true, proxyOrigin: subdomain },
      },
    },
  };
  TestEnvironment.mockInternalOneSignal(testConfig);

  const manager = LocalHelpers.getServiceWorkerManager();
  await manager.installWorker();
  // Since ServiceWorker will be installed in the iframe on os.tc Indeterminate is expected
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Indeterminate);
});

test('ServiceWorkerManager.getRegistration() returns valid instance when sw is registered', async (t) => {
  await navigator.serviceWorker.register('/Worker.js');
  const result = await OneSignal.context.serviceWorkerManager.getRegistration();
  t.truthy(result);
});

test('ServiceWorkerManager.getRegistration() returns undefined when sw is not registered ', async (t) => {
  const result = await OneSignal.context.serviceWorkerManager.getRegistration();
  t.is(result, undefined);
});

test('ServiceWorkerManager.getRegistration() handles throws by returning null', async (t) => {
  getRegistrationStub.restore();
  getRegistrationStub = sandbox.stub(
    navigator.serviceWorker,
    'getRegistration',
  );

  getRegistrationStub.returns(
    new Promise(() => {
      throw new Error('HTTP NOT SUPPORTED');
    }),
  );
  const result = await OneSignal.context.serviceWorkerManager.getRegistration();
  t.is(result, null);
});
