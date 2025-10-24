export const WorkerMessengerCommand = {
  _WorkerVersion: 'GetWorkerVersion',
  _Subscribe: 'Subscribe',
  _SubscribeNew: 'SubscribeNew',
  _NotificationWillDisplay: 'notification.willDisplay',
  _NotificationClicked: 'notification.clicked',
  _NotificationDismissed: 'notification.dismissed',
  _SessionUpsert: 'os.session.upsert',
  _SessionDeactivate: 'os.session.deactivate',
  _AreYouVisible: 'os.page_focused_request',
  _AreYouVisibleResponse: 'os.page_focused_response',
  _SetLogging: 'os.set_sw_logging',
} as const;
