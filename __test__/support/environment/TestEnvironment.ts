import SdkEnvironment from "../../../src/shared/managers/SdkEnvironment";
import { AppUserConfig, ConfigIntegrationKind, ServerAppConfig } from "../../../src/shared/models/AppConfig";
import { TestEnvironmentKind } from "../../../src/shared/models/TestEnvironmentKind";
import BrowserUserAgent from "../models/BrowserUserAgent";
import { resetDatabase, initOSGlobals, stubDomEnvironment, stubNotification } from "./TestEnvironmentHelpers";
import { HttpHttpsEnvironment } from "../models/HttpHttpsEnvironment";
import OperationCache from "../../../src/core/caching/OperationCache";
import "fake-indexeddb/auto";
import { RecursivePartial } from "../../../src/shared/context/Utils";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { getDummyIdentityOSModel, getDummyPushSubscriptionOSModel } from "../helpers/core";
import MainHelper from "../../../src/shared/helpers/MainHelper";
import { DUMMY_ONESIGNAL_ID, DUMMY_PUSH_TOKEN } from "../constants";

declare var global: any;

export interface TestEnvironmentConfig {
  userConfig?: AppUserConfig;
  initOptions?: any;
  initUserAndPushSubscription?: boolean;   // default: false - initializes User & PushSubscription in UserNamespace (e.g. creates an anonymous user)
  environment?: string;
  permission?: NotificationPermission;
  addPrompts?: boolean;
  url?: string;
  initializeAsIframe?: boolean;
  userAgent?: BrowserUserAgent;
  httpOrHttps?: HttpHttpsEnvironment;
  overrideServerConfig?: RecursivePartial<ServerAppConfig>;
  integration?: ConfigIntegrationKind;
  useMockIdentityModel?: boolean;
  useMockPushSubscriptionModel?: boolean;
}

export class TestEnvironment {
  static async initialize(config: TestEnvironmentConfig = {}) {
    // reset db & localStorage
    resetDatabase();
    OperationCache.flushOperations();

    const oneSignal = await initOSGlobals(config);

    if (config.useMockIdentityModel) {
      const identityModel = getDummyIdentityOSModel();
      // set on the model instance
      identityModel.setOneSignalId(DUMMY_ONESIGNAL_ID);
      // set on the model data
      identityModel.set("onesignal_id", DUMMY_ONESIGNAL_ID);
      OneSignal.coreDirector.add(ModelName.Identity,identityModel, false);
    }

    if (config.useMockPushSubscriptionModel) {
      OneSignal.coreDirector.add(ModelName.PushSubscriptions, getDummyPushSubscriptionOSModel(), false);
      test.stub(MainHelper, "getCurrentPushToken", Promise.resolve(DUMMY_PUSH_TOKEN))
    }

    SdkEnvironment.getTestEnv = () => TestEnvironmentKind.UnitTesting;

    await stubDomEnvironment(config);
    config.environment = "dom";
    stubNotification(config);
    return oneSignal;
  }

  static async resetCoreModule() {
    await OneSignal.coreDirector.resetModelRepoAndCache();
  }
}
