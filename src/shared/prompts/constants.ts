export const DelayedPromptType = {
  Native: 'native', // native push
  Push: 'push', // slidedown w/ push only
  Category: 'category', // slidedown w/ push + categories
  Sms: 'sms', // sms only
  Email: 'email', // email only
  SmsAndEmail: 'smsAndEmail', // sms and email only
} as const;
