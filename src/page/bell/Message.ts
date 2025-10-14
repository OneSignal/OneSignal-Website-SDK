import { decodeHtmlEntities } from 'src/shared/helpers/dom';
import { delay, nothing } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import AnimatedElement from './AnimatedElement';
import type Bell from './Bell';
import { BellState } from './constants';

export default class Message extends AnimatedElement {
  public _bell: Bell;
  public _contentType: string;
  public _queued: string[];

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-message',
      'onesignal-bell-launcher-message-opened',
      undefined,
      undefined,
      '.onesignal-bell-launcher-message-body',
    );

    this._bell = bell;
    this._contentType = '';
    this._queued = [];
  }

  _display(type: string, content: string, duration = 0) {
    Log._debug(`Calling display(${type}, ${content}, ${duration}).`);
    return (this._shown ? this._hide() : nothing())
      .then(() => {
        this._content = decodeHtmlEntities(content);
        this._contentType = type;
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
        this._content = this._getTipForState();
        this._contentType = 'tip';
      });
  }

  _getTipForState(): string {
    if (this._bell._state === BellState._Unsubscribed)
      return this._bell._options.text['tip.state.unsubscribed'];
    else if (this._bell._state === BellState._Subscribed)
      return this._bell._options.text['tip.state.subscribed'];
    else if (this._bell._state === BellState._Blocked)
      return this._bell._options.text['tip.state.blocked'];
    return '';
  }

  _enqueue(message: string) {
    this._queued.push(decodeHtmlEntities(message));
    return new Promise((resolve) => {
      if (this._bell._badge._shown) {
        this._bell._badge
          ._hide()
          .then(() => this._bell._badge._increment())
          .then(() => this._bell._badge._show())
          .then(resolve);
      } else {
        this._bell._badge._increment();
        if (this._bell._initialized) this._bell._badge._show().then(resolve);
        else resolve(undefined);
      }
    });
  }

  _dequeue() {
    const dequeuedMessage = this._queued.pop();
    return new Promise((resolve) => {
      if (this._bell._badge._shown) {
        this._bell._badge
          ._hide()
          .then(() => {
            this._bell._badge._decrement();
            if (this._bell._badge._content.length > 0) {
              return this._bell._badge._show();
            }
            return Promise.resolve(this);
          })
          .then(() => resolve(dequeuedMessage));
      } else {
        this._bell._badge._decrement();
        resolve(dequeuedMessage);
      }
    });
  }
}
