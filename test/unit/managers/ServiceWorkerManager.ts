import '../../support/polyfills/polyfills';

import test from 'ava';
import sinon, { SinonSandbox, SinonStub } from 'sinon';
import nock from "nock";
import { ServiceWorkerManager} from '../../../src/managers/ServiceWorkerManager';
import { ServiceWorkerActiveState } from '../../../src/helpers/ServiceWorkerHelper';
import Path from '../../../src/models/Path';
import {
  HttpHttpsEnvironment,
  TestEnvironment,
  TestEnvironmentConfig
} from '../../support/sdk/TestEnvironment';
import Context from '../../../src/models/Context';
import SdkEnvironment from "../../../src/managers/SdkEnvironment";
import { WindowEnvironmentKind } from "../../../src/models/WindowEnvironmentKind";

import OneSignal from '../../../src/OneSignal';
import Random from '../../support/tester/Random';
import {
  WorkerMessenger,
  WorkerMessengerCommand,
  WorkerMessengerReplyBuffer
} from "../../../src/libraries/WorkerMessenger";
import Event from "../../../src/Event";
import { ServiceWorkerRegistrationError } from '../../../src/errors/ServiceWorkerRegistrationError';
import OneSignalUtils from "../../../src/utils/OneSignalUtils";
import { MockServiceWorkerRegistration } from "../../support/mocks/service-workers/models/MockServiceWorkerRegistration";
import { MockServiceWorker } from "../../support/mocks/service-workers/models/MockServiceWorker";
import { ConfigIntegrationKind } from "../../../src/models/AppConfig";
import Environment from '../../../src/Environment';

class LocalHelpers {
  static getServiceWorkerManager(): ServiceWorkerManager {
    return new ServiceWorkerManager(OneSignal.context, {
      workerAPath: new Path('/Worker-A.js'),
      workerBPath: new Path('/Worker-B.js'),
      registrationOptions: { scope: '/' }
    });
  }
}

// manually create and restore the sandbox
let sandbox: SinonSandbox;
let getRegistrationStub: SinonStub;

test.beforeEach(async function() {
  sandbox = sinon.sandbox.create();

  await TestEnvironment.stubDomEnvironment();
  getRegistrationStub = sandbox.stub(navigator.serviceWorker, 'getRegistration').callThrough();

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);
  (global as any).OneSignal = OneSignal;
});

test.afterEach(function () {
  if (getRegistrationStub.callCount > 0)
    sandbox.assert.alwaysCalledWithExactly(getRegistrationStub, location.href);
  sandbox.restore();
});

test('getActiveState() detects no installed worker', async t => {
  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
});

test('getActiveState() detects worker A, case sensitive', async t => {
  await navigator.serviceWorker.register('/Worker-A.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
});

test('getActiveState() detects worker B, case sensitive', async t => {
  await navigator.serviceWorker.register('/Worker-B.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerB);
});

test('getActiveState() detects worker A, even when worker filename uses query parameters', async t => {
  await navigator.serviceWorker.register('/Worker-A.js?appId=12345');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
});

test('getActiveState() detects worker B, even when worker filename uses query parameters', async t => {
  await navigator.serviceWorker.register('/Worker-B.js?appId=12345');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerB);
});

test('getActiveState() detects an installing worker (not active)', async t => {
  const mockWorkerRegistration = new MockServiceWorkerRegistration();
  const mockInstallingWorker = new MockServiceWorker();
  mockInstallingWorker.state = 'installing';
  mockWorkerRegistration.installing = mockInstallingWorker;

  getRegistrationStub.resolves(mockWorkerRegistration);
  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Installing);
});

test('getActiveState() detects a 3rd party worker, a worker that is activated but has an unrecognized script URL', async t => {
  await navigator.serviceWorker.register('/Worker-C.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('getActiveState() detects a page loaded by hard-refresh with our service worker as bypassed', async t => {
  const mockWorkerRegistration = new MockServiceWorkerRegistration();
  const mockInstallingWorker = new MockServiceWorker();
  mockInstallingWorker.state = 'activated';
  mockInstallingWorker.scriptURL = 'https://site.com/Worker-A.js';
  mockWorkerRegistration.active = mockInstallingWorker;

  getRegistrationStub.resolves(mockWorkerRegistration);
  sandbox.stub(navigator.serviceWorker, 'controller').resolves(null);
  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Bypassed);
});

