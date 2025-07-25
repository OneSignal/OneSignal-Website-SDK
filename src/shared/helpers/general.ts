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
