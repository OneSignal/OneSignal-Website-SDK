interface BrowserConfig {
  name: string;
  pattern: RegExp;
  versionPattern?: RegExp;
}

interface IBrowserResult {
  name: string;
  version: string;
}

const PATTERNS = {
  LIKE_ANDROID: /like android/i,
  ANDROID: /android/i,
  IOS_DEVICES: /(iphone|ipod|ipad)/i,
  TABLET: /tablet/i,
  TABLET_PC: /tablet pc/i,
  MOBILE: /[^-]mobi/i,
  NEXUS_MOBILE: /nexus\s*[0-6]\s*/i,
  NEXUS_TABLET: /nexus\s*[0-9]+/i,
  GENERIC_VERSION: /version\/(\d+(?:\.\d+)?)/i,
} as const;

// Ordered from most specific to least specific
const BROWSER_CONFIGS: BrowserConfig[] = [
  {
    name: 'Opera',
    pattern: /(?:opera|opr|opios)/i,
    versionPattern: /(?:opera|opr|opios)[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Facebook',
    pattern: /FBAN\//i,
    versionPattern: /FBAV\/(\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Samsung Internet for Android',
    pattern: /samsungbrowser/i,
    versionPattern: /samsungbrowser[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Yandex Browser',
    pattern: /yabrowser/i,
    versionPattern: /yabrowser[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Vivaldi',
    pattern: /vivaldi/i,
    versionPattern: /vivaldi[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'UC Browser',
    pattern: /ucbrowser/i,
    versionPattern: /ucbrowser[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Microsoft Edge',
    pattern: /(edge|edgios|edga|edg)/i,
    versionPattern: /(edge|edgios|edga|edg)[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Firefox',
    pattern: /firefox|iceweasel|fxios/i,
    versionPattern: /(?:firefox|iceweasel|fxios)[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Chromium',
    pattern: /chromium/i,
    versionPattern: /chromium[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Chrome',
    pattern: /chrome|crios|crmo/i,
    versionPattern: /(?:chrome|crios|crmo)[\s\/](\d+(?:\.\d+)?)/i,
  },
  {
    name: 'Safari',
    pattern: /safari|applewebkit/i,
    versionPattern: /version[\s\/](\d+(?:\.\d+)?)/i,
  },
];

const matchUserAgent = (
  userAgent: string,
  position: number,
  pattern: RegExp,
): string => {
  const match = userAgent.match(pattern);
  return match?.[position] || '';
};

const safeNavigator = () =>
  typeof navigator !== 'undefined' ? navigator : null;
const safeWindow = () => (typeof window !== 'undefined' ? window : null);

function extractVersion(userAgent: string, config: BrowserConfig): string {
  if (config.versionPattern) {
    const match = userAgent.match(config.versionPattern);
    if (match) {
      const index = config.versionPattern.source.includes('(')
        ? config.name === 'Microsoft Edge'
          ? 2
          : 1
        : 1;
      return match[index] || '';
    }
  }
  return matchUserAgent(userAgent, 1, PATTERNS.GENERIC_VERSION);
}

export function getBrowser(userAgent: string): IBrowserResult {
  if (!userAgent) return { name: 'Unknown', version: '' };

  for (const config of BROWSER_CONFIGS) {
    if (config.pattern.test(userAgent)) {
      return { name: config.name, version: extractVersion(userAgent, config) };
    }
  }
  return {
    name: matchUserAgent(userAgent, 1, /^(.*?)[\s\/]/) || 'Unknown',
    version: matchUserAgent(userAgent, 2, /^(.*?)[\s\/](.+?)[\s]/) || '',
  };
}

function isAndroidDevice(userAgent: string): boolean {
  return (
    !!userAgent &&
    !PATTERNS.LIKE_ANDROID.test(userAgent) &&
    PATTERNS.ANDROID.test(userAgent)
  );
}

export function getIOSDeviceType(userAgent: string): string {
  if (!userAgent) return '';

  let deviceType = matchUserAgent(
    userAgent,
    1,
    PATTERNS.IOS_DEVICES,
  ).toLowerCase();

  // iPadOS workaround
  const nav = safeNavigator();
  const win = safeWindow();
  if (
    !deviceType &&
    nav?.platform === 'MacIntel' &&
    nav?.maxTouchPoints > 2 &&
    !(win as { MSStream?: unknown })?.MSStream
  ) {
    deviceType = 'ipad';
  }

  return deviceType;
}

export function isTablet(userAgent: string): boolean {
  if (!userAgent) return false;

  const isAndroid = isAndroidDevice(userAgent);
  const iOSDevice = getIOSDeviceType(userAgent);

  return (
    (PATTERNS.TABLET.test(userAgent) && !PATTERNS.TABLET_PC.test(userAgent)) ||
    iOSDevice === 'ipad' ||
    (isAndroid && !PATTERNS.MOBILE.test(userAgent)) ||
    (!PATTERNS.NEXUS_MOBILE.test(userAgent) &&
      PATTERNS.NEXUS_TABLET.test(userAgent))
  );
}

export function isMobile(userAgent: string): boolean {
  if (!userAgent) return false;

  const isTabletDevice = isTablet(userAgent);
  const isAndroid = isAndroidDevice(userAgent);
  const iOSDevice = getIOSDeviceType(userAgent);

  return (
    !isTabletDevice &&
    (PATTERNS.MOBILE.test(userAgent) ||
      iOSDevice === 'iphone' ||
      iOSDevice === 'ipod' ||
      isAndroid ||
      PATTERNS.NEXUS_MOBILE.test(userAgent))
  );
}