test('getActiveState() detects an activated third-party service worker not controlling the page as third-party and not bypassed', async t => {
  const mockWorkerRegistration = new MockServiceWorkerRegistration();
  const mockInstallingWorker = new MockServiceWorker();
  mockInstallingWorker.state = 'activated';
  mockInstallingWorker.scriptURL = 'https://site.com/another-worker.js';
  mockWorkerRegistration.active = mockInstallingWorker;

  getRegistrationStub.resolves(mockWorkerRegistration);
  sandbox.stub(navigator.serviceWorker, 'controller').resolves(null);
  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('getActiveState() should detect Akamai akam-sw.js?othersw= when our is contain within', async t => {
  await navigator.serviceWorker.register('/akam-sw.js?othersw=https://domain.com/Worker-A.js?appId=12345');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
});

test('getActiveState() should detect Akamai akam-sw.js as 3rd party if no othersw=', async t => {
  await navigator.serviceWorker.register('/akam-sw.js?othersw=https://domain.com/someothersw.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('getActiveState() should detect Akamai akam-sw.js as 3rd party if othersw= is not our worker', async t => {
  await navigator.serviceWorker.register('/akam-sw.js');

  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('notification clicked - While page is opened in background', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
    initOptions: {
      pageUrl: "https://localhost:3001/"
    }
  });

  const mockInstallingWorker = new MockServiceWorker();
  mockInstallingWorker.state = 'activated';
  mockInstallingWorker.scriptURL = 'https://site.com/Worker-A.js';
  const mockWorkerRegistration = new MockServiceWorkerRegistration();
  mockWorkerRegistration.active = mockInstallingWorker;

  sandbox.stub(navigator.serviceWorker, 'controller').resolves(null);

  const manager = LocalHelpers.getServiceWorkerManager();

  const workerMessageReplyBuffer = new WorkerMessengerReplyBuffer();
  OneSignal.context.workerMessenger = new WorkerMessenger(OneSignal.context, workerMessageReplyBuffer);

  sandbox.stub(Event, 'trigger').callsFake(function(event: string) {
    if (event === OneSignal.EVENTS.NOTIFICATION_CLICKED)
      t.pass();
  });

  // Add addListenerForNotificationOpened so service worker fires event instead of storing it
  await OneSignal.addListenerForNotificationOpened(function () {});
  manager.establishServiceWorkerChannel();

  const listeners = workerMessageReplyBuffer.findListenersForMessage(WorkerMessengerCommand.NotificationClicked);
  for (const listenerRecord of listeners)
    listenerRecord.callback.apply(null, ['test']);
});

test('getActiveState() returns an indeterminate status for insecure HTTP pages', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Indeterminate);
});

/***************************************************
 * installWorker()
 ***************************************************
 */

test('installWorker() installs worker A with the correct file name and query parameter when no service worker exists', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  sandbox.stub(Notification, <any>"permission").value("granted");

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
  t.not(navigator.serviceWorker.controller, null);
  if (navigator.serviceWorker.controller !== null) {
    t.true(navigator.serviceWorker.controller.scriptURL.endsWith(
      `/Worker-A.js?appId=${OneSignal.context.appConfig.appId}`)
    );
  }
});

test('installWorker() does NOT install ServiceWorker when permission has NOT been granted', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
  t.is(navigator.serviceWorker.controller, null);
});

test('installWorker() installs worker A when a third party service worker exists', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  sandbox.stub(Notification, <any>"permission").value("granted");

  await navigator.serviceWorker.register('/another-service-worker.js');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
});

test('installWorker() installs Worker B and then A when Worker A is out of date', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  sandbox.stub(Notification, <any>"permission").value("granted");

  const manager = new ServiceWorkerManager(OneSignal.context, {
    workerAPath: new Path('/Worker-A.js'),
    workerBPath: new Path('/Worker-B.js'),
    registrationOptions: { scope: '/' }
  });

  // 1. Install ServiceWorker A and assert it was ServiceWorker A
  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);

  // 2. Simulate an upgraded page SDK 
  const envVerStub = sandbox.stub(Environment, "version").returns(2);
  const spy = sandbox.spy(navigator.serviceWorker, 'register');

  // 3. Attempt to install ServiceWorker which should detect an upgrade
  await manager.installWorker();

  const appConfig = OneSignal.context.appConfig;
  const registerOptions =  { scope: `${location.origin}/` };
  const serviceWorkerAPath = `${location.origin}/Worker-A.js?appId=${appConfig.appId}`;
  const serviceWorkerBPath = `${location.origin}/Worker-B.js?appId=${appConfig.appId}`;

  // 4. Ensure we installed ServiceWorker B, followed by an immediate install of A to switch back.
  t.true(spy.getCall(0).calledWithExactly(serviceWorkerBPath, registerOptions));
  t.true(spy.getCall(1).calledWithExactly(serviceWorkerAPath, registerOptions));
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);

  // 5. Ensure a 2nd upgrade is handled corretly in the same way
  envVerStub.returns(3);
  await manager.installWorker();
  t.true(spy.getCall(2).calledWithExactly(serviceWorkerBPath, registerOptions));
  t.true(spy.getCall(3).calledWithExactly(serviceWorkerAPath, registerOptions));
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);

  // 6. Ensure we did not call more than 4 times
  t.is(spy.callCount, 4);
});

