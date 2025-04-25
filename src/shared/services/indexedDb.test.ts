import { ModelName } from 'src/core/types/models';
import { SubscriptionType } from 'src/core/types/subscription';
import {
  DUMMY_EXTERNAL_ID,
  DUMMY_ONESIGNAL_ID,
} from '../../../__test__/support/constants';
import Random from '../../../__test__/support/utils/Random';
import Log from '../../shared/libraries/Log';
import IndexedDb, { LegacyModelName } from './IndexedDb';

function newOSIndexedDb(
  dbName = Random.getRandomString(10),
  dbVersion = Number.MAX_SAFE_INTEGER,
): IndexedDb {
  return new IndexedDb(dbName, dbVersion);
}

const LogErrorSpy = vi.spyOn(Log, 'error').mockImplementation(() => '');

describe('IndexedDB Service', () => {
  beforeEach(() => {
    LogErrorSpy.mockClear();
  });

  describe('general', () => {
    const values = [
      { key: 'optionsKey', value: 'optionsValue' },
      { key: 'optionsKey2', value: 'optionsValue2' },
      { key: 'optionsKey3', value: 'optionsValue3' },
    ];

    test('can get 1 or all values', async () => {
      const db = newOSIndexedDb();
      for (const value of values) {
        await db.put('Options', value);
      }

      const retrievedValue = await db.get('Options', 'optionsKey');
      expect(retrievedValue).toEqual({
        key: 'optionsKey',
        value: 'optionsValue',
      });

      const retrievedValues = await db.get('Options');
      expect(retrievedValues).toEqual(values);
    });

    test('can set/update a value', async () => {
      const db = newOSIndexedDb();
      await db.put('Options', { key: 'optionsKey', value: 'optionsValue' });
      const retrievedValue = await db.get('Options', 'optionsKey');
      expect(retrievedValue).toEqual({
        key: 'optionsKey',
        value: 'optionsValue',
      });

      // can update value
      await db.put('Options', { key: 'optionsKey', value: 'optionsValue2' });
      const retrievedValue2 = await db.get('Options', 'optionsKey');
      expect(retrievedValue2).toEqual({
        key: 'optionsKey',
        value: 'optionsValue2',
      });

      await expect(db.put('Options', '')).rejects.toThrow();
      expect(LogErrorSpy.mock.calls[0][0]).toBe('Database PUT Error:');
    });

    test('can remove a value', async () => {
      const db = newOSIndexedDb();

      for (const value of values) {
        await db.put('Options', value);
      }

      // can remove a single value
      await db.remove('Options', 'optionsKey');
      const retrievedValue = await db.get('Options', 'optionsKey');
      expect(retrievedValue).toBeUndefined();

      // can remove remaining values
      await db.remove('Options');
      const retrievedValues = await db.getAll('Options');
      expect(retrievedValues).toEqual([]);

      // can handle errors
      await expect(db.remove('')).rejects.toThrow();
      expect(LogErrorSpy.mock.calls[0][0]).toBe('Database CLEAR Error:');
    });
  });

  describe('migrations', () => {
    describe('v5', () => {
      test('can to write to new v5 tables', async () => {
        const db = newOSIndexedDb('testDbv5', 5);
        const result = await db.put('Outcomes.NotificationClicked', {
          notificationId: '1',
        });
        expect(result).toEqual('1');

        const result2 = await db.put('Outcomes.NotificationReceived', {
          notificationId: '1',
        });
        expect(result2).toEqual('1');
      });

      // Tests NotificationClicked records migrate over from a v15 SDK version
      test('migrates notificationId type records into Outcomes.NotificationClicked', async () => {
        const dbName = 'testDbV4upgradeToV5' + Random.getRandomString(10);
        const db = newOSIndexedDb(dbName, 4);
        await db.put('NotificationClicked', { notificationId: '1' });
        await db.put('NotificationClicked', { notificationId: '2' });
        db.close();

        const db2 = newOSIndexedDb(dbName, 5);
        const result = await db2.getAll('Outcomes.NotificationClicked');
        expect(result).toEqual([
          { appId: undefined, notificationId: '1', timestamp: undefined },
          { appId: undefined, notificationId: '2', timestamp: undefined },
        ]);

        // old table should be removed
        expect(db2.objectStoreNames()).not.toContain('NotificationClicked');
      });

      // Tests NotificationReceived records migrate over from a v15 SDK version
      test('migrates notificationId type records into Outcomes.NotificationReceived', async () => {
        const dbName = 'testDbV4upgradeToV5' + Random.getRandomString(10);
        const db = newOSIndexedDb(dbName, 4);
        await db.put('NotificationReceived', { notificationId: '1' });
        await db.put('NotificationReceived', { notificationId: '2' });
        db.close();

        const db2 = newOSIndexedDb(dbName, 5);
        const result = await db2.getAll('Outcomes.NotificationReceived');
        expect(result).toEqual([
          { appId: undefined, notificationId: '1', timestamp: undefined },
          { appId: undefined, notificationId: '2', timestamp: undefined },
        ]);

        // old table should be removed
        expect(db2.objectStoreNames()).not.toContain('NotificationReceived');
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

    describe('v6', () => {
      const populateLegacySubscriptions = async (db: IndexedDb) => {
        await db.put(LegacyModelName.EmailSubscriptions, {
          modelId: '1',
          modelName: LegacyModelName.EmailSubscriptions,
          onesignalId: DUMMY_ONESIGNAL_ID,
          type: SubscriptionType.Email,
        });
        await db.put(LegacyModelName.PushSubscriptions, {
          modelId: '2',
          modelName: LegacyModelName.PushSubscriptions,
          onesignalId: DUMMY_ONESIGNAL_ID,
          type: SubscriptionType.ChromePush,
        });
        await db.put(LegacyModelName.SmsSubscriptions, {
          modelId: '3',
          modelName: LegacyModelName.SmsSubscriptions,
          onesignalId: DUMMY_ONESIGNAL_ID,
          type: SubscriptionType.SMS,
        });
      };

      const migratedSubscriptions = {
        email: {
          modelId: '1',
          modelName: ModelName.Subscriptions,
          externalId: undefined,
          onesignalId: DUMMY_ONESIGNAL_ID,
          type: SubscriptionType.Email,
        },
        push: {
          modelId: '2',
          modelName: ModelName.Subscriptions,
          externalId: undefined,
          onesignalId: DUMMY_ONESIGNAL_ID,
          type: SubscriptionType.ChromePush,
        },
        sms: {
          modelId: '3',
          modelName: ModelName.Subscriptions,
          externalId: undefined,
          onesignalId: DUMMY_ONESIGNAL_ID,
          type: SubscriptionType.SMS,
        },
      };

      test('can write to new subscriptions table', async () => {
        const db = newOSIndexedDb('testDbv6', 6);
        const result = await db.put(ModelName.Subscriptions, {
          modelId: '1',
        });
        expect(result).toEqual('1');
      });

      test('migrates v5 email, push, sms subscriptions records to v6 subscriptions record', async () => {
        const dbName = 'testDbV5upgradeToV6' + Random.getRandomString(10);
        const db = newOSIndexedDb(dbName, 5);
        await populateLegacySubscriptions(db);
        db.close();

        const db2 = newOSIndexedDb(dbName, 6);
        const result = await db2.getAll(ModelName.Subscriptions);
        expect(result).toEqual([
          migratedSubscriptions.email,
          migratedSubscriptions.push,
          migratedSubscriptions.sms,
        ]);

        // old tables should be removed
        const oldTableNames = [
          LegacyModelName.EmailSubscriptions,
          LegacyModelName.PushSubscriptions,
          LegacyModelName.SmsSubscriptions,
        ];
        for (const tableName of oldTableNames) {
          expect(db2.objectStoreNames()).not.toContain(tableName);
        }
      });

      test('migrates v5 email, push, sms subscriptions records of logged in user to v6 subscriptions record with external id', async () => {
        const dbName = 'testDbV5upgradeToV6' + Random.getRandomString(10);
        const db = newOSIndexedDb(dbName, 5);
        await populateLegacySubscriptions(db);
        // user is logged in
        await db.put(ModelName.Identity, {
          modelId: '4',
          modelName: ModelName.Identity,
          onesignalId: DUMMY_ONESIGNAL_ID,
          externalId: DUMMY_EXTERNAL_ID,
        });
        db.close();

        const db2 = newOSIndexedDb(dbName, 6);
        const result = await db2.getAll(ModelName.Subscriptions);
        expect(result).toEqual([
          {
            ...migratedSubscriptions.email,
            externalId: DUMMY_EXTERNAL_ID,
          },
          {
            ...migratedSubscriptions.push,
            externalId: DUMMY_EXTERNAL_ID,
          },
          {
            ...migratedSubscriptions.sms,
            externalId: DUMMY_EXTERNAL_ID,
          },
        ]);
      });
    });
  });
});
