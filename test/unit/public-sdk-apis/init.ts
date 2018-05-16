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

let sinonSandbox: SinonSandbox;
test.beforeEach(function () {
  expectWebPushAnalytics();

  sinonSandbox = sinon.sandbox.create();
});

test.afterEach(function () {
  sinonSandbox.restore();

  OneSignal._initCalled = false;
  OneSignal.__initAlreadyCalled = false;
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

async function expectWebPushAnalytics() {
  nock('https://onesignal.com')
    .get("/webPushAnalytics")
    .reply(200, (_uri: string, _requestBody: string) => {
      return { success: true };
    });
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
  let firedSDKInitalizedPublic = false;
  OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, function() {
    if (delayInit)
      t.fail();

    firedSDKInitalizedPublic = true;
  });

  TestEnvironment.mockInternalOneSignal();

  await OneSignal.init({
    appId: Random.getRandomUuid(),
    requiresUserPrivacyConsent: true
  });

  expectPushRecordCreationRequest(t);

  delayInit = false;
  await OneSignal.provideUserConsent(true);

  if (!firedSDKInitalizedPublic)
    t.fail();
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
  let firedSDKInitializedPublic = false;
  OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, function() {
    if (delayInit)
      t.fail();
    else
      t.pass();

    firedSDKInitializedPublic = true;
  });

  TestEnvironment.mockInternalOneSignal();
  // Don't need to mock create call, autoRegister not settable with TypicalSite

  await OneSignal.init({
    appId: Random.getRandomUuid(),
    requiresUserPrivacyConsent: true
  });

  delayInit = false;
  await OneSignal.provideUserConsent(true);

  if (!firedSDKInitializedPublic)
    t.fail();
});
