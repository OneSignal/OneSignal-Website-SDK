import { decodeHtmlEntities } from 'src/shared/helpers/dom';
import { delay, nothing } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import AnimatedElement from './AnimatedElement';
import type Bell from './Bell';
import { BellState } from './constants';

export default class Message extends AnimatedElement {
  public bell: Bell;
  public contentType: string;
  public queued: string[];

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
    if (this.bell.state === BellState._Unsubscribed)
      return this.bell.options.text['tip.state.unsubscribed'];
    else if (this.bell.state === BellState._Subscribed)
      return this.bell.options.text['tip.state.subscribed'];
    else if (this.bell.state === BellState._Blocked)
      return this.bell.options.text['tip.state.blocked'];
    return '';
  }

  enqueue(message: string) {
    this.queued.push(decodeHtmlEntities(message));
    return new Promise((resolve) => {
      if (this.bell.badge._shown) {
        this.bell.badge
          ._hide()
          .then(() => this.bell.badge._increment())
          .then(() => this.bell.badge._show())
          .then(resolve);
      } else {
        this.bell.badge._increment();
        if (this.bell.initialized) this.bell.badge._show().then(resolve);
        else resolve(undefined);
      }
    });
  }

  dequeue() {
    const dequeuedMessage = this.queued.pop();
    return new Promise((resolve) => {
      if (this.bell.badge._shown) {
        this.bell.badge
          ._hide()
          .then(() => {
            this.bell.badge._decrement();
            if (this.bell.badge._content.length > 0) {
              return this.bell.badge._show();
            }
            return Promise.resolve();
          })
          .then(() => resolve(dequeuedMessage));
      } else {
        this.bell.badge._decrement();
        resolve(dequeuedMessage);
      }
    });
  }
}
