import "../../support/polyfills/polyfills";
import test, { TestContext } from "ava";
import sinon, {SinonSandbox} from 'sinon';
import Database from "../../../src/services/Database";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from "../../../src/OneSignal";
import Context from '../../../src/models/Context';
import InitHelper from '../../../src/helpers/InitHelper';
import {AppConfig, ConfigIntegrationKind, ServerAppConfig} from '../../../src/models/AppConfig';

import nock from 'nock';
import { SessionManager } from "../../../src/managers/SessionManager";
import Random from "../../support/tester/Random";
import OneSignalApi from "../../../src/OneSignalApi";
import ProxyFrameHost from "../../../src/modules/frames/ProxyFrameHost";
import AltOriginManager from "../../../src/managers/AltOriginManager";
import { SdkInitError } from "../../../src/errors/SdkInitError";


// Helper class to ensure the public OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC event fires
class AssertInitSDK {
  static firedSDKInitializedPublic = false;
  static doFiredSDKInitializedPublicCheck = false;

  public static ensureInitEventFires(t: TestContext) {
    this.doFiredSDKInitializedPublicCheck = true;
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      AssertInitSDK.firedSDKInitializedPublic = true;
      t.pass();
    });
  }

  public static afterEachEnsureInitEventFires() {
    if (this.doFiredSDKInitializedPublicCheck && !this.firedSDKInitializedPublic)
      throw new Error("OneSignal.Init did not finish!");

    this.doFiredSDKInitializedPublicCheck = false;
    this.firedSDKInitializedPublic = false;
  }
}

let sinonSandbox: SinonSandbox;

test.beforeEach(function () {
  nock.disableNetConnect();
  expectWebPushAnalytics();

  sinonSandbox = sinon.sandbox.create();
});

test.afterEach(function (_t: TestContext) {
  sinonSandbox.restore();

  OneSignal._initCalled = false;
  OneSignal.__initAlreadyCalled = false;
  OneSignal._sessionInitAlreadyRunning = false;
  AssertInitSDK.afterEachEnsureInitEventFires();
});

class InitTestHelpers {
  static stubJSONP(serverAppConfig: ServerAppConfig) {
    sinonSandbox.stub(OneSignalApi, "jsonpLib", function (_url: string, callback: Function) {
      callback(null, serverAppConfig);
    });
  }
}

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

async function expectUserSessionCountUpdateRequest(_t: TestContext, pushDevicePlayerId: string) {
  nock('https://onesignal.com')
    .post(`/api/v1/players/${pushDevicePlayerId}/on_session`)
    .reply(200, (uri, requestBody) => {
      // Not matching for anything yet, because no email-specific data is sent here
      // Just a whole bunch of params like timezone, os, sdk version..etc.
      return { success: true };
    });
}

function expectWebPushAnalytics() {
  nock('https://onesignal.com')
    .get("/webPushAnalytics")
    .reply(200, (_uri: string, _requestBody: string) => {
      return { success: true };
    }).persist(true);

  nock('https://test.os.tc')
    .get("/webPushAnalytics")
    .reply(200, (_uri: string, _requestBody: string) => {
      return { success: true };
    }).persist(true);
}

test("email session should be updated on first page view", async t => {
  const testData = {
    emailPlayerId: Random.getRandomUuid()
  };
  await TestEnvironment.initialize();

  const sessionManager = new SessionManager();
  const appConfig = TestEnvironment.getFakeAppConfig();
  OneSignal.context = new Context(appConfig);
  OneSignal.config = appConfig;
  OneSignal.context.sessionManager = sessionManager;

  // Ensure this is true, that way email on_session gets run
  sessionManager.setPageViewCount(1);
  t.true(sessionManager.isFirstPageView());

  await expectUserSessionCountUpdateRequest(t, testData.emailPlayerId);

  await InitHelper.updateEmailSessionCount();
});

async function expectPushRecordCreationRequest(t: TestContext) {
  nock('https://onesignal.com')
    .post(`/api/v1/players`)
    .reply(400, (_uri: string, requestBody: string) => {
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
      const parsedRequestBody = JSON.parse(requestBody);
      for (const anyValueKey of anyValues)
        t.not(parsedRequestBody[anyValueKey], undefined);
      return {};
    });
}

