import { wrapRequest } from './idb-lite';

// Table rename "NotificationClicked" -> "Outcomes.NotificationClicked"
// and migrate existing records.
// Motivation: This is done to correct the keyPath, you can't change it
// so a new table must be created.
// Background: Table was created with wrong keyPath of "notification.id"
// for new visitors for versions 160000.beta4 to 160000.beta8. Writes were
// attempted as "notificationId" in released 160000 however they may
// have failed if the visitor was new when those releases were in the wild.
// However those new on 160000.beta4 to 160000.beta8 will have records
// saved as "notification.id" that will be converted here.
export async function migrateOutcomesNotificationClickedTableForV5(
  db: IDBDatabase,
  transaction: IDBTransaction,
) {
  const oldTableName = 'NotificationClicked';
  const newTableName = 'Outcomes.NotificationClicked';

  db.createObjectStore(newTableName, { keyPath: 'notificationId' });
  const records = await wrapRequest(transaction.objectStore(oldTableName).getAll());

  const newStore = transaction.objectStore(newTableName);
  for (const oldValue of records) {
    // notification.id was possible from 160000.beta4 to 160000.beta8
    newStore.put({
      notificationId: oldValue.notificationId || oldValue.notification.id,
      appId: oldValue.appId,
      timestamp: oldValue.timestamp,
    });
  }
  db.deleteObjectStore(oldTableName);
}

// Table rename "NotificationReceived" -> "Outcomes.NotificationReceived"
// and migrate existing records.
// Motivation: Consistency of using pre-fix "Outcomes." like we have for
// the "Outcomes.NotificationClicked" table.
export async function migrateOutcomesNotificationReceivedTableForV5(
  db: IDBDatabase,
  transaction: IDBTransaction,
) {
  const oldTableName = 'NotificationReceived';
  const newTableName = 'Outcomes.NotificationReceived';
  db.createObjectStore(newTableName, { keyPath: 'notificationId' });

  const records = await wrapRequest(transaction.objectStore(oldTableName).getAll());
  const newStore = transaction.objectStore(newTableName);
  for (const record of records) {
    newStore.put(record);
  }
  db.deleteObjectStore(oldTableName);
}

export async function migrateModelNameSubscriptionsTableForV6(
  db: IDBDatabase,
  transaction: IDBTransaction,
) {
  const newTableName = 'subscriptions';
  db.createObjectStore(newTableName, { keyPath: 'modelId' });

  let currentExternalId: string | undefined;
  const identityData = await wrapRequest(transaction.objectStore('identity').getAll());

  if (identityData.length > 0) {
    currentExternalId = identityData[0].externalId;
  }

  for (const legacyModelName of ['emailSubscriptions', 'pushSubscriptions', 'smsSubscriptions']) {
    const records = await wrapRequest(transaction.objectStore(legacyModelName).getAll());
    const newStore = transaction.objectStore(newTableName);
    for (const record of records) {
      newStore.put({
        ...record,
        modelName: 'subscriptions',
        externalId: currentExternalId,
      });
    }
    db.deleteObjectStore(legacyModelName);
  }
}
