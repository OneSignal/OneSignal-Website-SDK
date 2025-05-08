import Database from 'src/shared/services/Database';
import { Model } from './Model';

export class ConfigModel extends Model {
  get pushSubscriptionId(): Promise<string | undefined> {
    return Database.getAppState().then((appState) => appState.lastKnownPushId);
  }
  set pushSubscriptionId(value: string | undefined) {
    (async () => {
      const appState = await Database.getAppState();
      appState.lastKnownPushId = value;
      await Database.setAppState(appState);
    })();
  }
}
