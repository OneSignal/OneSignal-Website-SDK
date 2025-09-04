export const MESSAGE_TIMEOUT = 2500;

export const MessageType = {
  _Tip: 'tip', // Appears on button hover, disappears on button endhover
  _Message: 'message', // Appears manually for a specified duration, site visitor cannot control its display. Messages override tips
  _Queued: 'queued', // This message was a user-queued message
} as const;

// Button IDs
export const SUBSCRIBE_BUTTON_ID = 'subscribe-button';
export const UNSUBSCRIBE_BUTTON_ID = 'unsubscribe-button';

export const Events = {
  StateChanged: 'notify0',
  LauncherClick: 'notify1',
  BellClick: 'notify2',
  SubscribeClick: 'notify3',
  UnsubscribeClick: 'notify4',
  Hovering: 'notify5',
  Hovered: 'notify6',
};
