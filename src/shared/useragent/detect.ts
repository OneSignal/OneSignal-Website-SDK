interface BrowserConfig {
  name: string;
  pattern: RegExp;
  versionPattern: RegExp;
}

interface IBrowserResult {
  name: string;
  version: string;
}

// Top popular browsers set
const BROWSER_CONFIGS: BrowserConfig[] = [
  {
    name: 'Opera',
    pattern: /(?:opera|opr|opios)/i,
    versionPattern: /(?:opera|opr|opios)[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Facebook',
    pattern: /FBAN\//i,
    versionPattern: /FBAV\/(\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Samsung Browser',
    pattern: /samsungbrowser/i,
    versionPattern: /samsungbrowser[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Yandex Browser',
    pattern: /yabrowser/i,
    versionPattern: /yabrowser[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Vivaldi',
    pattern: /vivaldi/i,
    versionPattern: /vivaldi[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'UC Browser',
    pattern: /ucbrowser/i,
    versionPattern: /ucbrowser[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Microsoft Edge',
    pattern: /edg/i,
    versionPattern: /edg[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Firefox',
    pattern: /firefox|iceweasel|fxios/i,
    versionPattern: /(?:firefox|iceweasel|fxios)[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Chromium',
    pattern: /chromium/i,
    versionPattern: /chromium[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Chrome',
    pattern: /chrome|crios|crmo/i,
    versionPattern: /(?:chrome|crios|crmo)[ /](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Safari',
    pattern: /safari|applewebkit/i,
    versionPattern: /version[ /](\d+(?:\.\d+)?)/i,
  },
];

export function getBrowser(userAgent: string): IBrowserResult {
  for (const config of BROWSER_CONFIGS) {
    if (config.pattern.test(userAgent)) {
      const version = userAgent.match(config.versionPattern)?.[1] ?? '';
      return { name: config.name, version };
    }
  }
  return { name: 'Unknown', version: '' };
}
const isAndroid = (userAgent: string): boolean =>
  !/like android/i.test(userAgent) && /android/i.test(userAgent);

const getIOSDeviceType = (userAgent: string): string =>
  userAgent.match(/(iphone|ipod|ipad)/i)?.[1]?.toLowerCase() || '';

// Based off detect-ua logic: https://github.com/TimvanScherpenzeel/detect-ua
export function isTabletBrowser(userAgent = navigator.userAgent): boolean {
  const ios = getIOSDeviceType(userAgent);

  return (
    (/tablet/i.test(userAgent) && !/tablet pc/i.test(userAgent)) ||
    ios === 'ipad' ||
    (isAndroid(userAgent) && !/[^-]mobi/i.test(userAgent)) ||
    (!/nexus\s*[0-6]\s*/i.test(userAgent) && /nexus\s*\d+/i.test(userAgent))
  );
}

// Based off detect-ua logic: https://github.com/TimvanScherpenzeel/detect-ua
export function isMobileBrowser(userAgent = navigator.userAgent): boolean {
  if (isTabletBrowser(userAgent)) return false;

  const ios = getIOSDeviceType(userAgent);
  return (
    /[^-]mobi/i.test(userAgent) ||
    ios === 'iphone' ||
    ios === 'ipod' ||
    isAndroid(userAgent)
  );
}
