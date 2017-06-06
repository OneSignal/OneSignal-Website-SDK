import SdkEnvironment from './SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';


/**
 * Creates method proxies for once-supported methods.
 */
export default class LegacyManager {
  static ensureBackwardsCompatibility(oneSignal) {
    LegacyManager.environmentPolyfill(oneSignal);
    LegacyManager.postmams(oneSignal);
  }

  static environmentPolyfill(oneSignal) {
    oneSignal.environment = {};
    oneSignal.environment.getEnv = function () { return ''; }
    oneSignal.environment.isPopup = function () {
      return SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalSubscriptionPopup;
    }
    oneSignal.environment.isIframe = function () {
      return SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalProxyFrame;
    }
  }

  static postmams(oneSignal) {
    const postmamMessageFunc = function message(...args) {
      this.messenger.message.apply(this.messenger, arguments);
    }

    const postmamPostMessageFunc = function postMessage(...args) {
      this.messenger.postMessage.apply(this.messenger, arguments);
    }

    function assignPostmamLegacyFunctions(postmamLikeObject) {
      postmamLikeObject.message = postmamMessageFunc;
      postmamLikeObject.postMessage = postmamPostMessageFunc;
    }

    if (oneSignal.proxyFrame) {
      oneSignal.iframePostmam = oneSignal.proxyFrame;
      assignPostmamLegacyFunctions(oneSignal.iframePostmam);
    }
    if (oneSignal.subscriptionPopup) {
      oneSignal.popupPostmam = oneSignal.subscriptionPopup;
      assignPostmamLegacyFunctions(oneSignal.popupPostmam);
    }
    if (oneSignal.subscriptionModal) {
      oneSignal.modalPostmam = oneSignal.subscriptionModal;
      assignPostmamLegacyFunctions(oneSignal.modalPostmam);
    }
  }
}
