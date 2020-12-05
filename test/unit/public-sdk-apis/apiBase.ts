import test from "ava";
import nock from "nock";
import sinon, { SinonSandbox } from "sinon";
import Random from "../../support/tester/Random";
import "../../support/polyfills/polyfills";
import OneSignalApiBase from "../../../src/OneSignalApiBase";
import Environment from "../../../src/Environment";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

function mockGetPlayers(): nock.Scope {
  return nock('https://onesignal.com')
    .persist()
    .get(`/api/v1/players`)
    .reply(200, { "success": true, "id": Random.getRandomUuid() });
}

function mockPostPlayers(): nock.Scope {
  return nock('https://onesignal.com')
    .post(`/api/v1/players`)
    .reply(200, { "success": true, "id": Random.getRandomUuid() });
}

function mockPutPlayers(): nock.Scope {
  return nock('https://onesignal.com')
    .put(`/api/v1/players`)
    .reply(200, { "success": true, "id": Random.getRandomUuid() });
}

function mockDeletePlayers(): nock.Scope {
  return nock('https://onesignal.com')
    .delete(`/api/v1/players`)
    .reply(200, { "success": true, "id": Random.getRandomUuid() });
}

test.beforeEach(async () => {
  nock.disableNetConnect();
  nock('https://onesignal.com')
    .get(`/api/v1/notifications`)
    .reply(200, { "success": true, "id": Random.getRandomUuid() });
});

test.afterEach(() => {
  sinonSandbox.restore();
});

test("OneSignalApiBase.call should include app_id header for get requests", async t => {
  mockGetPlayers();
  try {
    await OneSignalApiBase.get("players");
    t.fail();
  } catch(e) {
    t.pass();
  }
});

test("OneSignalApiBase.call should include app_id header for post requests", async t => {
  mockPostPlayers();
  try {
    await OneSignalApiBase.post("players");
    t.fail();
  } catch(e) {
    t.pass();
  }
});

test("OneSignalApiBase.call should include app_id header for put requests", async t => {
  mockPutPlayers();
  try {
    await OneSignalApiBase.post("players");
    t.fail();
  } catch(e) {
    t.pass();
  }
});

test("OneSignalApiBase.call should include app_id header for delete requests", async t => {
  mockDeletePlayers();
  try {
    await OneSignalApiBase.post("players");
    t.fail();
  } catch(e) {
    t.pass();
  }
});

test("OneSignalApiBase.call should add a custom header", async t => {
  sinonSandbox.stub(Environment, "version").returns(150500)

  const appId = Random.getRandomUuid();
  const playerId = Random.getRandomUuid();
  const promise = new Promise<void>(async resolve => {
    nock('https://onesignal.com')
      .get(`/api/v1/players/${playerId}?app_id=${appId}`)
      // .get(`/api/v1/players/${playerId}?app_id=${appId}`, {
      //   reqheaders: {
      //     'SDK-Version': `onesignal/web/${Environment.version()}`
      //   }
      // })
      .reply(function(_uri: string, _requestBody: any) {
        // @ts-ignore
        console.log('headers:', this.req.headers);
        resolve();
        return { success: true, id: playerId };
      });
    await OneSignalApiBase.get(`players/${playerId}?app_id=${appId}`);
  });

  try {
    await promise;
    t.pass();
  } catch(_e) {
    t.fail();
  }
});