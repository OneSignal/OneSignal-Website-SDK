import test from 'ava';
import { InvalidArgumentError } from '../../../src/shared/errors/InvalidArgumentError';
import { DeliveryPlatformKind } from '../../../src/shared/models/DeliveryPlatformKind';
import Database from '../../../src/shared/services/Database';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { NockOneSignalHelper } from '../../support/tester/NockOneSignalHelper';
import { setupFakePlayerId } from '../../support/tester/utils';
import { awaitSubscriptionChangeEvent } from '../../support/tester/ChannelSubscriptionChangeEventHelper';

const TEST_SMS_NUMBER = '+1112223333';

test.beforeEach(async (_t) => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', {
    type: 'appId',
    id: OneSignal.context.appConfig.appId,
  });
});

test('setSMSNumber, makes POST call to create SMS record, w/o push player', async (t) => {
  // 1. Nock out SMS create
  const smsPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setSMSNumber(TEST_SMS_NUMBER);

  // 2. Ensure player create with correct params was made
  t.deepEqual((await smsPostNock.result).request.body, {
    app_id: OneSignal.context.appConfig.appId,
    device_model: '',
    device_os: -1,
    device_type: DeliveryPlatformKind.SMS,
    identifier: TEST_SMS_NUMBER,
    language: 'en',
    sdk: '1',
    timezone: 0,
    timezone_id: 'UTC',
  });
});

test('setSMSNumber, makes POST call to create SMS record, w/ push player', async (t) => {
  // 1. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Nock out SMS create
  const smsPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setSMSNumber(TEST_SMS_NUMBER);

  // 3. Ensure player create with correct params was made
  t.deepEqual((await smsPostNock.result).request.body, {
    app_id: OneSignal.context.appConfig.appId,
    device_model: '',
    device_os: -1,
    device_player_id: pushPlayerId,
    device_type: DeliveryPlatformKind.SMS,
    identifier: TEST_SMS_NUMBER,
    language: 'en',
    sdk: '1',
    timezone: 0,
    timezone_id: 'UTC',
  });
});

test('setSMSNumber, throws on null', async (t) => {
  await t.throwsAsync(
    async () => {
      await OneSignal.setSMSNumber(null);
    },
    { instanceOf: InvalidArgumentError },
  );
});

test('setSMSNumber, throws on undefined', async (t) => {
  await t.throwsAsync(
    async () => {
      await OneSignal.setSMSNumber();
    },
    { instanceOf: InvalidArgumentError },
  );
});

test('setSMSNumber, throws on empty string', async (t) => {
  await t.throwsAsync(
    async () => {
      await OneSignal.setSMSNumber('');
    },
    { instanceOf: InvalidArgumentError },
  );
});

test("Setting SMS causes 'smsSubscriptionChanged' event to fire with sms identifier in event callback", async (t) => {
  const subscriptionChangeEventPromise = awaitSubscriptionChangeEvent(
    'smsSubscriptionChanged',
  );
  NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setSMSNumber(TEST_SMS_NUMBER);
  const event = (await subscriptionChangeEventPromise) as { sms: string };
  t.is(event['sms'], TEST_SMS_NUMBER);
});
