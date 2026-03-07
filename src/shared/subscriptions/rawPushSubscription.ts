export interface RawPushSubscription {
  w3cEndpoint?: string;
  w3cP256dh?: string;
  w3cAuth?: string;
  safariDeviceToken?: string;
}

const encodeArrayBuffer = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

export function rawPushSubscriptionFromW3c(
  pushSubscription: PushSubscription,
): RawPushSubscription {
  const p256dh = pushSubscription.getKey?.('p256dh');
  const auth = pushSubscription.getKey?.('auth');

  return {
    w3cEndpoint: new URL(pushSubscription.endpoint).toString(),
    w3cP256dh: p256dh ? encodeArrayBuffer(p256dh) : undefined,
    w3cAuth: auth ? encodeArrayBuffer(auth) : undefined,
  };
}
