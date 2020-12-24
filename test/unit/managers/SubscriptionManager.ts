import '../../support/polyfills/polyfills';

import test, { ThrowsExpectation, ExecutionContext } from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import timemachine from 'timemachine';

import { ServiceWorkerManager } from '../../../src/managers/ServiceWorkerManager';
import { ServiceWorkerActiveState } from '../../../src/helpers/ServiceWorkerHelper';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import Database from '../../../src/services/Database';
import Context from '../../../src/models/Context';
import { SubscriptionManager, SubscriptionManagerConfig } from '../../../src/managers/SubscriptionManager';
import { base64ToUint8Array, arrayBufferToBase64 } from '../../../src/utils/Encoding';
import Random from '../../support/tester/Random';
import { setBrowser } from '../../support/tester/browser';
import { SubscriptionStrategyKind } from "../../../src/models/SubscriptionStrategyKind";
import { RawPushSubscription } from '../../../src/models/RawPushSubscription';
import { IntegrationKind } from '../../../src/models/IntegrationKind';
import OneSignal from '../../../src/OneSignal';
import { ServiceWorkerRegistrationError } from '../../../src/errors/ServiceWorkerRegistrationError';
import { SubscriptionStateKind } from '../../../src/models/SubscriptionStateKind';
import { WindowEnvironmentKind } from '../../../src/models/WindowEnvironmentKind';
import SdkEnvironment from '../../../src/managers/SdkEnvironment';
import { OneSignalUtils } from '../../../src/utils/OneSignalUtils';
import { Subscription } from "../../../src/models/Subscription";
import { PushDeviceRecord } from "../../../src/models/PushDeviceRecord";
import { MockPushManager } from "../../support/mocks/service-workers/models/MockPushManager";
import { MockPushSubscription } from "../../support/mocks/service-workers/models/MockPushSubscription";

const sandbox: SinonSandbox= sinon.sandbox.create();

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  TestEnvironment.mockInternalOneSignal();
  timemachine.reset();
});

test.afterEach(function () {
  sandbox.restore();
});

