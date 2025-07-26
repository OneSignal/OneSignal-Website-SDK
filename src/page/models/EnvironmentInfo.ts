import type { BrowserValue } from 'src/shared/models/Browser';

// for runtime environment info
export interface EnvironmentInfo {
  browserType: BrowserValue;
  browserVersion: number;
  isBrowserAndSupportsServiceWorkers: boolean;
  requiresUserInteraction: boolean;
  osVersion: string | number;
}
