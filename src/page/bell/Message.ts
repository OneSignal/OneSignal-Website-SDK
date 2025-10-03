import { decodeHtmlEntities } from 'src/shared/helpers/dom';
import { delay, nothing } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';

export default class Message extends AnimatedElement {
  public bell: Bell;
  public contentType: string;
  public queued: any;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-message',
      'onesignal-bell-launcher-message-opened',
      undefined,
      undefined,
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
    Log._debug(`Calling display(${type}, ${content}, ${duration}).`);
    return (this._shown ? this._hide() : nothing())
      .then(() => {
        this._content = decodeHtmlEntities(content);
        this.contentType = type;
      })
      .then(() => {
        return this._show();
      })
      .then(() => delay(duration))
      .then(() => {
        return this._hide();
      })
      .then(() => {
        // Reset back to normal content type so stuff can show a gain
        this._content = this.getTipForState();
        this.contentType = 'tip';
      });
  }

  getTipForState(): string {
    if (this.bell._state === Bell._STATES._UNSUBSCRIBED)
      return this.bell._options.text['tip.state.unsubscribed'];
    else if (this.bell._state === Bell._STATES._SUBSCRIBED)
      return this.bell._options.text['tip.state.subscribed'];
    else if (this.bell._state === Bell._STATES._BLOCKED)
      return this.bell._options.text['tip.state.blocked'];
    return '';
  }

  enqueue(message: string) {
    this.queued.push(decodeHtmlEntities(message));
    return new Promise<void>((resolve) => {
      if (this.bell._badge.shown) {
        this.bell._badge
          .hide()
          .then(() => this.bell._badge.increment())
          .then(() => this.bell._badge.show())
          .then(resolve);
      } else {
        this.bell._badge.increment();
        if (this.bell._initialized) this.bell._badge.show().then(resolve);
        else resolve();
      }
    });
  }

  dequeue(message: string) {
    const dequeuedMessage = this.queued.pop(message);
    return new Promise((resolve) => {
      if (this.bell._badge.shown) {
        this.bell._badge
          .hide()
          .then(() => this.bell._badge.decrement())
          .then((numMessagesLeft: number) => {
            if (numMessagesLeft > 0) {
              return this.bell._badge.show();
            } else {
              return Promise.resolve(this);
            }
          })
          .then(resolve(dequeuedMessage));
      } else {
        this.bell._badge.decrement();
        resolve(dequeuedMessage);
      }
    });
  }
}
