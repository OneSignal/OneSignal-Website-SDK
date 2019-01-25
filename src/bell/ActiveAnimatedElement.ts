import OneSignalEvent from '../Event';
import { addCssClass, contains, once, removeCssClass } from '../utils';
import AnimatedElement from './AnimatedElement';
import Log from '../libraries/Log';
import OneSignal from '../OneSignal';

export default class ActiveAnimatedElement extends AnimatedElement {

  /**
   * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
   * @param selector {string} The CSS selector of the element.
   * @param showClass {string} The CSS class name to add to show the element.
   * @param hideClass {string} The CSS class name to remove to hide the element.
   * @param activeClass {string} The CSS class name to add to activate the element.
   * @param inactiveClass {string} The CSS class name to remove to inactivate the element.
   * @param state {string} The current state of the element, defaults to 'shown'.
   * @param activeState {string} The current state of the element, defaults to 'active'.
   * @param targetTransitionEvents {string} An array of properties (e.g. ['transform', 'opacity']) to look for on transitionend of show() and hide() to know the transition is complete. As long as one matches, the transition is considered complete.
   * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
   */
  constructor(public selector: string,
              public showClass: string | undefined,
              public hideClass: string | undefined,
              public activeClass: string | undefined,
              public inactiveClass: string | undefined,
              public state = 'shown',
              public activeState = 'active',
              public targetTransitionEvents = ['opacity', 'transform'],
              public nestedContentSelector?: string) {
    super(selector, showClass, hideClass, state, targetTransitionEvents);
  }

  /**
   * Asynchronously activates an element by applying its {activeClass} CSS class.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  activate() {
    if (!this.inactive || !this.shown) {
      return Promise.resolve(this);
    }
    else return new Promise((resolve) => {
      this.activeState = 'activating';
      OneSignalEvent.trigger(ActiveAnimatedElement.EVENTS.ACTIVATING, this);
      const element = this.element;
      if (!element) {
        Log.error("Could not find active animated element");
      } else {
        if (this.inactiveClass)
          removeCssClass(element, this.inactiveClass);
        if (this.activeClass)
          addCssClass(element, this.activeClass);
      }

      if (this.shown) {
        if (this.targetTransitionEvents.length == 0) {
          return resolve(this);
        } else {
          var timerId = setTimeout(() => {
            Log.debug(`Element did not completely activate (state: ${this.state}, activeState: ${this.activeState}).`)
          }, this.transitionCheckTimeout);
          once(this.element, 'transitionend', (event: Event, destroyListenerFn: Function) => {
            if (event.target === this.element &&
              contains(this.targetTransitionEvents, (event as any).propertyName)) {
              clearTimeout(timerId);
              // Uninstall the event listener for transitionend
              destroyListenerFn();
              this.activeState = 'active';
              OneSignalEvent.trigger(ActiveAnimatedElement.EVENTS.ACTIVE, this);
              return resolve(this);
            }
          }, true);
        }
      }
      else {
        Log.debug(`Ending activate() transition (alternative).`);
        this.activeState = 'active';
        OneSignalEvent.trigger(ActiveAnimatedElement.EVENTS.ACTIVE, this);
        return resolve(this);
      }
    });
  }

  /**
   * Asynchronously activates an element by applying its {activeClass} CSS class.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  inactivate() {
    if (!this.active) {
      return Promise.resolve(this);
    }
    else return new Promise((resolve) => {
      this.activeState = 'inactivating';
      OneSignalEvent.trigger(ActiveAnimatedElement.EVENTS.INACTIVATING, this);
      const element = this.element;
      if (!element) {
        Log.error("Could not find active animated element");
      } else {
        if (this.activeClass)
          removeCssClass(element, this.activeClass);
        if (this.inactiveClass)
          addCssClass(element, this.inactiveClass);
      }
      
      if (this.shown) {
        if (this.targetTransitionEvents.length == 0) {
          return resolve(this);
        } else {
          var timerId = setTimeout(() => {
            Log.debug(`Element did not completely inactivate (state: ${this.state}, activeState: ${this.activeState}).`)
          }, this.transitionCheckTimeout);
          once(this.element, 'transitionend', (event: Event, destroyListenerFn: Function) => {
            if (event.target === this.element &&
              contains(this.targetTransitionEvents, (event as any).propertyName)) {
              clearTimeout(timerId);
              // Uninstall the event listener for transitionend
              destroyListenerFn();
              this.activeState = 'inactive';
              OneSignalEvent.trigger(ActiveAnimatedElement.EVENTS.INACTIVE, this);
              return resolve(this);
            }
          }, true);
        }
      }
      else {
        this.activeState = 'inactive';
        OneSignalEvent.trigger(ActiveAnimatedElement.EVENTS.INACTIVE, this);
        return resolve(this);
      }
    });
  }

  /**
   * Asynchronously waits for an element to finish transitioning to being active.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  waitUntilActive() {
    if (this.active)
      return Promise.resolve(this);
    else return new Promise((resolve) => {
      OneSignal.emitter.once(ActiveAnimatedElement.EVENTS.ACTIVE, (event) => {
        if (event === this) {
          return resolve(this);
        }
      });
    });
  }

  /**
   * Asynchronously waits for an element to finish transitioning to being inactive.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  waitUntilInactive() {
    if (this.inactive)
      return Promise.resolve(this);
    else return new Promise((resolve) => {
      OneSignal.emitter.once(ActiveAnimatedElement.EVENTS.INACTIVE, (event) => {
        if (event === this) {
          return resolve(this);
        }
      });
    });
  }

  static get EVENTS() {
    return {
      ...AnimatedElement.EVENTS,
      ...{
      ACTIVATING: 'activeAnimatedElementActivating',
      ACTIVE: 'activeAnimatedElementActive',
      INACTIVATING: 'activeAnimatedElementInactivating',
      INACTIVE: 'activeAnimatedElementInactive',
      }
    };
  }

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be transitioning to being activated.
   */
  get activating() {
    return this.activeState === 'activating';
  }

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be already active.
   */
  get active() {
    return this.activeState === 'active';
  }

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be transitioning to inactive.
   */
  get inactivating() {
    return this.activeState === 'inactivating';
  }

  /**
   * Synchronously returns the last known state of the element.
   * @returns {boolean} Returns true if the element was last known to be already inactive.
   */
  get inactive() {
    return this.activeState === 'inactive';
  }
}
