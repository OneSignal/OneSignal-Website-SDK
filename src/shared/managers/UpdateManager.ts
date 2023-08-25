import { SubscriptionStateKind } from '../models/SubscriptionStateKind';
import { PushDeviceRecord } from '../models/PushDeviceRecord';
import MainHelper from '../helpers/MainHelper';
import Database from '../services/Database';
import Log from '../libraries/Log';
import { ContextSWInterface } from '../models/ContextSW';
import Utils from '../context/Utils';
import { OutcomeRequestData } from '../../page/models/OutcomeRequestData';
import { awaitSdkEvent, logMethodCall } from '../utils/utils';
import {
  UpdatePlayerExternalUserId,
  UpdatePlayerOptions,
} from '../models/UpdatePlayerOptions';
import { ExternalUserIdHelper } from '../helpers/ExternalUserIdHelper';
import { TagsObject } from '../../page/models/Tags';
import { SessionOrigin } from '../models/Session';
import OneSignalApiShared from '../api/OneSignalApiShared';
import User from '../../onesignal/User';
import FuturePushSubscriptionRecord from '../../page/userModel/FuturePushSubscriptionRecord';
import { isCompleteSubscriptionObject } from '../../core/utils/typePredicates';

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

  private async createDeviceRecord(): Promise<PushDeviceRecord> {
    return MainHelper.createDeviceRecord(this.context.appConfig.appId);
  }

  public async sendPushDeviceRecordUpdate(): Promise<void> {
    if (!User.singletonInstance?.hasOneSignalId) {
      Log.debug(
        'Not sending the update because user is not registered with OneSignal (no onesignal_id)',
      );
      return;
    }

    if (!this.onSessionSent) {
      await this.sendOnSessionUpdate();
    }
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  public async sendOnSessionUpdate(): Promise<void> {
    if (this.onSessionSent) {
      return;
    }

    if (!this.context.pageViewManager.isFirstPageView()) {
      return;
    }

    const existingUser =
      await this.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (!existingUser) {
      Log.debug(
        'Not sending the on session because user is not registered with OneSignal (no device id)',
      );
      return;
    }

    const subscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      subscriptionModel?.data.notification_types !==
        SubscriptionStateKind.Subscribed &&
      OneSignal.config?.enableOnSession !== true
    ) {
      return;
    }

    try {
      // Not sending on_session here but from SW instead.

      // Not awaiting here on purpose
      this.context.sessionManager.upsertSession(SessionOrigin.PlayerOnSession);
      this.onSessionSent = true;
    } catch (e) {
      Log.error(
        `Failed to update user session. Error "${e.message}" ${e.stack}`,
      );
    }
  }

  public async sendPlayerCreate(
    deviceRecord: PushDeviceRecord,
  ): Promise<string | undefined> {
    await ExternalUserIdHelper.addExternalUserIdToDeviceRecord(deviceRecord);
    try {
      const deviceId = await OneSignalApiShared.createUser(deviceRecord);
      if (deviceId) {
        Log.info(
          'Subscribed to web push and registered with OneSignal',
          deviceRecord,
          deviceId,
        );
        this.onSessionSent = true;
        // Not awaiting here on purpose
        this.context.sessionManager.upsertSession(SessionOrigin.PlayerCreate);
        return deviceId;
      }
      Log.error(`Failed to create user.`);
      return undefined;
    } catch (e) {
      Log.error(`Failed to create user. Error "${e.message}" ${e.stack}`);
      return undefined;
    }
  }

  public onSessionAlreadyCalled() {
    return this.onSessionSent;
  }

  public async sendExternalUserIdUpdate(
    externalUserId: string | undefined | null,
    authHash?: string | null,
  ): Promise<any> {
    if (!authHash) {
      authHash = await Database.getExternalUserIdAuthHash();
    }

    const payload: UpdatePlayerExternalUserId = {
      external_user_id: Utils.getValueOrDefault(externalUserId, ''),
      external_user_id_auth_hash: Utils.getValueOrDefault(authHash, undefined),
    };

    /* tslint:enable:no-floating-promises */

    // 2. Update push player with external_user_id
    const pushUpdatePromise = this.sendPushPlayerUpdate(payload);
    if (await this.isDeviceIdAvailable()) {
      await pushUpdatePromise;
    }
  }

  public async sendTagsUpdate(tags: TagsObject<any>): Promise<void> {
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
  private async sendPushPlayerUpdate(
    payload: UpdatePlayerOptions,
  ): Promise<void> {
    let { deviceId } = await Database.getSubscription();
    if (!deviceId) {
      await awaitSdkEvent(OneSignal.EVENTS.REGISTERED);
      ({ deviceId } = await Database.getSubscription());
    }

    if (deviceId) {
      await OneSignalApiShared.updatePlayer(
        this.context.appConfig.appId,
        deviceId,
        payload,
      );
    }
  }

  public async sendOutcomeDirect(
    appId: string,
    notificationIds: string[],
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeDirect');
    const pushSubscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      pushSubscriptionModel &&
      isCompleteSubscriptionObject(pushSubscriptionModel?.data)
    ) {
      const outcomeRequestData: OutcomeRequestData = {
        id: outcomeName,
        app_id: appId,
        notification_ids: notificationIds,
        direct: true,
        subscription: {
          id: pushSubscriptionModel.data.id,
          type: FuturePushSubscriptionRecord.getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    Log.warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }

  public async sendOutcomeInfluenced(
    appId: string,
    notificationIds: string[],
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeInfluenced');
    const pushSubscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      pushSubscriptionModel &&
      isCompleteSubscriptionObject(pushSubscriptionModel?.data)
    ) {
      const outcomeRequestData: OutcomeRequestData = {
        id: outcomeName,
        app_id: appId,
        notification_ids: notificationIds,
        direct: false,
        subscription: {
          id: pushSubscriptionModel.data.id,
          type: FuturePushSubscriptionRecord.getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    Log.warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }

  public async sendOutcomeUnattributed(
    appId: string,
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeUnattributed');
    const pushSubscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      pushSubscriptionModel &&
      isCompleteSubscriptionObject(pushSubscriptionModel?.data)
    ) {
      const outcomeRequestData: OutcomeRequestData = {
        id: outcomeName,
        app_id: appId,
        subscription: {
          id: pushSubscriptionModel.data.id,
          type: FuturePushSubscriptionRecord.getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    Log.warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }
}
