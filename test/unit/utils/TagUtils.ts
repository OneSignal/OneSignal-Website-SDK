import test from "ava";
import TagUtils from '../../../src/utils/TagUtils';
import _ from "lodash";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignalApiBase from '../../../src/OneSignalApiBase';
import Database from '../../../src/services/Database';

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

test('check tagHelperWithRetries makes correct number of tries', async t => {
    const getTagsSpy = sinonSandbox.spy(OneSignal, "getTags");
    sinonSandbox.stub(OneSignalApiBase, "get").rejects();
    sinonSandbox.stub(Database, "getSubscription");
    await TagUtils.tagHelperWithRetries(OneSignal.getTags, 100, 3);
    t.is(getTagsSpy.callCount, 4);
});