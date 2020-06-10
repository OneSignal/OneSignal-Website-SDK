import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignalApi from '../../../src/OneSignalApi';
import TagManager from '../../../src/managers/tagManager/page/TagManager';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
    await TestEnvironment.initialize();
    TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
    sinonSandbox.restore();
});

test('calling `syncTags` results in remote tag update with sendTags', async t => {
    const mockTags = { tag1: 1, tag2: 2 };
    const sendTagsSpy = sinonSandbox.stub(OneSignal, "sendTags").resolves();
    OneSignal.context.tagManager.storeTagValuesToUpdate(mockTags);
    await OneSignal.context.tagManager.syncTags();
    t.is(sendTagsSpy.callCount, 1);
    t.true(sendTagsSpy.getCall(0).calledWith(mockTags));
});

test('`downloadTags` results in remote getTags call', async t => {
    const getTagsSpy = sinonSandbox.stub(OneSignal, "getTags").resolves({});
    await TagManager.downloadTags();
    t.is(getTagsSpy.callCount, 1);
});
