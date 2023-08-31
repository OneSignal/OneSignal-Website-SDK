import { OneSignalDeferredLoadedCallback } from '../page/models/OneSignalDeferredLoadedCallback';
import OneSignal from './OneSignal';

// This class is simply used as a proxy to OneSignal.push when the SDK is fully loaded.
// This way the site developer can use OneSignalDeferred.push without have to check
//   if the SDK is loaded or not.
export default class OneSignalDeferred {
  static push(item: OneSignalDeferredLoadedCallback) {
    OneSignal.push(item);
  }
}
