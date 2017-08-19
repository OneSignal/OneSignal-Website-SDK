import { AppConfig } from './AppConfig';

export interface ProxyFrameInitOptions extends AppConfig {
  /**
   * Describes which origin is allowed to load our iFrame in a top-level page.
   *
   * This is set on OneSignal's dashboard as the Site URL property and passed
   * in.
   *
   * This can be set to *.
   */
  origin: string;
}
