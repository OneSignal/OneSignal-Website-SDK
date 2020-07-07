import test from 'ava';
import TaggingContainer from '../../../src/slidedown/TaggingContainer';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { setUserAgent } from '../../support/tester/browser';
import Slidedown from '../../../src/slidedown/Slidedown';
import { TagCategory, TagsObject } from 'src/models/Tags';
import _ from "lodash";
import { getDomElementOrStub } from '../../../src/utils';

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

test('check that correct TagCategory object is returned after applying remote player tags', t => {
  setUserAgent(BrowserUserAgent.ChromeMacSupported);
  const tagCateogryList: TagCategory[] = [
    { tag: "a", label: "A" },
    { tag: "b", label: "B" },
    { tag: "c", label: "C" },
  ];

  const targetIntersection = JSON.parse(JSON.stringify(tagCateogryList));
  targetIntersection[0].checked = true;
  targetIntersection[1].checked = false;
  targetIntersection[2].checked = true;

  const tagsObject: TagsObject = { a: true, b: false, c: true };

  const intersection = new TaggingContainer().TESTING.getCheckedTagCategories(tagCateogryList, tagsObject);
  t.true(_.isEqual(intersection, targetIntersection));
});
