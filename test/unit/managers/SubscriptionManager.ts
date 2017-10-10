import '../../support/polyfills/polyfills';

import test from 'ava';
import * as sinon from 'sinon';

import { ServiceWorkerManager, ServiceWorkerActiveState } from '../../../src/managers/ServiceWorkerManager';
import Path from '../../../src/models/Path';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import ServiceWorkerRegistration from '../../support/mocks/service-workers/models/ServiceWorkerRegistration';
import ServiceWorker from '../../support/mocks/service-workers/ServiceWorker';
import { beforeEach } from '../../support/tester/typify';
import Database from '../../../src/services/Database';
import IndexedDb from '../../../src/services/IndexedDb';
import Context from '../../../src/models/Context';
import { Uuid } from '../../../src/models/Uuid';
import { AppConfig } from '../../../src/models/AppConfig';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { base64ToUint8Array } from '../../../src/utils/Encoding';
import PushManager from '../../support/mocks/service-workers/models/PushManager';
import PushSubscription from '../../support/mocks/service-workers/models/PushSubscription';
import * as Browser from 'bowser';

const VAPID_PUBLIC_KEY_1 = "BApIoaDI71cs0_CyqXYeXJNGrfIcFE_kl8Z-Z46f7T20lO8OtHYXzh3q9z-eXVmLd9ohXtwnBZ5GibCmxvysB2Q";
const VAPID_PUBLIC_KEY_2 = "BLh-Qi0yJanQKiwICfQq25-Ei_ldA_M2egYPg4atuM-d8etfKivGxf9A0cvV6SRWyNa55d-ou6DMPQ0RS3PvH2c";
const VAPID_PUBLIC_KEY_3 = "BCby4gNzhCB3OJTN3D_ikJX6vXP3QCfCqvjdZiVo3iGu3v1lvd7ag1EhJ4mY5ZKdaT3SXAq3tFHbJs18vMkotCg";
const VAPID_PUBLIC_KEY_4 = "BLJulivFUQZga5gRHWa1EH5R9HamdlZDyGrxYxEwwE8cxnSx4S_JUV7YzB9AVSdJq66cRU7slP1r3Jb_CbFKlpw";
const VAPID_PUBLIC_KEY_5 = "BJp6nj9bulL5n7wEhf53taIrmm9U-t2WYlip6qmRYgyYgCvWoqju__XmOdiuWE_VfN_JOg_flIjEt-355BU0umM";

test('subscribeFcmVapidOrLegacyKey() subscribes using unique VAPID for a non-Firefox new user', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  const context = new Context(appConfig);

  const manager = new SubscriptionManager(context, {
    safariWebId: null,
    appId: Uuid.generate(),
    vapidPublicKey: VAPID_PUBLIC_KEY_1,
    onesignalVapidPublicKey: VAPID_PUBLIC_KEY_2
  });

  // Register a mock service worker to access push subscription
  await navigator.serviceWorker.register('/worker.js');
  const registration = await navigator.serviceWorker.getRegistration();

  // There should be no existing subscription
  const existingSubscription = await registration.pushManager.getSubscription();
  t.is(existingSubscription, null);

  const spy = sinon.spy(registration.pushManager, 'subscribe');

  let options: PushSubscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer
  };
  await manager.subscribeFcmVapidOrLegacyKey(registration);

  t.true(spy.getCall(0).calledWithExactly(options));
  spy.restore();
});

test('subscribeFcmVapidOrLegacyKey() subscribes using globally shared VAPID key for a new Firefox user', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  const context = new Context(appConfig);

  const manager = new SubscriptionManager(context, {
    safariWebId: null,
    appId: Uuid.generate(),
    vapidPublicKey: VAPID_PUBLIC_KEY_1,
    onesignalVapidPublicKey: VAPID_PUBLIC_KEY_2
  });

  // Register a mock service worker to access push subscription
  await navigator.serviceWorker.register('/worker.js');
  const registration = await navigator.serviceWorker.getRegistration();

  // There should be no existing subscription
  const existingSubscription = await registration.pushManager.getSubscription();
  t.is(existingSubscription, null);

  const spy = sinon.spy(registration.pushManager, 'subscribe');

  let options = {
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY_2).buffer
  };
  await manager.subscribeFcmVapidOrLegacyKey(registration);

  t.true(spy.getCall(0).calledWithExactly(options));
  spy.restore();
});

test("subscribeFcmVapidOrLegacyKey() subscribes using FCM sender ID for a new user if VAPID isn't available", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  const context = new Context(appConfig);

  const manager = new SubscriptionManager(context, {
    safariWebId: null,
    appId: Uuid.generate(),
    vapidPublicKey: undefined,
    onesignalVapidPublicKey: undefined,
  });

  await navigator.serviceWorker.register('/worker.js');
  const registration = await navigator.serviceWorker.getRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();
  t.is(existingSubscription, null);

  const spy = sinon.spy(registration.pushManager, 'subscribe');

  let options = {
    userVisibleOnly: true,
    // undefined means the subscription is being done with the manifest.json gcm_sender_id (or v1 wpush for Firefox)
    applicationServerKey: undefined
  };
  await manager.subscribeFcmVapidOrLegacyKey(registration);

  t.true(spy.getCall(0).calledWithExactly(options));

  const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
  t.is(actualApplicationServerKey, PushManager.GCM_SENDER_ID as any);
  spy.restore();
});

