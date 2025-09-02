import { APP_ID, EXTERNAL_ID, ONESIGNAL_ID } from '__test__/constants';
import type * as idb from 'idb';
import { deleteDB, type IDBPDatabase } from 'idb';
import { SubscriptionType } from '../subscriptions/constants';
import { closeDb, getDb } from './client';
import { DATABASE_NAME } from './constants';
import type { IndexedDBSchema } from './types';

beforeEach(async () => {
  await closeDb();
  await deleteDB(DATABASE_NAME);
});

describe('general', () => {
  const values: IndexedDBSchema['Options']['value'][] = [
    { key: 'defaultIcon', value: 'icon' },
    { key: 'defaultTitle', value: 'title' },
    { key: 'userConsent', value: true },
  ];

  test('should set _isNewVisitor to true if OneSignal is defined', async () => {
    (global as any).OneSignal = {
      _isNewVisitor: false,
    };
    const OneSignal = (global as any).OneSignal;
    await getDb();
    expect(OneSignal._isNewVisitor).toBe(true);
  });

  test('can get 1 or all values', async () => {
    const db = await getDb();
    for (const value of values) {
      await db.put('Options', value);
    }

    const retrievedValue = await db.get('Options', 'userConsent');
    expect(retrievedValue).toEqual({
      key: 'userConsent',
      value: true,
    });

    const retrievedValues = await db.getAll('Options');
    expect(retrievedValues).toEqual(values);
  });

  test('can set/update a value', async () => {
    const db = await getDb();
    await db.put('Options', { key: 'userConsent', value: 'optionsValue' });
    const retrievedValue = await db.get('Options', 'userConsent');
    expect(retrievedValue).toEqual({
      key: 'userConsent',
      value: 'optionsValue',
    });

    // can update value
    await db.put('Options', { key: 'userConsent', value: 'optionsValue2' });
    const retrievedValue2 = await db.get('Options', 'userConsent');
    expect(retrievedValue2).toEqual({
      key: 'userConsent',
      value: 'optionsValue2',
    });

    await expect(
      // @ts-expect-error - for testing invalid value
      db.put('Options', ''),
    ).rejects.toThrow(
      'Data provided to an operation does not meet requirements.',
    );
  });

  test('can remove a value', async () => {
    const db = await getDb();
    for (const value of values) {
      await db.put('Options', value);
    }

    // can remove a single value
    await db.delete('Options', 'userConsent');
    const retrievedValue = await db.get('Options', 'userConsent');
    expect(retrievedValue).toBeUndefined();

    // can remove remaining values
    await db.clear('Options');
    const retrievedValues = await db.getAll('Options');
    expect(retrievedValues).toEqual([]);

    // resolves undefined if key does not exist
    await expect(
      // @ts-expect-error - using invalid key for testing
      db.delete('Options', 'non-existent-key'),
    ).resolves.toBeUndefined();
  });
});

