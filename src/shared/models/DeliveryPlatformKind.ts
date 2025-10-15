export const DeliveryPlatformKind = {
  _ChromeLike: 5,
  _SafariLegacy: 7,
  _Firefox: 8,
  _Email: 11,
  _SafariVapid: 17,
} as const;

export type DeliveryPlatformKindValue =
  (typeof DeliveryPlatformKind)[keyof typeof DeliveryPlatformKind];
