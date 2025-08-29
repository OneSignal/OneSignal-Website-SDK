import {
  addCssClass,
  hasCssClass,
  removeCssClass,
} from 'src/shared/helpers/dom';
import type { BellSize } from 'src/shared/prompts/types';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';

export default class Launcher extends AnimatedElement {
  public bell: Bell;
  public wasInactive: boolean;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher',
      'onesignal-bell-launcher-active',
      undefined,
      'onesignal-bell-launcher-inactive',
    );

    this.bell = bell;
    this.wasInactive = false;
  }

  async resize(size: BellSize) {
    if (!this.element) {
      // DOM element doesn't exist yet, skip resize
      return this;
    }

    // If the size is the same, do nothing and resolve an empty promise
    if (
      (size === 'small' &&
        hasCssClass(this.element, 'onesignal-bell-launcher-sm')) ||
      (size === 'medium' &&
        hasCssClass(this.element, 'onesignal-bell-launcher-md')) ||
      (size === 'large' &&
        hasCssClass(this.element, 'onesignal-bell-launcher-lg'))
    ) {
      return Promise.resolve(this);
    }
    removeCssClass(this.element, 'onesignal-bell-launcher-sm');
    removeCssClass(this.element, 'onesignal-bell-launcher-md');
    removeCssClass(this.element, 'onesignal-bell-launcher-lg');
    if (size === 'small') {
      addCssClass(this.element, 'onesignal-bell-launcher-sm');
    } else if (size === 'medium') {
      addCssClass(this.element, 'onesignal-bell-launcher-md');
    } else if (size === 'large') {
      addCssClass(this.element, 'onesignal-bell-launcher-lg');
    } else {
      throw new Error('Invalid OneSignal bell size ' + size);
    }
    if (!this.shown) {
      return this;
    } else {
      // Wait for animations using the modern approach
      await this.waitForAnimations();
      return this;
    }
  }

  async activateIfInactive() {
    if (this.inactive) {
      this.wasInactive = true;
      await this.activate();
    }
    return this;
  }

  async inactivateIfWasInactive() {
    if (this.wasInactive) {
      this.wasInactive = false;
      await this.inactivate();
      return this;
    } else {
      return this;
    }
  }

  clearIfWasInactive() {
    this.wasInactive = false;
  }

  async inactivate(): Promise<AnimatedElement> {
    await this.bell.__message.hide();
    if (this.bell.__badge.content.length > 0) {
      await this.bell.__badge.hide();
      await super.inactivate();
      await this.resize('small');
      await this.bell.__badge.show();
    } else {
      await super.inactivate();
      await this.resize('small');
    }
    return this;
  }

  async activate(): Promise<AnimatedElement> {
    if (this.bell.__badge.content.length > 0) {
      await this.bell.__badge.hide();
      await super.activate();
      await this.resize(this.bell._options.size!);
    } else {
      await super.activate();
      await this.resize(this.bell._options.size!);
    }
    return this;
  }
}
