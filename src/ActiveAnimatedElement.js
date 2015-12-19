import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, addCssClass, removeCssClass, once } from './utils.js';
import log from 'loglevel';
import Event from './events.js'


export default class ActiveAnimatedElement extends AnimatedElement {

  /**
   * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
   * @param selector {string} The CSS selector of the element.
   * @param showClass {string} The CSS class name to add to show the element.
   * @param hideClass {string} The CSS class name to remove to hide the element.
   * @param activeClass {string} The CSS class name to add to activate the element.
   * @param inactiveClass {string} The CSS class name to remove to inactivate the element.
   * @param state {string} The current state of the element, defaults to SHOWN.
   * @param targetTransitionEvent {string} A single property (e.g. 'transform' or 'opacity') to look for on transitionend of show() and hide() to know the transition is complete.
   * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
   */
  constructor(selector, showClass, hideClass, activeClass, inactiveClass, state = 'shown', activeState = 'active', targetTransitionEvent = 'opacity', nestedContentSelector = null) {
    super(selector, showClass, hideClass, state, targetTransitionEvent, nestedContentSelector);
    this.activeClass = activeClass;
    this.inactiveClass = inactiveClass;
    this.activeState = activeState;
  }

  /**
   * Asynchronously activates an element by applying its {activeClass} CSS class.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  activate() {
    return new Promise((resolve) => {
      this.activeState = 'activating';
      Event.trigger(ActiveAnimatedElement.EVENTS.ACTIVATING, this);
      if (this.inactiveClass)
        removeCssClass(this.element, this.inactiveClass);
      if (this.activeClass)
        addCssClass(this.element, this.activeClass);
      once(this.element, 'transitionend', (event, destroyListenerFn) => {
        if (event.target === this.element &&
          event.propertyName === this.targetTransitionEvent) {
          // Uninstall the event listener for transitionend
          destroyListenerFn();
          this.activeState = 'active';
          Event.trigger(AnimatedElement.EVENTS.ACTIVE, this);
          return resolve(this);
        }
      }, true);
    });
  }

  /**
   * Asynchronously activates an element by applying its {activeClass} CSS class.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  inactivate() {
    return new Promise((resolve) => {
      this.activeState = 'inactivating';
      Event.trigger(ActiveAnimatedElement.EVENTS.INACTIVATING, this);
      if (this.activeClass)
        removeCssClass(this.element, this.activeClass);
      if (this.inactiveClass)
        addCssClass(this.element, this.inactiveClass);
      once(this.element, 'transitionend', (event, destroyListenerFn) => {
        if (event.target === this.element &&
          event.propertyName === this.targetTransitionEvent) {
          // Uninstall the event listener for transitionend
          destroyListenerFn();
          this.activeState = 'inactive';
          Event.trigger(AnimatedElement.EVENTS.INACTIVE, this);
          return resolve(this);
        }
      }, true);
    });
  }

  /**
   * Asynchronously waits for an element to finish transitioning to being active.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  waitUntilActive() {
    if (this.activeState === 'active') {
      return Promise.resolve(this);
    }
    else {
      return new Promise((resolve) => {
        once(window, AnimatedElement.EVENTS.ACTIVE, (event, destroyListenerFn) => {
          if (event.details === this) {
            destroyListenerFn();
            return resolve(this);
          }
        }, true);
      });
    }
  }

  /**
   * Asynchronously waits for an element to finish transitioning to being inactive.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  waitUntilInactive() {
    if (this.activeState === 'inactive') {
      return Promise.resolve(this);
    }
    else {
      return new Promise((resolve) => {
        once(window, AnimatedElement.EVENTS.INACTIVE, (event, destroyListenerFn) => {
          if (event.details === this) {
            destroyListenerFn();
            return resolve(this);
          }
        }, true);
      });
    }
  }

  static get EVENTS() {
    return Object.assign({}, AnimatedElement.EVENTS, {
      ACTIVATING: 'onesignal.bell.activeanimatedelement.activating',
      ACTIVE: 'onesignal.bell.activeanimatedelement.active',
      INACTIVATING: 'onesignal.bell.activeanimatedelement.inactivating',
      INACTIVE: 'onesignal.bell.activeanimatedelement.inactive',
    });
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
