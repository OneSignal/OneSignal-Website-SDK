export enum DismissPrompt {
  Push = 'push',
  NonPush  = 'nonPush'
}

export enum DismissCountKey {
  PromptDismissCount = 'promptDismissCount', // legacy. applies to 'push' and 'category' slidedown types + native
  NonPushPromptsDismissCount = 'nonPushPromptsDismissCount' // applies to all new slidedown types (e.g: smsAndEmail)
}

export enum DismissTimeKey {
  // legacy. applies to 'push' and 'category' slidedown types + native prompt
  OneSignalNotificationPrompt = 'onesignal-notification-prompt',
  // applies to all new slidedown types (e.g: smsAndEmail)
  OneSignalNonPushPrompt          = 'onesignal-non-push-prompt'
}
