import "../../support/polyfills/polyfills";
import test, { TestContext } from "ava";
import sinon, { SinonSandbox } from 'sinon';
import nock from "nock";
import {
  TestEnvironment, HttpHttpsEnvironment, TestEnvironmentConfig
} from '../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind, ServerAppConfig } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import OneSignalApiBase from "../../../src/OneSignalApiBase";
import OneSignalApiShared from "../../../src/OneSignalApiShared";
import {
  stubMessageChannel, mockIframeMessaging, mockWebPushAnalytics, InitTestHelper
} from '../../support/tester/utils';
import Popover from "../../../src/popover/Popover";
import OneSignalEvent from "../../../src/Event";
import { DynamicResourceLoader, ResourceLoadState } from "../../../src/services/DynamicResourceLoader";
import { ServiceWorkerManager } from "../../../src/managers/ServiceWorkerManager";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import Database from "../../../src/services/Database";
import { Subscription } from "../../../src/models/Subscription";
import { SessionManager } from "../../../src/managers/SessionManager";
import { SubscriptionManager } from "../../../src/managers/SubscriptionManager";
import InitHelper from "../../../src/helpers/InitHelper";
import ServiceWorker from '../../support/mocks/service-workers/ServiceWorker';
import ServiceWorkerRegistration from '../../support/mocks/service-workers/models/ServiceWorkerRegistration';
import { ServiceWorkerActiveState } from '../../../src/helpers/ServiceWorkerHelper';
import { WorkerMessenger } from '../../../src/libraries/WorkerMessenger';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const initTestHelper = new InitTestHelper(sinonSandbox);
const playerId = Random.getRandomUuid();
const appId = Random.getRandomUuid();

test.beforeEach(function () {
  mockWebPushAnalytics();
});

test.afterEach(function (_t: TestContext) {
  sinonSandbox.restore();

  OneSignal._initCalled = false;
  OneSignal.__initAlreadyCalled = false;
  OneSignal._sessionInitAlreadyRunning = false;
});

/**
 * HTTP/HTTPS
 * 1. user not subscribed and not opted out
 *    1. first page view
 *     + 1. autoPrompt -> click allow -> player create
 *     + 2. autoPrompt -> click dismiss -> no requests
 *     + 3. autoResubscribe and permissions granted -> player create
 *     + 4. autoResubscribe and permissions default or blocked -> no requests
 *     + 5. no autoResubscribe and no autoPrompt -> no requests
 *    2. second page view - TODO
 * 2. user opted out
 *     + 1. new on session flag enabled and first page view -> on session
 *     + 2. no flag and first page view -> no requests
 *     + 3. second page view -> no requests
 * 3. user subscribed
 *     + 1. expiring subscription -> player update
 *     + 2. not-expiring subscription and first page view -> on session
 *       3. second page view -> no requests - TODO 
 */

test.serial(`HTTPS: User not subscribed and not opted out => first page view => slidedown's autoPrompt is on =>
  click allow => sends player create`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,
      pushIdentifier: 'granted'
    };
    const stubs = await beforeTest(testConfig);
    
    simulateSlidedownAllowAfterShown();
    simulateNativeAllowAfterShown();
  
    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 0);
        resolve();
      });
    });

    const subscriptionPromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 1);
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
        }
      },
      autoResubscribe: false,
    });
    await initPromise;
    t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
    await initializePromise;
    await subscriptionPromise;
    console.log("test 1 ends!!!!!")
});