async function testCase(
  /**
   * The browser to simulate. Chrome means using vapidPublicKey, while Firefox means using the
   * global onesignalVapidPublicKey.
   */
  t: ExecutionContext,
  browser: BrowserUserAgent,
  vapidPublicKey: string,
  sharedVapidPublicKey: string,
  subscriptionStrategy: SubscriptionStrategyKind,
  onBeforeSubscriptionManagerSubscribe:
    (pushManager: PushManager, subscriptionManager: SubscriptionManager) => Promise<void>,
  onPushManagerSubscribed: (
    pushManager: PushManager,
    spy: sinon.SinonSpy,
    subscriptionManager: SubscriptionManager
  ) => Promise<void>,
) {

  // Set the user agent, which determines which vapid key we use
  setBrowser(browser);

  // Create our subscription manager, which is what we're testing
  const manager = new SubscriptionManager(OneSignal.context, {
    safariWebId: undefined,
    appId: Random.getRandomUuid(),
    vapidPublicKey: vapidPublicKey,
    onesignalVapidPublicKey: sharedVapidPublicKey
  } as SubscriptionManagerConfig);

  // Register a mock service worker to access push subscription
  await navigator.serviceWorker.register('/worker.js');
  const registration: any = await ServiceWorkerManager.getRegistration();

  // There should be no existing subscription
  const existingSubscription = await registration.pushManager.getSubscription();
  t.is(existingSubscription, null);

  if (onBeforeSubscriptionManagerSubscribe) {
    await onBeforeSubscriptionManagerSubscribe(registration.pushManager, manager);
  }

  // Prepare to subscribe for push, hook the call to spy on params
  const spy = sandbox.spy(MockPushManager.prototype, 'subscribe');

  // Subscribe for push
  await manager.subscribeWithVapidKey(registration.pushManager, subscriptionStrategy);

  // Allow each test to verify mock parameters independently
  if (onPushManagerSubscribed) {
    await onPushManagerSubscribed(registration.pushManager, spy, manager);
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

test('resubscribe-existing strategy uses new subscription applicationServerKey', async t => {
  const initialVapidKeys = generateVapidKeys();
  const subsequentVapidKeys = generateVapidKeys();

  const initialSubscriptionOptions: PushSubscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(initialVapidKeys.uniquePublic).buffer,
  };

  let unsubscribeSpy: sinon.SinonSpy;

  await testCase(
    t,
    BrowserUserAgent.ChromeMacSupported,
    subsequentVapidKeys.uniquePublic,
    subsequentVapidKeys.sharedPublic,
    SubscriptionStrategyKind.ResubscribeExisting,
    async (pushManager, _subscriptionManager) => {
      // Create an initial subscription, so subsequent subscription attempts logic is tested
      await pushManager.subscribe(initialSubscriptionOptions);
      // And spy on PushManager.unsubscribe(), because we expect the existing subscription to be unsubscribed
      unsubscribeSpy = sandbox.spy(MockPushSubscription.prototype, 'unsubscribe');
    },
    async (_pushManager, pushManagerSubscribeSpy) => {
      const newSubscriptionOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(subsequentVapidKeys.uniquePublic).buffer,
      };
      // The subscription options used should always use the new subscription's options
      const calledSubscriptionOptions = pushManagerSubscribeSpy.getCall(0).args[0];
      t.deepEqual(calledSubscriptionOptions, newSubscriptionOptions);
      // Unsubscribe should have been called
      t.true(unsubscribeSpy.calledOnce);
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
      async (pushManager, _subscriptionManager) => {
        // Create an initial subscription, so subsequent subscriptions attempt to re-use this initial
        // subscription's options
        await pushManager.subscribe(initialSubscriptionOptions);

        // And spy on PushManager.unsubscribe(), because we expect the existing subscription to be unsubscribed
        unsubscribeSpy = sandbox.spy(MockPushSubscription.prototype, 'unsubscribe');
      },
      async (_pushManager, pushManagerSubscribeSpy) => {
        // The subscription options used should be our subsequent subscription's options
        const calledSubscriptionOptions = pushManagerSubscribeSpy.getCall(0).args[0];
        t.deepEqual(calledSubscriptionOptions, subsequentSubscriptionOptions);

        // Unsubscribe should have been called
        t.true(unsubscribeSpy.calledOnce);
      }
    );
  }
);

test(
  "resubscribe existing strategy does not unsubscribes if options are not null",
  async t => {
    const subsequentVapidKeys = generateVapidKeys();
    let unsubscribeSpy: sinon.SinonSpy;

    await testCase(
      t,
      BrowserUserAgent.ChromeMacSupported,
      subsequentVapidKeys.uniquePublic,
      subsequentVapidKeys.sharedPublic,
      SubscriptionStrategyKind.ResubscribeExisting,
      async (_pushManager, _subscriptionManager) => {
        // And spy on PushManager.unsubscribe(), because we expect the existing subscription to be unsubscribed
        unsubscribeSpy = sandbox.spy(MockPushSubscription.prototype, 'unsubscribe');
      },
      async (_pushManager, pushManagerSubscribeSpy) => {
        // The subscription options used should be our subsequent subscription's options
        const calledSubscriptionOptions = pushManagerSubscribeSpy.getCall(0).args[0];
        const subsequentSubscriptionOptions: PushSubscriptionOptions = {
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(subsequentVapidKeys.uniquePublic).buffer,
        };
        t.deepEqual(calledSubscriptionOptions, subsequentSubscriptionOptions);

        // Unsubscribe should NOT have been called
        t.false(unsubscribeSpy.calledOnce);
      }
    );
  }
);

test(
  "null applicationServerKey throws when subscribing",
  async t => {

    const manager = new SubscriptionManager(OneSignal.context, {
      safariWebId: undefined,
      appId: Random.getRandomUuid(),
      vapidPublicKey: <any>undefined, // Forcing vapidPublicKey to undefined to test throwing
      onesignalVapidPublicKey: generateVapidKeys().sharedPublic
    } as SubscriptionManagerConfig);
    await t.throwsAsync(manager.subscribe.bind(null, SubscriptionStrategyKind.SubscribeNew),
    { instanceOf: Error });
  }
);

test("registerSubscription with an existing subsription sends player update", async t => {
  TestEnvironment.mockInternalOneSignal();

  const subscriptionManager = OneSignal.context.subscriptionManager;
  const deviceId = OneSignalUtils.getRandomUuid();
  const pushSubscription: RawPushSubscription = new RawPushSubscription();
  pushSubscription.w3cAuth = "7QdgQYTjZIeiCuLgopqeww";
  pushSubscription.w3cP256dh = "BBGhFwQ146CSOWhuz-r4ItRK2cQuZ4FZNkiW7uTEpf2JsPfxqbWtQvfGf4FvnaZ35hqjkwbtUUIn8wxwhhc3O_0";
  pushSubscription.w3cEndpoint = new URL("https://fcm.googleapis.com/fcm/send/c8rEdO3xSaQ:APA91bH51jGBPBVSxoZVLq-xwen6oHYmGVpyjR8qG_869A-skv1a5G9PQ5g2S5O8ujJ2y8suHaPF0psX5590qrZj_WnWbVfx2q4u2Vm6_Ofq-QGBDcomRziLzTn6uWU9wbrrmL6L5YBh");

  const deviceRecord: PushDeviceRecord = PushDeviceRecord.createFromPushSubscription(
    OneSignal.config.appId,
    RawPushSubscription.deserialize(pushSubscription)
  );

  sandbox.stub(Database, "getSubscription").resolves({ deviceId } as Subscription);
  sandbox.stub(subscriptionManager, "associateSubscriptionWithEmail").resolves();
  sandbox.stub(SubscriptionManager, "isSafari").returns(false);
  sandbox.stub(Database, "setSubscription").resolves();

  const playerUpdateSpy = sandbox.stub(OneSignal.context.updateManager, "sendPlayerUpdate");
  const playerCreateSpy = sandbox.stub(OneSignal.context.updateManager, "sendPlayerCreate");

  await subscriptionManager.registerSubscription(pushSubscription)

  t.is(playerUpdateSpy.calledOnce, true);
  t.is(playerCreateSpy.notCalled, true);
  const args = playerUpdateSpy.getCall(0).args;
  t.is(args.length, 1);
  t.deepEqual(args[0], deviceRecord);
});

test("registerSubscription without an existing subsription sends player create", async t => {
  TestEnvironment.mockInternalOneSignal();

  const subscriptionManager = OneSignal.context.subscriptionManager;
  const deviceId = OneSignalUtils.getRandomUuid();
  const pushSubscription = {
    w3cAuth: "7QdgQYTjZIeiCuLgopqeww",
    w3cP256dh: "BBGhFwQ146CSOWhuz-r4ItRK2cQuZ4FZNkiW7uTEpf2JsPfxqbWtQvfGf4FvnaZ35hqjkwbtUUIn8wxwhhc3O_0",
    w3cEndpoint: new URL("https://fcm.googleapis.com/fcm/send/c8rEdO3xSaQ:APA91bH51jGBPBVSxoZVLq-xwen6oHYmGVpyjR8qG_869A-skv1a5G9PQ5g2S5O8ujJ2y8suHaPF0psX5590qrZj_WnWbVfx2q4u2Vm6_Ofq-QGBDcomRziLzTn6uWU9wbrrmL6L5YBh"),
  } as any;
  const deviceRecord: PushDeviceRecord = PushDeviceRecord.createFromPushSubscription(
    OneSignal.config.appId,
    pushSubscription
  );
  let updateData: any = {
    notification_types: SubscriptionStateKind.Subscribed
  }
  updateData = Object.assign(updateData, deviceRecord.serialize());

  sandbox.stub(Database, "getSubscription").resolves({ } as Subscription);
  sandbox.stub(subscriptionManager, "associateSubscriptionWithEmail").resolves();
  sandbox.stub(PushDeviceRecord, "createFromPushSubscription").returns(deviceRecord);
  sandbox.stub(SubscriptionManager, "isSafari").returns(false);
  sandbox.stub(Database, "setSubscription").resolves();

  const playerUpdateSpy = sandbox.stub(OneSignal.context.updateManager, "sendPlayerUpdate");
  const playerCreateSpy = sandbox.stub(OneSignal.context.updateManager, "sendPlayerCreate");

  await subscriptionManager.registerSubscription(pushSubscription)

  t.is(playerUpdateSpy.notCalled, true);
  t.is(playerCreateSpy.calledOnce, true);
  const args = playerCreateSpy.getCall(0).args;
  t.is(args.length, 1);
  t.deepEqual(args[0], deviceRecord);
});

test('device ID is available after register event', async t => {
  const vapidKeys = generateVapidKeys();

  await testCase(
    t,
    BrowserUserAgent.ChromeMacSupported,
    vapidKeys.uniquePublic,
    vapidKeys.sharedPublic,
    SubscriptionStrategyKind.SubscribeNew,
    null,
    null
  );

  const serviceWorkerRegistration = await ServiceWorkerManager.getRegistration();
  const pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
  const rawPushSubscription = RawPushSubscription.setFromW3cSubscription(pushSubscription);
  const randomPlayerId = Random.getRandomUuid();

  const registerEventPromise = new Promise<void>(resolve => {
    OneSignal.emitter.on('register', async () => {
      const subscription = await Database.getSubscription();
      t.is(subscription.deviceId, randomPlayerId);
      resolve();
    });
  });

  const playerUpdateStub = sandbox.stub(OneSignal.context.updateManager, "sendPlayerUpdate").resolves();
  const playerCreateStub = sandbox.stub(OneSignal.context.updateManager, "sendPlayerCreate").resolves(randomPlayerId);

  await OneSignal.context.subscriptionManager.registerSubscription(rawPushSubscription);
  t.is(playerUpdateStub.calledOnce, false);
  t.is(playerCreateStub.calledOnce, true);
  await registerEventPromise;
});

test('safari 11.1+ with service worker but not pushManager', async t => {
  const serviceWorkerRegistration = {
    active: true,
    scope: "/",
    installing: null,
    waiting: null,
    pushManager: null,
  };
  await TestEnvironment.mockInternalOneSignal();
  
  sandbox.stub(SdkEnvironment, "getIntegration").returns(IntegrationKind.Secure);
  sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.ServiceWorker);
  sandbox.stub(navigator.serviceWorker, "getRegistration").returns(serviceWorkerRegistration);
  sandbox.stub(OneSignal.context.serviceWorkerManager, "getActiveState").returns(ServiceWorkerActiveState.WorkerA);

  t.is(await OneSignal.context.subscriptionManager.isSubscriptionExpiring(), false);
});

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
    const subsequentVapidKeys = generateVapidKeys();
    let unsubscribeSpy: sinon.SinonSpy;

    await testCase(
      t,
      BrowserUserAgent.ChromeMacSupported,
      subsequentVapidKeys.uniquePublic,
      subsequentVapidKeys.sharedPublic,
      SubscriptionStrategyKind.SubscribeNew,
      async (pushManager, _subscriptionManager) => {
        // Create an initial subscription, so subsequent subscriptions attempt to re-use this initial
        // subscription's options
        const initialVapidKeys = generateVapidKeys();
        const subscriptionOptions: PushSubscriptionOptions = {
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(initialVapidKeys.uniquePublic).buffer,
        };
        await pushManager.subscribe(subscriptionOptions);

        // And spy on PushManager.unsubscribe(), because we expect the existing subscription to be unsubscribed
        unsubscribeSpy = sandbox.spy(MockPushSubscription.prototype, 'unsubscribe');
      },
      async (_pushManager, _pushManagerSubscribeSpy) => {
        // Unsubscribe should have been called
        t.true(unsubscribeSpy.calledOnce);
      }
    );
  }
);

