import { NotificationPermission } from 'src/shared/models/NotificationPermission';
import { RecursivePartial } from '../../../src/shared/context/Utils';
import MainHelper from '../../../src/shared/helpers/MainHelper';
import {
  AppUserConfig,
  ConfigIntegrationKind,
  ServerAppConfig,
} from '../../../src/shared/models/AppConfig';
import { DUMMY_ONESIGNAL_ID, DUMMY_PUSH_TOKEN } from '../constants';
import { getDummyPushSubscriptionOSModel } from '../helpers/core';
import BrowserUserAgent from '../models/BrowserUserAgent';
import {
  initOSGlobals,
  mockUserAgent,
  resetDatabase,
  stubDomEnvironment,
  stubNotification,
} from './TestEnvironmentHelpers';

export interface TestEnvironmentConfig {
  userConfig?: AppUserConfig;
  initOptions?: any;
  initUserAndPushSubscription?: boolean; // default: false - initializes User & PushSubscription in UserNamespace (e.g. creates an anonymous user)
  environment?: string;
  permission?: NotificationPermission;
  addPrompts?: boolean;
  url?: string;
  userAgent?: BrowserUserAgent;
  overrideServerConfig?: RecursivePartial<ServerAppConfig>;
  integration?: ConfigIntegrationKind;
  useMockIdentityModel?: boolean;
  useMockPushSubscriptionModel?: boolean;
}

export class TestEnvironment {
  static async initialize(config: TestEnvironmentConfig = {}) {
    mockUserAgent(config);
    // reset db & localStorage
    resetDatabase();

    const oneSignal = await initOSGlobals(config);

    if (config.useMockIdentityModel) {
      const model = OneSignal.coreDirector.getIdentityModel();
      model.onesignalId = DUMMY_ONESIGNAL_ID;
    }

    if (config.useMockPushSubscriptionModel) {
      OneSignal.coreDirector.addSubscriptionModel(
        getDummyPushSubscriptionOSModel(),
      );
      vi.spyOn(MainHelper, 'getCurrentPushToken').mockResolvedValue(
        DUMMY_PUSH_TOKEN,
      );
    }

    await stubDomEnvironment(config);
    config.environment = 'dom';
    stubNotification(config);
    return oneSignal;
  }
}
