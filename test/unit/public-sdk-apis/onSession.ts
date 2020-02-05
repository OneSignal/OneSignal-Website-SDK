import "../../support/polyfills/polyfills";
import test, { TestContext, Context } from "ava";
import sinon, { SinonSandbox, SinonStub } from 'sinon';
import nock from "nock";
import {
  TestEnvironment, HttpHttpsEnvironment, TestEnvironmentConfig
} from '../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind, ServerAppConfig } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import OneSignalApiBase from "../../../src/OneSignalApiBase";
import {
  stubMessageChannel, mockIframeMessaging, mockWebPushAnalytics, InitTestHelper
} from '../../support/tester/utils';
import Popover from "../../../src/popover/Popover";
import OneSignalEvent from "../../../src/Event";
import { DynamicResourceLoader, ResourceLoadState } from "../../../src/services/DynamicResourceLoader";
import { ServiceWorkerManager } from "../../../src/managers/ServiceWorkerManager";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import { UpdateManager } from '../../../src/managers/UpdateManager';
import { PageViewManager } from "../../../src/managers/PageViewManager";
import { SessionManager } from "../../../src/managers/SessionManager";
import { SubscriptionManager } from "../../../src/managers/SubscriptionManager";
import InitHelper from "../../../src/helpers/InitHelper";
import {
  markUserAsOptedOut, markUserAsSubscribed, markUserAsSubscribedOnHttp,
  stubServiceWorkerInstallation, 
} from "../../support/tester/sinonSandboxUtils";
import { createSubscription } from "../../support/tester/utils";


const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const initTestHelper = new InitTestHelper(sinonSandbox);
const playerId = Random.getRandomUuid();
const appId = Random.getRandomUuid();

test.beforeEach(async () => {
  // tests use customizable beforeEach method defined below. add logic there if needed.
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
 *     + 1. autoPrompt -> click allow -> player create and upsert session
 *     + 2. autoPrompt -> click dismiss -> no requests
 *     + 3. autoResubscribe and permissions granted -> player create and upsert session
 *     + 4. autoResubscribe and permissions default or blocked -> no requests
 *     + 5. no autoResubscribe and no autoPrompt -> no requests
 *    2. second page view - TODO
 * 2. user opted out
 *     + 1. no flag and first page view -> no requests
 *     + 2. second page view -> no requests
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
    const stubs = await beforeTest(testConfig, t);
    
    simulateSlidedownAllowAfterShown();
    simulateNativeAllowAfterShown();
  
    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.createPlayerPostStub.callCount, 0);
        t.is(stubs.onSessionStub.callCount, 0);
        resolve();
      });
    });

    const subscriptionPromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
        t.is(stubs.onSessionStub.callCount, 1);
        t.is(stubs.createPlayerPostStub.callCount, 1);
        inspectPushRecordCreationRequest(t, stubs.createPlayerPostStub);
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
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
    await subscriptionPromise;
});

test.serial(`HTTPS: User not subscribed and not opted out => first page view => slidedown's autoPrompt is on =>
  click dismiss => no requests`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    pushIdentifier: 'granted'
  };

  const stubs = await beforeTest(testConfig, t);
  simulateSlidedownDismissAfterShown();

  const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");

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
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
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

    const stubs = await beforeTest(testConfig, t);
    stubServiceWorkerInstallation(sinonSandbox);

    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 1);
        t.is(stubs.createPlayerPostStub.callCount, 1);
        inspectPushRecordCreationRequest(t, stubs.createPlayerPostStub);
        resolve();
      });
    });

    const registrationPromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.REGISTERED, () => {
        t.is(stubs.onSessionStub.callCount, 1);
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
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
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
    const stubs = await beforeTest(testConfig, t);
    const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");
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
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
    t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTPS: User not subscribed and not opted out => first page view => no autoResubscribe and no autoPrompt =>
  no requests`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,

      pushIdentifier: 'granted',
      permission: NotificationPermission.Granted,
    };
    const stubs = await beforeTest(testConfig, t);
    const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");

    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 0);
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      autoResubscribe: false,
    });
    await initPromise;
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
    t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTPS: User opted out => first page view => onSession flag is on => do not send on session`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,
      permission: NotificationPermission.Granted,
      pushIdentifier: 'granted'
    };

    const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!);
    serverAppConfig.features.enable_on_session = true;
    const stubs = await beforeTest(testConfig, t, serverAppConfig);
    await markUserAsOptedOut(sinonSandbox, playerId);

    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 1);
        t.is(stubs.createPlayerPostStub.callCount, 0);
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      autoResubscribe: true,
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
        }
      }
    });
    await initPromise;
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
});

