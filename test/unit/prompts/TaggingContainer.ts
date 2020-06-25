import test from 'ava';
import TaggingContainer from '../../../src/slidedown/TaggingContainer';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { setUserAgent } from '../../support/tester/browser';
import Slidedown from '../../../src/slidedown/Slidedown';
import { ConfigIntegrationKind } from '../../../src/models/AppConfig';

const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  (global as any).location = "https://localhost:4001";
  const userConfig = await TestEnvironment.getFakeMergedConfig({});
  const options = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    initOptions: userConfig,
    addPrompts: true
  };
  await TestEnvironment.stubDomEnvironment(options);
  await TestEnvironment.initialize(options);
});

test.afterEach(function () {
  sandbox.restore();
});

test('check sanitization is working correctly', t => {
    setUserAgent(BrowserUserAgent.ChromeMacSupported);
    OneSignal.slidedown = new Slidedown();
    const tagCategoryList = [{
        tag: "tag1\"<script> // injected code </script> \"\"",
        label: "Tag 1\"<script> // injected code </script> \"",
    }];
    const taggingContainer = new TaggingContainer();
    taggingContainer.mount(tagCategoryList);
    const generatedHtml = taggingContainer.getHtml();
    t.is(generatedHtml, `<div class="tagging-container"><div class="tagging-container-col">`+
    `<label class="onesignal-category-label" title="Tag 1">`+
    `<span class="onesignal-category-label-text">Tag 1</span>`+
    `<input type="checkbox" value="tag1">`+
    `<span class="onesignal-checkmark"></span></label>`+
    `<div style="clear:both"></div></div><div class="tagging-container-col"></div></div>`);
});