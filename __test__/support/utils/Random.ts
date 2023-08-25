export default class Random {
  /**
   * Generates a random string of the specified length with the allowed characters.
   * @param length The length of the random string.
   * @param characterSet A string of characters to allow. Each character of the random string will
   * be one character of this set chosen at random.
   */
  public static getRandomString(length: number, characterSet = "abcdefghijklmnopqrstuvwxyz0123456789") {
    return this.getRandomArray(length, characterSet.length, 0)
      .map(n => characterSet[n])
      .join('');
  }

  public static getRandomNumber(length: number): number {
    return Number(Random.getRandomArray(length, 10, 0).join(''));
  }

  public static getRandomUint8Array(length: number) {
    return new Uint8Array(Random.getRandomArray(length, 255, 0));
  }

  public static getRandomArray(length: number, exclusiveMax: number, inclusiveMin: number) {
    return new Array(length)
      .fill(0)
      .map(n => Math.floor(Math.random() * (exclusiveMax - inclusiveMin) + inclusiveMin));
  }

  public static getRandomUuid(): string {
    let uuidStr = '';
    const crypto = typeof window === 'undefined' ? (global as any).crypto : window.crypto || (<any>window).msCrypto;
    if (crypto) {
      uuidStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    } else {
      uuidStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    return uuidStr;
  }
}
