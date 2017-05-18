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
import RemoteFrame from "./RemoteFrame";
import * as log from 'loglevel';

/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
export default class SubscriptionModal extends RemoteFrame {

  constructor(initOptions: any) {
    super(initOptions);
  }

  establishCrossOriginMessaging() {
    this.messenger = new Postmam(window.parent, this.options.origin, this.options.origin);
  }
}
