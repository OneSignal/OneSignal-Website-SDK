import Log from '../libraries/Log';
import { TagsObject } from '../models/Tags';
import { assertObjectValuesType } from '../utils';

export default class TagUtils {
    static convertTagBooleanValuesToNumbers(tags: TagsObject): TagsObject {
        assertObjectValuesType(tags, "boolean");
        tags = JSON.parse(JSON.stringify(tags));
        Object.keys(tags).forEach(key => {
            tags[key] = Number(tags[key]);
        });
        return tags;
    }

    static convertTagNumberValuesToBooleans(tags: TagsObject): TagsObject {
        assertObjectValuesType(tags, "number");
        tags = JSON.parse(JSON.stringify(tags));
        Object.keys(tags).forEach(key => {
            tags[key] = tags[key].toString() === "1" ? true : false;
        });
        return tags;
    }

    static convertTagStringValuesToNumbers(tags: TagsObject): TagsObject {
        assertObjectValuesType(tags, "string");
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
    /**
     * @param  {TagsObject} object - with object values of type "Number"
     * @returns TagsObject with only those key value pairs with the value as "1"
     */
    static getTruthyValuePairsFromNumbers(object: TagsObject): TagsObject {
        assertObjectValuesType(object, "number");
        const returnObj: TagsObject = {};
        Object.keys(object).forEach(key => {
            if (object[key] === "1") {
                returnObj[key] = object[key];
            }
        });
        return returnObj;
    }
}