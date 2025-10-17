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
    await this._bell._message._hide();
    const hasContent = this._bell._badge._content.length > 0;
    if (hasContent) await this._bell._badge._hide();
    await Promise.all([super._inactivate(), this._resize('small')]);
    if (hasContent) await this._bell._badge._show();
  }

  async _activate() {
    if (this._bell._badge._content.length > 0) {
      await this._bell._badge._hide();
    }
    await Promise.all([
      super._activate(),
      this._resize(this._bell._options.size!),
    ]);
  }
}
