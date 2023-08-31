import OneSignalEvent from '../../../shared/services/OneSignalEvent';
import SdkEnvironment from '../../../shared/managers/SdkEnvironment';
import { MessengerMessageEvent } from '../../models/MessengerMessageEvent';
import Postmam from '../../../shared/services/Postmam';
import { SubscriptionManager } from '../../../shared/managers/SubscriptionManager';
import Context from '../../models/Context';
import EventHelper from '../../../shared/helpers/EventHelper';
import MainHelper from '../../../shared/helpers/MainHelper';
import Log from '../../../shared/libraries/Log';
import { RawPushSubscription } from '../../../shared/models/RawPushSubscription';

/**
 * Manager for an instance of the OneSignal proxy frame, for use from the main
 * page (not the iFrame itself).
 *
 * This is loaded as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
export default class SubscriptionPopupHost implements Disposable {
  public url: URL;
  private popupWindow: Window | undefined | null;
  private messenger: Postmam | undefined;
  private options: SubscriptionPopupHostOptions;

  // Promise to track whether the frame has finished loading
  private loadPromise: {
    promise: Promise<void>;
    resolver: (value?: unknown) => void;
    rejector: (reason?: unknown) => void;
  };

  /**
   *
   * @param origin The URL object describing the origin to load.
   */
  constructor(origin: URL, options?: SubscriptionPopupHostOptions) {
    this.url = origin;
    this.url.pathname = 'subscribe';
    this.options = options || {};
  }

  /**
   * Opens a new Window to subscribe the user.
   */
  load(): Promise<void> {
    // Instead of using URL query parameters, which are confusing and unsightly,
    // post the data invisible
    const postData: PostData = {
      ...MainHelper.getPromptOptionsPostHash(),
      ...{
        promptType: 'popup',
        parentHostname: encodeURIComponent(location.hostname),
      },
    };
    if (this.options.autoAccept) {
      postData.autoAccept = true;
    }
    Log.info(
      `Opening a popup to ${this.url.toString()} with POST data:`,
      postData,
    );
    this.popupWindow = this.openWindowViaPost(
      this.url.toString(),
      postData,
      null,
    );

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
  openWindowViaPost(url: string, data, overrides) {
    const form = document.createElement('form');
    form.action = url;
    form.method = 'POST';
    form.target = 'onesignal-http-popup';

    const dualScreenLeft =
      window.screenLeft != undefined ? window.screenLeft : (screen as any).left;
    const dualScreenTop =
      window.screenTop != undefined ? window.screenTop : (screen as any).top;
    const thisWidth = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : screen.width;
    const thisHeight = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : screen.height;
    let childWidth = OneSignal._windowWidth;
    let childHeight = OneSignal._windowHeight;
    let left = thisWidth / 2 - childWidth / 2 + dualScreenLeft;
    let top = thisHeight / 2 - childHeight / 2 + dualScreenTop;

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
      `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`,
    );

    if (data) {
      for (const key in data) {
        const input = document.createElement('textarea');
        input.name = key;
        input.value =
          typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
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
    this.messenger = new Postmam(
      this.popupWindow,
      this.url.toString(),
      this.url.toString(),
    );
    this.messenger.on(
      OneSignal.POSTMAM_COMMANDS.POPUP_BEGIN_MESSAGEPORT_COMMS,
      this.onBeginMessagePortCommunications.bind(this),
    );
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.POPUP_LOADED,
      this.onPopupLoaded.bind(this),
    );
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.POPUP_ACCEPTED,
      this.onPopupAccepted.bind(this),
    );
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.POPUP_REJECTED,
      this.onPopupRejected.bind(this),
    );
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING,
      this.onPopupClosing.bind(this),
    );
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.SET_SESSION_COUNT,
      this.onSetSessionCount.bind(this),
    );
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.WINDOW_TIMEOUT,
      this.onWindowTimeout.bind(this),
    );
    this.messenger.once(
      OneSignal.POSTMAM_COMMANDS.FINISH_REMOTE_REGISTRATION,
      this.onFinishingRegistrationRemotely.bind(this),
    );
    this.messenger.on(
      OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT,
      this.onRemoteRetriggerEvent.bind(this),
    );
    this.messenger.startPostMessageReceive();
  }

  dispose() {
    // Removes all events
    this.messenger.destroy();
  }

  async onBeginMessagePortCommunications(_: MessengerMessageEvent) {
    Log.debug(
      `(${SdkEnvironment.getWindowEnv().toString()}) Successfully established cross-origin messaging with the popup window.`,
    );
    this.messenger.connect();
    return false;
  }

  async onPopupLoaded(_: MessengerMessageEvent) {
    this.loadPromise.resolver();
    OneSignalEvent.trigger('popupLoad');
  }

  async onPopupAccepted(_: MessengerMessageEvent) {
    MainHelper.triggerCustomPromptClicked('granted');
  }

  async onPopupRejected(_: MessengerMessageEvent) {
    MainHelper.triggerCustomPromptClicked('denied');
  }

  async onPopupClosing(_: MessengerMessageEvent) {
    Log.info('Popup window is closing, running cleanup events.');
    OneSignalEvent.trigger(OneSignal.EVENTS.POPUP_CLOSING);
    this.dispose();
  }

  async onSetSessionCount(message: MessengerMessageEvent) {
    Log.debug(
      SdkEnvironment.getWindowEnv().toString() +
        ' Marking current session as a continuing browsing session.',
    );
    const { sessionCount }: { sessionCount: number } = message.data;
    const context: Context = OneSignal.context;
    context.pageViewManager.setPageViewCount(sessionCount);
  }

  async onWindowTimeout(_: MessengerMessageEvent) {
    Log.debug(
      SdkEnvironment.getWindowEnv().toString() +
        ' Popup window timed out and was closed.',
    );
    OneSignalEvent.trigger(OneSignal.EVENTS.POPUP_WINDOW_TIMEOUT);
  }

  async onFinishingRegistrationRemotely(message: MessengerMessageEvent) {
    Log.debug(
      location.origin,
      SdkEnvironment.getWindowEnv().toString() +
        ' Finishing HTTP popup registration inside the iFrame, sent from popup.',
    );

    message.reply({ progress: true });

    const {
      rawPushSubscription,
    }: { rawPushSubscription: RawPushSubscription } = message.data;

    if (this.messenger) {
      this.messenger.stopPostMessageReceive();
    }

    const subscriptionManager: SubscriptionManager =
      OneSignal.context.subscriptionManager;
    await subscriptionManager.registerSubscription(rawPushSubscription);

    await EventHelper.checkAndTriggerSubscriptionChanged();
    await MainHelper.checkAndTriggerNotificationPermissionChanged();
  }

  onRemoteRetriggerEvent(message: MessengerMessageEvent) {
    // e.g. { eventName: 'subscriptionChange', eventData: true}
    const { eventName, eventData } = message.data as any;
    OneSignalEvent.trigger(eventName, eventData, message.source);
    return false;
  }

  /**
   * Shortcut method to messenger.message().
   */
  message() {
    if (this.messenger) {
      // eslint-disable-next-line prefer-spread, prefer-rest-params
      this.messenger.message.apply(this.messenger, arguments);
    }
  }
}
