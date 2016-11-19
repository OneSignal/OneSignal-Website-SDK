///<reference path="../../typings/globals/validator/index.d.ts"/>

import Serializable from "../Serializable";
import * as isUuid from 'validator/lib/isUUID';

class Uuid implements Serializable {
    uuid: string;

    constructor(uuid: string) {
        if (isUuid(uuid)) {
            this.uuid = uuid;
        } else {
            throw new InvalidUuidError(uuid);
        }
    }

    serialize() {
        return this.uuid;
    }
}

class InvalidUuidError {
    constructor(uuid: string) {
        const error = (<any>this);
        error.message = `'${uuid}' is not a valid UUID`;
        error.name = 'InvalidUuidError';
        error.stack = new Error().stack;
    }
}
InvalidUuidError.prototype = Object.create(Error.prototype);

export { Uuid, InvalidUuidError };