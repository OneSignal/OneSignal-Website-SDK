import { Browser } from './constants';
import { getBrowser, isMobile, isTablet } from './detect';
import type { BrowserValue } from './types';

const BROWSER_MAP: Record<string, BrowserValue> = {
  Chrome: Browser.Chrome,
  Chromium: Browser.Chrome,
  Firefox: Browser.Firefox,
  'Microsoft Edge': Browser.Edge,
  Safari: Browser.Safari,
};

export function getBrowserName(): BrowserValue {
  return BROWSER_MAP[getBrowser(navigator.userAgent).name] || Browser.Other;
}

export const getBrowserVersion = (): number => {
  const version = getBrowser(navigator.userAgent).version;
  if (!version) return -1;
  const [major, minor = '0'] = version.split('.');
  return +`${major}.${minor}`;
};

export const isMobileBrowser = (): boolean => isMobile(navigator.userAgent);
export const isTabletBrowser = (): boolean => isTablet(navigator.userAgent);

export function requiresUserInteraction(): boolean {
  const browserName = getBrowserName();
  const version = getBrowserVersion();
  return (
    (browserName === Browser.Firefox && version >= 72) ||
    (browserName === Browser.Safari && version >= 12.1)
  );
}
