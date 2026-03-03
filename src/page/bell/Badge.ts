import { waitForAnimations } from 'src/shared/helpers/dom';

export default class Badge {
  public _selector = '.onesignal-bell-launcher-badge';

  get _element(): HTMLElement | null {
    return document.querySelector(this._selector);
  }

  get _content(): string {
    return this._element?.textContent ?? '';
  }

  set _content(value: string) {
    const el = this._element;
    if (el) el.textContent = value;
  }

  get _shown(): boolean {
    return this._element?.classList.contains('onesignal-bell-launcher-badge-opened') ?? false;
  }

  async _show() {
    const el = this._element;
    if (!el || this._shown) return;
    el.classList.add('onesignal-bell-launcher-badge-opened');
    await waitForAnimations(el);
    OneSignal._notifyButton?._setCustomColorsIfSpecified();
  }

  async _hide() {
    const el = this._element;
    if (!el || !this._shown) return;
    el.classList.remove('onesignal-bell-launcher-badge-opened');
    await waitForAnimations(el);
  }

  _updateCount(delta: number): void {
    const num = Number(this._content);
    if (!Number.isNaN(num)) {
      const newNum = num + delta;
      this._content = newNum > 0 ? newNum.toString() : '';
    }
  }

  _increment(): void {
    this._updateCount(1);
  }

  _decrement(): void {
    this._updateCount(-1);
  }
}
