export const DeliveryPlatformKind = {
  ChromeLike: 5,
  SafariLegacy: 7,
  Firefox: 8,
  Email: 11,
  Edge: 12,
  SMS: 14,
  SafariVapid: 17,
} as const;

export type DeliveryPlatformKindValue =
  (typeof DeliveryPlatformKind)[keyof typeof DeliveryPlatformKind];
