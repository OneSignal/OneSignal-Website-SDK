import '../../support/polyfills/polyfills';

import test from 'ava';
import sinon from 'sinon';

import { ServiceWorkerManager, ServiceWorkerActiveState } from '../../../src/managers/ServiceWorkerManager';
import Path from '../../../src/models/Path';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import ServiceWorkerRegistration from '../../support/mocks/service-workers/models/ServiceWorkerRegistration';
import ServiceWorker from '../../support/mocks/service-workers/ServiceWorker';
import { beforeEach } from '../../support/tester/typify';
import Database from '../../../src/services/Database';
import IndexedDb from '../../../src/services/IndexedDb';
import Context from '../../../src/models/Context';

import { AppConfig } from '../../../src/models/AppConfig';
import OneSignal from '../../../src/OneSignal';
import Random from '../../support/tester/Random';
import {
  WorkerMessenger,
  WorkerMessengerCommand,
  WorkerMessengerReplyBuffer
} from "../../../src/libraries/WorkerMessenger";
import Event from "../../../src/Event";

class LocalHelpers {
  static getServiceWorkerManager(): ServiceWorkerManager {
    return new ServiceWorkerManager(OneSignal.context, {
      workerAPath: new Path('/Worker-A.js'),
      workerBPath: new Path('/Worker-B.js'),
      registrationOptions: {
        scope: '/'
      }
    });
  }
};

test.beforeEach(async t => {
  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  t.context.sdkContext = new Context(appConfig);
  (global as any).OneSignal = {
    context: t.context.sdkContext
  };
});

test('getActiveState() detects no installed worker', async t => {
  await TestEnvironment.stubDomEnvironment();

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
});

test('getActiveState() detects worker A, case sensitive', async t => {
  await TestEnvironment.stubDomEnvironment();

  navigator.serviceWorker.register('/Worker-A.js');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
});

test('getActiveState() detects worker B, case sensitive', async t => {
  await TestEnvironment.stubDomEnvironment();

  navigator.serviceWorker.register('/Worker-B.js');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerB);
});

test('getActiveState() detects worker A, even when worker filename uses query parameters', async t => {
  await TestEnvironment.stubDomEnvironment();

  navigator.serviceWorker.register('/Worker-A.js?appId=12345');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
});

test('getActiveState() detects worker B, even when worker filename uses query parameters', async t => {
  await TestEnvironment.stubDomEnvironment();

  navigator.serviceWorker.register('/Worker-B.js?appId=12345');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerB);
});

test('getActiveState() detects an installing worker (not active)', async t => {
  await TestEnvironment.stubDomEnvironment();

  const mockWorkerRegistration = new ServiceWorkerRegistration();
  const mockInstallingWorker = new ServiceWorker();
  mockInstallingWorker.state = 'installing';
  mockWorkerRegistration.installing = mockInstallingWorker;

  const getRegistrationStub = sinon.stub(navigator.serviceWorker, 'getRegistration').resolves(mockWorkerRegistration);
  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Installing);
  getRegistrationStub.restore();
});
test('getActiveState() detects a 3rd party worker, a worker that is activated but has an unrecognized script URL', async t => {
  await TestEnvironment.stubDomEnvironment();

  navigator.serviceWorker.register('/Worker-C.js');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
});

test('getActiveState() detects a page loaded by hard-refresh with our service worker as bypassed', async t => {
  await TestEnvironment.stubDomEnvironment();

  const mockWorkerRegistration = new ServiceWorkerRegistration();
  const mockInstallingWorker = new ServiceWorker();
  mockInstallingWorker.state = 'activated';
  mockInstallingWorker.scriptURL = 'https://site.com/Worker-A.js';
  mockWorkerRegistration.active = mockInstallingWorker;

  const getRegistrationStub = sinon.stub(navigator.serviceWorker, 'getRegistration').resolves(mockWorkerRegistration);
  const controllerStub = sinon.stub(navigator.serviceWorker, 'controller').resolves(null);
  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.Bypassed);
  getRegistrationStub.restore();
  controllerStub.restore();
});

