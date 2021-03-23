export enum DismissPrompt {
  Push = 'push',
  Web  = 'web' // (non-push)
}

export enum DismissCountKey {
PromptDismissCount = 'promptDismissCount', // legacy. applies to 'push' and 'category' slidedown types + native
  WebPromptsDismissCount = 'webPromptsDismissCount' // applies to all new slidedown types (e.g: smsAndEmail)
}

export enum DismissTimeKey {
  // legacy. applies to 'push' and 'category' slidedown types + native prompt
  OneSignalNotificationPrompt = 'onesignal-notification-prompt',
  // applies to all new slidedown types (e.g: smsAndEmail)
  OneSignalWebPrompt          = 'onesignal-web-prompt'
}
