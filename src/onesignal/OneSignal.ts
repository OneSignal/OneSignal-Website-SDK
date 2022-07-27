import Emitter, { EventHandler } from "../shared/libraries/Emitter";
import { AppUserConfig } from "../shared/models/AppConfig";
import OneSignalProtected from "./OneSignalProtected";
import { LogLevel } from "./temp/LogLevel";
import { User } from "./temp/User";
import { PublicApi } from "./PublicApiDecorator";

export default class OneSignal extends OneSignalProtected implements IOneSignal {
  constructor() {
    super();
  }

  @PublicApi()
  public init(config: AppUserConfig): void {

  }

  @PublicApi()
  public setAppId(appId: string): void {

  }

  @PublicApi()
  public setLogLevel(logLevel: LogLevel): void {

  }

  @PublicApi()
  public setRequiresPrivacyConsent(privacyConsentRequired: boolean): void {

  }

  @PublicApi()
  public setPrivacyConsent(privacyConsent: boolean): void {

  }

  @PublicApi()
  public getPrivacyConsent(): void {

  }

  @PublicApi()
  public login(externalId: string, authHash?: string): User {

  }

  @PublicApi()
  public loginGuest(): User {

  }

  @PublicApi()
  public onLoginConflict(callback: (local: User, remote: User) => User): void {

  }

  @PublicApi()
  public on(event: string, listener: EventHandler): Emitter {

  }
}
