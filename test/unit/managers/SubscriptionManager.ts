import '../../support/polyfills/polyfills';

import test, { GenericTestContext, Context as AvaContext } from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import timemachine from 'timemachine';

import { ServiceWorkerManager, ServiceWorkerActiveState } from '../../../src/managers/ServiceWorkerManager';
import Path from '../../../src/models/Path';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import Database from '../../../src/services/Database';
import Context from '../../../src/models/Context';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { base64ToUint8Array, arrayBufferToBase64 } from '../../../src/utils/Encoding';
import PushManager from '../../support/mocks/service-workers/models/PushManager';
import PushSubscription from '../../support/mocks/service-workers/models/PushSubscription';
import PushSubscriptionOptions from '../../support/mocks/service-workers/models/PushSubscriptionOptions';
import Random from '../../support/tester/Random';
import { setBrowser } from '../../support/tester/browser';
import { SubscriptionStrategyKind } from "../../../src/models/SubscriptionStrategyKind";
import { RawPushSubscription } from '../../../src/models/RawPushSubscription';
import SdkEnvironment from '../../../src/managers/SdkEnvironment';
import { IntegrationKind } from '../../../src/models/IntegrationKind';
import OneSignalApi from '../../../src/OneSignalApi';
import { ServiceWorkerRegistrationError } from '../../../src/errors/ServiceWorkerRegistrationError';
import { SubscriptionStateKind } from '../../../src/models/SubscriptionStateKind';
import { WindowEnvironmentKind } from '../../../src/models/WindowEnvironmentKind';

// manually create and restore the sandbox
let sandbox: SinonSandbox;

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  t.context.sdkContext = new Context(appConfig);
  timemachine.reset();

  sandbox = sinon.sandbox.create();
});

test.afterEach(function () {
  sandbox.restore();
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
  onPushManagerSubscribed: (
    pushManager: PushManager,
    spy: sinon.SinonSpy,
    subscriptionManager: SubscriptionManager
  ) => Promise<void>,
) {

  // Set the user agent, which determines which vapid key we use
  setBrowser(browser);

  // Create our subscription manager, which is what we're testing
  const manager = new SubscriptionManager(t.context.sdkContext, {
    safariWebId: null,
    appId: Random.getRandomUuid(),
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

  const context: Context = await t.context.sdkContext;
  const serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
  const pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
  const rawPushSubscription = RawPushSubscription.setFromW3cSubscription(pushSubscription);
  const randomPlayerId = Random.getRandomUuid();
  let wasRegisterEventFired = false;

  const registerEventPromise = new Promise(resolve => {
    OneSignal.emitter.on('register', async () => {
      const subscription = await Database.getSubscription();
      t.is(subscription.deviceId, randomPlayerId);
      resolve();
    });
  });

  const stub = sinon.stub(OneSignalApi, "createUser").resolves(randomPlayerId);

  await context.subscriptionManager.registerSubscription(rawPushSubscription);
  await registerEventPromise;

  stub.restore();
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
  t: GenericTestContext<AvaContext<any>>,
  subscriptionCreationTime: number,
  subscriptionExpirationTime: number,
  expirationCheckTime: number,
  skipCreationDateSet: boolean,
  env: IntegrationKind,
) {

  const initialVapidKeys = generateVapidKeys();

  // Force service worker active state dependency so test can run
  const stub = sinon.stub(ServiceWorkerManager.prototype, "getActiveState").resolves(ServiceWorkerActiveState.WorkerA);
  const integrationStub = sinon.stub(SdkEnvironment, "getIntegration").resolves(env);

  const newTimeBeforeMidpoint = expirationCheckTime;

  // Set the initial datetime, which is used internally for the subscription created at
  timemachine.config({
    timestamp: subscriptionCreationTime
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
    async (pushManager, subscriptionManager) => {
      // Set every subscription's expiration time to 30 days plus
      PushSubscription.prototype.expirationTime = subscriptionExpirationTime;
    },
    async (pushManager, pushManagerSubscribeSpy, subscriptionManager) => {
      const context: Context = t.context;

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
      async (pushManager, subscriptionManager) => {
        PushSubscription.prototype.expirationTime = expirationTime;
      },
      async (pushManager, pushManagerSubscribeSpy) => {
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
    const context: Context = await t.context.sdkContext;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager; 
    const sessionManager = context.sessionManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(sessionManager, "isFirstPageView").returns(true);
    const error403 = new ServiceWorkerRegistrationError(403, "403 Forbidden");
    sandbox.stub(serviceWorkerManager, "installWorker").rejects(error403);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throws(subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew), ServiceWorkerRegistrationError);
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus403);
    t.is(smSpyRegister.calledOnce, true);
  }
);

test(
  "Service worker failed to install due to 403. Not the first user's session, do not send a notification.", async t => {
    const context: Context = await t.context.sdkContext;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager; 
    const sessionManager = context.sessionManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(sessionManager, "isFirstPageView").returns(false);
    const error403 = new ServiceWorkerRegistrationError(403, "403 Forbidden");
    sandbox.stub(serviceWorkerManager, "installWorker").throws(error403);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throws(subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew), ServiceWorkerRegistrationError);
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus403);
    t.is(smSpyRegister.calledOnce, false);
  }
);

test(
  "Service worker failed to install due to 404. Send a notification for the first user's session.", async t => {
    const context: Context = await t.context.sdkContext;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager; 
    const sessionManager = context.sessionManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(sessionManager, "isFirstPageView").returns(true);
    const error404 = new ServiceWorkerRegistrationError(404, "404 Not Found");
    sandbox.stub(serviceWorkerManager, "installWorker").rejects(error404);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throws(subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew), ServiceWorkerRegistrationError);
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus404);
    t.is(smSpyRegister.calledOnce, true);
  }
);

test(
  "Service worker failed to install due to 404. Not the first user's session, do not send a notification.", async t => {
    const context: Context = await t.context.sdkContext;
    const serviceWorkerManager = context.serviceWorkerManager;
    const subscriptionManager = context.subscriptionManager; 
    const sessionManager = context.sessionManager;

    TestEnvironment.mockInternalOneSignal();

    sandbox.stub(sessionManager, "isFirstPageView").returns(false);
    const error404 = new ServiceWorkerRegistrationError(404, "404 Not Found");
    sandbox.stub(serviceWorkerManager, "installWorker").throws(error404);
    sandbox.stub(SdkEnvironment, "getWindowEnv").returns(WindowEnvironmentKind.Host);
    sandbox.stub(SubscriptionManager, "isSafari").returns(false);

    const smSpyRegisterFailed = sandbox.spy(subscriptionManager, "registerFailedSubscription");
    const smSpyRegister = sandbox.spy(subscriptionManager, "registerSubscription");

    await t.throws(subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew), ServiceWorkerRegistrationError);
    t.is(smSpyRegisterFailed.calledOnce, true);
    t.is(smSpyRegisterFailed.getCall(0).args[0], SubscriptionStateKind.ServiceWorkerStatus404);
    t.is(smSpyRegister.calledOnce, false);
  }
);
