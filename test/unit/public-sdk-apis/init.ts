import "../../support/polyfills/polyfills";
import test, { TestContext } from "ava";
import sinon, {SinonSandbox, SinonStub} from 'sinon';
import Database from "../../../src/services/Database";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import Context from '../../../src/models/Context';
import InitHelper from '../../../src/helpers/InitHelper';
import OneSignalUtils from '../../../src/utils/OneSignalUtils';
import { AppConfig, ConfigIntegrationKind } from '../../../src/models/AppConfig';
import nock from 'nock';
import Random from "../../support/tester/Random";
import OneSignalApiBase from "../../../src/OneSignalApiBase";
import { SdkInitError } from "../../../src/errors/SdkInitError";
import OneSignalApiShared from "../../../src/OneSignalApiShared";
import { EmailProfile } from "../../../src/models/EmailProfile";
import { EmailDeviceRecord } from "../../../src/models/EmailDeviceRecord";
import {
  stubMessageChannel, mockIframeMessaging, mockWebPushAnalytics, InitTestHelper, AssertInitSDK
} from '../../support/tester/utils';


let sinonSandbox: SinonSandbox = sinon.sandbox.create();
let initTestHelper = new InitTestHelper(sinonSandbox);

test.beforeEach(function () {
  nock.disableNetConnect();
  mockWebPushAnalytics();
});

test.afterEach(function (_t: TestContext) {
  sinonSandbox.restore();

  OneSignal._initCalled = false;
  OneSignal.__initAlreadyCalled = false;
  OneSignal._sessionInitAlreadyRunning = false;
});

test("correct degree of persistNotification setting should be stored", async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  OneSignal.context = new Context(appConfig);
  OneSignal.config = appConfig;
  const config: AppConfig = OneSignal.config;

  {
    /*
      If unspecified, persistNotification defaults to true on non-Mac OS X
      environments, and false on Mac OS X due to changes in Chrome 59 limiting
      web push notification content lengths.
     */
    delete config.userConfig.persistNotification;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.true(persistNotification);
  }

  {
    /*
      If set to false, persistNotification is false on all environments.
      */
    config.userConfig.persistNotification = false;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.false(persistNotification);
  }

  {
    /*
      If explicitly set to true, persistNotification is true on all environments.
      */
    config.userConfig.persistNotification = true;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.is(persistNotification, 'force');
  }
});

test("email session should be updated on first page view", async t => {
  const testEmailProfile: EmailProfile = new EmailProfile(
    Random.getRandomUuid(),
    "test@example.com",
  );

  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  // Ensure this is true, that way email on_session gets run
  OneSignal.context.sessionManager.setPageViewCount(1);
  t.true(OneSignal.context.sessionManager.isFirstPageView());
  
  await Database.setEmailProfile(testEmailProfile);

  const onSessionStub = sinonSandbox.stub(OneSignalApiShared, "updateUserSession").resolves();
  await InitHelper.updateEmailSessionCount();
  t.true(onSessionStub.calledOnce);
  t.is(onSessionStub.getCall(0).args.length, 2);
  t.is(onSessionStub.getCall(0).args[0], testEmailProfile.emailId);
  const emailDeviceRecord = onSessionStub.getCall(0).args[1] as EmailDeviceRecord;
  t.is(emailDeviceRecord.appId, OneSignal.context.appConfig.appId);
});

async function expectPushRecordCreationRequest(t: TestContext, createRequestPostStub: SinonStub) {
  const anyValues = [
    "device_type",
    "language",
    "timezone",
    "device_os",
    "sdk",
    "delivery_platform",
    "browser_name",
    "browser_version",
    "operating_system",
    "operating_system_version",
    "device_platform",
    "device_model",
    "identifier"
  ];
  t.true(createRequestPostStub.calledOnce);
  t.not(createRequestPostStub.getCall(0), null);
  const data: any = createRequestPostStub.getCall(0).args[1];
  anyValues.forEach((valueKey) => {
    t.not(data[valueKey], undefined);
  });
}

test("Test OneSignal.init, Basic HTTP", async t => {
  stubMessageChannel(t);
  mockIframeMessaging(sinonSandbox);
  sinonSandbox.stub(OneSignalApiBase, "get").resolves({});

  const testConfig = {
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Http,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom, false);
  serverAppConfig.config.subdomain = "test";
  initTestHelper.stubJSONP(serverAppConfig);

  const assertInit = new AssertInitSDK();
  assertInit.setupEnsureInitEventFires(t);
  const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
    .resolves({success: true, id: Random.getRandomUuid()});
  await OneSignal.init({
    appId: Random.getRandomUuid()
  });
  t.is(OneSignal.pendingInit, false);
  t.true(createPlayerPostStub.notCalled);
  assertInit.ensureInitEventFired();
});

