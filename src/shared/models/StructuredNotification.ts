type StructuredNotification = {
  id?: string;
  heading?: string;
  content?: string;
  url?: string;
  data?: object;
  rr?: string;
  icon?: string;
  image?: string;
  tag?: string;
  badge?: string;
  vibrate?: string;
  buttons?: NotificationButtonData[];
};

type NotificationButtonData = {
  action?: string;
  title?: string;
  icon?: string;
  url?: string;
};
