import Emitter, { EventHandler } from "../shared/libraries/Emitter";
import { AppUserConfig } from "../shared/models/AppConfig";
import { LogLevel } from "./temp/LogLevel";
import { NotificationsNamespace } from "./temp/NotificationsNamespace";
import { SlidedownNamespace } from "./temp/SlidedownNamespace";
import { User } from "./temp/User";

export default interface IOneSignal {
  init: (config: AppUserConfig) => void;
  setAppId: (appId: string) => void;
  setLogLevel: (logLevel: LogLevel) => void;
  setRequiresPrivacyConsent: (privacyConsentRequired: boolean) => void;
  setPrivacyConsent: (privacyConsent: boolean) => void;
  getPrivacyConsent: () => void;

  login: (externalId: string, token?: JsonWebKey) => User;
  loginGuest: () => User;
  onLoginConflict: (callback: (local: User, remote: User) => User) => void;

  on: (event: string, listener: EventHandler) => Emitter; // private
  push: (item: () => any | object[]) => void;

  user: User; // readonly
  notifications: NotificationsNamespace; // instantiated
  slidedown: SlidedownNamespace;
}
