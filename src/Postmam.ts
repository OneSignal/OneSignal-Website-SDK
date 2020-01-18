

import Environment from './Environment';
import SdkEnvironment from './managers/SdkEnvironment';
import Emitter from './libraries/Emitter';
import Log from './libraries/Log';
import { Utils } from "./context/shared/utils/Utils";
import { OneSignalUtils } from "./utils/OneSignalUtils";

/**
 * Establishes a cross-domain MessageChannel between the current browsing context (this page) and another (an iFrame, popup, or parent page).
 */
export default class Postmam {

  static get HANDSHAKE_MESSAGE() {
    return "onesignal.postmam.handshake";
  }

  static get CONNECTED_MESSAGE() {
    return "onesignal.postmam.connected";
  }

  public emitter: Emitter;
  public channel: MessageChannel;
  public messagePort: MessagePort;
  public isListening: boolean;
  public isConnected: boolean;
  public replies: any;

  /**
   * Initializes Postmam with settings but does not establish a connection a channel or set up any message listeners.
   * @param windowReference The window to postMessage() the initial MessageChannel port to.
   * @param sendToOrigin The origin that will receive the initial postMessage with the transferred message channel port object.
   * @param receiveFromOrigin The origin to allow incoming messages from. If messages do not come from this origin they will be discarded. Only affects the initial handshake.
   * @remarks The initiating (client) page must call this after the page has been loaded so that the other page has a chance to receive the initial handshake message. The receiving (server) page must set up a message listener to catch the initial handshake message.
   */
  constructor(public windowReference: any,
              public sendToOrigin: string,
              public receiveFromOrigin: string) {
    if (!window || !window.postMessage) {
      throw new Error('Must pass in a valid window reference supporting postMessage():' + windowReference);
    }
    if (!sendToOrigin || !receiveFromOrigin) {
      throw new Error('Invalid origin. Must be set.');
    }
    this.emitter = new Emitter();
    this.channel = new MessageChannel();
    this.messagePort = null;
    this.isListening = false;
    this.isConnected = false;
    this.replies = {};
  }

  /**
   * Opens a message event listener to listen for a Postmam handshake from another browsing context. This listener is closed as soon as the connection is established.
   */
  listen() {
    Log.debug('(Postmam) Called listen().');
    if (this.isListening) {
      Log.debug('(Postmam) Already listening for Postmam connections.');
      return;
    }
    if (!Environment.isBrowser()) {
      return;
    }
    this.isListening = true;
    Log.debug('(Postmam) Listening for Postmam connections.', this);
    // One of the messages will contain our MessageChannel port
    window.addEventListener('message', this.onWindowMessagePostmanConnectReceived.bind(this));
  }

  startPostMessageReceive() {
    window.addEventListener('message', this.onWindowPostMessageReceived.bind(this));
  }

  stopPostMessageReceive() {
    window.removeEventListener('message', this.onWindowPostMessageReceived);
  }

  destroy() {
    this.stopPostMessageReceive();
    this.emitter.removeAllListeners();
  }

  onWindowPostMessageReceived(e) {
    // Discard messages from unexpected origins; messages come frequently from other origins
    if (!this.isSafeOrigin(e.origin)) {
      // Log.debug(`(Postmam) Discarding message because ${e.origin} is not an allowed origin:`, e.data);
      return;
    }
    //Log.debug(`(Postmam) (onWindowPostMessageReceived) (${SdkEnvironment.getWindowEnv().toString()}):`, e);
    let { id: messageId, command: messageCommand, data: messageData, source: messageSource } = e.data;
    if (messageCommand === Postmam.CONNECTED_MESSAGE) {
      this.emitter.emit('connect');
      this.isConnected = true;
      return;
    }
    let messageBundle = {
      id: messageId,
      command: messageCommand,
      data: messageData,
      source: messageSource
    };
    let messageBundleWithReply = {
      reply: this.reply.bind(this, messageBundle),
      ...messageBundle
    };
    if (this.replies.hasOwnProperty(messageId)) {
      Log.info('(Postmam) This message is a reply.');
      let replyFn = this.replies[messageId].bind(window);
      let replyFnReturnValue = replyFn(messageBundleWithReply);
      if (replyFnReturnValue === false) {
        delete this.replies[messageId];
      }
    } else {
      this.emitter.emit(messageCommand, messageBundleWithReply);
    }
  }

