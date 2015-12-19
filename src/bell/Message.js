import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, addCssClass, removeCssClass, once, delay, when, nothing } from '../utils.js';
import log from 'loglevel';
import Event from '../events.js';
import AnimatedElement from './AnimatedElement.js';


export default class Message extends AnimatedElement {

  constructor(bell) {
    super('.onesignal-bell-launcher-message', 'onesignal-bell-launcher-message-opened', null, 'hidden', 'opacity', '.onesignal-bell-launcher-message-body');

    this.bell = bell;
  }

  display(content, hideAfter = 0) {
    return new Promise((resolve) => {
      this.shown ? this.hide() : nothing()
        .then(() => this.content = content)
        .then(() => this.show())
        .then(() => delay(hideAfter))
        .then(() => this.hide())
        .then(resolve)
        .catch((e) => log.error(e));
    });
  }

  enqueue(message, notify = false) {
    this.bell.messages.queued.push(message);
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
    let dequeuedMessage = this.bell.messages.queued.pop(message);
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