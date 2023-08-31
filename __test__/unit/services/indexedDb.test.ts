import IndexedDb from '../../../src/shared/services/IndexedDb';
import Random from '../../support/utils/Random';

require('fake-indexeddb/auto');

function newOSIndexedDb(
  dbName = Random.getRandomString(10),
  dbVersion = Number.MAX_SAFE_INTEGER,
): IndexedDb {
  return new IndexedDb(dbName, dbVersion);
}

describe('Options access', () => {
  test('should get and set value', async () => {
    const db = newOSIndexedDb();
    await db.put('Options', { key: 'optionsKey', value: 'optionsValue' });
    const retrievedValue = await db.get('Options', 'optionsKey');
    expect(retrievedValue).toEqual({
      key: 'optionsKey',
      value: 'optionsValue',
    });
  });

  test('should remove value', async () => {
    const db = newOSIndexedDb();
    await db.put('Options', { key: 'optionsKey', value: 'optionsValue' });
    await db.remove('Options', 'optionsKey');
    const retrievedValue = await db.get('Options', 'optionsKey');
    expect(retrievedValue).toBeUndefined();
  });
});

describe('migrations', () => {
  describe('v5', () => {
    test('can to write to new Outcomes.NotificationClicked table', async () => {
      const db = newOSIndexedDb('testDbv5', 5);
      const result = await db.put('Outcomes.NotificationClicked', {
        notificationId: '1',
      });
      expect(result).toEqual({ notificationId: '1' });
    });

    test('can write to new Outcomes.NotificationReceived table', async () => {
      const db = newOSIndexedDb('testDbv5', 5);
      const result = await db.put('Outcomes.NotificationReceived', {
        notificationId: '1',
      });
      expect(result).toEqual({ notificationId: '1' });
    });

    // Tests NotificationClicked records migrate over from a v15 SDK version
    test('migrates notificationId type records into Outcomes.NotificationClicked', async () => {
      const dbName = 'testDbV4upgradeToV5' + Random.getRandomString(10);
      const db = newOSIndexedDb(dbName, 4);
      await db.put('NotificationClicked', { notificationId: '1' });
      db.close();

      const db2 = newOSIndexedDb(dbName, 5);
      const result = await db2.getAll('Outcomes.NotificationClicked');
      expect(result).toEqual([
        { appId: undefined, notificationId: '1', timestamp: undefined },
      ]);
    });

    // Tests NotificationReceived records migrate over from a v15 SDK version
    test('migrates notificationId type records into Outcomes.NotificationReceived', async () => {
      const dbName = 'testDbV4upgradeToV5' + Random.getRandomString(10);
      const db = newOSIndexedDb(dbName, 4);
      await db.put('NotificationReceived', { notificationId: '1' });
      db.close();

      const db2 = newOSIndexedDb(dbName, 5);
      const result = await db2.getAll('Outcomes.NotificationReceived');
      expect(result).toEqual([
        { appId: undefined, notificationId: '1', timestamp: undefined },
      ]);
    });

    // Tests records coming from a broken SDK (160000.beta4 to 160000) and upgrading to fixed v5 db
    test('migrates notification.id type records into Outcomes.NotificationClicked', async () => {
      const dbName = 'testDbV4upgradeToV5' + Random.getRandomString(10);

      // 1. Put the db's schema into the broken v4 state that SDK v16000000 had
      const openDbRequest = indexedDB.open(dbName, 4);
      const dbOpenPromise = new Promise((resolve) => {
        openDbRequest.onsuccess = resolve;
      });
      const dbUpgradePromise = new Promise<void>((resolve) => {
        openDbRequest.onupgradeneeded = () => {
          const db = openDbRequest.result;
          db.createObjectStore('NotificationClicked', {
            keyPath: 'notification.id',
          });
          db.createObjectStore('NotificationReceived', {
            keyPath: 'notificationId',
          });
          resolve();
        };
      });
      await Promise.all([dbOpenPromise, dbUpgradePromise]);

      // 2. Put a record into the DB with the old schema
      openDbRequest.result
        .transaction(['NotificationClicked'], 'readwrite')
        .objectStore('NotificationClicked')
        .put({ notification: { id: '1' } });
      openDbRequest.result.close();

      // 3. Open the DB with the OneSignal IndexedDb class
      const db2 = newOSIndexedDb(dbName, 5);
      const result = await db2.getAll('Outcomes.NotificationClicked');
      // 4. Expect the that data is brought over to the new table.
      expect(result).toEqual([
        { appId: undefined, notificationId: '1', timestamp: undefined },
      ]);
    });
  });
});
