export function isCompleteSubscriptionObject(obj?: {
  _type?: string;
  _id?: string;
}): obj is { _type: string; _id: string } {
  return obj?._type !== undefined && obj?._id !== undefined;
}
