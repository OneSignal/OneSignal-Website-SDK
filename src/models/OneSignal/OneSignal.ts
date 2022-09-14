import Emitter, { EventHandler } from "../../shared/libraries/Emitter";
import { AppUserConfig } from "../../shared/models/AppConfig";
import { LogLevel } from "../LogLevel";
import { NotificationsNamespace } from "./NotificationsNamespace";
import { SlidedownNamespace } from "./SlidedownNamespace";
import { User } from "./User";

interface OneSignal {
  init: (config: AppUserConfig) => void;
  setAppId: (appId: string) => void;
  setLogLevel: (logLevel: LogLevel) => void;
  setRequiresPrivacyConsent: (privacyConsentRequired: boolean) => void;
  setPrivacyConsent: (privacyConsent: boolean) => void;
  getPrivacyConsent: () => void;

  login: (externalId: string, authHash?: string) => Promise<User>;
  loginGuest: () => Promise<User>;
  onLoginConflict: (callback: (local: User, remote: User) => User) => void;

  on: (event: string, listener: EventHandler) => Emitter; // private
  push: (item: () => any | object[]) => void;

  user: User; // readonly
  notifications: NotificationsNamespace; // instantiated
  slidedown: SlidedownNamespace;
}
