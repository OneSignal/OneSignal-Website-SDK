import { isPushNotificationsSupported, removeDomElement, addDomElement, clearDomElementChildren, addCssClass, removeCssClass, once, on, off, getConsoleStyle, delay, when, nothing, contains, decodeHtmlEntities } from '../utils.js';
import Environment from '../environment.js';
import log from 'loglevel';
import Event from '../events.js';
import Helpers from '../helpers';
import * as Browser from 'bowser';
import { HOST_URL } from '../vars.js';

import "./popover.scss";


export default class Popover {

    static get EVENTS() {
        return {
            ALLOW_CLICK: 'popoverAllowClick',
            CANCEL_CLICK: 'popoverCancelClick',
            BLOCKED_CANCEL_CLICK: 'popoverBlockedCancelClick',
            BLOCKED_RETRY_CLICK: 'popoverBlockedRetryClick',
            SHOWN: 'popoverShown',
            CLOSED: 'popoverClosed',
        };
    }

    constructor(options) {
        this.options = options;
        if (!this.options) {
            this.options = {};
        }
        this.text = this.options.text;
        if (!this.text) {
            this.text = {};
        }
        if (!this.text['message.body'])
            this.text['message.body'] = "We'd like to send you push notifications. You can unsubscribe at any time.";
        if (!this.text['button.allow'])
            this.text['button.allow'] = "Allow";
        if (!this.text['button.cancel'])
            this.text['button.cancel'] = "No Thanks";

        this.notificationIcons = null;
    }

    create() {
        try {
            if (this.notificationIcons === null) {
                Helpers.getNotificationIcons().then((icons) => {
                    this.notificationIcons = icons;

                    // Remove any existing container
                    if (this.container) {
                        removeDomElement('#onesignal-popover-container');
                    }

                    let imageUrl = null;
                    if (Browser.chrome) {
                        if (!Browser.mobile && !Browser.tablet) {
                            imageUrl = HOST_URL + '/bell/chrome-unblock.jpg';
                        }
                    }
                    else if (Browser.firefox)
                        imageUrl = HOST_URL + '/bell/firefox-unblock.jpg';
                    else if (Browser.safari)
                        imageUrl = HOST_URL + '/bell/safari-unblock.jpg';
                    let blockedImageHtml = '';
                    if (imageUrl) {
                        blockedImageHtml = `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a>`;
                    }

                    let dialogHtml = `
                    <div id="normal-popover">
                        <div class="popover-body">
                            <div class="popover-body-icon" style="background-image: url('${this.getPlatformNotificationIcon()}');">
                            </div>
                            <div class="popover-body-message">
                                ${this.text['message.body']}                
                            </div>
                            <div class="clearfix"></div>
                        </div>
                        <div class="popover-footer">
                            <button id="onesignal-popover-allow-button" class="align-right primary popover-button">
                            ${this.text['button.allow']}</button>
                            <button id="onesignal-popover-cancel-button" class="align-right secondary popover-button">
                            ${this.text['button.cancel']}</button>
                            <div class="clearfix"></div>
                        </div>
                    </div>
                    <div id="blocked-popover">
                        <div class="popover-body">
                            <div class="popover-body-message">
                                <div class="message">
                                    ${Browser.name} is currently blocking notifications on ${OneSignal.config.subdomainName}.<br/>      
                                    Please follow these instructions to change it:
                                </div>
                                <div class="unblock-image">
                                    ${blockedImageHtml}
                                </div>
                            </div>
                            <div class="clearfix"></div>
                        </div>
                        <div class="popover-footer">
                            <button id="onesignal-popover-blocked-retry-button" 
                            class="align-right primary popover-button">Retry</button>
                            <button id="onesignal-popover-blocked-cancel-button" 
                            class="align-right secondary popover-button">Cancel</button>
                            <div class="clearfix"></div>
                        </div>
                    </div>
                `;

                    window.addDomElement = addDomElement;
                    // Insert the container
                    addDomElement('body', 'beforeend',
                                  '<div id="onesignal-popover-container" class="onesignal-popover-container onesignal-reset"></div>');
                    // Insert the dialog
                    addDomElement(this.container, 'beforeend',
                                  `<div id="onesignal-popover-dialog" class="onesignal-popover-dialog">${dialogHtml}</div>`);
                    // Animate it in depending on environment
                    addCssClass(this.container, Browser.mobile ? 'slide-up' : 'slide-down');
                    // Add click event handlers
                    this.allowButton.addEventListener('click', this.onPopoverAllowed.bind(this));
                    this.cancelButton.addEventListener('click', this.onPopoverCanceled.bind(this));
                    this.blockedCancelButton.addEventListener('click', this.onPopoverBlockedCancel.bind(this));
                    this.blockedRetryButton.addEventListener('click', this.onPopoverBlockedRetry.bind(this));
                    Event.trigger(Popover.EVENTS.SHOWN);
                });
            }
        } catch (e) {
            log.error(e);
        }
    }

