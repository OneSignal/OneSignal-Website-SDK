export interface OutcomesNotificationReceived {
  readonly appId: string;
  readonly notificationId: string;
  readonly timestamp: number;
}

export interface OutcomesNotificationClicked {
  readonly appId: string;
  readonly notificationId: string;
  readonly timestamp: number;
}
