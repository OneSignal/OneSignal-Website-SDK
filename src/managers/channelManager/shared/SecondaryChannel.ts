// Interface provided outside of this module.
//   Example: OneSignal.ts as a consumer.
export interface SecondaryChannel {
  setIdentifier(identifier: string, authHash?: string): Promise<string | null>;
  logout(): Promise<boolean>;
}

// Interface that the SecondaryChannelController will interface with
export interface SecondaryChannelWithControllerEvents {
  onSession(): Promise<void>;
  onFocus(): void;

  setTags(tags: {[key: string]: any}): Promise<void>;
  setExternalUserId(id: string, authHash?: string): Promise<void>;
}
