/**
 * Returns true if the UUID is a string of 36 characters;
 * @param uuid
 * @returns {*|boolean}
 */
export function isValidUuid(uuid: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    uuid,
  );
}

/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Nullable = undefined | null;
export function valueOrDefault<T>(value: T | Nullable, defaultValue: T): T {
  if (typeof value === 'undefined' || value === null) {
    return defaultValue;
  }
  return value;
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

export function isObject(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidEmail(email: string | undefined | null) {
  return (
    !!email &&
    !!email.match(
      // eslint-disable-next-line no-control-regex
      /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
    )
  );
}
