/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getBaseUrl() {
  return location.origin;
}

/**
 * Returns a copy of an object with its jwt field masked, for log lines. A
 * token must never reach the console.
 */
export function redactJwt<T>(value: T): T {
  if (value && typeof value === 'object' && 'jwt' in value && value.jwt) {
    return { ...value, jwt: '[redacted]' };
  }
  return value;
}
