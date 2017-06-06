import Environment from "../Environment";
import * as log from "loglevel";
import Event from "../Event";
import Database from "../services/Database";
import {
  getConsoleStyle,
  timeoutPromise,
  unsubscribeFromPush
} from "../utils";
import * as objectAssign from "object-assign";
import Postmam from "../Postmam";
import MainHelper from "./MainHelper";
import ServiceWorkerHelper from "./ServiceWorkerHelper";
import InitHelper from "./InitHelper";
import EventHelper from "./EventHelper";
import SubscriptionHelper from "./SubscriptionHelper";
import { InvalidStateReason } from "../errors/InvalidStateError";
import TestHelper from './TestHelper';
import SdkEnvironment from '../managers/SdkEnvironment';
import { BuildEnvironmentKind } from "../models/BuildEnvironmentKind";
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import AltOriginManager from '../managers/AltOriginManager';
import SubscriptionModal from '../modules/frames/SubscriptionModal';
import SubscriptionPopup from "../modules/frames/SubscriptionPopup";
import ProxyFrame from "../modules/frames/ProxyFrame";
import LegacyManager from '../managers/LegacyManager';

declare var OneSignal: any;


export default class HttpHelper {

  static async isShowingHttpPermissionRequest() {
    if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
      return await OneSignal.proxyFrameHost.isShowingHttpPermissionRequest();
    } else {
      return OneSignal._showingHttpPermissionRequest;
    }
  }

  // Http only - Only called from iframe's init.js
  static async initHttp(options) {
    log.debug(`Called %cinitHttp(${JSON.stringify(options, null, 4)})`, getConsoleStyle('code'));

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
        // Do not await on modal initialization; the modal uses direct
        // postmessage and does not establish a "connection" to wait on
        OneSignal.subscriptionModal.initialize();
        /**
         * Our Rails-side subscription popup/modal depends on
         * OneSignal.iframePostmam, OneSignal.popupPostmam, and
         * OneSignal.modalPostmam, which don't exist anymore.
         */
        LegacyManager.ensureBackwardsCompatibility(OneSignal);
        Event.trigger('httpInitialize');
        break;
      default:
        log.error("Unsupported HTTP initialization branch.");
        break;
    }
  }
}
