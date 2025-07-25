// Implements logic similar to Android SDK's NewRecordsState
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/states/NewRecordsState.kt
import {
  OP_REPO_POST_CREATE_DELAY,
  OP_REPO_POST_CREATE_RETRY_UP_TO,
} from './constants';

export class NewRecordsState {
  private _records: Map<string, number> = new Map();

  public get records(): Map<string, number> {
    return this._records;
  }

  public add(id: string): void {
    this._records.set(id, Date.now());
  }

  public canAccess(key: string | undefined): boolean {
    if (!key) return true;

    const timeLastMovedOrCreated = this._records.get(key);
    if (!timeLastMovedOrCreated) return true;

    return Date.now() - timeLastMovedOrCreated >= OP_REPO_POST_CREATE_DELAY;
  }

  public isInMissingRetryWindow(key: string): boolean {
    const timeLastMovedOrCreated = this._records.get(key);
    if (!timeLastMovedOrCreated) return false;

    return (
      Date.now() - timeLastMovedOrCreated <= OP_REPO_POST_CREATE_RETRY_UP_TO
    );
  }
}
