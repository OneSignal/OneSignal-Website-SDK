import { PushDeviceRecord, SerializedPushDeviceRecord } from "../models/PushDeviceRecord";
import { RawPushSubscription } from "../models/RawPushSubscription";
import { Session } from "../models/Session";
import { Subscription } from "../models/Subscription";
import { SubscriptionStateKind } from "../models/SubscriptionStateKind";
import OneSignalApiShared from "../OneSignalApiShared";
import Database from "../services/Database";
import { SessionEvent, SessionTimeManager } from "./sessionManager/SessionTimeManager";
import { NewPushSubscription, SubscriptionManager } from "./SubscriptionManager";

/**
 * Handles relationship between channels such as push and email.
 * The relationship is high level,
 *    some network calls but made though OneSignalApiShared.
 * This includes mapping external user id, tags, and new sessions to all player ids
 * Shared (used by page & SW)
 */

type PushDeviceRecordFunction = (pushDeviceRecord: SerializedPushDeviceRecord) => void;

export class ChannelManager implements NewPushSubscription, SessionEvent {

  private onPushDeviceRecordPromise: Promise<SerializedPushDeviceRecord>;
  private onPushDeviceRecordPromiseResolver?: PushDeviceRecordFunction;

  constructor(
    private readonly database: Database,
    private readonly appId: string,
    subscriptionManager: SubscriptionManager) {
      this.onPushDeviceRecordPromise = new Promise(resolve => { this.onPushDeviceRecordPromiseResolver = resolve; });
      SessionTimeManager.addSessionEventListener(this);
  }

  public async onPushToken(
    pushSubscription: RawPushSubscription,
    subscriptionState?: SubscriptionStateKind)
    : Promise<Subscription>
   {
    /*
      This may be called after the RawPushSubscription has been serialized across a postMessage
      frame. This means it will only have object properties and none of the functions. We have to
      recreate the RawPushSubscription.

      Keep in mind pushSubscription can be null in cases where resubscription isn't possible
      (blocked permission).
    */
      if (pushSubscription) {
        pushSubscription = RawPushSubscription.deserialize(pushSubscription);
      }

      const deviceRecord: PushDeviceRecord = PushDeviceRecord.createFromPushSubscription(
        this.appId,
        pushSubscription,
        subscriptionState
      );

      const existingDeviceId = (await Database.getSubscription()).deviceId;
      let newDeviceId: string | undefined = undefined;
      if (existingDeviceId) {
        await this.context.updateManager.sendPlayerUpdate(deviceRecord);
      } else {
        newDeviceId = await this.context.updateManager.sendPlayerCreate(deviceRecord);
      }

      if (newDeviceId) {
        this.onNewPushSubscription(newDeviceId);
      }

      // Update subscription model
      const subscription = await Database.getSubscription();
      subscription.deviceId ||= newDeviceId;
      subscription.optedOut = false;
      subscription.subscriptionToken = deviceRecord.serialize().identifier;
      await Database.setSubscription(subscription);

      // TODO: Is this still needed? If so consider what is reacting to it and if it should be moved.
      // if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
      //   Event.trigger(OneSignal.EVENTS.REGISTERED);
      // }

      if (typeof OneSignal !== "undefined") {
        // TODO: This control should be added to ChannelManager
        OneSignal._sessionInitAlreadyRunning = false;
      }

      return subscription;
  }

  private onNewPushSubscription(playerId: string): void {
    this.associateSubscriptionWithEmail(playerId);
  }

  /**
   * Called after registering a subscription with OneSignal to associate this subscription with an
   * email record if one exists.
   */
  public async associateSubscriptionWithEmail(newDeviceId: string) {
    const emailProfile = await this.database.getEmailProfile();
    if (!emailProfile.emailId) {
      return;
    }

    // Update the push device record with a reference to the new email ID and email address
    await OneSignalApiShared.updatePlayer(
      this.appId,
      newDeviceId,
      {
        parent_player_id: emailProfile.emailId,
        email: emailProfile.emailAddress
      }
    );
  }
}
