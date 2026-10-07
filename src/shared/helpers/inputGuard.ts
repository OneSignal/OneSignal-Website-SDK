import Log from '../libraries/Log';
import { isObject } from './validators';

/**
 * Returns true and logs when [value] is null, empty, or contains a null byte.
 * Whitespace is still a value.
 */
export function isMissing(value: unknown, api: string): boolean {
  // A NUL cannot be stored in a text column, so it is never a usable value.
  if (typeof value === 'string' && value.includes('\u0000')) {
    Log._error(`${api} contains a null byte`);
    return true;
  }
  if (typeof value === 'string' && value.length > 0) return false;
  Log._error(`${api} is required`);
  return true;
}

/**
 * Returns true when any of [values] is missing, per [isMissing].
 */
export function hasMissingItems(values: unknown, api: string): boolean {
  if (!Array.isArray(values)) return isMissing(values, api);
  return values.some((value) => isMissing(value, api));
}

/**
 * Returns true when any key is missing, or any value is missing.
 * With [allowEmptyValue], "" and a value containing a null byte are kept. A null value is still rejected.
 */
export function hasMissingEntries(values: unknown, api: string, allowEmptyValue = false): boolean {
  if (!isObject(values)) return isMissing(values, api);
  return Object.entries(values as Record<string, unknown>).some(([key, item]) => {
    if (isMissing(key, `${api}: key`)) return true;
    if (allowEmptyValue) return item == null && isMissing(item, `${api}: value`);
    return isMissing(item, `${api}: value`);
  });
}
