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
     * Used in determining what Tag/Category preferences changed in order
     * to only update what is necessary
     * @param  {TagsObject} localTags - tags from taggingContainer
     * @param  {TagsObject} remoteTags - remote player tags
     * @returns array of keys of corresponding different values (finds difference)
     */
    static getObjectDifference(localTags: TagsObject, remoteTags: TagsObject): string[] {
        assertObjectValuesType(localTags, "number");
        assertObjectValuesType(remoteTags, "number");

        const keysArray: string[] = [];
        const remoteTagsCopy = { ...remoteTags };

        Object.keys(localTags).forEach(key => {
            /**
             * treat undefined remote playerTag values as 0
             *  logic:
             *      LOCAL   REMOTE  RESULT
             *      1       0       1   <-- same
             *      1       undef   1   <-- same
             */
            if (typeof remoteTagsCopy[key] === "undefined") {
                remoteTagsCopy[key] = 0;
            }

            const areDifferent = localTags[key] !== remoteTagsCopy[key];

            if (areDifferent) {
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