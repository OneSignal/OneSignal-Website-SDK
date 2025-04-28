import { NotificationPermission } from 'src/shared/models/NotificationPermission';
import OperationCache from '../../../src/core/caching/OperationCache';
import { ModelName } from '../../../src/core/models/SupportedModels';
import { RecursivePartial } from '../../../src/shared/context/Utils';
import MainHelper from '../../../src/shared/helpers/MainHelper';
import {
  AppUserConfig,
  ConfigIntegrationKind,
  ServerAppConfig,
} from '../../../src/shared/models/AppConfig';
import { DUMMY_ONESIGNAL_ID, DUMMY_PUSH_TOKEN } from '../constants';
import {
  getDummyIdentityOSModel,
  getDummyPushSubscriptionOSModel,
} from '../helpers/core';
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
    OperationCache.flushOperations();

    const oneSignal = await initOSGlobals(config);

    if (config.useMockIdentityModel) {
      const identityModel = getDummyIdentityOSModel();
      // set on the model instance
      identityModel.setOneSignalId(DUMMY_ONESIGNAL_ID);
      // set on the model data
      identityModel.set('onesignal_id', DUMMY_ONESIGNAL_ID);
      OneSignal.coreDirector.add(ModelName.Identity, identityModel, false);
    }

    if (config.useMockPushSubscriptionModel) {
      OneSignal.coreDirector.add(
        ModelName.Subscriptions,
        getDummyPushSubscriptionOSModel(),
        false,
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
