import Environment from '../../Environment';
import Event from '../../Event';
import { MessengerMessageEvent } from '../../models/MessengerMessageEvent';
import Postmam from '../../Postmam';
import { timeoutPromise, triggerNotificationPermissionChanged } from '../../utils';
import { ServiceWorkerActiveState } from "../../helpers/ServiceWorkerHelper";
import Log from '../../libraries/Log';
import { PageVisibilityRequest } from "../../service-worker/types";

interface Reply {
  data: any;
}
/**
 * Manager for an instance of the OneSignal proxy frame, for use from the main
 * page (not the iFrame itself).
 *
 * This is loaded as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
export default class ProxyFrameHost implements Disposable {

  public url: URL;
  private element: HTMLIFrameElement;
  private messenger: Postmam;

  // Promise to track whether the frame has finished loading
  private loadPromise: {
    promise: Promise<void>,
    resolver: Function,
    rejector: Function
  }

  /**
   * How long to wait to load the proxy frame before timing out.
   */
  static get LOAD_TIMEOUT_MS() {
    return 15000;
  }

  /**
   *
   * @param origin The URL object describing the origin to load.
   */
  constructor(origin: URL) {
    this.url = origin;
    this.url.pathname = 'webPushIframe';
  }

  /**
   * Creates and loads an iFrame on the DOM, replacing any existing iFrame of
   * the same URL.
   *
   * Rejects with a TimeoutError if the frame doesn't load within a specified time.
   */
  async load(): Promise<void> {
    /*
      This class removes existing iFrames with the same URL. This prevents
      multiple iFrames to the same origin, which can cause issues with
      cross-origin messaging.
    */
    Log.debug('Opening an iFrame to', this.url.toString());
    this.removeFrame();

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = this.url.toString();
    (iframe as any).sandbox = 'allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation';
    (this as any).loadPromise = {};
    (this as any).loadPromise.promise = new Promise((resolve, reject) => {
        this.loadPromise.resolver = resolve;
        this.loadPromise.rejector = reject;
    });
    document.body.appendChild(iframe);
    iframe.onload = this.onFrameLoad.bind(this);

    this.element = iframe;
    // Display a timeout warning if frame doesn't load in time, but don't prevent it from loading if the network is just slow
    timeoutPromise(this.loadPromise.promise, ProxyFrameHost.LOAD_TIMEOUT_MS).catch(() => {
      if (window === window.top) {
        Log.warn(`OneSignal: Loading the required iFrame ${this.url.toString()} timed out. Check that the Site URL onesignal.com dashboard web config is ${location.origin}. Only the Site URL specified there is allowed to use load the iFrame.`);
      }
    });
    return this.loadPromise.promise;
  }

  removeFrame() {
    if (!Environment.isBrowser())
      return;

    const existingInstance = document.querySelector(`iframe[src='${this.url.toString()}']`);
    if (existingInstance)
      existingInstance.remove();
  }

  onFrameLoad(_: UIEvent): void {
    this.establishCrossOriginMessaging();
  }

  establishCrossOriginMessaging() {
    if (this.messenger) {
      // Remove all previous events; window message events should not go to any previous listeners
      this.messenger.destroy();
    }
    this.messenger = new Postmam(this.element.contentWindow, this.url.toString(), this.url.toString());
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.CONNECTED, this.onMessengerConnect.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, this.onRemoteRetriggerEvent.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, this.onRemoteNotificationPermissionChanged.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REQUEST_HOST_URL, this.onRequestHostUrl.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.SERVICEWORKER_COMMAND_REDIRECT, this.onServiceWorkerCommandRedirect.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.GET_EVENT_LISTENER_COUNT, this.onGetEventListenerCount.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.ARE_YOU_VISIBLE_REQUEST, this.onAreYouVisibleRequest.bind(this));
    this.messenger.connect();
  }

  dispose() {
    // Removes all events
    if (this.messenger) {
      this.messenger.destroy();
    }
    this.removeFrame();
  }

  async onMessengerConnect(_: MessengerMessageEvent) {
    Log.debug(`Successfully established cross-origin communication for iFrame at ${this.url.toString()}`);

    this.messenger.message(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, {
      hostInitOptions: JSON.parse(JSON.stringify(OneSignal.config)), // Removes functions and unmessageable objects
      pageUrl: window.location.href,
      pageTitle: document.title,
    }, (reply: Reply) => {
      if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
        this.loadPromise.resolver();
        // This needs to be initialized so that isSubscribed() can be called to
        // determine whether the user is subscribed to Frame A or B
        //Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
      }
      return false;
    });
  }

  onRemoteRetriggerEvent(message: MessengerMessageEvent) {
    // e.g. { eventName: 'subscriptionChange', eventData: true}
    let {eventName, eventData} = (message.data as any);
    Event.trigger(eventName, eventData, message.source);
    return false;
  }

  onRemoteNotificationPermissionChanged(message: MessengerMessageEvent) {
    let {forceUpdatePermission} = (message.data as any);
    triggerNotificationPermissionChanged(forceUpdatePermission);
    return false;
  }

  onRequestHostUrl(message: MessengerMessageEvent) {
    message.reply(location.href);
    return false;
  }

  onServiceWorkerCommandRedirect(message: MessengerMessageEvent) {
    const url = (message.data as any);
    if (url && url.startsWith("http")) {
      window.location.href = url;
    }
    return false;
  }

  onGetEventListenerCount(message: MessengerMessageEvent) {
    const eventName: string = message.data;
    Log.debug('(Reposted from iFrame -> Host) Getting event listener count for ', eventName);
    message.reply(OneSignal.emitter.numberOfListeners(eventName));
    return false;
  }

  isSubscribed(): Promise<boolean> {
    return new Promise(resolve => {
      this.messenger.message(OneSignal.POSTMAM_COMMANDS.IS_SUBSCRIBED, null, (reply: Reply) => {
        resolve(reply.data);
      });
    });
  }

  unsubscribeFromPush(): Promise<void> {
    return new Promise<void>(resolve => {
      this.messenger.message(
        OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_PROXY_FRAME, null,
        (_reply: Reply) => { resolve(); });
    });
  }

  getProxyServiceWorkerActiveState() {
    return new Promise<ServiceWorkerActiveState>((resolve, reject) => {
      this.message(OneSignal.POSTMAM_COMMANDS.SERVICE_WORKER_STATE, null, (reply: Reply) => {
        resolve(reply.data);
      });
    });
  }

  async runCommand<T>(command: string, payload: any = null): Promise<T> {
    const result = await new Promise<T>((resolve, _reject) => {
      this.message(command, payload, (reply: Reply) => {
        resolve(reply.data as T);
      });
    });
    return result;
  }

  onAreYouVisibleRequest(event: {data: PageVisibilityRequest}) {
    Log.debug("onAreYouVisibleRequest page", event)
    const response = {
      timestamp: event.data.timestamp,
      focused: document.hasFocus(),
    };
    this.message(OneSignal.POSTMAM_COMMANDS.ARE_YOU_VISIBLE_RESPONSE, response);
  }

  /**
   * Shortcut method to messenger.message().
   */
  message(..._) {
    this.messenger.message.apply(this.messenger, arguments);
  }
}
