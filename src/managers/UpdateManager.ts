import OneSignalApiShared from "../OneSignalApiShared";
import { SubscriptionStateKind } from '../models/SubscriptionStateKind';
import { PushDeviceRecord } from '../models/PushDeviceRecord';
import { NotSubscribedError, NotSubscribedReason } from "../errors/NotSubscribedError";
import MainHelper from '../helpers/MainHelper';
import Database from "../services/Database";
import Log from "../libraries/Log";
import { ContextSWInterface } from '../models/ContextSW';
import Utils from "../utils/Utils";
import OneSignal from "../OneSignal"

export class UpdateManager {
  private context: ContextSWInterface;

  private onSessionSent: boolean;

  constructor(context: ContextSWInterface) {
    this.context = context;
    this.onSessionSent = context.sessionManager.getPageViewCount() > 1;
  }

  async getDeviceId(): Promise<string> {
    const { deviceId } = await Database.getSubscription();
    if (!deviceId) {
      throw new NotSubscribedError(NotSubscribedReason.NoDeviceId);
    }
    return deviceId;
  }

  private async createDeviceRecord(): Promise<PushDeviceRecord> {
    const deviceRecord = new PushDeviceRecord();
    deviceRecord.appId = this.context.appConfig.appId;
    deviceRecord.subscriptionState = await MainHelper.getCurrentNotificationType();
    return deviceRecord;
  }

  public async sendPlayerUpdate(deviceRecord?: PushDeviceRecord): Promise<void> {
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

    if (!this.context.sessionManager.isFirstPageView()) {
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
      await OneSignalApiShared.updateUserSession(deviceId, deviceRecord);
      this.onSessionSent = true;
    } catch(e) {
      Log.error(`Failed to update user session. Error "${e.message}" ${e.stack}`);
    }
  }

  public async sendPlayerCreate(deviceRecord: PushDeviceRecord): Promise<string | undefined> {
    try {
      const deviceId = await OneSignalApiShared.createUser(deviceRecord);
      if (deviceId) {
        Log.info("Subscribed to web push and registered with OneSignal", deviceRecord, deviceId);
        this.onSessionSent = true;
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

  public async sendExternalUserIdUpdate(externalUserId: string | undefined | null): Promise<void> {
    const deviceId: string = await this.getDeviceId();
    await OneSignalApiShared.updatePlayer(this.context.appConfig.appId, deviceId, {
      external_user_id: Utils.getValueOrDefault(externalUserId, "")
    });
  }
}
