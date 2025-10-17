import type {
  TagCategory,
  TagsObjectForApi,
  TagsObjectWithBoolean,
} from 'src/page/tags/types';

export function convertTagsApiToBooleans(
  tags: TagsObjectForApi,
): TagsObjectWithBoolean {
  const convertedTags: TagsObjectWithBoolean = {};
  Object.keys(tags).forEach((key) => {
    convertedTags[key] = tags[key] === '1' ? true : false;
  });
  return convertedTags;
}

export function convertTagsBooleansToApi(
  tags: TagsObjectWithBoolean,
): TagsObjectForApi {
  const convertedTags: TagsObjectForApi = {};
  Object.keys(tags).forEach((key) => {
    convertedTags[key] = tags[key] === true ? '1' : '0';
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
export function getObjectDifference(
  localTags: TagsObjectForApi,
  remoteTags: TagsObjectForApi,
): TagsObjectForApi {
  const finalTags: TagsObjectForApi = {};

  // Going off local tags since it's our categories. Trying to find only changed tags and returning those
  // as a final object.
  Object.keys(localTags).forEach((key) => {
    // only if user's tag value did not change, skip it
    if (remoteTags[key] === localTags[key]) {
      return;
    }

    finalTags[key] = localTags[key];
  });
  return finalTags;
}

export function markAllTagsAsSpecified(
  categoryArray: TagCategory[],
  checked: boolean,
): void {
  categoryArray.forEach((category) => {
    category.checked = checked;
  });
}

export function isTagObjectEmpty(
  tags: TagsObjectForApi | TagsObjectWithBoolean,
): boolean {
  return Object.keys(tags).length === 0;
}
/**
 * Uses configured categories and remote player tags to calculate which boxes should be checked
 * @param  {TagCategory[]} categories
 * @param  {TagsObjectWithBoolean} existingPlayerTags?
 */
export function getCheckedTagCategories(
  categories: TagCategory[],
  existingPlayerTags?: TagsObjectWithBoolean,
): TagCategory[] {
  if (!existingPlayerTags) {
    return categories;
  }

  const isExistingPlayerTagsEmpty = isTagObjectEmpty(existingPlayerTags);
  if (isExistingPlayerTagsEmpty) {
    const categoriesCopy = structuredClone(categories);
    markAllTagsAsSpecified(categoriesCopy, true);
    return categoriesCopy;
  }

  const categoriesCopy = structuredClone<TagCategory[]>(categories);
  return categoriesCopy.map((category) => {
    const existingTagValue: boolean = existingPlayerTags[category.tag];
    category.checked = getCheckedStatusForTagValue(existingTagValue);
    return category;
  });
}

export function getCheckedStatusForTagValue(
  tagValue: boolean | undefined,
): boolean {
  // If user does not have tag assigned to them, consider it selected
  if (tagValue === undefined) {
    return true;
  }

  return tagValue;
}