test.serial(`HTTPS: User not subscribed and not opted out => first page view => slidedown's autoPrompt is on =>
  click dismiss => no requests`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    pushIdentifier: 'granted'
  };

  const stubs = await beforeTest(testConfig);
  simulateSlidedownDismissAfterShown();

  const subscribeSpy = sinonSandbox.stub(SubscriptionManager.prototype, "subscribe");

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      t.is(stubs.onSessionStub.callCount, 0);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    },
    autoResubscribe: false,
  });
  await initPromise;
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
  await initializePromise;
  t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTPS: User not subscribed and not opted out => first page view => autoResubscribe is on =>
  permissions already granted => sends player create`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,
      permission: NotificationPermission.Granted,
    };

    const stubs = await beforeTest(testConfig);
    stubServiceWorkerInstallation();

    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 1);
        resolve();
      });
    });

    const registrationPromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.REGISTERED, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 1);
        resolve();
      });
    });

    const subscriptionPromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      autoResubscribe: true,
    });
    await initPromise;
    t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
    await initializePromise;
    await registrationPromise;
    await subscriptionPromise;
});

test.serial(`HTTPS: User not subscribed and not opted out => first page view => autoResubscribe is on =>
  permissions default => no requests`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,
      permission: NotificationPermission.Default,
    };
    const stubs = await beforeTest(testConfig);
    const subscribeSpy = sinonSandbox.stub(SubscriptionManager.prototype, "subscribe");
    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 0);
        resolve();
      });
    });
    OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
      t.is(stubs.onSessionStub.callCount, 0);
      t.is(stubs.createPlayerPostStub.callCount, 0);
    });

    const initPromise = OneSignal.init({
      appId,
      autoResubscribe: true,
    });
    await initPromise;
    t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
    await initializePromise;
    t.is(subscribeSpy.callCount, 0);
});

// test.serial(`HTTPS: User not subscribed and not opted out => first page view => no autoResubscribe and no autoPrompt =>
//   no requests`, async t => {
//     const testConfig: TestEnvironmentConfig = {
//       httpOrHttps: HttpHttpsEnvironment.Https,
//       integration: ConfigIntegrationKind.Custom,
//       pushIdentifier: 'granted',
//       permission: NotificationPermission.Granted,
//     };
//     const stubs = await beforeTest(testConfig);
  
//     OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
//       t.is(stubs.onSessionStub.callCount, 0);
//       t.is(stubs.createPlayerPostStub.callCount, 0);
//     });

//     const initPromise = OneSignal.init({
//       appId,
//     });
//     await initPromise;
//     t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
// });

// test.serial(`HTTPS: User opted out => first page view => onSession flag is on => sends on session`, async t => {
//     const testConfig: TestEnvironmentConfig = {
//       httpOrHttps: HttpHttpsEnvironment.Https,
//       integration: ConfigIntegrationKind.Custom,
//       permission: NotificationPermission.Granted,
//       pushIdentifier: 'granted'
//     };

//     const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!);
//     serverAppConfig.features.enable_on_session = true;
//     const stubs = await beforeTest(testConfig, serverAppConfig);
//     await markUserAsOptedOut();

//     OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
//       t.is(stubs.onSessionStub.callCount, 1);
//       t.is(stubs.createPlayerPostStub.callCount, 0);
//     });

//     const initPromise = OneSignal.init({
//       appId,
//       autoResubscribe: true,
//       promptOptions: {
//         slidedown: {
//           enabled: true,
//           autoPrompt: true,
//         }
//       }
//     });
//     await initPromise;
//     t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
// });

// test.serial(`HTTPS: User opted out => first page view => onSession flag is off => no requests`, async t => {
//   const testConfig: TestEnvironmentConfig = {
//     httpOrHttps: HttpHttpsEnvironment.Https,
//     integration: ConfigIntegrationKind.Custom,
//     permission: NotificationPermission.Granted,
//     pushIdentifier: 'granted'
//   };

//   const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!);
//   serverAppConfig.features.enable_on_session = false;
//   const stubs = await beforeTest(testConfig, serverAppConfig);
//   await markUserAsOptedOut();

//   OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
//     t.is(stubs.onSessionStub.callCount, 0);
//     t.is(stubs.createPlayerPostStub.callCount, 0);
//   });

//   const initPromise = OneSignal.init({
//     appId,
//     autoResubscribe: true,
//     promptOptions: {
//       slidedown: {
//         enabled: true,
//         autoPrompt: true,
//       }
//     }
//   });
//   await initPromise;
//   t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
// });

