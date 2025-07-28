import type { SlidedownPromptOptions } from './types';

export const DelayedPromptType = {
  Native: 'native', // native push
  Push: 'push', // slidedown w/ push only
  Category: 'category', // slidedown w/ push + categories
  Sms: 'sms', // sms only
  Email: 'email', // email only
  SmsAndEmail: 'smsAndEmail', // sms and email only
} as const;

export const SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS = {
  pageViews: 1,
  timeDelay: 0,
};

export const SERVER_CONFIG_DEFAULTS_SLIDEDOWN = {
  actionMessage:
    "We'd like to show you notifications for the latest news and updates.",
  acceptButton: 'Allow',
  cancelButton: 'Cancel',
  errorButton: 'Try Again',
  categoryDefaults: {
    updateMessage: 'Update your push notification subscription preferences.',
    positiveUpdateButton: 'Save Preferences',
    negativeUpdateButton: 'Cancel',
  },
  savingText: 'Saving...',
  confirmMessage: 'Thank You!',
};

export const CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS: SlidedownPromptOptions = {
  type: DelayedPromptType.Push,
  text: {
    actionMessage: SERVER_CONFIG_DEFAULTS_SLIDEDOWN.actionMessage,
    acceptButton: SERVER_CONFIG_DEFAULTS_SLIDEDOWN.acceptButton,
    cancelButton: SERVER_CONFIG_DEFAULTS_SLIDEDOWN.cancelButton,
  },
  autoPrompt: false, // default to false
  delay: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS,
};
