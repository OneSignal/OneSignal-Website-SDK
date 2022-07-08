import OneSignalApiBase from "../../../../shared/api/OneSignalApiBase";
import Database from "../../../services/Database";
import { SecondaryChannelProfileProviderBase } from "../providers/SecondaryChannelProfileProviderBase";

export class SecondaryChannelFocusUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProviderBase) {}

  async sendOnFocus(sessionDuration: number): Promise<void> {
    const profile = await this.profileProvider.getProfile();
    // If we haven't created a secondary device record yet then there isn't an on focus event to track.
    if (!profile.subscriptionId) {
      return;
    }

    const appConfig = await Database.getAppConfig();

    // NOTE: Omitting outcome attribution from the payload, only applies to push records.
    const payload: any = {
      app_id: appConfig.appId,
      type: 1,
      state: "ping",
      active_time: sessionDuration,
      device_type: this.profileProvider.deviceType,
    };
    await OneSignalApiBase.post(`players/${profile.subscriptionId}/on_focus`, payload);
  }
}
