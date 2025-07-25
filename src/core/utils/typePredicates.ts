import { IdentityModel } from '../models/IdentityModel';

export function isIdentityObject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj?: any,
): obj is IdentityModel {
  return obj?.onesignal_id !== undefined;
}

export function isFutureSubscriptionObject(obj: {
  type?: string;
}): obj is { type: string } {
  return obj?.type !== undefined;
}

export function isCompleteSubscriptionObject(obj?: {
  type?: string;
  id?: string;
}): obj is { type: string; id: string } {
  return obj?.type !== undefined && obj?.id !== undefined;
}
