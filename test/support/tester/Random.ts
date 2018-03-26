export default class Random {
  /**
   * Generates a random string of the specified length with the allowed characters.
   * @param length The length of the random string.
   * @param characterSet A string of characters to allow. Each character of the random string will
   * be one character of this set chosen at random.
   */
  public static getRandomString(length: number, characterSet: string = "abcdefghijklmnopqrstuvwxyz0123456789") {
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
}
