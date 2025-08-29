import AnimatedElement from './AnimatedElement';

export default class Badge extends AnimatedElement {
  constructor() {
    super(
      '.onesignal-bell-launcher-badge',
      'onesignal-bell-launcher-badge-opened',
      'onesignal-bell-launcher-badge-active',
      undefined,
    );
  }

  private _updateCount(delta: number): void {
    const current = Number(this._content);
    if (!isNaN(current)) {
      const newCount = current + delta;
      this._content = newCount > 0 ? newCount.toString() : '';
    }
  }

  _increment(): void {
    this._updateCount(1);
  }

  _show(): Promise<AnimatedElement> {
    return super._show();
  }

  _decrement(): void {
    this._updateCount(-1);
  }
}
