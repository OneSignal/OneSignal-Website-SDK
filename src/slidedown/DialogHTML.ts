interface DialogProps {
    icon?: string;
    actionMessage?: string;
    positiveButtonText?: string;
    negativeButtonText?: string;
}

const defaultIcon = `data:image/svg+xml,%3Csvg fill='none' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cg clip-path='url(%23clip0)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M33.232 28.434a2.5 2.5 0 001.768.733 1.667 1.667 0 010 3.333H5a1.667 1.667 0 110-3.333 2.5 2.5 0 002.5-2.5v-8.104A13.262 13.262 0 0118.333 5.122V1.667a1.666 1.666 0 113.334 0v3.455A13.262 13.262 0 0132.5 18.563v8.104a2.5 2.5 0 00.732 1.767zM16.273 35h7.454a.413.413 0 01.413.37 4.167 4.167 0 11-8.28 0 .417.417 0 01.413-.37z' fill='%23BDC4CB'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0'%3E%3Cpath fill='%23fff' d='M0 0h40v40H0z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E`;

export default function getDialogHTML(dialogProps: DialogProps): string {
    const { icon, actionMessage, positiveButtonText, negativeButtonText } = dialogProps;
    return `<div id="normal-slidedown"><div class="slidedown-body" id="slidedown-body"><div class="slidedown-body-icon"><img alt="notification icon" class="${icon === 'default-icon' ? 'default-icon' : ''}" src="${icon === 'default-icon' ? defaultIcon : icon}"></div><div class="slidedown-body-message">${actionMessage}</div><div class="clearfix"></div><div id="onesignal-loading-container"></div></div><div class="slidedown-footer" id="slidedown-footer"><button id="onesignal-slidedown-allow-button" class="align-right primary slidedown-button">${positiveButtonText}</button><button id="onesignal-slidedown-cancel-button" class="align-right secondary slidedown-button">${negativeButtonText}</button><div class="clearfix"></div></div></div>`;
}