test("subscribeFcmVapidOrLegacyKey() subscribes using last known subscription options if options are available", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  const context = new Context(appConfig);

  let firstSubscription: PushSubscription;
  let firstSubscriptionOptions: any;
  {
    const manager = new SubscriptionManager(context, {
      safariWebId: null,
      appId: Uuid.generate(),
      vapidPublicKey: VAPID_PUBLIC_KEY_1,
      onesignalVapidPublicKey: VAPID_PUBLIC_KEY_2
    });

    await navigator.serviceWorker.register('/worker.js');
    const registration = await navigator.serviceWorker.getRegistration();
    const existingSubscription = await registration.pushManager.getSubscription();
    t.is(existingSubscription, null);

    const spy = sinon.spy(registration.pushManager, 'subscribe');

    firstSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer
    };

    await manager.subscribeFcmVapidOrLegacyKey(registration);

    firstSubscription = await registration.pushManager.getSubscription() as any;

    t.true(spy.getCall(0).calledWithExactly(firstSubscriptionOptions));

    const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
    t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer);
    spy.restore();
  }

  // Subscription #2
  {
    const manager = new SubscriptionManager(context, {
      safariWebId: null,
      appId: Uuid.generate(),
      vapidPublicKey: VAPID_PUBLIC_KEY_3,
      onesignalVapidPublicKey: VAPID_PUBLIC_KEY_4
    });

    const registration = await navigator.serviceWorker.getRegistration();
    const previousSubscription: PushSubscription = await registration.pushManager.getSubscription() as any;
    t.deepEqual(previousSubscription, firstSubscription);

    const spy = sinon.spy(registration.pushManager, 'subscribe');

    let options = {
      userVisibleOnly: true,
      applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_PUBLIC_KEY_3).buffer
    };

    await manager.subscribeFcmVapidOrLegacyKey(registration);

    // Should be called with the first subscription's options, not the second
    t.true(spy.getCall(0).calledWithExactly(firstSubscriptionOptions));

    const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
    // Should be VAPID key from first subscription, not second
    t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer);
    spy.restore();
  }
});

test("subscribeFcmVapidOrLegacyKey() unsubscribes if existing subscription is present without existing subscription options", async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  const context = new Context(appConfig);

  let firstSubscription: PushSubscription;
  let firstSubscriptionOptions: any;
  {
    const manager = new SubscriptionManager(context, {
      safariWebId: null,
      appId: Uuid.generate(),
      vapidPublicKey: VAPID_PUBLIC_KEY_1,
      onesignalVapidPublicKey: VAPID_PUBLIC_KEY_2
    });

    await navigator.serviceWorker.register('/worker.js');
    const registration = await navigator.serviceWorker.getRegistration();
    const existingSubscription = await registration.pushManager.getSubscription();
    t.is(existingSubscription, null);

    const spy = sinon.spy(registration.pushManager, 'subscribe');

    firstSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer
    };

    await manager.subscribeFcmVapidOrLegacyKey(registration);

    firstSubscription = await registration.pushManager.getSubscription() as any;

    t.true(spy.getCall(0).calledWithExactly(firstSubscriptionOptions));

    const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
    t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer);
    spy.restore();
  }

  // Subscription #2
  {
    const manager = new SubscriptionManager(context, {
      safariWebId: null,
      appId: Uuid.generate(),
      vapidPublicKey: VAPID_PUBLIC_KEY_3,
      onesignalVapidPublicKey: VAPID_PUBLIC_KEY_4
    });

    const registration = await navigator.serviceWorker.getRegistration();
    const previousSubscription: PushSubscription = await registration.pushManager.getSubscription() as any;
    t.deepEqual(previousSubscription, firstSubscription);

    const unsubscribeSpy = sinon.spy(PushSubscription.prototype, 'unsubscribe');
    const subscribeSpy = sinon.spy(registration.pushManager, 'subscribe');
    // Delete the push subscription options
    previousSubscription.options = undefined;

    let options = {
      userVisibleOnly: true,
      applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_PUBLIC_KEY_3).buffer
    };

    await manager.subscribeFcmVapidOrLegacyKey(registration);

    // Should be called with the second subscription's options, not the first
    t.true(unsubscribeSpy.calledOnce);
    t.true(subscribeSpy.getCall(0).calledWithExactly(options));

    const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
    // Should be VAPID key from second subscription, not first
    t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_PUBLIC_KEY_3).buffer);
    unsubscribeSpy.restore();
    subscribeSpy.restore();
  }
});

