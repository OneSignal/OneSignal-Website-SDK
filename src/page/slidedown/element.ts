import { addCssClass } from 'src/shared/helpers/dom';
import {
  DEFAULT_ICON,
  SLIDEDOWN_BUTTON_CLASSES,
  SLIDEDOWN_CSS_CLASSES,
  SLIDEDOWN_CSS_IDS,
} from 'src/shared/slidedown/constants';
import type { SlidedownHtmlProps } from './types';

export function getSlidedownElement(dialogProps: SlidedownHtmlProps): Element {
  const { icon, messageText, positiveButtonText, negativeButtonText } =
    dialogProps;

  const finalIcon =
    icon === SLIDEDOWN_CSS_CLASSES._DefaultIcon ? DEFAULT_ICON : icon;
  const finalIconClass =
    icon === SLIDEDOWN_CSS_CLASSES._DefaultIcon
      ? SLIDEDOWN_CSS_CLASSES._DefaultIcon
      : '';

  const normalSlidedown = document.createElement('div');
  const slidedownBody = document.createElement('div');
  const bodyMessage = document.createElement('div');
  const slidedownBodyIcon = document.createElement('div');
  const loadingContainer = document.createElement('div');
  const slidedownFooter = document.createElement('div');
  const positiveButton = document.createElement('button');
  const negativeButton = document.createElement('button');
  const clearfix = document.createElement('div');
  const clearfix2 = document.createElement('div');
  const image = document.createElement('img');

  addCssClass(slidedownBody, SLIDEDOWN_CSS_CLASSES._Body);
  addCssClass(slidedownBodyIcon, SLIDEDOWN_CSS_CLASSES._Icon);
  addCssClass(bodyMessage, SLIDEDOWN_CSS_CLASSES._Message);
  addCssClass(slidedownFooter, SLIDEDOWN_CSS_CLASSES._Footer);
  addCssClass(clearfix, SLIDEDOWN_CSS_CLASSES._Clearfix);
  addCssClass(clearfix2, SLIDEDOWN_CSS_CLASSES._Clearfix);
  addCssClass(positiveButton, SLIDEDOWN_BUTTON_CLASSES._AlignRight);
  addCssClass(positiveButton, SLIDEDOWN_BUTTON_CLASSES._Primary);
  addCssClass(positiveButton, SLIDEDOWN_BUTTON_CLASSES._SlidedownButton);
  addCssClass(negativeButton, SLIDEDOWN_BUTTON_CLASSES._AlignRight);
  addCssClass(negativeButton, SLIDEDOWN_BUTTON_CLASSES._Secondary);
  addCssClass(negativeButton, SLIDEDOWN_BUTTON_CLASSES._SlidedownButton);

  normalSlidedown.id = SLIDEDOWN_CSS_IDS._NormalSlidedown;
  slidedownBody.id = SLIDEDOWN_CSS_IDS._Body;
  loadingContainer.id = SLIDEDOWN_CSS_IDS._LoadingContainer;
  positiveButton.id = SLIDEDOWN_CSS_IDS._AllowButton;
  negativeButton.id = SLIDEDOWN_CSS_IDS._CancelButton;
  slidedownFooter.id = SLIDEDOWN_CSS_IDS._Footer;

  if (finalIconClass) {
    addCssClass(image, finalIconClass);
  }

  image.setAttribute('alt', 'notification icon');
  image.setAttribute('src', finalIcon || '');

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
