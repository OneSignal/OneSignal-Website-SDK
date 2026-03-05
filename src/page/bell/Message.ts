import { decodeHtmlEntities } from 'src/shared/helpers/dom';
import { delay } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import type Bell from './Bell';
import { type BellStateValue, BellState } from './constants';

const TIP_KEYS: Record<BellStateValue, keyof Bell['_options']['text'] | ''> = {
  [BellState._Unsubscribed]: 'tip.state.unsubscribed',
  [BellState._Subscribed]: 'tip.state.subscribed',
  [BellState._Blocked]: 'tip.state.blocked',
  [BellState._Uninitialized]: '',
};

export default class Message {
  public _bell: Bell;
  public _contentType = '';
  public _selector = '.onesignal-bell-launcher-message';

  constructor(bell: Bell) {
    this._bell = bell;
  }

  get _element(): HTMLElement | null {
    return document.querySelector(this._selector);
  }

  get _content(): string {
    return (
      this._element?.querySelector('.onesignal-bell-launcher-message-body')
        ?.textContent ?? ''
    );
  }

  set _content(value: string) {
    const body = this._element?.querySelector(
      '.onesignal-bell-launcher-message-body',
    );
    if (body) body.textContent = value;
  }

  get _shown(): boolean {
    return (
      this._element?.classList.contains(
        'onesignal-bell-launcher-message-opened',
      ) ?? false
    );
  }

  _show(): void {
    const el = this._element;
    if (!el || this._shown) return;
    el.classList.add('onesignal-bell-launcher-message-opened');
  }

  _hide(): void {
    const el = this._element;
    if (!el || !this._shown) return;
    el.classList.remove('onesignal-bell-launcher-message-opened');
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
}
