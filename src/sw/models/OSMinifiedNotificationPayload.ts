export interface OSMinifiedNotificationPayload {
  readonly title: string;
  readonly alert: string;
  readonly custom: OSMinifiedCustomNotificationPayload;
  readonly icon: string;
  readonly image: string;
  readonly tag: string;
  readonly badge: string;
  readonly vibrate: string;
  readonly o?: OSMinifiedButtonsPayload[];
}

interface OSMinifiedCustomNotificationPayload {
  readonly a: any;
  readonly i: string;
  readonly u: string;
  readonly rr: string;
}

interface OSMinifiedButtonsPayload {
  readonly i: string;
  readonly n: string;
  readonly p?: string;
  readonly u?: string
}