test('Server worker register URL correct when service worker path is a absolute URL', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  sandbox.stub(Notification, <any>"permission").value("granted");

  const manager = new ServiceWorkerManager(OneSignal.context, {
    workerAPath: new Path(`${location.origin}/Worker-A.js`),
    workerBPath: new Path(`${location.origin}/Worker-B.js`),
    registrationOptions: { scope: '/' }
  });

  const serviceWorkerStub = sandbox.spy(navigator.serviceWorker, 'register');
  await manager.installWorker();

  sandbox.assert.alwaysCalledWithExactly(serviceWorkerStub,
    `${location.origin}/Worker-A.js?appId=${OneSignal.context.appConfig.appId}`,
    { scope: `${location.origin}/` }
  );
  t.pass();
});

test("Service worker failed to install due to 404 on host page. Send notification to OneSignal api", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  sandbox.stub(Notification, <any>"permission").value("granted");

  const context = OneSignal.context;

  const workerPath = "Worker-does-not-exist.js";
  const manager = new ServiceWorkerManager(context, {
    workerAPath: new Path(workerPath),
    workerBPath: new Path(workerPath),
    registrationOptions: {
      scope: '/'
    }
  });
  
  const origin = "https://onesignal.com";
  nock(origin)
    .get(function(uri) {
      return uri.indexOf(workerPath) !== -1;
    })
    .reply(404,  (_uri: string, _requestBody: any) => {
      return {
        status: 404,
        statusText: "404 Not Found"
      };
  });

  const workerRegistrationError = new Error("Registration failed");

  sandbox.stub(navigator.serviceWorker, "register").throws(workerRegistrationError);
  sandbox.stub(OneSignalUtils, "getBaseUrl").returns(origin);
  sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
  await t.throws(manager.installWorker(), ServiceWorkerRegistrationError);
});

test("Service worker failed to install in popup. No handling.", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  sandbox.stub(Notification, <any>"permission").value("granted");

  const context = OneSignal.context;

  const workerPath = "Worker-does-not-exist.js";
  const manager = new ServiceWorkerManager(context, {
    workerAPath: new Path(workerPath),
    workerBPath: new Path(workerPath),
    registrationOptions: {
      scope: '/'
    }
  });
  
  const origin = "https://onesignal.com";
  nock(origin)
    .get(function(uri) {
      return uri.indexOf(workerPath) !== -1;
    })
    .reply(404,  (_uri: string, _requestBody: any) => {
      return {
        status: 404,
        statusText: "404 Not Found"
      };
  });

  const workerRegistrationError = new Error("Registration failed");

  sandbox.stub(navigator.serviceWorker, "register").throws(workerRegistrationError);
  sandbox.stub(location, "origin").returns(origin);
  sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.OneSignalSubscriptionPopup);
  const error = await t.throws(manager.installWorker(), Error);
  t.is(error.message, workerRegistrationError.message);
});


test('installWorker() should not install when on an HTTPS site with a subdomain set', async t => {
  // 1. Mock site page as HTTPS
  await TestEnvironment.initialize({ httpOrHttps: HttpHttpsEnvironment.Https });
  TestEnvironment.mockInternalOneSignal();
  // 2. Set is set to use our subdomain however
  const subdomain = "abc";
  const testConfig: TestEnvironmentConfig = {
    integration: ConfigIntegrationKind.TypicalSite,
    overrideServerConfig: {
      config: {
        subdomain: subdomain,
        siteInfo: { proxyOriginEnabled: true, proxyOrigin: subdomain }
      }
    }
  };
  TestEnvironment.mockInternalOneSignal(testConfig);

  const manager = LocalHelpers.getServiceWorkerManager();
  await manager.installWorker();
  // Since ServiceWorker will be installed in the iframe on os.tc Indeterminate is expected
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Indeterminate);
});

test('ServiceWorkerManager.getRegistration() handles throws by returning null', async t => {
  getRegistrationStub.restore();
  getRegistrationStub = sandbox.stub(navigator.serviceWorker, 'getRegistration');

  getRegistrationStub.returns(new Promise(() => {
    throw new Error("HTTP NOT SUPPORTED");
  }));
  const result = await ServiceWorkerManager.getRegistration();
  t.is(result, null);
});
