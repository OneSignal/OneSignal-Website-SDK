import { AppConfig, AppUserConfig } from "../shared/models/AppConfig";
import OneSignalProtected from "./OneSignalProtected";
import { LogLevel } from "./temp/LogLevel";
import { PublicApi } from "./PublicApiDecorator";
import Database from "../shared/services/Database";
import Log from "../shared/libraries/Log";
import User from "./user/User";
import { ProcessOneSignalPushCalls } from "../page/utils/ProcessOneSignalPushCalls";

export default class OneSignalPublic extends OneSignalProtected implements IOneSignal {
  constructor() {
    super();
  }

  @PublicApi()
  public async init(userConfig: AppUserConfig): Promise<void> {
    let appConfig: AppConfig;
    const cachedConfig = this.core.modelCache.config;

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
    if (privacyConsent && this._pendingInit && this.config) {
      await this.delayedInit(this.config);
    }
  }

  @PublicApi()
  public async getPrivacyConsent(): Promise<boolean> {
    return await Database.getProvideUserConsent();
  }

  @PublicApi()
  public login(externalId: string, token?: JsonWebKey): void {
    this.user = new User(this.context);
  }

  @PublicApi()
  public loginGuest(): void {

  }

  @PublicApi()
  public onLoginConflict(callback: (local: User, remote: User) => User): void {

  }

  /**
   * Used to load OneSignal asynchronously from a webpage
   * Allows asynchronous function queuing while the SDK loads in the browser with <script src="..." async/>
   * @PublicApi
   * @param item - Ether a function or an arry with a OneSignal function name followed by it's parameters
   * @Example
   *  OneSignal.push(["functionName", param1, param2]);
   *  OneSignal.push(function() { OneSignal.functionName(param1, param2); });
   */
  @PublicApi()
  public push(item: () => any | object[]): void {
    ProcessOneSignalPushCalls.processItem(this, item);
  }
}
