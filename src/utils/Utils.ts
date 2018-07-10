export class Utils {
  public static getBaseUrl() {
    return location.origin;
  }

  public static getValueOrDefault<T>(value: T | undefined | null, defaultValue: T): T {
    if (value !== undefined && value !== null) {
      return value;
    }
    return defaultValue;
  }
}

export default Utils;