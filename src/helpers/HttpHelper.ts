

import Event from '../Event';
import LegacyManager from '../managers/LegacyManager';
import SdkEnvironment from '../managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import ProxyFrame from '../modules/frames/ProxyFrame';
import { RemoteFrameOptions } from '../modules/frames/RemoteFrame';
import SubscriptionModal from '../modules/frames/SubscriptionModal';
import SubscriptionPopup from '../modules/frames/SubscriptionPopup';
import { getConsoleStyle } from '../utils';
import Log from '../libraries/Log';

declare var OneSignal: any;

export default class HttpHelper {

  // Http only - Only called from iframe's init.js
  static async initHttp(options: RemoteFrameOptions) {
    Log.debug(`Called %cinitHttp(${JSON.stringify(options, null, 4)})`, getConsoleStyle('code'));

    switch (SdkEnvironment.getWindowEnv()) {
      case WindowEnvironmentKind.OneSignalProxyFrame:
        OneSignal.proxyFrame = new ProxyFrame(options);
        await OneSignal.proxyFrame.initialize();
        /**
         * Our Rails-side subscription popup/modal depends on
         * OneSignal.iframePostmam, OneSignal.popupPostmam, and
         * OneSignal.modalPostmam, which don't exist anymore.
         */
        LegacyManager.ensureBackwardsCompatibility(OneSignal);
        break;
      case WindowEnvironmentKind.OneSignalSubscriptionPopup:
        OneSignal.subscriptionPopup = new SubscriptionPopup(options);
        await OneSignal.subscriptionPopup.initialize();
        /**
         * Our Rails-side subscription popup/modal depends on
         * OneSignal.iframePostmam, OneSignal.popupPostmam, and
         * OneSignal.modalPostmam, which don't exist anymore.
         */
        LegacyManager.ensureBackwardsCompatibility(OneSignal);
        Event.trigger('httpInitialize');
        break;
      case WindowEnvironmentKind.OneSignalSubscriptionModal:
        OneSignal.subscriptionModal = new SubscriptionModal(options);

        /*
          WARNING: Do not await on modal initialization; the modal uses direct
          postmessage and does not establish a "connection" to wait on
        */
        /*
          WARNING: The establishCrossOriginMessaging() statement is necessary.
          The common base class implementation of initialize() does an
          asynchronous download of settings, but the modal needs the 'messenger'
          variable (created by calling establishCrossOriginmessaging()) to exist
          immediately. The hacky way to solve this for now is to force this part
          of the initialization earlier.
        */
        OneSignal.subscriptionModal.establishCrossOriginMessaging();
        OneSignal.subscriptionModal.initialize();

        /* Our Rails-side subscription popup/modal depends on
         * OneSignal.iframePostmam, OneSignal.popupPostmam, and
         * OneSignal.modalPostmam, which don't exist anymore.
         */
        LegacyManager.ensureBackwardsCompatibility(OneSignal);
        Event.trigger('httpInitialize');
        break;
      default:
        Log.error("Unsupported HTTP initialization branch.");
        break;
    }
  }
}
