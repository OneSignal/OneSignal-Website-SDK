import AnimatedElement from './AnimatedElement';

export default class Badge extends AnimatedElement {
  constructor() {
    super(
      '.onesignal-bell-launcher-badge',
      'onesignal-bell-launcher-badge-opened',
      'onesignal-bell-launcher-badge-active',
    );
  }

  _increment(): void {
    // If it IS a number (is not not a number)
    if (!isNaN(this._content as any)) {
      let badgeNumber = +this._content; // Coerce to int
      badgeNumber += 1;
      this._content = badgeNumber.toString();
    }
  }

  _show(): Promise<AnimatedElement> {
    const promise = super._show();
    OneSignal._notifyButton?._setCustomColorsIfSpecified();
    return promise;
  }

  _decrement() {
    // If it IS a number (is not not a number)
    if (!isNaN(this._content as any)) {
      let badgeNumber = +this._content; // Coerce to int
      badgeNumber -= 1;
      if (badgeNumber > 0) this._content = badgeNumber.toString();
      else this._content = '';
    }
  }
}
