import { ONESIGNAL_ID } from '__test__/constants';
import { mockJsonp } from '__test__/setupTests';
import type {
  AppUserConfig,
  ConfigIntegrationKindValue,
  ServerAppConfig,
} from 'src/shared/config/types';
import type { RecursivePartial } from 'src/shared/context/types';
import { updateIdentityModel, updatePropertiesModel } from '../helpers/setup';
import { initOSGlobals, stubNotification } from './TestEnvironmentHelpers';

export interface TestEnvironmentConfig {
  userConfig?: AppUserConfig;
  initOneSignalId?: boolean;
  initUserAndPushSubscription?: boolean; // default: false - initializes User & PushSubscription in UserNamespace (e.g. creates an anonymous user)
  permission?: NotificationPermission;
  addPrompts?: boolean;
  url?: string;
  overrideServerConfig?: RecursivePartial<ServerAppConfig>;
  integration?: ConfigIntegrationKindValue;
}
Object.defineProperty(document, 'readyState', {
  value: 'complete',
  writable: true,
});

export class TestEnvironment {
  static initialize(
    config: TestEnvironmentConfig = {
      initOneSignalId: true,
    },
  ) {
    mockJsonp();
    const oneSignal = initOSGlobals(config);
    OneSignal._coreDirector._operationRepo._queue = [];

    if (config.initOneSignalId) {
      updateIdentityModel('onesignal_id', ONESIGNAL_ID);
      updatePropertiesModel('onesignalId', ONESIGNAL_ID);
    }

    // Set URL if provided
    if (config.url) {
      Object.defineProperty(window, 'location', {
        value: new URL(config.url),
        writable: true,
      });
    }

    window.isSecureContext = true;

    stubNotification(config);
    return oneSignal;
  }
}
