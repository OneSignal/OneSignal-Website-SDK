import { Browser } from './constants';
import type { BrowserValue } from './types';

export function getBrowserName(): BrowserValue {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('edg/')) return Browser.Edge;
  if (ua.includes('chrome/') && !ua.includes('edg/') && !ua.includes('opr/'))
    return Browser.Chrome;
  if (ua.includes('safari/') && !ua.includes('chrome/')) return Browser.Safari;
  if (ua.includes('firefox/')) return Browser.Firefox;
  return Browser.Other;
}

export function getBrowserVersion(): number {
  const ua = navigator.userAgent;
  let version = NaN;
  const browsers = [
    { name: 'Edge', regex: /edg\/([\d\.]+)/i },
    { name: 'Opera', regex: /(?:opr|opera)\/([\d\.]+)/i },
    { name: 'Chrome', regex: /chrome\/([\d\.]+)/i },
    { name: 'Safari', regex: /version\/([\d\.]+).*safari/i },
    { name: 'Firefox', regex: /firefox\/([\d\.]+)/i },
  ];

  for (const browser of browsers) {
    const match = ua.match(browser.regex);
    if (match) {
      const [major, minor = '0'] = match[1].split('.');
      version = +`${major}.${minor}`;
    }
  }

  return version;
}

export function isMobileBrowser(): boolean {
  const ua = navigator.userAgent;
  return /android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(ua);
}

export function isTabletBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();

  const isIPad = /\bipad\b/.test(ua);
  const isAndroidTablet = /android/.test(ua) && !/mobile/.test(ua); // Android tablets don't include "mobile"
  const isWindowsTablet =
    /windows/.test(ua) && /touch/.test(ua) && !/phone/.test(ua);
  const isKindleOrFire = /kindle|silk|kf[a-z]{2,}/.test(ua); // Amazon devices

  return isIPad || isAndroidTablet || isWindowsTablet || isKindleOrFire;
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
