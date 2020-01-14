import { Browser } from './Browser';

// for runtime environment info
export interface EnvironmentInfo {
    browserType?: Browser;
    browserVersion?: string|number;
    isHttps?: boolean;
    isUsingSubscriptionWorkaround?: boolean;
    isBrowserAndSupportsServiceWorkers?: boolean;
    requiresUserInteraction?: boolean;
    osVersion?: string|number; 
}