test.serial(`HTTPS: User opted out => first page view => onSession flag is off => no requests`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!);
  serverAppConfig.features.enable_on_session = false;
  const stubs = await beforeTest(testConfig, t, serverAppConfig);
  const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");
  await markUserAsOptedOut(sinonSandbox, playerId);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      t.is(stubs.onSessionStub.callCount, 0);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  await initializePromise;
  t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTPS: User opted out => second page view => onSession flag is on => no requests`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!);
  serverAppConfig.features.enable_on_session = true;
  const stubs = await beforeTest(testConfig, t, serverAppConfig);
  const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");
  await markUserAsOptedOut(sinonSandbox, playerId);

  sinonSandbox.stub(PageViewManager.prototype, "getPageViewCount").resolves(2);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      t.is(stubs.onSessionStub.callCount, 0);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  await initializePromise;
  t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTPS: User subscribed => first page view => expiring subscription => sends player update`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const stubs = await beforeTest(testConfig, t);

  // Using spy instead of stub here is intended. Spy does callThrough, i.e. executes underlying function, by default
  //  while stub prevents the actual execution.
  // Workaround with stubs would be `sinon.stub(object, "method", object.method);`
  const playerUpdateStub = sinonSandbox.spy(UpdateManager.prototype, "sendPlayerUpdate");
  await markUserAsSubscribed(sinonSandbox, playerId, true);
  stubServiceWorkerInstallation(sinonSandbox);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      // sends player update which actually calls on_session if this is the first call we're performing.
      t.is(playerUpdateStub.callCount, 1);
      t.is(stubs.onSessionStub.callCount, 1);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  await initializePromise;
});

test.serial(`HTTPS: User subscribed => first page view => sends on session`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const stubs = await beforeTest(testConfig, t);
  await markUserAsSubscribed(sinonSandbox, playerId);
  stubServiceWorkerInstallation(sinonSandbox);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      t.is(stubs.onSessionStub.callCount, 1);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  await initializePromise;
});

test.serial(`HTTP: User not subscribed and not opted out => first page view => slidedown's autoPrompt is on =>
  click allow => sends player create`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,
      pushIdentifier: 'granted'
    };
    const stubs = await beforeTest(testConfig, t);

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
        t.is(stubs.onSessionStub.callCount, 1);
        t.is(stubs.createPlayerPostStub.callCount, 1);
        inspectPushRecordCreationRequest(t, stubs.createPlayerPostStub);
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
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
    await subscriptionPromise;
});

test.serial(`HTTP: User not subscribed and not opted out => first page view => slidedown's autoPrompt is on =>
  click dismiss => no requests`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Http,
    integration: ConfigIntegrationKind.Custom,
    pushIdentifier: 'granted'
  };

  const stubs = await beforeTest(testConfig, t);
  simulateSlidedownDismissAfterShown();

  const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");

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
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  await initializePromise;
  t.is(subscribeSpy.callCount, 0);
});

// autoResubscribe works only on https
test.serial(`HTTP: User not subscribed and not opted out => first page view => autoResubscribe is on =>
  permissions already granted => no requests`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Http,
      integration: ConfigIntegrationKind.Custom,
      permission: NotificationPermission.Granted,
    };

    const stubs = await beforeTest(testConfig, t);
    stubServiceWorkerInstallation(sinonSandbox);

    const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");

    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 0);
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      autoResubscribe: true,
    });
    await initPromise;
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
    t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTP: User not subscribed and not opted out => first page view => autoResubscribe is on =>
  permissions default => no requests`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Http,
      integration: ConfigIntegrationKind.Custom,
      permission: NotificationPermission.Default,
    };
    const stubs = await beforeTest(testConfig, t);
    const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");
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
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
    t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTP: User not subscribed and not opted out => first page view => no autoResubscribe and no autoPrompt =>
  no requests`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Http,
      integration: ConfigIntegrationKind.Custom,
      pushIdentifier: 'granted',
      permission: NotificationPermission.Granted,
    };
    const stubs = await beforeTest(testConfig, t);
    const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");

    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 0);
        t.is(stubs.createPlayerPostStub.callCount, 0);
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      autoResubscribe: false,
    });
    await initPromise;
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
    t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTP: User opted out => first page view => onSession flag is on => send on session`, async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Http,
      integration: ConfigIntegrationKind.Custom,
      permission: NotificationPermission.Granted,
      pushIdentifier: 'granted'
    };

    const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!, false);
    serverAppConfig.features.enable_on_session = true;
    const stubs = await beforeTest(testConfig, t, serverAppConfig);
    await markUserAsOptedOut(sinonSandbox, playerId);

    const initializePromise = new Promise((resolve) => {
      OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
        t.is(stubs.onSessionStub.callCount, 1);
        t.is(stubs.createPlayerPostStub.callCount, 0);
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      autoResubscribe: true,
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
        }
      }
    });
    await initPromise;
    t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
    await initializePromise;
});

test.serial(`HTTP: User opted out => first page view => onSession flag is off => no requests`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Http,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!, false);
  serverAppConfig.features.enable_on_session = false;
  const stubs = await beforeTest(testConfig, t, serverAppConfig);
  const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");
  await markUserAsOptedOut(sinonSandbox, playerId);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      t.is(stubs.onSessionStub.callCount, 0);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  await initializePromise;
  t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTP: User opted out => second page view => onSession flag is on => no requests`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Http,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(testConfig.integration!, false);
  serverAppConfig.features.enable_on_session = true;
  const stubs = await beforeTest(testConfig, t, serverAppConfig);
  const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, "subscribe");
  await markUserAsOptedOut(sinonSandbox, playerId);

  sinonSandbox.stub(PageViewManager.prototype, "getPageViewCount").resolves(2);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      t.is(stubs.onSessionStub.callCount, 0);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  await initializePromise;
  t.is(subscribeSpy.callCount, 0);
});

