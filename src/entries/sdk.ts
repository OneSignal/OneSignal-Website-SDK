/**
 * Pages and older service workers will include this entry point, which is the full SDK.
 */
import { oneSignalSdkInit } from 'utils/pageSdkInit';
import { WindowEnvironmentKind } from 'models/WindowEnvironmentKind';
import SdkEnvironment from 'managers/SdkEnvironment';

const windowEnv = SdkEnvironment.getWindowEnv();
if (windowEnv === WindowEnvironmentKind.ServiceWorker) {
  (self as any).OneSignal = require('../../src/service-worker/ServiceWorker');
} else {
  oneSignalSdkInit();
}
