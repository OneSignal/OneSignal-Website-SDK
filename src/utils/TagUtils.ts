import Log from '../libraries/Log';
import { TagsObject } from '../models/Tags';

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
        const keysArray: string[] = [];
        Object.keys(a).forEach(key => {
            if (a[key] !== b[key]) {
                keysArray.push(key);
            }
        });
        return keysArray;
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