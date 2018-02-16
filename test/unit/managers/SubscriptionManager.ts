import '../../support/polyfills/polyfills';

import test, { GenericTestContext, Context as AvaContext } from 'ava';
import * as sinon from 'sinon';

import { ServiceWorkerManager, ServiceWorkerActiveState } from '../../../src/managers/ServiceWorkerManager';
import Path from '../../../src/models/Path';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import ServiceWorkerRegistration from '../../support/mocks/service-workers/models/ServiceWorkerRegistration';
import ServiceWorker from '../../support/mocks/service-workers/ServiceWorker';
import { beforeEach } from '../../support/tester/typify';
import Database from '../../../src/services/Database';
import IndexedDb from '../../../src/services/IndexedDb';
import Context from '../../../src/models/Context';
import { Uuid } from '../../../src/models/Uuid';
import { AppConfig } from '../../../src/models/AppConfig';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { base64ToUint8Array, arrayBufferToBase64 } from '../../../src/utils/Encoding';
import PushManager from '../../support/mocks/service-workers/models/PushManager';
import PushSubscription from '../../support/mocks/service-workers/models/PushSubscription';
import PushSubscriptionOptions from '../../support/mocks/service-workers/models/PushSubscriptionOptions';
import * as Browser from 'bowser';
import Random from '../../support/tester/Random';
import { setBrowser } from '../../support/tester/browser';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Uuid.generate();
  t.context.sdkContext = new Context(appConfig);
});

async function testCase(
  /**
   * The browser to simulate. Chrome means using vapidPublicKey, while Firefox means using the
   * global onesignalVapidPublicKey.
   */
  t: GenericTestContext<AvaContext<any>>,
  browser: BrowserUserAgent,
  vapidPublicKeyOption: "generate" | undefined,
  onesignalVapidPublicKeyOption: "generate" | undefined,
) {

  let vapidPublicKey: string;
  let onesignalVapidPublicKey: string;

  // Generate our vapid keys randomly
  if (vapidPublicKeyOption === "generate") {
    vapidPublicKey = arrayBufferToBase64(Random.getRandomUint8Array(64).buffer);
  }
  if (onesignalVapidPublicKeyOption === "generate") {
    onesignalVapidPublicKey = arrayBufferToBase64(Random.getRandomUint8Array(64).buffer);
  }

  // Set the user agent, which determines which vapid key we use
  setBrowser(browser);

  // Create our subscription manager, which is what we're testing
  const manager = new SubscriptionManager(t.context.sdkContext, {
    safariWebId: null,
    appId: Uuid.generate(),
    vapidPublicKey: vapidPublicKey,
    onesignalVapidPublicKey: onesignalVapidPublicKey
  });

  // Register a mock service worker to access push subscription
  await navigator.serviceWorker.register('/worker.js');
  const registration = await navigator.serviceWorker.getRegistration();

  // There should be no existing subscription
  const existingSubscription = await registration.pushManager.getSubscription();
  t.is(existingSubscription, null);

  // Prepare to subscribe for push, hook the call to spy on params
  const spy = sinon.spy(registration.pushManager, 'subscribe');

  // Create our subscription options, which we'll verify later
  let options: PushSubscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(vapidPublicKey).buffer
  };

  // Subscribe for push
  await manager.subscribeFcmVapidOrLegacyKey(registration);

  // Verify the actual mock subscription call went through with our expected options
  t.true(spy.getCall(0).calledWithExactly(options));
  spy.restore();
}

test('subscribeFcmVapidOrLegacyKey() subscribes using unique VAPID for a non-Firefox new user', async t => {
  await testCase(
    t,
    BrowserUserAgent.ChromeMacSupported,
    "generate",
    "generate"
  );
});

test('subscribeFcmVapidOrLegacyKey() subscribes using globally shared VAPID key for a new Firefox user', async t => {
  await testCase(
    t,
    BrowserUserAgent.FirefoxMacSupported,
    "generate",
    "generate"
  );
});

