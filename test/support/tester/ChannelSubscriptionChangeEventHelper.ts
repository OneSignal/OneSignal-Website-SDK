type ChannelSubscriptionChangeEvent =
  | 'smsSubscriptionChanged'
  | 'emailSubscriptionChanged';

export function awaitSubscriptionChangeEvent(
  changeEvent: ChannelSubscriptionChangeEvent,
): Promise<object> {
  return new Promise<object>((resolve) => {
    OneSignal.on(changeEvent, (event: object) => {
      resolve(event);
    });
  });
}