test(
  "subscribing records created at date in UTC",
  async t => {
    const initialVapidKeys = generateVapidKeys();
    const dateString = "February 26, 2018 10:04:24 UTC";

    // Set the initial datetime
    timemachine.config({
      timestamp: dateString
    });

    const initialSubscriptionOptions: PushSubscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(initialVapidKeys.uniquePublic).buffer,
    };

    await testCase(
      t,
      BrowserUserAgent.ChromeMacSupported,
      initialVapidKeys.uniquePublic,
      initialVapidKeys.sharedPublic,
      SubscriptionStrategyKind.SubscribeNew,
      null,
      async (pushManager, pushManagerSubscribeSpy) => {
        // After our subscription, check the subscription creation date was recorded
        const subscription = await Database.getSubscription();

        // timemachine must be reset to use native Date parse API
        timemachine.reset();

        t.deepEqual(subscription.createdAt, Date.parse(dateString));
      }
    );
  }
);

async function expirationTestCase(
  /**
   * The browser to simulate. Chrome means using vapidPublicKey, while Firefox means using the
   * global onesignalVapidPublicKey.
   */
  t: ExecutionContext,
  subscriptionCreationTime: number,
  subscriptionExpirationTime: number,
  expirationCheckTime: number,
  skipCreationDateSet: boolean,
  env: IntegrationKind,
) {

  const initialVapidKeys = generateVapidKeys();

  // Force service worker active state dependency so test can run
  const stub = sandbox.stub(ServiceWorkerManager.prototype, "getActiveState")
    .resolves(ServiceWorkerActiveState.WorkerA);
  const integrationStub = sandbox.stub(SdkEnvironment, "getIntegration").resolves(env);

  // Set the initial datetime, which is used internally for the subscription created at
  timemachine.config({
    timestamp: subscriptionCreationTime
  });

  await testCase(
    t,
    BrowserUserAgent.ChromeMacSupported,
    initialVapidKeys.uniquePublic,
    initialVapidKeys.sharedPublic,
    SubscriptionStrategyKind.SubscribeNew,
    async (_pushManager, _subscriptionManager) => {
      // Set every subscription's expiration time to 30 days plus
      sandbox.stub(MockPushSubscription.prototype, "expirationTime").value(subscriptionExpirationTime);
    },
    async (_pushManager, _pushManagerSubscribeSpy, subscriptionManager) => {
      if (skipCreationDateSet) {
        // Unset directly
        await Database.put("Options", { key: "subscriptionCreatedAt", value: null });
      }

      timemachine.config({
        timestamp: expirationCheckTime
      });

      const isExpiring = await subscriptionManager.isSubscriptionExpiring();

      if (subscriptionExpirationTime) {
        if (env === IntegrationKind.Secure || env === IntegrationKind.SecureProxy) {
          // Checks in an HTTPS environment expire at the midpoint because we can silently
          // resubscribe (HTTPS top frame silently resubscribe, HTTPS in child frame send message to
          // SW to resubscribe)
          const midpointExpirationTime =
            subscriptionCreationTime + (subscriptionExpirationTime - subscriptionCreationTime) / 2;
          if (expirationCheckTime >= midpointExpirationTime) {
            t.true(isExpiring);
          } else {
            t.false(isExpiring);
          }
        } else {
          // Checks in an HTTP environment only expire at or after the expiration time, since we
          // can't silently resubscribe
          if (expirationCheckTime >= subscriptionExpirationTime) {
            t.true(isExpiring);
          } else {
            t.false(isExpiring);
          }
        }
      } else {
        return t.false(isExpiring);
      }
    }
  );

  timemachine.reset();
  stub.restore();
  integrationStub.restore();
}

