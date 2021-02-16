import { DelayedPromptType, SlidedownPromptOptions } from "../../src/models/Prompts";

export const SERVER_CONFIG_DEFAULTS_SESSION = {
  reportingThreshold: 30,
  enableOnSessionForUnsubcribed: false,
  enableOnFocus: true,
};

export const SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS = {
  pageViews: 1,
  timeDelay: 0
};

export const SERVER_CONFIG_DEFAULTS_SLIDEDOWN = {
  actionMessage: "We'd like to show you notifications for the latest news and updates.",
  acceptButton: "Allow",
  cancelButton: "Cancel",
  errorButton: "Try Again",
  categoryDefaults: {
    updateMessage: "Update your push notification subscription preferences.",
    positiveUpdateButton: "Save Preferences",
    negativeUpdateButton: "Cancel"
  },
  savingText: "Saving...",
};

export const CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS: SlidedownPromptOptions = {
  type        : DelayedPromptType.Push,
  text        : {
    actionMessage : SERVER_CONFIG_DEFAULTS_SLIDEDOWN.actionMessage,
    acceptButton  : SERVER_CONFIG_DEFAULTS_SLIDEDOWN.acceptButton,
    cancelButton  : SERVER_CONFIG_DEFAULTS_SLIDEDOWN.cancelButton
  },
  autoPrompt  : false, // default to false
  delay       : SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS
};
