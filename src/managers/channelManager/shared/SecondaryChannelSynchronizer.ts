import Database from "../../../services/Database";
import { TagsObject } from "../../../models/Tags";
import { SecondaryChannelWithSynchronizerEvents } from "./SecondaryChannel";
import { AppConfig } from "../../../models/AppConfig";
import Mutex from "../../../utils/Mutex";

export class SecondaryChannelSynchronizer {
  private _channels: SecondaryChannelWithSynchronizerEvents[];
  /**
   * M U T E X E S :
   *  We use mutex locks to synchronize asynchronous operations. Each user update
   *  should be an atomic operation i.e: we should not continue on to a different
   *  asynchronous update while we wait for a first one to finish.
   *
   *  This is particularly important when it comes to externalUserId updates since
   *  we need to be 100% sure we are updating the correct user. We cannot risk
   *  accidentally updating a user with another user's data tags for example.
   *
   *  However, it is not so important to guard onSession, onFocus, and setTags
   *  FROM EACHOTHER -- just from setExternalUserId (and vice versa).
   *
   *  Due to this, we have independent locks for each function to protect it from
   *  a potential `setExternalUserId` race condition. When calling `setExternalUserId`
   *  we simply lock all the other functions.
   */
  private _onSessionMutex: Mutex = new Mutex();
  private _onFocusMutex: Mutex = new Mutex();
  private _setTagsMutex: Mutex = new Mutex();

  constructor() {
    this._channels = [];
  }

  /**
   * Registers a channel
   * @param channel
   */
  registerChannel(channel: SecondaryChannelWithSynchronizerEvents) {
    this._channels.push(channel);
  }

  /* C O M M O N   T H I N G S   A L L   S E C O N D A R Y   C H A N N E L S   H A N D L E */

  async onSession(): Promise<void> {
    const unlock = await this._onSessionMutex.lock();

    if (await this.shouldSync()) {
      await Promise.all(this._channels.map(channel => channel.onSession() ));
    }
    unlock();
  }

  async onFocus(sessionDuration: number): Promise<void>  {
    const unlock = await this._onFocusMutex.lock();

    if (await this.shouldSync()) {
      await Promise.all(this._channels.map(channel => channel.onFocus(sessionDuration) ));
    }
    unlock();
  }

  async setTags(tags: TagsObject<any>): Promise<void> {
    const unlock = await this._setTagsMutex.lock();

    if (await this.shouldSync()) {
      await Promise.all(this._channels.map(channel => channel.setTags(tags) ));
    }
    unlock();
  }

  async setExternalUserId(id: string, authHash?: string): Promise<void> {
    const unlockArr = await this.lockAllMutexes();

    if (await this.shouldSync()) {
      await Promise.all(this._channels.map(channel => channel.setExternalUserId(id, authHash) ));
    }

    this.unlockAllMutexes(unlockArr);
  }

  /* H E L P E R S */

  /**
   * Should only synchronize iff: 1) property sync remote param is on and 2) has external user id
   *   - as of 2/18/2022
   */
  async shouldSync(): Promise<boolean> {
    const externalUserId = await Database.getExternalUserId(); // TO DO: consider whether getting remote value is better

    const config: AppConfig = OneSignal.config;
    const { clientSidePropSyncOnExternalId } = config;

    if (!!externalUserId && !clientSidePropSyncOnExternalId) {
      return false;
    }

    return true;
  }

  async lockAllMutexes(): Promise<Function[]> {
    const onSessionUnlock = await this._onSessionMutex.lock();
    const onFocusUnlock = await this._onFocusMutex.lock();
    const setTagsUnlock = await this._setTagsMutex.lock();

    return [onSessionUnlock, onFocusUnlock, setTagsUnlock];
  }

  unlockAllMutexes(unlockArray: Function[]): void {
    unlockArray.map(func => func());
  }
}
