import { BrowserUserAgent } from '../sdk/TestEnvironment';
import bowser from 'bowser';

export function setUserAgent(userAgent: BrowserUserAgent) {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
    enumerable: true,
    writable: true,
  });
  Object.defineProperty(navigator, 'platform', {
    value: 'MacIntel',
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

export function setBrowser(userAgent: BrowserUserAgent) {
  (global as any).bowser = (bowser as any)._detect(userAgent);
  (global as any).Browser = (global as any).bowser;
}