  onWindowMessagePostmanConnectReceived(e) {
    const env = SdkEnvironment.getWindowEnv().toString();
    Log.debug(`(Postmam) (${env}) Window postmessage for Postman connect received:`, e);
    // Discard messages from unexpected origins; messages come frequently from other origins
    if (!this.isSafeOrigin(e.origin)) {
      // Log.debug(`(Postmam) Discarding message because ${e.origin} is not an allowed origin:`, e.data)
      return;
    }
    var { handshake } = e.data;
    if (handshake !== Postmam.HANDSHAKE_MESSAGE) {
      Log.info('(Postmam) Got a postmam message, but not our expected handshake:', e.data);
      // This was not our expected handshake message
      return;
    } else {
      Log.info('(Postmam) Got our expected Postmam handshake message (and connecting...):', e.data);
      // This was our expected handshake message
      // Remove our message handler so we don't get spammed with cross-domain messages
      window.removeEventListener('message', this.onWindowMessagePostmanConnectReceived);
      // Get the message port
      this.messagePort = e.ports[0];
      this.messagePort.addEventListener('message', this.onMessageReceived.bind(this), false);
      Log.info(
        '(Postmam) Removed previous message event listener for handshakes, replaced with main message listener.');
      this.messagePort.start();
      this.isConnected = true;
      Log.info(`(Postmam) (${env}) Connected.`);
      this.message(Postmam.CONNECTED_MESSAGE);
      this.emitter.emit('connect');
    }
  }

  /**
   * Establishes a message channel with a listening Postmam on another browsing context.
   * @remarks Only call this if listen() is called on another page.
   */
  connect() {
    Log.info(`(Postmam) (${SdkEnvironment.getWindowEnv().toString()}) Establishing a connection to ${this.sendToOrigin}.`);
    this.messagePort = this.channel.port1;
    this.messagePort.addEventListener('message', this.onMessageReceived.bind(this), false);
    this.messagePort.start();
    this.windowReference.postMessage({
      handshake: Postmam.HANDSHAKE_MESSAGE
    }, this.sendToOrigin, [this.channel.port2]);
  }

  onMessageReceived(e) {
    //Log.debug(`(Postmam) (${SdkEnvironment.getWindowEnv().toString()}):`, e.data);
    if (!e.data) {
      Log.debug(`(${SdkEnvironment.getWindowEnv().toString()}) Received an empty Postmam message:`, e);
      return;
    }
    let { id: messageId, command: messageCommand, data: messageData, source: messageSource } = e.data;
    if (messageCommand === Postmam.CONNECTED_MESSAGE) {
      this.emitter.emit('connect');
      this.isConnected = true;
      return;
    }
    let messageBundle = {
      id: messageId,
      command: messageCommand,
      data: messageData,
      source: messageSource
    };
    let messageBundleWithReply = {
      reply: this.reply.bind(this, messageBundle),
      ...messageBundle
    };
    if (this.replies.hasOwnProperty(messageId)) {
      let replyFn = this.replies[messageId].bind(window);
      let replyFnReturnValue = replyFn(messageBundleWithReply);
      if (replyFnReturnValue === false) {
        delete this.replies[messageId];
      }
    } else {
      this.emitter.emit(messageCommand, messageBundleWithReply);
    }
  }

