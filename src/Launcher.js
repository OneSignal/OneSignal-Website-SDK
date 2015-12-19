import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, addCssClass, removeCssClass, once } from './utils.js';
import log from 'loglevel';
import Event from './events.js'


export default class Launcher extends AnimatedElement {

  /**
   * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
   * @param selector {string} The CSS selector of the element.
   * @param showClass {string} The CSS class name to add to show the element.
   * @param hideClass {string} The CSS class name to remove to hide the element.
   * @param state {string} The current state of the element, defaults to SHOWN.
   * @param targetTransitionEvent {string} A single property (e.g. 'transform' or 'opacity') to look for on transitionend of show() and hide() to know the transition is complete.
   * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
   */
  constructor(selector, showClass, hideClass, state = SHOWN, targetTransitionEvent = 'opacity', nestedContentSelector = null) {
    super('.onesignal-bell-launcher', 'onesignal-bell-launcher-active', null, state, targetTransitionEvent, nestedContentSelector);
  }


}