describe('migrations', () => {
  describe('v5', () => {
    test('can to write to new v5 tables', async () => {
      const db = await getDb();
      const result = await db.put('Outcomes.NotificationClicked', {
        appId: APP_ID,
        notificationId: '1',
        timestamp: 1,
      });
      expect(result).toEqual('1');

      const result2 = await db.put('Outcomes.NotificationReceived', {
        appId: APP_ID,
        notificationId: '1',
        timestamp: 1,
      });
      expect(result2).toEqual('1');
    });

    // Tests NotificationClicked records migrate over from a v15 SDK version
    test('migrates notificationId type records into Outcomes.NotificationClicked', async () => {
      const db = await getDb(4);

      await db.put('NotificationClicked', { notificationId: '1' });
      await db.put('NotificationClicked', { notificationId: '2' });
      await closeDb();

      const db2 = await getDb(5);
      const result = await db2.getAll('Outcomes.NotificationClicked');
      expect(result).toEqual([
        { appId: undefined, notificationId: '1', timestamp: undefined },
        { appId: undefined, notificationId: '2', timestamp: undefined },
      ]);

      // old table should be removed
      expect(db2.objectStoreNames).not.toContain('NotificationClicked');
    });

    // Tests NotificationReceived records migrate over from a v15 SDK version
    test('migrates notificationId type records into Outcomes.NotificationReceived', async () => {
      const db = await getDb(4);
      await db.put('NotificationReceived', {
        appId: APP_ID,
        notificationId: '1',
        timestamp: 1,
      });
      await db.put('NotificationReceived', {
        appId: APP_ID,
        notificationId: '2',
        timestamp: 1,
      });
      await closeDb();

      const db2 = await getDb(5);
      const result = await db2.getAll('Outcomes.NotificationReceived');
      expect(result).toEqual([
        { appId: APP_ID, notificationId: '1', timestamp: 1 },
        { appId: APP_ID, notificationId: '2', timestamp: 1 },
      ]);

      // old table should be removed
      expect(db2.objectStoreNames).not.toContain('NotificationReceived');
    });

    // Tests records coming from a broken SDK (160000.beta4 to 160000) and upgrading to fixed v5 db
    test('migrates notification.id type records into Outcomes.NotificationClicked', async () => {
      // 1. Put the db's schema into the broken v4 state that SDK v16000000 had
      const openDbRequest = indexedDB.open(DATABASE_NAME, 4);
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
      const db2 = await getDb(5);
      const result = await db2.getAll('Outcomes.NotificationClicked');
      // 4. Expect the that data is brought over to the new table.
      expect(result).toEqual([
        { appId: undefined, notificationId: '1', timestamp: undefined },
      ]);
    });
  });

  describe('v6', () => {
    const populateLegacySubscriptions = async (
      db: IDBPDatabase<IndexedDBSchema>,
    ) => {
      await db.put('emailSubscriptions', {
        modelId: '1',
        modelName: 'emailSubscriptions',
        onesignalId: ONESIGNAL_ID,
        type: SubscriptionType.Email,
        token: 'email-token',
      });
      await db.put('pushSubscriptions', {
        modelId: '2',
        modelName: 'pushSubscriptions',
        onesignalId: ONESIGNAL_ID,
        type: SubscriptionType.ChromePush,
        token: 'push-token',
      });
      await db.put('smsSubscriptions', {
        modelId: '3',
        modelName: 'smsSubscriptions',
        onesignalId: ONESIGNAL_ID,
        type: SubscriptionType.SMS,
        token: 'sms-token',
      });
    };

    const migratedSubscriptions = {
      email: {
        modelId: '1',
        modelName: 'subscriptions',
        externalId: undefined,
        onesignalId: ONESIGNAL_ID,
        type: SubscriptionType.Email,
        token: 'email-token',
      },
      push: {
        modelId: '2',
        modelName: 'subscriptions',
        externalId: undefined,
        onesignalId: ONESIGNAL_ID,
        type: SubscriptionType.ChromePush,
        token: 'push-token',
      },
      sms: {
        modelId: '3',
        modelName: 'subscriptions',
        externalId: undefined,
        onesignalId: ONESIGNAL_ID,
        type: SubscriptionType.SMS,
        token: 'sms-token',
      },
    };

    test('can write to new subscriptions table', async () => {
      const db = await getDb();
      const result = await db.put('subscriptions', {
        modelId: '1',
        modelName: 'subscriptions',
        onesignalId: '1',
        type: 'email',
        token: 'token',
      });
      expect(result).toEqual('1');
    });

    test('migrates v5 email, push, sms subscriptions records to v6 subscriptions record', async () => {
      const db = await getDb(5);
      await populateLegacySubscriptions(db);
      await closeDb();

      const db2 = await getDb(6);
      const result = await db2.getAll('subscriptions');
      expect(result).toEqual([
        migratedSubscriptions.email,
        migratedSubscriptions.push,
        migratedSubscriptions.sms,
      ]);

      // old tables should be removed
      const oldTableNames = [
        'emailSubscriptions',
        'pushSubscriptions',
        'smsSubscriptions',
      ];
      for (const tableName of oldTableNames) {
        expect(db2.objectStoreNames).not.toContain(tableName);
      }
    });

    test('migrates v5 email, push, sms subscriptions records of logged in user to v6 subscriptions record with external id', async () => {
      const db = await getDb(5);
      await populateLegacySubscriptions(db);
      // user is logged in
      // @ts-expect-error - for testing legacy migration
      await db.put('identity', {
        modelId: '4',
        modelName: 'identity',
        onesignalId: ONESIGNAL_ID,
        externalId: EXTERNAL_ID,
      });
      await closeDb();

      const db2 = await getDb(6);
      const result = await db2.getAll('subscriptions');
      expect(result).toEqual([
        {
          ...migratedSubscriptions.email,
          externalId: EXTERNAL_ID,
        },
        {
          ...migratedSubscriptions.push,
          externalId: EXTERNAL_ID,
        },
        {
          ...migratedSubscriptions.sms,
          externalId: EXTERNAL_ID,
        },
      ]);
    });
  });
});

test('should reopen db when terminated', async () => {
  // mocking to keep track of the terminated callback
  vi.resetModules();
  let terminatedCallback = vi.hoisted(() => vi.fn(() => false));

  const openFn = vi.hoisted(() => vi.fn());
  const deleteDatabaseFn = vi.hoisted(() => vi.fn());

  vi.mock('idb', async (importOriginal) => {
    const actual = (await importOriginal()) as typeof idb;
    return {
      ...actual,
      openDB: openFn.mockImplementation((name, version, callbacks) => {
        terminatedCallback = callbacks!.terminated!;
        return actual.openDB(name, version, callbacks);
      }),
      deleteDB: deleteDatabaseFn.mockImplementation((name) => {
        terminatedCallback();
        return actual.deleteDB(name);
      }),
    };
  });

  const { db } = await vi.importActual<typeof import('./client')>('./client');
  expect(openFn).toHaveBeenCalledTimes(1); // initial open

  await db.put('Options', { key: 'userConsent', value: true });

  // real world db.close() will trigger the terminated callback
  deleteDB(DATABASE_NAME);

  // terminate callback should reopen the db
  expect(openFn).toHaveBeenCalledTimes(2);

  expect(await db.get('Options', 'userConsent')).toEqual({
    key: 'userConsent',
    value: true,
  });
});
