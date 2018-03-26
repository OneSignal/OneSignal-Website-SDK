import ExtendableEvent from "./ExtendableEvent";
import PushSubscription from './PushSubscription';

export class PushSubscriptionChangeEvent extends ExtendableEvent {
  public newSubscription?: PushSubscription;
  public oldSubscription?: PushSubscription;

  public constructor() {
    super("pushsubscriptionchange");
  }
}
