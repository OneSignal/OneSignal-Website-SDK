import * as log from 'loglevel';
import * as objectAssign from 'object-assign';

import Event from '../Event';
import { addCssClass, addDomElement, removeDomElement } from '../utils';



export default class HttpModal {

    public options: any;

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
        if (!this.options['modalTitle'] || typeof this.options['modalTitle'] !== "string")
            this.options['modalTitle'] = "Thanks for subscribing";
        if (!this.options['modalMessage'] || typeof this.options['modalMessage'] !== "string")
            this.options['modalMessage'] = "You're now subscribed to notifications. You can unsubscribe at any time.";
        if (!this.options['modalButtonText'] || typeof this.options['modalButtonText'] !== "string")
            this.options['modalButtonText'] = "Close";
        this.options['modalTitle'] = this.options['modalTitle'].substring(0, 50);
        this.options['modalMessage'] = this.options['modalMessage'].substring(0, 90);
        this.options['modalButtonText'] = this.options['modalButtonText'].substring(0, 35);
    }

    create() {
        try {
            // Remove any existing container
            if (this.container) {
                removeDomElement('#onesignal-modal-container');
            }

            let dialogHtml = `<div id="onesignal-modal-dialog"><div class="modal-exit">&times;</div><div class="modal-body"><div class="modal-body-title">${this.options['modalTitle']}</div><div class="modal-body-message">${this.options['modalMessage']}</div><div class="clearfix"></div></div><div class="modal-footer"><button id="onesignal-modal-finish-button" class="primary modal-button">${this.options['modalButtonText']}</button><div class="clearfix"></div></div></div>`;

            // Insert the container
            addDomElement('body', 'beforeend',
                '<div id="onesignal-modal-container" class="onesignal-modal-container onesignal-reset"></div>');
            // Insert the dialog
            addDomElement(this.container, 'beforeend', dialogHtml);
            // Add click event handlers
            this.container.addEventListener('click', this.onHttpModalFinished.bind(this));
            Event.trigger(HttpModal.EVENTS.SHOWN);
        } catch (e) {
            log.error(e);
        }
    }

    onHttpModalFinished(_) {
        OneSignal.registerForPushNotifications({httpPermissionRequest: true});
        Event.trigger(HttpModal.EVENTS.FINISH_CLICK);
        this.close();
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
