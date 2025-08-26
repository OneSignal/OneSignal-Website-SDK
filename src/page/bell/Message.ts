import { decodeHtmlEntities } from 'src/shared/helpers/dom';
import { delay, nothing } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';

export default class Message extends AnimatedElement {
  public bell: Bell;
  public contentType: string;
  public queued: string[];

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-message',
      'onesignal-bell-launcher-message-opened',
      undefined,
      'hidden',
      ['opacity', 'transform'],
      '.onesignal-bell-launcher-message-body',
    );

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
      QUEUED: 'queued', // This message was a user-queued message
    };
  }

  display(type: string, content: string, duration = 0) {
    Log.debug(`Calling display(${type}, ${content}, ${duration}).`);
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

  getTipForState(): string {
    if (this.bell._state === Bell._STATES.UNSUBSCRIBED)
      return this.bell._options.text['tip.state.unsubscribed'];
    else if (this.bell._state === Bell._STATES.SUBSCRIBED)
      return this.bell._options.text['tip.state.subscribed'];
    else if (this.bell._state === Bell._STATES.BLOCKED)
      return this.bell._options.text['tip.state.blocked'];
    return '';
  }

  enqueue(message: string) {
    this.queued.push(decodeHtmlEntities(message));
    return new Promise<void>((resolve) => {
      if (this.bell.__badge.shown) {
        this.bell.__badge
          .hide()
          .then(() => this.bell.__badge.increment())
          .then(() => this.bell.__badge.show())
          .then(() => resolve());
      } else {
        this.bell.__badge.increment();
        if (this.bell._initialized)
          this.bell.__badge.show().then(() => resolve());
        else resolve();
      }
    });
  }

  dequeue() {
    const dequeuedMessage = this.queued.pop();
    return new Promise((resolve) => {
      if (this.bell.__badge.shown) {
        this.bell.__badge
          .hide()
          .then(() => this.bell.__badge.decrement())
          .then(() => {
            const numMessagesLeft = Number(this.bell.__badge.content) || 0;
            if (numMessagesLeft > 0) {
              return this.bell.__badge.show();
            } else {
              return Promise.resolve(this);
            }
          })
          .then(() => resolve(dequeuedMessage));
      } else {
        this.bell.__badge.decrement();
        resolve(dequeuedMessage);
      }
    });
  }
}
