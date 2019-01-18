export function isNullOrUndefined<T>(value: T | null | undefined): boolean {
  return typeof value === 'undefined' || value === null;
}
