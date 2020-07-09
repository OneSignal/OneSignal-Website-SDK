import { TagsObjectForApi, TagsObjectWithBoolean, TagCategory } from '../models/Tags';

export default class TagUtils {
    static convertTagsApiToBooleans(tags: TagsObjectForApi): TagsObjectWithBoolean {
        const convertedTags: TagsObjectWithBoolean = {};
        Object.keys(tags).forEach(key => {
            convertedTags[key] = tags[key] === "1" ? true : false;
        });
        return convertedTags;
    }

    static convertTagsBooleansToApi(tags: TagsObjectWithBoolean): TagsObjectForApi {
        const convertedTags: TagsObjectForApi = {};
        Object.keys(tags).forEach(key => {
            convertedTags[key] = tags[key] === true ? "1" : "0";
        });
        return convertedTags;
    }

    /**
     * Used in determining what Tag/Category preferences changed in order
     * to only update what is necessary
     * @param  {TagsObject} localTags - tags from taggingContainer with values of type "number"
     * @param  {TagsObject} remoteTags - remote player tags with values of type "number"
     * @returns array of keys of corresponding different values (finds difference)
     */
    static getObjectDifference(localTags: TagsObjectForApi, remoteTags: TagsObjectForApi): TagsObjectForApi {
        const finalTags: TagsObjectForApi = {};

        // Going off local tags since it's our categories. Trying to find only changed tags and returning those
        // as a final object.
        Object.keys(localTags).forEach(key => {
            if (remoteTags[key] && localTags[key] !== remoteTags[key]) {
                finalTags[key] = localTags[key];
            }
        });
        return finalTags;
    }

    static markAllTagsAsSpecified(categoryArray: TagCategory[], checked: boolean): void {
        categoryArray.forEach(category => {
            category.checked = checked;
        });
    }

    static isTagObjectEmpty(tags: TagsObjectForApi): boolean {
        return Object.keys(tags).length > 0;
    } 
}
