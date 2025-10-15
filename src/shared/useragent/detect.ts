import { Browser } from './constants';
import type { BrowserValue } from './types';

interface BrowserConfig {
  _name: string;
  _pattern: RegExp;
  _versionPattern: RegExp;
}

interface IBrowserResult {
  name: string;
  version: string;
}

// Top popular browsers set
const BROWSER_CONFIGS: BrowserConfig[] = [
  {
    _name: 'Opera',
    _pattern: /(?:opera|opr|opios)/i,
    _versionPattern: /(?:opera|opr|opios)[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Facebook',
    _pattern: /FBAN\//i,
    _versionPattern: /FBAV\/(\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Samsung Browser',
    _pattern: /samsungbrowser/i,
    _versionPattern: /samsungbrowser[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Yandex Browser',
    _pattern: /yabrowser/i,
    _versionPattern: /yabrowser[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Vivaldi',
    _pattern: /vivaldi/i,
    _versionPattern: /vivaldi[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'UC Browser',
    _pattern: /ucbrowser/i,
    _versionPattern: /ucbrowser[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Microsoft Edge',
    _pattern: /edg/i,
    _versionPattern: /edg[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Firefox',
    _pattern: /firefox|iceweasel|fxios/i,
    _versionPattern: /(?:firefox|iceweasel|fxios)[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Chromium',
    _pattern: /chromium/i,
    _versionPattern: /chromium[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Chrome',
    _pattern: /chrome|crios|crmo/i,
    _versionPattern: /(?:chrome|crios|crmo)[ /](\d+(?:\.\d+)?)/i,
  },
  {
    _name: 'Safari',
    _pattern: /safari|applewebkit/i,
    _versionPattern: /version[ /](\d+(?:\.\d+)?)/i,
  },
];

export function getBrowser(userAgent: string): IBrowserResult {
  for (const config of BROWSER_CONFIGS) {
    if (config._pattern.test(userAgent)) {
      const version = userAgent.match(config._versionPattern)?.[1] ?? '';
      return { name: config._name, version };
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

const BROWSER_MAP: Record<string, BrowserValue> = {
  Chrome: Browser._Chrome,
  Chromium: Browser._Chrome,
  Firefox: Browser._Firefox,
  'Microsoft Edge': Browser._Edge,
  Safari: Browser._Safari,
};

export function getBrowserName(): BrowserValue {
  return BROWSER_MAP[getBrowser(navigator.userAgent).name] || Browser._Other;
}

export const getBrowserVersion = (): number => {
  const version = getBrowser(navigator.userAgent).version;
  if (!version) return -1;
  const [major, minor = '0'] = version.split('.');
  return +`${major}.${minor}`;
};

export function requiresUserInteraction(): boolean {
  const browserName = getBrowserName();
  const version = getBrowserVersion();
  return (
    (browserName === Browser._Firefox && version >= 72) ||
    (browserName === Browser._Safari && version >= 12.1)
  );
}
