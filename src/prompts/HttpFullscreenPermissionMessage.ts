import { PermissionPrompt } from './PermissionPrompt';
import { PermissionPromptResult } from '../models/PermissionPromptResult';
import { NotificationPermission } from '../models/NotificationPermission';
import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import EventHelper from '../helpers/EventHelper';
import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import Postmam from '../Postmam';
import * as objectAssign from 'object-assign';
import { MessengerMessageEvent } from '../models/MessengerMessageEvent';
import SdkEnvironment from '../managers/SdkEnvironment';
import Context from '../models/Context';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { SubscriptionManager } from '../managers/SubscriptionManager';

/*
  TODO: Test if clicking Continue on HTTP popup, but clicking Block on browser's
  native permission request tells us anything we can use to resolve
  resolvePromise with PermissionPromptResult.Cancel
*/

/**
 * Represents the HTTP fullscreen permission message.
 */
export class HttpFullscreenPermissionMessage extends PermissionPrompt implements Disposable {
  public url: URL;
  private popupWindow: Window;
  private messenger: Postmam;
  private options: SubscriptionPopupHostOptions;

  // Promise to track whether the popup has finished loading
  private loadPromise: {
    promise: Promise<void>;
    resolver: Function;
    rejector: Function;
  };

  // Promise to track whether notification permissions in the popup have been
  // granted, the subscription has been created in the popup, and the proxy
  // iframe has finished registering with OneSignal
  private resolvePromise: {
    promise: Promise<PermissionPromptResult>;
    resolver: (result: PermissionPromptResult) => void;
    rejector: (result: PermissionPromptResult) => void;
  };

  /**
   *
   * @param origin The URL object describing the origin to load.
   */
  constructor(origin: URL, options: SubscriptionPopupHostOptions) {
    super();
    this.url = origin;
    this.url.pathname = 'subscribe';
    this.options = options || {
      autoAccept: false,
      httpPermissionRequest: false
    };

    (this as any).loadPromise = {};
    (this as any).loadPromise.promise = new Promise((resolve, reject) => {
      this.loadPromise.resolver = resolve;
      this.loadPromise.rejector = reject;
    });

    (this as any).resolvePromise = {};
    (this as any).resolvePromise.promise = new Promise((resolve, reject) => {
      this.resolvePromise.resolver = resolve;
      this.resolvePromise.rejector = reject;
    });
  }

  /**
   * Opens a new Window to subscribe the user.
   */
  load(): Promise<void> {
    // Instead of using URL query parameters, which are confusing and unsightly,
    // post the data invisibly
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
        top: 9999999
      };
    }
    log.info(`Opening a popup to ${this.url.toString()} with POST data:`, postData);
    this.popupWindow = this.openWindowViaPost(this.url.toString(), postData, overrides);

    this.establishCrossOriginMessaging();

    // This can throw a TimeoutError, which should go up the stack
    return this.loadPromise.promise;
  }

  // Arguments :
  //  verb : 'GET'|'POST'
  //  target : an optional opening target (a name, or "_blank"), defaults to "_self"
  openWindowViaPost(url, data, overrides) {
    var form = document.createElement('form');
    form.action = url;
    form.method = 'POST';
    form.target = 'onesignal-http-popup';

    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : (screen as any).left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : (screen as any).top;
    var thisWidth = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var thisHeight = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    var childWidth = OneSignal._windowWidth;
    var childHeight = OneSignal._windowHeight;
    var left = thisWidth / 2 - childWidth / 2 + dualScreenLeft;
    var top = thisHeight / 2 - childHeight / 2 + dualScreenTop;

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
    const windowRef = window.open(
      'about:blank',
      'onesignal-http-popup',
      `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`
    );

    if (data) {
      for (var key in data) {
        var input = document.createElement('textarea');
        input.name = key;
        input.value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
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
    this.messenger.on(
      OneSignal.POSTMAM_COMMANDS.POPUP_BEGIN_MESSAGEPORT_COMMS,
      this.onBeginMessagePortCommunications.bind(this)
    );
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_LOADED, this.onPopupLoaded.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_ACCEPTED, this.onPopupAccepted.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_REJECTED, this.onPopupRejected.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, this.onPopupClosing.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.SET_SESSION_COUNT, this.onSetSessionCount.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.WINDOW_TIMEOUT, this.onWindowTimeout.bind(this));
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.FINISH_REMOTE_REGISTRATION,
      this.onFinishingRegistrationRemotely.bind(this)
    );
    this.messenger.startPostMessageReceive();
  }

  dispose() {
    // Removes all events
    this.messenger.destroy();
  }

  async onBeginMessagePortCommunications(_: MessengerMessageEvent) {
    log.debug(
      `(${SdkEnvironment.getWindowEnv().toString()}) Successfully established cross-origin messaging with the popup window.`
    );
    this.messenger.connect();
    return false;
  }

  async onPopupLoaded(_: MessengerMessageEvent) {
    this.loadPromise.resolver();
    Event.trigger('popupLoad');
  }

  async onPopupAccepted(_: MessengerMessageEvent) {
    MainHelper.triggerCustomPromptClicked('granted');
    this.resolvePromise.resolver(PermissionPromptResult.Continue);
  }

  async onPopupRejected(_: MessengerMessageEvent) {
    MainHelper.triggerCustomPromptClicked('denied');
    this.resolvePromise.resolver(PermissionPromptResult.Cancel);
  }

  async onPopupClosing(_: MessengerMessageEvent) {
    log.info('Popup window is closing, running cleanup events.');
    Event.trigger(OneSignal.EVENTS.POPUP_CLOSING);
    this.dispose();
  }

  async onSetSessionCount(message: MessengerMessageEvent) {
    log.debug(SdkEnvironment.getWindowEnv().toString() + ' Marking current session as a continuing browsing session.');
    const { sessionCount }: { sessionCount: number } = message.data;
    const context: Context = OneSignal.context;
    context.sessionManager.setPageViewCount(sessionCount);
  }

  async onWindowTimeout(_: MessengerMessageEvent) {
    log.debug(SdkEnvironment.getWindowEnv().toString() + ' Popup window timed out and was closed.');
    Event.trigger(OneSignal.EVENTS.POPUP_WINDOW_TIMEOUT);
  }

  async onFinishingRegistrationRemotely(message: MessengerMessageEvent) {
    log.debug(
      location.origin,
      SdkEnvironment.getWindowEnv().toString() +
        ' Finishing HTTP popup registration inside the iFrame, sent from popup.'
    );

    message.reply({ progress: true });

    const { rawPushSubscription }: { rawPushSubscription: RawPushSubscription } = message.data;

    const appId = await MainHelper.getAppId();
    this.messenger.stopPostMessageReceive();

    const subscriptionManager: SubscriptionManager = OneSignal.context.subscriptionManager;
    const subscription = await subscriptionManager.registerSubscriptionWithOneSignal(rawPushSubscription);

    EventHelper.checkAndTriggerSubscriptionChanged();
  }

  /**
   * Shortcut method to messenger.message().
   */
  message() {
    this.messenger.message.apply(this.messenger, arguments);
  }

  get name() {
    return 'http-fullscreen-permission-message';
  }

  /*
   Test Cases

    - Permission prompt displayed event fires if permission is default
    - Browser notification prompt is shown
    - notificationPermissionChange event is triggered
    - Default permisison triggers notificationPermissionChange event
  */
  async show() {
    await this.load();
    super.show();
  }

  async resolve(): Promise<PermissionPromptResult> {
    const result = await this.resolvePromise.promise;
    super.resolve();
    return result;
  }

  async hide() {
    super.hide();
    /* No Implementation */
  }
}
