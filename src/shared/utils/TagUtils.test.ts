import type {
  TagCategory,
  TagsObjectForApi,
  TagsObjectWithBoolean,
} from 'src/page/tags/types';
import TagUtils from './TagUtils';

describe('TagUtils', () => {
  test('should convert api tags to boolean format', () => {
    const tags = { tag1: '1', tag2: '0' } as const;
    const booleans = TagUtils.convertTagsApiToBooleans(tags);
    expect(booleans).toEqual({ tag1: true, tag2: false });
  });

  test('should convert boolean tags to api format', () => {
    const booleans = { tag1: true, tag2: false } as const;
    const tags = TagUtils.convertTagsBooleansToApi(booleans);
    expect(tags).toEqual({ tag1: '1', tag2: '0' });
  });

  test('should get object difference', () => {
    let localTags: TagsObjectForApi = { tag1: '1' };
    let remoteTags: TagsObjectForApi = { tag1: '0' };
    let difference = TagUtils.getObjectDifference(localTags, remoteTags);
    expect(difference).toEqual({ tag1: '1' });

    localTags = { tag1: '0', tag2: '1' };
    remoteTags = { tag1: '1', tag2: '1' };
    difference = TagUtils.getObjectDifference(localTags, remoteTags);
    expect(difference).toEqual({ tag1: '0' });

    localTags = { tag1: '1' };
    remoteTags = { tag2: '1', tag3: '1' };
    difference = TagUtils.getObjectDifference(localTags, remoteTags);
    expect(difference).toEqual({ tag1: '1' });

    localTags = { tag1: '1' };
    remoteTags = { tag1: '1' };
    difference = TagUtils.getObjectDifference(localTags, remoteTags);
    expect(difference).toEqual({});
  });

  test('should mark all tags as specified', () => {
    const categories: TagCategory[] = [
      { tag: 'tag1', label: 'label1' },
      { tag: 'tag2', label: 'label2' },
    ];
    TagUtils.markAllTagsAsSpecified(categories, true);
    expect(categories).toEqual([
      { tag: 'tag1', label: 'label1', checked: true },
      { tag: 'tag2', label: 'label2', checked: true },
    ]);
  });

  test('should check if tag object is empty', () => {
    const tags = { tag1: '1', tag2: '0' } as const;
    expect(TagUtils.isTagObjectEmpty(tags)).toBe(false);

    const emptyTags = {} as const;
    expect(TagUtils.isTagObjectEmpty(emptyTags)).toBe(true);
  });

  test('should get checked tag categories', () => {
    const categories: TagCategory[] = [
      { tag: 'tag1', label: 'label1' },
      { tag: 'tag2', label: 'label2' },
    ];

    const existingPlayerTags: TagsObjectWithBoolean = {
      tag1: true,
      tag2: false,
      tag3: true,
    };

    // with no existing player tags
    let checkedCategories = TagUtils.getCheckedTagCategories(
      categories,
      undefined,
    );
    expect(checkedCategories).toEqual(categories);

    // with empty existing tags
    checkedCategories = TagUtils.getCheckedTagCategories(categories, {});
    expect(checkedCategories).toEqual([
      { tag: 'tag1', label: 'label1', checked: true },
      { tag: 'tag2', label: 'label2', checked: true },
    ]);

    // with existing tags
    checkedCategories = TagUtils.getCheckedTagCategories(
      categories,
      existingPlayerTags,
    );
    expect(checkedCategories).toEqual([
      { tag: 'tag1', label: 'label1', checked: true },
      { tag: 'tag2', label: 'label2', checked: false },
    ]);
  });

  test('should get checked status for tag value', () => {
    expect(TagUtils.getCheckedStatusForTagValue(undefined)).toBe(true);
    expect(TagUtils.getCheckedStatusForTagValue(true)).toBe(true);
    expect(TagUtils.getCheckedStatusForTagValue(false)).toBe(false);
  });
});
