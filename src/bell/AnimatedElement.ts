import { addCssClass, removeCssClass, contains, once } from '../utils';
import OneSignalEvent from '../Event'
import Log from '../libraries/Log';
import OneSignal from '../OneSignal';

export default class AnimatedElement {

  /**
   * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
   * @param selector {string} The CSS selector of the element.
   * @param showClass {string} The CSS class name to add to show the element.
   * @param hideClass {string} The CSS class name to remove to hide the element.
   * @param state {string} The current state of the element, defaults to 'shown'.
   * @param targetTransitionEvents {string} An array of properties (e.g. ['transform', 'opacity']) to look for on transitionend of show() and hide() to know the transition is complete. As long as one matches, the transition is considered complete.
   * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
   */
  constructor(public selector: string,
              public showClass: string | undefined,
              public hideClass: string | undefined,
              public state = 'shown',
              public targetTransitionEvents = ['opacity', 'transform'],
              public nestedContentSelector?: string,
              public transitionCheckTimeout = 500) {
  }

  /**
   * Asynchronously shows an element by applying its {showClass} CSS class.
   *
   * Returns a promise that is resolved with this element when it has completed its transition.
   */
  show(): Promise<AnimatedElement> {
    if (!this.hidden) {
      return Promise.resolve(this);
    }
    else return new Promise((resolve) => {
      this.state = 'showing';
      OneSignalEvent.trigger(AnimatedElement.EVENTS.SHOWING, this);
      const element = this.element;
      if (!element) {
        Log.error(`(show) could not find animated element with selector ${this.selector}`)
      } else {
        if (this.hideClass)
          removeCssClass(element, this.hideClass);
        if (this.showClass)
          addCssClass(element, this.showClass);
      }

      if (this.targetTransitionEvents.length == 0) {
        return resolve(this);
      } else {
        var timerId = setTimeout(() => {
          Log.debug(`Element did not completely show (state: ${this.state}).`)
        }, this.transitionCheckTimeout);
        once(this.element, 'transitionend', (event: Event, destroyListenerFn: Function) => {
          if (event.target === this.element &&
            contains(this.targetTransitionEvents, (event as any).propertyName)) {
            clearTimeout(timerId);
            // Uninstall the event listener for transitionend
            destroyListenerFn();
            this.state = 'shown';
            OneSignalEvent.trigger(AnimatedElement.EVENTS.SHOWN, this);
            return resolve(this);
          }
        }, true);
      }
    });
  }

  /**
   * Asynchronously hides an element by applying its {hideClass} CSS class.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  hide() {
    if (!this.shown) {
      return Promise.resolve(this);
    }
    else return new Promise((resolve) => {
      this.state = 'hiding';
      OneSignalEvent.trigger(AnimatedElement.EVENTS.HIDING, this);
      const element = this.element;
      if (!element) {
        Log.error(`(hide) could not find animated element with selector ${this.selector}`)
      } else {
        if (this.showClass)
          removeCssClass(element, this.showClass);
        if (this.hideClass)
          addCssClass(element, this.hideClass);
      }

      if (this.targetTransitionEvents.length == 0) {
        return resolve(this);
      } else {
        once(this.element, 'transitionend', (event: Event, destroyListenerFn: Function) => {
          var timerId = setTimeout(() => {
            Log.debug(`Element did not completely hide (state: ${this.state}).`)
          }, this.transitionCheckTimeout);
          if (event.target === this.element &&
            contains(this.targetTransitionEvents, (event as any).propertyName)) {
            clearTimeout(timerId);
            // Uninstall the event listener for transitionend
            destroyListenerFn();
            this.state = 'hidden';
            OneSignalEvent.trigger(AnimatedElement.EVENTS.HIDDEN, this);
            return resolve(this);
          }
        }, true);
      }
    });
  }

  /**
   * Asynchronously waits for an element to finish transitioning to being shown.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  waitUntilShown() {
    if (this.state === 'shown')
      return Promise.resolve(this);
    else return new Promise((resolve) => {
      OneSignal.emitter.once(AnimatedElement.EVENTS.SHOWN, (event) => {
        if (event === this) {
          return resolve(this);
        }
      });
    });
  }

  /**
   * Asynchronously waits for an element to finish transitioning to being hidden.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  waitUntilHidden() {
    if (this.state === 'hidden')
      return Promise.resolve(this);
    else return new Promise((resolve) => {
      OneSignal.emitter.once(AnimatedElement.EVENTS.HIDDEN, (event) => {
        if (event === this) {
          return resolve(this);
        }
      });
    });
  }

  static get EVENTS() {
    return {
      SHOWING: 'animatedElementShowing',
      SHOWN: 'animatedElementShown',
      HIDING: 'animatedElementHiding',
      HIDDEN: 'animatedElementHidden',
    };
  }

  /**
   * Returns the native element's innerHTML property.
   * @returns {string} Returns the native element's innerHTML property.
   */
  get content() {
    if (!this.element) {
      return "";
    }
    if (this.nestedContentSelector) {
      const innerElement = this.element.querySelector(this.nestedContentSelector);
      return innerElement ? innerElement.innerHTML : "";
    } else {
      return this.element.innerHTML;
    }
  }

  /**
   * Sets the native element's innerHTML property.
   * @param value {string} The HTML to set to the element.
   */
  set content(value) {
    if (!this.element) {
      return;
    }
    if (this.nestedContentSelector) {
      const nestedContent = this.element.querySelector(this.nestedContentSelector);
      if (nestedContent) {
        nestedContent.innerHTML = value;
      }
    }
    else {
      this.element.innerHTML = value;
    }
  }


  /**
   * Returns the native {Element} via document.querySelector().
   * @returns {Element | null} Returns the native {Element} via document.querySelector() or {null} if not found.
   */
  get element() {
    return document.querySelector(this.selector);
  }

  /* States an element can be in */

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be transitioning to being shown.
   */
  get showing() {
    return this.state === 'showing';
  }

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be already shown.
   */
  get shown() {
    return this.state === 'shown';
  }

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be transitioning to hiding.
   */
  get hiding() {
    return this.state === 'hiding';
  }

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be already hidden.
   */
  get hidden() {
    return this.state === 'hidden';
  }
}