// test.serial(`HTTPS: User opted out => second page view => onSession flag is on => no requests`, async t => {
//   const testConfig: TestEnvironmentConfig = {
//     httpOrHttps: HttpHttpsEnvironment.Https,
//     integration: ConfigIntegrationKind.Custom,
//     permission: NotificationPermission.Granted,
//     pushIdentifier: 'granted'
//   };

//   const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!);
//   serverAppConfig.features.enable_on_session = true;
//   const stubs = await beforeTest(testConfig, serverAppConfig);
//   await markUserAsOptedOut();

//   sinonSandbox.stub(SessionManager.prototype, "getPageViewCount").resolves(2);

//   OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
//     t.is(stubs.onSessionStub.callCount, 0);
//     t.is(stubs.createPlayerPostStub.callCount, 0);
//   });

//   const initPromise = OneSignal.init({
//     appId,
//     autoResubscribe: true,
//     promptOptions: {
//       slidedown: {
//         enabled: true,
//         autoPrompt: true,
//       }
//     }
//   });
//   await initPromise;
// });

// test.serial(`HTTPS: User subscribed => first page view => expiring subscription => sends player update`, async t => {
//   const testConfig: TestEnvironmentConfig = {
//     httpOrHttps: HttpHttpsEnvironment.Https,
//     integration: ConfigIntegrationKind.Custom,
//     permission: NotificationPermission.Granted,
//     pushIdentifier: 'granted'
//   };

//   const stubs = await beforeTest(testConfig);
//   await markUserAsSubscribed(true);

//   OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
//     t.is(stubs.onSessionStub.callCount, 0);
//     // TODO: uncomment after figuring out how to stub all service worker push subscription renewing stuff
//     // t.is(stubs.createPlayerPostStub.callCount, 1);
//     t.is(stubs.createPlayerPostStub.callCount, 0);
//   });

//   const initPromise = OneSignal.init({
//     appId,
//     autoResubscribe: true,
//     promptOptions: {
//       slidedown: {
//         enabled: true,
//         autoPrompt: true,
//       }
//     }
//   });
//   await initPromise;
//   t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
// });

// test.serial(`HTTPS: User subscribed => first page view => sends on session`, async t => {
//   const testConfig: TestEnvironmentConfig = {
//     httpOrHttps: HttpHttpsEnvironment.Https,
//     integration: ConfigIntegrationKind.Custom,
//     permission: NotificationPermission.Granted,
//     pushIdentifier: 'granted'
//   };

//   const stubs = await beforeTest(testConfig);
//   await markUserAsSubscribed();

//   OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
//     t.is(stubs.onSessionStub.callCount, 1);
//     t.is(stubs.createPlayerPostStub.callCount, 0);
//   });

//   const initPromise = OneSignal.init({
//     appId,
//     autoResubscribe: true,
//     promptOptions: {
//       slidedown: {
//         enabled: true,
//         autoPrompt: true,
//       }
//     }
//   });
//   await initPromise;
//   t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
// });

// test.serial(`HTTP: User not subscribed and not opted out => first page view => slidedown's autoPrompt is on =>
//   click allow => sends player create`, async t => {
//     const testConfig: TestEnvironmentConfig = {
//       httpOrHttps: HttpHttpsEnvironment.Http,
//       integration: ConfigIntegrationKind.Custom,
//       pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
//     };

//     const stubs = await beforeTest(testConfig);
//     stubMessageChannel(t);
//     mockIframeMessaging(sinonSandbox);

//     simulateSlidedownAllowAfterShown();
//     simulateNativeAllowAfterShown();
  
//     OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
//       t.is(stubs.onSessionStub.callCount, 0);
//       t.is(stubs.createPlayerPostStub.callCount, 0);
//       console.log(1)
//     });
//     OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
//       t.is(stubs.onSessionStub.callCount, 0);
//       t.is(stubs.createPlayerPostStub.callCount, 1);
//       console.log(2)
//     });

