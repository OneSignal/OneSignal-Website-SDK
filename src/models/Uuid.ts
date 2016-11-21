import * as isUuid from 'validator/lib/isUUID';
import InvalidUuidError from '../errors/InvalidUuidError';

class Uuid {
    uuid: string;

    constructor(uuid: string) {
        if (isUuid(uuid)) {
            this.uuid = uuid;
        } else {
            throw new InvalidUuidError(uuid);
        }
    }
}

export { Uuid };