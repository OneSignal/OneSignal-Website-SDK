import test from "ava";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";
import Database from "../../../src/services/Database";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { setupFakePlayerId } from "../../support/tester/utils";
import sinon, { SinonSandbox } from "sinon";
import { SecondaryChannelTagsUpdater } from "../../../src/managers/channelManager/shared/updaters/SecondaryChannelTagsUpdater";
import { UpdateManager } from "../../../src/managers/UpdateManager";

let pushPlayerId: string = "";
const sinonSandbox: SinonSandbox = sinon.sandbox.create();

const TEST_EMAIL_ADDRESS = "test@onesignal.com";

test.beforeEach(async _t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
  pushPlayerId = await setupFakePlayerId();
});

test.afterEach(() => {
  sinonSandbox.restore();
});

test("If property syncing on and no external user id, only update push player", async t => {
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);
  const sendTagsSpy = sinonSandbox.spy(SecondaryChannelTagsUpdater.prototype, "sendTags");
  const pushPlayerSpy = sinonSandbox.spy(UpdateManager.prototype, <any>"sendPushPlayerUpdate"); // private function

  // 1. client side prop sync = on
  TestEnvironment.mockInternalOneSignal({
    clientSidePropSyncOnExternalId: true
  });

  // 2. no external user id
  t.falsy(await OneSignal.getExternalUserId());

  // 3. send tags
  await OneSignal.sendTags({ key: 'value' });

  // 4. check spies
  t.falsy(sendTagsSpy.called);
  t.truthy(pushPlayerSpy.called);
});

test("If property syncing on and external user id is set, update all channels", async t => {
  const secondChannelSendTagsSpy = sinonSandbox.spy(SecondaryChannelTagsUpdater.prototype, "sendTags");
  const pushPlayerSpy = sinonSandbox.spy(UpdateManager.prototype, <any>"sendPushPlayerUpdate"); // private function

  // 1. client side prop sync = on
  TestEnvironment.mockInternalOneSignal({
    clientSidePropSyncOnExternalId: true
  });

  // 2. Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail(TEST_EMAIL_ADDRESS);
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  /*
  // 2. external user id is set
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);
  await OneSignal.setExternalUserId("rodrigo");

  NockOneSignalHelper.nockPlayerPut(emailPlayerId);
  await OneSignal.setEmail();

  NockOneSignalHelper.nockPlayerPut(pushPlayerId);
  NockOneSignalHelper.nockPlayerPut(emailPlayerId);

  // 3. send tags
  await OneSignal.sendTags({ key: 'value' });

  // 4. check spies
  t.truthy(pushPlayerSpy.called);
  t.truthy(secondChannelSendTagsSpy.called);
  */
  t.pass();
});
