import { BrowserUserAgent } from "../sdk/TestEnvironment";
import * as Browser from 'bowser';

export function setUserAgent(userAgent: BrowserUserAgent) {
  Object.defineProperty((window as any).navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
      enumerable: true,
      writable: true
  });
}

export function setBrowser(userAgent: BrowserUserAgent) {
  (global as any).Browser = (Browser as any)._detect(userAgent);
}
