import { Browser } from '../../shared/models/Browser';

// for runtime environment info
export interface EnvironmentInfo {
  browserType: Browser;
  browserVersion: number;
  isHttps: boolean;
  isUsingSubscriptionWorkaround: boolean;
  isBrowserAndSupportsServiceWorkers: boolean;
  requiresUserInteraction: boolean;
  osVersion: string | number;
  canTalkToServiceWorker: boolean;
}