test(
  "a subscription expiring in 30 days is not refreshed before the midpoint",
  async t => {
    const dateString = "February 26, 2018 10:04:24 UTC";
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const subscriptionCreationTime = Date.parse(dateString);
    const subscriptionExpirationTime = subscriptionCreationTime + THIRTY_DAYS_MS;
    const newTimeBeforeMidpoint = subscriptionCreationTime + (THIRTY_DAYS_MS/2) - 10;

    await expirationTestCase(
      t,
      subscriptionCreationTime,
      subscriptionExpirationTime,
      newTimeBeforeMidpoint,
      false,
      IntegrationKind.Secure,
    );
  }
);

test(
  "a subscription expiring in 30 days is refreshed at the midpoint",
  async t => {
    const dateString = "February 26, 2018 10:04:24 UTC";
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const subscriptionCreationTime = Date.parse(dateString);
    const subscriptionExpirationTime = Date.parse(dateString) + THIRTY_DAYS_MS;
    const newTimeAfterMidpoint = Date.parse(dateString) + (THIRTY_DAYS_MS/2);

    await expirationTestCase(
      t,
      subscriptionCreationTime,
      subscriptionExpirationTime,
      newTimeAfterMidpoint,
      false,
      IntegrationKind.Secure,
    );
  }
);

