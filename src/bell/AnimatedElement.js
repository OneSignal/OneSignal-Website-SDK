import { isPushNotificationsSupported, getConsoleStyle, addCssClass, removeCssClass, once, contains } from '../utils.js';
import * as log from 'loglevel';
import Event from '../events.js'


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
  constructor(selector, showClass, hideClass, state = 'shown', targetTransitionEvents = ['opacity', 'transform'], nestedContentSelector = null) {
    this.selector = selector;
    this.showClass = showClass;
    this.hideClass = hideClass;
    this.state = state;
    this.targetTransitionEvents = targetTransitionEvents;
    this.nestedContentSelector = nestedContentSelector;
    this.transitionCheckTimeout = 500;
  }

  /**
   * Asynchronously shows an element by applying its {showClass} CSS class.
   * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
   */
  show() {
    if (!this.hidden) {
      return Promise.resolve(this);
    }
    else return new Promise((resolve) => {
      var self = this;
      this.state = 'showing';
      Event.trigger(AnimatedElement.EVENTS.SHOWING, this);
      if (this.hideClass)
        removeCssClass(this.element, this.hideClass);
      if (this.showClass)
        addCssClass(this.element, this.showClass);
      if (this.targetTransitionEvents.length == 0) {
        return resolve(this);
      } else {
        var timerId = setTimeout(() => {
          log.warn(`${this.constructor.name} did not completely show (state: ${this.state}, activeState: ${this.activeState}).`)
        }, this.transitionCheckTimeout);
        once(this.element, 'transitionend', (event, destroyListenerFn) => {
          if (event.target === this.element &&
            contains(this.targetTransitionEvents, event.propertyName)) {
            clearTimeout(timerId);
            // Uninstall the event listener for transitionend
            destroyListenerFn();
            this.state = 'shown';
            Event.trigger(AnimatedElement.EVENTS.SHOWN, this);
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
      Event.trigger(AnimatedElement.EVENTS.HIDING, this);
      if (this.showClass)
        removeCssClass(this.element, this.showClass);
      if (this.hideClass)
        addCssClass(this.element, this.hideClass);
      if (this.targetTransitionEvents.length == 0) {
        return resolve(this);
      } else {
        once(this.element, 'transitionend', (event, destroyListenerFn) => {
          var timerId = setTimeout(() => {
            log.warn(`${this.constructor.name} did not completely hide (state: ${this.state}, activeState: ${this.activeState}).`)
          }, this.transitionCheckTimeout);
          if (event.target === this.element &&
            contains(this.targetTransitionEvents, event.propertyName)) {
            clearTimeout(timerId);
            // Uninstall the event listener for transitionend
            destroyListenerFn();
            this.state = 'hidden';
            Event.trigger(AnimatedElement.EVENTS.HIDDEN, this);
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
      OneSignal.once(AnimatedElement.EVENTS.SHOWN, (event) => {
        var self = this;
        if (event === this) {
          return resolve(this);
        }
      }, true);
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
      OneSignal.once(AnimatedElement.EVENTS.HIDDEN, (event) => {
        if (event === this) {
          return resolve(this);
        }
      }, true);
    });
  }

  static get EVENTS() {
    return {
      SHOWING: 'animatedElementShowing',
      SHOWN: 'animatedElementShown',
      HIDING: 'animatedElementHiding',
      HIDDEN: 'aniamtedElementHidden',
    };
  }

  /**
   * Returns the native element's innerHTML property.
   * @returns {string} Returns the native element's innerHTML property.
   */
  get content() {
    if (this.nestedContentSelector)
      return this.element.querySelector(this.nestedContentSelector).innerHTML;
    else
      return this.element.innerHTML;
  }

  /**
   * Sets the native element's innerHTML property.
   * @param value {string} The HTML to set to the element.
   */
  set content(value) {
    if (this.nestedContentSelector) {
      this.element.querySelector(this.nestedContentSelector).innerHTML = value;
    }
    else {
      this.element.innerHTML = value;
    }
  }


  /**
   * Returns the native {Element} via document.querySelector().
   * @returns {Element} Returns the native {Element} via document.querySelector().
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