// Interface provided outside of this module.
//   Example: OneSignal.ts as a consumer.
export interface SecondaryChannel {
  setIdentifier(identifier: string, authHash?: string): Promise<string | null>;
  logout(): void;
}

// Interface that the SecondaryChannelController will interface with
export interface SecondaryChannelWithControllerEvents {
  onSession(): void;
  onFocus(): void;

  setTags(tags: {[key: string]: any}): void;
  setExternalUserId(id: string): void;
}