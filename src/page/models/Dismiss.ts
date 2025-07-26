export const DismissPrompt = {
  Push: 'push',
  NonPush: 'nonPush',
} as const;

export type DismissPromptValue =
  (typeof DismissPrompt)[keyof typeof DismissPrompt];

export const DismissCountKey = {
  PromptDismissCount: 'promptDismissCount', // legacy. applies to 'push' and 'category' slidedown types + native
  NonPushPromptsDismissCount: 'nonPushPromptsDismissCount', // applies to all new slidedown types (e.g: smsAndEmail)
} as const;

export const DismissTimeKey = {
  // legacy. applies to 'push' and 'category' slidedown types + native prompt
  OneSignalNotificationPrompt: 'onesignal-notification-prompt',
  // applies to all new slidedown types (e.g: smsAndEmail)
  OneSignalNonPushPrompt: 'onesignal-non-push-prompt',
} as const;