test('getActiveState() detects an activated third-party service worker not controlling the page as third-party and not bypassed', async t => {
  await TestEnvironment.stubDomEnvironment();

  const mockWorkerRegistration = new ServiceWorkerRegistration();
  const mockInstallingWorker = new ServiceWorker();
  mockInstallingWorker.state = 'activated';
  mockInstallingWorker.scriptURL = 'https://site.com/another-worker.js';
  mockWorkerRegistration.active = mockInstallingWorker;

  const getRegistrationStub = sinon.stub(navigator.serviceWorker, 'getRegistration').resolves(mockWorkerRegistration);
  const controllerStub = sinon.stub(navigator.serviceWorker, 'controller').resolves(null);
  const manager = LocalHelpers.getServiceWorkerManager();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
  getRegistrationStub.restore();
  controllerStub.restore();
});


test('notification clicked - While page is opened in background', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
    initOptions: {
      pageUrl: "https://localhost:3001/"
    }
  });
  await TestEnvironment.stubDomEnvironment();

  const mockWorkerRegistration = new ServiceWorkerRegistration();
  const mockInstallingWorker = new ServiceWorker();
  mockInstallingWorker.state = 'activated';
  mockInstallingWorker.scriptURL = 'https://site.com/Worker-A.js';
  mockWorkerRegistration.active = mockInstallingWorker;

  const getRegistrationStub = sinon.stub(navigator.serviceWorker, 'getRegistration').resolves(mockWorkerRegistration);
  const controllerStub = sinon.stub(navigator.serviceWorker, 'controller').resolves(null);

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  const context = new Context(appConfig);
  OneSignal.context = context;

  const manager = LocalHelpers.getServiceWorkerManager();

  const workerMessageReplyBuffer = new WorkerMessengerReplyBuffer();
  context.workerMessenger = new WorkerMessenger(context, workerMessageReplyBuffer);

  const triggerStub = sinon.stub(Event, 'trigger', function(event) {
      if (event === OneSignal.EVENTS.NOTIFICATION_CLICKED)
        t.pass();
  });

  manager.establishServiceWorkerChannel();

  const listeners = workerMessageReplyBuffer.findListenersForMessage(WorkerMessengerCommand.NotificationClicked);
  for (let listenerRecord of listeners)
    listenerRecord.callback.apply(null, ["test"]);

  getRegistrationStub.restore();
  controllerStub.restore();
  triggerStub.restore();
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

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  const context = new Context(appConfig);
  OneSignal.context = context;

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.None);
  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
  t.true(navigator.serviceWorker.controller.scriptURL.endsWith(`/Worker-A.js?appId=${appConfig.appId}`));
});

test('installWorker() installs worker A when a third party service worker exists', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  const context = new Context(appConfig);

  navigator.serviceWorker.register('/another-service-worker.js');

  const manager = LocalHelpers.getServiceWorkerManager();

  t.is(await manager.getActiveState(), ServiceWorkerActiveState.ThirdParty);
  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);
});

test('installWorker() installs Worker B and then A when Worker A exists', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  const context = new Context(appConfig);

  const manager = new ServiceWorkerManager(context, {
    workerAPath: new Path('/Worker-A.js'),
    workerBPath: new Path('/Worker-B.js'),
    registrationOptions: {
      scope: '/'
    }
  });

  await manager.installWorker();
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);

  const spy = sinon.spy(navigator.serviceWorker, 'register');

  await manager.installWorker();
  t.true(spy.getCall(0).calledWithExactly(`/Worker-B.js?appId=${appConfig.appId}`, { scope: '/' }));
  t.true(spy.getCall(1).calledWithExactly(`/Worker-A.js?appId=${appConfig.appId}`, { scope: '/' }));
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);

  await manager.installWorker();
  t.true(spy.getCall(2).calledWithExactly(`/Worker-B.js?appId=${appConfig.appId}`, { scope: '/' }));
  t.true(spy.getCall(3).calledWithExactly(`/Worker-A.js?appId=${appConfig.appId}`, { scope: '/' }));
  t.is(await manager.getActiveState(), ServiceWorkerActiveState.WorkerA);

  t.is(spy.callCount, 4);
  spy.restore();
});
