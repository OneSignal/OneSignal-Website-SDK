export const DismissPrompt = {
  _Push: 0,
  _NonPush: 1,
} as const;

export type DismissPromptValue =
  (typeof DismissPrompt)[keyof typeof DismissPrompt];

export const DismissCountKey = {
  _PromptDismissCount: 'promptDismissCount', // legacy. applies to 'push' and 'category' slidedown types + native
  _NonPushPromptsDismissCount: 'nonPushPromptsDismissCount', // applies to all new slidedown types (e.g: smsAndEmail)
} as const;

export const DismissTimeKey = {
  // legacy. applies to 'push' and 'category' slidedown types + native prompt
  _OneSignalNotificationPrompt: 'onesignal-notification-prompt',
  // applies to all new slidedown types (e.g: smsAndEmail)
  _OneSignalNonPushPrompt: 'onesignal-non-push-prompt',
} as const;
