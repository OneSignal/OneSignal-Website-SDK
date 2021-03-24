import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { ChannelManager } from '../../../src/managers/ChannelManager';
import Database from '../../../src/services/Database';
import Random from '../../support/tester/Random';
import { SubscriptionManagerHelper } from './_SubscriptionManagerHelpers';

let sandbox: SinonSandbox;
test.beforeEach(async function() {
  sandbox = sinon.sandbox.create();
});

function createChannelManagerWithMocks(subscriptionManager :SubscriptionManager): ChannelManager {
  return new ChannelManager(
    Database.singletonInstance,
    Random.getRandomUuid(),
    subscriptionManager
  );
}

test('assigns newPushSubscriptionListener correctly', async t => {
  const subscriptionManager = SubscriptionManagerHelper.createMock();
  const addListenerSpy = sandbox.spy(subscriptionManager, "addNewPushSubscriptionListener");
  const channelManager = createChannelManagerWithMocks(subscriptionManager);

  t.true(addListenerSpy.calledWithExactly(channelManager));
});
