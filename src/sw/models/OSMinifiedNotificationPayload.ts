import type {
  IOSNotification,
  IOSNotificationActionButton,
} from 'src/shared/models/OSNotification';

// This is the raw payload that OneSignal sends
export interface OSMinifiedNotificationPayload {
  readonly title?: string;
  readonly alert: string;
  readonly custom: OSMinifiedCustomNotificationPayload;
  readonly icon?: string;
  readonly image?: string;
  readonly tag?: string;
  readonly badge?: string;
  readonly vibrate?: string;
  readonly o?: OSMinifiedButtonsPayload[];
}

export interface OSMinifiedCustomNotificationPayload {
  readonly i: string;
  readonly a?: any;
  readonly u?: string;
  readonly rr?: string;
}

export interface OSMinifiedButtonsPayload {
  readonly i: string;
  readonly n: string;
  readonly p?: string;
  readonly u?: string;
}

export class OSMinifiedNotificationPayloadHelper {
  static toOSNotification(
    payload: OSMinifiedNotificationPayload,
  ): IOSNotification {
    return {
      notificationId: payload.custom.i,
      title: payload.title,
      body: payload.alert,
      additionalData: payload.custom.a,
      launchURL: payload.custom.u,
      confirmDelivery: payload.custom.rr === 'y',
      icon: payload.icon,
      image: payload.image,
      actionButtons: this.convertButtons(payload.o),
      topic: payload.tag,
      badgeIcon: payload.badge,
    };
  }

  private static convertButtons(
    payloadButtons?: OSMinifiedButtonsPayload[],
  ): IOSNotificationActionButton[] | undefined {
    return payloadButtons?.map(
      (button): IOSNotificationActionButton => ({
        actionId: button.i,
        text: button.n,
        icon: button.p,
        launchURL: button.u,
      }),
    );
  }

  static isValid(payload: any): boolean {
    return typeof payload?.custom?.i === 'string';
  }
}
