// types.ts
export interface IDeviceResult {
  version: string;
}

export interface IBrowserResult {
  name: string;
  version: string;
}

// utils.ts
const isSSR = typeof window === 'undefined';

/**
 * Get user agent string with SSR support
 */
export function getUserAgent(forceUserAgent?: string): string {
  return forceUserAgent
    ? forceUserAgent
    : !isSSR && window.navigator
      ? window.navigator.userAgent
      : '';
}

/**
 * Match entry based on position found in the user-agent string
 */
export function matchUserAgent(
  userAgent: string,
  position: number,
  pattern: RegExp,
): string {
  const match = userAgent.match(pattern);
  return (match && match.length > 1 && match[position]) || '';
}

// device-detection.ts
/**
 * Check if device is Android
 */
export function isAndroidDevice(userAgent: string): boolean {
  return !/like android/i.test(userAgent) && /android/i.test(userAgent);
}

/**
 * Get iOS device type (iphone, ipod, ipad, or empty string)
 */
export function getIOSDeviceType(userAgent: string): string {
  let deviceType = matchUserAgent(
    userAgent,
    1,
    /(iphone|ipod|ipad)/i,
  ).toLowerCase();

  // Workaround for ipadOS, force detection as tablet
  // SEE: https://github.com/lancedikson/bowser/issues/329
  // SEE: https://stackoverflow.com/questions/58019463/how-to-detect-device-name-in-safari-on-ios-13-while-it-doesnt-show-the-correct
  if (
    !isSSR &&
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 2 &&
    !(window as any).MSStream
  ) {
    deviceType = 'ipad';
  }

  return deviceType;
}

/**
 * Check if device is a tablet
 */
export function isTablet(userAgent: string): boolean {
  const isAndroid = isAndroidDevice(userAgent);
  const iOSDevice = getIOSDeviceType(userAgent);

  return (
    // Default tablet
    (/tablet/i.test(userAgent) && !/tablet pc/i.test(userAgent)) ||
    // iPad
    iOSDevice === 'ipad' ||
    // Android tablet
    (isAndroid && !/[^-]mobi/i.test(userAgent)) ||
    // Nexus tablet
    (!/nexus\s*[0-6]\s*/i.test(userAgent) && /nexus\s*[0-9]+/i.test(userAgent))
  );
}

/**
 * Check if device is mobile
 */
export function isMobile(userAgent: string): boolean {
  const isTabletDevice = isTablet(userAgent);
  const isAndroid = isAndroidDevice(userAgent);
  const iOSDevice = getIOSDeviceType(userAgent);

  return (
    // Default mobile
    !isTabletDevice &&
    (/[^-]mobi/i.test(userAgent) ||
      // iPhone / iPod
      iOSDevice === 'iphone' ||
      iOSDevice === 'ipod' ||
      // Android mobile
      isAndroid ||
      // Nexus mobile
      /nexus\s*[0-6]\s*/i.test(userAgent))
  );
}

/**
 * Check if device is desktop
 */
export function isDesktop(userAgent: string): boolean {
  return !isMobile(userAgent) && !isTablet(userAgent);
}

// os-detection.ts
/**
 * Check if device is running macOS and return version info
 */
export function isMacOS(userAgent: string): IDeviceResult | false {
  if (!/macintosh/i.test(userAgent)) {
    return false;
  }

  const version = matchUserAgent(userAgent, 1, /mac os x (\d+(\.?_?\d+)+)/i)
    .replace(/[_\s]/g, '.')
    .split('.')
    .map((versionNumber: string): string => versionNumber)[1];

  return { version };
}

/**
 * Check if device is running Windows and return version info
 */
export function isWindows(userAgent: string): IDeviceResult | false {
  if (!/windows /i.test(userAgent)) {
    return false;
  }

  const version = matchUserAgent(
    userAgent,
    1,
    /Windows ((NT|XP)( \d\d?.\d)?)/i,
  );
  return { version };
}

/**
 * Check if device is running iOS and return version info
 */
