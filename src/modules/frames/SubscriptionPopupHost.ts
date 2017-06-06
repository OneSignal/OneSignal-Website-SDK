import Postmam from '../../Postmam';
import { MessengerMessageEvent } from '../../models/MessengerMessageEvent';
import Database from "../../services/Database";
import Event from "../../Event";
import EventHelper from "../../helpers/EventHelper";
import { timeoutPromise } from "../../utils";
import TimeoutError from '../../errors/TimeoutError';
import * as objectAssign from 'object-assign';
import MainHelper from '../../helpers/MainHelper';
import SdkEnvironment from '../../managers/SdkEnvironment';
import * as log from 'loglevel';

/**
 * Manager for an instance of the OneSignal proxy frame, for use from the main
 * page (not the iFrame itself).
 *
 * This is loaded as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
export default class SubscriptionPopupHost implements Disposable {

  public url: URL;
  private popupWindow: Window;
  private messenger: Postmam;
  private options: SubscriptionPopupHostOptions;

  // Promise to track whether the frame has finished loading
  private loadPromise: {
    promise: Promise<void>,
    resolver: Function,
    rejector: Function
  }

  /**
   *
   * @param origin The URL object describing the origin to load.
   */
  constructor(origin: URL, options: SubscriptionPopupHostOptions) {
    this.url = origin;
    this.url.pathname = 'subscribe';
    this.options = options || {
      autoAccept: false,
      httpPermissionRequest: false
    };
  }

  /**
   * Opens a new Window to subscribe the user.
   */
  load(): Promise<void> {
    // Instead of using URL query parameters, which are confusing and unsightly,
    // post the data invisible
    let postData = objectAssign({}, MainHelper.getPromptOptionsPostHash(), {
      promptType: 'popup',
      parentHostname: encodeURIComponent(location.hostname)
    });
    if (this.options.autoAccept) {
      postData['autoAccept'] = true;
    }
    if (this.options.httpPermissionRequest) {
      postData['httpPermissionRequest'] = true;
      var overrides = {
        childWidth: 250,
        childHeight: 150,
        left: -99999999,
        top: 9999999,
      };
    }
    log.info(`Opening a popup to ${this.url.toString()} with POST data:`, postData);
    this.popupWindow = this.openWindowViaPost(this.url.toString(), postData, overrides);

    this.establishCrossOriginMessaging();
    (this as any).loadPromise = {};
    (this as any).loadPromise.promise = new Promise((resolve, reject) => {
        this.loadPromise.resolver = resolve;
        this.loadPromise.rejector = reject;
    });

    // This can throw a TimeoutError, which should go up the stack
    return this.loadPromise.promise;
  }

  // Arguments :
  //  verb : 'GET'|'POST'
  //  target : an optional opening target (a name, or "_blank"), defaults to "_self"
  openWindowViaPost(url, data, overrides) {
    var form = document.createElement("form");
    form.action = url;
    form.method = 'POST';
    form.target = "onesignal-http-popup";

    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : (screen as any).left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : (screen as any).top;
    var thisWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var thisHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    var childWidth = OneSignal._windowWidth;
    var childHeight = OneSignal._windowHeight;
    var left = ((thisWidth / 2) - (childWidth / 2)) + dualScreenLeft;
    var top = ((thisHeight / 2) - (childHeight / 2)) + dualScreenTop;

    if (overrides) {
      if (overrides.childWidth) {
        childWidth = overrides.childWidth;
      }
      if (overrides.childHeight) {
        childHeight = overrides.childHeight;
      }
      if (overrides.left) {
        left = overrides.left;
      }
      if (overrides.top) {
        top = overrides.top;
      }
    }
    const windowRef = window.open('about:blank', "onesignal-http-popup", `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`);

    if (data) {
      for (var key in data) {
        var input = document.createElement("textarea");
        input.name = key;
        input.value = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
        form.appendChild(input);
      }
    }
    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    return windowRef;
  }

  establishCrossOriginMessaging() {
    this.messenger = new Postmam(this.popupWindow, this.url.toString(), this.url.toString());
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.POPUP_BEGIN_MESSAGEPORT_COMMS, this.onBeginMessagePortCommunications.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_LOADED, this.onPopupLoaded.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_ACCEPTED, this.onPopupAccepted.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_REJECTED, this.onPopupRejected.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, this.onPopupClosing.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.BEGIN_BROWSING_SESSION, this.onBeginBrowsingSession.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.WINDOW_TIMEOUT, this.onWindowTimeout.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.FINISH_REMOTE_REGISTRATION, this.onFinishingRegistrationRemotely.bind(this));
    this.messenger.startPostMessageReceive();
  }

  dispose() {
    // Removes all events
    this.messenger.destroy();
  }

  async onBeginMessagePortCommunications(message: MessengerMessageEvent) {
    log.debug(`(${SdkEnvironment.getWindowEnv().toString()}) Successfully established cross-origin messaging with the popup window.`);
    this.messenger.connect();
    return false;
  }

  async onPopupLoaded(message: MessengerMessageEvent) {
    this.loadPromise.resolver();
    Event.trigger('popupLoad');
  }

  async onPopupAccepted(message: MessengerMessageEvent) {
    MainHelper.triggerCustomPromptClicked('granted');
  }

  async onPopupRejected(message: MessengerMessageEvent) {
    MainHelper.triggerCustomPromptClicked('denied');
  }

  async onPopupClosing(message: MessengerMessageEvent) {
    log.info('Popup window is closing, running cleanup events.');
    Event.trigger(OneSignal.EVENTS.POPUP_CLOSING);
    this.dispose();
  }

  async onBeginBrowsingSession(message: MessengerMessageEvent) {
    log.debug(SdkEnvironment.getWindowEnv().toString() + " Marking current session as a continuing browsing session.");
    MainHelper.beginTemporaryBrowserSession();
  }

  async onWindowTimeout(message: MessengerMessageEvent) {
    log.debug(SdkEnvironment.getWindowEnv().toString() + " Popup window timed out and was closed.");
    Event.trigger(OneSignal.EVENTS.POPUP_WINDOW_TIMEOUT);
  }

  async onFinishingRegistrationRemotely(message: MessengerMessageEvent) {
    log.debug(SdkEnvironment.getWindowEnv().toString() + " Finishing HTTP popup registration inside the iFrame, sent from popup.");

    message.reply({ progress: true });

    const appId = await MainHelper.getAppId()
    this.messenger.stopPostMessageReceive();
    await MainHelper.registerWithOneSignal(appId, message.data.subscriptionInfo)
    EventHelper.checkAndTriggerSubscriptionChanged();
  }

  /**
   * Shortcut method to messenger.message().
   */
  message() {
    this.messenger.message.apply(this.messenger, arguments);
  }
}
