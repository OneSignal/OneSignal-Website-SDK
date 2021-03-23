import { AbstractSubscription } from "./subscription/AbstractSubscription";

// Preform user level actions that should be reflected on all subscribers (players)
// TODO: Need a abstract version of this so the page can be different than the SW
//    - onSession
//         page - will broadcast upsert to SW
//         SW - will make the on_session calls
//    - setTags
//         page - will send player calls


//         SW - empty it will never call this
export abstract class UserStateSynchronizer {
  private subscriptions: Array<AbstractSubscription>;

  constructor() {
    this.subscriptions = new Array();
  }

  protected addSubscription(component: AbstractSubscription) {
    this.subscriptions.push(component);
  }

  // TODO: Support use cases:
  //   * associateSubscriptionWithEmail

  // public addSubscription(subscription: Subscription.AbstractSubscription) {
  //   // TODO: Add to list
  //   // TODO2: Should this call a network create?
  // }

  // START: Update methods

  public setTags(tags: {[key: string]: any}): void {
    // TODO: Loop through subscriptions and update
    this.subscriptions.forEach(component => {
      component.setTags(tags);
    });
  }

  // TODO: setExternalUser id
  // TODO: Other methods from OneSignal.ts

  // START: Update methods

  public abstract onSession(): void;

  protected performOnSessionOnSubscribers(): void {
    // TODO: Loop through subscriptions and call on_session
  }
}
