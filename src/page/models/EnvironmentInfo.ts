import { Browser } from '../../shared/models/Browser';

// for runtime environment info
export interface EnvironmentInfo {
  browserType: Browser;
  browserVersion: number;
  isHttps: boolean;
  isBrowserAndSupportsServiceWorkers: boolean;
  requiresUserInteraction: boolean;
  osVersion: string | number;
}