test("Test OneSignal.init, Basic HTTP, autoRegister", async t => {
  stubMessageChannel(t);
  mockIframeMessaging(sinonSandbox);
  sinonSandbox.stub(OneSignalApiBase, "get").resolves({});

  const testConfig = {
    initOptions: {
      autoRegister: true,
    },
    httpOrHttps: HttpHttpsEnvironment.Http,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom, false);
  serverAppConfig.config.subdomain = "test";
  initTestHelper.stubJSONP(serverAppConfig);

  const assertInit = new AssertInitSDK();
  assertInit.setupEnsureInitEventFires(t);

  sinonSandbox.stub(InitHelper, "doInitialize").resolves();
  sinonSandbox.stub(OneSignal, "internalIsOptedOut").resolves(false);
  sinonSandbox.stub(OneSignalUtils, "isUsingSubscriptionWorkaround").returns(true);
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(OneSignal.context.promptsManager, "internalShowAutoPrompt").resolves();
  const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
    .resolves({success: true, id: Random.getRandomUuid()});
  await OneSignal.init({
    appId: Random.getRandomUuid(),
    autoRegister: true
  });
  t.is(OneSignal.pendingInit, false);
  t.true(createPlayerPostStub.notCalled);
  assertInit.ensureInitEventFired();
});

test("Test OneSignal.init, Basic HTTPS, autoRegister = true with already granted push permissions", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  initTestHelper.mockBasicInitEnv(testConfig);
  TestEnvironment.mockInternalOneSignal();
  (window as any).Notification.permission = "granted";

  const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
    .resolves({success: true, id: Random.getRandomUuid()});

  const assertInit = new AssertInitSDK();
  assertInit.setupEnsureInitEventFires(t);

  t.is(OneSignal.config.userConfig.autoResubscribe, true);

  await OneSignal.init({
    appId: Random.getRandomUuid(),
    autoRegister: true
  });

  expectPushRecordCreationRequest(t, createPlayerPostStub);
  assertInit.ensureInitEventFired();
});

test("Test OneSignal.init, Basic HTTPS, autoRegister = true with default push permissions", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  initTestHelper.mockBasicInitEnv(testConfig);
  TestEnvironment.mockInternalOneSignal();
  (window as any).Notification.permission = "default";

  const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
    .resolves({success: true, id: Random.getRandomUuid()});

  const assertInit = new AssertInitSDK();
  assertInit.setupEnsureInitEventFires(t);

  const initPromise = OneSignal.init({
    appId: Random.getRandomUuid(),
    autoRegister: true
  });

  // set up event to change permission after native prompt is displayed
  OneSignal.emitter.on(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED, () => {
    (window as any).Notification.permission = "granted";
  });

  await initPromise;
  expectPushRecordCreationRequest(t, createPlayerPostStub);
  assertInit.ensureInitEventFired();
});

test("Test OneSignal.init, Basic HTTPS, Custom, with autoRegister, and delayed accept", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: 'granted'
  };
  await TestEnvironment.initialize(testConfig);

  initTestHelper.mockBasicInitEnv(testConfig);

  TestEnvironment.mockInternalOneSignal();
  const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
    .resolves({success: true, id: Random.getRandomUuid()});

  await OneSignal.init({
    appId: Random.getRandomUuid(),
    autoRegister: true
  });
  expectPushRecordCreationRequest(t, createPlayerPostStub);

  // Check checkAndTriggerSubscriptionChanged if we get a 'Promise returned by test never resolved' Error
  await OneSignal.isPushNotificationsEnabled();
  t.pass();
});

test("Test OneSignal.init, Custom, with requiresUserPrivacyConsent", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);

  initTestHelper.mockBasicInitEnv(testConfig);

  let delayInit = true;
  OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, function() {
    if (delayInit)
      t.fail();
  });

  TestEnvironment.mockInternalOneSignal();

  const assertInit = new AssertInitSDK();
  assertInit.setupEnsureInitEventFires(t);
  sinonSandbox.stub(OneSignalApiBase, "post").resolves({success: true, id: Random.getRandomUuid()});
  await OneSignal.init({
    appId: Random.getRandomUuid(),
    requiresUserPrivacyConsent: true
  });

  delayInit = false;
  await OneSignal.provideUserConsent(true);
  assertInit.ensureInitEventFired();
});

test("Test OneSignal.init, TypicalSite, with requiresUserPrivacyConsent", async t => {
  const testConfig = {
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);

  initTestHelper.mockBasicInitEnv(testConfig);

  let delayInit = true;
  OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, function() {
    if (delayInit)
      t.fail();
    else
      t.pass();
  });

  TestEnvironment.mockInternalOneSignal();
  // Don't need to mock create call, autoRegister not settable with TypicalSite

  const assertInit = new AssertInitSDK();
  assertInit.setupEnsureInitEventFires(t);
  await OneSignal.init({
    appId: Random.getRandomUuid(),
    requiresUserPrivacyConsent: true
  });

  delayInit = false;
  await OneSignal.provideUserConsent(true);
  assertInit.ensureInitEventFired();
});

test("Test OneSignal.init, No app id or wrong format of app id", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");
  sinonSandbox.stub(InitHelper, "errorIfInitAlreadyCalled").returns(false);
  
  await t.throws(OneSignal.init({}), SdkInitError);
  await t.throws(OneSignal.init({ appId: "" }), SdkInitError);
  await t.throws(OneSignal.init({ appId: "wrong-format" }), SdkInitError);
});
