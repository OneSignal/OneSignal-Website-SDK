import { OSMinifiedNotificationPayload } from "./OSMinifiedNotificationPayload";
import { IOSNotificationPayload, INotificationButtonPayload } from "../../shared/models/IOSNotificationPayload";

export class OSNotificationPayload implements IOSNotificationPayload {
  id: string;
  body: string;
  title?: string | undefined;
  url?: string | undefined;
  data?: object | undefined;
  confirmDelivery: boolean;
  icon?: string | undefined;
  image?: string | undefined;
  tag?: string | undefined;
  badge?: string | undefined;
  vibrate?: VibratePattern | undefined;
  buttons?: INotificationButtonPayload[] | undefined;

  constructor(payload: OSMinifiedNotificationPayload) {
    this.id = payload.custom.i;
    this.title = payload.title;
    this.body = payload.alert;
    this.data = payload.custom.a;
    this.url = payload.custom.u;
    this.confirmDelivery = payload.custom.rr === "y";
    this.icon = payload.icon;
    this.image = payload.image;
    this.tag = payload.tag;
    this.badge = payload.badge;
    this.vibrate = Number(payload.vibrate);

    if (payload.o) {
      this.buttons = [];
      for (const rawButton of payload.o) {
        this.buttons.push({
          action: rawButton.i,
          title: rawButton.n,
          icon: rawButton.p,
          url: rawButton.u,
        });
      }
    }
  }
}
