// for runtime environment info
export interface EnvironmentInfo {
    isBrowser: boolean;
    browserType: string;
    browserVersion: number;
    isHttps: boolean;
    isUsingSubscriptionWorkaround: boolean;
    isBrowserAndSupportsServiceWorkers: boolean;
    requiresUserInteraction: boolean;
    osVersion: number; 
}
