import { AppConfig, AppUserConfig } from "../shared/models/AppConfig";
import OneSignalProtected from "./OneSignalProtected";
import { LogLevel } from "./temp/LogLevel";
import { PublicApi } from "./PublicApiDecorator";
import Database from "../shared/services/Database";
import Log from "../shared/libraries/Log";
import User from "./user/User";

export default class OneSignal extends OneSignalProtected implements IOneSignal {
  constructor() {
    super();
  }

  @PublicApi()
  public async init(userConfig: AppUserConfig): Promise<void> {
    await this.core.setup(); // gets cached config from database
    let appConfig: AppConfig;
    const cachedConfig = this.core.getCachedConfig();

    if (true /* cached config is stale */) {
      appConfig = await this.initializeConfig(userConfig);
    } else {
      appConfig = cachedConfig;
    }
    this.initContext(appConfig);

    await this.internalInit(appConfig);
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
