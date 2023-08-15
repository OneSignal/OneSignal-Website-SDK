import { SlidedownHtmlProps } from "./types";
import { DEFAULT_ICON, SLIDEDOWN_CSS_IDS, SLIDEDOWN_CSS_CLASSES, SLIDEDOWN_BUTTON_CLASSES } from "../../shared/slidedown/constants";
import { addCssClass } from '../../shared/utils/utils';

export function getSlidedownElement(dialogProps: SlidedownHtmlProps): Element {
    const { icon, messageText, positiveButtonText, negativeButtonText } = dialogProps;

    const finalIcon = icon === SLIDEDOWN_CSS_CLASSES.defaultIcon ? DEFAULT_ICON : icon;
    const finalIconClass = icon === SLIDEDOWN_CSS_CLASSES.defaultIcon ? SLIDEDOWN_CSS_CLASSES.defaultIcon : '';

    const normalSlidedown   = document.createElement("div");
    const slidedownBody     = document.createElement("div");
    const bodyMessage       = document.createElement("div");
    const slidedownBodyIcon = document.createElement("div");
    const loadingContainer  = document.createElement("div");
    const slidedownFooter   = document.createElement("div");
    const positiveButton    = document.createElement("button");
    const negativeButton    = document.createElement("button");
    const clearfix          = document.createElement("div");
    const clearfix2         = document.createElement("div");
    const image             = document.createElement("img");

    addCssClass(slidedownBody, SLIDEDOWN_CSS_CLASSES.body);
    addCssClass(slidedownBodyIcon, SLIDEDOWN_CSS_CLASSES.icon);
    addCssClass(bodyMessage, SLIDEDOWN_CSS_CLASSES.message);
    addCssClass(slidedownFooter, SLIDEDOWN_CSS_CLASSES.footer);
    addCssClass(clearfix, SLIDEDOWN_CSS_CLASSES.clearfix);
    addCssClass(clearfix2, SLIDEDOWN_CSS_CLASSES.clearfix);
    addCssClass(positiveButton, SLIDEDOWN_BUTTON_CLASSES.alignRight);
    addCssClass(positiveButton, SLIDEDOWN_BUTTON_CLASSES.primary);
    addCssClass(positiveButton, SLIDEDOWN_BUTTON_CLASSES.slidedownButton);
    addCssClass(negativeButton, SLIDEDOWN_BUTTON_CLASSES.alignRight);
    addCssClass(negativeButton, SLIDEDOWN_BUTTON_CLASSES.secondary);
    addCssClass(negativeButton, SLIDEDOWN_BUTTON_CLASSES.slidedownButton);

    normalSlidedown.id  = SLIDEDOWN_CSS_IDS.normalSlidedown;
    slidedownBody.id    = SLIDEDOWN_CSS_IDS.body;
    loadingContainer.id = SLIDEDOWN_CSS_IDS.loadingContainer;
    positiveButton.id   = SLIDEDOWN_CSS_IDS.allowButton;
    negativeButton.id   = SLIDEDOWN_CSS_IDS.cancelButton;
    slidedownFooter.id  = SLIDEDOWN_CSS_IDS.footer;

    if (finalIconClass) {
        addCssClass(image, finalIconClass);
    }

    image.setAttribute("alt", "notification icon");
    image.setAttribute("src", finalIcon || '');

    bodyMessage.innerText = messageText || '';
    positiveButton.innerText = positiveButtonText || '';
    negativeButton.innerText = negativeButtonText || '';

    slidedownBodyIcon.appendChild(image);

    slidedownBody.appendChild(slidedownBodyIcon);
    slidedownBody.appendChild(bodyMessage);
    slidedownBody.appendChild(clearfix);
    slidedownBody.appendChild(loadingContainer);

    slidedownFooter.appendChild(positiveButton);
    slidedownFooter.appendChild(negativeButton);
    slidedownFooter.appendChild(clearfix2);

    normalSlidedown.appendChild(slidedownBody);
    normalSlidedown.appendChild(slidedownFooter);

    return normalSlidedown;
}
