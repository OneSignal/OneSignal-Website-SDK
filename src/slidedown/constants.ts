export const SLIDEDOWN_CSS_CLASSES = {
  allowButton: "onesignal-slidedown-allow-button",
  body: "slidedown-body",
  buttonIndicatorHolder: "onesignal-button-indicator-holder",
  cancelButton: "onesignal-slidedown-cancel-button",
  container: "onesignal-slidedown-container",
  dialog: "onesignal-slidedown-dialog",
  footer: "slidedown-footer",
  reset: "onesignal-reset",
  savingStateButton: "onesignal-saving-state-button",
  slideUp: 'slide-up',
  slideDown: 'slide-down',
  closeSlidedown: 'close-slidedown',
  icon: 'slidedown-body-icon',
  message: 'slidedown-body-message',
  defaultIcon: 'default-icon',
  loadingContainer: "onesignal-loading-container",
  clearfix: "clearfix"
};

export const TOAST_CLASSES = {
  toastText: 'onesignal-toast-text'
};

export const TOAST_IDS = {
  toastText: 'onesignal-toast-text'
};

export const SLIDEDOWN_CSS_IDS = {
  allowButton: "onesignal-slidedown-allow-button",
  body: "slidedown-body",
  buttonIndicatorHolder: "onesignal-button-indicator-holder",
  cancelButton: "onesignal-slidedown-cancel-button",
  container: "onesignal-slidedown-container",
  dialog: "onesignal-slidedown-dialog",
  footer: "slidedown-footer",
  normalSlidedown: "normal-slidedown",
  loadingContainer: "onesignal-loading-container",
};

export const SLIDEDOWN_BUTTON_CLASSES = {
  alignRight: 'align-right',
  primary: 'primary',
  secondary: 'secondary',
  slidedownButton: 'slidedown-button'
};

export const TAGGING_CONTAINER_CSS_CLASSES = {
  categoryLabelInput: "onesignal-category-label-input",
  categoryLabelText: "onesignal-category-label-text",
  categoryLabel: "onesignal-category-label",
  checkmark: "onesignal-checkmark",
  taggingContainer: "tagging-container",
  taggingContainerCol: "tagging-container-col",
  loadingMessage: "onesignal-loading-message"
};

export const TAGGING_CONTAINER_CSS_IDS = {
  taggingContainer: "tagging-container",
};

export const COLORS = {
  greyLoadingIndicator: "#95A1AC",
  whiteLoadingIndicator: "#FFFFFF"
};

export const TAGGING_CONTAINER_STRINGS = {
  fetchingPreferences : "Fetching your preferences"
};


export const CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES = {
  channelCaptureContainer           : 'channel-capture-container',
  inputWithValidationElement        : 'input-with-validation-element',
  onesignalErrorInput               : 'onesignal-error-input',
  onesignalSmsInput                 : 'iti-onesignal-sms-input',
  onesignalEmailInput               : 'onesignal-email-input',
  onesignalValidationElementHidden  : 'onesignal-validation-element-hidden',
  onesignalValidationElement        : 'onesignal-validation-element',
};

export const CHANNEL_CAPTURE_CONTAINER_CSS_IDS = {
  channelCaptureContainer         : 'channel-capture-container', // currently unused
  smsInputWithValidationElement   : 'sms-input-with-validation-element',
  emailInputWithValidationElement : 'email-input-with-validation-element',
  onesignalSmsInput               : 'iti-onesignal-sms-input',
  onesignalEmailInput             : 'onesignal-email-input',
  onesignalSmsValidationElement   : 'onesignal-sms-validation-element',
  onesignalEmailValidationElement : 'onesignal-email-validation-element',
};

const STATE = {
  subscribed  : "state-subscribed",
  unsubscribed: "state-unsubscribed",
};

export const CUSTOM_LINK_CSS_CLASSES = {
  containerClass   : "onesignal-customlink-container",
  subscribeClass   : "onesignal-customlink-subscribe",
  explanationClass : "onesignal-customlink-explanation",
  resetClass       : "onesignal-reset",
  hide             : "hide",
  state            : STATE,
};

export const CUSTOM_LINK_CSS_SELECTORS = {
  containerSelector   : `.${CUSTOM_LINK_CSS_CLASSES.containerClass}`,
  subscribeSelector   : `.${CUSTOM_LINK_CSS_CLASSES.subscribeClass}`,
  explanationSelector : `.${CUSTOM_LINK_CSS_CLASSES.explanationClass}`,
};
