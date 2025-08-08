/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nothing(): Promise<any> {
  return Promise.resolve();
}

export function getValueOrDefault<T>(
  value: T | undefined | null,
  defaultValue: T,
): T {
  if (value !== undefined && value !== null) {
    return value;
  }
  return defaultValue;
}

export function getTimeZoneId() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getBaseUrl() {
  return location.origin;
}
