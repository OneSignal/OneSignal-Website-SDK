import {
  BUILD_ORIGIN,
  BUILD_TYPE,
  IS_HTTPS,
  NO_DEV_PORT,
  VERSION,
} from 'src/shared/utils/env';
import {
  isIosSafari,
  isPushNotificationsSupported,
} from './BrowserSupportsPush';
// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.

// See sdk.ts for what entry points this handles

function addScriptToPage(url: string): void {
  const scriptElement = document.createElement('script');
  scriptElement.src = url;
  // Using defer over async; async timing is inconsistent and may interrupt DOM rendering
  scriptElement.defer = true;
  document.head.appendChild(scriptElement);
}

// Same logic from env helper
function getPathAndPrefix(): string {
  const productionOrigin = 'https://cdn.onesignal.com/sdks/web/v16/';
  const protocol = IS_HTTPS ? 'https' : 'http';
  const port = IS_HTTPS ? 4001 : 4000;

  // using if statements to have better dead code elimination
  if (BUILD_TYPE === 'development')
    return NO_DEV_PORT
      ? `${protocol}://${BUILD_ORIGIN}/sdks/web/v16/Dev-`
      : `${protocol}://${BUILD_ORIGIN}:${port}/sdks/web/v16/Dev-`;

  if (BUILD_TYPE === 'staging')
    return `https://${BUILD_ORIGIN}/sdks/web/v16/Staging-`;

  return productionOrigin;
}

function loadFullPageSDK(): void {
  addScriptToPage(`${getPathAndPrefix()}OneSignalSDK.page.es6.js?v=${VERSION}`);
}

function printEnvironmentNotSupported() {
  let logMessage = 'Incompatible browser.';
  if (isIosSafari()) {
    logMessage += ' Try these steps: https://tinyurl.com/bdh2j9f7';
  }
  console.info(logMessage);
}

export function start(): void {
  if (isPushNotificationsSupported()) {
    loadFullPageSDK();
  } else {
    printEnvironmentNotSupported();
  }
}