test.serial(`HTTP: User subscribed => first page view => expiring subscription => sends player update`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Http,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const stubs = await beforeTest(testConfig, t);
  sinonSandbox.stub(InitHelper, "registerSubscriptionInProxyFrame").resolves(createSubscription());

  await markUserAsSubscribedOnHttp(sinonSandbox, playerId, true);
  stubServiceWorkerInstallation(sinonSandbox);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      // t.is(registerStub.callCount, 1);
      t.is(stubs.onSessionStub.callCount, 0);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  await initializePromise;
});

test.serial(`HTTP: User subscribed => first page view => sends on session`, async t => {
  const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Http,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Granted,
    pushIdentifier: 'granted'
  };

  const stubs = await beforeTest(testConfig, t);
  await markUserAsSubscribedOnHttp(sinonSandbox, playerId);
  stubServiceWorkerInstallation(sinonSandbox);

  const initializePromise = new Promise((resolve) => {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      t.is(stubs.onSessionStub.callCount, 1);
      t.is(stubs.createPlayerPostStub.callCount, 0);
      resolve();
    });
  });

  const initPromise = OneSignal.init({
    appId,
    autoResubscribe: true,
    promptOptions: {
      slidedown: {
        enabled: true,
        autoPrompt: true,
      }
    }
  });
  await initPromise;
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  await initializePromise;
});

/** Helper methods */
async function beforeTest(
  testConfig: TestEnvironmentConfig,
  t: TestContext & Context<any>,
  customServerAppConfig?: ServerAppConfig
) {
  await TestEnvironment.initialize(testConfig);
  initTestHelper.mockBasicInitEnv(testConfig, customServerAppConfig);
  OneSignal.initialized = false;
  OneSignal.__doNotShowWelcomeNotification = true;

  sinonSandbox.stub(window.Notification, "permission").value(testConfig.permission || "default");

  const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
    .resolves({success: true, id: playerId});
  const onSessionStub = sinonSandbox.stub(SessionManager.prototype, "upsertSession").resolves();
  // const onSessionStub = sinonSandbox.stub(OneSignal.context.sessionManager, "upsertSession").resolves();

  sinonSandbox.stub(DynamicResourceLoader.prototype, "loadSdkStylesheet").resolves(ResourceLoadState.Loaded);
  sinonSandbox.stub(ServiceWorkerManager.prototype, "installWorker").resolves();
  nock('https://onesignal.com')
    .get(/.*icon$/)
    .reply(200, (_uri: string, _requestBody: string) => {
      return { success: true };
    });

  if (testConfig.httpOrHttps === HttpHttpsEnvironment.Http) {
    stubMessageChannel(t);
    mockIframeMessaging(sinonSandbox);
  }
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
    stubServiceWorkerInstallation(sinonSandbox);
  });
}



async function inspectPushRecordCreationRequest(t: TestContext, requestStub: SinonStub) {
  // For player#create device record is already serialized. Checking serialized structure.
  const anyValues = [
    "device_type",
    "language",
    "timezone",
    "device_os",
    "sdk",
    "device_model",
    "identifier",
    "notification_types"
  ];
  t.is(requestStub.callCount, 1);
  t.not(requestStub.getCall(0), null);
  const data: any = requestStub.getCall(0).args[1];
  anyValues.forEach(valueKey => {
    t.not(data[valueKey], undefined, `player create: ${valueKey} is undefined! => data: ${JSON.stringify(data)}`);
  });
}