  reply(originalMessageBundle, data, onReply) {
    const messageBundle = {
      id: originalMessageBundle.id,
      command: originalMessageBundle.command,
      data: data,
      source: SdkEnvironment.getWindowEnv().toString(),
      isReply: true
    };
    if (typeof onReply === 'function') {
      this.replies[messageBundle.id] = onReply;
    }
    this.messagePort.postMessage(messageBundle);
  }

  /**
   * Sends via window.postMessage.
   */
  postMessage(command, data, onReply?) {
    if (!command || command == '') {
      throw new Error("(Postmam) Postmam command must not be empty.");
    }
    if (typeof data === 'function') {
      Log.debug('You passed a function to data, did you mean to pass null?');
      return;
    }
    const messageBundle = {
      id: OneSignalUtils.getRandomUuid(),
      command: command,
      data: data,
      source: SdkEnvironment.getWindowEnv().toString()
    };
    if (typeof onReply === 'function') {
      this.replies[messageBundle.id] = onReply;
    }
    this.windowReference.postMessage(messageBundle, '*');
  }

  /**
   * Sends via MessageChannel.port.postMessage
   */
  message(command, data?, onReply?) {
    if (!command || command == '') {
      throw new Error("(Postmam) Postmam command must not be empty.");
    }
    if (typeof data === 'function') {
      Log.debug('You passed a function to data, did you mean to pass null?')
      return;
    }
    const messageBundle = {
      id: OneSignalUtils.getRandomUuid(),
      command: command,
      data: data,
      source: SdkEnvironment.getWindowEnv().toString()
    };
    if (typeof onReply === 'function') {
      this.replies[messageBundle.id] = onReply;
    }
    this.messagePort.postMessage(messageBundle);
  }

  /**
   * If the provided Site URL on the dashboard, which restricts the post message origin, uses the https:// protocol
   * Then relax the postMessage restriction to also allow the http:// protocol for the same domain.
   */
  generateSafeOrigins(inputOrigin: string) {
    // Trims trailing slashes and other undesirable artifacts
    const safeOrigins = [];
    try {
      const url = new URL(inputOrigin);
      let reducedHost = url.host;
      if (url.host.indexOf('www.') === 0) {
        reducedHost = url.host.replace('www.', '');
      }
      if (url.protocol === 'https:') {
        safeOrigins.push(`https://${reducedHost}`);
        safeOrigins.push(`https://www.${reducedHost}`);
      }
      else if (url.protocol === 'http:') {
        safeOrigins.push(`http://${reducedHost}`);
        safeOrigins.push(`http://www.${reducedHost}`);
        safeOrigins.push(`https://${reducedHost}`);
        safeOrigins.push(`https://www.${reducedHost}`);
      }
    } catch (ex) {
      // Invalid URL: Users can enter '*' or 'https://*.google.com' which is invalid.
    }
    return safeOrigins;
  }

  isSafeOrigin(messageOrigin) {
    if (!OneSignal.config) {
      var subdomain = "x";
    } else {
      var subdomain = OneSignal.config.subdomain as string;
    }

    const otherAllowedOrigins = this.generateSafeOrigins(this.receiveFromOrigin);

    return (// messageOrigin === '' || TODO: See if messageOrigin can be blank
            messageOrigin === 'https://onesignal.com' ||
            messageOrigin === `https://${subdomain || ''}.onesignal.com` ||
            messageOrigin === `https://${subdomain || ''}.os.tc` ||
            messageOrigin === `https://${subdomain || ''}.os.tc:3001` ||
            (messageOrigin === SdkEnvironment.getOneSignalApiUrl().origin) ||
            this.receiveFromOrigin === '*' ||
            Utils.contains(otherAllowedOrigins, messageOrigin));
  }

  async on(...args: any[]) {
    return this.emitter.on.apply(this.emitter, args);
  }
  async off(...args: any[]) {
    return this.emitter.off.apply(this.emitter, args);
  }
  async once(...args: any[]) {
    return this.emitter.once.apply(this.emitter, args);
  }
}
