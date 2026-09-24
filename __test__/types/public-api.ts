import OneSignalImplementation from '../../src/onesignal/OneSignal';
import type { OneSignal as OneSignalPublicApi } from '../../src/onesignal/OneSignalInterface';

type AssertPublicApi<T extends OneSignalPublicApi> = T;

export type OneSignalImplementationConforms = AssertPublicApi<typeof OneSignalImplementation>;
