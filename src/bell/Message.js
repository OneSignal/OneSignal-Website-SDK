import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, addCssClass, removeCssClass, once, delay, when, nothing } from '../utils.js';
import log from 'loglevel';
import Event from '../events.js';
import AnimatedElement from './AnimatedElement.js';
import Bell from './bell.js';


export default class Message extends AnimatedElement {

  constructor(bell) {
    super('.onesignal-bell-launcher-message', 'onesignal-bell-launcher-message-opened', null, 'hidden', 'opacity', '.onesignal-bell-launcher-message-body');

    this.bell = bell;
    this.contentType = '';
    this.queued = [];
  }

  static get TYPES() {
    return {
      TIP: 'tip', // Appears on button hover, disappears on button endhover
      MESSAGE: 'message', // Appears manually for a specified duration, site visitor cannot control its display. Messages override tips
      QUEUED: 'queued' // This message was a user-queued message
    };
  }

  display(type, content, duration = 0) {
    return new Promise((resolve, reject) => {
      this.shown ? this.hide() : nothing()
        .then(() => {
          this.content = content;
          this.contentType = type;
        })
        .then(() => this.show())
        .then(() => delay(duration))
        .then(() => this.hide())
        .then(() => {
          // Reset back to normal content type so stuff can show a gain
          this.content = this.getTipForState();
          this.contentType = 'tip';
        })
        .then(resolve)
        .catch((e) => log.error(e));
    });
  }

  getTipForState() {
    if (this.bell.state === Bell.STATES.UNSUBSCRIBED)
      return this.bell.text['tip.state.unsubscribed'];
    else if (this.bell.state === Bell.STATES.SUBSCRIBED)
      return this.bell.text['tip.state.subscribed'];
    else if (this.bell.state === Bell.STATES.BLOCKED)
      return this.bell.text['tip.state.blocked'];
  }

  enqueue(message, notify = false) {
    this.queued.push(message);
    return new Promise((resolve) => {
      if (this.bell.badge.shown) {
        this.bell.badge.hide()
          .then(() => this.bell.badge.increment())
          .then(() => this.bell.badge.show())
          .then(resolve);
      } else {
        this.bell.badge.increment();
        if (this.bell.initialized)
          this.bell.badge.show().then(resolve)
        else resolve();
      }
    });
  }

  dequeue(message) {
    let dequeuedMessage = this.queued.pop(message);
    return new Promise((resolve) => {
      if (this.bell.badge.shown) {
        this.bell.badge.hide()
          .then(() => this.bell.badge.decrement())
          .then(() => this.bell.badge.show())
          .then(resolve(dequeuedMessage));
      } else {
        this.bell.badge.decrement();
        resolve(dequeuedMessage);
      }
    });
  }
}