import test from "ava";
import TagUtils from '../../../src/utils/TagUtils';
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { TagCategory, TagsObjectForApi, TagsObjectWithBoolean } from '../../../src/models/Tags';
import { deepCopy } from '../../../src/utils';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
    await TestEnvironment.initialize({ stubSetTimeout: true });
    TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
    sinonSandbox.restore();
});

test('check conversion from tag boolean values to number strings', t => {
    const converted = TagUtils.convertTagsBooleansToApi({ tag1: false, tag2: true });
    t.deepEqual(converted, { tag1: "0", tag2: "1" });
});

test('check conversion from tag string values to booleans', t => {
    const converted = TagUtils.convertTagsApiToBooleans({ tag1: "1", tag2: "0" });
    t.deepEqual(converted, { tag1: true, tag2: false });
});

test('check correct object difference is returned', t => {
    let localTags: TagsObjectForApi = { tag1: "1", tag2: "0" };
    let playerTags: TagsObjectForApi = { tag1: "0" };
    const diff1 = TagUtils.getObjectDifference(localTags, playerTags);

    localTags = { tag1: "0", tag2: "1" };
    playerTags = { tag1: "1", tag2: "1" };
    const diff2 = TagUtils.getObjectDifference(localTags, playerTags);

    localTags = { tag1: "1" };
    playerTags = { tag2: "1" };
    const diff3 = TagUtils.getObjectDifference(localTags, playerTags);

    localTags = { tag2: "1" };
    playerTags = { tag2: "1" };
    const diff4 = TagUtils.getObjectDifference(localTags, playerTags);

    t.deepEqual(diff1, { tag1: "1", tag2: "0" });
    t.deepEqual(diff2, { tag1: "0" });
    t.deepEqual(diff3, { tag1: "1" });
    t.deepEqual(diff4, {});
});


test('check markAllTagsAsSpecified returns correct TagCategory array', t => {
    const categoryArr: TagCategory[] = [
        { tag:"tag", label:"label" },
        { tag:"tag2", label:"label2", checked: false },
    ];
    TagUtils.markAllTagsAsSpecified(categoryArr, true);
    categoryArr.forEach(category => {
        t.true(category.checked);
    });
});

test('check isTagObjectEmpty correct emptiness is returned', t => {
    t.false(TagUtils.isTagObjectEmpty({ tag2: "1", tag3: "1", tag5: "1" }));
    t.true(TagUtils.isTagObjectEmpty({}));
});

test('check that getCheckedTagCategories returns correct tagCategory list', t => {
    const configuredCategories: TagCategory[] = [
        { tag: "tag1", label: "label1" },
        { tag: "tag2", label: "label2" },
        { tag: "tag3", label: "label3" }
    ];

    const existingPlayerTags: TagsObjectWithBoolean = { tag1: true, tag2: false, tag3: true };
    const checked = TagUtils.getCheckedTagCategories(configuredCategories, existingPlayerTags);
    t.deepEqual(checked, [
        { tag: "tag1", label: "label1", checked: true },
        { tag: "tag2", label: "label2", checked: false },
        { tag: "tag3", label: "label3", checked: true }
    ]);
});

test('check that getCheckedTagCategories defaults values to true if not an existing player tag', t => {
    const configuredCategories: TagCategory[] = [
        { tag: "tag1", label: "label1" },
        { tag: "tag2", label: "label2" },
        { tag: "tag3", label: "label3" }
    ];

    const existingPlayerTags: TagsObjectWithBoolean = { tag1: false };
    const checked = TagUtils.getCheckedTagCategories(configuredCategories, existingPlayerTags);
    t.deepEqual(checked, [
        { tag: "tag1", label: "label1", checked: false },
        { tag: "tag2", label: "label2", checked: true },
        { tag: "tag3", label: "label3", checked: true }
    ]);
});

test('check that getCheckedStatusForTagValue defaults undefined tag values to true', t => {
    const emptyTagObject: TagsObjectWithBoolean = {};
    const nonEmptyTagObject: TagsObjectWithBoolean = { tag1: false };

    t.true(TagUtils.getCheckedStatusForTagValue(emptyTagObject.tag1));
    t.false(TagUtils.getCheckedStatusForTagValue(nonEmptyTagObject.tag1));
});

test('check that limitCategoriesToMaxCount returns correct category object', t => {
    const maxCount = 3;
    const genericCategory : TagCategory[] = [ { tag: "tag", label: "label" } ];

    const categoriesUnderMaxTags = deepCopy(genericCategory);
    const categoriesOverMaxTags = deepCopy(genericCategory);

    categoriesOverMaxTags.push(...[
        { tag: "tag2", label: "label2" },
        { tag: "tag3", label: "label3" },
        { tag: "tag4", label: "label4" },
    ]);

    const limitedUnder = TagUtils.limitCategoriesToMaxCount(categoriesUnderMaxTags, maxCount);
    const limitedOver = TagUtils.limitCategoriesToMaxCount(categoriesOverMaxTags, maxCount);

    t.deepEqual(limitedUnder, [{ tag: "tag", label: "label" }]);
    t.deepEqual(limitedOver, [
        { tag: "tag", label: "label" },
        { tag: "tag2", label: "label2" },
        { tag: "tag3", label: "label3" },
    ]);
});
