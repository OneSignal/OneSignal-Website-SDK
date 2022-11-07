import { SubscriptionStateKind } from '../models/SubscriptionStateKind';
import { PushDeviceRecord } from '../models/PushDeviceRecord';
import { NotSubscribedError, NotSubscribedReason } from "../errors/NotSubscribedError";
import MainHelper from '../helpers/MainHelper';
import Database from "../services/Database";
import Log from "../libraries/Log";
import { ContextSWInterface } from '../models/ContextSW';
import Utils from "../context/Utils";
import { OutcomeRequestData } from "../../page/models/OutcomeRequestData";
import { awaitSdkEvent, logMethodCall } from '../utils/utils';
import { UpdatePlayerExternalUserId, UpdatePlayerOptions } from "../models/UpdatePlayerOptions";
import { ExternalUserIdHelper } from "../helpers/ExternalUserIdHelper";
import { TagsObject } from "../../page/models/Tags";
import { SessionOrigin } from '../models/Session';
import OneSignalApiShared from '../api/OneSignalApiShared';

export class UpdateManager {
  private context: ContextSWInterface;

  private onSessionSent: boolean;

  constructor(context: ContextSWInterface) {
    this.context = context;
    this.onSessionSent = context.pageViewManager.getPageViewCount() > 1;
  }

  private async isDeviceIdAvailable(): Promise<boolean> {
    return (await Database.getSubscription()).deviceId != null;
  }

  private async getDeviceId(): Promise<string> {
    const { deviceId } = await Database.getSubscription();
    if (!deviceId) {
      throw new NotSubscribedError(NotSubscribedReason.NoDeviceId);
    }
    return deviceId;
  }

  private async createDeviceRecord(): Promise<PushDeviceRecord> {
    return MainHelper.createDeviceRecord(this.context.appConfig.appId);
  }

