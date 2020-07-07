import Log from '../libraries/Log';
import { TagsObject } from '../models/Tags';
import _ from "lodash";

export default class TagUtils {
    static convertTagBooleanValuesToNumbers(tags: TagsObject): TagsObject {
        tags = JSON.parse(JSON.stringify(tags));
        Object.keys(tags).forEach(key => {
            tags[key] = Number(tags[key]);
        });
        return tags;
    }

    static convertTagNumberValuesToBooleans(tags: TagsObject): TagsObject {
        tags = JSON.parse(JSON.stringify(tags));
        Object.keys(tags).forEach(key => {
            tags[key] = tags[key].toString() === "1" ? true : false;
        });
        return tags;
    }

    static convertTagStringValuesToNumbers(tags: TagsObject): TagsObject {
        tags = JSON.parse(JSON.stringify(tags));
        Object.keys(tags).forEach(key => {
            tags[key] = tags[key].toString() === "1" ? 1 : 0;
        });
        return tags;
    }
    /**
     * @param  {TagsObject} a
     * @param  {TagsObject} b
     * @returns array of keys of corresponding different values
     */
    static getObjectDifference(a: TagsObject, b: TagsObject): string[] {
        return _.reduce(a, function(res, val, key) {
            return _.isEqual(val, b[key]) ? res : res.concat(key);
        }, []);
    }
    /**
     * @param  {string[]} keys
     * @param  {TagsObject} object
     * @returns TagsObject with only key-value pairs of corresponding inputted keys
     */
    static getOnlyKeysObject(keys: string[], object: TagsObject): TagsObject {
        const returnObj: TagsObject = {};
        keys.forEach(key => {
            returnObj[key] = object[key];
        });
        return returnObj;
    }
}