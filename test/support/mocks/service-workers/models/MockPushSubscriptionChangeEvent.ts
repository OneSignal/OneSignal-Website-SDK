import { MockExtendableEvent } from "../../MockExtendableEvent";

export class MockPushSubscriptionChangeEvent extends MockExtendableEvent implements PushSubscriptionChangeEvent {
  public newSubscription: PushSubscription | null;
  public oldSubscription: PushSubscription | null;

  private static EVENT_TYPE_PUSH_SUBSCRIPTION_CHANGE = "pushsubscriptionchange";

  public constructor() {
    super(MockPushSubscriptionChangeEvent.EVENT_TYPE_PUSH_SUBSCRIPTION_CHANGE);
    this.newSubscription = null;
    this.oldSubscription = null;
  }

  waitUntil(f: Promise<any>): void {
  }
}
