import { ONESIGNAL_ID } from '__test__/constants';
import type {
  AppUserConfig,
  ConfigIntegrationKindValue,
  ServerAppConfig,
} from 'src/shared/config/types';
import type { RecursivePartial } from 'src/shared/context/types';
import { updateIdentityModel } from '../helpers/setup';
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
  useMockedIdentity?: boolean;
}

export class TestEnvironment {
  static async initialize(config: TestEnvironmentConfig = {}) {
    // reset db & localStorage
    // await clearAll();
    const oneSignal = await initOSGlobals(config);
    OneSignal.coreDirector.operationRepo.queue = [];

    // if (config.useMockedIdentity) {
    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    // }

    await stubDomEnvironment(config);
    config.environment = 'dom';
    stubNotification(config);
    return oneSignal;
  }
}
