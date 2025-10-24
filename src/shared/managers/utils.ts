export function isCompleteSubscriptionObject(obj?: {
  type?: string;
  id?: string;
}): obj is { type: string; id: string } {
  return obj?.type !== undefined && obj?.id !== undefined;
}
