// import "../../../test/support/polyfills/polyfills";
import IndexedDb from "../../../src/shared/services/IndexedDb";
import Random from "../../support/utils/Random";

require("fake-indexeddb/auto");

describe('Options access', () => {

  test('should get and set value', async () => {
    const db = new IndexedDb(Random.getRandomString(10));
    await db.put("Options", { key: 'optionsKey', value: 'optionsValue' });
    const retrievedValue = await db.get("Options", 'optionsKey');
    expect(retrievedValue).toEqual({ key: 'optionsKey', value: 'optionsValue' });
  });

  test('should remove value', async () => {
    const db = new IndexedDb(Random.getRandomString(10));
    await db.put("Options", { key: 'optionsKey', value: 'optionsValue' });
    await db.remove("Options", 'optionsKey');
    const retrievedValue = await db.get("Options", 'optionsKey');
    expect(retrievedValue).toBeUndefined();
  });
});
