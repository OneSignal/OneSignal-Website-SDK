export default class Random {
  static getRandomString(length: number) {
    return Array(length+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, length);
  }
}