export function isiOS(userAgent: string): IDeviceResult | false {
  const iOSDevice = getIOSDeviceType(userAgent);

  if (!iOSDevice) {
    return false;
  }

  const version =
    matchUserAgent(userAgent, 1, /os (\d+([_\s]\d+)*) like mac os x/i).replace(
      /[_\s]/g,
      '.',
    ) || matchUserAgent(userAgent, 1, /version\/(\d+(\.\d+)?)/i);

  return { version };
}

/**
 * Check if device is running Android and return version info
 */
export function isAndroid(userAgent: string): IDeviceResult | false {
  if (!isAndroidDevice(userAgent)) {
    return false;
  }

  const version = matchUserAgent(userAgent, 1, /android[ \/-](\d+(\.\d+)*)/i);
  return { version };
}

// browser-detection.ts
/**
 * Detect browser name and version
 */
export function getBrowser(userAgent: string): IBrowserResult {
  const versionIdentifier = matchUserAgent(
    userAgent,
    1,
    /version\/(\d+(\.\d+)?)/i,
  );

  if (/opera/i.test(userAgent)) {
    // Opera
    return {
      name: 'Opera',
      version:
        versionIdentifier ||
        matchUserAgent(userAgent, 1, /(?:opera|opr|opios)[\s\/](\d+(\.\d+)?)/i),
    };
  } else if (/opr\/|opios/i.test(userAgent)) {
    // Opera
    return {
      name: 'Opera',
      version:
        matchUserAgent(userAgent, 1, /(?:opr|opios)[\s\/](\d+(\.\d+)?)/i) ||
        versionIdentifier,
    };
  } else if (/SamsungBrowser/i.test(userAgent)) {
    // Samsung Browser
    return {
      name: 'Samsung Internet for Android',
      version:
        versionIdentifier ||
        matchUserAgent(userAgent, 1, /(?:SamsungBrowser)[\s\/](\d+(\.\d+)?)/i),
    };
  } else if (/yabrowser/i.test(userAgent)) {
    // Yandex Browser
    return {
      name: 'Yandex Browser',
      version:
        versionIdentifier ||
        matchUserAgent(userAgent, 1, /(?:yabrowser)[\s\/](\d+(\.\d+)?)/i),
    };
  } else if (/ucbrowser/i.test(userAgent)) {
    // UC Browser
    return {
      name: 'UC Browser',
      version: matchUserAgent(
        userAgent,
        1,
        /(?:ucbrowser)[\s\/](\d+(\.\d+)?)/i,
      ),
    };
  } else if (/msie|trident/i.test(userAgent)) {
    // Internet Explorer
    return {
      name: 'Internet Explorer',
      version: matchUserAgent(userAgent, 1, /(?:msie |rv:)(\d+(\.\d+)?)/i),
    };
  } else if (/(edge|edgios|edga|edg)/i.test(userAgent)) {
    // Edge
    return {
      name: 'Microsoft Edge',
      version: matchUserAgent(
        userAgent,
        2,
        /(edge|edgios|edga|edg)\/(\d+(\.\d+)?)/i,
      ),
    };
  } else if (/firefox|iceweasel|fxios/i.test(userAgent)) {
    // Firefox
    return {
      name: 'Firefox',
      version: matchUserAgent(
        userAgent,
        1,
        /(?:firefox|iceweasel|fxios)[ \/](\d+(\.\d+)?)/i,
      ),
    };
  } else if (/chromium/i.test(userAgent)) {
    // Chromium
    return {
      name: 'Chromium',
      version:
        matchUserAgent(userAgent, 1, /(?:chromium)[\s\/](\d+(?:\.\d+)?)/i) ||
        versionIdentifier,
    };
  } else if (/chrome|crios|crmo/i.test(userAgent)) {
    // Chrome
    return {
      name: 'Chrome',
      version: matchUserAgent(
        userAgent,
        1,
        /(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i,
      ),
    };
  } else if (/safari|applewebkit/i.test(userAgent)) {
    // Safari
    return {
      name: 'Safari',
      version: versionIdentifier,
    };
  } else {
    // Everything else
    return {
      name: matchUserAgent(userAgent, 1, /^(.*)\/(.*) /),
      version: matchUserAgent(userAgent, 2, /^(.*)\/(.*) /),
    };
  }
}
