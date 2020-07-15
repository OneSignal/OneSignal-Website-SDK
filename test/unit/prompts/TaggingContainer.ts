import test from 'ava';
import TaggingContainer from '../../../src/slidedown/TaggingContainer';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { TagsObjectWithBoolean } from '../../../src/models/Tags';
import { getDomElementOrStub } from '../../../src/utils';
import TagUtils from '../../../src/utils/TagUtils';
import { TaggingContainerCssIds, SlidedownCssClasses } from '../../../src/slidedown/constants';

const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  (global as any).location = new URL("https://localhost:4001");
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

test('check that calling mount() adds the tagging container to DOM', t => {
  const taggingContainer = new TaggingContainer();
  const categoryArr = [{ tag: "tag1", label: "label1" }];
  let containerFromDom = getDomElementOrStub(`#${TaggingContainerCssIds.taggingContainer}`);
  t.false(containerFromDom.id === TaggingContainerCssIds.taggingContainer);

  taggingContainer.mount(categoryArr);

  containerFromDom = getDomElementOrStub(`#${TaggingContainerCssIds.taggingContainer}`);
  t.true(containerFromDom.id === TaggingContainerCssIds.taggingContainer);
});

test('check that calling mount() results in allowButton enabled', t => {
  const taggingContainer = new TaggingContainer();
  const categoryArr = [{ tag: "tag1", label: "label1" }];

  taggingContainer.mount(categoryArr);

  const allowButtonElement = getDomElementOrStub(`#${SlidedownCssClasses.allowButton}`);
  t.false((<HTMLButtonElement>allowButtonElement).disabled);
});

test('check that calling load() adds the loading container to DOM', t => {
  const taggingContainer = new TaggingContainer();
  let loadingContainer = getDomElementOrStub(`#${TaggingContainerCssIds.loadingContainer}`);
  t.false(loadingContainer.innerHTML !== "");
  t.false(loadingContainer.classList.length > 0);

  taggingContainer.load();

  loadingContainer = getDomElementOrStub(`#${TaggingContainerCssIds.loadingContainer}`);
  t.true(loadingContainer.innerHTML !== "");
  t.true(loadingContainer.classList.length > 0);
});

test('check that calling getValuesFromTaggingContainer returns correct list of tags', t => {
  const taggingContainer = new TaggingContainer();
  const categoryArr = [{ tag: "tag1", label: "label1" }];

  TagUtils.markAllTagsAsSpecified(categoryArr, true);
  taggingContainer.mount(categoryArr, {});

  const tags: TagsObjectWithBoolean = TaggingContainer.getValuesFromTaggingContainer();
  t.deepEqual(tags, { tag1: true });
});

/*
TODO: uncomment after WebAPI dom element creation is implemented for sanitization purposes

test('check sanitization is working correctly', t => {
  setUserAgent(BrowserUserAgent.ChromeMacSupported);
  OneSignal.slidedown = new Slidedown();
  const tagCategoryList = [{
    tag: "tag1\"<script> // injected code </script> \"\"",
    label: "Tag 1\"<script> // injected code </script> \"",
  }];
  const taggingContainer = new TaggingContainer();
  taggingContainer.mount(tagCategoryList);
  const labelElement = getDomElementOrStub(".onesignal-category-label");
  t.is(labelElement.innerHTML, `<span class="onesignal-category-label-text">Tag 1</span>`+
  `<input type="checkbox" value="tag1"><span class="onesignal-checkmark"></span>`);
});
*/
test.todo('check generateHtml() returns correct HTML with given categories and player tags');
test.todo('check sanitization is working correctly');
