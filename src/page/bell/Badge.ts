import AnimatedElement from './AnimatedElement';

export default class Badge extends AnimatedElement {
  constructor() {
    super(
      '.onesignal-bell-launcher-badge',
      'onesignal-bell-launcher-badge-opened',
      'onesignal-bell-launcher-badge-active',
    );
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

  _show(): Promise<AnimatedElement> {
    const promise = super._show();
    OneSignal._notifyButton?._setCustomColorsIfSpecified();
    return promise;
  }
}
