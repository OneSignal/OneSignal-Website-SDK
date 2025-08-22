import {
  BUILD_ORIGIN,
  BUILD_TYPE,
  IS_HTTPS,
  NO_DEV_PORT,
} from '../utils/EnvVariables';

export function addScriptToPage(url: string): void {
  const scriptElement = document.createElement('script');
  scriptElement.src = url;
  // Using defer over async; async timing is inconsistent and may interrupt DOM rendering
  scriptElement.defer = true;
  document.head.appendChild(scriptElement);
}

// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.
// Same logic from env helper
export function getPathAndPrefix(): string {
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
