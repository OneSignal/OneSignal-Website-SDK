export const BellState = {
  _Uninitialized: 0,
  _Subscribed: 1,
  _Unsubscribed: 2,
  _Blocked: 3,
} as const;

export const BellEvent = {
  _StateChanged: 'notifyButtonStateChange',
  _LauncherClick: 'notifyButtonLauncherClick',
  _BellClick: 'notifyButtonButtonClick',
  _SubscribeClick: 'notifyButtonSubscribeClick',
  _UnsubscribeClick: 'notifyButtonUnsubscribeClick',
  _Hovering: 'notifyButtonHovering',
  _Hovered: 'notifyButtonHover',
} as const;

export const MesageType = {
  _Tip: 'tip', // Appears on button hover, disappears on button endhover
  _Message: 'message', // Appears manually for a specified duration, site visitor cannot control its display. Messages override tips
  _Queued: 'queued', // This message was a user-queued message
} as const;

export const MESSAGE_TIMEOUT = 2500;

export type BellStateType = (typeof BellState)[keyof typeof BellState];
