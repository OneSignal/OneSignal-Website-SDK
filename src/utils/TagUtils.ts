import { TagsObjectForApi, TagsObjectWithBoolean, TagCategory } from '../models/Tags';
import { deepCopy } from '../../src/utils';

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
            // only if user's tag value did not change, skip it
            if (remoteTags[key] === localTags[key]) {
                return;
            }

            finalTags[key] = localTags[key];
        });
        return finalTags;
    }

    static markAllTagsAsSpecified(categoryArray: TagCategory[], checked: boolean): void {
        categoryArray.forEach(category => {
            category.checked = checked;
        });
    }

    static isTagObjectEmpty(tags: TagsObjectForApi | TagsObjectWithBoolean): boolean {
        return Object.keys(tags).length === 0;
    }
    /**
     * Uses configured categories and remote player tags to calculate which boxes should be checked
     * @param  {TagCategory[]} categories
     * @param  {TagsObjectWithBoolean} existingPlayerTags?
     */
    static getCheckedTagCategories(categories: TagCategory[], existingPlayerTags?: TagsObjectWithBoolean)
        : TagCategory[] {
            if (!existingPlayerTags) {
                return categories;
            }

            const isExistingPlayerTagsEmpty = TagUtils.isTagObjectEmpty(existingPlayerTags);
            if (isExistingPlayerTagsEmpty) {
                const categoriesCopy = deepCopy(categories);
                TagUtils.markAllTagsAsSpecified(categoriesCopy, true);
                return categoriesCopy;
            }

            const categoriesCopy = deepCopy<TagCategory[]>(categories);
            return categoriesCopy.map(category => {
                const existingTagValue: boolean = existingPlayerTags[category.tag];
                category.checked = TagUtils.getCheckedStatusForTagValue(existingTagValue);
                return category;
            });
    }

    static getCheckedStatusForTagValue(tagValue: boolean | undefined): boolean {
        // If user does not have tag assigned to them, consider it selected
        if (tagValue === undefined) {
            return true;
        }

        return tagValue;
    }

    static limitCategoriesToMaxCount(tagCategories: TagCategory[], max: number): TagCategory[] {
        let tagCategoriesCopy = deepCopy(tagCategories);
        tagCategoriesCopy = tagCategories.slice(0, max);
        return tagCategoriesCopy;
    }
}
