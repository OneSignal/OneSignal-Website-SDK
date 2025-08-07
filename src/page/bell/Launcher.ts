import { containsMatch } from 'src/shared/context/helpers';
import {
  addCssClass,
  hasCssClass,
  removeCssClass,
} from 'src/shared/helpers/dom';
import { nothing } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import type { BellSize } from 'src/shared/prompts/types';
import { once } from 'src/shared/utils/utils';
import ActiveAnimatedElement from './ActiveAnimatedElement';
import Bell from './Bell';

export default class Launcher extends ActiveAnimatedElement {
  public bell: Bell;
  public wasInactive: boolean;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher',
      'onesignal-bell-launcher-active',
      undefined,
      undefined,
      'onesignal-bell-launcher-inactive',
      'hidden',
      'active',
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
      return await new Promise((resolve) => {
        // Once the launcher has finished shrinking down
        if (this.targetTransitionEvents.length == 0) {
          return resolve(this);
        } else {
          const timerId = setTimeout(() => {
            Log.debug(
              `Launcher did not completely resize (state: ${this.state}, activeState: ${this.activeState}).`,
            );
          }, this.transitionCheckTimeout);
          once(
            this.element!,
            'transitionend',
            (event: Event, destroyListenerFn: () => void) => {
              if (
                event.target === this.element &&
                containsMatch(
                  this.targetTransitionEvents,
                  (event as any).propertyName,
                )
              ) {
                clearTimeout(timerId);
                // Uninstall the event listener for transitionend
                destroyListenerFn();
                return resolve(this);
              }
            },
            true,
          );
        }
      });
    }
  }

  activateIfInactive() {
    if (this.inactive) {
      this.wasInactive = true;
      return this.activate();
    } else return nothing();
  }

  inactivateIfWasInactive() {
    if (this.wasInactive) {
      this.wasInactive = false;
      return this.inactivate();
    } else return nothing();
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
