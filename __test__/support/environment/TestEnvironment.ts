import { type RecursivePartial } from '../../../src/shared/context/Utils';
import MainHelper from '../../../src/shared/helpers/MainHelper';
import {
  type AppUserConfig,
  type ConfigIntegrationKindValue,
  type ServerAppConfig,
} from '../../../src/shared/models/AppConfig';
import { DUMMY_ONESIGNAL_ID, DUMMY_PUSH_TOKEN } from '../constants';
import { generateNewSubscription } from '../helpers/core';
import type BrowserUserAgent from '../models/BrowserUserAgent';
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
  userAgent?: typeof BrowserUserAgent;
  overrideServerConfig?: RecursivePartial<ServerAppConfig>;
  integration?: ConfigIntegrationKindValue;
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
      OneSignal.coreDirector.addSubscriptionModel(generateNewSubscription());
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
