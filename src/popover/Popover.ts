import * as Browser from 'bowser';
import * as objectAssign from 'object-assign';

import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import { addCssClass, addDomElement, once, removeDomElement, isChromeLikeBrowser } from '../utils';
import { AppUserConfigPromptOptions } from '../models/AppConfig';

export interface SlidedownPermissionMessageOptions {
  autoPrompt: boolean;
  actionMessage: string;
  acceptButtonText: string;
  cancelButtonText: string;
}

export default class Popover {

    public options: AppUserConfigPromptOptions;
    public notificationIcons: any;

    static get EVENTS() {
        return {
            ALLOW_CLICK: 'popoverAllowClick',
            CANCEL_CLICK: 'popoverCancelClick',
            SHOWN: 'popoverShown',
            CLOSED: 'popoverClosed',
        };
    }

    constructor(options: AppUserConfigPromptOptions) {
        if (!options) {
            (this.options as any) = {};
        } else {
            this.options = objectAssign({}, options);
        }
        if (!this.options['actionMessage'] || typeof this.options['actionMessage'] !== "string")
            this.options['actionMessage'] = "We'd like to show you notifications for the latest news and updates.";
        if (!this.options['acceptButtonText'] || typeof this.options['acceptButtonText'] !== "string")
            this.options['acceptButtonText'] = "Allow";
        if (!this.options['cancelButtonText'] || typeof this.options['cancelButtonText'] !== "string")
            this.options['cancelButtonText'] = "No Thanks";
        this.options['actionMessage'] = this.options['actionMessage'].substring(0, 90);
        this.options['acceptButtonText'] = this.options['acceptButtonText'].substring(0, 15);
        this.options['cancelButtonText'] = this.options['cancelButtonText'].substring(0, 15);

        this.notificationIcons = null;
    }

    async create() {
        if (this.notificationIcons === null) {
            const icons = await MainHelper.getNotificationIcons();

            this.notificationIcons = icons;

            // Remove any existing container
            if (this.container) {
                removeDomElement('#onesignal-popover-container');
            }

            let icon = this.getPlatformNotificationIcon();
            let defaultIcon = `data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2239.5%22%20height%3D%2240.5%22%20viewBox%3D%220%200%2079%2081%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EOneSignal-Bell%3C%2Ftitle%3E%3Cg%20fill%3D%22%23BBB%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M39.96%2067.12H4.12s-3.2-.32-3.2-3.36%202.72-3.2%202.72-3.2%2010.72-5.12%2010.72-8.8c0-3.68-1.76-6.24-1.76-21.28%200-15.04%209.6-26.56%2021.12-26.56%200%200%201.6-3.84%206.24-3.84%204.48%200%206.08%203.84%206.08%203.84%2011.52%200%2021.12%2011.52%2021.12%2026.56s-1.6%2017.6-1.6%2021.28c0%203.68%2010.72%208.8%2010.72%208.8s2.72.16%202.72%203.2c0%202.88-3.36%203.36-3.36%203.36H39.96zM27%2070.8h24s-1.655%2010.08-11.917%2010.08S27%2070.8%2027%2070.8z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E`;

            let dialogHtml = `<div id="normal-popover"><div class="popover-body"><div class="popover-body-icon"><img class="${icon === 'default-icon' ? 'default-icon' : ''}" src="${icon === 'default-icon' ? defaultIcon : icon}"></div><div class="popover-body-message">${this.options['actionMessage']}</div><div class="clearfix"></div></div><div class="popover-footer"><button id="onesignal-popover-allow-button" class="align-right primary popover-button">${this.options['acceptButtonText']}</button><button id="onesignal-popover-cancel-button" class="align-right secondary popover-button">${this.options['cancelButtonText']}</button><div class="clearfix"></div></div></div>`;

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
            Event.trigger(Popover.EVENTS.SHOWN);
        }
    }

    onPopoverAllowed(_) {
        Event.trigger(Popover.EVENTS.ALLOW_CLICK);
    }

    onPopoverCanceled(_) {
        Event.trigger(Popover.EVENTS.CANCEL_CLICK);
        this.close();
    }

    close() {
        addCssClass(this.container, 'close-popover');
        once(this.dialog, 'animationend', (event, destroyListenerFn) => {
            if (event.target === this.dialog &&
                (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
                // Uninstall the event listener for animationend
                removeDomElement('#onesignal-popover-container');
                destroyListenerFn();
                Event.trigger(Popover.EVENTS.CLOSED);
            }
        }, true);
    }

    getPlatformNotificationIcon() {
        if (this.notificationIcons) {
            if (isChromeLikeBrowser() || Browser.firefox || Browser.msedge) {
                if (this.notificationIcons.chrome) {
                    return this.notificationIcons.chrome;
                } else if (this.notificationIcons.firefox) {
                    return this.notificationIcons.firefox;
                } else {
                    return 'default-icon';
                }
            }
            else if (Browser.safari) {
                if (this.notificationIcons.safari) {
                    return this.notificationIcons.safari;
                } else if (this.notificationIcons.chrome) {
                    return this.notificationIcons.chrome;
                } else {
                    return 'default-icon';
                }
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
}
