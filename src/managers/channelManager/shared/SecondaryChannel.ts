import { TagsObject } from "../../../models/Tags";

// Interface provided outside of this module.
//   Example: OneSignal.ts as a consumer.
export interface SecondaryChannel {
  setIdentifier(identifier: string, authHash?: string): Promise<string | null | undefined>;
  logout(): Promise<boolean>;
}

// Interface that the SecondaryChannelSynchronizer will interface with
export interface SecondaryChannelWithSynchronizerEvents {
  onSession(): Promise<void>;
  onFocus(sessionDuration: number): Promise<void>;

  setTags(tags: TagsObject<any>): Promise<void>;
  setExternalUserId(id: string, authHash?: string): Promise<void>;
}