test("subscribeFcmVapidOrLegacyKey() subscribes using last known subscription options if options are available", async t => {
  const VAPID_KEYS = [
    arrayBufferToBase64(Random.getRandomUint8Array(64).buffer),
    arrayBufferToBase64(Random.getRandomUint8Array(64).buffer),
    arrayBufferToBase64(Random.getRandomUint8Array(64).buffer),
    arrayBufferToBase64(Random.getRandomUint8Array(64).buffer),
  ];

  let firstSubscription: PushSubscription;
  let firstSubscriptionOptions: any;
  {
    const manager = new SubscriptionManager(t.context.sdkContext, {
      safariWebId: null,
      appId: Uuid.generate(),
      vapidPublicKey: VAPID_KEYS[0],
      onesignalVapidPublicKey: VAPID_KEYS[1]
    });

    await navigator.serviceWorker.register('/worker.js');
    const registration = await navigator.serviceWorker.getRegistration();
    const existingSubscription = await registration.pushManager.getSubscription();
    t.is(existingSubscription, null);

    const spy = sinon.spy(registration.pushManager, 'subscribe');

    firstSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_KEYS[0]).buffer
    };

    await manager.subscribeFcmVapidOrLegacyKey(registration);

    firstSubscription = await registration.pushManager.getSubscription() as any;

    t.true(spy.getCall(0).calledWithExactly(firstSubscriptionOptions));

    const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
    t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_KEYS[0]).buffer);
    spy.restore();
  }

  // Subscription #2
  {
    const manager = new SubscriptionManager(t.context.sdkContext, {
      safariWebId: null,
      appId: Uuid.generate(),
      vapidPublicKey: VAPID_KEYS[2],
      onesignalVapidPublicKey: VAPID_KEYS[3]
    });

    const registration = await navigator.serviceWorker.getRegistration();
    const previousSubscription: PushSubscription = await registration.pushManager.getSubscription() as any;
    t.deepEqual(previousSubscription, firstSubscription);

    const spy = sinon.spy(registration.pushManager, 'subscribe');

    let options = {
      userVisibleOnly: true,
      applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_KEYS[2]).buffer
    };

    await manager.subscribeFcmVapidOrLegacyKey(registration);

    // Should be called with the first subscription's options, not the second
    t.true(spy.getCall(0).calledWithExactly(firstSubscriptionOptions));

    const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
    // Should be VAPID key from first subscription, not second
    t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_KEYS[0]).buffer);
    spy.restore();
  }
});

// test("subscribeFcmVapidOrLegacyKey() unsubscribes if existing subscription is present without existing subscription options", async t => {
//   let firstSubscription: PushSubscription;
//   let firstSubscriptionOptions: any;
//   {
//     const manager = new SubscriptionManager(t.context.sdkContext, {
//       safariWebId: null,
//       appId: Uuid.generate(),
//       vapidPublicKey: VAPID_PUBLIC_KEY_1,
//       onesignalVapidPublicKey: VAPID_PUBLIC_KEY_2
//     });

//     await navigator.serviceWorker.register('/worker.js');
//     const registration = await navigator.serviceWorker.getRegistration();
//     const existingSubscription = await registration.pushManager.getSubscription();
//     t.is(existingSubscription, null);

//     const spy = sinon.spy(registration.pushManager, 'subscribe');

//     firstSubscriptionOptions = {
//       userVisibleOnly: true,
//       applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer
//     };

//     await manager.subscribeFcmVapidOrLegacyKey(registration);

//     firstSubscription = await registration.pushManager.getSubscription() as any;

//     t.true(spy.getCall(0).calledWithExactly(firstSubscriptionOptions));

//     const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
//     t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_PUBLIC_KEY_1).buffer);
//     spy.restore();
//   }

//   // Subscription #2
//   {
//     const manager = new SubscriptionManager(t.context.sdkContext, {
//       safariWebId: null,
//       appId: Uuid.generate(),
//       vapidPublicKey: VAPID_PUBLIC_KEY_3,
//       onesignalVapidPublicKey: VAPID_PUBLIC_KEY_4
//     });

//     const registration = await navigator.serviceWorker.getRegistration();
//     const previousSubscription: PushSubscription = await registration.pushManager.getSubscription() as any;
//     t.deepEqual(previousSubscription, firstSubscription);

//     const unsubscribeSpy = sinon.spy(PushSubscription.prototype, 'unsubscribe');
//     const subscribeSpy = sinon.spy(registration.pushManager, 'subscribe');
//     // Delete the push subscription options
//     previousSubscription.options = undefined;

//     let options = {
//       userVisibleOnly: true,
//       applicationServerKey: <ArrayBuffer>base64ToUint8Array(VAPID_PUBLIC_KEY_3).buffer
//     };

//     await manager.subscribeFcmVapidOrLegacyKey(registration);

//     // Should be called with the second subscription's options, not the first
//     t.true(unsubscribeSpy.calledOnce);
//     t.true(subscribeSpy.getCall(0).calledWithExactly(options));

//     const actualApplicationServerKey = (await registration.pushManager.getSubscription()).options.applicationServerKey;
//     // Should be VAPID key from second subscription, not first
//     t.deepEqual(actualApplicationServerKey, base64ToUint8Array(VAPID_PUBLIC_KEY_3).buffer);
//     unsubscribeSpy.restore();
//     subscribeSpy.restore();
//   }
// });

