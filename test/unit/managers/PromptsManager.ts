import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import Log from '../../../src/libraries/Log';
import TaggingContainer from '../../../src/slidedown/TaggingContainer';
import MainHelper from '../../../src/helpers/MainHelper';
import TagManager from '../../../src/managers/tagManager/page/TagManager';
import InitHelper from '../../../src/helpers/InitHelper';
import { PromptsManager } from '../../../src/managers/PromptsManager';
import { PageViewManager } from '../../../src/managers/PageViewManager';
import Slidedown from '../../../src/slidedown/Slidedown';
import { DynamicResourceLoader, ResourceLoadState } from '../../../src/services/DynamicResourceLoader';
import EventsTestHelper from '../../support/tester/EventsTestHelper';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.afterEach(() => {
    sinonSandbox.restore();
    OneSignal._initCalled = false;
    OneSignal.__initAlreadyCalled = false;
    OneSignal._sessionInitAlreadyRunning = false;
});

test('if category options are not configured, check that an error was logged', async t => {
    await TestEnvironment.initialize();
    TestEnvironment.mockInternalOneSignal();
    const logSpy = sinonSandbox.stub(Log, "error");
    await OneSignal.showCategorySlidedown();
    t.true(logSpy.calledOnce);
});

test('category options are configured, in update mode, check 1) tagging container loaded 2) remote tag fetch',
    async t => {
        await initializeConfigWithCategories(true);
        sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
        sinonSandbox.stub(MainHelper, "getNotificationIcons");

        const tagFetchSpy = sinonSandbox.stub(OneSignal, "getTags").resolves({});
        const loadSpy = sinonSandbox.spy(TaggingContainer.prototype, "load");

        await OneSignal.showCategorySlidedown();

        t.true(loadSpy.calledOnce);
        t.true(tagFetchSpy.calledOnce);
});


test('category options are configured, not in update mode, check remote tag fetch not made', async t => {
    await initializeConfigWithCategories(true);
    const tagFetchStub = sinonSandbox.stub(OneSignal, "getTags").resolves({});
    sinonSandbox.stub(PageViewManager.prototype, "getLocalPageViewCount").returns(1);
    sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(false);
    sinonSandbox.stub(PromptsManager.prototype as any, "checkIfAutoPromptShouldBeShown").resolves(true);
    sinonSandbox.stub(DynamicResourceLoader.prototype, "loadSdkStylesheet").resolves(ResourceLoadState.Loaded);
    const slidedownSpy = sinonSandbox.spy(PromptsManager.prototype, "internalShowSlidedownPrompt");
    const createSpy = sinonSandbox.spy(Slidedown.prototype, "create");
    await InitHelper.sessionInit();

    t.true(!tagFetchStub.called);
    t.true(slidedownSpy.calledOnce);
    t.true(createSpy.called);
});

test('category options are configured, in update mode, no change to remote tags on allow, check remote tag update not made', async t => {
    await initializeConfigWithCategories(false);
    const sendTagsSpy = sinonSandbox.stub(TagManager.prototype, "sendTags").resolves({});
    const showCatSlidedownSpy = sinonSandbox.spy(OneSignal, "showCategorySlidedown");

    sinonSandbox.stub(PageViewManager.prototype, "getLocalPageViewCount").returns(1);
    sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(false);
    sinonSandbox.stub(DynamicResourceLoader.prototype, "loadSdkStylesheet").resolves(ResourceLoadState.Loaded);
    sinonSandbox.stub(OneSignal, "getTags").resolves({ tag1:'1' });
    sinonSandbox.stub(TaggingContainer, "getValuesFromTaggingContainer").resolves({ tag1: true });
    sinonSandbox.stub(MainHelper, "getNotificationIcons");

    await InitHelper.sessionInit();
    await OneSignal.showCategorySlidedown();

    const slidedownClosed = new Promise(resolve => {
        OneSignal.on(OneSignal.emitter.on(Slidedown.EVENTS.CLOSED) , () => {
            t.is(sendTagsSpy.callCount, 0);
            resolve();
        });
    });
    new EventsTestHelper(sinonSandbox).simulateSlidedownAllowAfterShown();
    await slidedownClosed;

    t.true(!sendTagsSpy.called);
    t.true(showCatSlidedownSpy.calledOnce);
});

async function initializeConfigWithCategories(autoPrompt: boolean) {
    const config = {
        userConfig: {
            promptOptions: {
                autoPrompt,
                slidedown: {
                    enabled: true,
                    actionMessage: "",
                    acceptButtonText: "",
                    cancelButtonText: "",
                    categories: {
                        tags: [
                            {
                                tag: "Tag",
                                label: "Label"
                            }
                        ]
                    }
                }
            }
        }
    };
    await TestEnvironment.initialize();
    TestEnvironment.mockInternalOneSignal(config);
}