//     const initPromise = OneSignal.init({
//       appId,
//       promptOptions: {
//         slidedown: {
//           enabled: true,
//           autoPrompt: true,
//         }
//       },
//       autoResubscribe: false,
//     });
//     await initPromise;
//     t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
// });

/** Helper methods */
async function beforeTest(testConfig: TestEnvironmentConfig, customServerAppConfig?: ServerAppConfig) {
  await TestEnvironment.initialize(testConfig);
  initTestHelper.mockBasicInitEnv(testConfig, customServerAppConfig);
  OneSignal.initialized = false;
  OneSignal.__doNotShowWelcomeNotification = true;
  (window as any).Notification.permission = testConfig.permission || "default";

  const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
    .resolves({success: true, id: playerId});
  const onSessionStub = sinonSandbox.stub(OneSignalApiShared, "updateUserSession")
    .resolves({success: true, id: playerId});

  sinonSandbox.stub(DynamicResourceLoader.prototype, "loadSdkStylesheet").resolves(ResourceLoadState.Loaded);
  sinonSandbox.stub(ServiceWorkerManager.prototype, "installWorker").resolves();
  nock('https://onesignal.com')
    .get(/.*icon$/)
    .reply(200, (_uri: string, _requestBody: string) => {
      return { success: true };
    });

  return { createPlayerPostStub, onSessionStub };
}

function simulateSlidedownAllowAfterShown() {
  OneSignal.on(Popover.EVENTS.SHOWN, () => {
    OneSignalEvent.trigger(Popover.EVENTS.ALLOW_CLICK);
  });
}

function simulateSlidedownDismissAfterShown() {
  OneSignal.on(Popover.EVENTS.SHOWN, () => {
    OneSignalEvent.trigger(Popover.EVENTS.CANCEL_CLICK);
  });
}

function simulateNativeAllowAfterShown() {
  OneSignal.emitter.on(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED, () => {
    sinonSandbox.stub(SubscriptionManager.prototype, "getSubscriptionState")
      .resolves({subscribed: true, isOptedOut: false});
    stubServiceWorkerInstallation();
  });
}

function simulateNativeBlockAfterShown() {
  OneSignal.emitter.on(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED, () => {
    (window as any).Notification.permission = "blocked";
  });
}

async function markUserAsOptedOut() {
  const subscription = new Subscription();
  subscription.deviceId = playerId;
  subscription.optedOut = true;
  subscription.subscriptionToken = "some_token";
  subscription.createdAt = Date.now();
  await Database.setSubscription(subscription);
}

async function markUserAsSubscribed(expired?: boolean) {
  const subscription = new Subscription();
  subscription.deviceId = playerId;
  subscription.optedOut = false;
  subscription.subscriptionToken = "some_token";
  subscription.createdAt = new Date(2017, 11, 13, 2, 3, 4, 0).getTime();
  await Database.setSubscription(subscription);

  sinonSandbox.stub(SubscriptionManager.prototype, "getSubscriptionState")
    .resolves({subscribed: true, isOptedOut: false});
  
  if (expired) {
    sinonSandbox.stub(InitHelper, "processExpiringSubscriptions").resolves(true);
  }
}

function stubServiceWorkerInstallation() {
  const swRegistration = new ServiceWorkerRegistration();
  sinonSandbox.stub(SubscriptionManager.prototype, "subscribeFcmVapidOrLegacyKey")
    .resolves(TestEnvironment.getFakeRawPushSubscription());
  sinonSandbox.stub((global as any).navigator.serviceWorker, 'ready')
    .get(() => new Promise((resolve) => { resolve(swRegistration); }));
  sinonSandbox.stub(ServiceWorkerManager.prototype, "getActiveState")
    .resolves(ServiceWorkerActiveState.WorkerA);
  sinonSandbox.stub(ServiceWorkerManager, "getRegistration")
    .resolves(swRegistration);
  sinonSandbox.stub(WorkerMessenger.prototype, "unicast").resolves();
}