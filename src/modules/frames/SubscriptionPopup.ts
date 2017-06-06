import Postmam from '../../Postmam';
import { MessengerMessageEvent } from '../../models/MessengerMessageEvent';
import Database from "../../services/Database";
import Event from "../../Event";
import EventHelper from "../../helpers/EventHelper";
import { timeoutPromise, unsubscribeFromPush } from "../../utils";
import TimeoutError from '../../errors/TimeoutError';
import { ProxyFrameInitOptions } from '../../models/ProxyFrameInitOptions';
import { Uuid } from '../../models/Uuid';
import ServiceWorkerHelper from "../../helpers/ServiceWorkerHelper";
import * as objectAssign from 'object-assign';
import SdkEnvironment from '../../managers/SdkEnvironment';
import { InvalidStateReason } from "../../errors/InvalidStateError";
import HttpHelper from "../../helpers/HttpHelper";
import TestHelper from "../../helpers/TestHelper";
import InitHelper from "../../helpers/InitHelper";
import MainHelper from "../../helpers/MainHelper";
import { SubscriptionPopupInitOptions } from "../../models/SubscriptionPopupInitOptions";
import SubscriptionHelper from '../../helpers/SubscriptionHelper';
import RemoteFrame from './RemoteFrame';
import * as log from 'loglevel';

/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
export default class SubscriptionPopup extends RemoteFrame {

  constructor(initOptions: any) {
    super(initOptions);
  }

  /**
   * Loads the messenger on the iFrame to communicate with the host page and
   * assigns init options to an iFrame-only initialization of OneSignal.
   *
   * Our main host page will wait for all iFrame scripts to complete since the
   * host page uses the iFrame onload event to begin sending handshake messages
   * to the iFrame.
   *
   * There is no load timeout here; the iFrame initializes it scripts and waits
   * forever for the first handshake message.
   */
   // initialize() is implemented by base RemoteFrame class

  establishCrossOriginMessaging() {
    this.messenger = new Postmam(window.opener, this.options.origin, this.options.origin);
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.CONNECTED, this.onMessengerConnected.bind(this));
    // The host page will receive this event, and then call connect()
    this.messenger.postMessage(OneSignal.POSTMAM_COMMANDS.POPUP_BEGIN_MESSAGEPORT_COMMS, null);
    this.messenger.listen();
  }

  onMessengerConnected(message: MessengerMessageEvent) {
    log.debug(`(${SdkEnvironment.getWindowEnv().toString()}) The host page is now ready to receive commands from the HTTP popup.`);
    this.finishInitialization();
  }
}
