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


// Option 1 - Interface each channel (push, email, ect) implements.
interface ChannelManagerSubscription {
  onIdentifier(identifier: string): void;
  onSessionNew(): void; // REST API /on_session
  onSessionEnd(): void; // REST API /on_focus
  setExternalUserId(): void;
  setTags(): void;
  setSubscription(): void; // notification_types
}
// ChannelManagerPush, ChannelManagerEmail
// Con - Seems like we are just wrapping a large chunk of our OneSignal class with this.

// Option 2 - Modular features that broadcast events (Listener pattern)
//   1. Small interfaces provided by each feature.
///    - TagManager, SessionManager, ExternalUserIdManger, PushSubscriptionManager, EmailSubscriptionManager, etc
//   2. A OSPlayerManager (one for push, email, etc) that implements listener interfaces that these provide.

// Option 3 - Option 2 above plus OSPlayerManager is also closed for modification (the "O" of the SOLID principle)
//   1. OSPlayerProperty interface - Define a property name and provide a listener interface for updates.
//   2. Example we would have a class called OSPlayerPropertyTag.
//     - a. This would implement; OSPlayerProperty (to use with OSPlayerManager), TagManagerListener (to get tag updates)
//     - b. It would implement OSPlayerProperty which requires a addListener method
//     - c. Call OSPlayerManager.registerProperty(OSPlayerProperty) to register it.
//     - d. When TagManager.setTag("key", "value") is called it fires a change to listeners (OSPlayerPropertyTag) which
//          formats the tags then broadcasts JSON which is picked up by OSPlayerManager since it was registered to it.

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
        this.onNewPushSubscriptionId(newDeviceId);
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

  private async sendPlayerCreate(deviceRecord: PushDeviceRecord): Promise<string | undefined> {
    try {
      const deviceId = await OneSignalApiShared.createUser(deviceRecord);
      if (deviceId) {
        Log.info("Subscribed to web push and registered with OneSignal", deviceRecord, deviceId);
        this.onSessionSent = true;
        // Not awaiting here on purpose
        // TODO: Make on_session call directly.
        this.context.sessionManager.upsertSession(deviceId, deviceRecord, SessionOrigin.PlayerCreate);
        return deviceId;
      }
      Log.error(`Failed to create user.`);
      return undefined;
    } catch(e) {
      Log.error(`Failed to create user. Error "${e.message}" ${e.stack}`);
      return undefined;
    }
  }

  private onNewPushSubscriptionId(playerId: string): void {
    this.associateSubscriptionWithEmail(playerId);
  }

  /**
   * Called after registering a subscription with OneSignal to associate this subscription with an
   * email record if one exists.
   */
  // TODO: This should happen internally, through addDeviceRecord
  private async associateSubscriptionWithEmail(newDeviceId: string) {
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

  // TODO: This should be something SessionManger broadcasts?
  // TODO: Do we even want the SessionManager to give us a PushDeviceRecord at all?
  // Sends an on_session REST API for the pushDeviceRecord as well an on_session for email if it exists.
  // args - pushDeviceRecord - These params will be send into a on_session REST API call.
  async onSessionNew(serializedPushDeviceRecord: SerializedPushDeviceRecord): Promise<void> {
    await this.createOrOnSession(serializedPushDeviceRecord);
  }

  onPushDeviceRecord(pushDeviceRecord: SerializedPushDeviceRecord): void {
    this.onPushDeviceRecordPromiseResolver?.(pushDeviceRecord);
    // TODO: How to handle making an update call here if the push token changed?
    //    1. Should the params let us know if there "refresh" event a changed push token?
    //    2. If the above didn't trigger an on_session call?
  }

  // Call to add an Email device record
  // This takes care of making REST API calls to create or update.
  // It takes care of associating with the push record.
  private addSecondaryDeviceRecord(deviceRecord: SerializedPushDeviceRecord): void {
  }

  // Called a new session is detected, however if done before we ever got a DeviceRecord wait for it.
  //   - This prevents making an update + on_session call with the same data back-to-back
  // If this is a new record make a player create, if existing make an on_session call for it as well as any
  // secondary subscriptions.
  private async createOrOnSession(pushDeviceRecord?: SerializedPushDeviceRecord): Promise<void> {
    const pushDeviceRecordFromAddDevice = await this.onPushDeviceRecordPromise;
    const lastestPushDeviceRecord = pushDeviceRecord || pushDeviceRecordFromAddDevice;

    // TODO: Call create or on_session for push player
    // this.sendOnSessionForPush(...);


    // TODO: Call on_session for secondary device records, if:
    //   1. We did an on_session for push
    //   2. We have a player_id for secondary devices.
  }

  private async sendOnSessionForPush(
    deviceRecord: SerializedPushDeviceRecord,
    deviceId: string,
    session: Session) : Promise<void> {

    // TODO: ServiceWorker used to account for getting a push token.
    //       Do we even need keep doing this?, as we wait for onPushDeviceRecord now too.
    // if (!deviceRecord.identifier) {
    //   const subscription = await self.registration.pushManager.getSubscription()
    //   if (subscription) {
    //     const rawPushSubscription = RawPushSubscription.setFromW3cSubscription(subscription);
    //     const fullDeviceRecord = new PushDeviceRecord(rawPushSubscription).serialize();
    //     deviceRecord.identifier = fullDeviceRecord.identifier;
    //   }
    // }

    const newPlayerId = await OneSignalApiShared.updateUserSession(deviceId, deviceRecord);
    // If the returned player id is different, save the new id to indexed db and update session
    if (newPlayerId !== deviceId) {
      session.deviceId = newPlayerId;
      await Promise.all([
        Database.setDeviceId(newPlayerId),
        Database.upsertSession(session),
        Database.resetSentUniqueOutcomes()
      ]);
    }
  }

  // TODO: Add on_focus
  //   omit outcomes for secondary channels
  onSessionEnd(): void {
    throw new Error("Method not implemented.");
  }

  // Both OneSignalApiShared & OneSignalSW have updateUserSession

  // From SW:
  //     ServiceWorkerHelper.sendOnSessionCallIfNecessary

  // From page:
  //     OneSignal.emitter.on(OneSignal.EVENTS.SESSION_STARTED,
  //                          sessionManager.sendOnSessionUpdateFromPage.bind(sessionManager));


}
