import "../../support/polyfills/polyfills";
import test from "ava";
import IndexedDb from "../../../src/services/IndexedDb";
import Random from "../../support/tester/Random";

test(`should get and set value`, async t => {
  const db = new IndexedDb(Random.getRandomString(10));
  await db.put("Options", { key: 'optionsKey', value: 'optionsValue' });
  const retrievedValue = await db.get("Options", 'optionsKey');
  t.deepEqual(retrievedValue, { key: 'optionsKey', value: 'optionsValue' });
});

test(`should remove value`, async t => {
  const db = new IndexedDb(Random.getRandomString(10));
  await db.put("Options", { key: 'optionsKey', value: 'optionsValue' });
  await db.remove("Options", 'optionsKey');
  const retrievedValue = await db.get("Options", 'optionsKey');
  t.is(retrievedValue, undefined);
});