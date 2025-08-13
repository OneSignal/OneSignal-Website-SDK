export const EnvironmentKind = {
  Development: 'development',
  Staging: 'staging',
  Production: 'production',
} as const;

export const DeliveryPlatformKind = {
  ChromeLike: 5,
  SafariLegacy: 7,
  Firefox: 8,
  Email: 11,
  SafariVapid: 17,
} as const;
