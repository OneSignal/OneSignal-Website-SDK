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
      // Notify button doesn't exist
      throw new Error('Missing DOM element');
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
      await this.waitForAnimations();
    }
  }

  async activateIfInactive() {
    if (!this.active) {
      this.wasInactive = true;
      await this.activate();
    }
    return this;
  }

  async inactivateIfWasInactive() {
    if (this.wasInactive) {
      this.wasInactive = false;
      await this.inactivate();
    }
    return this;
  }

  clearIfWasInactive() {
    this.wasInactive = false;
  }

  inactivate() {
    return this.bell.message.hide().then(() => {
      if (this.bell.badge.content.length > 0) {
        return this.bell.badge
          .hide()
          .then(() => Promise.all([super.inactivate(), this.resize('small')]))
          .then(() => this.bell.badge.show());
      } else {
        return Promise.all([super.inactivate(), this.resize('small')]);
      }
    });
  }

  activate() {
    if (this.bell.badge.content.length > 0) {
      return this.bell.badge
        .hide()
        .then(() =>
          Promise.all([super.activate(), this.resize(this.bell.options.size!)]),
        );
    } else {
      return Promise.all([
        super.activate(),
        this.resize(this.bell.options.size!),
      ]);
    }
  }
}
