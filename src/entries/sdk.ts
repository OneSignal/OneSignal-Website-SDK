/**
 * Pages and older service workers will include this entry point, which is the full SDK.
 */
import { oneSignalSdkInit } from 'src/utils/pageSdkInit';
import { WindowEnvironmentKind } from 'src/models/WindowEnvironmentKind';
import SdkEnvironment from 'src/managers/SdkEnvironment';

const windowEnv = SdkEnvironment.getWindowEnv();
if (windowEnv === WindowEnvironmentKind.ServiceWorker) {
  (self as any).OneSignal = require('../../src/service-worker/ServiceWorker');
} else {
  oneSignalSdkInit();
}
