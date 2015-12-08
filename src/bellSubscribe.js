import { isBrowserEnv, isPushNotificationsSupported } from './utils.js';
import LimitStore from './limitStore.js';

if (isBrowserEnv()) {
  require("./bell.scss");
  var Tether = require('tether');
  var Drop = require('tether-drop');
  var log = require('loglevel');
  var bell = require('raw!./test.svg');

  class Bell {
    constructor(options) {
      this.recreate(options);
    }

    recreate(options) {
      if (!isPushNotificationsSupported())
        return;

      document.getElementsByTagName('body')[0].insertAdjacentHTML('beforeend', `<div id="onesignal-bell">${bell}</div>`);
      let contextedDrop = Drop.createContext({
        classPrefix: 'onesignal-popover'
      });
      this.popover = new contextedDrop({
        target: document.querySelector('#onesignal-bell'),
        content: 'Subscribe to notifications',
        classes: 'onesignal-popover-theme',
        position: 'right middle',
        openOn: 'hover',
        tetherOptions: {
          offset: '0px -5px',
          constraints: [
            {
              to: 'scrollParent',
              pin: ['top']
            }
          ]
        }
      });

      this.domElement = document.getElementById('onesignal-bell');
      this.domElement.addEventListener('click', this.onClick);

      OneSignal.isPushNotificationsEnabled((isEnabled) => {
        if (isEnabled) {
          this.setPopoverContent('Unsubscribe from notifications')
        } else {
          this.setPopoverContent('Subscribe to notifications')
        }
      });

      window.addEventListener('onesignal.subscription.changed', (e) => {
        if (e.detail) {
          this.setPopoverContent('Unsubscribe from notifications')
        } else {
          this.setPopoverContent('Subscribe to notifications')
        }
      });

      //document.querySelector('.onesignal-popover').style.display = 'none';
      //this.popover.open();
      //this.popover.close();
      //document.querySelector('.onesignal-popover').style.display = 'block';
    }

    setPopoverContent(content) {
      var oneSignalPopover = document.querySelector('.onesignal-popover-content');
      if (oneSignalPopover) {
        oneSignalPopover.innerHTML = content;
      }
      this.popover.position();
    }

    onClick(e) {
      OneSignal.registerForPushNotifications();
    }
  }

  module.exports = Bell;
}