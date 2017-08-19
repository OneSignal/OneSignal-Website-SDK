import * as log from 'loglevel';

import { decodeHtmlEntities, delay, getConsoleStyle, nothing } from '../utils';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';


export default class Message extends AnimatedElement {

  public bell: any;
  public contentType: string;
  public queued: any;

  constructor(bell) {
    super('.onesignal-bell-launcher-message', 'onesignal-bell-launcher-message-opened', null, 'hidden', ['opacity', 'transform'], '.onesignal-bell-launcher-message-body');

    this.bell = bell;
    this.contentType = '';
    this.queued = [];
  }

  static get TIMEOUT() {
    return 2500;
  }

  static get TYPES() {
    return {
      TIP: 'tip', // Appears on button hover, disappears on button endhover
      MESSAGE: 'message', // Appears manually for a specified duration, site visitor cannot control its display. Messages override tips
      QUEUED: 'queued' // This message was a user-queued message
    };
  }

  display(type, content, duration = 0) {
    log.debug(`Calling %cdisplay(${type}, ${content}, ${duration}).`, getConsoleStyle('code'));
    return (this.shown ? this.hide() : nothing())
      .then(() => {
        this.content = decodeHtmlEntities(content);
        this.contentType = type;
      })
      .then(() => {
        return this.show();
      })
      .then(() => delay(duration))
      .then(() => {
        return this.hide();
      })
      .then(() => {
        // Reset back to normal content type so stuff can show a gain
        this.content = this.getTipForState();
        this.contentType = 'tip';
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

  enqueue(message) {
    this.queued.push(decodeHtmlEntities(message));
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
          .then((numMessagesLeft) => {
            if (numMessagesLeft > 0) {
              return this.bell.badge.show()
            } else {
              return Promise.resolve(this);
            }
          })
          .then(resolve(dequeuedMessage));
      } else {
        this.bell.badge.decrement();
        resolve(dequeuedMessage);
      }
    });
  }
}
