import Context from "../../page/models/Context";

export async function isPushNotificationsEnabled(): Promise<boolean> {
  const context = Context.getOrInitInstance();
  const subscriptionState = await context.subscriptionManager.getSubscriptionState();
  return subscriptionState.subscribed && !subscriptionState.optedOut;
}