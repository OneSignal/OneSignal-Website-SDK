interface SubscriptionBase {
  subscriptionId: string;
  enabled: boolean;
}

interface PushSub extends SubscriptionBase {
  pushToken: string;
}

interface EmailSub extends SubscriptionBase {
  email: string;
}
interface SmsSub extends SubscriptionBase {
  sms: string;
}

enum SubscriptionChangeEvent {
  PushChanged = "pushChanged",
  EmailChanged = "emailChanged",
  SmsChanged = "smsChanged"
}

export interface Subscriptions {
  push: PushSub;
  email: EmailSub[];
  sms: SmsSub[];
  // internal
  on: (changeEvent: SubscriptionChangeEvent, callback: (curr: object, prev: object) => void) => void;
}
