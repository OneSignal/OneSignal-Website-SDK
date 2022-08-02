import { AppUserConfig } from "../shared/models/AppConfig";
import { NotificationsNamespace } from "./notifications/NotificationsNamespace";
import OneSignalPublic from "./OneSignalPublic";
import { LogLevel } from "./temp/LogLevel";
import User from "./user/User";

export class OneSignal {
  static oneSignal: OneSignalPublic;
  static user: User;
  static notifications: NotificationsNamespace;

  static async init(userConfig: AppUserConfig): Promise<void> {
    this.oneSignal = new OneSignalPublic();
    this.notifications = this.oneSignal.notifications as NotificationsNamespace;
    await this.oneSignal.init(userConfig);
  }

  static async setAppId(appId: string): Promise<void> {
    await this.oneSignal.init({ appId });
  }

  static setLogLevel(logLevel: LogLevel): void {
    this.oneSignal.setLogLevel(logLevel);
  }

  static setRequiresPrivacyConsent(privacyConsentRequired: boolean): void {
    this.oneSignal.setRequiresPrivacyConsent(privacyConsentRequired);
  }

  static async setPrivacyConsent(privacyConsent: boolean): Promise<void> {
    await this.oneSignal.setPrivacyConsent(privacyConsent);
  }

  static async getPrivacyConsent(): Promise<boolean> {
    return this.oneSignal.getPrivacyConsent();
  }

  static login(externalId: string, token?: JsonWebKey): void {
    this.oneSignal.login(externalId, token);
  }

  static loginGuest(): void {
    this.oneSignal.loginGuest();
  }

  static onLoginConflict(callback: (local: User, remote: User) => User): void {
    this.oneSignal.onLoginConflict(callback);
  }
}