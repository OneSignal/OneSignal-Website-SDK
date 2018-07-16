import { isUsingSubscriptionWorkaround } from "../utils";

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

  /**
   * Wrapper function to allow stubing in tests
   */
  public static isUsingSubscriptionWorkaround(): boolean {
    return isUsingSubscriptionWorkaround();
  }
}

export default Utils;