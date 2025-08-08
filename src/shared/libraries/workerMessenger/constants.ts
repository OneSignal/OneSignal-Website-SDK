export const WorkerMessengerCommand = {
  WorkerVersion: 'GetWorkerVersion',
  Subscribe: 'Subscribe',
  SubscribeNew: 'SubscribeNew',
  NotificationWillDisplay: 'notification.willDisplay',
  NotificationClicked: 'notification.clicked',
  NotificationDismissed: 'notification.dismissed',
  RedirectPage: 'command.redirect',
  SessionUpsert: 'os.session.upsert',
  SessionDeactivate: 'os.session.deactivate',
  AreYouVisible: 'os.page_focused_request',
  AreYouVisibleResponse: 'os.page_focused_response',
  SetLogging: 'os.set_sw_logging',
} as const;
