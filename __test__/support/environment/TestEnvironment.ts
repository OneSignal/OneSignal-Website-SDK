import CoreModule from "../../src/core/CoreModule";
import { CoreModuleDirector } from "../../src/core/CoreModuleDirector";
import SdkEnvironment from "../../src/shared/managers/SdkEnvironment";
import { AppUserConfig } from "../../src/shared/models/AppConfig";
import { TestEnvironmentKind } from "../../src/shared/models/TestEnvironmentKind";
import BrowserUserAgent from "./models/BrowserUserAgent";
import { initOSGlobals, resetDatabase, stubDomEnvironment, stubNotification } from "./TestEnvironmentHelpers";
import { HttpHttpsEnvironment } from "./models/HttpHttpsEnvironment";
import OperationCache from "../../src/core/caching/OperationCache";
import "fake-indexeddb/auto";

declare var global: any;

export interface TestEnvironmentConfig {
  userConfig?: AppUserConfig;
  initOptions?: any;
  environment?: string;
  permission?: NotificationPermission;
  addPrompts?: boolean;
  url?: string;
  initializeAsIframe?: boolean;
  userAgent?: BrowserUserAgent;
  coreDirector?: CoreModuleDirector;
  httpOrHttps?: HttpHttpsEnvironment;
}

export class TestEnvironment {
  static async initialize(config: TestEnvironmentConfig = {}) {
    // reset db & localStorage
    resetDatabase();
    OperationCache.flushOperations();

    const core = new CoreModule();
    await core.init();
    config.coreDirector = new CoreModuleDirector(core);
    const oneSignal = initOSGlobals(config);

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