// Mocks out any messages going to the *.os.tc iframe.
function mockIframeMessaging() {
  sinonSandbox.stub(ProxyFrameHost.prototype, 'load').resolves(undefined);
  sinonSandbox.stub(AltOriginManager, 'removeDuplicatedAltOriginSubscription').resolves(undefined);
  sinonSandbox.stub(ProxyFrameHost.prototype, 'isSubscribed').callsFake(() => {});
  sinonSandbox.stub(ProxyFrameHost.prototype, 'runCommand').resolves(undefined);

  const mockIframeMessageReceiver = function (_msg: string, _data: object, resolve: Function) {
    // OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION
    resolve(true);
  };
  sinonSandbox.stub(ProxyFrameHost.prototype, 'message').callsFake(mockIframeMessageReceiver);
}

test("Test OneSignal.init, Basic HTTP", async t => {
  mockIframeMessaging();
  sinonSandbox.stub(OneSignalApi, "get").resolves({});

  const testConfig = {
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Http,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverAppConfig.config.subdomain = "test";
  InitTestHelpers.stubJSONP(serverAppConfig);

  TestEnvironment.mockInternalOneSignal();

  AssertInitSDK.ensureInitEventFires(t);
  await OneSignal.init({
    appId: Random.getRandomUuid()
  });

  await expectPushRecordCreationRequest(t);
});

test("Test OneSignal.init, Basic HTTP, autoRegister", async t => {
  mockIframeMessaging();
  sinonSandbox.stub(OneSignalApi, "get").resolves({});

  const testConfig = {
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Http,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  serverAppConfig.config.subdomain = "test";
  InitTestHelpers.stubJSONP(serverAppConfig);

  TestEnvironment.mockInternalOneSignal();

  AssertInitSDK.ensureInitEventFires(t);
  await OneSignal.init({
    appId: Random.getRandomUuid(),
    autoRegister: true
  });

  await expectPushRecordCreationRequest(t);
});

test("Test OneSignal.init, Basic HTTPS", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  InitTestHelpers.stubJSONP(serverAppConfig);

  sinonSandbox.stub(OneSignalApi, "get").resolves({});

  TestEnvironment.mockInternalOneSignal();

  // AssertInitSDK.ensureInitEventFires(t);
  await OneSignal.init({
    appId: Random.getRandomUuid()
  });

  await expectPushRecordCreationRequest(t);
  t.pass();
});

test("Test OneSignal.init, Custom, with requiresUserPrivacyConsent", async t => {
  const testConfig = {
    initOptions: {},
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  InitTestHelpers.stubJSONP(serverAppConfig);

  sinonSandbox.stub(OneSignalApi, "get").resolves({});

  let delayInit = true;
  OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, function() {
    if (delayInit)
      t.fail();
  });

  TestEnvironment.mockInternalOneSignal();

  AssertInitSDK.ensureInitEventFires(t);
  await OneSignal.init({
    appId: Random.getRandomUuid(),
    requiresUserPrivacyConsent: true
  });

  await expectPushRecordCreationRequest(t);

  delayInit = false;
  await OneSignal.provideUserConsent(true);
  t.pass();
});

test("Test OneSignal.init, TypicalSite, with requiresUserPrivacyConsent", async t => {
  const testConfig = {
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https,
    pushIdentifier: (await TestEnvironment.getFakePushSubscription()).endpoint
  };
  await TestEnvironment.initialize(testConfig);
  OneSignal.initialized = false;

  sinonSandbox.stub(document, "visibilityState").value("visible");

  const serverAppConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.TypicalSite);
  InitTestHelpers.stubJSONP(serverAppConfig);

  sinonSandbox.stub(OneSignalApi, "get").resolves({});

  let delayInit = true;
  OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, function() {
    if (delayInit)
      t.fail();
    else
      t.pass();
  });

  TestEnvironment.mockInternalOneSignal();
  // Don't need to mock create call, autoRegister not settable with TypicalSite

  AssertInitSDK.ensureInitEventFires(t);
  await OneSignal.init({
    appId: Random.getRandomUuid(),
    requiresUserPrivacyConsent: true
  });

  delayInit = false;
  await OneSignal.provideUserConsent(true);
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
