import { SlidedownHtmlProps } from "./types";
import { DEFAULT_ICON } from "./constants";

export function getSlidedownHtml(dialogProps: SlidedownHtmlProps): string {
    const { icon, messageText, positiveButtonText, negativeButtonText } = dialogProps;

    const finalIcon = icon === 'default-icon' ? DEFAULT_ICON : icon;
    const finalIconClass = icon === 'default-icon' ? 'default-icon' : '';

    return `` +
        `<div id="normal-slidedown">` +
            `<div class="slidedown-body" id="slidedown-body">` +
                `<div class="slidedown-body-icon">` +
                    `<img alt="notification icon" class="${finalIconClass}" src="${finalIcon}" />` +
                `</div>` +
                `<div class="slidedown-body-message">${messageText}</div>` +
                `<div class="clearfix"></div>` +
                `<div id="onesignal-loading-container"></div>` +
            `</div>` +
            `<div class="slidedown-footer" id="slidedown-footer">` +
                `<button id="onesignal-slidedown-allow-button" ` +
                    `class="align-right primary slidedown-button">${positiveButtonText}</button>` +
                `<button id="onesignal-slidedown-cancel-button" ` +
                    `class="align-right secondary slidedown-button">${negativeButtonText}</button>` +
                `<div class="clearfix"></div>` +
            `</div>` +
        `</div>`;
}