    showBlockedDialog() {
        addCssClass(this.dialog, 'blocked-dialog');
    }

    onPopoverAllowed(e) {
        Event.trigger(Popover.EVENTS.ALLOW_CLICK);
    }

    onPopoverCanceled(e) {
        Event.trigger(Popover.EVENTS.CANCEL_CLICK);
        this.close();
    }

    onPopoverBlockedCancel(e) {
        Event.trigger(Popover.EVENTS.BLOCKED_CANCEL_CLICK);
        this.close();
    }

    onPopoverBlockedRetry(e) {
        OneSignal.getNotificationPermission()
                 .then(permission => {
                    if (permission === 'denied') {

                    } else if (permission === 'default') {

                    } else if (permission === 'granted') {
                        this.close();
                        Event.trigger(Popover.EVENTS.ALLOW_CLICK);
                    }
                 });
    }

    close() {
        addCssClass(this.container, 'close-popover');
        once(this.dialog, 'animationend', (event, destroyListenerFn) => {
            if (event.target === this.dialog &&
                event.animationName === 'slideDownExit') {
                // Uninstall the event listener for animationend
                destroyListenerFn();
                Event.trigger(Popover.EVENTS.CLOSED);
            }
        }, true);
    }

    getPlatformNotificationIcon() {
        if (this.notificationIcons) {
            if (Browser.chrome || Browser.firefox) {
                return this.notificationIcons.chrome || this.notificationIcons.safari;
            }
            else if (Browser.safari) {
                return this.notificationIcons.safari || this.notificationIcons.chrome;
            }
        }
        else return `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2254%22%20height%3D%2255%22%3E%0D%0A%20%20%3Cg%20fill%3D%22%23BBB%22%20fill-rule%3D%22evenodd%22%3E%0D%0A%20%20%20%20%3Cpath%20d%3D%22M35.195%205H8.997C4.027%205%200%209.028%200%2013.997v32.006C0%2050.973%204.028%2055%208.997%2055h32.006C45.973%2055%2050%2050.972%2050%2046.003V18.476c-1.242.475-2.59.735-4%20.735v25.797C46%2048.317%2043.31%2051%2040.005%2051H9.995C6.685%2051%204%2048.31%204%2045.005v-30.01C4%2011.685%206.69%209%209.995%209h24.838c-.03-.33-.044-.663-.044-1%200-1.04.14-2.045.403-3z%22%2F%3E%0D%0A%20%20%20%20%3Cellipse%20cx%3D%2245.623%22%20cy%3D%228.623%22%20rx%3D%228.097%22%20ry%3D%228.097%22%2F%3E%0D%0A%20%20%20%20%3Cpath%20d%3D%22M10%2018h26v5H10zm0%2010h30v5H10zm0%2010h30v5H10z%22%2F%3E%0D%0A%20%20%3C%2Fg%3E%0D%0A%3C%2Fsvg%3E`;
    }

    get container() {
        return document.querySelector('#onesignal-popover-container');
    }

    get dialog() {
        return document.querySelector('#onesignal-popover-dialog');
    }

    get allowButton() {
        return document.querySelector('#onesignal-popover-allow-button');
    }

    get cancelButton() {
        return document.querySelector('#onesignal-popover-cancel-button');
    }

    get blockedCancelButton() {
        return document.querySelector('#onesignal-popover-blocked-cancel-button');
    }

    get blockedRetryButton() {
        return document.querySelector('#onesignal-popover-blocked-retry-button');
    }
}