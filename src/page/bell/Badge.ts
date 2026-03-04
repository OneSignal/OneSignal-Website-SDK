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
    return (
      this._element?.classList.contains(
        'onesignal-bell-launcher-badge-opened',
      ) ?? false
    );
  }

  _show(): void {
    const el = this._element;
    if (!el || this._shown) return;
    el.classList.add('onesignal-bell-launcher-badge-opened');
  }

  _hide(): void {
    const el = this._element;
    if (!el || !this._shown) return;
    el.classList.remove('onesignal-bell-launcher-badge-opened');
  }

  _updateCount(delta: number): void {
    const newNum = (Number(this._content) || 0) + delta;
    this._content = newNum > 0 ? newNum.toString() : '';
  }

  _increment(): void {
    this._updateCount(1);
  }

  _decrement(): void {
    this._updateCount(-1);
  }
}
