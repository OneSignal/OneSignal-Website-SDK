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
import { SubscriptionStrategyKind } from "../../../src/models/SubscriptionStrategyKind";
import { RawPushSubscription } from "../../../src/models/RawPushSubscription";

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
  vapidPublicKey: string,
  sharedVapidPublicKey: string,
  subscriptionStrategy: SubscriptionStrategyKind,
  onBeforeSubscriptionManagerSubscribe:
    (pushManager: PushManager, subscriptionManager: SubscriptionManager) => Promise<void>,
  onPushManagerSubscribed: (pushManager: PushManager, spy: sinon.SinonSpy) => Promise<void>,
) {

  // Set the user agent, which determines which vapid key we use
  setBrowser(browser);

  // Create our subscription manager, which is what we're testing
  const manager = new SubscriptionManager(t.context.sdkContext, {
    safariWebId: null,
    appId: Uuid.generate(),
    vapidPublicKey: vapidPublicKey,
    onesignalVapidPublicKey: sharedVapidPublicKey
  });

  // Register a mock service worker to access push subscription
  await navigator.serviceWorker.register('/worker.js');
  const registration: any = await navigator.serviceWorker.getRegistration();

  // There should be no existing subscription
  const existingSubscription = await registration.pushManager.getSubscription();
  t.is(existingSubscription, null);

  if (onBeforeSubscriptionManagerSubscribe) {
    await onBeforeSubscriptionManagerSubscribe(registration.pushManager, manager);
  }

  // Prepare to subscribe for push, hook the call to spy on params
  const spy = sinon.spy(PushManager.prototype, 'subscribe');

  // Subscribe for push
  await manager.subscribeFcmVapidOrLegacyKey(registration.pushManager as any, subscriptionStrategy);

  // Allow each test to verify mock parameters independently
  if (onPushManagerSubscribed) {
    await onPushManagerSubscribed(registration.pushManager, spy);
  }

  // Restore original mocked method
  spy.restore();
}

function generateVapidKeys() {
  return {
    uniquePublic: arrayBufferToBase64(Random.getRandomUint8Array(64).buffer),
    sharedPublic: arrayBufferToBase64(Random.getRandomUint8Array(64).buffer)
  };
}

test('uses per-app VAPID public key for Chrome', async t => {
  const vapidKeys = generateVapidKeys();
  await testCase(
    t,
    BrowserUserAgent.ChromeMacSupported,
    vapidKeys.uniquePublic,
    vapidKeys.sharedPublic,
    SubscriptionStrategyKind.ResubscribeExisting,
    null,
    async (pushManager, pushManagerSubscribeSpy) => {
      const expectedSubscriptionOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        // Verify using unique per-app VAPID key
        applicationServerKey: base64ToUint8Array(vapidKeys.uniquePublic).buffer
      };

      t.true(pushManagerSubscribeSpy.getCall(0).calledWithExactly(expectedSubscriptionOptions));
    }
  );
});

test('uses globally shared VAPID public key for Firefox', async t => {
  const vapidKeys = generateVapidKeys();
  await testCase(
    t,
    BrowserUserAgent.ChromeMacSupported,
    vapidKeys.uniquePublic,
    vapidKeys.sharedPublic,
    SubscriptionStrategyKind.ResubscribeExisting,
    null,
    async (pushManager, pushManagerSubscribeSpy) => {
      const expectedSubscriptionOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        // Verify using shared VAPID key
        applicationServerKey: base64ToUint8Array(vapidKeys.sharedPublic).buffer
      };

      t.true(pushManagerSubscribeSpy.getCall(0).calledWithExactly(expectedSubscriptionOptions));
    }
  );
});

test('resubscribe-existing strategy uses existing subscription options', async t => {
  const initialVapidKeys = generateVapidKeys();
  const subsequentVapidKeys = generateVapidKeys();

  const initialSubscriptionOptions: PushSubscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(initialVapidKeys.uniquePublic).buffer,
  };

  await testCase(
    t,
    BrowserUserAgent.ChromeMacSupported,
    subsequentVapidKeys.uniquePublic,
    subsequentVapidKeys.sharedPublic,
    SubscriptionStrategyKind.ResubscribeExisting,
    async (pushManager, subscriptionManager) => {
      // Create an initial subscription, so subsequent subscription attempts re-use this initial
      // subscription's options
      await pushManager.subscribe(initialSubscriptionOptions);
    },
    async (pushManager, pushManagerSubscribeSpy) => {
      // The subscription options used should be identical to our initial subscription's options
      const calledSubscriptionOptions = pushManagerSubscribeSpy.getCall(0).args[0];
      t.deepEqual(calledSubscriptionOptions, initialSubscriptionOptions);
    }
  );
});

