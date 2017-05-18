import * as isUuid from 'validator/lib/isUUID';
import InvalidUuidError from '../errors/InvalidUuidError';

export class Uuid {
  private uuid: string;

  get value() {
    return this.uuid;
  }

  constructor(uuid: string = Uuid.generate()) {
    if (isUuid(uuid)) {
      this.uuid = uuid;
    } else {
      throw new InvalidUuidError(uuid);
    }
  }

  static generate() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var crypto = typeof window === "undefined" ? (global as any).crypto : (window.crypto || (<any>window).msCrypto);
      if (crypto) {
        var r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      } else {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    });
  }
}
