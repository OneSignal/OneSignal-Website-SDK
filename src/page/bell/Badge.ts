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
    const num = Number(this.content);
    if (!Number.isNaN(num)) {
      const newNum = num + delta;
      this.content = newNum > 0 ? newNum.toString() : '';
    }
  }

  increment(): void {
    this._updateCount(1);
  }

  decrement(): void {
    this._updateCount(-1);
  }

  show(): Promise<AnimatedElement> {
    const promise = super.show();
    OneSignal._notifyButton?.setCustomColorsIfSpecified();
    return promise;
  }
}
