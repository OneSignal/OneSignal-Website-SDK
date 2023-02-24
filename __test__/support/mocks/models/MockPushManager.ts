import { MockPushSubscription } from "./MockPushSubscription";

export class MockPushManager implements PushManager {
  private subscription: MockPushSubscription | null;
  readonly supportedContentEncodings: ReadonlyArray<string> = [];

  constructor() {
    this.subscription = null;
  }

  public async getSubscription(): Promise<PushSubscription | null> {
    return this.subscription;
  }

  public async permissionState(_options?: PushSubscriptionOptionsInit): Promise<PushPermissionState> {
    return "granted";
  }

  public async subscribe(options: PushSubscriptionOptionsInit): Promise<PushSubscription> {
    if (this.subscription) {
      if (this.subscription.options.applicationServerKey != options.applicationServerKey) {
        // Simulate browser throwing if you don't unsubscribe first if applicationServerKey has changed.
        throw {
          name: "InvalidStateError",
          message: "Can not change keys without calling unsubscribe first!"
        };
      }
    }
    this.subscription = new MockPushSubscription(this, options);
    return this.subscription;
  }

  /**
   * Only to be used internally from PushSubscription.unsubscribe().
   */
  public __unsubscribe() {
    if (!this.subscription) {
      throw new Error("No Existing subscription!");
    }
    this.subscription = null;
  }
}