test(
  "a subscription expiring in 30 days is refreshed after the midpoint",
  async t => {
    const dateString = "February 26, 2018 10:04:24 UTC";
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const subscriptionCreationTime = Date.parse(dateString);
    const subscriptionExpirationTime = Date.parse(dateString) + THIRTY_DAYS_MS;
    const newTimeAfterMidpoint = Date.parse(dateString) + (THIRTY_DAYS_MS/2) + (THIRTY_DAYS_MS/2);

    await expirationTestCase(
      t,
      subscriptionCreationTime,
      subscriptionExpirationTime,
      newTimeAfterMidpoint,
      false,
      IntegrationKind.Secure,
    );
  }
);

test(
  "a subscription without a recorded creation date is always considered expired",
  async t => {
    const dateString = "February 26, 2018 10:04:24 UTC";
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const subscriptionCreationTime = Date.parse(dateString);
    const subscriptionExpirationTime = Date.parse(dateString) + THIRTY_DAYS_MS;

    await expirationTestCase(
      t,
      subscriptionCreationTime,
      subscriptionExpirationTime,
      subscriptionCreationTime,
      true,
      IntegrationKind.Secure,
    );
  }
);

test(
  "a subscription without an expiration time is never considered expired",
  async t => {
    const dateString = "February 26, 2018 10:04:24 UTC";
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const subscriptionCreationTime = Date.parse(dateString);

    await expirationTestCase(
      t,
      subscriptionCreationTime,
      null,
      subscriptionCreationTime,
      false,
      IntegrationKind.Secure,
    );
  }
);

