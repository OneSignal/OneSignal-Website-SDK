import {
  addCssClass,
  hasCssClass,
  removeCssClass,
} from 'src/shared/helpers/dom';
import type { BellSize } from 'src/shared/prompts/types';
import AnimatedElement from './AnimatedElement';
import type Bell from './Bell';

export default class Launcher extends AnimatedElement {
  public _bell: Bell;
  public _wasInactive: boolean;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher',
      'onesignal-bell-launcher-active',
      undefined,
      'onesignal-bell-launcher-inactive',
    );

    this._bell = bell;
    this._wasInactive = false;
  }

  async _resize(size: BellSize) {
    if (!this._element) {
      // Notify button doesn't exist
      throw new Error('Missing DOM element');
    }

    // If the size is the same, do nothing and resolve an empty promise
    if (
      (size === 'small' &&
        hasCssClass(this._element, 'onesignal-bell-launcher-sm')) ||
      (size === 'medium' &&
        hasCssClass(this._element, 'onesignal-bell-launcher-md')) ||
      (size === 'large' &&
        hasCssClass(this._element, 'onesignal-bell-launcher-lg'))
    ) {
      return;
    }
    removeCssClass(this._element, 'onesignal-bell-launcher-sm');
    removeCssClass(this._element, 'onesignal-bell-launcher-md');
    removeCssClass(this._element, 'onesignal-bell-launcher-lg');
    if (size === 'small') {
      addCssClass(this._element, 'onesignal-bell-launcher-sm');
    } else if (size === 'medium') {
      addCssClass(this._element, 'onesignal-bell-launcher-md');
    } else if (size === 'large') {
      addCssClass(this._element, 'onesignal-bell-launcher-lg');
    } else {
      throw new Error('Invalid OneSignal bell size ' + size);
    }
    if (!this._shown) {
      return;
    } else {
      await this._waitForAnimations();
    }
  }

  async _activateIfInactive() {
    if (!this._active) {
      this._wasInactive = true;
      await this._activate();
    }
  }

  async _inactivateIfWasInactive() {
    if (this._wasInactive) {
      this._wasInactive = false;
      await this._inactivate();
    }
  }

  _clearIfWasInactive() {
    this._wasInactive = false;
  }

  async _inactivate() {
    await this.bell.message.hide();
    const hasContent = this.bell.badge.content.length > 0;
    if (hasContent) await this.bell.badge.hide();
    await Promise.all([super.inactivate(), this.resize('small')]);
    if (hasContent) await this.bell.badge.show();
  }

  async _activate() {
    if (this._bell._badge._content.length > 0) {
      await this._bell._badge._hide();
    }
    await Promise.all([super.activate(), this.resize(this.bell.options.size!)]);
  }
}
