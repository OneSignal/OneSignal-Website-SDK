import type {
  AppUserConfig,
  ConfigIntegrationKindValue,
  ServerAppConfig,
} from 'src/shared/config/types';
import type { RecursivePartial } from 'src/shared/context/types';
import { clearAll } from 'src/shared/database/client';
import MainHelper from 'src/shared/helpers/MainHelper';
import { DUMMY_ONESIGNAL_ID, DUMMY_PUSH_TOKEN } from '../../constants';
import { generateNewSubscription } from '../helpers/core';
import {
  initOSGlobals,
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
  userAgent?: string;
  overrideServerConfig?: RecursivePartial<ServerAppConfig>;
  integration?: ConfigIntegrationKindValue;
  useMockIdentityModel?: boolean;
  useMockPushSubscriptionModel?: boolean;
}

export class TestEnvironment {
  static async initialize(config: TestEnvironmentConfig = {}) {
    // reset db & localStorage
    await clearAll();
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
