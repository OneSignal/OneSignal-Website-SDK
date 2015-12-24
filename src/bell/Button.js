import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, addCssClass, removeCssClass, removeDomElement, once, when } from '../utils.js';
import log from 'loglevel';
import Event from '../events.js';
import ActiveAnimatedElement from './ActiveAnimatedElement.js';
import Bell from './bell.js';
import LimitStore from '../limitStore.js';


export default class Button extends ActiveAnimatedElement {

  constructor(bell) {
    super('.onesignal-bell-launcher-button', null, null, 'onesignal-bell-launcher-button-active', null, 'shown', []);

    this.bell = bell;
    this.events = {
      mouse: 'bell.launcher.button.mouse'
    };

    this.element.addEventListener('mouseover', () => {
      if (LimitStore.isEmpty(this.events.mouse) || LimitStore.getLast(this.events.mouse) === 'out') {
        Event.trigger(Bell.EVENTS.HOVERING);
      }
      LimitStore.put(this.events.mouse, 'over');
    });

    this.element.addEventListener('mouseleave', () => {
      LimitStore.put(this.events.mouse, 'out');
      Event.trigger(Bell.EVENTS.HOVERED);
    });

    this.element.addEventListener('mousedown', () => {
      this.pulse();
      this.activate();
      this.bell.badge.activate();
    });

    this.element.addEventListener('mouseup', () => {
      this.inactivate();
      this.bell.badge.inactivate();
    });

    this.element.addEventListener('click', () => {
      Event.trigger(Bell.EVENTS.BELL_CLICK);
      Event.trigger(Bell.EVENTS.LAUNCHER_CLICK);
    });
  }

  pulse() {
    removeDomElement('.pulse-ring');
    addDomElement(this.element, 'beforeend', '<div class="pulse-ring"></div>');
  }
}