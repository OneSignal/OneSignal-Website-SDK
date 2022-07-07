import "../../support/polyfills/polyfills";
import test, { ExecutionContext } from "ava";
import sinon, { SinonSandbox } from 'sinon';
import Database from "../../../src/shared/services/Database";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import Context from '../../../src/page/models/Context';
import InitHelper from '../../../src/shared/helpers/InitHelper';
import { AppConfig } from '../../../src/shared/models/AppConfig';
import nock from 'nock';
import Random from "../../support/tester/Random";
import OneSignalApiBase from "../../../src/shared/api/OneSignalApiBase";
import { SdkInitError } from "../../../src/shared/errors/SdkInitError";
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
  sinonSandbox.stub(OneSignalApiBase, "post").resolves({ success: true, id: Random.getRandomUuid() });
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
