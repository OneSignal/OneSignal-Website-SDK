export const WorkerMessengerCommand = {
  _WorkerVersion: 'GetWorkerVersion',
  _Subscribe: 'Subscribe',
  _SubscribeNew: 'SubscribeNew',
  _NotificationWillDisplay: 'notification.willDisplay',
  _NotificationWillDisplayResponse: 'notification.willDisplay.response',
  _DisplayNotification: 'notification.display',
  _NotificationClicked: 'notification.clicked',
  _NotificationDismissed: 'notification.dismissed',
  _SessionUpsert: 'os.session.upsert',
  _SessionDeactivate: 'os.session.deactivate',
  _AreYouVisible: 'os.page_focused_request',
  _AreYouVisibleResponse: 'os.page_focused_response',
  _SetLogging: 'os.set_sw_logging',
  _JwtUnauthorized: 'os.jwt.unauthorized',
} as const;

/** The server rejected a signed worker request. The page owns the token store. */
export interface JwtUnauthorizedPayload {
  readonly externalId: string;
  readonly jwt: string;
}

export interface NotificationWillDisplayResponsePayload {
  readonly notificationId: string;
  readonly preventDefault: boolean;
}
