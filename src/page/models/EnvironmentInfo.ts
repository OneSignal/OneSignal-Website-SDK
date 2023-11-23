import { Browser } from '../../shared/models/Browser';

// for runtime environment info
export interface EnvironmentInfo {
  browserType: Browser;
  browserVersion: number;
  isBrowserAndSupportsServiceWorkers: boolean;
  requiresUserInteraction: boolean;
  osVersion: string | number;
}
