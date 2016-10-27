import { isPushNotificationsSupported, removeDomElement, addDomElement, clearDomElementChildren, addCssClass, removeCssClass, once, on, off, getConsoleStyle, delay, when, nothing, contains, decodeHtmlEntities } from '../utils.js';
import Environment from '../environment.js';
import log from 'loglevel';
import Event from '../events.js';
import Helpers from '../helpers';
import * as Browser from 'bowser';
import objectAssign from 'object-assign';
import { HOST_URL } from '../vars.js';

import "./httpModal.scss";


export default class HttpModal {

    static get EVENTS() {
        return {
            FINISH_CLICK: 'httpModalFinishClick',
            SHOWN: 'httpModalShown',
            CLOSED: 'httpModalClosed',
        };
    }

    constructor(options) {
        if (!options) {
            this.options = {};
        } else {
            this.options = objectAssign({}, options);
        }
        if (!this.options['finishMessage'] || typeof this.options['finishMessage'] !== "string")
            this.options['finishMessage'] = "Thanks for subscribing! Click Finish to complete the process.";
        if (!this.options['finishButtonText'] || typeof this.options['finishButtonText'] !== "string")
            this.options['finishButtonText'] = "Finish";
        this.options['finishMessage'] = this.options['finishMessage'].substring(0, 90);
        this.options['finishButtonText'] = this.options['finishButtonText'].substring(0, 15);
    }

    create() {
        try {
            // Remove any existing container
            if (this.container) {
                removeDomElement('#onesignal-http-modal-container');
            }

            let defaultIcon = `data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2239.5%22%20height%3D%2240.5%22%20viewBox%3D%220%200%2079%2081%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EOneSignal-Bell%3C%2Ftitle%3E%3Cg%20fill%3D%22%23BBB%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M39.96%2067.12H4.12s-3.2-.32-3.2-3.36%202.72-3.2%202.72-3.2%2010.72-5.12%2010.72-8.8c0-3.68-1.76-6.24-1.76-21.28%200-15.04%209.6-26.56%2021.12-26.56%200%200%201.6-3.84%206.24-3.84%204.48%200%206.08%203.84%206.08%203.84%2011.52%200%2021.12%2011.52%2021.12%2026.56s-1.6%2017.6-1.6%2021.28c0%203.68%2010.72%208.8%2010.72%208.8s2.72.16%202.72%203.2c0%202.88-3.36%203.36-3.36%203.36H39.96zM27%2070.8h24s-1.655%2010.08-11.917%2010.08S27%2070.8%2027%2070.8z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E`;

            let dialogHtml = `
                        <div id="onesignal-modal-dialog">
                            <div class="modal-body">
                                <div class="popover-body-icon default-icon" style="background-image: url('${defaultIcon}');">
                                </div>
                                <div class="popover-body-message">
                                    ${this.options['finishMessage']}                
                                </div>
                                <div class="clearfix"></div>
                            </div>
                            <div class="modal-footer">
                                <button id="onesignal-modal-finish-button" class="align-right primary modal-button">
                                ${this.options['finishButtonText']}</button>
                                <div class="clearfix"></div>
                            </div>
                        </div>                   
                    `;

            window.addDomElement = addDomElement;
            // Insert the container
            addDomElement('body', 'beforeend',
                '<div id="onesignal-modal-container" class="onesignal-modal-container onesignal-reset"></div>');
            // Insert the dialog
            addDomElement(this.container, 'beforeend', dialogHtml);
            // Add click event handlers
            this.finishButton.addEventListener('click', this.onHttpModalFinished.bind(this));
            Event.trigger(HttpModal.EVENTS.SHOWN);
        } catch (e) {
            log.error(e);
        }
    }

    onHttpModalFinished(e) {
        OneSignal.registerForPushNotifications({autoAccept: true});
        Event.trigger(HttpModal.EVENTS.FINISH_CLICK);
    }

    close() {
        addCssClass(this.container, 'close-modal');
        removeDomElement('#onesignal-modal-container');
        Event.trigger(HttpModal.EVENTS.CLOSED);
    }

    get container() {
        return document.querySelector('#onesignal-modal-container');
    }

    get dialog() {
        return document.querySelector('#onesignal-modal-dialog');
    }

    get finishButton() {
        return document.querySelector('#onesignal-modal-finish-button');
    }
}