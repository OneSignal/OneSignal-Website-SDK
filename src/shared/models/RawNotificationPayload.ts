export interface RawNotificationPayload {
  title: string; // heading
  alert: string; // content
  custom: ICustomNotificationPayload;
  icon: string;
  image: string;
  tag: string;
  badge: string;
  vibrate: string;
  o: any[];
}

interface ICustomNotificationPayload {
  a: any;
  i: string;
  u: string;
  rr: string;
}
