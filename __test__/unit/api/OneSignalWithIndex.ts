import OneSignal from '../../../src/onesignal/OneSignal';

export interface OneSignalWithIndex extends OneSignal {
  [key: string]: any;
}
