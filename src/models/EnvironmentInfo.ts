// for runtime environment info
export interface EnvironmentInfo {
    isHttps   ?: boolean;
    browser   ?: Browser;
    browserVersion ?: number;
    shouldAutoAccept ?: boolean;
}

export enum Browser {
    Firefox = 'firefox',
    Chrome = 'chrome',
    Edge = 'edge',
    Safari = 'safari',
    Opera = 'opera',
    InternetExplorer = 'explorer',
    Other = 'other'
}