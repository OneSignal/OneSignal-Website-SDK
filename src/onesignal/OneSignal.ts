import Emitter, { EventHandler } from "../shared/libraries/Emitter";
import { AppUserConfig } from "../shared/models/AppConfig";
import OneSignalProtected from "./OneSignalProtected";
import { LogLevel } from "./temp/LogLevel";
import { User } from "./temp/User";

export default class OneSignal extends OneSignalProtected implements IOneSignal {
  constructor() {
    super();
  }

  init(config: AppUserConfig): void {

  }

  setAppId(appId: string): void {

  }

  setLogLevel(logLevel: LogLevel): void {

  }

  setRequiresPrivacyConsent(privacyConsentRequired: boolean): void {

  }

  setPrivacyConsent(privacyConsent: boolean): void {

  }

  getPrivacyConsent(): void {

  }

  login(externalId: string, authHash?: string): User {

  }

  loginGuest(): User {

  }

  onLoginConflict(callback: (local: User, remote: User) => User): void {

  }

  on(event: string, listener: EventHandler): Emitter {

  }
}