  public async sendPushDeviceRecordUpdate(deviceRecord?: PushDeviceRecord): Promise<void> {
    const existingUser = await this.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (!existingUser) {
      Log.debug("Not sending the update because user is not registered with OneSignal (no device id)");
      return;
    }

    const deviceId = await this.getDeviceId();
    if (!deviceRecord) {
      deviceRecord = await this.createDeviceRecord();
    }
    if (this.onSessionSent) {
      await OneSignalApiShared.updatePlayer(this.context.appConfig.appId, deviceId, {
        notification_types: SubscriptionStateKind.Subscribed,
        ...deviceRecord.serialize(),
      });
    } else {
      await this.sendOnSessionUpdate(deviceRecord);
    }
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  public async sendOnSessionUpdate(deviceRecord?: PushDeviceRecord): Promise<void> {
    if (this.onSessionSent) {
      return;
    }

    if (!this.context.pageViewManager.isFirstPageView()) {
      return;
    }

    const existingUser = await this.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (!existingUser) {
      Log.debug("Not sending the on session because user is not registered with OneSignal (no device id)");
      return;
    }

    const deviceId = await this.getDeviceId();
    if (!deviceRecord) {
      deviceRecord = await this.createDeviceRecord();
    }

    if (deviceRecord.subscriptionState !== SubscriptionStateKind.Subscribed &&
      OneSignal.config.enableOnSession !== true) {
      return;
    }

    try {
      // Not sending on_session here but from SW instead.

      // Not awaiting here on purpose
      this.context.sessionManager.upsertSession(deviceId, deviceRecord, SessionOrigin.PlayerOnSession);
      this.onSessionSent = true;
    } catch(e) {
      Log.error(`Failed to update user session. Error "${e.message}" ${e.stack}`);
    }
  }

  public async sendPlayerCreate(deviceRecord: PushDeviceRecord): Promise<string | undefined> {
    await ExternalUserIdHelper.addExternalUserIdToDeviceRecord(deviceRecord);
    try {
      const deviceId = await OneSignalApiShared.createUser(deviceRecord);
      if (deviceId) {
        Log.info("Subscribed to web push and registered with OneSignal", deviceRecord, deviceId);
        this.onSessionSent = true;
        // Not awaiting here on purpose
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

  public onSessionAlreadyCalled() {
    return this.onSessionSent;
  }

  public async sendExternalUserIdUpdate(externalUserId: string | undefined | null, authHash?: string | null )
  :Promise<any> {
    if (!authHash) {
      authHash = await Database.getExternalUserIdAuthHash();
    }

    const payload: UpdatePlayerExternalUserId = {
      external_user_id: Utils.getValueOrDefault(externalUserId, ""),
      external_user_id_auth_hash: Utils.getValueOrDefault(authHash, undefined)
    };

    // 1. Update any secondary channels such as email with external_user_id
    // Not awaiting as this may never complete, as promise only completes if we have a player record for each channel.
    /* tslint:disable:no-floating-promises */
    this.context.secondaryChannelManager.synchronizer.setExternalUserId(
      payload.external_user_id,
      payload.external_user_id_auth_hash
    );
    /* tslint:enable:no-floating-promises */

    // 2. Update push player with external_user_id
    const pushUpdatePromise = this.sendPushPlayerUpdate(payload);
    if (await this.isDeviceIdAvailable()) {
      await pushUpdatePromise;
    }
  }

  public async sendTagsUpdate(tags: TagsObject<any>): Promise<void> {
    this.context.secondaryChannelManager.synchronizer.setTags(tags);

    const options: UpdatePlayerOptions = { tags };
    const authHash = await Database.getExternalUserIdAuthHash();
    if (!!authHash) {
      options.external_user_id_auth_hash = authHash;
    }

    const pushUpdatePromise = this.sendPushPlayerUpdate(options);
    if (await this.isDeviceIdAvailable()) {
      await pushUpdatePromise;
    }
  }

  // Send REST API payload to update the push player record.
  // Await until we have a push playerId, which is require to make a PUT call.
  private async sendPushPlayerUpdate(payload: UpdatePlayerOptions): Promise<void> {
    let { deviceId } = await Database.getSubscription();
    if (!deviceId) {
      await awaitSdkEvent(OneSignal.EVENTS.REGISTERED);
      ({ deviceId } = await Database.getSubscription());
    }

    if (deviceId) {
      await OneSignalApiShared.updatePlayer(this.context.appConfig.appId, deviceId, payload);
    }
  }

  public async sendOutcomeDirect(appId: string, notificationIds: string[], outcomeName: string, value?: number) {
    logMethodCall("sendOutcomeDirect");
    const deviceRecord = await this.createDeviceRecord();
    const outcomeRequestData: OutcomeRequestData = {
      app_id: appId,
      id: outcomeName,
      device_type: deviceRecord.deliveryPlatform,
      notification_ids: notificationIds,
      direct: true,
    };
    if (value !== undefined) {
      outcomeRequestData.weight = value;
    }
    await OneSignalApiShared.sendOutcome(outcomeRequestData);
  }

  public async sendOutcomeInfluenced(appId: string, notificationIds: string[], outcomeName: string, value?: number) {
    logMethodCall("sendOutcomeInfluenced");
    const deviceRecord = await this.createDeviceRecord();
    const outcomeRequestData: OutcomeRequestData = {
      app_id: appId,
      id: outcomeName,
      device_type: deviceRecord.deliveryPlatform,
      notification_ids: notificationIds,
      direct: false,
    };
    if (value !== undefined) {
      outcomeRequestData.weight = value;
    }
    await OneSignalApiShared.sendOutcome(outcomeRequestData);
  }

  public async sendOutcomeUnattributed(appId: string, outcomeName: string, value?: number) {
    logMethodCall("sendOutcomeUnattributed");
    const deviceRecord = await this.createDeviceRecord();
    const outcomeRequestData: OutcomeRequestData = {
      app_id: appId,
      id: outcomeName,
      device_type: deviceRecord.deliveryPlatform,
    };
    if (value !== undefined) {
      outcomeRequestData.weight = value;
    }
    await OneSignalApiShared.sendOutcome(outcomeRequestData);
  }
}
