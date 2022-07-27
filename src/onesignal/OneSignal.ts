import { AppUserConfig } from "../shared/models/AppConfig";
import OneSignalProtected from "./OneSignalProtected";
import { LogLevel } from "./temp/LogLevel";
import { User } from "./temp/User";
import { PublicApi } from "./PublicApiDecorator";
import Database from "../shared/services/Database";
import Log from "../shared/libraries/Log";

export default class OneSignal extends OneSignalProtected implements IOneSignal {
  constructor() {
    super();
  }

  @PublicApi()
  public async init(config: AppUserConfig): Promise<void> {
    await this.core.setup();
    await this.internalInit(config);
  }

  @PublicApi()
  public async setAppId(appId: string): Promise<void> {
    await this.init({ appId });
  }

  @PublicApi()
  public setLogLevel(logLevel: LogLevel): void {
    Log.setLevel(logLevel);
  }

  @PublicApi()
  public setRequiresPrivacyConsent(privacyConsentRequired: boolean): void {
    this.requiresPrivacyConsent = privacyConsentRequired;
  }

  @PublicApi()
  public async setPrivacyConsent(privacyConsent: boolean): Promise<void> {
    await Database.setProvideUserConsent(privacyConsent);
    if (privacyConsent && this._pendingInit)
      await this.delayedInit();
  }

  @PublicApi()
  public async getPrivacyConsent(): Promise<boolean> {
    return await Database.getProvideUserConsent();
  }

  @PublicApi()
  public login(externalId: string, token?: JsonWebKey): void {

  }

  @PublicApi()
  public loginGuest(): void {

  }

  @PublicApi()
  public onLoginConflict(callback: (local: User, remote: User) => User): void {

  }
}
