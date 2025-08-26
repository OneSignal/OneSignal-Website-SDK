import ActiveAnimatedElement from './ActiveAnimatedElement';
import AnimatedElement from './AnimatedElement';

export default class Badge extends ActiveAnimatedElement {
  constructor() {
    super(
      '.onesignal-bell-launcher-badge',
      'onesignal-bell-launcher-badge-opened',
      undefined,
      'onesignal-bell-launcher-badge-active',
      undefined,
      'hidden',
    );
  }

  increment(): void {
    // If it IS a number (is not not a number)
    if (!isNaN(this.content as any)) {
      let badgeNumber = +this.content; // Coerce to int
      badgeNumber += 1;
      this.content = badgeNumber.toString();
    }
  }

  show(): Promise<AnimatedElement> {
    const promise = super.show();
    OneSignal.notifyButton?._setCustomColorsIfSpecified();
    return promise;
  }

  decrement() {
    // If it IS a number (is not not a number)
    if (!isNaN(this.content as any)) {
      let badgeNumber = +this.content; // Coerce to int
      badgeNumber -= 1;
      if (badgeNumber > 0) this.content = badgeNumber.toString();
      else this.content = '';
    }
  }
}
