import * as isUuid from 'validator/lib/isUUID';
import InvalidUuidError from '../errors/InvalidUuidError';

class Timestamp {
    constructor(public timestamp: string) {
    }
}

export { Timestamp };