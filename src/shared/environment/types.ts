import { DeliveryPlatformKind } from './constants';

export type DeliveryPlatformKindValue =
  (typeof DeliveryPlatformKind)[keyof typeof DeliveryPlatformKind];
