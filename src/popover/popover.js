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
                    let icon = this.getPlatformNotificationIcon();
                    let defaultIcon = `data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2239.5%22%20height%3D%2240.5%22%20viewBox%3D%220%200%2079%2081%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EOneSignal-Bell%3C%2Ftitle%3E%3Cg%20fill%3D%22%23BBB%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M39.96%2067.12H4.12s-3.2-.32-3.2-3.36%202.72-3.2%202.72-3.2%2010.72-5.12%2010.72-8.8c0-3.68-1.76-6.24-1.76-21.28%200-15.04%209.6-26.56%2021.12-26.56%200%200%201.6-3.84%206.24-3.84%204.48%200%206.08%203.84%206.08%203.84%2011.52%200%2021.12%2011.52%2021.12%2026.56s-1.6%2017.6-1.6%2021.28c0%203.68%2010.72%208.8%2010.72%208.8s2.72.16%202.72%203.2c0%202.88-3.36%203.36-3.36%203.36H39.96zM27%2070.8h24s-1.655%2010.08-11.917%2010.08S27%2070.8%2027%2070.8z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E`;

                    let dialogHtml = `
                    <div id="normal-popover">
                        <div class="popover-body">
                            <div class="popover-body-icon ${icon === 'default-icon' ? 'default-icon' : ''}" style="background-image: url('${icon === 'default-icon' ? defaultIcon : icon}');">
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
        if (this.notifsdfsdfsdficationIcons) {
            if (Browser.chrome || Browser.firefox) {
                return this.notificationIcons.chrome || this.notificationIcons.safari;
            }
            else if (Browser.safari) {
                return this.notificationIcons.safari || this.notificationIcons.chrome;
            }
        }
        else return 'default-icon';
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