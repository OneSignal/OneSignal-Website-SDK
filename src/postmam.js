import { guid } from './utils.js';
import EventEmitter from 'wolfy87-eventemitter';
import heir from 'heir';
import Environment from './environment.js';
import { DEV_FRAME_HOST } from './vars.js';
import objectAssign from 'object-assign';


/**
 * Establishes a cross-domain MessageChannel between the current browsing context (this page) and another (an iFrame, popup, or parent page).
 */
export default class Postmam {

  static get HANDSHAKE_MESSAGE() {
    return "onesignal.postmam.handshake";
  }

  /**
   * Initializes Postmam with settings but does not establish a channel or set up any message listeners.
   * @param windowReference The window to postMessage() the initial MessageChannel port to.
   * @param sendToOrigin The origin that will receive the initial postMessage with the transferred message channel port object.
   * @param receiveFromOrigin The origin to allow incoming messages from. If messages do not come from this origin they will be discarded. Only affects the initial handshake.
   * @param handshakeNonce A value sent via URL query params when creating an iFrame or popup to ensure a handshake message is coming from the expected source.
   * @remarks The initiating (client) page must call this after the page has been loaded so that the other page has a chance to receive the initial handshake message. The receiving (server) page must set up a message listener to catch the initial handshake message.
   */
  constructor(windowReference, sendToOrigin, receiveFromOrigin, handshakeNonce) {
    if (!window || !window.postMessage) {
      throw new Error('Must pass in a valid window reference supporting postMessage().', windowReference);
    }
    if (!sendToOrigin || !receiveFromOrigin) {
      throw new Error('Invalid origin. Must be set.');
    }
    if (!handshakeNonce) {
      throw new Error('Missing handshake nonce.');
    }
    this.windowReference = windowReference;
    this.sendToOrigin = sendToOrigin;
    this.receiveFromOrigin = receiveFromOrigin;
    this.handshakeNonce = handshakeNonce;
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
    if (this.isListening) {
      log.warn('Already listening for Postmam connections.');
      return;
    }
    if (!Environment.isBrowser()) {
      return;
    }
    // One of the messages will contain our MessageChannel port
    window.addEventListener('message', this.onWindowMessageReceived);
  }

  onWindowMessageReceived(e) {
    // Discard messages from unexpected origins; messages come frequently from other origins
    if (!this.isSafeOrigin(e.origin)) {
      return;
    }
    var { handshake, nonce } = e.data;
    if (handshake !== Postmam.HANDSHAKE_MESSAGE || nonce !== this.handshakeNonce) {
      // This was not our expected handshake message
      return;
    }
    // This was our expected handshake message
    // Remove our message handler so we don't get spammed with cross-domain messages
    window.removeEventListener('message', this.onWindowMessageReceived);
    // Get the message port
    this.messagePort = e.ports[0];
    this.messagePort.addEventListener('message', onMessageReceived, false);
    this.messagePort.start();
    this.isConnected = true;
  }

  /**
   * Establishes a message channel with a listening Postmam on another browsing context.
   * @remarks Only call this if listen() is called on another page.
   */
  connect() {
    log.info(`Establishing a connection to ${sendToOrigin}.`);
    this.messagePort = this.messageChannel.port1;
    this.messagePort.addEventListener('message', onMessageReceived, false);
    this.messagePort.start();
    windowReference.postMessage(Postmam.HANDSHAKE_MESSAGE, sendToOrigin, [this.messageChannel.port2]);
  }

  onMessageReceived(e) {
    log.info('Postmam:', e.data);
    let { command: messageCommand, data: messageData, source: messageSource } = e.data;
    Postmam.emit(messageCommand, {
      command: messageCommand,
      data: messageData,
      source: messageSource
    });
  }

  message(command, data, onReply) {
    if (!command || command == '') {
      throw new Error("Postmam command must not be empty.");
    }
    const messageBundle = {
      command: command,
      data: data,
      source: Environment.getEnv()
    };
    if (typeof onReply === 'function') {
      const messageId = guid();
      objectAssign(messageBundle, {
        id: messageId
      });
      this.replies[messageId] = onReply;
    }
    this.messageport.postMessage(data);
  }

  isSafeOrigin(messageOrigin) {
    return (// messageOrigin === '' || TODO: See if messageOrigin can be blank
            messageOrigin === 'https://onesignal.com' ||
            messageOrigin === `https://${OneSignal._initOptions.subdomainName || ''}.onesignal.com` ||
            (__DEV__ && messageOrigin === DEV_FRAME_HOST));
  }
}

heir.merge(Postmam, new EventEmitter());