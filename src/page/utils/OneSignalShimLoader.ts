import { addScriptToPage, getPathAndPrefix } from 'src/shared/helpers/script';
import { VERSION } from 'src/shared/utils/EnvVariables';
import {
  isIosSafari,
  isPushNotificationsSupported,
} from './BrowserSupportsPush';

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
