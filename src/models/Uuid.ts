import * as isUuid from 'validator/lib/isUUID';
import InvalidUuidError from '../errors/InvalidUuidError';
import { Serializable } from './Serializable';

export class Uuid implements Serializable {
  private uuid: string;

  get value(): string {
    return this.uuid;
  }

  constructor(uuid: string) {
    if (!uuid) {
      this.uuid = null;
    } else if (isUuid(uuid)) {
      this.uuid = uuid;
    } else {
      throw new InvalidUuidError(uuid);
    }
  }

  toString() {
    return this.uuid;
  }

  static generate(): Uuid {
    let uuidStr = '';
    const crypto = typeof window === 'undefined' ? (global as any).crypto : window.crypto || (<any>window).msCrypto;
    if (crypto) {
      uuidStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    } else {
      uuidStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    return new Uuid(uuidStr);
  }

  serialize() {
    return this.value;
  }

  static deserialize(uuid: string) {
    return new Uuid(uuid);
  }
}
