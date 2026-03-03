import { decodeHtmlEntities } from 'src/shared/helpers/dom';
import { delay } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import AnimatedElement from './AnimatedElement';
import type Bell from './Bell';
import { type BellStateValue, BellState } from './constants';

const TIP_KEYS: Record<BellStateValue, keyof Bell['_options']['text'] | ''> = {
  [BellState._Unsubscribed]: 'tip.state.unsubscribed',
  [BellState._Subscribed]: 'tip.state.subscribed',
  [BellState._Blocked]: 'tip.state.blocked',
  [BellState._Uninitialized]: '',
};

export default class Message extends AnimatedElement {
  public _bell: Bell;
  public _contentType = '';
  public _queued: string[] = [];

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-message',
      'onesignal-bell-launcher-message-opened',
      undefined,
      undefined,
      '.onesignal-bell-launcher-message-body',
    );
    this._bell = bell;
  }

  async _display(type: string, content: string, duration = 0) {
    Log._debug(`Calling display(${type}, ${content}, ${duration}).`);
    if (this._shown) await this._hide();
    this._content = decodeHtmlEntities(content);
    this._contentType = type;
    await this._show();
    await delay(duration);
    await this._hide();
    this._content = this._getTipForState();
    this._contentType = 'tip';
  }

  _getTipForState(): string {
    const key = TIP_KEYS[this._bell._state];
    return key ? this._bell._options.text[key] : '';
  }

  async _enqueue(message: string) {
    this._queued.push(decodeHtmlEntities(message));
    const badge = this._bell._badge;
    if (badge._shown) {
      await badge._hide();
      badge._increment();
      await badge._show();
    } else {
      badge._increment();
      if (this._bell._initialized) await badge._show();
    }
  }

  async _dequeue(): Promise<string> {
    const message = this._queued.pop() ?? '';
    const badge = this._bell._badge;
    if (badge._shown) {
      await badge._hide();
      badge._decrement();
      if (badge._content.length > 0) await badge._show();
    } else {
      badge._decrement();
    }
    return message;
  }
}