test(
  "the subscription expiration time should be recorded",
  async t => {
    const initialVapidKeys = generateVapidKeys();
    const expirationTime = 1519675981599;

    await testCase(
      t,
      BrowserUserAgent.ChromeMacSupported,
      initialVapidKeys.uniquePublic,
      initialVapidKeys.sharedPublic,
      SubscriptionStrategyKind.SubscribeNew,
      async (_pushManager, _subscriptionManager) => {
        sandbox.stub(MockPushSubscription.prototype, "expirationTime").value(expirationTime);
      },
      async (_pushManager, _pushManagerSubscribeSpy) => {
        const subscription = await Database.getSubscription();

        t.deepEqual(subscription.expirationTime, expirationTime);
      }
    );
  }
);

test(
  "for HTTP, a subscription expiring in 30 days only expires after 30 days and not before",
  async t => {
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const subscriptionCreationTime = 1;

    await expirationTestCase(
      t,
      subscriptionCreationTime,
      subscriptionCreationTime + THIRTY_DAYS_MS,
      subscriptionCreationTime + THIRTY_DAYS_MS - 10,
      false,
      IntegrationKind.InsecureProxy,
    );
  }
);

test(
  "Service worker failed to install due to 403. Send a notification for the first user's session.", async t => {
    const context: Context = OneSignal.context;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager;
    const pageViewManager = context.pageViewManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(pageViewManager, "isFirstPageView").returns(true);
    const error403 = new ServiceWorkerRegistrationError(403, "403 Forbidden");
    sandbox.stub(serviceWorkerManager, "installWorker").rejects(error403);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throwsAsync(async ()=>subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew),
      { instanceOf: ServiceWorkerRegistrationError });
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus403);
    t.is(smSpyRegister.calledOnce, true);
  }
);

test(
  "Service worker failed to install due to 403. Not the first user's session, do not send a notification.", async t => {
    const context: Context = OneSignal.context;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager;
    const pageViewManager = context.pageViewManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(pageViewManager, "isFirstPageView").returns(false);
    const error403 = new ServiceWorkerRegistrationError(403, "403 Forbidden");
    sandbox.stub(serviceWorkerManager, "installWorker").throws(error403);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throwsAsync(async ()=>subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew),
      { instanceOf: ServiceWorkerRegistrationError });
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus403);
    t.is(smSpyRegister.calledOnce, false);
  }
);

test(
  "Service worker failed to install due to 404. Send a notification for the first user's session.", async t => {
    const context: Context = OneSignal.context;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager;
    const pageViewManager = context.pageViewManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(pageViewManager, "isFirstPageView").returns(true);
    const error404 = new ServiceWorkerRegistrationError(404, "404 Not Found");
    sandbox.stub(serviceWorkerManager, "installWorker").rejects(error404);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throwsAsync(async ()=>subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew),
      { instanceOf: ServiceWorkerRegistrationError });
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus404);
    t.is(smSpyRegister.calledOnce, true);
  }
);

test(
  "Service worker failed to install due to 404. Not the first user's session, do not send a notification.", async t => {
    const context: Context = OneSignal.context;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager;
    const pageViewManager = context.pageViewManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(pageViewManager, "isFirstPageView").returns(false);
    const error404 = new ServiceWorkerRegistrationError(404, "404 Not Found");
    sandbox.stub(serviceWorkerManager, "installWorker").throws(error404);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throwsAsync(async ()=>subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew),
      { instanceOf: ServiceWorkerRegistrationError });
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus404);
    t.is(smSpyRegister.calledOnce, false);
  }
);
