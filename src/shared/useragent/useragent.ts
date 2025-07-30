import { Browser } from './constants';
import { getBrowser, isMobile, isTablet } from './detect';
import type { BrowserValue } from './types';

// Reference: https://github.com/TimvanScherpenzeel/detect-ua/blob/master/src/index.ts

export function getBrowserName(): BrowserValue {
  const name = getBrowser(navigator.userAgent).name;
  switch (name) {
    case 'Chrome':
    case 'Chromium':
      return Browser.Chrome;
    case 'Firefox':
      return Browser.Firefox;
    case 'Microsoft Edge':
      return Browser.Edge;
    case 'Safari':
      return Browser.Safari;
    default:
      return Browser.Other;
  }
}

export function getBrowserVersion(): number {
  const version = getBrowser(navigator.userAgent).version;
  if (!version) return -1;
  const [major, minor = '0'] = version.split('.');
  return +`${major}.${minor}`;
}

export function isMobileBrowser(): boolean {
  return isMobile(navigator.userAgent);
}

export function isTabletBrowser(): boolean {
  return isTablet(navigator.userAgent);
}

export function requiresUserInteraction(): boolean {
  const browserName = getBrowserName();
  const version = getBrowserVersion();

  // Firefox 72+ requires user-interaction
  if (browserName === Browser.Firefox && version >= 72) return true;

  // Safari 12.1+ requires user-interaction
  if (browserName === Browser.Safari && version >= 12.1) return true;

  return false;
}
