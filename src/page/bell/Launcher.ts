import {
  addCssClass,
  hasCssClass,
  removeCssClass,
} from 'src/shared/helpers/dom';
import type { BellSize } from 'src/shared/prompts/types';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';

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
      // DOM element doesn't exist yet, skip resize
      return this;
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
      return Promise.resolve(this);
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
      return this;
    } else {
      // Wait for animations using the modern approach
      await this._waitForAnimations();
      return this;
    }
  }

  async _activateIfInactive() {
    if (!this._active) {
      this._wasInactive = true;
      await this._activate();
    }
    return this;
  }

  async _inactivateIfWasInactive() {
    if (this._wasInactive) {
      this._wasInactive = false;
      await this._inactivate();
      return this;
    } else {
      return this;
    }
  }

  _clearIfWasInactive() {
    this._wasInactive = false;
  }

  async _inactivate(): Promise<AnimatedElement> {
    await this._bell._message._hide();
    if (this._bell._badge._content.length > 0) {
      await this._bell._badge._hide();
      await super._inactivate();
      await this._resize('small');
      await this._bell._badge._show();
    } else {
      await super._inactivate();
      await this._resize('small');
    }
    return this;
  }

  async _activate(): Promise<AnimatedElement> {
    if (this._bell._badge._content.length > 0) {
      await this._bell._badge._hide();
      await super._activate();
      await this._resize(this._bell._options.size!);
    } else {
      await super._activate();
      await this._resize(this._bell._options.size!);
    }
    return this;
  }
}