test(
  "resubscribe existing strategy unsubscribes and creates new subscription if existing subscription options are null",
  async t => {
    const initialVapidKeys = generateVapidKeys();
    const subsequentVapidKeys = generateVapidKeys();

    const initialSubscriptionOptions: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(initialVapidKeys.uniquePublic).buffer,
    };
    const subsequentSubscriptionOptions: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(subsequentVapidKeys.uniquePublic).buffer,
    };

    let unsubscribeSpy: sinon.SinonSpy;

    await testCase(
      t,
      BrowserUserAgent.ChromeMacSupported,
      subsequentVapidKeys.uniquePublic,
      subsequentVapidKeys.sharedPublic,
      SubscriptionStrategyKind.ResubscribeExisting,
      async (pushManager, subscriptionManager) => {
        // Create an initial subscription, so subsequent subscriptions attempt to re-use this initial
        // subscription's options
        await pushManager.subscribe(initialSubscriptionOptions);

        // But set the subscription's options to be null
        const subscription = await pushManager.getSubscription();
        subscription.options = null;

        // And spy on PushManager.unsubscribe(), because we expect the existing subscription to be unsubscribed
        unsubscribeSpy = sinon.spy(PushSubscription.prototype, 'unsubscribe');
      },
      async (pushManager, pushManagerSubscribeSpy) => {
        // The subscription options used should be our subsequent subscription's options
        const calledSubscriptionOptions = pushManagerSubscribeSpy.getCall(0).args[0];
        t.deepEqual(calledSubscriptionOptions, subsequentSubscriptionOptions);

        // Unsubscribe should have been called
        t.true(unsubscribeSpy.calledOnce);
      }
    );

    unsubscribeSpy.restore();
  }
);

test(
  "subscribe new strategy creates new subscription",
  async t => {
    const initialVapidKeys = generateVapidKeys();
    const subsequentVapidKeys = generateVapidKeys();

    const initialSubscriptionOptions: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(initialVapidKeys.uniquePublic).buffer,
    };
    const subsequentSubscriptionOptions: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(subsequentVapidKeys.uniquePublic).buffer,
    };
    let initialSubscription: PushSubscription;

    await testCase(
      t,
      BrowserUserAgent.ChromeMacSupported,
      subsequentVapidKeys.uniquePublic,
      subsequentVapidKeys.sharedPublic,
      SubscriptionStrategyKind.SubscribeNew,
      async (pushManager, subscriptionManager) => {
        // Create an initial subscription, check that our subsequent subscription is NOT the same
        initialSubscription = await pushManager.subscribe(initialSubscriptionOptions);
      },
      async (pushManager, pushManagerSubscribeSpy) => {
        // The subscription options used should be our subsequent subscription's options
        const calledSubscriptionOptions = pushManagerSubscribeSpy.getCall(0).args[0];
        t.deepEqual(calledSubscriptionOptions, subsequentSubscriptionOptions);

        const subsequentSubscription = await pushManager.getSubscription();
        t.notDeepEqual(initialSubscription, subsequentSubscription)
      }
    );
  }
);

test(
  "subscribe new strategy unsubscribes existing subscription to create new subscription",
  async t => {
    const initialVapidKeys = generateVapidKeys();
    const subsequentVapidKeys = generateVapidKeys();

    const initialSubscriptionOptions: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(initialVapidKeys.uniquePublic).buffer,
    };
    const subsequentSubscriptionOptions: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(subsequentVapidKeys.uniquePublic).buffer,
    };

    let unsubscribeSpy: sinon.SinonSpy;

    await testCase(
      t,
      BrowserUserAgent.ChromeMacSupported,
      subsequentVapidKeys.uniquePublic,
      subsequentVapidKeys.sharedPublic,
      SubscriptionStrategyKind.SubscribeNew,
      async (pushManager, subscriptionManager) => {
        // Create an initial subscription, so subsequent subscriptions attempt to re-use this initial
        // subscription's options
        await pushManager.subscribe(initialSubscriptionOptions);

        // And spy on PushManager.unsubscribe(), because we expect the existing subscription to be unsubscribed
        unsubscribeSpy = sinon.spy(PushSubscription.prototype, 'unsubscribe');
      },
      async (pushManager, pushManagerSubscribeSpy) => {
        // Unsubscribe should have been called
        t.true(unsubscribeSpy.calledOnce);
      }
    );

    unsubscribeSpy.restore();
  }
);
