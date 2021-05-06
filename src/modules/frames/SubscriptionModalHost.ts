

import Event from '../../Event';
import MainHelper from '../../helpers/MainHelper';
import SubscriptionHelper from '../../helpers/SubscriptionHelper';
import SdkEnvironment from '../../managers/SdkEnvironment';
import { MessengerMessageEvent } from '../../models/MessengerMessageEvent';
import Postmam from '../../Postmam';
import Log from '../../libraries/Log';

/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
export default class SubscriptionModalHost implements Disposable {
  private messenger: Postmam;
  private appId: string;
  private modal: HTMLIFrameElement;
  private url: URL;
  private registrationOptions: any;

  constructor(appId: string, registrationOptions: any) {
    this.appId = appId;
    this.registrationOptions = registrationOptions;
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
  async load(): Promise<void> {
    const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
    const notificationPermission = await OneSignal.getNotificationPermission();
    this.url = SdkEnvironment.getOneSignalApiUrl();
    this.url.pathname = 'webPushModal';
    this.url.search = `${MainHelper.getPromptOptionsQueryString()}&id=${this.appId}&httpsPrompt=true&pushEnabled=${isPushEnabled}&permissionBlocked=${(notificationPermission as any) === 'denied'}&promptType=modal`;
    Log.info(`Loading iFrame for HTTPS subscription modal at ${this.url.toString()}`);

    this.modal = this.createHiddenSubscriptionDomModal(this.url.toString());

    this.establishCrossOriginMessaging();
  }

  createHiddenSubscriptionDomModal(url) {
    const iframeContainer = document.createElement('div');
    iframeContainer.setAttribute('id', 'OneSignal-iframe-modal');
    iframeContainer.setAttribute('style', 'display:none !important');
    iframeContainer.innerHTML = '<div id="notif-permission" style="background: rgba(0, 0, 0, 0.7); position: fixed;' +
      ' top: 0; left: 0; right: 0; bottom: 0; z-index: 3000000000; display: flex;' +
      ' align-items: center; justify-content: center;"></div>';
    document.body.appendChild(iframeContainer);

    const iframeContainerStyle = document.createElement('style');
    iframeContainerStyle.innerHTML = `@media (max-width: 560px) { .OneSignal-permission-iframe { width: 100%; height: 100%;} }`;
    document.getElementsByTagName('head')[0].appendChild(iframeContainerStyle);

    const iframe = document.createElement("iframe");
    iframe.className = "OneSignal-permission-iframe";
    iframe.setAttribute('frameborder', '0');
    iframe.width = OneSignal._windowWidth.toString();
    iframe.height = OneSignal._windowHeight.toString();
    iframe.src = url;

    document.getElementById("notif-permission").appendChild(iframe);
    return iframe;
  }

  removeFrame() {
    const existingInstance = document.querySelector('#OneSignal-iframe-modal');
    if (existingInstance) {
      existingInstance.remove();
    }
  }

  showSubscriptionDomModal() {
    const iframeContainer = document.getElementById('OneSignal-iframe-modal');
    iframeContainer.setAttribute('style', '');
  }

  establishCrossOriginMessaging() {
    this.messenger = new Postmam(this.modal, this.url.origin, this.url.origin);
    this.messenger.startPostMessageReceive();

    this.messenger.once(OneSignal.POSTMAM_COMMANDS.MODAL_LOADED, this.onModalLoaded.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_ACCEPTED, this.onModalAccepted.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_REJECTED, this.onModalRejected.bind(this));
    this.messenger.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, this.onModalClosing.bind(this));
  }

  onModalLoaded(_: MessengerMessageEvent) {
    this.showSubscriptionDomModal();
    Event.trigger('modalLoaded');
  }

  async onModalAccepted(_: MessengerMessageEvent) {
    Log.debug('User accepted the HTTPS modal prompt.', location.origin);
    OneSignal._sessionInitAlreadyRunning = false;
    this.dispose();
    MainHelper.triggerCustomPromptClicked('granted');
    Log.debug('Calling setSubscription(true)');
    await SubscriptionHelper.registerForPush();
    await OneSignal.setSubscription(true);
  }

  onModalRejected(_: MessengerMessageEvent) {
    Log.debug('User rejected the HTTPS modal prompt.');
    OneSignal._sessionInitAlreadyRunning = false;
    this.dispose();
    MainHelper.triggerCustomPromptClicked('denied');
  }

  onModalClosing(_: MessengerMessageEvent) {
    Log.info('Detected modal is closing.');
    this.dispose();
  }

  dispose() {
    if (this.messenger) {
      // Removes all events
      this.messenger.destroy();
    }
    this.removeFrame();
  }

  /**
   * Shortcut method to messenger.message().
   */
  message() {
    this.messenger.message.apply(this.messenger, arguments);
  }
}
