import Log from '../libraries/Log';
import { isObject } from './validators';

/**
 * Returns true and logs when [value] is not a non-empty string, or contains a null byte.
 * Whitespace is still a value.
 */
export function isMissing(value: unknown, name: string): boolean {
  if (typeof value !== 'string' || !value) {
    Log._error(`${name} is required`);
    return true;
  }
  // A null byte cannot be stored in a text column.
  if (value.includes('\u0000')) {
    Log._error(`${name} contains a null byte`);
    return true;
  }
  return false;
}

/**
 * Returns true when [values] is not an array, or any item is missing, per [isMissing].
 */
export function hasMissingItems(values: unknown, api: string, item: string): boolean {
  if (!Array.isArray(values)) {
    Log._error(`${api}: ${item}s must be an array of strings`);
    return true;
  }
  return values.some((value) => isMissing(value, `${api}: ${item}`));
}

/**
 * Returns true when [values] is not an object, or any key or value is missing.
 * With [allowEmptyValue], "" and a value containing a null byte are kept. A null value is still rejected.
 */
export function hasMissingEntries(values: unknown, api: string, allowEmptyValue = false): boolean {
  if (!isObject(values)) {
    Log._error(`${api}: argument must be an object`);
    return true;
  }
  return Object.entries(values as Record<string, unknown>).some(([key, item]) => {
    if (isMissing(key, `${api}: key`)) return true;
    if (!allowEmptyValue) return isMissing(item, `${api}: value`);
    return item == null && isMissing(item, `${api}: value`);
  });
}
