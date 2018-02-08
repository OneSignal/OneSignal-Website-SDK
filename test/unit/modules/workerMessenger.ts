import "../../support/polyfills/polyfills";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { Uuid } from "../../../src/models/Uuid";
import { WorkerMessenger, WorkerMessengerCommand } from '../../../src/libraries/WorkerMessenger';
import Context from '../../../src/models/Context';
import { IntegrationKind } from '../../../src/models/AppConfig';
import test, { TestContext } from "ava";


test('service worker should gracefully handle unexpected page messages', async t => {
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js?a=1&b=2&appId=${Uuid.generate()}&c=3`)
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  const context = new Context(appConfig);
  const workerMessenger = new WorkerMessenger(context);

  /* We should be guaranteed a MessageEvent with at least an `event.data` property. */
  const undefinedData: any = {
    data: undefined
  };

  try {
    workerMessenger.onWorkerMessageReceivedFromPage(undefinedData);
    workerMessenger.onPageMessageReceivedFromServiceWorker(undefinedData);
  } catch (e) {
    t.fail("message function raised exception:" + e);
  }

  /*
    Page messages sent to the service worker can be sent from any code not related to OneSignal.
    https://github.com/OneSignal/OneSignal-Website-SDK/issues/308
   */
  const unexpectedData: any = {
    event: {
      data: {
        ACTION: "something-random"
      }
    }
  };

  try {
    workerMessenger.onWorkerMessageReceivedFromPage(unexpectedData);
    workerMessenger.onPageMessageReceivedFromServiceWorker(unexpectedData);
  } catch (e) {
    t.fail("message function raised exception:" + e);
  }

  t.pass();
});

test(
  'service worker should accept AMP web push commands',
  async t => {
    await TestEnvironment.initializeForServiceWorker({
      url: new URL(`https://site.com/service-worker.js?a=1&b=2&appId=${Uuid.generate()}&c=3`)
    });

    const appConfig = TestEnvironment.getFakeAppConfig();
    const context = new Context(appConfig);
    const workerMessenger = new WorkerMessenger(context);

    /* We should be guaranteed a MessageEvent with at least an `event.data` property. */
    const data: any = {
      data: {
        command: WorkerMessengerCommand.AmpSubscribe
      }
    };

    const testPromise = new Promise(resolve => {
      workerMessenger.on(WorkerMessengerCommand.AmpSubscribe, () => {
        resolve();
      });
    });

    try {
      workerMessenger.onWorkerMessageReceivedFromPage(data);
    } catch (e) {
      t.fail("message function raised exception:" + e);
    }

    await testPromise;
    t.pass();
  }
);
