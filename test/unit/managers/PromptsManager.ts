
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
        await initializeConfigWithCategories();
        sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
        sinonSandbox.stub(MainHelper, "getNotificationIcons");

        const tagFetchSpy = sinonSandbox.stub(TagManager, "downloadTags").resolves({});
        const loadSpy = sinonSandbox.spy(TaggingContainer.prototype, "load");

        await OneSignal.showCategorySlidedown();

        t.true(loadSpy.calledOnce);
        t.true(tagFetchSpy.calledOnce);
});


test('category options are configured, not in update mode, check remote tag fetch not made', async t => {
    await initializeConfigWithCategories();
    const tagFetchSpy = sinonSandbox.stub(TagManager, "downloadTags").resolves({});
    sinonSandbox.stub(PageViewManager.prototype, "getLocalPageViewCount").returns(1);
    const slidedownSpy = sinonSandbox.spy(PromptsManager.prototype, "internalShowSlidedownPrompt");
    const createSpy = sinonSandbox.spy(Slidedown.prototype, "create");
    await InitHelper.sessionInit();

    t.true(!tagFetchSpy.called);
    t.true(slidedownSpy.calledOnce);
    t.true(createSpy.called);
});

async function initializeConfigWithCategories() {
    const config = {
        userConfig: {
            promptOptions: {
                autoPrompt: true,
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
