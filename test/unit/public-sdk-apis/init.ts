import "../../support/polyfills/polyfills";
import test, { ExecutionContext } from "ava";
import sinon, { SinonSandbox } from 'sinon';
import Database from "../../../src/services/Database";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import Context from '../../../src/models/Context';
import InitHelper from '../../../src/helpers/InitHelper';
import { AppConfig } from '../../../src/models/AppConfig';
import nock from 'nock';
import Random from "../../support/tester/Random";
import OneSignalApiBase from "../../../src/OneSignalApiBase";
import { SdkInitError } from "../../../src/errors/SdkInitError";
import OneSignalApiShared from "../../../src/OneSignalApiShared";
import { EmailProfile } from "../../../src/models/EmailProfile";
import { SecondaryChannelDeviceRecord } from "../../../src/models/SecondaryChannelDeviceRecord";
import {
  InitTestHelper, AssertInitSDK
} from '../../support/tester/utils';

let sinonSandbox: SinonSandbox = sinon.sandbox.create();
let initTestHelper = new InitTestHelper(sinonSandbox);

test.beforeEach(function () {
  nock.disableNetConnect();
});

test.afterEach(function (_t: ExecutionContext) {
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

  // If not set, default to true
  {
    delete config.userConfig.persistNotification;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.true(persistNotification);
  }

  // If set to false, ensure value is false
  {
    config.userConfig.persistNotification = false;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.false(persistNotification);
  }

  // If set to true, ensure value is true
  {
    config.userConfig.persistNotification = true;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.is(persistNotification, true);
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
  OneSignal.context.pageViewManager.setPageViewCount(1);
  t.true(OneSignal.context.pageViewManager.isFirstPageView());

  await Database.setEmailProfile(testEmailProfile);

  const onSessionStub = sinonSandbox.stub(OneSignalApiShared, "updateUserSession").resolves();
  await InitHelper.updateEmailSessionCount();
  t.true(onSessionStub.calledOnce);
  t.is(onSessionStub.getCall(0).args.length, 2);
  t.is(onSessionStub.getCall(0).args[0], testEmailProfile.playerId);
  const emailDeviceRecord = onSessionStub.getCall(0).args[1] as SecondaryChannelDeviceRecord;
  t.is(emailDeviceRecord.appId, OneSignal.context.appConfig.appId);
});


test("Test OneSignal.init, Custom, with requiresUserPrivacyConsent", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint,
    stubSetTimeout: true
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
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint,
    stubSetTimeout: true
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

  await t.throwsAsync(async () => OneSignal.init({}), { instanceOf: SdkInitError });
  await t.throwsAsync(async () => OneSignal.init({ appId: "" }), { instanceOf: SdkInitError });
  await t.throwsAsync(async () => OneSignal.init({ appId: "wrong-format" }), { instanceOf: SdkInitError });
});

// more init tests in onSession.ts
