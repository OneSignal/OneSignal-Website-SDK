import test from 'ava';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/onesignal/OneSignal';

import { SMSProfile } from '../../../src/shared/models/SMSProfile';
import Random from '../../support/tester/Random';

async function createSMSRecordInDb(): Promise<SMSProfile> {
  const profile = new SMSProfile(Random.getRandomUuid());
  await OneSignal.database.setSMSProfile(profile);
  return profile;
}

test.beforeEach(async (_t) => {
  await TestEnvironment.initialize();
});

test('getSMSId should return undefined if no SMS record', async (t) => {
  t.is(await OneSignal.getSMSId(), undefined);
});

test('getSMSId should return the correct string', async (t) => {
  const profile = await createSMSRecordInDb();
  t.is(await OneSignal.getSMSId(), profile.subscriptionId);
});

test('getSMSId should return the correct string to callback', async (t) => {
  const profile = await createSMSRecordInDb();
  await new Promise<void>((resolve) => {
    OneSignal.getSMSId((id) => {
      t.is(id, profile.subscriptionId);
      resolve();
    });
  });
});
