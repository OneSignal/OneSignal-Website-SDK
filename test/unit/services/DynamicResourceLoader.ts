import "../../support/polyfills/polyfills";
import test from "ava";
import { DynamicResourceLoader, ResourceType, ResourceLoadState } from "../../../src/services/DynamicResourceLoader";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";


test(`should add script resource to DOM`, async t => {
  await TestEnvironment.stubDomEnvironment();
  await DynamicResourceLoader.load(ResourceType.Script, new URL('https://test.node/scripts/script.js'));
  const node = document.querySelector('script[src*=script]');
  t.true(node !== null);
});

test(`should add stylesheet resource to DOM`, async t => {
  await TestEnvironment.stubDomEnvironment();
  await DynamicResourceLoader.load(ResourceType.Stylesheet, new URL('https://test.node/styles/site.css'));
  const node = document.querySelector('link[href*=site]');
  t.true(node !== null);
});

test(`concurrent loadIfNew calls that load a failed response all reject`, async t => {
  await TestEnvironment.stubDomEnvironment();
  const resourceLoader = new DynamicResourceLoader();

  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(resourceLoader.loadIfNew(ResourceType.Stylesheet, new URL('https://test.node/codes/500')));
  }
  const results = await Promise.all(promises);
  for (let result of results) {
    t.is(result, ResourceLoadState.Failed);
  }
});

test(`multiple loadIfNew calls create only one DOM node`, async t => {
  await TestEnvironment.stubDomEnvironment();
  const resourceLoader = new DynamicResourceLoader();

  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(resourceLoader.loadIfNew(ResourceType.Stylesheet, new URL('https://test.node/codes/500')));
  }
  await Promise.all(promises);

  const nodes = document.querySelectorAll('link[href*=codes]');
  t.is(nodes.length, 1);
});
