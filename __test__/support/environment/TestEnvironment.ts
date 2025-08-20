import { ONESIGNAL_ID } from '__test__/constants';
import { mockJsonp } from '__test__/setupTests';
import type {
  AppUserConfig,
  ConfigIntegrationKindValue,
  ServerAppConfig,
} from 'src/shared/config/types';
import type { RecursivePartial } from 'src/shared/context/types';
import { updateIdentityModel } from '../helpers/setup';
import { initOSGlobals, stubNotification } from './TestEnvironmentHelpers';

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
}
Object.defineProperty(document, 'readyState', {
  value: 'complete',
  writable: true,
});

export class TestEnvironment {
  static async initialize(config: TestEnvironmentConfig = {}) {
    mockJsonp();
    const oneSignal = await initOSGlobals(config);
    OneSignal.coreDirector.operationRepo.queue = [];

    updateIdentityModel('onesignal_id', ONESIGNAL_ID);

    // Set URL if provided
    if (config.url) {
      Object.defineProperty(window, 'location', {
        value: new URL(config.url),
        writable: true,
      });
    }

    window.isSecureContext = true;

    // await stubDomEnvironment(config);
    config.environment = 'dom';
    stubNotification(config);
    return oneSignal;
  }
}
