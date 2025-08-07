import type { IDBPDatabase, IDBPTransaction } from 'idb';
import { LegacyModelName, ModelName } from './constants';
import type { IndexedDBSchema } from './types';

type Transaction = IDBPTransaction<IndexedDBSchema, any[], 'versionchange'>;

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
  db: IDBPDatabase<IndexedDBSchema>,
  transaction: Transaction,
) {
  const oldTableName = 'NotificationClicked';
  const newTableName = 'Outcomes.NotificationClicked';

  db.createObjectStore(newTableName, { keyPath: 'notificationId' });
  let cursor = await transaction.objectStore(oldTableName).openCursor();

  while (cursor) {
    const oldValue = cursor.value;

    transaction.objectStore(newTableName).put({
      // notification.id was possible from 160000.beta4 to 160000.beta8
      notificationId: oldValue.notificationId || oldValue.notification.id,
      appId: oldValue.appId,
      timestamp: oldValue.timestamp,
    });

    cursor = await cursor.continue();
  }
  db.deleteObjectStore(oldTableName);
}

// Table rename "NotificationReceived" -> "Outcomes.NotificationReceived"
// and migrate existing records.
// Motivation: Consistency of using pre-fix "Outcomes." like we have for
// the "Outcomes.NotificationClicked" table.
export async function migrateOutcomesNotificationReceivedTableForV5(
  db: IDBPDatabase<IndexedDBSchema>,
  transaction: Transaction,
) {
  const oldTableName = 'NotificationReceived';
  const newTableName = 'Outcomes.NotificationReceived';
  db.createObjectStore(newTableName, { keyPath: 'notificationId' });

  let cursor = await transaction.objectStore(oldTableName).openCursor();
  while (cursor) {
    await transaction.objectStore(newTableName).put(cursor.value);
    cursor = await cursor.continue();
  }
  db.deleteObjectStore(oldTableName);
}

export async function migrateModelNameSubscriptionsTableForV6(
  db: IDBPDatabase<IndexedDBSchema>,
  transaction: Transaction,
) {
  const newTableName = ModelName.Subscriptions;
  db.createObjectStore(newTableName, { keyPath: 'modelId' });

  let currentExternalId: string | undefined;
  const identityData = await transaction
    .objectStore(ModelName.Identity)
    .getAll();

  if (identityData.length > 0) {
    currentExternalId = identityData[0].externalId;
  }

  for (const legacyModelName of Object.values(LegacyModelName)) {
    let cursor = await transaction.objectStore(legacyModelName).openCursor();
    while (cursor) {
      transaction.objectStore(newTableName).put({
        ...cursor.value,
        modelName: ModelName.Subscriptions,
        externalId: currentExternalId,
      });
      cursor = await cursor.continue();
    }
    db.deleteObjectStore(legacyModelName);
  }
}
