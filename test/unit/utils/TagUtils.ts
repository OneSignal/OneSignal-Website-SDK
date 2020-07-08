import test from "ava";
import TagUtils from '../../../src/utils/TagUtils';
import _ from "lodash";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { TagsObject } from 'src/models/Tags';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
    await TestEnvironment.initialize({ stubSetTimeout: true });
    TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
    sinonSandbox.restore();
});

test('check conversion from tag number values to booleans', t => {
    const converted = TagUtils.convertTagNumberValuesToBooleans({ tag1: "1", tag2: "0" });
    t.true(_.isEqual(converted, { tag1: true, tag2: false }));
});

test('check conversion from tag boolean values to numbers', t => {
    const converted = TagUtils.convertTagBooleanValuesToNumbers({ tag1: false, tag2: true });
    t.true(_.isEqual(converted, { tag1: 0, tag2: 1 }));
});

test('check conversion from tag string values to numbers', t => {
    const converted = TagUtils.convertTagStringValuesToNumbers({ tag1: "1", tag2: "0" });
    t.true(_.isEqual(converted, { tag1: 1, tag2: 0 }));
});

test('check correct object difference is returned', t => {
    let localTags: TagsObject = { tag1: 1, tag2: 0 };
    let playerTags: TagsObject = { tag1: 0 };
    const diff1 = TagUtils.getObjectDifference(localTags, playerTags);

    localTags = { tag1: 0, tag2: 1 };
    playerTags = { tag1: 1, tag2: 1 };
    const diff2 = TagUtils.getObjectDifference(localTags, playerTags);

    localTags = { tag1: 1 };
    playerTags = { tag2: 1 };
    const diff3 = TagUtils.getObjectDifference(localTags, playerTags);

    t.true(_.isEqual(diff1, ["tag1"]));
    t.true(_.isEqual(diff2, ["tag1"]));
    t.true(_.isEqual(diff3, ["tag1"]));
});


test('check correct correct object of specified keys is returned', t => {
    const keys = ['tag2', 'tag5'];
    const object: TagsObject = { tag1: 0, tag2: 1, tag3: 0, tag4: 0, tag5: 1 };
    const cleaned = TagUtils.getOnlyKeysObject(keys, object);
    t.true(_.isEqual(cleaned, { tag2: 1, tag5: 1 }));
});

test('check correct truthy value pairs object is returned', t => {
    const object: TagsObject = { tag1: 0, tag2: 1, tag3: 1, tag4: 0, tag5: 1 };
    const cleaned = TagUtils.getTruthyValuePairsFromNumbers(object);
    t.true(_.isEqual(cleaned, { tag2: 1, tag3: 1, tag5: 1 }));
});
