import { OutcomeRequestData } from '../../page/models/OutcomeRequestData';
import Utils from '../context/Utils';
import Log from '../libraries/Log';
import { DeviceRecord } from '../models/DeviceRecord';
import OneSignalApiBase from './OneSignalApiBase';

export default class OneSignalApiShared {
  static sendNotification(
    appId: string,
    playerIds: Array<string>,
    titles,
    contents,
    url,
    icon,
    data,
    buttons,
  ) {
    const params = {
      app_id: appId,
      contents: contents,
      include_player_ids: playerIds,
      isAnyWeb: true,
      data: data,
      web_buttons: buttons,
    };
    if (titles) {
      (params as any).headings = titles;
    }
    if (url) {
      (params as any).url = url;
    }
    if (icon) {
      (params as any).chrome_web_icon = icon;
      (params as any).firefox_icon = icon;
    }
    Utils.trimUndefined(params);
    return OneSignalApiBase.post('notifications', params);
  }

  static async sendOutcome(data: OutcomeRequestData): Promise<void> {
    Log.info('Outcome payload:', data);
    try {
      await OneSignalApiBase.post('outcomes/measure', data);
    } catch (e) {
      Log.error('sendOutcome', e);
    }
  }
}
